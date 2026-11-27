"""Deterministic visual comparison of two screenshots. Pure functions, no I/O.

Everything here produces *observations*: how many pixels differ by more than a
tolerance, where, and how structurally similar the images are. Nothing here decides
whether a difference is a regression; that needs evidence this module does not have.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import cv2
import numpy as np

STRIP_ROWS = 512  # colour conversion is done in strips to bound peak memory
SSIM_WINDOW = 11
SSIM_SIGMA = 1.5
HEATMAP_FULL_SCALE_DE = 50.0  # delta-E at which the heatmap saturates
MAX_REGIONS = 200

SIZE_POLICIES = ("pad", "resize")


@dataclass(frozen=True)
class Box:
    x: int
    y: int
    width: int
    height: int


@dataclass(frozen=True)
class Params:
    #: CIE76 delta-E above which a pixel counts as changed. ~2.3 is a just-noticeable difference.
    tolerance: float = 2.3
    #: Connected groups of changed pixels smaller than this are ignored as noise (and counted).
    min_area: int = 4
    #: Changed groups closer than this many pixels are merged into one region.
    merge_distance: int = 6
    size_policy: str = "pad"
    ignore: tuple[Box, ...] = ()


@dataclass(frozen=True)
class Region:
    id: int
    x: int
    y: int
    width: int
    height: int
    changed_pixels: int
    mean_delta_e: float
    max_delta_e: float


@dataclass(frozen=True)
class Unmatched:
    side: str  # "before" | "after": the image that has pixels the other lacks
    box: Box


@dataclass
class Analysis:
    canvas_width: int
    canvas_height: int
    before: np.ndarray  # canvas-sized RGB (padded with zeros if sizes differ)
    after: np.ndarray
    covered_both: np.ndarray  # bool canvas mask: pixels present in both images
    cover_before: np.ndarray  # bool canvas mask: pixels that belong to the before image
    cover_after: np.ndarray
    ignore_mask: np.ndarray  # bool canvas mask: pixels excluded by ignore boxes
    delta_e: np.ndarray  # float32 canvas; 0 outside covered_both
    changed: np.ndarray  # bool canvas mask of changed pixels (after noise filtering)
    size_match: bool
    policy_applied: str  # "none" | "pad" | "resize"
    scaling_applied: bool
    overlap_width: int
    overlap_height: int
    unmatched: list[Unmatched]
    unmatched_pixels: int
    compared_pixels: int  # overlap minus ignored
    ignored_pixels: int
    changed_pixels: int
    ignored_small_pixels: int
    ssim: float | None
    ssim_note: str | None
    mean_delta_e_changed: float
    max_delta_e: float
    regions: list[Region]
    regions_total: int
    warnings: list[str] = field(default_factory=list)


# --------------------------------------------------------------------------- normalise


def _only_in(x_w: int, x_h: int, y_w: int, y_h: int, side: str) -> list[Unmatched]:
    """Parts of image X (top-left anchored) that image Y does not cover."""
    out: list[Unmatched] = []
    if x_w > y_w:
        out.append(Unmatched(side, Box(y_w, 0, x_w - y_w, x_h)))
    if x_h > y_h:
        out.append(Unmatched(side, Box(0, y_h, min(x_w, y_w), x_h - y_h)))
    return out


def normalize(a: np.ndarray, b: np.ndarray, policy: str):
    """Bring two RGB images onto one canvas.

    "pad": no scaling. Both images are anchored top-left on a canvas big enough for either.
    "resize": image B is scaled to A's size (flagged: scaling invalidates pixel-level comparison).
    """
    if policy not in SIZE_POLICIES:
        raise ValueError(f"unknown size policy {policy!r}")
    ha, wa = a.shape[:2]
    hb, wb = b.shape[:2]
    if (wa, ha) == (wb, hb):
        return a, b, wa, ha, "none", False, wa, ha, []

    if policy == "resize":
        interp = cv2.INTER_AREA if wb * hb > wa * ha else cv2.INTER_LANCZOS4
        b2 = cv2.resize(b, (wa, ha), interpolation=interp)
        return a, b2, wa, ha, "resize", True, wa, ha, []

    w, h = max(wa, wb), max(ha, hb)
    ca = np.zeros((h, w, 3), np.uint8)
    cb = np.zeros((h, w, 3), np.uint8)
    ca[:ha, :wa] = a
    cb[:hb, :wb] = b
    unmatched = _only_in(wa, ha, wb, hb, "before") + _only_in(wb, hb, wa, ha, "after")
    return ca, cb, w, h, "pad", False, min(wa, wb), min(ha, hb), unmatched


# --------------------------------------------------------------------------- metrics


def delta_e_cie76(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Per-pixel CIE76 colour distance between two same-sized uint8 RGB images."""
    h, w = a.shape[:2]
    out = np.empty((h, w), np.float32)
    for y0 in range(0, h, STRIP_ROWS):
        y1 = min(h, y0 + STRIP_ROWS)
        la = cv2.cvtColor(a[y0:y1].astype(np.float32) / 255.0, cv2.COLOR_RGB2Lab)
        lb = cv2.cvtColor(b[y0:y1].astype(np.float32) / 255.0, cv2.COLOR_RGB2Lab)
        d = la - lb
        out[y0:y1] = np.sqrt(np.einsum("ijk,ijk->ij", d, d))
    return out


