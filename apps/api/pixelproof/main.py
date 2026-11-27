from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from pixelproof import __version__
from pixelproof.api import comparisons, health
from pixelproof.config import Settings, load_settings
from pixelproof.storage.comparisons import ComparisonStore

# Multipart overhead allowance on top of the two image caps.
_BODY_SLACK = 1024 * 1024


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()
    app = FastAPI(title="PixelProof API", version=__version__)
    app.state.settings = settings
    app.state.store = ComparisonStore(settings.data_dir, settings.keep_comparisons)

    @app.middleware("http")
    async def reject_oversized_bodies(request: Request, call_next):
        """Refuse obviously oversized uploads before the body is read.
        Only works when the client sends Content-Length; the per-file cap in the route
        still applies to everything else."""
        if request.method == "POST":
            declared = request.headers.get("content-length")
            if declared and declared.isdigit() and int(declared) > 2 * settings.max_upload_bytes + _BODY_SLACK:
                return JSONResponse(
                    status_code=413,
                    content={"detail": {"code": "file_too_large", "message": "The upload is too large."}},
                )
        return await call_next(request)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=False,
        allow_methods=["GET", "POST"],  # widened per endpoint as real routes arrive
        allow_headers=["Content-Type"],
    )

    app.include_router(health.router)
    app.include_router(comparisons.router)
    return app


app = create_app()
