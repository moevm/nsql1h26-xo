from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def fmt(value: str | None) -> str:
    if not value:
        return "-"

    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt.strftime("%d.%m.%Y %H:%M")
    except Exception:
        return value


def contains(value: Any, needle: str | None) -> bool:
    if not needle:
        return True

    if isinstance(value, list):
        return any(contains(item, needle) for item in value)

    return needle.lower() in str(value or "").lower()


def severity(events: list[dict[str, Any]]) -> str:
    order = {"DEBUG": 0, "INFO": 1, "WARN": 2, "ERROR": 3}
    result = "INFO"

    for event in events:
        level = str(event.get("payload", {}).get("level", "INFO"))
        if order.get(level, 1) > order.get(result, 1):
            result = level

    return result
