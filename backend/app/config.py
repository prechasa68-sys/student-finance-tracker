from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Student Finance Tracker"
    app_env: str = "development"
    database_url: str = "sqlite:///./data/finance.db"
    cors_origins: str = "http://localhost:5173"

    line_channel_secret: str = ""
    line_channel_access_token: str = ""
    line_mock_mode: bool = True

    ocr_provider: str = "mock"
    ocr_space_api_key: str = ""
    ocr_space_endpoint: str = "https://api.ocr.space/parse/image"
    gemini_api_key: str = ""
    ocr_timeout_seconds: float = 20.0
    max_image_bytes: int = 5 * 1024 * 1024

    seed_demo_data: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def line_credentials_configured(self) -> bool:
        return bool(self.line_channel_secret and self.line_channel_access_token)

    @property
    def effective_line_mock_mode(self) -> bool:
        return self.line_mock_mode or not self.line_credentials_configured


@lru_cache
def get_settings() -> Settings:
    return Settings()
