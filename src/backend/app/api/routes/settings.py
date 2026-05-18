from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.dependencies import current_user, require_admin, require_moderator_or_admin
from app.core.utils import now_iso
from app.db.connection import get_db

router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsPayload(BaseModel):
    sandboxTimeLimit: int = Field(gt=0, le=600000)
    sandboxMemoryLimit: int = Field(gt=0, le=32768)
    defaultLogLevel: str = "INFO"
    logRetention: str = "30 дней"


def _require_admin(user: dict[str, Any]) -> None:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Доступно только администратору")


def _default_settings() -> dict[str, Any]:
    return {
        "sandboxTimeLimit": 5000,
        "sandboxMemoryLimit": 512,
        "defaultLogLevel": "INFO",
        "logRetention": "30 дней",
        "updatedAt": now_iso(),
    }


@router.get("")
def get_settings(_: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    db = get_db()
    doc = db.app_settings.find_one({"id": "global"}, {"_id": 0})
    if not doc:
        doc = {"id": "global", **_default_settings()}
        db.app_settings.insert_one(doc)
        doc.pop("_id", None)
    return doc


@router.put("")
def update_settings(payload: SettingsPayload, user: dict[str, Any] = Depends(require_moderator_or_admin)) -> dict[str, Any]:
    db = get_db()
    update = payload.model_dump() | {"updatedAt": now_iso()}
    db.app_settings.update_one({"id": "global"}, {"$set": update}, upsert=True)
    return get_settings(user)




@router.post("/maintenance/clear-old-logs")
def clear_old_logs(user: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    db = get_db()
    count = db.match_events.count_documents({"kind": "log"})
    return {"deleted": 0, "availableLogEvents": count}


@router.post("/maintenance/archive-inactive-bots")
def archive_inactive_bots(user: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    db = get_db()
    result = db.bots.update_many({"status": {"$nin": ["active", "archived"]}}, {"$set": {"status": "archived", "updated_at": now_iso()}})
    return {"archived": result.modified_count}
