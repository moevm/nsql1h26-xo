from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.dependencies import require_moderator_or_admin
from app.db.connection import get_db

router = APIRouter(prefix="/analytics", tags=["analytics"])


class ClusteringPayload(BaseModel):
    featureSet: str = "moves"
    algorithm: str = "kmeans"
    parameters: dict[str, str] = {}


def _bot_winrate(stats: dict[str, Any]) -> float:
    total = int(stats.get("total_matches") or 0)
    wins = int(stats.get("wins") or 0)
    return round(wins / total * 100, 1) if total else 0.0


def _count_error_logs(bot_id: str) -> int:
    db = get_db()
    return db.match_events.count_documents({
        "bot_id": bot_id,
        "kind": "log",
        "payload.level": "ERROR",
    })


@router.post("/cluster")
def cluster(payload: ClusteringPayload, _: dict[str, Any] = Depends(require_moderator_or_admin)) -> dict[str, Any]:
    db = get_db()
    bots = list(db.bots.find({}, {"_id": 0}))
    stats_by_bot = {row.get("bot_id"): row for row in db.bot_stats.find({}, {"_id": 0})}

    k_raw = payload.parameters.get("Количество кластеров (k)") or payload.parameters.get("Количество кластеров") or "3"
    try:
        cluster_limit = max(2, min(int(k_raw), 6))
    except ValueError:
        cluster_limit = 3

    strong: list[str] = []
    stable: list[str] = []
    risky: list[str] = []
    points: list[dict[str, Any]] = []

    for bot in bots:
        bot_id = bot.get("id")
        row = stats_by_bot.get(bot_id, {})
        elo = int(row.get("elo") or 0)
        wins = int(row.get("wins") or 0)
        losses = int(row.get("losses") or 0)
        winrate = _bot_winrate(row)
        avg_moves = float(row.get("avg_moves") or 0)
        avg_duration = round(float(row.get("avg_duration_ms") or 0) / 1000, 2)
        errors = _count_error_logs(str(bot_id))

        if elo >= 1200 or wins > losses:
            cluster_id = 1
            cluster_name = "Сильные стратегии"
            strong.append(bot.get("name", "-"))
        elif losses > wins or errors > 0:
            cluster_id = 3
            cluster_name = "Рискованные стратегии"
            risky.append(bot.get("name", "-"))
        else:
            cluster_id = 2
            cluster_name = "Стабильные стратегии"
            stable.append(bot.get("name", "-"))

        if payload.featureSet == "logs":
            x_value = errors
            y_value = losses
            x_label = "Ошибки в логах"
            y_label = "Поражения"
        elif payload.featureSet == "combined":
            x_value = elo
            y_value = winrate
            x_label = "ELO"
            y_label = "Винрейт, %"
        else:
            x_value = avg_moves
            y_value = avg_duration
            x_label = "Среднее ходов"
            y_label = "Средняя длительность, сек"

        points.append({
            "id": bot_id,
            "name": bot.get("name", "-"),
            "x": x_value,
            "y": y_value,
            "elo": elo,
            "winrate": winrate,
            "avgMoves": avg_moves,
            "avgDurationSeconds": avg_duration,
            "errors": errors,
            "clusterId": cluster_id,
            "clusterName": cluster_name,
        })

    clusters = [
        {"id": 1, "name": "Сильные стратегии", "size": len(strong), "bots": strong, "description": "Высокий ELO или положительный баланс побед."},
        {"id": 2, "name": "Стабильные стратегии", "size": len(stable), "bots": stable, "description": "Средние показатели без явного перекоса."},
        {"id": 3, "name": "Рискованные стратегии", "size": len(risky), "bots": risky, "description": "Нуждаются в проверке: больше поражений или ошибок, чем у остальных."},
    ][:cluster_limit]

    allowed_ids = {cluster["id"] for cluster in clusters}
    visible_points = [point for point in points if point["clusterId"] in allowed_ids]

    return {
        "algorithm": payload.algorithm,
        "featureSet": payload.featureSet,
        "parameters": payload.parameters,
        "clusters": clusters,
        "visualization": {
            "xLabel": x_label,
            "yLabel": y_label,
            "points": visible_points,
            "clusterSizes": [{"name": cluster["name"], "size": cluster["size"]} for cluster in clusters],
        },
    }
