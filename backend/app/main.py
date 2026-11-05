from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.routers import (
    auth,
    dashboard,
    health,
    line_webhook,
    settings as settings_router,
    slips,
    transactions,
)
from app.seed import seed_demo_data

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        try:
            conn.execute(
                text("ALTER TABLE transactions ADD COLUMN user_id INTEGER REFERENCES users(id)")
            )
            conn.commit()
        except Exception:
            pass

    if settings.seed_demo_data:
        db = SessionLocal()
        try:
            seed_demo_data(db)
        finally:
            db.close()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(health.router)
app.include_router(transactions.router)
app.include_router(dashboard.router)
app.include_router(line_webhook.router)
app.include_router(settings_router.router)
app.include_router(slips.router)

from pathlib import Path
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

dist_paths = [
    Path(__file__).resolve().parent.parent.parent / "frontend" / "dist",
    Path(__file__).resolve().parent.parent / "dist",
    Path("./frontend/dist"),
    Path("./dist"),
]
dist_dir = next((p for p in dist_paths if p.is_dir()), None)

if dist_dir:
    assets_dir = dist_dir / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        file_path = dist_dir / full_path
        if full_path and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(dist_dir / "index.html")

