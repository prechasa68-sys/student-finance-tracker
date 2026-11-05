import base64
import time
import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import get_settings
from app.database import get_db
from app.models import Transaction, User
from app.schemas import SlipUploadRequest, TransactionOut
from app.services.line import detect_image_type
from app.services.ocr.factory import get_ocr_provider
from app.services.ocr.mock import SAMPLE_SLIP
from app.services.ocr.parser import parse_slip_text

router = APIRouter()


@router.post("/api/slips/upload", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def upload_slip(
    payload: SlipUploadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Transaction:
    settings = get_settings()

    raw_base64 = payload.image_base64
    if "," in raw_base64:
        raw_base64 = raw_base64.split(",", 1)[1]

    try:
        image_bytes = base64.b64decode(raw_base64)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="รูปแบบ Base64 ไม่ถูกต้อง") from exc

    if len(image_bytes) > settings.max_image_bytes:
        raise HTTPException(status_code=400, detail="ไฟล์ภาพมีขนาดใหญ่เกินกว่า 5MB")

    content_type = detect_image_type(image_bytes)
    if not content_type:
        content_type = "image/jpeg"

    ocr_provider = get_ocr_provider(settings)
    ocr_result = ocr_provider.extract_text(image_bytes, content_type)

    if not ocr_result.success:
        raise HTTPException(status_code=400, detail=ocr_result.error or "ไม่สามารถอ่านข้อความจากสลิปได้")

    parsed = parse_slip_text(ocr_result.text)

    item = Transaction(
        user_id=current_user.id,
        type=None,
        amount=parsed.amount,
        currency=parsed.currency or "THB",
        category=None,
        transaction_date=parsed.transaction_date,
        note=parsed.note,
        source="web_ocr",
        status="pending_review",
        external_message_id=f"web-{uuid.uuid4().hex[:12]}",
        raw_ocr_text=parsed.raw_text,
        party_name=parsed.party_name,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.post("/api/slips/simulate-mock", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def simulate_mock_slip(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> Transaction:
    parsed = parse_slip_text(SAMPLE_SLIP.strip())
    unique_id = f"sim-{int(time.time() * 1000)}"

    item = Transaction(
        user_id=current_user.id,
        type=None,
        amount=parsed.amount or Decimal("350.00"),
        currency=parsed.currency or "THB",
        category=None,
        transaction_date=parsed.transaction_date,
        note=parsed.note,
        source="line_ocr",
        status="pending_review",
        external_message_id=unique_id,
        raw_ocr_text=parsed.raw_text,
        party_name=parsed.party_name,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
