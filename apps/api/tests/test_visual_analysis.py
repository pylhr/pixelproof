"""Tests for the deterministic comparison core. Synthetic images with known differences."""

from pathlib import Path

import numpy as np
import pytest

from pixelproof.analysis import visual as v
from pixelproof.security.images import decode_image

FIXTURES = Path(__file__).resolve().parents[2] / "web" / "public" / "fixtures"


def solid(w, h, rgb=(255, 255, 255)):
    img = np.empty((h, w, 3), np.uint8)
    img[:] = rgb
    return img


def test_identical_images_have_no_changes_and_perfect_ssim():
    a = solid(64, 48, (30, 90, 160))
    r = v.compare(a, a.copy())
    assert r.changed_pixels == 0
    assert r.regions == [] and r.regions_total == 0
    assert r.ssim == 1.0
    assert r.size_match and r.policy_applied == "none"
    assert r.max_delta_e == 0.0


def test_known_rectangle_gives_exact_region():
    a = solid(100, 80)
    b = a.copy()
    b[20:30, 40:60] = (200, 30, 30)  # 10 rows x 20 cols = 200 px
    r = v.compare(a, b)
    assert r.changed_pixels == 200
    assert r.regions_total == 1
    reg = r.regions[0]
    assert (reg.x, reg.y, reg.width, reg.height) == (40, 20, 20, 10)
    assert reg.changed_pixels == 200
    assert reg.mean_delta_e > 30
    assert r.ssim is not None and r.ssim < 1.0


def test_difference_below_tolerance_is_not_counted():
    a = solid(50, 50, (120, 120, 120))
    b = solid(50, 50, (121, 120, 120))  # delta-E well under 2.3
    r = v.compare(a, b)
    assert r.changed_pixels == 0
    assert v.compare(a, b, v.Params(tolerance=0)).changed_pixels == 50 * 50


def test_tiny_noise_is_ignored_but_counted():
    a = solid(60, 60)
    b = a.copy()
    b[10, 10] = (0, 0, 0)
    b[40, 40] = (0, 0, 0)
    r = v.compare(a, b, v.Params(min_area=4))
    assert r.changed_pixels == 0
    assert r.ignored_small_pixels == 2  # nothing is silently dropped
    assert v.compare(a, b, v.Params(min_area=1)).changed_pixels == 2


def test_nearby_changes_merge_into_one_region_and_far_ones_do_not():
    a = solid(200, 60)
    b = a.copy()
    b[10:14, 10:14] = 0
    b[10:14, 18:22] = 0  # 4 px gap -> merged with merge_distance 6
    b[10:14, 150:154] = 0  # far away
    r = v.compare(a, b, v.Params(merge_distance=6))
    assert r.regions_total == 2
    assert r.regions[0].width == 12  # 10..21 inclusive
    r0 = v.compare(a, b, v.Params(merge_distance=0))
    assert r0.regions_total == 3


def test_ignore_box_excludes_pixels_and_denominator():
    a = solid(100, 100)
    b = a.copy()
    b[0:20, 0:20] = 0
    r = v.compare(a, b, v.Params(ignore=(v.Box(0, 0, 20, 20),)))
    assert r.changed_pixels == 0
    assert r.ignored_pixels == 400
    assert r.compared_pixels == 100 * 100 - 400


def test_size_mismatch_is_padded_not_scaled_and_reported():
    a = solid(100, 80)
    b = solid(120, 70)
    r = v.compare(a, b)
    assert not r.size_match and r.policy_applied == "pad" and not r.scaling_applied
    assert (r.canvas_width, r.canvas_height) == (120, 80)
    assert (r.overlap_width, r.overlap_height) == (100, 70)
    assert r.changed_pixels == 0  # identical white overlap
    sides = {(u.side, u.box.x, u.box.y, u.box.width, u.box.height) for u in r.unmatched}
    assert sides == {("before", 0, 70, 100, 10), ("after", 100, 0, 20, 70)}
    assert r.unmatched_pixels == 100 * 10 + 20 * 70
    assert any("differ in size" in w for w in r.warnings)
    assert r.cover_before[79, 99] and not r.cover_before[79, 100]
    assert r.cover_after[69, 119] and not r.cover_after[70, 0]


