from __future__ import annotations

import json
from typing import Annotated, Literal

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from pydantic import ValidationError

from pixelproof.analysis import visual as v
from pixelproof.api.schemas import BoxIn, VisualList, VisualParams, VisualResult
from pixelproof.security.images import ImageRejected
from pixelproof.services.visual import rerun_visual_comparison, run_visual_comparison

router = APIRouter(prefix="/api/comparisons/visual", tags=["visual comparison"])

NOT_FOUND = {"code": "not_found", "message": "No such comparison."}


def _err(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status, detail={"code": code, "message": message})


def _to_params(p: VisualParams) -> v.Params:
    return v.Params(
        tolerance=p.tolerance,
        min_area=p.min_area,
        merge_distance=p.merge_distance,
        size_policy=p.size_policy,
        ignore=tuple(v.Box(b.x, b.y, b.width, b.height) for b in p.ignore),
    )


def _parse_ignore(raw: str) -> list[BoxIn]:
    try:
        data = json.loads(raw or "[]")
        if not isinstance(data, list) or len(data) > 20:
            raise ValueError
        return [BoxIn.model_validate(item) for item in data]
    except (ValueError, ValidationError):
        raise _err(422, "invalid_ignore", "ignore must be a JSON list of at most 20 {x, y, width, height} boxes.") from None


def _read_capped(upload: UploadFile, limit: int, field: str) -> bytes:
    data = upload.file.read(limit + 1)
    if len(data) > limit:
        raise _err(413, "file_too_large", f"The {field} image is larger than {limit // (1024 * 1024)} MB.")
    return data


@router.post("", response_model=VisualResult, status_code=201, summary="Compare two screenshots")
def create_visual_comparison(
    request: Request,
    before: Annotated[UploadFile, File(description="Baseline screenshot (PNG, JPEG or WebP)")],
    after: Annotated[UploadFile, File(description="New screenshot (PNG, JPEG or WebP)")],
    tolerance: Annotated[float, Form(ge=0, le=100)] = 2.3,
    min_area: Annotated[int, Form(ge=1, le=10_000)] = 4,
    merge_distance: Annotated[int, Form(ge=0, le=50)] = 6,
    size_policy: Annotated[Literal["pad", "resize"], Form()] = "pad",
    ignore: Annotated[str, Form()] = "[]",
) -> VisualResult:
    settings, store = request.app.state.settings, request.app.state.store
    params = VisualParams(
        tolerance=tolerance,
        min_area=min_area,
        merge_distance=merge_distance,
        size_policy=size_policy,
        ignore=_parse_ignore(ignore),
    )
    before_bytes = _read_capped(before, settings.max_upload_bytes, "before")
    after_bytes = _read_capped(after, settings.max_upload_bytes, "after")
    try:
        result = run_visual_comparison(
            store, settings, before_bytes, after_bytes, before.filename, after.filename, _to_params(params)
        )
    except ImageRejected as exc:
        # Which image failed is not known from the exception alone, so decode order is reported by message.
        raise _err(422, exc.code, exc.message) from None
    return VisualResult.model_validate(result)


@router.post("/{comparison_id}/rerun", response_model=VisualResult, status_code=201, summary="Re-analyse with new parameters")
def rerun_visual_comparison_route(comparison_id: str, params: VisualParams, request: Request) -> VisualResult:
    settings, store = request.app.state.settings, request.app.state.store
    try:
        result = rerun_visual_comparison(store, settings, comparison_id, _to_params(params))
    except ImageRejected as exc:
        raise _err(422, exc.code, exc.message) from None
    if result is None:
        raise HTTPException(status_code=404, detail=NOT_FOUND)
    return VisualResult.model_validate(result)


@router.get("", response_model=VisualList, summary="Most recent comparisons")
def list_visual_comparisons(request: Request) -> VisualList:
    items = request.app.state.store.list_recent()
    return VisualList(items=[VisualResult.model_validate(r) for r in items])


@router.get("/{comparison_id}", response_model=VisualResult, summary="One comparison result")
def get_visual_comparison(comparison_id: str, request: Request) -> VisualResult:
    result = request.app.state.store.read_result(comparison_id)
    if result is None:
        raise HTTPException(status_code=404, detail=NOT_FOUND)
    return VisualResult.model_validate(result)


@router.get("/{comparison_id}/artifacts/{name}", summary="A rendered image of a comparison")
def get_artifact(comparison_id: str, name: str, request: Request) -> FileResponse:
    path = request.app.state.store.artifact_path(comparison_id, name)
    if path is None:
        raise HTTPException(status_code=404, detail=NOT_FOUND)
    return FileResponse(
        path,
        media_type="image/png",
        headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=3600"},
    )
