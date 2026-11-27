"""Pydantic models for the visual-comparison API. They mirror `services.visual` output."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

SizePolicy = Literal["pad", "resize"]


class BoxIn(BaseModel):
    x: int = Field(ge=0, le=100_000)
    y: int = Field(ge=0, le=100_000)
    width: int = Field(ge=1, le=100_000)
    height: int = Field(ge=1, le=100_000)


class VisualParams(BaseModel):
    tolerance: float = Field(2.3, ge=0, le=100, description="CIE76 delta-E above which a pixel counts as changed.")
    min_area: int = Field(4, ge=1, le=10_000, description="Smaller groups of changed pixels are ignored as noise (and counted).")
    merge_distance: int = Field(6, ge=0, le=50, description="Changed groups closer than this (px) merge into one region.")
    size_policy: SizePolicy = "pad"
    ignore: list[BoxIn] = Field(default_factory=list, max_length=20)


class ImageInfo(BaseModel):
    name: str
    width: int
    height: int
    format: str
    bytes: int


class Canvas(BaseModel):
    width: int
    height: int


class Extent(BaseModel):
    width: int
    height: int


class UnmatchedArea(BaseModel):
    side: Literal["before", "after"]
    x: int
    y: int
    width: int
    height: int


class SizeInfo(BaseModel):
    match: bool
    policy_applied: Literal["none", "pad", "resize"]
    scaling_applied: bool
    overlap: Extent
    unmatched_pixels: int
    unmatched: list[UnmatchedArea]


class Metrics(BaseModel):
    compared_pixels: int
    changed_pixels: int
    changed_percent: float
    ignored_pixels: int
    ignored_small_pixels: int
    ssim: float | None
    ssim_note: str | None
    mean_delta_e_changed: float
    max_delta_e: float
    regions_total: int


class Region(BaseModel):
    id: int
    x: int
    y: int
    width: int
    height: int
    changed_pixels: int
    mean_delta_e: float
    max_delta_e: float


class Artifacts(BaseModel):
    before: str
    after: str
    diff_mask: str
    heatmap: str


class LegendStop(BaseModel):
    delta_e: float
    color: str


class VisualResult(BaseModel):
    id: str
    created_at: str
    params: VisualParams
    before: ImageInfo
    after: ImageInfo
    canvas: Canvas
    size: SizeInfo
    metrics: Metrics
    regions: list[Region]
    regions_truncated: bool
    artifacts: Artifacts
    heatmap_legend: list[LegendStop]
    warnings: list[str]


class VisualList(BaseModel):
    items: list[VisualResult]


class ApiError(BaseModel):
    code: str
    message: str