def test_same_aspect_ratio_suggests_scale_difference():
    r = v.compare(solid(100, 50), solid(200, 100))
    assert any("aspect ratios match" in w for w in r.warnings)


def test_resize_policy_scales_after_and_warns():
    a = solid(100, 50, (10, 200, 10))
    b = solid(200, 100, (10, 200, 10))
    r = v.compare(a, b, v.Params(size_policy="resize"))
    assert r.scaling_applied and r.policy_applied == "resize"
    assert (r.canvas_width, r.canvas_height) == (100, 50)
    assert r.changed_pixels == 0
    assert any("not reliable after scaling" in w for w in r.warnings)


def test_invalid_params_are_rejected():
    a = solid(20, 20)
    with pytest.raises(ValueError):
        v.compare(a, a, v.Params(tolerance=-1))
    with pytest.raises(ValueError):
        v.compare(a, a, v.Params(min_area=0))
    with pytest.raises(ValueError):
        v.compare(a, a, v.Params(size_policy="stretch"))


def test_ssim_unavailable_for_tiny_images():
    r = v.compare(solid(8, 8), solid(8, 8))
    assert r.ssim is None and r.ssim_note


def test_ssim_matches_scikit_image():
    ski = pytest.importorskip("skimage.metrics")
    rng = np.random.default_rng(7)
    a = rng.integers(0, 256, (90, 120, 3), dtype=np.uint8)
    b = np.clip(a.astype(int) + rng.integers(-25, 26, a.shape), 0, 255).astype(np.uint8)
    import cv2

    ga, gb = (cv2.cvtColor(x, cv2.COLOR_RGB2GRAY) for x in (a, b))
    expected = ski.structural_similarity(ga, gb, data_range=255, gaussian_weights=True, use_sample_covariance=False)
    got, _ = v.ssim_mean(a, b)
    assert abs(got - expected) < 1e-4


def test_rendered_artifacts_are_valid_pngs_of_canvas_size():
    import cv2

    a = solid(60, 40)
    b = a.copy()
    b[5:15, 5:25] = (0, 0, 0)
    r = v.compare(a, solid(70, 40))  # padded, for the transparency checks
    for blob in (
        v.render_diff_mask(r),
        v.render_heatmap(r),
        v.render_canvas_image(r.before, r.cover_before),
        v.render_canvas_image(r.after, r.cover_after),
    ):
        img = cv2.imdecode(np.frombuffer(blob, np.uint8), cv2.IMREAD_UNCHANGED)
        assert img.shape == (40, 70, 4)
    heat = cv2.imdecode(np.frombuffer(v.render_heatmap(r), np.uint8), cv2.IMREAD_UNCHANGED)
    assert heat[0, 65, 3] == 0 and heat[0, 0, 3] == 255  # pixels only one image has are transparent
    legend = v.heatmap_legend()
    assert [s["delta_e"] for s in legend] == [0.0, 12.5, 25.0, 37.5, 50.0]
    assert all(len(s["color"]) == 7 for s in legend)


def test_fixture_ground_truth():
    """The two fictional Acme screenshots differ in documented ways (see scripts/gen-fixture-images.py)."""
    a = decode_image((FIXTURES / "acme-settings-before.png").read_bytes(), max_pixels=16_000_000).pixels
    b = decode_image((FIXTURES / "acme-settings-after.png").read_bytes(), max_pixels=16_000_000).pixels
    r = v.compare(a, b)
    assert r.size_match
    ys, xs = np.nonzero(r.changed)
    # The sidebar and header are identical in both versions: nothing there may be reported.
    assert not (xs < 240).any(), "changes reported inside the unchanged sidebar"
    assert not (ys < 64).any(), "changes reported inside the unchanged header"
    covered = lambda px, py: any(g.x <= px < g.x + g.width and g.y <= py < g.y + g.height for g in r.regions)
    assert covered(395, 376), "restyled primary button (after) not covered"
    assert covered(500, 520), "new danger-zone card (after) not covered"
    assert covered(600, 120), "removed beta banner area not covered"
    assert r.ssim is not None and 0.5 < r.ssim < 0.99
    assert 1.0 < 100 * r.changed_pixels / r.compared_pixels < 30.0
