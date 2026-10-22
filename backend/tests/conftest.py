import os
from collections.abc import Generator

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["LINE_MOCK_MODE"] = "true"
os.environ["LINE_CHANNEL_SECRET"] = "test-channel-secret"
os.environ["LINE_CHANNEL_ACCESS_TOKEN"] = ""
os.environ["SEED_DEMO_DATA"] = "false"
os.environ["OCR_PROVIDER"] = "mock"

from app.config import get_settings

get_settings.cache_clear()

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine, get_db
from app.main import app

Base.metadata.create_all(bind=engine)


def override_get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


def pytest_sessionstart() -> None:
    Base.metadata.create_all(bind=engine)


def pytest_runtest_setup() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def client() -> TestClient:
    return TestClient(app)
