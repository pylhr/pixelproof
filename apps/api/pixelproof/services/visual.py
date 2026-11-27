"""Orchestrates one visual comparison: decode -> analyse -> render -> store.

Decoding of untrusted bytes happens in `security.images`; the numbers come from
`analysis.visual`. This layer only wires them together and shapes the stored result.
"""

from __future__ import annotations

import re
from dataclasses import asdict
from datetime import datetime, timezone

import cv2

from pixelproof.analysis import visual as v
from pixelproof.config import Settings
from pixelproof.security.images import DecodedImage, decode_image
from pixelproof.storage.comparisons import ComparisonStore

_CONTROL = re.compile(r"[\x00-\x1f\x7f]")


def display_name(raw: str | None, fallback: str) -> str:
    """A label for the UI only. Never used as a path."""
    if not raw:
        return fallback
    name = _CONTROL.sub("", raw.replace("\\", "/").rsplit("/", 1)[-1]).strip()
    return name[:120] or fallback


def _png_rgb(pixels) -> bytes:
    ok, buf = cv2.imencode(".png", cv2.cvtColor(pixels, cv2.COLOR_RGB2BGR))
    if not ok:
        raise RuntimeError("PNG encoding failed")
    return buf.tobytes()


def _image_info(name: str, d: DecodedImage) -> dict:
    return {"name": name, "width": d.width, "height": d.height, "format": d.format, "bytes": d.byte_size}


def _artifact_urls(comparison_id: str) -> dict:
    base = f"/api/comparisons/visual/{comparison_id}/artifacts"
    return {
        "before": f"{base}/before.png",
        "after": f"{base}/after.png",
        "diff_mask": f"{base}/diff-mask.png",
        "heatmap": f"{base}/heatmap.png",
    }


def _decode_warnings(label: str, d: DecodedImage) -> list[str]:
    out = []
    if d.format == "jpeg":
        out.append(f"The {label} image is a JPEG. Compression noise can appear as small differences.")
    if d.had_transparency:
        out.append(f"The {label} image has transparency, which was flattened onto white.")
    if d.was_animated:
        out.append(f"The {label} image is animated; only the first frame was used.")
    return out


def _run(
    store: ComparisonStore,
    before: DecodedImage,
    after: DecodedImage,
    names: tuple[str, str],
    params: v.Params,
) -> dict:
    analysis = v.compare(before.pixels, after.pixels, params)
    comparison_id = store.new_id()

    files = {
        "source-before.png": _png_rgb(before.pixels),
        "source-after.png": _png_rgb(after.pixels),
        "before.png": v.render_canvas_image(analysis.before, analysis.cover_before),
        "after.png": v.render_canvas_image(analysis.after, analysis.cover_after),
        "diff-mask.png": v.render_diff_mask(analysis),
        "heatmap.png": v.render_heatmap(analysis),
    }

    compared = analysis.compared_pixels
    result = {
        "id": comparison_id,
        "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "params": {
            "tolerance": params.tolerance,
            "min_area": params.min_area,
            "merge_distance": params.merge_distance,
            "size_policy": params.size_policy,
            "ignore": [asdict(b) for b in params.ignore],
        },
        "before": _image_info(names[0], before),
        "after": _image_info(names[1], after),
        "canvas": {"width": analysis.canvas_width, "height": analysis.canvas_height},
        "size": {
            "match": analysis.size_match,
            "policy_applied": analysis.policy_applied,
            "scaling_applied": analysis.scaling_applied,
            "overlap": {"width": analysis.overlap_width, "height": analysis.overlap_height},
            "unmatched_pixels": analysis.unmatched_pixels,
            "unmatched": [{"side": u.side, **asdict(u.box)} for u in analysis.unmatched],
        },
        "metrics": {
            "compared_pixels": compared,
            "changed_pixels": analysis.changed_pixels,
            "changed_percent": round(100 * analysis.changed_pixels / compared, 4) if compared else 0.0,
            "ignored_pixels": analysis.ignored_pixels,
            "ignored_small_pixels": analysis.ignored_small_pixels,
            "ssim": analysis.ssim,
            "ssim_note": analysis.ssim_note,
            "mean_delta_e_changed": analysis.mean_delta_e_changed,
            "max_delta_e": analysis.max_delta_e,
            "regions_total": analysis.regions_total,
        },
        "regions": [asdict(r) for r in analysis.regions],
        "regions_truncated": analysis.regions_total > len(analysis.regions),
        "artifacts": _artifact_urls(comparison_id),
        "heatmap_legend": v.heatmap_legend(),
        "warnings": _decode_warnings("before", before) + _decode_warnings("after", after) + analysis.warnings,
    }
    store.write(comparison_id, files, result)
    return result


def run_visual_comparison(
    store: ComparisonStore,
    settings: Settings,
    before_bytes: bytes,
    after_bytes: bytes,
    before_name: str | None,
    after_name: str | None,
    params: v.Params,
) -> dict:
    """Raises security.images.ImageRejected (bad upload) or ValueError (bad params)."""
    before = decode_image(before_bytes, max_pixels=settings.max_pixels)
    after = decode_image(after_bytes, max_pixels=settings.max_pixels)
    return _run(
        store,
        before,
        after,
        (display_name(before_name, "Before"), display_name(after_name, "After")),
        params,
    )


def rerun_visual_comparison(store: ComparisonStore, settings: Settings, source_id: str, params: v.Params) -> dict | None:
    """Re-analyse a stored comparison with different parameters. Creates a new comparison;
    the original is left untouched. Returns None if the source does not exist."""
    original = store.read_result(source_id)
    b = store.read_source(source_id, "before")
    a = store.read_source(source_id, "after")
    if original is None or a is None or b is None:
        return None
    before = decode_image(b, max_pixels=settings.max_pixels)
    after = decode_image(a, max_pixels=settings.max_pixels)
    # Keep format/size info of the real uploads rather than of our lossless re-encodes.
    result = _run(store, before, after, (original["before"]["name"], original["after"]["name"]), params)
    for side in ("before", "after"):
        result[side]["format"] = original[side]["format"]
        result[side]["bytes"] = original[side]["bytes"]
    result["warnings"] = [w for w in result["warnings"] if "JPEG" not in w and "transparency" not in w and "animated" not in w] + [
        w for w in original["warnings"] if "JPEG" in w or "transparency" in w or "animated" in w
    ]
    store.write_result_only(result["id"], result)
    return result