def ssim_mean(a: np.ndarray, b: np.ndarray) -> tuple[float | None, str | None]:
    """Mean structural similarity of two same-sized RGB images (luminance channel).

    Gaussian window (11x11, sigma 1.5), K1=0.01, K2=0.03, border pixels excluded. Matches
    scikit-image's structural_similarity(gaussian_weights=True, use_sample_covariance=False).
    """
    h, w = a.shape[:2]
    if min(h, w) < SSIM_WINDOW:
        return None, f"SSIM needs at least {SSIM_WINDOW}x{SSIM_WINDOW} pixels."
    x = cv2.cvtColor(a, cv2.COLOR_RGB2GRAY).astype(np.float32)
    y = cv2.cvtColor(b, cv2.COLOR_RGB2GRAY).astype(np.float32)
    c1, c2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2

    def blur(im: np.ndarray) -> np.ndarray:
        return cv2.GaussianBlur(im, (SSIM_WINDOW, SSIM_WINDOW), SSIM_SIGMA, borderType=cv2.BORDER_REFLECT)

    mx, my = blur(x), blur(y)
    sxx = blur(x * x) - mx * mx
    syy = blur(y * y) - my * my
    sxy = blur(x * y) - mx * my
    m = ((2 * mx * my + c1) * (2 * sxy + c2)) / ((mx * mx + my * my + c1) * (sxx + syy + c2))
    pad = (SSIM_WINDOW - 1) // 2
    return float(m[pad:-pad, pad:-pad].mean(dtype=np.float64)), None


# --------------------------------------------------------------------------- regions


def _find_regions(changed: np.ndarray, de: np.ndarray, merge_distance: int):
    k = 2 * merge_distance + 1
    grown = cv2.dilate(changed.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))) if k > 1 else changed.astype(np.uint8)
    n, labels = cv2.connectedComponents(grown, connectivity=8)
    ys, xs = np.nonzero(changed)
    if n <= 1 or ys.size == 0:
        return [], 0
    labs = labels[ys, xs]
    counts = np.bincount(labs, minlength=n)
    sums = np.bincount(labs, weights=de[ys, xs].astype(np.float64), minlength=n)
    present = [i for i in range(1, n) if counts[i] > 0]
    total = len(present)
    present.sort(key=lambda i: (-int(counts[i]), i))
    regions: list[Region] = []
    for rank, i in enumerate(present[:MAX_REGIONS], start=1):
        sel = labs == i
        rx, ry = xs[sel], ys[sel]
        regions.append(
            Region(
                id=rank,
                x=int(rx.min()),
                y=int(ry.min()),
                width=int(rx.max() - rx.min() + 1),
                height=int(ry.max() - ry.min() + 1),
                changed_pixels=int(counts[i]),
                mean_delta_e=round(float(sums[i] / counts[i]), 3),
                max_delta_e=round(float(de[ry, rx].max()), 3),
            )
        )
    return regions, total


# --------------------------------------------------------------------------- main entry


