import base64
import hashlib
import hmac
import json

from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.services.line import verify_line_signature

client = TestClient(app)


def test_hmac_signature_matches_official_algorithm() -> None:
    secret = "8c570fa6dd201bb328f1c1eac23a96d8"
    body = b'{"destination":"U8e742f61d673b39c7fff3cecb7536ef0","events":[]}'
    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).digest()
    signature = base64.b64encode(digest).decode("utf-8")
    assert signature == "GhRKmvmHys4Pi8DxkF4+EayaH0OqtJtaZxgTD9fMDLs="
    assert verify_line_signature(body, signature, secret)
    assert not verify_line_signature(body, "tampered", secret)


def test_invalid_signature_rejected_when_not_mock() -> None:
    settings = get_settings()
    original_mock = settings.line_mock_mode
    original_token = settings.line_channel_access_token
    settings.line_mock_mode = False
    settings.line_channel_access_token = "dummy-token"
    try:
        body = {"destination": "Uxxxx", "events": []}
        response = client.post(
            "/api/line/webhook",
            content=json.dumps(body),
            headers={"Content-Type": "application/json", "X-Line-Signature": "invalid"},
        )
        assert response.status_code == 400
    finally:
        settings.line_mock_mode = original_mock
        settings.line_channel_access_token = original_token
