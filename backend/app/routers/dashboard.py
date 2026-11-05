from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.schemas import DashboardSummary
from app.services.finance import calculate_summary

router = APIRouter()


@router.get("/api/dashboard/summary", response_model=DashboardSummary)
def dashboard_summary(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> DashboardSummary:
    return DashboardSummary.model_validate(calculate_summary(db, user_id=current_user.id))
