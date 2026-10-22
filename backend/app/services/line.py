from __future__ import annotations

import base64
import hashlib
import hmac
import logging

import httpx

from app.config import Settings
from app.constants import ALLOWED_IMAGE_MAGIC, ALLOWED_IMAGE_TYPES

logger = logging.getLogger(__name__)

LINE_API_BASE = "https://api.line.me"
LINE_DATA_BASE = "https://api-data.line.me"


class LineClientError(Exception):
    pass


def verify_line_signature(body: bytes, signature: str | None, channel_secret: str) -> bool:
    if not signature or not channel_secret:
        return False
    digest = hmac.new(channel_secret.encode("utf-8"), body, hashlib.sha256).digest()
    expected = base64.b64encode(digest).decode("utf-8")
    return hmac.compare_digest(expected, signature)


def detect_image_type(image_bytes: bytes, declared_type: str | None = None) -> str | None:
    for magic, content_type in ALLOWED_IMAGE_MAGIC.items():
        if image_bytes.startswith(magic):
            if magic == b"RIFF" and image_bytes[8:12] != b"WEBP":
                continue
            return content_type
    if declared_type in ALLOWED_IMAGE_TYPES:
        return declared_type
    return None


class LineClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.settings.line_channel_access_token}"}

    def download_message_content(self, message_id: str) -> tuple[bytes, str]:
        url = f"{LINE_DATA_BASE}/v2/bot/message/{message_id}/content"
        try:
            with httpx.Client(timeout=20.0) as client:
                response = client.get(url, headers=self._headers())
                response.raise_for_status()
        except httpx.TimeoutException as exc:
            raise LineClientError("หมดเวลาดาวน์โหลดรูปจาก LINE") from exc
        except httpx.HTTPError as exc:
            raise LineClientError("ดาวน์โหลดรูปจาก LINE ไม่สำเร็จ") from exc

        content = response.content
        if len(content) > self.settings.max_image_bytes:
            raise LineClientError("ไฟล์ภาพมีขนาดใหญ่เกินไป")
        content_type = detect_image_type(content, response.headers.get("content-type"))
        if not content_type:
            raise LineClientError("ชนิดไฟล์ไม่ใช่รูปภาพที่รองรับ")
        return content, content_type

    def reply_text(self, reply_token: str, text: str) -> None:
        if not reply_token:
            return
        url = f"{LINE_API_BASE}/v2/bot/message/reply"
        payload = {
            "replyToken": reply_token,
            "messages": [{"type": "text", "text": text[:5000]}],
        }
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.post(url, headers=self._headers(), json=payload)
                response.raise_for_status()
        except httpx.HTTPError:
            logger.warning("LINE reply failed")

    def get_bot_info(self) -> dict:
        url = f"{LINE_API_BASE}/v2/bot/info"
        with httpx.Client(timeout=8.0) as client:
            response = client.get(url, headers=self._headers())
            response.raise_for_status()
            return response.json()


def build_ocr_reply(readable_fields: list[str], amount_text: str | None, error: str | None = None) -> str:
    if error:
        return (
            "อ่านสลิปไม่สำเร็จ: "
            f"{error}\n"
            "ระบบไม่ได้ยืนยันว่ามีการโอนเงินจริง โปรดเพิ่มรายการเองบนเว็บได้"
        )
    if not readable_fields:
        return (
            "ได้รับรูปแล้ว แต่ยังอ่านจำนวนเงินหรือวันที่จากสลิปไม่ได้ "
            "โปรดตรวจสอบและกรอกข้อมูลเองในหน้าเว็บก่อนบันทึก"
        )
    fields = ", ".join(readable_fields)
    amount_line = f"\nจำนวนที่อ่านได้: {amount_text}" if amount_text else ""
    return (
        f"อ่านข้อมูลจากสลิปได้: {fields}{amount_line}\n"
        "ข้อมูลนี้อยู่ในสถานะรอตรวจสอบ ยังไม่ได้ยืนยันว่าโอนเงินสำเร็จ "
        "โปรดเปิดเว็บแอปเพื่อตรวจและยืนยันก่อนบันทึก"
    )
