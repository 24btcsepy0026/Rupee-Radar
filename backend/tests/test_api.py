from fastapi.testclient import TestClient
import pytest
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "message" in data

def test_metrics_endpoints_exist():
    # We just check if the endpoint is reachable, 
    # it might return 200 with empty data or 500 if DB is missing,
    # but we just want to ensure it's registered.
    response = client.get("/api/metrics/")
    assert response.status_code in [200, 500]
