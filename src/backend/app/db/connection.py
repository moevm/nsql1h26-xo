from __future__ import annotations

from pymongo import MongoClient
from pymongo.database import Database

from app.core.config import settings

client = MongoClient(settings.MONGO_URL)
db = client[settings.MONGO_DB]


def get_db() -> Database:
    return db
