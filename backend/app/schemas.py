from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.constants import CATEGORIES, TRANSACTION_SOURCES, TRANSACTION_STATUSES, TRANSACTION_TYPES


class TransactionBase(BaseModel):
    type: Literal["income", "expense"] | None = None
    amount: Decimal | None = Field(default=None, max_digits=12, decimal_places=2)
    currency: str = "THB"
    category: str | None = None
    transaction_date: datetime | None = None
    note: str | None = None

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, value: Decimal | None) -> Decimal | None:
        if value is not None and value <= 0:
            raise ValueError("จำนวนเงินต้องมากกว่า 0")
        return value

    @field_validator("type")
    @classmethod
    def type_must_be_valid(cls, value: str | None) -> str | None:
        if value is not None and value not in TRANSACTION_TYPES:
            raise ValueError("ประเภทต้องเป็น income หรือ expense")
        return value

    @field_validator("category")
    @classmethod
    def category_must_be_known(cls, value: str | None) -> str | None:
        if value is not None and value not in CATEGORIES:
            raise ValueError("หมวดหมู่ไม่ถูกต้อง")
        return value


class TransactionCreate(TransactionBase):
    source: Literal["manual", "line_ocr", "web_ocr"] = "manual"
    status: Literal["pending_review", "confirmed", "rejected"] = "confirmed"

    @field_validator("source")
    @classmethod
    def source_must_be_valid(cls, value: str) -> str:
        if value not in TRANSACTION_SOURCES:
            raise ValueError("แหล่งที่มาไม่ถูกต้อง")
        return value


class TransactionUpdate(TransactionBase):
    status: Literal["pending_review", "confirmed", "rejected"] | None = None


class TransactionOut(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source: str
    status: str
    external_message_id: str | None = None
    raw_ocr_text: str | None = None
    party_name: str | None = None
    created_at: datetime
    updated_at: datetime


class DashboardCategoryTotal(BaseModel):
    category: str
    total: Decimal


class DashboardSummary(BaseModel):
    income_total: Decimal
    expense_total: Decimal
    balance: Decimal
    pending_review_count: int
    confirmed_count: int
    expense_by_category: list[DashboardCategoryTotal]
    currency: str = "THB"


class LineStatusResponse(BaseModel):
    status: Literal["Connected", "Not configured", "Error", "Mock mode"]
    configured: bool
    mock_mode: bool
    ocr_provider: str
    message: str
    bot_display_name: str | None = None


class HealthResponse(BaseModel):
    status: str
    database: str
    line: str
    ocr_provider: str


class WebhookAck(BaseModel):
    status: str
    processed_events: int = 0


class CategoryList(BaseModel):
    categories: list[str]


class SlipUploadRequest(BaseModel):
    image_base64: str
    filename: str | None = None



def require_confirmed_fields(payload: TransactionBase, status: str) -> None:
    if status != "confirmed":
        return
    if payload.type is None:
        raise ValueError("ต้องระบุประเภทรายการก่อนยืนยัน")
    if payload.amount is None:
        raise ValueError("ต้องระบุจำนวนเงินก่อนยืนยัน")
    if payload.category is None:
        raise ValueError("ต้องระบุหมวดหมู่ก่อนยืนยัน")
    if payload.transaction_date is None:
        raise ValueError("ต้องระบุวันที่ก่อนยืนยัน")
    if status not in TRANSACTION_STATUSES:
        raise ValueError("สถานะไม่ถูกต้อง")
