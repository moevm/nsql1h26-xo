from __future__ import annotations

from fastapi import APIRouter

from app.api.routes import analytics, auth, bots, import_export, logs, matches, overview, reports, sandbox, search, settings, statistics, users

api_router = APIRouter(prefix="/api")

api_router.include_router(auth.router)
api_router.include_router(overview.router)
api_router.include_router(bots.router)
api_router.include_router(matches.router)
api_router.include_router(logs.router)
api_router.include_router(statistics.router)
api_router.include_router(reports.router)
api_router.include_router(sandbox.router)
api_router.include_router(import_export.router)
api_router.include_router(settings.router)
api_router.include_router(users.router)
api_router.include_router(search.router)
api_router.include_router(analytics.router)


@api_router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
