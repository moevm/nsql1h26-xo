from __future__ import annotations

from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import settings
from app.core.cors import setup_cors
from app.db.seed import seed_database


def create_app() -> FastAPI:
    app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION)

    setup_cors(app)
    app.include_router(api_router)

    @app.on_event("startup")
    def on_startup() -> None:
        seed_database()

    return app


app = create_app()
