from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.models import Transaction, User
from app.schemas import AuthResponse, UserLoginRequest, UserOut, UserRegisterRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    clean_uname = payload.username.strip().lower()
    existing = db.scalar(select(User).where(func.lower(User.username) == clean_uname))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ชื่อผู้ใช้งานนี้ถูกใช้งานแล้ว กรุณาเลือกชื่ออื่น",
        )

    user = User(
        username=clean_uname,
        display_name=payload.display_name.strip(),
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.username)
    return AuthResponse(token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=AuthResponse)
def login(payload: UserLoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    clean_uname = payload.username.strip().lower()
    user = db.scalar(select(User).where(func.lower(User.username) == clean_uname))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง",
        )

    token = create_access_token(user.id, user.username)
    return AuthResponse(token=token, user=UserOut.model_validate(user))


@router.post("/demo", response_model=AuthResponse)
def demo_login(db: Session = Depends(get_db)) -> AuthResponse:
    """1-Click instant demo login for students/reviewers"""
    user = db.scalar(select(User).where(User.username == "demo"))
    if not user:
        user = User(
            username="demo",
            display_name="นักศึกษาตัวอย่าง",
            password_hash=hash_password("123456"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Attach any orphan transactions without user_id to demo user
        orphans = db.scalars(select(Transaction).where(Transaction.user_id.is_(None))).all()
        for t in orphans:
            t.user_id = user.id
        if orphans:
            db.commit()

    token = create_access_token(user.id, user.username)
    return AuthResponse(token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)

