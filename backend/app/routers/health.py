from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.schemas import HealthResponse
from app.services.ocr.factory import get_ocr_provider

router = APIRouter()


@router.get("/api/health", response_model=HealthResponse)
def health(db: Session = Depends(get_db)) -> HealthResponse:
    settings = get_settings()
    db_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    if settings.effective_line_mock_mode:
        line_status = "mock"
    elif settings.line_credentials_configured:
        line_status = "configured"
    else:
        line_status = "not_configured"

    return HealthResponse(
        status="ok" if db_status == "ok" else "degraded",
        database=db_status,
        line=line_status,
        ocr_provider=get_ocr_provider(settings).name,
    )
