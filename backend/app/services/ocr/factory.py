from app.config import Settings, get_settings
from app.services.ocr.base import OcrProvider
from app.services.ocr.mock import MockOcrProvider
from app.services.ocr.ocr_space import OcrSpaceProvider


def get_ocr_provider(settings: Settings | None = None) -> OcrProvider:
    settings = settings or get_settings()
    provider = (settings.ocr_provider or "mock").strip().lower()
    if provider == "ocr_space":
        return OcrSpaceProvider(settings)
    return MockOcrProvider()
