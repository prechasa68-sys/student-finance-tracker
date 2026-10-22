import httpx
from fastapi import APIRouter

from app.config import get_settings
from app.schemas import LineStatusResponse
from app.services.line import LineClient
from app.services.ocr.factory import get_ocr_provider

router = APIRouter()


@router.get("/api/settings/line", response_model=LineStatusResponse)
def line_status() -> LineStatusResponse:
    settings = get_settings()
    ocr_name = get_ocr_provider(settings).name

    if settings.effective_line_mock_mode:
        return LineStatusResponse(
            status="Mock mode",
            configured=settings.line_credentials_configured,
            mock_mode=True,
            ocr_provider=ocr_name,
            message="กำลังใช้โหมดจำลอง สามารถเพิ่มรายการเองได้โดยไม่ต้องมี LINE credentials",
        )

    if not settings.line_credentials_configured:
        return LineStatusResponse(
            status="Not configured",
            configured=False,
            mock_mode=False,
            ocr_provider=ocr_name,
            message="ยังไม่ได้ตั้งค่า LINE_CHANNEL_SECRET และ LINE_CHANNEL_ACCESS_TOKEN",
        )

    try:
        info = LineClient(settings).get_bot_info()
        return LineStatusResponse(
            status="Connected",
            configured=True,
            mock_mode=False,
            ocr_provider=ocr_name,
            message="เชื่อมต่อ LINE Messaging API สำเร็จ",
            bot_display_name=info.get("displayName"),
        )
    except httpx.HTTPError:
        return LineStatusResponse(
            status="Error",
            configured=True,
            mock_mode=False,
            ocr_provider=ocr_name,
            message="มี credentials แต่เรียก LINE Bot Info API ไม่สำเร็จ",
        )
