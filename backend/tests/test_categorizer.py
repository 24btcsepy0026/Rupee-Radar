import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from services.parser import parse_structured_csv
from services.categorizer import categorize_structured_rows, categorize_raw_lines


FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "hdfc_messy.csv")


def test_structured_csv_parsing():
    rows = parse_structured_csv(FIXTURE)
    assert rows is not None
    assert len(rows) == 10
    assert "ZOMATO" in rows[0]["description"].upper()


def test_rule_based_categorization():
    rows = parse_structured_csv(FIXTURE)
    categorized = categorize_structured_rows(rows)
    assert len(categorized) == 10

    categories = {item["category"] for item in categorized}
    assert "Food" in categories
    assert "Salary" in categories
    assert "Rent" in categories

    salary_txns = [item for item in categorized if item["category"] == "Salary"]
    assert salary_txns[0]["type"] == "CREDIT"
    assert salary_txns[0]["is_recurring"] is True


def test_raw_line_fallback():
    raw_lines = [
        "01/05/26, UPI-ZOMATO-PAYTM@PAYTM-PYTM0123456-FOOD, 1234567, 01/05/26, 350.0, 45000.0",
        "05/05/26, NEFT CR-EMP123-SALARY MAY26, NEFT1122, 05/05/26, 85000.0, 129351.0",
    ]
    categorized = categorize_raw_lines(raw_lines)
    assert len(categorized) == 2
    assert categorized[0]["category"] == "Food"
    assert categorized[1]["type"] == "CREDIT"
