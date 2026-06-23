import pandas as pd
import pdfplumber
import os
import re

def mask_sensitive_data(text: str) -> str:
    """Masks potential PII like long account numbers, cards, or emails."""
    if not isinstance(text, str):
        return text
    # Mask 12-16 digit numbers (Account/Card)
    text = re.sub(r'\b\d{12,16}\b', '[REDACTED_ACCT]', text)
    # Mask emails
    text = re.sub(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', '[REDACTED_EMAIL]', text)
    return text

def _normalize_column(name: str) -> str:
    return re.sub(r"\s+", " ", str(name).strip().lower())


def parse_structured_csv(file_path: str) -> list[dict] | None:
    """Detect common HDFC-style CSV exports and return structured transaction rows."""
    try:
        df = pd.read_csv(file_path, on_bad_lines="skip", engine="python")
        df = df.dropna(how="all")
        if df.empty:
            return None

        column_map = {_normalize_column(col): col for col in df.columns}
        required = {"date", "narration"}
        if not required.issubset(column_map):
            return None

        withdrawal_col = column_map.get("withdrawal amt.") or column_map.get("withdrawal amount")
        deposit_col = column_map.get("deposit amt.") or column_map.get("deposit amount")
        if not withdrawal_col and not deposit_col:
            return None

        rows: list[dict] = []
        date_col = column_map["date"]
        narration_col = column_map["narration"]

        for _, row in df.iterrows():
            date_val = row.get(date_col)
            narration_val = row.get(narration_col)
            if pd.isna(date_val) or pd.isna(narration_val):
                continue

            rows.append({
                "date": str(date_val).strip(),
                "description": mask_sensitive_data(str(narration_val).strip()),
                "withdrawal": row.get(withdrawal_col) if withdrawal_col else None,
                "deposit": row.get(deposit_col) if deposit_col else None,
            })

        return rows if rows else None
    except Exception:
        return None


def parse_csv(file_path: str) -> list[str]:
    """Reads a CSV file and converts each row into a string representation."""
    try:
        # Read the CSV file, assuming first few rows might be headers or junk.
        df = pd.read_csv(file_path, on_bad_lines='skip', engine='python')
        df = df.dropna(how='all') # drop empty rows
        
        # Combine columns into a single string per row, ignoring NaNs
        lines = []
        for _, row in df.iterrows():
            row_vals = [str(val).strip() for val in row.values if pd.notna(val) and str(val).strip() != '']
            raw_line = ", ".join(row_vals)
            if len(raw_line) > 10:
                lines.append(mask_sensitive_data(raw_line))
        return lines
    except Exception as e:
        raise Exception(f"Failed to parse CSV: {str(e)}")

def parse_pdf(file_path: str, password: str = None) -> list[str]:
    """Reads a PDF file and extracts tabular data."""
    raw_transactions = []
    try:
        with pdfplumber.open(file_path, password=password if password else '') as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        if row:
                            row_str = ", ".join([str(cell).replace('\\n', ' ').strip() for cell in row if cell])
                            if len(row_str) > 10:
                                raw_transactions.append(row_str)
        return raw_transactions
    except Exception as e:
        raise Exception(f"Failed to parse PDF: {str(e)}")
