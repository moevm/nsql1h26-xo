from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from fastapi.responses import Response

from app.core.utils import fmt
from app.db.connection import get_db


def bot_to_api(bot: dict[str, Any]) -> dict[str, Any]:
    db = get_db()
    stats = db.bot_stats.find_one({"bot_id": bot["id"]}) or {}

    return {
        "id": bot["id"],
        "name": bot.get("name", ""),
        "language": bot.get("language", ""),
        "version": bot.get("version", ""),
        "tags": bot.get("tags", []),
        "status": bot.get("status", "active"),
        "uploadedBy": bot.get("uploaded_by", bot.get("owner_login", "")),
        "ownerLogin": bot.get("owner_login", ""),
        "visibility": bot.get("visibility", "public"),
        "created": fmt(bot.get("created_at")),
        "updated": fmt(bot.get("updated_at")),
        "hash": bot.get("hash", ""),
        "description": bot.get("description", ""),
        "comment": bot.get("comment", ""),
        "fileName": bot.get("file_name", "source.zip"),
        "sizeBytes": bot.get("size_bytes", 0),
        "matchesCount": stats.get("total_matches", 0),
        "wins": stats.get("wins", 0),
        "losses": stats.get("losses", 0),
        "draws": stats.get("draws", 0),
        "elo": stats.get("elo", 0),
    }


def build_bot_download_response(bot_id: str) -> Response:
    db = get_db()
    bot = db.bots.find_one({"id": bot_id}, {"_id": 0})

    if not bot:
        raise HTTPException(status_code=404, detail="Бот не найден")

    version = db.bot_versions.find_one({"id": bot.get("active_version_id")}, {"_id": 0}) or {}
    source_blob = version.get("source_blob")

    if source_blob:
        filename = bot.get("file_name") or f"{bot_id}.zip"
        return Response(
            content=bytes(source_blob),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    content = "\n".join([
        f"ID: {bot.get('id', '')}",
        f"Name: {bot.get('name', '')}",
        f"Language: {bot.get('language', '')}",
        f"Version: {bot.get('version', '')}",
        f"Status: {bot.get('status', '')}",
        f"File: {bot.get('file_name', '')}",
        f"Description: {bot.get('description', '')}",
        f"Comment: {bot.get('comment', '')}",
    ])

    return Response(
        content=content,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{bot_id}.txt"'},
    )
