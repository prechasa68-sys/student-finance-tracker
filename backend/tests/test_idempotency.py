from decimal import Decimal

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_duplicate_line_webhook_does_not_create_second_row() -> None:
    payload = {
        "destination": "Uxxxx",
        "events": [
            {
                "type": "message",
                "replyToken": "token-1",
                "message": {"id": "msg-123", "type": "image"},
            }
        ],
    }
    first = client.post("/api/line/webhook", json=payload)
    second = client.post("/api/line/webhook", json=payload)
    assert first.status_code == 200
    assert second.status_code == 200

    pending = client.get("/api/transactions", params={"status": "pending_review", "source": "line_ocr"})
    items = [item for item in pending.json() if item["external_message_id"] == "msg-123"]
    assert len(items) == 1
    assert Decimal(str(items[0]["amount"])) == Decimal("350.00")


def test_non_image_message_is_ignored_without_crash() -> None:
    payload = {
        "events": [
            {
                "type": "message",
                "replyToken": "token-2",
                "message": {"id": "msg-text", "type": "text", "text": "hello"},
            }
        ]
    }
    response = client.post("/api/line/webhook", json=payload)
    assert response.status_code == 200
    listed = client.get("/api/transactions", params={"source": "line_ocr"})
    assert all(item["external_message_id"] != "msg-text" for item in listed.json())
