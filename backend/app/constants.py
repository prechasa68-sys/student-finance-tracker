CATEGORIES = [
    "อาหาร",
    "เดินทาง",
    "การเรียน",
    "ที่พัก",
    "ช้อปปิ้ง",
    "รายได้",
    "อื่น ๆ",
]

INCOME_CATEGORIES = {"รายได้"}
TRANSACTION_TYPES = {"income", "expense"}
TRANSACTION_STATUSES = {"pending_review", "confirmed", "rejected"}
TRANSACTION_SOURCES = {"manual", "line_ocr", "web_ocr"}
ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
}
ALLOWED_IMAGE_MAGIC = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"GIF87a": "image/gif",
    b"GIF89a": "image/gif",
    b"RIFF": "image/webp",
}
