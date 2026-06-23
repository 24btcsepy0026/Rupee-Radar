# RupeeRadar: Edge Cases & Corner Cases

This document outlines potential edge cases and corner cases that the RupeeRadar system might encounter during its lifecycle, categorized by the implementation phases. Addressing these proactively will ensure system robustness, data accuracy, and a smooth user experience.

---

## 1. Data Ingestion & File Handling (Phase 2)
*   **Password-Protected PDFs:** Most Indian bank statements are password-protected (often using PAN or Date of Birth). The system must detect encryption and prompt the user to provide the password before parsing.
*   **Unsupported or Malicious File Types:** Users might upload `.doc`, `.jpg`, or potentially malicious executables renamed as `.csv`. Strict MIME-type checking and file size limits are required.
*   **Extremely Large Files:** Statements covering multiple years (e.g., 10,000+ rows) could cause memory overflow or request timeouts during upload or processing.
*   **Empty or Corrupt Files:** Uploaded files that contain no transaction data, or files corrupted during download from the bank.

## 2. Data Parsing & Extraction (Phase 3)
*   **Inconsistent Column Names:** Different banks use different terminology (e.g., `Debit`, `Withdrawal`, `Dr.`, `Amount Out`). The parser must use fuzzy matching or predefined schemas for major banks (HDFC, SBI, ICICI, etc.).
*   **Pagination Issues in PDFs:** Tables that span across multiple pages often lose their header row on the second page, or contain unwanted footer text (e.g., "Page 1 of 5") inside the table data.
*   **Multi-Account Statements:** A single PDF might contain a savings account statement followed by a credit card statement. The parser needs to distinguish between them to avoid double-counting.
*   **Date Format Variations:** Handling variations like `DD/MM/YYYY`, `MM-DD-YYYY`, `DD-MMM-YY` (e.g., `04-Oct-23`), ensuring accurate chronological sorting.
*   **Opening and Closing Balances:** These rows are often formatted differently than standard transactions and might mistakenly be counted as massive single transactions if not explicitly filtered out.

## 3. AI Categorization & Extraction (Phase 3)
*   **Refunds and Reversals:** A failed UPI payment or an e-commerce refund results in a debit followed by a credit of the exact same amount. If not linked, this falsely inflates both total spend and total income.
*   **Ambiguous UPI Descriptions:** Transactions like `UPI-12345678-JohnDoe` offer zero context. The AI must default to an "Uncategorized" or "Other" bucket rather than hallucinating a category.
*   **Internal Transfers & Self-Payments:** Transferring money from a savings account to a mutual fund, or paying off a credit card bill from the same bank account. These are transfers/investments, not standard expenses.
*   **Massive Outlier Transactions:** Buying a car, paying yearly school fees, or a down payment on a house will completely skew monthly averages and pie charts.
*   **Multi-Currency / Foreign Exchange:** Transactions made abroad might include markup fees or display the foreign currency amount in the description, causing extraction confusion.

## 4. Financial Insights & Metrics Calculation (Phase 4)
*   **Zero Income Months:** If a user uploads a statement for an account used exclusively for spending (with no salary credits), calculating "Savings Rate" (Income - Expense / Income) will result in a Divide-by-Zero error.
*   **Overdrafts / Negative Balances:** Users using an overdraft facility might have a negative balance. Metrics need to handle negative integers gracefully.
*   **Misidentified Recurring Payments:** A user visiting the same coffee shop exactly three times in a month might trigger the "Recurring Subscription" detector falsely. Logic must rely on exact amounts and fixed date intervals (e.g., Netflix on the 15th).

## 5. Frontend Dashboard & UI (Phase 5)
*   **Category Overload:** If the AI generates too many unique micro-categories (e.g., separating "Coffee", "Lunch", "Dinner" instead of just "Food & Dining"), pie charts become unreadable.
*   **Mobile Responsiveness of Data Tables:** Bank statements contain dense horizontal data (Date, Description, Ref No, Debit, Credit, Balance). Displaying this on a mobile screen requires horizontal scrolling or an accordion/card layout.
*   **Real-time AI Latency:** LLM API calls can take 5-15 seconds per batch. The UI must handle this asynchronous delay gracefully with loading spinners or progress bars, preventing user drop-off.
