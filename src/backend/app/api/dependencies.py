from __future__ import annotations

from typing import Any, Callable

import secrets
from fastapi import Depends, Header, HTTPException

TOKENS: dict[str, dict[str, Any]] = {}
ROLES = ("user", "moderator", "admin")
ROLE_LABELS = {
    "user": "Пользователь",
    "moderator": "Модератор",
    "admin": "Администратор",
}


def create_token(user: dict[str, Any]) -> str:
    token = secrets.token_hex(24)
    TOKENS[token] = user
    return token


def _user_to_api(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": user.get("id"),
        "name": user.get("name"),
        "email": user.get("email"),
        "role": user.get("role", "user"),
        "created_at": user.get("created_at"),
    }


def current_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Требуется вход в систему")

    token = authorization.removeprefix("Bearer ").strip()
    cached_user = TOKENS.get(token)

    if not cached_user:
        raise HTTPException(status_code=401, detail="Сессия не найдена или истекла")

    try:
        from app.db.connection import get_db

        db = get_db()
        user = db.users.find_one(
            {"$or": [{"id": cached_user.get("id")}, {"email": cached_user.get("email")}]},
            {"_id": 0, "password": 0},
        )
        if user:
            api_user = _user_to_api(user)
            TOKENS[token] = api_user
            return api_user
    except Exception:
        pass

    return cached_user


def require_roles(*allowed_roles: str) -> Callable[[dict[str, Any]], dict[str, Any]]:
    allowed = set(allowed_roles)

    def dependency(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
        role = user.get("role", "user")
        if role not in allowed:
            labels = ", ".join(ROLE_LABELS.get(item, item) for item in allowed_roles)
            raise HTTPException(status_code=403, detail=f"Недостаточно прав. Требуемые роли: {labels}")
        return user

    return dependency


def require_admin(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Доступно только администратору")
    return user


def require_moderator_or_admin(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    if user.get("role") not in {"moderator", "admin"}:
        raise HTTPException(status_code=403, detail="Доступно только модератору или администратору")
    return user
