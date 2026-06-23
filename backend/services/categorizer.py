import re
from datetime import datetime

ALLOWED_CATEGORIES = {
    "Food", "Travel", "Shopping", "Bills", "EMI",
    "Subscriptions", "Salary", "Rent", "Investments", "Other"
}

RECURRING_KEYWORDS = (
    "NETFLIX", "SPOTIFY", "SUBSCRIP", "EMI", "SIP", "RENT", "SALARY",
    "INSURANCE", "PREMIUM", "ACH D-", "MUTUAL FUND", "LOAN ACC"
)

CATEGORY_RULES: list[tuple[tuple[str, ...], str]] = [
    (("ZOMATO", "SWIGGY", "STARBUCKS", "FOOD", "COFFEE", "RESTAURANT", "DOMINOS", "INSTAMART"), "Food"),
    (("UBER", "OLA", "IRCTC", "MAKEMYTRIP", "FLIGHT", "RAIL", "TRAVEL", "RIDE"), "Travel"),
    (("AMAZON", "FLIPKART", "MYNTRA", "SHOPPING", "MALL", "RETAIL"), "Shopping"),
    (("JIO", "AIRTEL", "VI ", "RECHARGE", "ELECTRIC", "WATER", "GAS", "BILL"), "Bills"),
    (("EMI", "LOAN ACC", "HDFC LOAN"), "EMI"),
    (("NETFLIX", "SPOTIFY", "SUBSCRIP", "YOUTUBE", "HOTSTAR", "PRIME"), "Subscriptions"),
    (("SALARY", "NEFT CR-EMP", "PAYROLL"), "Salary"),
    (("RENT", "LANDLORD"), "Rent"),
    (("SIP", "MUTUAL FUND", "ZERODHA", "GROWW", "INVEST"), "Investments"),
    (("PHARMACY", "APOLLO", "PHARMEASY", "MEDICINE"), "Other"),
]


def _parse_date(value: str) -> str | None:
    value = str(value).strip()
    for fmt in ("%d/%m/%y", "%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def _to_float(value) -> float | None:
    if value is None:
        return None
    text = str(value).strip().replace(",", "")
    if not text or text.lower() in {"nan", "none", "-"}:
        return None
    try:
        amount = float(text)
        return amount if amount > 0 else None
    except ValueError:
        return None


def _detect_category(description: str) -> str:
    upper = description.upper()
    for keywords, category in CATEGORY_RULES:
        if any(keyword in upper for keyword in keywords):
            return category
    return "Other"


def _is_recurring(description: str, category: str) -> bool:
    upper = description.upper()
    if category in {"Salary", "Rent", "EMI", "Subscriptions", "Investments"}:
        return True
    return any(keyword in upper for keyword in RECURRING_KEYWORDS)


def _normalize_transaction(
    date_str: str,
    description: str,
    amount: float,
    txn_type: str,
) -> dict | None:
    parsed_date = _parse_date(date_str)
    if not parsed_date or amount <= 0 or txn_type not in ("CREDIT", "DEBIT"):
        return None

    clean_description = re.sub(r"\s+", " ", description.strip())[:200]
    category = _detect_category(clean_description)
    if txn_type == "CREDIT" and category == "Other" and "SALARY" in clean_description.upper():
        category = "Salary"

    return {
        "date": parsed_date,
        "description": clean_description[:60],
        "amount": abs(amount),
        "type": txn_type,
        "category": category if category in ALLOWED_CATEGORIES else "Other",
        "is_recurring": _is_recurring(clean_description, category),
    }


def categorize_structured_rows(rows: list[dict]) -> list[dict]:
    categorized: list[dict] = []
    for row in rows:
        withdrawal = _to_float(row.get("withdrawal"))
        deposit = _to_float(row.get("deposit"))

        if withdrawal:
            txn = _normalize_transaction(row["date"], row["description"], withdrawal, "DEBIT")
        elif deposit:
            txn = _normalize_transaction(row["date"], row["description"], deposit, "CREDIT")
        else:
            txn = None

        if txn:
            categorized.append(txn)
    return categorized


def categorize_raw_lines(raw_transactions: list[str]) -> list[dict]:
    """Best-effort rule-based parsing for comma-separated bank statement rows."""
    categorized: list[dict] = []

    for line in raw_transactions:
        parts = [part.strip() for part in line.split(",") if part.strip()]
        if len(parts) < 3:
            continue

        date_str = parts[0]
        description = parts[1]

        amounts = []
        for part in parts[2:]:
            cleaned = part.replace("Rs.", "").replace("INR", "").strip()
            if re.fullmatch(r"-?\d+(?:\.\d+)?", cleaned):
                value = _to_float(cleaned)
                if value:
                    amounts.append(value)

        if not amounts:
            continue

        # HDFC-style rows often end with closing balance; use the first monetary value.
        amount = amounts[0]
        upper = line.upper()
        txn_type = "CREDIT" if any(token in upper for token in ("NEFT CR", "IMPS CR", "SALARY", "DEPOSIT", "CREDIT")) else "DEBIT"
        if "CR-" in upper or " DEPOSIT" in upper or "SALARY" in upper:
            txn_type = "CREDIT"

        txn = _normalize_transaction(date_str, description, amount, txn_type)
        if txn:
            categorized.append(txn)

    return categorized
