import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from backend.services.parser import parse_csv

res = parse_csv('backend/tests/fixtures/hdfc_messy.csv')
print("Parsed CSV:", res)
