import os
import json
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")


def _format_inr(value: float) -> str:
    return f"Rs. {abs(value):,.2f}"


def _generate_rule_based_insights(metrics_data: dict) -> list[str]:
    insights: list[str] = []
    total_income = float(metrics_data.get("total_income", 0) or 0)
    total_spend = float(metrics_data.get("total_spend", 0) or 0)
    savings_rate = float(metrics_data.get("savings_rate", 0) or 0)
    recurring = float(metrics_data.get("recurring_commitments", 0) or 0)
    categories = metrics_data.get("category_spending", []) or []
    biggest = metrics_data.get("biggest_transaction")

    if total_income > 0:
        insights.append(
            f"You spent {_format_inr(total_spend)} against income of {_format_inr(total_income)}, "
            f"leaving a savings rate of {savings_rate:.1f}%."
        )
    elif total_spend > 0:
        insights.append(f"Your total spending in this statement is {_format_inr(total_spend)}.")

    if categories:
        top_category = max(categories, key=lambda item: item.get("value", 0))
        insights.append(
            f"Your highest spending category is {top_category['name']} at "
            f"{_format_inr(float(top_category['value']))}."
        )

    if recurring > 0:
        insights.append(
            f"Recurring commitments total {_format_inr(recurring)} per month - review subscriptions and EMIs for optimization."
        )

    if biggest:
        insights.append(
            f"Your biggest single expense was {biggest['description']} "
            f"({_format_inr(float(biggest['amount']))}) on {biggest['date']}."
        )

    return insights[:4] if insights else ["Upload a statement to generate personalized spending insights."]


def generate_insights(metrics_data: dict) -> list[str]:
    """Generates personalized financial insights using Groq, with a local fallback."""
    if not GROQ_API_KEY:
        return _generate_rule_based_insights(metrics_data)

    client = Groq(api_key=GROQ_API_KEY)

    prompt = f"""
    You are a helpful and concise financial advisor for Indian users. I will provide you with a summary of a user's recent bank statement metrics.
    Please generate 3 or 4 short, actionable, and personalized insights based on this data.

    Metrics:
    Total Income: {metrics_data.get('total_income', 0)}
    Total Spend: {metrics_data.get('total_spend', 0)}
    Savings Rate: {metrics_data.get('savings_rate', 0)}%
    Recurring Commitments: {metrics_data.get('recurring_commitments', 0)}
    Category Breakdown: {metrics_data.get('category_spending', [])}
    Biggest Transaction: {metrics_data.get('biggest_transaction')}

    Rules:
    1. Output MUST be a raw JSON array of strings.
    2. Do NOT use markdown code blocks like ```json.
    3. Each string should be a single insightful sentence or short tip.
    4. Use Indian Rupees (Rs.) with actual amounts from the data.
    5. Highlight areas of high spending, commend good savings rates, or warn about high recurring costs.

    Example output format:
    ["You saved a healthy 20% of your income this month. Great job!", "Your Food spending is quite high at Rs. 3,500 — consider cooking at home more."]
    """

    try:
        completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.1-8b-instant",
            temperature=0.3,
        )

        response_content = completion.choices[0].message.content.strip()

        if response_content.startswith("```json"):
            response_content = response_content[7:]
        if response_content.startswith("```"):
            response_content = response_content[3:]
        if response_content.endswith("```"):
            response_content = response_content[:-3]

        insights = json.loads(response_content.strip())
        if isinstance(insights, list) and insights:
            return insights
        return _generate_rule_based_insights(metrics_data)
    except Exception as e:
        print(f"Error generating insights: {e}")
        return _generate_rule_based_insights(metrics_data)
