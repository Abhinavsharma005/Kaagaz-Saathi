import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    GNANI_API_KEY: str = ""
    GNANI_BASE_URL: str = "https://api.vachana.ai"
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    DEV_MOCK_GNANI: bool = True
    DEV_REPLAY_MODE: bool = False

    # Directories
    TTS_CACHE_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cache", "tts")
    SCHEMES_DIR: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rules", "schemes")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
os.makedirs(settings.TTS_CACHE_DIR, exist_ok=True)
