import os
import json
import re
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Initialize Groq client
api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key=api_key) if api_key else None


def _extract_json_array(text: str) -> list:
    """Robustly extract a JSON array from LLM response, even if wrapped in markdown."""
    # Strip markdown code fences
    text = text.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    text = text.strip()

    # Try direct parse first
    try:
        result = json.loads(text)
        if isinstance(result, list):
            return result
    except json.JSONDecodeError:
        pass

    # Try to extract the first [...] array from the text
    match = re.search(r'\[.*\]', text, re.DOTALL)
    if match:
        try:
            result = json.loads(match.group())
            if isinstance(result, list):
                return result
        except json.JSONDecodeError:
            pass

    return []


def _validate_transaction(item: dict) -> dict | None:
    """Validate and normalize a single transaction dict from the LLM."""
    try:
        # Must have a date in YYYY-MM-DD format
        date_str = str(item.get("date", "")).strip()
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
            return None

        amount = float(item.get("amount", 0))
        if amount <= 0:
            return None

        txn_type = str(item.get("type", "")).upper()
        if txn_type not in ("CREDIT", "DEBIT"):
            return None

        allowed_categories = {
            "Food", "Travel", "Shopping", "Bills", "EMI",
            "Subscriptions", "Salary", "Rent", "Investments", "Other"
        }
        category = str(item.get("category", "Other")).strip()
        if category not in allowed_categories:
            category = "Other"

        return {
            "date": date_str,
            "description": str(item.get("description", "")).strip()[:200],
            "amount": abs(amount),
            "type": txn_type,
            "category": category,
            "is_recurring": bool(item.get("is_recurring", False)),
        }
    except Exception:
        return None


def categorize_transactions(raw_transactions: list[str]) -> list[dict]:
    from services.categorizer import categorize_raw_lines

    if not raw_transactions:
        return []

    if not client:
        print("GROQ_API_KEY not found — using rule-based categorization.")
        return categorize_raw_lines(raw_transactions)

    # Smaller chunk size (15) for better LLM reliability on large files
    chunk_size = 15
    categorized_results = []

    for i in range(0, len(raw_transactions), chunk_size):
        chunk = raw_transactions[i:i + chunk_size]

        prompt = f"""You are a bank transaction parser. Convert the raw bank statement rows below into a JSON array.

Rules (strictly follow):
1. "date": YYYY-MM-DD format only. Infer year from context (e.g. 01/05/26 → 2026-05-01).
2. "description": short, clean merchant/payee name (max 60 chars).
3. "amount": positive float, absolute value only.
4. "type": "CREDIT" if money came in (deposit/salary/refund), "DEBIT" if money went out (withdrawal/payment).
5. "category": exactly one of: Food, Travel, Shopping, Bills, EMI, Subscriptions, Salary, Rent, Investments, Other.
6. "is_recurring": true for salary, rent, EMI, subscription, insurance, SIP. false otherwise.
7. Output ONLY a raw JSON array. No markdown, no explanation.

Raw rows:
{json.dumps(chunk)}"""

        try:
            response = client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You are a financial parsing engine. Output only a valid JSON array of transaction objects."
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.0,
                max_tokens=4096,
            )

            response_text = response.choices[0].message.content
            parsed = _extract_json_array(response_text)

            valid_count = 0
            for item in parsed:
                validated = _validate_transaction(item)
                if validated:
                    categorized_results.append(validated)
                    valid_count += 1

            print(f"Chunk {i//chunk_size + 1}: got {len(parsed)} items, {valid_count} valid")

        except Exception as e:
            print(f"Error in chunk {i//chunk_size + 1}: {e}")
            # Continue to next chunk instead of failing everything
            continue

    if categorized_results:
        return categorized_results

    print("AI categorization returned no valid rows — falling back to rule-based parsing.")
    return categorize_raw_lines(raw_transactions)
