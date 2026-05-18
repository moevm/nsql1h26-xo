from __future__ import annotations

from collections import defaultdict
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.dependencies import require_moderator_or_admin
from app.core.utils import contains, now_iso
from app.db.connection import get_db
from app.api.routes.statistics import statistics as build_statistics

router = APIRouter(prefix="/reports", tags=["reports"])


class ReportConfig(BaseModel):
    name: str = Field(default="Кастомный отчёт", max_length=120)
    dataset: str = "Матчи"
    metrics: list[str] = Field(default_factory=list)
    groupBy: str = "Нет группировки"
    chartType: str = "bar"
    filters: list[dict[str, str]] = Field(default_factory=list)


METRIC_MAP = {
    "Винрейт": "winrate",
    "Среднее ходов": "averageMoves",
    "Длительность": "durationSeconds",
    "Количество ошибок": "errorCount",
}

METRIC_LABELS = {
    "winrate": "Винрейт, %",
    "averageMoves": "Среднее ходов",
    "durationSeconds": "Длительность, сек",
    "errorCount": "Количество ошибок",
}


def _as_metric_key(metric: str) -> str:
    return METRIC_MAP.get(metric, metric)


def _matches_filter(match: dict[str, Any], filters: list[dict[str, str]], bot_names: dict[str, str]) -> bool:
    for raw in filters:
        value = str(raw.get("value") or "").strip()
        if not value:
            continue

        field = raw.get("field", "")
        operator = raw.get("operator", "=")

        if field == "Статус":
            actual = str(match.get("status") or "")
        elif field == "Бот":
            actual = " ".join([
                str(match.get("bot_a_id") or ""),
                str(match.get("bot_b_id") or ""),
                bot_names.get(str(match.get("bot_a_id")), ""),
                bot_names.get(str(match.get("bot_b_id")), ""),
            ])
        elif field == "Правила":
            actual = str(match.get("rules") or "")
        elif field == "Дата":
            actual = str(match.get("started_at") or "")[:10]
        else:
            actual = ""

        if operator == "=" and actual.lower() != value.lower():
            return False
        if operator == "!=" and actual.lower() == value.lower():
            return False
        if operator == "contains" and not contains(actual, value):
            return False
        if operator in {">", "<"}:
            try:
                left = float(actual)
                right = float(value)
            except ValueError:
                continue
            if operator == ">" and not left > right:
                return False
            if operator == "<" and not left < right:
                return False
    return True


def _group_key(match: dict[str, Any], group_by: str, bot_names: dict[str, str]) -> str:
    if group_by == "Дата":
        return str(match.get("started_at") or "")[:10] or "Без даты"
    if group_by == "Правила":
        return str(match.get("rules") or "Без правил")
    if group_by == "Бот":
        return bot_names.get(str(match.get("bot_a_id")), str(match.get("bot_a_id") or "Бот"))
    return "Все данные"


def _build_rows(config: ReportConfig) -> list[dict[str, Any]]:
    db = get_db()
    bots = list(db.bots.find({}, {"_id": 0}))
    bot_names = {str(bot.get("id")): str(bot.get("name")) for bot in bots}
    matches = [
        match
        for match in db.matches.find({}, {"_id": 0}).sort("started_at", 1)
        if _matches_filter(match, config.filters, bot_names)
    ]

    error_events = list(db.match_events.find({"kind": "log", "payload.level": "ERROR"}, {"_id": 0}))
    errors_by_match: dict[str, int] = defaultdict(int)
    errors_by_bot: dict[str, int] = defaultdict(int)
    for event in error_events:
        errors_by_match[str(event.get("match_id"))] += 1
        errors_by_bot[str(event.get("bot_id"))] += 1

    groups: dict[str, dict[str, Any]] = defaultdict(lambda: {
        "matches": 0,
        "wins": 0,
        "moves": 0,
        "duration": 0,
        "errors": 0,
    })

    if config.groupBy == "Бот":
        for bot in bots:
            bot_id = str(bot.get("id"))
            group = bot_names.get(bot_id, bot_id)
            related = [m for m in matches if m.get("bot_a_id") == bot_id or m.get("bot_b_id") == bot_id]
            for match in related:
                groups[group]["matches"] += 1
                groups[group]["moves"] += int(match.get("moves_count") or 0)
                groups[group]["duration"] += int(match.get("duration_ms") or 0)
                groups[group]["errors"] += errors_by_match.get(str(match.get("id")), 0)
                if match.get("winner_bot_id") == bot_id:
                    groups[group]["wins"] += 1
            groups[group]["errors"] += errors_by_bot.get(bot_id, 0)
    else:
        for match in matches:
            group = _group_key(match, config.groupBy, bot_names)
            groups[group]["matches"] += 1
            groups[group]["moves"] += int(match.get("moves_count") or 0)
            groups[group]["duration"] += int(match.get("duration_ms") or 0)
            groups[group]["errors"] += errors_by_match.get(str(match.get("id")), 0)
            if match.get("winner_bot_id"):
                groups[group]["wins"] += 1

    rows: list[dict[str, Any]] = []
    for name, data in groups.items():
        total = max(int(data["matches"]), 1)
        rows.append({
            "name": name,
            "matches": int(data["matches"]),
            "winrate": round(int(data["wins"]) / total * 100, 1),
            "averageMoves": round(int(data["moves"]) / total, 1),
            "durationSeconds": round(int(data["duration"]) / total / 1000, 1),
            "errorCount": int(data["errors"]),
        })

    if not rows:
        return []

    metric_keys = [_as_metric_key(metric) for metric in config.metrics]
    sort_key = metric_keys[0] if metric_keys else "matches"
    rows.sort(key=lambda row: float(row.get(sort_key) or 0), reverse=True)
    return rows[:20]


def _build_preview(config: ReportConfig) -> dict[str, Any]:
    rows = _build_rows(config)
    metric_keys = [_as_metric_key(metric) for metric in config.metrics]

    return {
        "config": config.model_dump(),
        "chartType": config.chartType,
        "groupBy": config.groupBy,
        "metrics": [{"key": key, "label": METRIC_LABELS.get(key, key)} for key in metric_keys],
        "rows": rows,
        "columns": ["name", "matches", *metric_keys],
        "generatedAt": now_iso(),
    }


@router.post("/preview")
def preview_report(config: ReportConfig, user: dict[str, Any] = Depends(require_moderator_or_admin)) -> dict[str, Any]:
    if not config.metrics:
        raise HTTPException(status_code=400, detail="Выберите хотя бы одну метрику")

    base = build_statistics(_=user)
    preview = _build_preview(config)
    preview["summary"] = base["summary"]
    return preview


@router.post("")
def save_report(config: ReportConfig, user: dict[str, Any] = Depends(require_moderator_or_admin)) -> dict[str, Any]:
    if not config.metrics:
        raise HTTPException(status_code=400, detail="Выберите хотя бы одну метрику")

    db = get_db()
    number = db.reports.count_documents({}) + 1
    preview = _build_preview(config)
    doc = {
        "id": f"R-{number:03d}",
        "name": config.name or f"Отчёт {number}",
        "config": config.model_dump(),
        "preview": preview,
        "created_by": user.get("email"),
        "created_at": now_iso(),
    }
    db.reports.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("")
def list_reports(_: dict[str, Any] = Depends(require_moderator_or_admin)) -> list[dict[str, Any]]:
    db = get_db()
    return list(db.reports.find({}, {"_id": 0}).sort("created_at", -1))
