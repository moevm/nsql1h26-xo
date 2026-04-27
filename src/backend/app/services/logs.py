from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from app.core.utils import fmt, severity
from app.db.connection import get_db


def make_log_record(match_id: str, events: list[dict[str, Any]]) -> dict[str, Any]:
    first = events[0]
    last = events[-1]

    content = "\n".join(
        f"[{fmt(e.get('ts'))}] [{e.get('payload', {}).get('level', 'INFO')}] "
        f"{e.get('bot_id', 'system')}: {e.get('payload', {}).get('message', '')}"
        for e in events
    )

    return {
        "id": f"LOG-{match_id}",
        "type": "match" if match_id != "system" else "system",
        "relatedMatch": match_id if match_id != "system" else "-",
        "level": severity(events),
        "startTime": fmt(first.get("ts")),
        "endTime": fmt(last.get("ts")),
        "rawStart": first.get("ts"),
        "rawEnd": last.get("ts"),
        "size": f"{max(1, len(content.encode('utf-8')) // 1024)} KB",
        "content": content,
    }


def grouped_logs() -> list[dict[str, Any]]:
    db = get_db()

    events = list(db.match_events.find({"kind": "log"}, {"_id": 0}).sort("seq", 1))
    by_match: dict[str, list[dict[str, Any]]] = {}

    for event in events:
        match_id = event.get("match_id") or "system"
        by_match.setdefault(match_id, []).append(event)

    return [make_log_record(match_id, items) for match_id, items in by_match.items()]


def get_log_by_id(log_id: str) -> dict[str, Any]:
    for log in grouped_logs():
        if log["id"] == log_id:
            return log

    raise HTTPException(status_code=404, detail="Лог не найден")
