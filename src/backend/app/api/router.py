from __future__ import annotations

from fastapi import APIRouter

from app.api.routes import auth, bots, logs, matches, overview

api_router = APIRouter(prefix="/api")

api_router.include_router(auth.router)
api_router.include_router(overview.router)
api_router.include_router(bots.router)
api_router.include_router(matches.router)
api_router.include_router(logs.router)


@api_router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
