from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.dependencies import current_user, require_moderator_or_admin
from app.api.pagination import paginate_list
from app.core.utils import contains, now_iso
from app.db.connection import get_db
from app.services.matches import describe_rules, match_to_api
from app.services.match_execution import execute_match

router = APIRouter(prefix="/matches", tags=["matches"])




class MatchUpdateRequest(BaseModel):
    rules: str | None = None
    status: str | None = None
    result: str | None = None
    winnerBotId: str | None = Field(default=None, alias="winnerBotId")
    comment: str | None = None


class CreateMatchRequest(BaseModel):
    botAId: str = Field(alias="botAId")
    botBId: str = Field(alias="botBId")
    rules: str | None = None
    boardSize: int = 19
    winCondition: int = 5
    timeLimitMs: int = 5000
    memoryLimitMb: int = 512
    maxMoves: int = 225
    logLevel: str = "INFO"


@router.get("")
def matches(
    id: str | None = None,
    bot: str | None = None,
    status: str | None = None,
    result: str | None = None,
    rules: str | None = None,
    page: int = 1,
    page_size: int = 10,
    _: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    db = get_db()
    data = []

    for match in db.matches.find({}, {"_id": 0}).sort("started_at", -1):
        api = match_to_api(match)

        if not contains(api["id"], id):
            continue
        if bot and not (
            contains(api["botAId"], bot)
            or contains(api["botBId"], bot)
            or contains(api["botAName"], bot)
            or contains(api["botBName"], bot)
        ):
            continue
        if not contains(api["status"], status):
            continue
        if not contains(api["result"], result):
            continue
        if not contains(api["rules"], rules):
            continue

        data.append(api)

    return paginate_list(data, page=page, page_size=page_size)


@router.post("")
def create_match(payload: CreateMatchRequest, _: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    db = get_db()

    if payload.botAId == payload.botBId:
        raise HTTPException(status_code=400, detail="Нужно выбрать двух разных ботов")

    bot_a = db.bots.find_one({"id": payload.botAId}, {"_id": 0})
    bot_b = db.bots.find_one({"id": payload.botBId}, {"_id": 0})
    if not bot_a or not bot_b:
        raise HTTPException(status_code=400, detail="Один из выбранных ботов не найден")

    now = now_iso()
    number = db.matches.count_documents({}) + 2848
    match_id = f"M-{number}"
    board_size = max(3, min(25, int(payload.boardSize)))
    win_condition = max(3, min(6, int(payload.winCondition)))
    half = max(1, board_size // 2)

    match = {
        "id": match_id,
        "bot_a_id": payload.botAId,
        "bot_b_id": payload.botBId,
        "rules": payload.rules or f"Поле {board_size}×{board_size}; победа: {win_condition} в ряд",
        "win_condition": win_condition,
        "started_at": now,
        "finished_at": None,
        "status": "Queued",
        "result": "queued",
        "winner_bot_id": None,
        "moves_count": 0,
        "log_count": 1,
        "duration_ms": 0,
        "board": {"width": board_size, "height": board_size, "min_x": -half, "max_x": half, "min_y": -half, "max_y": half, "win_condition": win_condition},
        "run_settings": {
            "time_limit_ms": payload.timeLimitMs,
            "memory_limit_mb": min(payload.memoryLimitMb, 256),
            "max_moves": payload.maxMoves,
            "log_level": payload.logLevel,
            "runner": "bot-runner",
        },
        "status_history": [{"status": "Queued", "time": now}],
    }
    db.matches.insert_one(match)
    db.match_events.insert_one({
        "id": f"E-{match_id}-001",
        "match_id": match_id,
        "seq": 1,
        "kind": "log",
        "ts": now,
        "bot_id": "system",
        "payload": {"level": "INFO", "message": "match created and queued", "source": "api"},
    })

    executed = execute_match(match_id, payload)
    return match_to_api(executed, with_events=True)


@router.put("/{match_id}")
def update_match(match_id: str, payload: MatchUpdateRequest, _: dict[str, Any] = Depends(require_moderator_or_admin)) -> dict[str, Any]:
    db = get_db()
    match = db.matches.find_one({"id": match_id}, {"_id": 0})

    if not match:
        raise HTTPException(status_code=404, detail="Матч не найден")

    raw = payload.model_dump(by_alias=True)
    mapping = {"winnerBotId": "winner_bot_id"}
    update = {}
    for key, value in raw.items():
        if value is not None:
            update[mapping.get(key, key)] = value

    if update:
        if "status" in update:
            update["status_history"] = (match.get("status_history") or []) + [{"status": update["status"], "time": now_iso()}]
        db.matches.update_one({"id": match_id}, {"$set": update})

    updated = db.matches.find_one({"id": match_id}, {"_id": 0})
    return match_to_api(updated, with_events=True)


@router.get("/{match_id}")
def match_detail(match_id: str, _: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    db = get_db()
    match = db.matches.find_one({"id": match_id}, {"_id": 0})

    if not match:
        raise HTTPException(status_code=404, detail="Матч не найден")

    return match_to_api(match, with_events=True)
