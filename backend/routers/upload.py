import os
import shutil
from datetime import datetime
from fastapi import APIRouter, File, UploadFile, HTTPException, Form, Depends
from typing import Optional
from sqlalchemy.orm import Session
from database import get_db
from models import User, Transaction
from services.parser import parse_csv, parse_pdf, parse_structured_csv
from services.ai_engine import categorize_transactions
from services.categorizer import categorize_structured_rows, categorize_raw_lines

router = APIRouter(
    prefix="/api/upload",
    tags=["upload"]
)

TEMP_DIR = "temp"
os.makedirs(TEMP_DIR, exist_ok=True)

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "text/csv",
    "application/csv",
    "text/plain",
    "application/vnd.ms-excel",
}
ALLOWED_EXTENSIONS = {".pdf", ".csv"}
MAX_FILE_SIZE = 10 * 1024 * 1024 # 10MB


def _is_allowed_upload(filename: str, content_type: str | None) -> bool:
    ext = os.path.splitext(filename or "")[1].lower()
    if ext in ALLOWED_EXTENSIONS:
        return True
    if content_type in ALLOWED_MIME_TYPES:
        return True
    return False

@router.post("/")
async def upload_statement(
    file: UploadFile = File(...),
    password: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    if not _is_allowed_upload(file.filename, file.content_type):
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF and CSV are allowed.")

    file_path = os.path.join(TEMP_DIR, file.filename)
    file_ext = os.path.splitext(file.filename or "")[1].lower()
    is_csv = file_ext == ".csv" or (file.content_type or "").endswith("csv")
    is_pdf = file_ext == ".pdf" or file.content_type == "application/pdf"
    
    try:
        # Check size without loading entirely into memory
        file.file.seek(0, os.SEEK_END)
        file_size = file.file.tell()
        file.file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
             raise HTTPException(status_code=400, detail="File too large. Max 10MB allowed.")
             
        # Save to temp
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Parse data
        raw_data = []
        categorized_data = []

        if is_csv:
            structured_rows = parse_structured_csv(file_path)
            if structured_rows:
                categorized_data = categorize_structured_rows(structured_rows)

            if not categorized_data:
                raw_data = parse_csv(file_path)
        elif is_pdf:
            raw_data = parse_pdf(file_path, password)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type.")

        if not categorized_data:
            if not raw_data:
                raise HTTPException(status_code=400, detail="Could not extract any transaction data from the file.")
            categorized_data = categorize_transactions(raw_data)

        if not categorized_data and raw_data:
            categorized_data = categorize_raw_lines(raw_data)

        if not categorized_data:
            raise HTTPException(status_code=500, detail="Could not categorize transaction data from the file.")

        # Save to database
        # For simplicity, create a default user if none exists
        user = db.query(User).first()
        if not user:
            user = User(email="demo@rupeeradar.local", created_at=datetime.utcnow().isoformat())
            db.add(user)
            db.commit()
            db.refresh(user)

        # Clear previous transactions for the user so it doesn't duplicate on re-uploads
        db.query(Transaction).filter(Transaction.user_id == user.id).delete()
        db.commit()

        new_transactions = []
        for item in categorized_data:
            try:
                # Convert date string to date object
                date_obj = datetime.strptime(item.get("date", ""), "%Y-%m-%d").date()
            except ValueError:
                date_obj = None

            txn = Transaction(
                user_id=user.id,
                date=date_obj,
                description=item.get("description", ""),
                amount=float(item.get("amount", 0.0)),
                type=item.get("type", "UNKNOWN"),
                category=item.get("category", "Other"),
                is_recurring=bool(item.get("is_recurring", False))
            )
            new_transactions.append(txn)

        db.bulk_save_objects(new_transactions)
        db.commit()
        
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
    finally:
        # Secure cleanup
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
                
    return {
        "message": f"Successfully processed {len(new_transactions)} transactions.", 
        "filename": file.filename
    }
