"""Runtime configuration.

Plain dataclass + environment variables on purpose: no settings library is needed
at this stage. Secrets (future AI keys) are read here, on the backend only.
"""

from __future__ import annotations

import os
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path

CORS_ENV_VAR = "PIXELPROOF_CORS_ORIGINS"
DEFAULT_CORS_ORIGINS: tuple[str, ...] = (
    "http://localhost:3000",
    "http://127.0.0.1:3000",
)


# Runtime data (uploads, analysis artifacts). Git-ignored via the `.pixelproof/` rule.
DEFAULT_DATA_DIR = Path(__file__).resolve().parent.parent / ".pixelproof"
DATA_DIR_ENV_VAR = "PIXELPROOF_DATA_DIR"
MAX_UPLOAD_MB_ENV_VAR = "PIXELPROOF_MAX_UPLOAD_MB"
MAX_PIXELS_ENV_VAR = "PIXELPROOF_MAX_PIXELS"
KEEP_COMPARISONS_ENV_VAR = "PIXELPROOF_KEEP_COMPARISONS"


class ConfigError(ValueError):
    """Raised when configuration is invalid."""


@dataclass(frozen=True)
class Settings:
    cors_origins: tuple[str, ...] = DEFAULT_CORS_ORIGINS
    data_dir: Path = DEFAULT_DATA_DIR
    #: Per-image upload cap. Enforced while streaming, not from Content-Length.
    max_upload_bytes: int = 15 * 1024 * 1024
    #: Decompression-bomb guard. Working arrays are several bytes per pixel,
    #: so 16 MP keeps peak memory reasonable on an 8 GB machine.
    max_pixels: int = 16_000_000
    #: Number of newest comparisons kept on disk; older ones are pruned.
    keep_comparisons: int = 25


def parse_origins(raw: str) -> tuple[str, ...]:
    origins = tuple(o.strip().rstrip("/") for o in raw.split(",") if o.strip())
    if not origins:
        raise ConfigError(f"{CORS_ENV_VAR} is set but contains no origins")
    if "*" in origins:
        raise ConfigError(f"{CORS_ENV_VAR} must list explicit origins; '*' is not allowed")
    return origins


def _positive_int(source: Mapping[str, str], name: str, default: int) -> int:
    raw = source.get(name)
    if raw is None or not raw.strip():
        return default
    try:
        value = int(raw.strip())
    except ValueError as exc:
        raise ConfigError(f"{name} must be a whole number, got {raw!r}") from exc
    if value < 1:
        raise ConfigError(f"{name} must be at least 1, got {value}")
    return value


def load_settings(env: Mapping[str, str] | None = None) -> Settings:
    source = os.environ if env is None else env
    defaults = Settings()
    raw = source.get(CORS_ENV_VAR)
    origins = defaults.cors_origins if raw is None else parse_origins(raw)
    data_dir_raw = source.get(DATA_DIR_ENV_VAR)
    return Settings(
        cors_origins=origins,
        data_dir=Path(data_dir_raw.strip()) if data_dir_raw and data_dir_raw.strip() else defaults.data_dir,
        max_upload_bytes=_positive_int(source, MAX_UPLOAD_MB_ENV_VAR, defaults.max_upload_bytes // (1024 * 1024))
        * 1024
        * 1024,
        max_pixels=_positive_int(source, MAX_PIXELS_ENV_VAR, defaults.max_pixels),
        keep_comparisons=_positive_int(source, KEEP_COMPARISONS_ENV_VAR, defaults.keep_comparisons),
    )
