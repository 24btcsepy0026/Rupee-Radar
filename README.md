# RupeeRadar

AI-powered personal finance assistant that turns messy bank statements into clear spending insights.

Upload a CSV or PDF bank statement, and RupeeRadar will extract transactions, categorize expenses, detect recurring payments, calculate key metrics, and present everything in a simple dashboard with downloadable reports.

## Features

- **Statement upload** — CSV and PDF support (up to 10 MB)
- **Transaction cleaning** — Parses HDFC-style CSV exports and messy bank rows
- **Smart categorization** — Food, Travel, Shopping, Bills, EMI, Subscriptions, Salary, Rent, Investments, Other
- **Recurring detection** — Flags rent, EMIs, subscriptions, SIPs, and salary
- **Financial metrics** — Income, spend, savings, savings rate, category breakdown, monthly trend, biggest transaction
- **AI insights** — Personalized spending tips (with rule-based fallback when AI is unavailable)
- **Dashboard** — Summary charts, transaction table, recurring view, insights tab
- **Reports** — Download a multi-page PDF or print/share the current view
- **Privacy** — Masks account numbers and emails before processing; uploaded files are deleted after parsing

## Tech Stack

| Layer    | Stack                                      |
| -------- | ------------------------------------------ |
| Frontend | React, TypeScript, Vite, Tailwind CSS, Recharts |
| Backend  | Python, FastAPI, SQLAlchemy, SQLite        |
| AI       | Groq (Llama 3) — optional                  |
| Deploy   | Docker, Docker Compose, Nginx                |

## Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **Groq API key** (optional) — [console.groq.com](https://console.groq.com/)

Without a Groq key, the app still works using rule-based parsing for HDFC-style CSV files.

## Quick Start (Local)

### 1. Clone and configure

```bash
git clone <your-repo-url>
cd RUPEE_RADAR
```

Copy the example env file and add your Groq key (optional):

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
GROQ_API_KEY=your_groq_api_key_here
```

### 2. Start the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Start the frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 4. Try a sample statement

Upload the sample file:

```
backend/tests/fixtures/hdfc_messy.csv
```

You should see categorized transactions, spending charts, recurring payments, and insights on the dashboard.

## Docker

From the project root:

```bash
# Set your Groq key in the shell (optional)
export GROQ_API_KEY=your_groq_api_key_here   # Linux/macOS
# set GROQ_API_KEY=your_groq_api_key_here    # Windows PowerShell

docker-compose up --build
```

| Service  | URL                        |
| -------- | -------------------------- |
| Frontend | http://localhost:5173      |
| Backend  | http://localhost:8000      |
| API docs | http://localhost:8000/docs |

## Running Tests

From the project root:

```bash
python -m pytest backend/tests/ -v
```

## Project Structure

```
RUPEE_RADAR/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── routers/                # API routes (upload, metrics, health)
│   ├── services/
│   │   ├── parser.py           # CSV/PDF parsing
│   │   ├── categorizer.py      # Rule-based categorization
│   │   ├── ai_engine.py        # Groq AI categorization
│   │   └── insights.py         # AI + fallback insights
│   └── tests/fixtures/         # Sample bank statements
├── frontend/
│   └── src/components/         # FileUpload, Dashboard
├── docs/
│   └── problemStatement.txt
└── docker-compose.yml
```

## API Endpoints

| Method | Endpoint                    | Description                    |
| ------ | --------------------------- | ------------------------------ |
| GET    | `/api/health/`              | Health check                   |
| POST   | `/api/upload/`              | Upload CSV or PDF statement    |
| GET    | `/api/metrics/`             | Spending summary and charts    |
| GET    | `/api/metrics/transactions` | All parsed transactions        |
| GET    | `/api/metrics/insights`     | Personalized financial insights|
| DELETE | `/api/metrics/`             | Delete stored data             |

## How It Works

1. **Upload** — User uploads a bank statement (CSV or PDF).
2. **Parse** — Backend extracts raw transaction rows. HDFC-style CSVs are parsed structurally; PDFs use table extraction.
3. **Categorize** — Structured CSVs use keyword rules. Other formats use Groq AI, with rule-based fallback.
4. **Store** — Cleaned transactions are saved to a local SQLite database.
5. **Analyze** — Metrics (income, spend, categories, recurring, biggest transaction) are computed.
6. **Insights** — Groq generates tips, or the app falls back to rule-based insights.
7. **Dashboard** — React frontend displays charts, tables, and exportable reports.

## Deployment Notes

For a simple cloud deployment:

1. Deploy the **backend** (FastAPI) on any Python host (Railway, Render, Fly.io, etc.).
2. Deploy the **frontend** build (`npm run build`) to static hosting (Vercel, Netlify, etc.).
3. Update the API base URL in the frontend (`App.tsx`, `FileUpload.tsx`, `Dashboard.tsx`) from `http://localhost:8000` to your backend URL.
4. Set `GROQ_API_KEY` as an environment variable on the backend.
5. Enable CORS on the backend for your frontend domain in `backend/main.py`.

Alternatively, use `docker-compose` on a VPS with ports 5173 and 8000 exposed.

## Privacy

- Uploaded files are stored temporarily and deleted immediately after processing.
- Long account numbers and email addresses are masked before AI processing.
- Data is stored locally in SQLite (`backend/rupeeradar.db`). Use **Delete my data** in the dashboard to clear it.

## License

Built for the RupeeRadar AI Challenge. Use and modify as needed for your submission.
