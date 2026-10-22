import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.constants import CATEGORIES
from app.database import get_db
from app.models import Transaction
from app.schemas import (
    CategoryList,
    TransactionCreate,
    TransactionOut,
    TransactionUpdate,
    require_confirmed_fields,
)
from app.services.finance import apply_transaction_filters

router = APIRouter()


@router.get("/api/categories", response_model=CategoryList)
def list_categories() -> CategoryList:
    return CategoryList(categories=CATEGORIES)


@router.get("/api/transactions", response_model=list[TransactionOut])
def list_transactions(
    status_filter: str | None = Query(default=None, alias="status"),
    source: str | None = None,
    category: str | None = None,
    type: str | None = Query(default=None, alias="type"),
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
    search: str | None = None,
    db: Session = Depends(get_db),
) -> list[Transaction]:
    stmt = select(Transaction).order_by(Transaction.created_at.desc(), Transaction.id.desc())
    stmt = apply_transaction_filters(
        stmt,
        status=status_filter,
        source=source,
        category=category,
        type_=type,
        date_from=date_from,
        date_to=date_to,
        month=month,
        search=search,
    )
    return list(db.scalars(stmt).all())


@router.get("/api/transactions/export")
def export_transactions_csv(
    status_filter: str | None = Query(default=None, alias="status"),
    source: str | None = None,
    category: str | None = None,
    type: str | None = Query(default=None, alias="type"),
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
    search: str | None = None,
    db: Session = Depends(get_db),
) -> Response:
    stmt = select(Transaction).order_by(Transaction.transaction_date.desc(), Transaction.id.desc())
    stmt = apply_transaction_filters(
        stmt,
        status=status_filter,
        source=source,
        category=category,
        type_=type,
        date_from=date_from,
        date_to=date_to,
        month=month,
        search=search,
    )
    items = list(db.scalars(stmt).all())

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "วันที่", "ประเภท", "หมวดหมู่", "จำนวนเงิน", "สกุลเงิน", "ที่มา", "สถานะ", "ผู้เกี่ยวข้อง", "หมายเหตุ"])
    for item in items:
        type_str = "รายรับ" if item.type == "income" else ("รายจ่าย" if item.type == "expense" else "-")
        source_str = "เพิ่มเอง" if item.source == "manual" else ("LINE OCR" if item.source == "line_ocr" else "Web OCR")
        status_str = "ยืนยันแล้ว" if item.status == "confirmed" else ("รอตรวจสอบ" if item.status == "pending_review" else "ปฏิเสธ")
        date_str = item.transaction_date.strftime("%Y-%m-%d %H:%M:%S") if item.transaction_date else ""
        writer.writerow([
            item.id,
            date_str,
            type_str,
            item.category or "",
            f"{item.amount:.2f}" if item.amount is not None else "",
            item.currency,
            source_str,
            status_str,
            item.party_name or "",
            item.note or "",
        ])

    csv_bytes = ("\ufeff" + output.getvalue()).encode("utf-8")
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="transactions.csv"'},
    )


@router.post("/api/transactions", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db)) -> Transaction:
    try:
        require_confirmed_fields(payload, payload.status)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    item = Transaction(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/api/transactions/{transaction_id}", response_model=TransactionOut)
def update_transaction(
    transaction_id: int, payload: TransactionUpdate, db: Session = Depends(get_db)
) -> Transaction:
    item = db.get(Transaction, transaction_id)
    if item is None:
        raise HTTPException(status_code=404, detail="ไม่พบรายการ")

    data = payload.model_dump(exclude_unset=True)
    next_status = data.get("status", item.status)
    merged = TransactionUpdate(
        type=data.get("type", item.type),
        amount=data.get("amount", item.amount),
        currency=data.get("currency", item.currency),
        category=data.get("category", item.category),
        transaction_date=data.get("transaction_date", item.transaction_date),
        note=data.get("note", item.note),
        status=next_status,
    )
    try:
        require_confirmed_fields(merged, next_status)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    for key, value in data.items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/api/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)) -> None:
    item = db.get(Transaction, transaction_id)
    if item is None:
        raise HTTPException(status_code=404, detail="ไม่พบรายการ")
    db.delete(item)
    db.commit()


@router.post("/api/transactions/{transaction_id}/confirm", response_model=TransactionOut)
def confirm_transaction(
    transaction_id: int, payload: TransactionUpdate, db: Session = Depends(get_db)
) -> Transaction:
    item = db.get(Transaction, transaction_id)
    if item is None:
        raise HTTPException(status_code=404, detail="ไม่พบรายการ")
    if item.status == "rejected":
        raise HTTPException(status_code=409, detail="รายการนี้ถูกปฏิเสธแล้ว")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(item, key, value)
    item.status = "confirmed"
    merged = TransactionUpdate(
        type=item.type,
        amount=item.amount,
        currency=item.currency,
        category=item.category,
        transaction_date=item.transaction_date,
        note=item.note,
        status=item.status,
    )
    try:
        require_confirmed_fields(merged, "confirmed")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    db.commit()
    db.refresh(item)
    return item


@router.post("/api/transactions/{transaction_id}/reject", response_model=TransactionOut)
def reject_transaction(transaction_id: int, db: Session = Depends(get_db)) -> Transaction:
    item = db.get(Transaction, transaction_id)
    if item is None:
        raise HTTPException(status_code=404, detail="ไม่พบรายการ")
    item.status = "rejected"
    db.commit()
    db.refresh(item)
    return item
