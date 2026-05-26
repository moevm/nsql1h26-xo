from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from fastapi.responses import PlainTextResponse

from app.api.dependencies import current_user, require_moderator_or_admin
from app.api.pagination import paginate_list
from app.core.utils import contains
from app.db.connection import get_db
from app.services.logs import get_log_by_id, grouped_logs

router = APIRouter(prefix="/logs", tags=["logs"])


class LogUpdateRequest(BaseModel):
    content: str | None = None
    note: str | None = None



@router.get("")
def logs(
    id: str | None = None,
    type: str | None = None,
    level: str | None = None,
    match_id: str | None = None,
    query: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    page: int = 1,
    page_size: int = 10,
    _: dict[str, Any] = Depends(require_moderator_or_admin),
) -> dict[str, Any]:
    result = []

    for log in grouped_logs():
        if not contains(log["id"], id):
            continue
        if not contains(log["type"], type):
            continue
        if not contains(log["level"], level):
            continue
        if not contains(log["relatedMatch"], match_id):
            continue
        if not contains(log.get("content"), query):
            continue
        if date_from and str(log.get("rawStart", ""))[:10] < date_from:
            continue
        if date_to and str(log.get("rawEnd", ""))[:10] > date_to:
            continue

        short = {
            key: value
            for key, value in log.items()
            if key not in {"content", "rawStart", "rawEnd"}
        }
        result.append(short)

    return paginate_list(result, page=page, page_size=page_size)


@router.get("/{log_id}")
def log_detail(log_id: str, _: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return get_log_by_id(log_id)


@router.put("/{log_id}")
def update_log(log_id: str, payload: LogUpdateRequest, _: dict[str, Any] = Depends(require_moderator_or_admin)) -> dict[str, Any]:
    db = get_db()
    current = get_log_by_id(log_id)
    update = {key: value for key, value in payload.model_dump().items() if value is not None}
    if not update:
        return current
    update["id"] = log_id
    db.log_notes.update_one({"id": log_id}, {"$set": update}, upsert=True)
    return get_log_by_id(log_id)


@router.get("/{log_id}/download", response_class=PlainTextResponse)
def log_download(log_id: str, _: dict[str, Any] = Depends(current_user)) -> str:
    log = get_log_by_id(log_id)
    return log.get("content", "")
