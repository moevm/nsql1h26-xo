from __future__ import annotations

from collections import defaultdict
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.dependencies import current_user
from app.api.routes.statistics import statistics as build_statistics
from app.core.utils import contains, fmt, now_iso
from app.db.connection import get_db
from app.services.logs import grouped_logs
from app.services.matches import describe_rules

router = APIRouter(prefix="/reports", tags=["reports"])


class ReportFilter(BaseModel):
    id: str
    field: str
    operator: str = "contains"
    value: str = ""


class ReportConfig(BaseModel):
    name: str = Field(default="Кастомный отчёт", max_length=120)
    dataset: str = "Матчи"
    axisX: str = "Правила"
    axisY: str = "Статус"
    chartType: str = "bar"
    filters: list[ReportFilter] = Field(default_factory=list)


DATASET_FIELDS: dict[str, list[str]] = {
    "Матчи": ["Дата", "Статус", "Результат", "Правила", "Бот A", "Бот B", "Победитель", "Ходы", "Длительность, сек"],
    "Боты": ["Название", "Язык", "Версия", "Статус", "Видимость", "Владелец", "ELO", "Матчи", "Победы", "Поражения"],
    "Логи": ["Дата", "Тип", "Уровень", "Матч", "Размер"],
}


def _ensure_dataset_access(dataset: str, user: dict[str, Any]) -> None:
    if dataset == "Логи" and user.get("role") not in {"moderator", "admin"}:
        raise HTTPException(status_code=403, detail="Статистика по логам доступна только модератору или администратору")


