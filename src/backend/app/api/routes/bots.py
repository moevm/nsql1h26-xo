from __future__ import annotations

import hashlib
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.api.dependencies import current_user, require_moderator_or_admin
from app.core.utils import contains, now_iso
from app.core.upload_limits import MAX_BOT_UPLOAD_BYTES, read_upload_limited
from app.db.connection import get_db
from app.services.bots import bot_to_api, build_bot_download_response

router = APIRouter(prefix="/bots", tags=["bots"])


class BotUpdateRequest(BaseModel):
    name: str | None = None
    language: str | None = None
    version: str | None = None
    tags: list[str] | None = None
    visibility: str | None = None
    status: str | None = None
    description: str | None = None
    comment: str | None = None
    runSettings: dict[str, Any] | None = Field(default=None, alias="runSettings")


@router.get("")
def bots(
    id: str | None = None,
    name: str | None = None,
    language: str | None = None,
    version: str | None = None,
    status: str | None = None,
    tag: str | None = None,
    owner_login: str | None = None,
    _: dict[str, Any] = Depends(current_user),
) -> list[dict[str, Any]]:
    db = get_db()
    result = []

    for bot in db.bots.find({}, {"_id": 0}).sort("updated_at", -1):
        if not contains(bot.get("id"), id):
            continue
        if not contains(bot.get("name"), name):
            continue
        if not contains(bot.get("language"), language):
            continue
        if not contains(bot.get("version"), version):
            continue
        if not contains(bot.get("status"), status):
            continue
        if not contains(bot.get("tags"), tag):
            continue
        if not contains(bot.get("owner_login"), owner_login):
            continue

        result.append(bot_to_api(bot))

    return result


@router.post("")
async def create_bot(
    name: str = Form(...),
    language: str = Form(...),
    version: str = Form(...),
    tags: str = Form(""),
    visibility: str = Form("public"),
    description: str = Form(""),
    comment: str = Form(""),
    file: UploadFile = File(...),
    user: dict[str, Any] = Depends(require_moderator_or_admin),
) -> dict[str, Any]:
    db = get_db()
    if language.strip().lower() != "python":
        raise HTTPException(status_code=400, detail="Сейчас поддерживаются только Python-боты")

    if not file.filename or not file.filename.lower().endswith(".py"):
        raise HTTPException(
            status_code=400,
            detail="Неподдерживаемый формат файла. Используйте Python-файл .py",
        )

    content = await read_upload_limited(file, max_bytes=MAX_BOT_UPLOAD_BYTES, label="Файл бота")

    if not content:
        raise HTTPException(status_code=400, detail="Файл пустой или повреждён")

    number = db.bots.count_documents({}) + 1
    bot_id = f"B-{number:03d}"
    digest = hashlib.sha256(content).hexdigest()
    created = now_iso()

    bot = {
        "id": bot_id,
        "owner_login": user["email"].split("@")[0],
        "uploaded_by": user["name"],
        "name": name,
        "language": "Python",
        "version": version,
        "visibility": visibility,
        "status": "active",
        "created_at": created,
        "updated_at": created,
        "active_version_id": f"V-{number:03d}",
        "tags": [item.strip() for item in tags.split(",") if item.strip()],
        "hash": digest[:8],
        "description": description,
        "comment": comment,
        "file_name": file.filename,
        "size_bytes": len(content),
        "run_settings": {"max_moves": 225, "move_timeout_ms": 1000},
    }

    db.bots.insert_one(bot)
    db.bot_versions.insert_one({
        "id": bot["active_version_id"],
        "bot_id": bot_id,
        "version_no": 1,
        "sha256": digest,
        "size_bytes": len(content),
        "entrypoint": "main.py",
        "source_blob": content,
        "created_at": created,
    })
    db.bot_stats.insert_one({
        "bot_id": bot_id,
        "updated_at": created,
        "elo": 1000,
        "total_matches": 0,
        "wins": 0,
        "draws": 0,
        "losses": 0,
        "avg_moves": 0,
        "avg_duration_ms": 0,
        "last_100_winrate": 0,
    })

    return bot_to_api(bot)


@router.get("/{bot_id}")
def bot_detail(bot_id: str, _: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    db = get_db()
    bot = db.bots.find_one({"id": bot_id}, {"_id": 0})

    if not bot:
        raise HTTPException(status_code=404, detail="Бот не найден")

    return bot_to_api(bot)


@router.put("/{bot_id}")
def update_bot(bot_id: str, payload: BotUpdateRequest, _: dict[str, Any] = Depends(require_moderator_or_admin)) -> dict[str, Any]:
    db = get_db()
    bot = db.bots.find_one({"id": bot_id}, {"_id": 0})

    if not bot:
        raise HTTPException(status_code=404, detail="Бот не найден")

    raw = payload.model_dump(by_alias=True)
    update = {}
    for key, value in raw.items():
        if value is None:
            continue
        if key == "language":
            if str(value).strip().lower() != "python":
                raise HTTPException(status_code=400, detail="Сейчас поддерживаются только Python-боты")
            update["language"] = "Python"
        elif key == "runSettings":
            max_moves = max(1, min(1000, int(value.get("maxMoves") or value.get("max_moves") or 225)))
            timeout = max(100, min(30000, int(value.get("moveTimeoutMs") or value.get("move_timeout_ms") or 1000)))
            update["run_settings"] = {"max_moves": max_moves, "move_timeout_ms": timeout}
        else:
            update[key] = value
    if update:
        update["updated_at"] = now_iso()
        db.bots.update_one({"id": bot_id}, {"$set": update})

    updated = db.bots.find_one({"id": bot_id}, {"_id": 0})
    return bot_to_api(updated)


@router.get("/{bot_id}/download")
def bot_download(bot_id: str, _: dict[str, Any] = Depends(current_user)) -> Response:
    return build_bot_download_response(bot_id)
