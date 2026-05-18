from __future__ import annotations

import time

from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import PyMongoError

from app.core.config import settings

client = MongoClient(settings.MONGO_URL, serverSelectionTimeoutMS=2000)
db = client[settings.MONGO_DB]


def get_db() -> Database:
    return db


def wait_for_database(retries: int = 30, delay_seconds: float = 1.0) -> None:
    """Ждёт готовности MongoDB перед автозагрузкой демонстрационных данных."""
    last_error: Exception | None = None

    for _ in range(retries):
        try:
            client.admin.command("ping")
            return
        except PyMongoError as exc:
            last_error = exc
            time.sleep(delay_seconds)

    raise RuntimeError("MongoDB is not available for backend startup") from last_error