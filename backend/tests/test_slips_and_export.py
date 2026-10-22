import base64
from decimal import Decimal
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_simulate_mock_slip_creates_pending_transaction() -> None:
    response = client.post("/api/slips/simulate-mock")
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending_review"
    assert Decimal(str(data["amount"])) == Decimal("350.00")
    assert "สมชาย" in (data["party_name"] or "")


def test_upload_slip_base64_success() -> None:
    # Dummy mock image data
    mock_bytes = b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
    encoded = base64.b64encode(mock_bytes).decode("ascii")
    payload = {
        "image_base64": f"data:image/gif;base64,{encoded}",
        "filename": "test-slip.gif",
    }
    response = client.post("/api/slips/upload", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending_review"
    assert data["source"] == "web_ocr"
    assert Decimal(str(data["amount"])) == Decimal("350.00")


def test_search_and_export_transactions() -> None:
    # Search for BTS or items
    response = client.get("/api/transactions", params={"search": "ข้าว"})
    assert response.status_code == 200
    items = response.json()
    assert isinstance(items, list)

    # Export CSV
    export_resp = client.get("/api/transactions/export")
    assert export_resp.status_code == 200
    assert export_resp.headers["content-type"].startswith("text/csv")
    assert "attachment; filename=\"transactions.csv\"" in export_resp.headers["content-disposition"]
    text = export_resp.content.decode("utf-8")
    assert "จำนวนเงิน" in text
    assert "หมวดหมู่" in text
