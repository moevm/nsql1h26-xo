from __future__ import annotations

import os


class Settings:

    APP_NAME: str = os.getenv("APP_NAME", "Bot Arena API")
    APP_VERSION: str = os.getenv("APP_VERSION", "0.5.0")

    MONGO_URL: str = os.getenv("MONGO_URL", "mongodb://db:27017")
    MONGO_DB: str = os.getenv("MONGO_DB", os.getenv("MONGO_DB_NAME", "bot_arena"))

    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "*").split(",")
        if origin.strip()
    ]


settings = Settings()
