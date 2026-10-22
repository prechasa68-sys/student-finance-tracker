from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Transaction


def seed_demo_data(db: Session) -> None:
    existing = db.scalar(select(Transaction.id))
    if existing is not None:
        return

    today = datetime.now().replace(hour=12, minute=0, second=0, microsecond=0)
    samples = [
        Transaction(
            type="income",
            amount=Decimal("8000.00"),
            currency="THB",
            category="รายได้",
            transaction_date=today - timedelta(days=10),
            note="เงินเดือนพาร์ทไทม์",
            source="manual",
            status="confirmed",
        ),
        Transaction(
            type="expense",
            amount=Decimal("120.00"),
            currency="THB",
            category="อาหาร",
            transaction_date=today - timedelta(days=2),
            note="ข้าวกล่อง",
            source="manual",
            status="confirmed",
        ),
        Transaction(
            type="expense",
            amount=Decimal("45.00"),
            currency="THB",
            category="เดินทาง",
            transaction_date=today - timedelta(days=1),
            note="รถเมล์",
            source="manual",
            status="confirmed",
        ),
        Transaction(
            type="expense",
            amount=Decimal("350.00"),
            currency="THB",
            category="อาหาร",
            transaction_date=today,
            note="จากสลิป: นายสมชาย ใจดี",
            source="line_ocr",
            status="pending_review",
            external_message_id="demo-line-message-1",
            raw_ocr_text="จำนวนเงิน 350.00 บาท\nวันที่ 18/10/2026",
            party_name="นายสมชาย ใจดี",
        ),
    ]
    db.add_all(samples)
    db.commit()
