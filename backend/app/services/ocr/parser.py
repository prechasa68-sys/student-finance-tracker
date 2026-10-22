from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal, InvalidOperation

THAI_MONTHS = {
    "ม.ค.": 1,
    "ก.พ.": 2,
    "มี.ค.": 3,
    "เม.ย.": 4,
    "พ.ค.": 5,
    "มิ.ย.": 6,
    "ก.ค.": 7,
    "ส.ค.": 8,
    "ก.ย.": 9,
    "ต.ค.": 10,
    "พ.ย.": 11,
    "ธ.ค.": 12,
}

AMOUNT_PATTERNS = [
    re.compile(r"(?:จำนวนเงิน|ยอดเงิน|ยอดโอน|amount)\s*[:\-]?\s*฿?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})|[0-9]+(?:\.[0-9]{1,2})?)", re.IGNORECASE),
    re.compile(r"฿\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)"),
    re.compile(r"([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})|[0-9]+(?:\.[0-9]{1,2})?)\s*(?:บาท|THB)\b", re.IGNORECASE),
]

DATE_PATTERNS = [
    re.compile(r"(?:วันที่|date)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})", re.IGNORECASE),
    re.compile(r"(\d{4}-\d{2}-\d{2})"),
    re.compile(r"(\d{1,2}\s*(?:ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s*\d{2,4})"),
]

TIME_PATTERNS = [
    re.compile(r"(?:เวลา|time)\s*[:\-]?\s*(\d{1,2}[:.]\d{2}(?:[:.]\d{2})?)", re.IGNORECASE),
    re.compile(r"\b(\d{1,2}:\d{2}(?::\d{2})?)\b"),
]

PARTY_PATTERNS = [
    re.compile(r"(?:ผู้รับเงิน|ผู้รับโอน|ผู้รับ|to)\s*[:\-]?\s*(.+)", re.IGNORECASE),
    re.compile(r"(?:ผู้โอน|จาก|from)\s*[:\-]?\s*(.+)", re.IGNORECASE),
]


@dataclass
class ParsedSlip:
    amount: Decimal | None
    currency: str | None
    transaction_date: datetime | None
    party_name: str | None
    note: str | None
    raw_text: str

    def readable_fields(self) -> list[str]:
        fields = []
        if self.amount is not None:
            fields.append("จำนวนเงิน")
        if self.transaction_date is not None:
            fields.append("วันที่/เวลา")
        if self.party_name:
            fields.append("ชื่อผู้เกี่ยวข้อง")
        return fields


def _parse_amount(text: str) -> Decimal | None:
    for pattern in AMOUNT_PATTERNS:
        match = pattern.search(text)
        if not match:
            continue
        raw = match.group(1).replace(",", "")
        try:
            value = Decimal(raw)
        except InvalidOperation:
            return None
        if value <= 0:
            return None
        return value
    return None


def _to_gregorian_year(year: int) -> int:
    if year > 2400:
        return year - 543
    if year < 100:
        return 2000 + year
    return year


def _parse_date(text: str) -> datetime | None:
    date_value: datetime | None = None
    for pattern in DATE_PATTERNS:
        match = pattern.search(text)
        if not match:
            continue
        raw = match.group(1).strip()
        date_value = _coerce_date(raw)
        if date_value:
            break
    if date_value is None:
        return None

    time_value = None
    for pattern in TIME_PATTERNS:
        match = pattern.search(text)
        if match:
            time_value = match.group(1).replace(".", ":")
            break
    if time_value:
        parts = [int(part) for part in time_value.split(":")]
        while len(parts) < 3:
            parts.append(0)
        return date_value.replace(hour=parts[0], minute=parts[1], second=parts[2])
    return date_value


def _coerce_date(raw: str) -> datetime | None:
    thai_month = re.match(
        r"(\d{1,2})\s*(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s*(\d{2,4})",
        raw,
    )
    if thai_month:
        day = int(thai_month.group(1))
        month = THAI_MONTHS[thai_month.group(2)]
        year = _to_gregorian_year(int(thai_month.group(3)))
        try:
            return datetime(year, month, day)
        except ValueError:
            return None

    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y", "%d-%m-%y"):
        try:
            parsed = datetime.strptime(raw, fmt)
            if fmt in {"%d/%m/%y", "%d-%m-%y"}:
                parsed = parsed.replace(year=_to_gregorian_year(parsed.year % 100))
            elif parsed.year > 2400:
                parsed = parsed.replace(year=_to_gregorian_year(parsed.year))
            return parsed
        except ValueError:
            continue
    return None


def _parse_party(text: str) -> str | None:
    names: list[str] = []
    for pattern in PARTY_PATTERNS:
        match = pattern.search(text)
        if match:
            value = match.group(1).strip()
            value = re.split(r"[\n\r]", value, maxsplit=1)[0].strip(" :-")
            if value:
                names.append(value)
    if not names:
        return None
    unique = []
    for name in names:
        if name not in unique:
            unique.append(name)
    return " / ".join(unique[:2])


def parse_slip_text(raw_text: str) -> ParsedSlip:
    amount = _parse_amount(raw_text)
    transaction_date = _parse_date(raw_text)
    party_name = _parse_party(raw_text)
    currency = "THB" if amount is not None and re.search(r"บาท|THB|฿", raw_text, re.IGNORECASE) else ("THB" if amount else None)
    note_parts = []
    if party_name:
        note_parts.append(f"จากสลิป: {party_name}")
    return ParsedSlip(
        amount=amount,
        currency=currency or "THB",
        transaction_date=transaction_date,
        party_name=party_name,
        note=" | ".join(note_parts) if note_parts else None,
        raw_text=raw_text[:4000],
    )
