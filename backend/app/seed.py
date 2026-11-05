from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import hash_password
from app.models import Transaction, User


def seed_demo_data(db: Session) -> None:
    demo_user = db.scalar(select(User).where(User.username == "demo"))
    if not demo_user:
        demo_user = User(
            username="demo",
            display_name="นักศึกษาตัวอย่าง",
            password_hash=hash_password("123456"),
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)

    existing = db.scalar(select(Transaction.id))
    if existing is not None:
        # If transactions exist without user_id, assign to demo_user
        orphans = db.scalars(select(Transaction).where(Transaction.user_id.is_(None))).all()
        for t in orphans:
            t.user_id = demo_user.id
        if orphans:
            db.commit()
        return

    today = datetime.now().replace(hour=12, minute=0, second=0, microsecond=0)
    samples = [
        Transaction(
            user_id=demo_user.id,
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
            user_id=demo_user.id,
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
            user_id=demo_user.id,
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
            user_id=demo_user.id,
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
