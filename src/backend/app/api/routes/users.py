from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.dependencies import ROLES, require_admin
from app.api.pagination import paginate_list
from app.core.utils import now_iso
from app.db.connection import get_db

router = APIRouter(prefix="/users", tags=["users"])


class UserRoleUpdateRequest(BaseModel):
    role: str = Field(pattern="^(user|moderator|admin)$")


def _user_to_api(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": user.get("id"),
        "name": user.get("name"),
        "email": user.get("email"),
        "role": user.get("role", "user"),
        "createdAt": user.get("created_at") or user.get("createdAt"),
        "updatedAt": user.get("updated_at") or user.get("updatedAt"),
    }


def _ensure_not_last_admin(user_id: str, next_role: str) -> None:
    if next_role == "admin":
        return
    db = get_db()
    current = db.users.find_one({"id": user_id}, {"_id": 0})
    if not current or current.get("role") != "admin":
        return
    admins_count = db.users.count_documents({"role": "admin"})
    if admins_count <= 1:
        raise HTTPException(status_code=400, detail="Нельзя снять роль с последнего администратора")


@router.get("")
def list_users(
    q: str | None = None,
    role: str | None = None,
    page: int = 1,
    page_size: int = 10,
    _: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    db = get_db()
    users: list[dict[str, Any]] = []

    normalized_query = (q or "").strip().lower()
    normalized_role = (role or "").strip().lower()

    for user in db.users.find({}, {"_id": 0, "password": 0}).sort("created_at", -1):
        if normalized_role and user.get("role") != normalized_role:
            continue
        if normalized_query:
            searchable = " ".join(str(user.get(key, "")) for key in ["id", "name", "email", "role"]).lower()
            if normalized_query not in searchable:
                continue
        users.append(_user_to_api(user))

    role_counts = {item: db.users.count_documents({"role": item}) for item in ROLES}
    page_payload = paginate_list(users, page=page, page_size=page_size)
    return {"users": page_payload["items"], "roleCounts": role_counts, "roles": list(ROLES), "total": page_payload["total"], "page": page_payload["page"], "pageSize": page_payload["pageSize"], "totalPages": page_payload["totalPages"]}


@router.patch("/{user_id}/role")
def update_user_role(
    user_id: str,
    payload: UserRoleUpdateRequest,
    admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    db = get_db()
    user = db.users.find_one({"id": user_id}, {"_id": 0})

    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    _ensure_not_last_admin(user_id, payload.role)

    updated_at = now_iso()
    db.users.update_one(
        {"id": user_id},
        {"$set": {"role": payload.role, "updated_at": updated_at, "updated_by": admin.get("email")}},
    )

    updated = db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if updated is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return _user_to_api(updated)
