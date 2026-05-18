from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from app.api.dependencies import current_user
from app.core.utils import contains
from app.db.connection import get_db
from app.services.logs import grouped_logs

router = APIRouter(prefix="/statistics", tags=["statistics"])


def _duration_label(ms: int | float | None) -> str:
    seconds = int((ms or 0) / 1000)
    minutes, rest = divmod(seconds, 60)
    return f"{minutes}:{rest:02d}"


@router.get("")
def statistics(
    date_from: str | None = None,
    date_to: str | None = None,
    rules: str | None = None,
    bot: str | None = None,
    _: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    db = get_db()

    bots = list(db.bots.find({}, {"_id": 0}))
    stats_by_bot = {item.get("bot_id"): item for item in db.bot_stats.find({}, {"_id": 0})}

    matches = []
    for match in db.matches.find({}, {"_id": 0}).sort("started_at", -1):
        if date_from and str(match.get("started_at", ""))[:10] < date_from:
            continue
        if date_to and str(match.get("started_at", ""))[:10] > date_to:
            continue
        if rules and not contains(match.get("rules"), rules):
            continue
        if bot and not (contains(match.get("bot_a_id"), bot) or contains(match.get("bot_b_id"), bot)):
            continue
        matches.append(match)

    total_matches = len(matches)
    finished = [m for m in matches if str(m.get("status", "")).lower() == "finished"]
    failed = [m for m in matches if str(m.get("status", "")).lower() == "failed"]
    total_moves = sum(int(m.get("moves_count") or 0) for m in matches)
    total_duration = sum(int(m.get("duration_ms") or 0) for m in matches)

    rankings = []
    for index, bot_doc in enumerate(bots, start=1):
        stats = stats_by_bot.get(bot_doc.get("id"), {})
        games = int(stats.get("total_matches") or 0)
        wins = int(stats.get("wins") or 0)
        losses = int(stats.get("losses") or 0)
        winrate = round((wins / games * 100), 1) if games else 0
        trend = "up" if wins >= losses else "down"
        rankings.append({
            "rank": index,
            "id": bot_doc.get("id"),
            "name": bot_doc.get("name", "-"),
            "winrate": winrate,
            "games": games,
            "avgDuration": _duration_label(stats.get("avg_duration_ms")),
            "elo": int(stats.get("elo") or 0),
            "trend": trend,
        })

    rankings.sort(key=lambda item: (item["winrate"], item["elo"]), reverse=True)
    for index, item in enumerate(rankings, start=1):
        item["rank"] = index

    log_rows = grouped_logs()
    error_logs = sum(1 for row in log_rows if row.get("level") == "ERROR")

    by_day: dict[str, int] = {}
    for match in matches:
        day = str(match.get("started_at", ""))[:10] or "unknown"
        by_day[day] = by_day.get(day, 0) + 1

    return {
        "summary": {
            "averageWinrate": round(sum(item["winrate"] for item in rankings) / max(len(rankings), 1), 1),
            "averageMoves": round(total_moves / max(total_matches, 1), 1),
            "averageDuration": _duration_label(total_duration / max(total_matches, 1)),
            "errorRate": round(len(failed) / max(total_matches, 1) * 100, 1),
            "totalMatches": total_matches,
            "finishedMatches": len(finished),
            "failedMatches": len(failed),
            "errorLogs": error_logs,
        },
        "rankings": rankings,
        "charts": {
            "matchesByDay": [{"date": key, "matches": value} for key, value in sorted(by_day.items())],
            "outcomes": [
                {"name": "Finished", "value": len(finished)},
                {"name": "Failed", "value": len(failed)},
                {"name": "Other", "value": max(total_matches - len(finished) - len(failed), 0)},
            ],
        },
    }
