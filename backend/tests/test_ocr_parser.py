from decimal import Decimal

from app.services.ocr.parser import parse_slip_text


def test_parse_thai_slip_amount_date_and_party() -> None:
    text = """
    โอนเงินสำเร็จ
    จำนวนเงิน 1,250.50 บาท
    วันที่ 18/10/2026
    เวลา 11:32
    ผู้รับ นายสมชาย ใจดี
    ผู้โอน นางสาวมานี รักเรียน
    """
    parsed = parse_slip_text(text)
    assert parsed.amount == Decimal("1250.50")
    assert parsed.transaction_date is not None
    assert parsed.transaction_date.year == 2026
    assert parsed.transaction_date.hour == 11
    assert parsed.party_name is not None
    assert "สมชาย" in parsed.party_name


def test_unreadable_fields_stay_null() -> None:
    parsed = parse_slip_text("ใบเสร็จอย่างย่อ ไม่มีตัวเลขที่ชัดเจน")
    assert parsed.amount is None
    assert parsed.transaction_date is None
    assert parsed.party_name is None


def test_does_not_guess_from_unrelated_numbers() -> None:
    parsed = parse_slip_text("เลขที่อ้างอิง 998877")
    assert parsed.amount is None
