import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from backend.services.ai_engine import categorize_transactions
from backend.services.parser import parse_csv

raw = parse_csv('backend/tests/fixtures/hdfc_messy.csv')
print("Calling categorize_transactions with full array...")
res = categorize_transactions(raw)
print("Result:", res)
