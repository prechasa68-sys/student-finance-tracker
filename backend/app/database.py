from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings


class Base(DeclarativeBase):
    pass


def _ensure_sqlite_dir(database_url: str) -> None:
    if not database_url.startswith("sqlite:///"):
        return
    db_path = database_url.replace("sqlite:///", "", 1)
    if db_path in {":memory:", ""} or db_path.startswith("file:"):
        return
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)


settings = get_settings()
_ensure_sqlite_dir(settings.database_url)

raw_url = settings.database_url
if raw_url.startswith("postgres://"):
    raw_url = raw_url.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if raw_url.startswith("sqlite") else {}
engine_kwargs: dict = {"connect_args": connect_args}
if raw_url in {"sqlite:///:memory:", "sqlite://"}:
    engine_kwargs["poolclass"] = StaticPool
elif not raw_url.startswith("sqlite"):
    engine_kwargs["pool_pre_ping"] = True

engine = create_engine(raw_url, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
