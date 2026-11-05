import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User

AUTH_SECRET = "student-finance-secret-key-2026-very-secure-jwt"
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}:{dk.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        salt, dk_hex = hashed_password.split(":")
        check = hashlib.pbkdf2_hmac(
            "sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 100000
        )
        return hmac.compare_digest(check.hex(), dk_hex)
    except Exception:
        return False


def create_access_token(user_id: int, username: str, expires_days: int = 30) -> str:
    payload = {
        "sub": user_id,
        "username": username,
        "exp": int(time.time()) + (expires_days * 86400),
    }
    raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    b64_payload = base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")
    sig = hmac.new(AUTH_SECRET.encode("utf-8"), b64_payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{b64_payload}.{sig}"


def decode_access_token(token: str) -> dict[str, Any] | None:
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        b64_payload, sig = parts
        expected_sig = hmac.new(
            AUTH_SECRET.encode("utf-8"), b64_payload.encode("utf-8"), hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None

        # Pad base64
        padded = b64_payload + "=" * ((4 - len(b64_payload) % 4) % 4)
        raw = base64.urlsafe_b64decode(padded)
        payload = json.loads(raw.decode("utf-8"))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None


def get_current_user(
    auth: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="กรุณาเข้าสู่ระบบก่อนใช้งาน",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(auth.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.get(User, payload["sub"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ไม่พบผู้ใช้งานนี้ในระบบ",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_optional_user(
    auth: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    if not auth or not auth.credentials:
        return None
    payload = decode_access_token(auth.credentials)
    if not payload:
        return None
    return db.get(User, payload["sub"])

