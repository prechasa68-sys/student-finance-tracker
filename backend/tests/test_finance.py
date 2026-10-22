from datetime import datetime
from decimal import Decimal

from app.database import SessionLocal
from app.models import Transaction
from app.services.finance import calculate_summary, quantize_money


def test_quantize_money_avoids_binary_float() -> None:
    assert quantize_money(Decimal("10.1") + Decimal("0.2")) == Decimal("10.30")
    assert quantize_money(Decimal("1.005")) == Decimal("1.01")


def test_summary_uses_confirmed_transactions_only() -> None:
    db = SessionLocal()
    try:
        db.add_all(
            [
                Transaction(
                    type="income",
                    amount=Decimal("1000.00"),
                    category="รายได้",
                    transaction_date=datetime(2026, 10, 1),
                    source="manual",
                    status="confirmed",
                ),
                Transaction(
                    type="expense",
                    amount=Decimal("250.50"),
                    category="อาหาร",
                    transaction_date=datetime(2026, 10, 2),
                    source="manual",
                    status="confirmed",
                ),
                Transaction(
                    type="expense",
                    amount=Decimal("999.00"),
                    category="ช้อปปิ้ง",
                    transaction_date=datetime(2026, 10, 3),
                    source="line_ocr",
                    status="pending_review",
                ),
            ]
        )
        db.commit()
        summary = calculate_summary(db)
        assert summary["income_total"] == Decimal("1000.00")
        assert summary["expense_total"] == Decimal("250.50")
        assert summary["balance"] == Decimal("749.50")
        assert summary["pending_review_count"] == 1
        assert summary["expense_by_category"][0]["category"] == "อาหาร"
        assert summary["expense_by_category"][0]["total"] == Decimal("250.50")
    finally:
        db.close()
