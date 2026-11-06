import base64
import json
import re
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Any

import httpx

from app.config import Settings, get_settings


@dataclass
class GeminiSlipResult:
    success: bool
    amount: Decimal | None = None
    type: str = "expense"
    category: str = "อาหาร"
    transaction_date: datetime | None = None
    party_name: str | None = None
    note: str | None = None
    raw_response: str = ""
    error: str | None = None


GEMINI_PROMPT = """Analyze this Thai bank transfer slip or payment receipt image.
Extract the transaction details accurately and return ONLY a single JSON object (no markdown, no backticks).
Required JSON structure:
{
  "amount": 489.00,
  "type": "expense" or "income",
  "category": "อาหาร" or "เดินทาง" or "การเรียน" or "ที่พัก" or "ช้อปปิ้ง" or "รายได้" or "อื่น ๆ",
  "transaction_date": "YYYY-MM-DDTHH:MM:SS",
  "party_name": "Recipient or store name",
  "note": "Short memo e.g. โอนให้ ร้านค้า..."
}

Rules:
1. amount: the exact transferred amount as a number (e.g. 489.00). Must not be 0. Do not mistake fee (0.00) for amount.
2. type: If the user transferred money out / paid -> "expense". If money was transferred into the user's account -> "income".
3. category: Guess the most suitable category based on recipient name:
   - Food/restaurant/beverage/Cafe -> "อาหาร"
   - Transport/Gas/BTS/Grab -> "เดินทาง"
   - Tuition/Books/Stationery -> "การเรียน"
   - Rent/Electricity/Water/Dorm -> "ที่พัก"
   - Shopping/Clothes/Goods -> "ช้อปปิ้ง"
   - Salary/Allowance/Scholarship -> "รายได้"
   - Other -> "อื่น ๆ" (or "อื่น ๆ: รายละเอียด")
4. transaction_date: Convert Thai Buddhist Year (พ.ศ. 2567 -> 2024, 2568 -> 2025, 2569 -> 2026) to standard Gregorian ISO-8601. Include time if present.
5. Return strictly raw JSON.
"""


def get_model_candidates(api_key: str) -> list[str]:
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
        with httpx.Client(timeout=10.0) as client:
            res = client.get(url)
            if res.status_code == 200:
                models = res.json().get("models", [])
                supported = []
                for m in models:
                    methods = m.get("supportedGenerationMethods", [])
                    if "generateContent" in methods:
                        name = m.get("name", "").replace("models/", "")
                        if name:
                            supported.append(name)
                if supported:
                    flash_models = [m for m in supported if "flash" in m.lower()]
                    other_models = [m for m in supported if "flash" not in m.lower()]
                    return flash_models + other_models
    except Exception:
        pass

    return [
        "gemini-3.8-flash",
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-2.0-flash-exp",
    ]


def scan_slip_with_gemini(
    image_bytes: bytes,
    content_type: str = "image/jpeg",
    settings: Settings | None = None,
) -> GeminiSlipResult:
    settings = settings or get_settings()
    api_key = (settings.gemini_api_key or "").strip()
    if not api_key:
        return GeminiSlipResult(
            success=False,
            error="ยังไม่ได้ใส่ GEMINI_API_KEY บน Render (ขอฟรีได้ที่ aistudio.google.com)",
        )

    b64_img = base64.b64encode(image_bytes).decode("ascii")
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": GEMINI_PROMPT},
                    {
                        "inline_data": {
                            "mime_type": content_type,
                            "data": b64_img,
                        }
                    },
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json",
        },
    }

    models_to_try = get_model_candidates(api_key)
    last_error = ""

    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        try:
            with httpx.Client(timeout=30.0) as client:
                res = client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates") or []
                    if not candidates:
                        continue
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if not parts:
                        continue
                    raw_text = parts[0].get("text", "").strip()
                    # Clean markdown codeblocks if any
                    raw_text = re.sub(r"^```json\s*", "", raw_text)
                    raw_text = re.sub(r"^```\s*", "", raw_text)
                    raw_text = re.sub(r"\s*```$", "", raw_text)
                    parsed = json.loads(raw_text)

                    amount_val = parsed.get("amount")
                    amount = Decimal(str(amount_val)) if amount_val else None

                    date_val = parsed.get("transaction_date")
                    dt = None
                    if date_val:
                        try:
                            dt = datetime.fromisoformat(date_val)
                        except Exception:
                            dt = datetime.now()

                    return GeminiSlipResult(
                        success=True,
                        amount=amount,
                        type=parsed.get("type", "expense"),
                        category=parsed.get("category", "อาหาร"),
                        transaction_date=dt or datetime.now(),
                        party_name=parsed.get("party_name"),
                        note=parsed.get("note") or (f"สลิป: {parsed.get('party_name')}" if parsed.get("party_name") else None),
                        raw_response=raw_text,
                    )
                else:
                    last_error = f"Gemini API error ({res.status_code}): {res.text[:200]}"
        except Exception as exc:
            last_error = f"เกิดข้อผิดพลาดในการเชื่อมต่อ: {str(exc)}"

    return GeminiSlipResult(success=False, error=last_error or "ไม่สามารถประมวลผลสลิปได้")