def compare(a: np.ndarray, b: np.ndarray, params: Params = Params()) -> Analysis:
    """Compare two RGB uint8 images (H, W, 3). Raises ValueError on invalid parameters."""
    if not 0 <= params.tolerance <= 100:
        raise ValueError("tolerance must be between 0 and 100")
    if params.min_area < 1:
        raise ValueError("min_area must be at least 1")
    if params.merge_distance < 0:
        raise ValueError("merge_distance must not be negative")

    ha, wa = a.shape[:2]
    hb, wb = b.shape[:2]
    ca, cb, w, h, policy, scaled, ow, oh, unmatched = normalize(a, b, params.size_policy)

    covered = np.zeros((h, w), bool)
    covered[:oh, :ow] = True
    cover_before = np.zeros((h, w), bool)
    cover_after = np.zeros((h, w), bool)
    if policy == "pad":
        cover_before[:ha, :wa] = True
        cover_after[:hb, :wb] = True
    else:
        cover_before[:] = True
        cover_after[:] = True
    ignore = np.zeros((h, w), bool)
    for box in params.ignore:
        x0, y0 = max(0, box.x), max(0, box.y)
        ignore[y0 : max(y0, box.y + box.height), x0 : max(x0, box.x + box.width)] = True
    ignore &= covered

    de = np.zeros((h, w), np.float32)
    de[:oh, :ow] = delta_e_cie76(ca[:oh, :ow], cb[:oh, :ow])

    compare_mask = covered & ~ignore
    raw = (de > params.tolerance) & compare_mask

    # Drop tiny groups of changed pixels as noise, but count them so nothing is hidden.
    n, labels, stats, _ = cv2.connectedComponentsWithStats(raw.astype(np.uint8), connectivity=8)
    keep = stats[:, cv2.CC_STAT_AREA] >= params.min_area
    keep[0] = False
    changed = keep[labels]
    changed_px = int(changed.sum())
    ignored_small = int(raw.sum()) - changed_px

    regions, regions_total = _find_regions(changed, de, params.merge_distance)

    ssim, ssim_note = ssim_mean(ca[:oh, :ow], cb[:oh, :ow])
    if ssim is not None and ignore.any():
        ssim_note = "SSIM covers the whole overlap, including any ignored areas."

    warnings: list[str] = []
    if policy == "pad":
        warnings.append(
            f"The images differ in size (before {wa}x{ha}, after {wb}x{hb}). Only the overlapping "
            f"{ow}x{oh} top-left area was compared; {sum(u.box.width * u.box.height for u in unmatched):,} pixels exist in only one image."
        )
        if abs(wa / ha - wb / hb) < 0.01:
            warnings.append(
                "The aspect ratios match, so the screenshots may differ only by scale (for example device pixel ratio). "
                "Consider re-running with 'resize after to match before'."
            )
    elif policy == "resize":
        warnings.append(
            f"The after image was resized from {wb}x{hb} to {wa}x{ha}. Pixel-level differences are not reliable after scaling."
        )
    if params.tolerance == 0:
        warnings.append("Tolerance 0 flags every pixel difference, including antialiasing and compression noise.")

    de_changed = de[changed]
    compared = int((compare_mask & covered).sum())
    return Analysis(
        canvas_width=w,
        canvas_height=h,
        before=ca,
        after=cb,
        covered_both=covered,
        cover_before=cover_before,
        cover_after=cover_after,
        ignore_mask=ignore,
        delta_e=de,
        changed=changed,
        size_match=policy == "none",
        policy_applied=policy,
        scaling_applied=scaled,
        overlap_width=ow,
        overlap_height=oh,
        unmatched=unmatched,
        unmatched_pixels=sum(u.box.width * u.box.height for u in unmatched),
        compared_pixels=compared,
        ignored_pixels=int(ignore.sum()),
        changed_pixels=changed_px,
        ignored_small_pixels=ignored_small,
        ssim=None if ssim is None else round(ssim, 6),
        ssim_note=ssim_note,
        mean_delta_e_changed=round(float(de_changed.mean()), 3) if de_changed.size else 0.0,
        max_delta_e=round(float(de[compare_mask].max()), 3) if compared else 0.0,
        regions=regions,
        regions_total=regions_total,
        warnings=warnings,
    )


# --------------------------------------------------------------------------- rendering


def _rgba_png(rgba: np.ndarray) -> bytes:
    ok, buf = cv2.imencode(".png", cv2.cvtColor(rgba, cv2.COLOR_RGBA2BGRA))
    if not ok:
        raise RuntimeError("PNG encoding failed")
    return buf.tobytes()


def render_canvas_image(img: np.ndarray, covered: np.ndarray) -> bytes:
    """The normalised image as PNG; pixels the image does not cover are transparent."""
    rgba = np.dstack([img, np.where(covered, 255, 0).astype(np.uint8)])
    return _rgba_png(rgba)


def render_diff_mask(a: Analysis) -> bytes:
    rgba = np.zeros((a.canvas_height, a.canvas_width, 4), np.uint8)
    rgba[a.changed] = (255, 59, 48, 255)
    return _rgba_png(rgba)


HEATMAP_LEGEND_DE = (0.0, 12.5, 25.0, 37.5, 50.0)


def _heat_level(delta_e):
    """Map delta-E to the 0-255 colormap index (saturating at HEATMAP_FULL_SCALE_DE)."""
    return np.rint(np.clip(np.asarray(delta_e, np.float32) / HEATMAP_FULL_SCALE_DE, 0.0, 1.0) * 255).astype(np.uint8)


def heatmap_legend() -> list[dict]:
    """Colours at fixed delta-E values, so the UI legend matches the rendered colormap exactly."""
    levels = _heat_level(HEATMAP_LEGEND_DE).reshape(-1, 1)
    bgr = cv2.applyColorMap(levels, cv2.COLORMAP_VIRIDIS).reshape(-1, 3)
    return [
        {"delta_e": de, "color": "#%02x%02x%02x" % (int(r), int(g), int(b))}
        for de, (b, g, r) in zip(HEATMAP_LEGEND_DE, bgr)
    ]


def render_heatmap(a: Analysis) -> bytes:
    bgr = cv2.applyColorMap(_heat_level(a.delta_e), cv2.COLORMAP_VIRIDIS)
    rgba = np.dstack([cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB), np.full(a.delta_e.shape, 255, np.uint8)])
    rgba[a.ignore_mask] = (90, 90, 90, 255)
    rgba[~a.covered_both] = (0, 0, 0, 0)
    return _rgba_png(rgba)
