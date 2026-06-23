from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Transaction

router = APIRouter(
    prefix="/api/metrics",
    tags=["metrics"]
)

@router.get("/")
def get_metrics(db: Session = Depends(get_db)):
    try:
        # Transactions stats
        txns = db.query(Transaction).all()
        transaction_count = len(txns)
        
        if transaction_count == 0:
            return {
                "total_income": 0, "total_spend": 0, "savings": 0, "savings_rate": 0,
                "recurring_commitments": 0, "date_range": "", "transaction_count": 0,
                "category_spending": [], "monthly_trend": [], "biggest_transaction": None
            }

        dates = [t.date for t in txns if t.date]
        date_range = f"{min(dates)} to {max(dates)}" if dates else ""

        # Calculate Total Income (sum of CREDIT)
        total_income = db.query(func.sum(Transaction.amount)).filter(Transaction.type == 'CREDIT').scalar() or 0.0
        
        # Calculate Total Spend (sum of DEBIT)
        total_spend = db.query(func.sum(Transaction.amount)).filter(Transaction.type == 'DEBIT').scalar() or 0.0
        
        # Savings
        savings = total_income - total_spend
        
        # Savings Rate
        savings_rate = 0.0
        if total_income > 0:
            savings_rate = (savings / total_income) * 100
            
        # Recurring Commitments (sum of DEBIT where is_recurring=True)
        recurring_commitments = db.query(func.sum(Transaction.amount)).filter(
            Transaction.type == 'DEBIT', 
            Transaction.is_recurring == True
        ).scalar() or 0.0
            
        # Spending by Category (only DEBIT transactions)
        category_spending = db.query(
            Transaction.category, 
            func.sum(Transaction.amount).label("total")
        ).filter(Transaction.type == 'DEBIT').group_by(Transaction.category).all()
        
        pie_chart_data = [{"name": c[0], "value": float(c[1])} for c in category_spending]

        # Monthly Trend — group by YYYY-MM, separate income vs spend
        monthly_spend = db.query(
            func.strftime('%Y-%m', Transaction.date).label('month'),
            func.sum(Transaction.amount).label('total')
        ).filter(
            Transaction.type == 'DEBIT',
            Transaction.date != None
        ).group_by('month').order_by('month').all()

        monthly_income = db.query(
            func.strftime('%Y-%m', Transaction.date).label('month'),
            func.sum(Transaction.amount).label('total')
        ).filter(
            Transaction.type == 'CREDIT',
            Transaction.date != None
        ).group_by('month').order_by('month').all()

        # Merge into a dict keyed by month
        trend_map: dict = {}
        for m in monthly_spend:
            if m[0]:
                trend_map.setdefault(m[0], {"month": m[0], "spend": 0.0, "income": 0.0})
                trend_map[m[0]]["spend"] = float(m[1])
        for m in monthly_income:
            if m[0]:
                trend_map.setdefault(m[0], {"month": m[0], "spend": 0.0, "income": 0.0})
                trend_map[m[0]]["income"] = float(m[1])

        bar_chart_data = sorted(trend_map.values(), key=lambda x: x["month"])

        biggest_txn = db.query(Transaction).filter(
            Transaction.type == 'DEBIT'
        ).order_by(Transaction.amount.desc()).first()

        biggest_transaction = None
        if biggest_txn:
            biggest_transaction = {
                "date": str(biggest_txn.date),
                "description": biggest_txn.description,
                "amount": float(biggest_txn.amount),
                "category": biggest_txn.category,
            }

        return {
            "total_income": float(total_income),
            "total_spend": float(total_spend),
            "savings": float(savings),
            "savings_rate": float(savings_rate),
            "recurring_commitments": float(recurring_commitments),
            "date_range": date_range,
            "transaction_count": transaction_count,
            "category_spending": pie_chart_data,
            "monthly_trend": bar_chart_data,
            "biggest_transaction": biggest_transaction,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch metrics: {str(e)}")

@router.get("/transactions")
def get_transactions(db: Session = Depends(get_db)):
    try:
        transactions = db.query(Transaction).order_by(Transaction.date.desc()).all()
        return transactions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch transactions: {str(e)}")

@router.get("/insights")
def fetch_insights(db: Session = Depends(get_db)):
    # Re-fetch basic metrics to pass to the AI
    metrics = get_metrics(db)
    
    # Generate insights
    from services.insights import generate_insights
    insights_list = generate_insights(metrics)
    
    return {"insights": insights_list}

@router.delete("/")
def delete_data(db: Session = Depends(get_db)):
    try:
        from models import User
        # Delete all transactions for the default user
        user = db.query(User).first()
        if user:
            db.query(Transaction).filter(Transaction.user_id == user.id).delete()
            db.commit()
        return {"message": "Data deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete data: {str(e)}")
