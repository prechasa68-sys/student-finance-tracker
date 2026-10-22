import base64

import httpx

from app.config import Settings
from app.services.ocr.base import OcrProvider, OcrResult


class OcrSpaceProvider(OcrProvider):
    """OCR.space REST API documented at https://ocr.space/ocrapi"""

    name = "ocr_space"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def extract_text(self, image_bytes: bytes, content_type: str) -> OcrResult:
        if not self.settings.ocr_space_api_key:
            return OcrResult(
                text="",
                provider=self.name,
                success=False,
                error="ยังไม่ได้ตั้งค่า OCR_SPACE_API_KEY",
            )

        encoded = base64.b64encode(image_bytes).decode("ascii")
        payload = {
            "base64Image": f"data:{content_type};base64,{encoded}",
            "language": "tha",
            "isOverlayRequired": "false",
            "OCREngine": "2",
            "scale": "true",
            "isTable": "true",
        }
        headers = {"apikey": self.settings.ocr_space_api_key}

        try:
            with httpx.Client(timeout=self.settings.ocr_timeout_seconds) as client:
                response = client.post(self.settings.ocr_space_endpoint, data=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
        except httpx.TimeoutException:
            return OcrResult(text="", provider=self.name, success=False, error="OCR timeout")
        except httpx.HTTPError:
            return OcrResult(text="", provider=self.name, success=False, error="ไม่สามารถเชื่อมต่อ OCR ได้")

        if data.get("IsErroredOnProcessing"):
            messages = data.get("ErrorMessage") or ["OCR processing error"]
            error = messages[0] if isinstance(messages, list) else str(messages)
            return OcrResult(text="", provider=self.name, success=False, error=error)

        parsed_results = data.get("ParsedResults") or []
        texts = [item.get("ParsedText") or "" for item in parsed_results]
        text = "\n".join(part for part in texts if part).strip()
        if not text:
            return OcrResult(text="", provider=self.name, success=False, error="ไม่พบข้อความในรูป")
        return OcrResult(text=text, provider=self.name, success=True)
