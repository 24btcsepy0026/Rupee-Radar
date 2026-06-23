from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import health, upload, metrics
from database import engine
import models

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="RupeeRadar API")

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(upload.router)
app.include_router(metrics.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
