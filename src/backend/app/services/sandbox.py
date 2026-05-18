from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any

from fastapi import HTTPException

from app.core.config import settings
from app.db.connection import get_db


DEFAULT_STATE: dict[str, Any] = {
    "matchId": "sandbox-test",
    "mark": "X",
    "winCondition": 5,
    "maxMoves": 225,
    "moves": [],
    "board": {
        "minX": -9,
        "maxX": 9,
        "minY": -9,
        "maxY": 9,
    },
}


def _decode_source_blob(source_blob: Any) -> str:
    if source_blob is None:
        raise HTTPException(status_code=400, detail="У активной версии бота нет сохранённого исходного кода")

    if isinstance(source_blob, str):
        return source_blob

    try:
        return bytes(source_blob).decode("utf-8")
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail="Sandbox сейчас поддерживает только текстовые Python-файлы .py в UTF-8",
        ) from exc


def get_active_bot_code(bot_id: str) -> tuple[dict[str, Any], str]:
    db = get_db()
    bot = db.bots.find_one({"id": bot_id}, {"_id": 0})
    if not bot:
        raise HTTPException(status_code=404, detail="Бот не найден")

    language = str(bot.get("language", "")).lower()
    filename = str(bot.get("file_name", "")).lower()
    if language not in {"python", "py"} and not filename.endswith(".py"):
        raise HTTPException(
            status_code=400,
            detail="Sandbox-прототип запускает только Python-ботов, загруженных как .py",
        )

    version = db.bot_versions.find_one({"id": bot.get("active_version_id")}, {"_id": 0})
    if not version:
        raise HTTPException(status_code=404, detail="Активная версия бота не найдена")

    return bot, _decode_source_blob(version.get("source_blob"))


def run_uploaded_bot(
    bot_id: str,
    state: dict[str, Any] | None = None,
    timeout_ms: int = 3000,
    memory_limit_mb: int = 128,
) -> dict[str, Any]:
    bot, code = get_active_bot_code(bot_id)
    payload = {
        "code": code,
        "state": state or DEFAULT_STATE,
        "timeout_ms": timeout_ms,
        "memory_limit_mb": memory_limit_mb,
    }

    request = urllib.request.Request(
        f"{settings.BOT_RUNNER_URL.rstrip('/')}/run",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=(timeout_ms / 1000) + 2) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise HTTPException(status_code=502, detail=f"Runner вернул ошибку: {detail}") from exc
    except urllib.error.URLError as exc:
        raise HTTPException(status_code=502, detail=f"Runner недоступен: {exc}") from exc
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail="Runner не ответил за отведённое время") from exc

    result = json.loads(body)
    result["botId"] = bot.get("id")
    result["botName"] = bot.get("name")
    return result


def get_runner_health() -> dict[str, Any]:
    request = urllib.request.Request(f"{settings.BOT_RUNNER_URL.rstrip('/')}/health", method="GET")
    try:
        with urllib.request.urlopen(request, timeout=2) as response:
            return {
                "runnerUrl": settings.BOT_RUNNER_URL,
                "statusCode": response.status,
                "body": json.loads(response.read().decode("utf-8")),
            }
    except Exception as exc:
        return {
            "runnerUrl": settings.BOT_RUNNER_URL,
            "statusCode": None,
            "body": None,
            "error": str(exc),
        }
