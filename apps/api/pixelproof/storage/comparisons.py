"""Filesystem storage: one folder per comparison under the data directory.

Layout:  <data_dir>/comparisons/<id>/{result.json, source-*.png, before.png, after.png, diff-mask.png, heatmap.png}
IDs are 32 hex chars generated here and re-validated on every access, so a request can
never address a path outside the store. Client file names are never used as paths.
"""

from __future__ import annotations

import json
import re
import shutil
import uuid
from pathlib import Path

ID_RE = re.compile(r"^[0-9a-f]{32}$")
#: Artifacts that may be served over HTTP.
PUBLIC_ARTIFACTS = ("before.png", "after.png", "diff-mask.png", "heatmap.png")
SOURCES = {"before": "source-before.png", "after": "source-after.png"}


class StoreError(RuntimeError):
    pass


class ComparisonStore:
    def __init__(self, root: Path, keep: int) -> None:
        self.root = Path(root) / "comparisons"
        self.keep = keep
        self.root.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def new_id() -> str:
        return uuid.uuid4().hex

    def _dir(self, comparison_id: str) -> Path | None:
        if not ID_RE.fullmatch(comparison_id):
            return None
        d = (self.root / comparison_id).resolve()
        if d.parent != self.root.resolve():
            return None
        return d

    def write(self, comparison_id: str, files: dict[str, bytes], result: dict) -> None:
        """Write atomically: build in a temp folder, then rename into place."""
        final = self._dir(comparison_id)
        if final is None:
            raise StoreError("invalid comparison id")
        tmp = self.root / f".tmp-{comparison_id}"
        if tmp.exists():
            shutil.rmtree(tmp)
        tmp.mkdir()
        try:
            for name, blob in files.items():
                (tmp / name).write_bytes(blob)
            (tmp / "result.json").write_text(json.dumps(result), encoding="utf-8")
            tmp.rename(final)
        except Exception:
            shutil.rmtree(tmp, ignore_errors=True)
            raise
        self.prune()

    def write_result_only(self, comparison_id: str, result: dict) -> None:
        """Replace result.json of an existing comparison (used to carry over upload facts)."""
        d = self._dir(comparison_id)
        if d is None or not d.is_dir():
            raise StoreError("unknown comparison")
        tmp = d / "result.json.tmp"
        tmp.write_text(json.dumps(result), encoding="utf-8")
        tmp.replace(d / "result.json")

    def read_result(self, comparison_id: str) -> dict | None:
        d = self._dir(comparison_id)
        if d is None or not (d / "result.json").is_file():
            return None
        try:
            return json.loads((d / "result.json").read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return None

    def artifact_path(self, comparison_id: str, name: str) -> Path | None:
        if name not in PUBLIC_ARTIFACTS:
            return None
        d = self._dir(comparison_id)
        p = None if d is None else d / name
        return p if p is not None and p.is_file() else None

    def read_source(self, comparison_id: str, side: str) -> bytes | None:
        d = self._dir(comparison_id)
        name = SOURCES.get(side)
        if d is None or name is None or not (d / name).is_file():
            return None
        return (d / name).read_bytes()

    def list_recent(self, limit: int = 25) -> list[dict]:
        dirs = [d for d in self.root.iterdir() if d.is_dir() and ID_RE.fullmatch(d.name) and (d / "result.json").is_file()]
        dirs.sort(key=lambda d: (d / "result.json").stat().st_mtime, reverse=True)
        out = []
        for d in dirs[:limit]:
            r = self.read_result(d.name)
            if r is not None:
                out.append(r)
        return out

    def prune(self) -> None:
        dirs = [d for d in self.root.iterdir() if d.is_dir() and ID_RE.fullmatch(d.name)]
        dirs.sort(key=lambda d: d.stat().st_mtime, reverse=True)
        for old in dirs[self.keep :]:
            shutil.rmtree(old, ignore_errors=True)
