from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from app.api.dependencies import current_user
from app.db.connection import get_db
from app.services.logs import grouped_logs
from app.services.matches import match_to_api

router = APIRouter(prefix="/overview", tags=["overview"])


@router.get("")
def overview(_: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    db = get_db()
    all_matches = [
        match_to_api(match)
        for match in db.matches.find({}, {"_id": 0}).sort("started_at", -1)
    ]

    return {
        "bots": db.bots.count_documents({}),
        "matches": db.matches.count_documents({}),
        "logs": len(grouped_logs()),
        "activeBots": db.bots.count_documents({"status": "active"}),
        "failedMatches": db.matches.count_documents({"status": "Failed"}),
        "recentMatches": all_matches[:5],
    }
