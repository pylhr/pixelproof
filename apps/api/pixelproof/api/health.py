from __future__ import annotations

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from pixelproof import __version__

router = APIRouter(tags=["system"])


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: Literal["pixelproof-api"]
    version: str


@router.get("/health", response_model=HealthResponse, summary="Liveness check")
def get_health() -> HealthResponse:
    """Reports that the API process is up. It does not check any analysis module,
    because none exist yet."""
    return HealthResponse(status="ok", service="pixelproof-api", version=__version__)
