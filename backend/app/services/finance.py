from collections import defaultdict
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import Select, or_, select
from sqlalchemy.orm import Session

from app.models import Transaction

MONEY_QUANT = Decimal("0.01")


def quantize_money(value: Decimal | None) -> Decimal:
    if value is None:
        return Decimal("0.00")
    return Decimal(value).quantize(MONEY_QUANT, rounding=ROUND_HALF_UP)


def apply_transaction_filters(
    stmt: Select[tuple[Transaction]],
    *,
    user_id: int | None = None,
    status: str | None = None,
    source: str | None = None,
    category: str | None = None,
    type_: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    month: str | None = None,
    search: str | None = None,
) -> Select[tuple[Transaction]]:
    if user_id is not None:
        stmt = stmt.where(Transaction.user_id == user_id)
    if status:
        stmt = stmt.where(Transaction.status == status)
    if source:
        stmt = stmt.where(Transaction.source == source)
    if category:
        stmt = stmt.where(Transaction.category == category)
    if type_:
        stmt = stmt.where(Transaction.type == type_)
    if date_from:
        stmt = stmt.where(Transaction.transaction_date >= date_from)
    if date_to:
        stmt = stmt.where(Transaction.transaction_date <= date_to)
    if month:
        year, month_num = month.split("-")
        stmt = stmt.where(
            Transaction.transaction_date >= datetime(int(year), int(month_num), 1),
        )
        if int(month_num) == 12:
            next_month = datetime(int(year) + 1, 1, 1)
        else:
            next_month = datetime(int(year), int(month_num) + 1, 1)
        stmt = stmt.where(Transaction.transaction_date < next_month)
    if search and search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Transaction.note.ilike(term),
                Transaction.party_name.ilike(term),
                Transaction.category.ilike(term),
            )
        )
    return stmt


def calculate_summary(db: Session, user_id: int | None = None) -> dict:
    stmt = select(Transaction).where(Transaction.status == "confirmed")
    if user_id is not None:
        stmt = stmt.where(Transaction.user_id == user_id)
    rows = db.scalars(stmt).all()
    income = Decimal("0.00")
    expense = Decimal("0.00")
    by_category: dict[str, Decimal] = defaultdict(lambda: Decimal("0.00"))

    for row in rows:
        amount = quantize_money(row.amount)
        if row.type == "income":
            income += amount
        elif row.type == "expense":
            expense += amount
            if row.category:
                by_category[row.category] += amount

    pending_stmt = select(Transaction).where(Transaction.status == "pending_review")
    if user_id is not None:
        pending_stmt = pending_stmt.where(Transaction.user_id == user_id)
    pending_review_count = len(db.scalars(pending_stmt).all())
    confirmed_count = len(rows)

    expense_by_category = [
        {"category": category, "total": quantize_money(total)}
        for category, total in sorted(by_category.items(), key=lambda item: item[1], reverse=True)
    ]

    return {
        "income_total": quantize_money(income),
        "expense_total": quantize_money(expense),
        "balance": quantize_money(income - expense),
        "pending_review_count": pending_review_count,
        "confirmed_count": confirmed_count,
        "expense_by_category": expense_by_category,
        "currency": "THB",
    }


def find_by_external_message_id(db: Session, message_id: str) -> Transaction | None:
    return db.scalar(select(Transaction).where(Transaction.external_message_id == message_id))
