from app.services.ocr.base import OcrProvider, OcrResult

SAMPLE_SLIP = """
ธนาคารกรุงไทย
โอนเงินสำเร็จ
จำนวนเงิน 350.00 บาท
วันที่ 18/10/2026
เวลา 11:32
ผู้รับ นายสมชาย ใจดี
ผู้โอน นางสาวมานี รักเรียน
"""


class MockOcrProvider(OcrProvider):
    name = "mock"

    def extract_text(self, image_bytes: bytes, content_type: str) -> OcrResult:
        if not image_bytes:
            return OcrResult(text="", provider=self.name, success=False, error="ไม่มีข้อมูลรูปภาพ")
        return OcrResult(text=SAMPLE_SLIP.strip(), provider=self.name, success=True)
