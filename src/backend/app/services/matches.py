from __future__ import annotations

from typing import Any

from app.core.utils import fmt
from app.db.connection import get_db


def match_to_api(match: dict[str, Any], with_events: bool = False) -> dict[str, Any]:
    db = get_db()

    bot_a = db.bots.find_one({"id": match.get("bot_a_id")}) or {}
    bot_b = db.bots.find_one({"id": match.get("bot_b_id")}) or {}
    winner = db.bots.find_one({"id": match.get("winner_bot_id")}) or {}

    data = {
        "id": match["id"],
        "botAId": match.get("bot_a_id", ""),
        "botAName": bot_a.get("name", match.get("bot_a_id", "")),
        "botBId": match.get("bot_b_id", ""),
        "botBName": bot_b.get("name", match.get("bot_b_id", "")),
        "rules": match.get("rules", "infinite-ttt"),
        "status": match.get("status", "Queued"),
        "result": match.get("result", "-"),
        "winnerBotId": match.get("winner_bot_id"),
        "winnerBotName": winner.get("name"),
        "started": fmt(match.get("started_at")),
        "finished": fmt(match.get("finished_at")),
        "durationMs": match.get("duration_ms"),
        "movesCount": match.get("moves_count", 0),
        "logCount": match.get("log_count", 0),
        "statusHistory": match.get("status_history", []),
        "board": match.get("board", {}),
    }

    if with_events:
        events = list(db.match_events.find({"match_id": match["id"]}, {"_id": 0}).sort("seq", 1))

        for event in events:
            bot = db.bots.find_one({"id": event.get("bot_id")}) or {}
            event["botName"] = bot.get("name", event.get("bot_id", ""))
            event["ts"] = fmt(event.get("ts"))

        data["events"] = events

    return data
