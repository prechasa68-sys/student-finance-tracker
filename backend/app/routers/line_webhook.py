import json
import logging
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import Transaction
from app.schemas import WebhookAck
from app.services.finance import find_by_external_message_id
from app.services.line import LineClient, LineClientError, build_ocr_reply, verify_line_signature
from app.services.ocr.factory import get_ocr_provider
from app.services.ocr.parser import parse_slip_text

logger = logging.getLogger(__name__)
router = APIRouter()


def _amount_text(amount: Decimal | None) -> str | None:
    if amount is None:
        return None
    return f"{amount} บาท"


@router.post("/api/line/webhook", response_model=WebhookAck)
async def line_webhook(request: Request, db: Session = Depends(get_db)) -> WebhookAck:
    settings = get_settings()
    raw_body = await request.body()
    signature = request.headers.get("X-Line-Signature")

    if settings.effective_line_mock_mode:
        logger.info("LINE webhook accepted in mock mode")
    else:
        if not verify_line_signature(raw_body, signature, settings.line_channel_secret):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid LINE signature")

    try:
        payload = json.loads(raw_body.decode("utf-8") or "{}")
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON") from exc

    events = payload.get("events") or []
    processed = 0
    line_client = LineClient(settings)
    ocr_provider = get_ocr_provider(settings)

    for event in events:
        if event.get("type") != "message":
            continue
        message = event.get("message") or {}
        reply_token = event.get("replyToken") or ""
        if message.get("type") != "image":
            _safe_reply(
                settings,
                line_client,
                reply_token,
                "ระบบรับได้เฉพาะรูปสลิป กรุณาส่งรูปภาพ หรือเพิ่มรายการเองบนเว็บแอป",
            )
            continue

        message_id = message.get("id")
        if not message_id:
            continue

        existing = find_by_external_message_id(db, str(message_id))
        if existing is not None:
            _safe_reply(
                settings,
                line_client,
                reply_token,
                "ได้รับสลิปนี้แล้ว และอยู่ในรายการรอตรวจสอบบนเว็บแอป",
            )
            processed += 1
            continue

        try:
            if settings.effective_line_mock_mode:
                image_bytes, content_type = b"mock-image", "image/jpeg"
            else:
                image_bytes, content_type = line_client.download_message_content(str(message_id))
            ocr_result = ocr_provider.extract_text(image_bytes, content_type)
            if not ocr_result.success:
                _safe_reply(settings, line_client, reply_token, build_ocr_reply([], None, ocr_result.error))
                continue

            parsed = parse_slip_text(ocr_result.text)
            item = Transaction(
                type=None,
                amount=parsed.amount,
                currency=parsed.currency or "THB",
                category=None,
                transaction_date=parsed.transaction_date,
                note=parsed.note,
                source="line_ocr",
                status="pending_review",
                external_message_id=str(message_id),
                raw_ocr_text=parsed.raw_text,
                party_name=parsed.party_name,
            )
            db.add(item)
            db.commit()
            _safe_reply(
                settings,
                line_client,
                reply_token,
                build_ocr_reply(parsed.readable_fields(), _amount_text(parsed.amount)),
            )
            processed += 1
        except IntegrityError:
            db.rollback()
            _safe_reply(
                settings,
                line_client,
                reply_token,
                "ได้รับสลิปนี้แล้ว และอยู่ในรายการรอตรวจสอบบนเว็บแอป",
            )
            processed += 1
        except LineClientError as exc:
            db.rollback()
            _safe_reply(settings, line_client, reply_token, build_ocr_reply([], None, str(exc)))
        except Exception:
            db.rollback()
            logger.exception("Failed to process LINE image event")
            _safe_reply(settings, line_client, reply_token, build_ocr_reply([], None, "ประมวลผลสลิปไม่สำเร็จ"))

    return WebhookAck(status="ok", processed_events=processed)


def _safe_reply(settings, line_client: LineClient, reply_token: str, text: str) -> None:
    if settings.effective_line_mock_mode or not reply_token:
        return
    line_client.reply_text(reply_token, text)
