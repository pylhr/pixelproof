from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from pixelproof import __version__
from pixelproof.api import health
from pixelproof.config import Settings, load_settings


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()
    app = FastAPI(title="PixelProof API", version=__version__)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=False,
        allow_methods=["GET"],  # widened per endpoint as real routes arrive
        allow_headers=["Content-Type"],
    )

    app.include_router(health.router)
    return app


app = create_app()
