# RupeeRadar: Phase-Wise Implementation Plan

Based on the system architecture, the development of RupeeRadar will be divided into six distinct phases. This approach ensures steady progress from foundational setup to advanced AI integrations and final polish.

## Phase 1: Project Setup & Foundation
**Goal:** Establish the development environment, basic scaffolding, and connect the frontend and backend.
*   **Backend Setup:**
    *   Initialize a Python virtual environment.
    *   Setup the FastAPI application structure (routers, controllers, models).
    *   Configure SQLite as the initial development database.
*   **Frontend Setup:**
    *   Initialize the frontend using React (Vite) or Next.js.
    *   Install and configure Tailwind CSS for styling.
    *   Setup basic routing.
*   **Milestone:** A running FastAPI server and a React frontend that successfully communicates via a simple health-check API endpoint.

## Phase 2: Data Ingestion & Storage
**Goal:** Enable users to upload bank statements and ensure secure temporary storage and database integration.
*   **Database Schema:**
    *   Design and implement SQLAlchemy ORM models for `User` and `Transaction`.
*   **Backend Endpoints:**
    *   Create a secure file upload endpoint (`/api/upload`) in FastAPI.
    *   Implement logic to temporarily save files (CSV/PDF) to a local `temp/` directory.
    *   Implement automatic deletion of files after processing to ensure privacy.
*   **Frontend UI:**
    *   Build a drag-and-drop file upload component.
    *   Display upload progress and success/error states.
*   **Milestone:** Users can successfully upload a bank statement, which is received and securely handled by the backend.

## Phase 3: Data Parsing & AI Categorization Engine
**Goal:** Extract messy raw data and use AI to structure and categorize it.
*   **Data Parsing Module:**
    *   Use `pandas` (for CSV/Excel) and `pdfplumber`/`PyPDF2` (for PDF) to read tabular transaction data.
    *   Clean data (remove empty rows, standardize date formats, handle varying column names).
*   **AI Extraction & Categorization:**
    *   Integrate an LLM API (e.g., Gemini, OpenAI).
    *   Develop prompts to parse messy descriptions into clean entities: Merchant, Date, Amount, Transaction Type (Credit/Debit).
    *   Implement categorization rules (Food, Travel, Bills, etc.) and logic to detect recurring payments (Subscriptions, EMIs).
    *   Save the structured output into the SQLite database.
*   **Milestone:** Raw files are automatically transformed into clean, categorized database records.

## Phase 4: Financial Insights & Metrics Calculation
**Goal:** Derive actionable financial insights from the structured transaction data.
*   **Metrics Calculation:**
    *   Write backend logic (using Pandas or SQL queries) to compute Total Income, Total Spend, Savings Rate, and Top Spending Categories.
*   **Insights Generator:**
    *   Develop a module to generate personalized text insights (e.g., *"You spent 40% of your income on Food this month"*).
*   **API Endpoints:**
    *   Create `GET /api/metrics` and `GET /api/insights` endpoints to serve this data to the frontend.
*   **Milestone:** The backend can successfully calculate metrics and serve insights via API based on a user's transaction history.

## Phase 5: Frontend Dashboard & Visualization
**Goal:** Present the processed data and insights to the user in a beautiful, intuitive interface.
*   **Dashboard Layout:**
    *   Build the main dashboard view using Tailwind CSS.
*   **Data Visualization:**
    *   Integrate a charting library (Recharts or Chart.js).
    *   Create a Pie Chart for spending categories and a Bar Chart for monthly income vs. expense.
*   **Transaction Table & Insights:**
    *   Build a searchable and filterable data table to display individual transactions.
    *   Create an "Insights" section to display the AI-generated tips and warnings.
*   **Milestone:** A fully functional, interactive user dashboard displaying data, charts, and insights.

## Phase 6: Polish, Testing & Deployment
**Goal:** Ensure system stability, enforce privacy constraints, and deploy the application.
*   **Testing:**
    *   Write unit tests for the parsing and categorization logic.
    *   Perform end-to-end testing (uploading a messy file -> seeing results on the dashboard).
*   **Security & Privacy:**
    *   Verify that all temporary files are securely deleted.
    *   Implement data masking for sensitive information (like Account Numbers) before sending data to external LLMs.
*   **Deployment:**
    *   Containerize the application using Docker (separate containers for frontend and backend).
    *   Deploy to a cloud platform (e.g., Render, Vercel, AWS, or GCP).
*   **Milestone:** RupeeRadar is live, secure, and accessible to users.
