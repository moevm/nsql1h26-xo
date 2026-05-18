from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from app.api.dependencies import current_user
from app.core.utils import contains
from app.db.connection import get_db
from app.services.bots import bot_to_api
from app.services.logs import grouped_logs
from app.services.matches import match_to_api

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
def global_search(q: str = "", user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    db = get_db()
    query = q.strip()

    bots = []
    for bot in db.bots.find({}, {"_id": 0}).sort("updated_at", -1):
        if contains(bot.get("id"), query) or contains(bot.get("name"), query) or contains(bot.get("tags", []), query) or contains(bot.get("owner_login"), query):
            bots.append(bot_to_api(bot))

    matches = []
    for match in db.matches.find({}, {"_id": 0}).sort("started_at", -1):
        api = match_to_api(match)
        if contains(api["id"], query) or contains(api["botAName"], query) or contains(api["botBName"], query) or contains(api["result"], query):
            matches.append(api)

    logs = []
    if user.get("role") in {"moderator", "admin"}:
        for log in grouped_logs():
            if contains(log.get("id"), query) or contains(log.get("relatedMatch"), query) or contains(log.get("content"), query) or contains(log.get("level"), query):
                logs.append({key: value for key, value in log.items() if key not in {"content", "rawStart", "rawEnd"}})

    return {"bots": bots[:20], "matches": matches[:20], "logs": logs[:20]}
