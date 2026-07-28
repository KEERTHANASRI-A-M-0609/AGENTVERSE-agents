from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # App
    APP_NAME: str = "ShopMind AI - Demand Prediction Agent"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Security
    API_KEY: str = "shopmind_dev_api_key_2025"

    # Database
    DATABASE_URL: str = "sqlite:///./shopmind.db"

    # ML
    MODEL_STORE_PATH: str = "./models_store"
    MIN_HISTORY_DAYS: int = 7
    DEFAULT_FORECAST_HORIZON: int = 7
    DEFAULT_LEAD_TIME_DAYS: int = 3
    LOW_CONFIDENCE_THRESHOLD: float = 0.5

    # Gemini — off by default so dashboard/bulk never drain API quota
    GEMINI_ENABLED: bool = False
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    GEMINI_TIMEOUT: int = 30

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "./logs/app.log"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    def get_cors_origins(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]


settings = Settings()
