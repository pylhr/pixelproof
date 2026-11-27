"""Runtime configuration.

Plain dataclass + environment variables on purpose: no settings library is needed
at this stage. Secrets (future AI keys) are read here, on the backend only.
"""

from __future__ import annotations

import os
from collections.abc import Mapping
from dataclasses import dataclass

CORS_ENV_VAR = "PIXELPROOF_CORS_ORIGINS"
DEFAULT_CORS_ORIGINS: tuple[str, ...] = (
    "http://localhost:3000",
    "http://127.0.0.1:3000",
)


class ConfigError(ValueError):
    """Raised when configuration is invalid."""


@dataclass(frozen=True)
class Settings:
    cors_origins: tuple[str, ...] = DEFAULT_CORS_ORIGINS


def parse_origins(raw: str) -> tuple[str, ...]:
    origins = tuple(o.strip().rstrip("/") for o in raw.split(",") if o.strip())
    if not origins:
        raise ConfigError(f"{CORS_ENV_VAR} is set but contains no origins")
    if "*" in origins:
        raise ConfigError(f"{CORS_ENV_VAR} must list explicit origins; '*' is not allowed")
    return origins


def load_settings(env: Mapping[str, str] | None = None) -> Settings:
    source = os.environ if env is None else env
    raw = source.get(CORS_ENV_VAR)
    if raw is None:
        return Settings()
    return Settings(cors_origins=parse_origins(raw))
