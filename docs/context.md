# RupeeRadar Project Context

## Project Overview
**RupeeRadar** is an AI-powered personal finance assistant designed to help working professionals understand and manage their expenses. It achieves this by analyzing bank statement data, overcoming the challenge of messy and inconsistent transaction descriptions.

## Core Problem
Bank statements contain a wealth of financial information across various transactions (UPI, cards, transfers, subscriptions, etc.), but the data is difficult to understand due to unstructured and unclear transaction descriptions. This makes manual categorization and tracking of expenses cumbersome.

## Key Objectives
The primary objective is to create an end-to-end solution that translates raw financial transactions into actionable personal finance insights. The application will answer crucial questions like:
- What are the biggest spending categories?
- What is the total monthly spend?
- Which transactions are recurring (subscriptions, EMIs)?
- What was the largest transaction?
- What are the top insights derived from spending behavior?

## Core Requirements & Features
1. **Data Ingestion:** Accept raw bank statement data.
2. **Data Cleaning & Extraction:** Parse and structure messy transaction data.
3. **Categorization:** Automatically group transactions into predefined categories such as Food, Travel, Shopping, Bills, EMI, Subscriptions, Salary, Rent, Investments, and Other.
4. **Recurring Transaction Detection:** Identify regular payments like EMIs, SIPs, rent, and subscriptions.
5. **Metric Calculation:** Compute essential financial metrics including total income, total spend, savings, top categories, and biggest transactions.
6. **Insight Generation:** Produce clear, human-readable spending insights utilizing actual transaction amounts.
7. **User Interface:** Present the data and insights through a simple, user-friendly dashboard or a downloadable report.

## Expected Output
A working prototype that demonstrates:
- Cleaned and structured transaction data.
- Accurately categorized expenses.
- Detection of recurring payments.
- A spend summary dashboard.
- At least three personalized financial insights.
- A final shareable report or visual summary.

## Evaluation Criteria
The project will be evaluated based on:
- Accuracy of data cleaning and transaction categorization.
- Quality and relevance of financial insights.
- Robustness in handling real-world, messy transaction descriptions.
- Simplicity and usability of the user interface/experience.
- Completeness of the end-to-end data workflow.
- Privacy-conscious handling of sensitive user data.

## Constraints & Deliverable
- **Constraint:** The priority is a working end-to-end prototype over supporting every possible bank format perfectly. The choice of technology stack and implementation approach is open.
- **Final Deliverable:** A deployed or locally runnable application that inputs raw bank statements and outputs a clear personal finance summary.
