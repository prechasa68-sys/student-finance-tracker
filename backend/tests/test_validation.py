from datetime import datetime
from decimal import Decimal

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_reject_non_positive_amount() -> None:
    response = client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "amount": "0",
            "category": "อาหาร",
            "transaction_date": datetime(2026, 10, 1).isoformat(),
        },
    )
    assert response.status_code == 422


def test_reject_unknown_category() -> None:
    response = client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "amount": "12.00",
            "category": "คาสิโน",
            "transaction_date": datetime(2026, 10, 1).isoformat(),
        },
    )
    assert response.status_code == 422


def test_confirm_requires_complete_fields() -> None:
    created = client.post(
        "/api/transactions",
        json={"status": "pending_review", "source": "line_ocr", "amount": "50.00"},
    )
    assert created.status_code == 201
    transaction_id = created.json()["id"]
    response = client.post(f"/api/transactions/{transaction_id}/confirm", json={})
    assert response.status_code == 422


def test_create_manual_transaction() -> None:
    response = client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "amount": "45.75",
            "category": "เดินทาง",
            "transaction_date": datetime(2026, 10, 1, 8, 30).isoformat(),
            "note": "BTS",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert Decimal(body["amount"]) == Decimal("45.75")
    assert body["source"] == "manual"
    assert body["status"] == "confirmed"


def test_health_endpoint() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] in {"ok", "degraded"}