def _bucket_number(value: Any, step: int = 10) -> str:
    try:
        number = float(value or 0)
    except (TypeError, ValueError):
        return "Без значения"
    if number <= 0:
        return "0"
    left = int(number // step * step)
    right = left + step - 1
    return f"{left}-{right}"


def _bot_names() -> dict[str, str]:
    db = get_db()
    return {str(bot.get("id")): str(bot.get("name") or bot.get("id")) for bot in db.bots.find({}, {"_id": 0})}


def _match_rows() -> list[dict[str, Any]]:
    db = get_db()
    names = _bot_names()
    rows: list[dict[str, Any]] = []

    for match in db.matches.find({}, {"_id": 0}).sort("started_at", 1):
        duration_seconds = round(int(match.get("duration_ms") or 0) / 1000, 1)
        bot_a_id = str(match.get("bot_a_id") or "")
        bot_b_id = str(match.get("bot_b_id") or "")
        winner_id = str(match.get("winner_bot_id") or "")
        rows.append({
            "Дата": str(match.get("started_at") or "")[:10] or "Без даты",
            "Статус": str(match.get("status") or "Без статуса"),
            "Результат": str(match.get("result") or "Без результата"),
            "Правила": describe_rules(match),
            "Бот A": names.get(bot_a_id, bot_a_id or "Без бота"),
            "Бот B": names.get(bot_b_id, bot_b_id or "Без бота"),
            "Победитель": names.get(winner_id, winner_id or "Нет победителя"),
            "Ходы": _bucket_number(match.get("moves_count"), 10),
            "Длительность, сек": _bucket_number(duration_seconds, 5),
            "_search": " ".join([
                str(match.get("id") or ""),
                str(match.get("status") or ""),
                str(match.get("result") or ""),
                describe_rules(match),
                names.get(bot_a_id, bot_a_id),
                names.get(bot_b_id, bot_b_id),
                names.get(winner_id, winner_id),
            ]),
        })
    return rows


def _bot_rows() -> list[dict[str, Any]]:
    db = get_db()
    stats_by_bot = {item.get("bot_id"): item for item in db.bot_stats.find({}, {"_id": 0})}
    rows: list[dict[str, Any]] = []

    for bot in db.bots.find({}, {"_id": 0}).sort("updated_at", -1):
        stats = stats_by_bot.get(bot.get("id"), {})
        rows.append({
            "Название": str(bot.get("name") or bot.get("id")),
            "Язык": str(bot.get("language") or "Python"),
            "Версия": str(bot.get("version") or "Без версии"),
            "Статус": str(bot.get("status") or "Без статуса"),
            "Видимость": str(bot.get("visibility") or "public"),
            "Владелец": str(bot.get("owner_login") or bot.get("uploaded_by") or "Без владельца"),
            "ELO": _bucket_number(stats.get("elo"), 100),
            "Матчи": _bucket_number(stats.get("total_matches"), 5),
            "Победы": _bucket_number(stats.get("wins"), 5),
            "Поражения": _bucket_number(stats.get("losses"), 5),
            "_search": " ".join(str(bot.get(key, "")) for key in ["id", "name", "language", "version", "status", "owner_login"]),
        })
    return rows


def _log_rows() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for log in grouped_logs():
        rows.append({
            "Дата": str(log.get("rawStart") or "")[:10] or str(log.get("startTime") or "Без даты"),
            "Тип": str(log.get("type") or "Без типа"),
            "Уровень": str(log.get("level") or "INFO"),
            "Матч": str(log.get("relatedMatch") or "-"),
            "Размер": str(log.get("size") or "0 KB"),
            "_search": " ".join(str(log.get(key, "")) for key in ["id", "type", "level", "relatedMatch", "content"]),
        })
    return rows


def _rows_for_dataset(dataset: str) -> list[dict[str, Any]]:
    if dataset == "Матчи":
        return _match_rows()
    if dataset == "Боты":
        return _bot_rows()
    if dataset == "Логи":
        return _log_rows()
    raise HTTPException(status_code=400, detail="Неизвестный источник данных")


def _compare(actual: str, operator: str, expected: str) -> bool:
    if operator == "=":
        return actual.lower() == expected.lower()
    if operator == "!=":
        return actual.lower() != expected.lower()
    if operator == "contains":
        return contains(actual, expected)
    if operator in {">", "<", ">=", "<="}:
        try:
            left = float(actual.replace(",", "."))
            right = float(expected.replace(",", "."))
        except ValueError:
            left_text = actual.lower()
            right_text = expected.lower()
            if operator == ">":
                return left_text > right_text
            if operator == "<":
                return left_text < right_text
            if operator == ">=":
                return left_text >= right_text
            return left_text <= right_text
        if operator == ">":
            return left > right
        if operator == "<":
            return left < right
        if operator == ">=":
            return left >= right
        return left <= right
    return contains(actual, expected)


def _apply_filters(rows: list[dict[str, Any]], filters: list[ReportFilter]) -> list[dict[str, Any]]:
    result = rows
    for filter_item in filters:
        expected = filter_item.value.strip()
        if not expected:
            continue
        field = filter_item.field
        operator = filter_item.operator
        result = [
            row
            for row in result
            if _compare(str(row.get(field) if field in row else row.get("_search", "")), operator, expected)
        ]
    return result


def _build_preview(config: ReportConfig) -> dict[str, Any]:
    fields = DATASET_FIELDS.get(config.dataset)
    if fields is None:
        raise HTTPException(status_code=400, detail="Неизвестный источник данных")
    if config.axisX not in fields:
        raise HTTPException(status_code=400, detail="Выберите корректное поле для оси X")
    if config.axisY not in fields:
        raise HTTPException(status_code=400, detail="Выберите корректное поле для оси Y")

    source_rows = _rows_for_dataset(config.dataset)
    filtered_rows = _apply_filters(source_rows, config.filters)

    matrix: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    series_set: set[str] = set()

    for row in filtered_rows:
        x_value = str(row.get(config.axisX) or "Без значения")
        y_value = str(row.get(config.axisY) or "Без значения")
        matrix[x_value][y_value] += 1
        series_set.add(y_value)

    series = sorted(series_set)
    rows = []
    for x_value, values in matrix.items():
        item = {"name": x_value, "total": sum(values.values())}
        for series_name in series:
            item[series_name] = values.get(series_name, 0)
        rows.append(item)

    rows.sort(key=lambda item: int(item.get("total") or 0), reverse=True)

    return {
        "config": config.model_dump(),
        "dataset": config.dataset,
        "axisX": config.axisX,
        "axisY": config.axisY,
        "chartType": config.chartType,
        "fields": DATASET_FIELDS,
        "series": series,
        "rows": rows[:50],
        "totalRecords": len(filtered_rows),
        "generatedAt": now_iso(),
    }


@router.post("/preview")
def preview_report(config: ReportConfig, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    _ensure_dataset_access(config.dataset, user)
    preview = _build_preview(config)
    preview["summary"] = build_statistics(_=user)["summary"]
    return preview


@router.post("")
def save_report(config: ReportConfig, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    _ensure_dataset_access(config.dataset, user)
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
def list_reports(user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    db = get_db()
    reports = []
    query: dict[str, Any] = {}
    if user.get("role") not in {"moderator", "admin"}:
        query = {"created_by": user.get("email")}
    for report in db.reports.find(query, {"_id": 0}).sort("created_at", -1):
        report["createdAtLabel"] = fmt(report.get("created_at"))
        reports.append(report)
    return reports
