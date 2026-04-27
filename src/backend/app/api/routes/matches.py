from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import current_user
from app.core.utils import contains
from app.db.connection import get_db
from app.services.matches import match_to_api

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("")
def matches(
    id: str | None = None,
    bot: str | None = None,
    status: str | None = None,
    result: str | None = None,
    rules: str | None = None,
    _: dict[str, Any] = Depends(current_user),
) -> list[dict[str, Any]]:
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

    return data


@router.get("/{match_id}")
def match_detail(match_id: str, _: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    db = get_db()
    match = db.matches.find_one({"id": match_id}, {"_id": 0})

    if not match:
        raise HTTPException(status_code=404, detail="Матч не найден")

    return match_to_api(match, with_events=True)
