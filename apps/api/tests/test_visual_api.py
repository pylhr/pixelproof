"""HTTP-level tests for the visual comparison API (run with pytest; needs fastapi + httpx)."""

import io
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from pixelproof.config import Settings
from pixelproof.main import create_app

FIXTURES = Path(__file__).resolve().parents[2] / "web" / "public" / "fixtures"
BASE = "/api/comparisons/visual"


def png(w=64, h=48, color=(255, 255, 255), box=None, box_color=(200, 30, 30)) -> bytes:
    img = Image.new("RGB", (w, h), color)
    if box:
        x0, y0, x1, y1 = box
        img.paste(Image.new("RGB", (x1 - x0, y1 - y0), box_color), (x0, y0))
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue()


@pytest.fixture()
def client(tmp_path):
    return TestClient(create_app(Settings(data_dir=tmp_path, max_upload_bytes=200_000, max_pixels=1_000_000)))


def upload(client, before, after, **data):
    return client.post(
        BASE,
        files={"before": ("before.png", before, "image/png"), "after": ("after.png", after, "image/png")},
        data={k: str(v) for k, v in data.items()},
    )


def test_compare_two_images_returns_measured_result(client):
    r = upload(client, png(), png(box=(10, 10, 30, 20)))
    assert r.status_code == 201
    body = r.json()
    assert body["metrics"]["changed_pixels"] == 200
    assert body["metrics"]["regions_total"] == 1
    assert body["regions"][0]["x"] == 10 and body["regions"][0]["width"] == 20
    assert body["size"]["match"] is True
    assert body["before"]["name"] == "before.png"
    assert set(body["artifacts"]) == {"before", "after", "diff_mask", "heatmap"}


def test_result_can_be_fetched_again_and_artifacts_are_pngs(client):
    body = upload(client, png(), png(box=(0, 0, 8, 8))).json()
    again = client.get(f"{BASE}/{body['id']}")
    assert again.status_code == 200 and again.json() == body
    for name in ("before.png", "after.png", "diff-mask.png", "heatmap.png"):
        art = client.get(f"{BASE}/{body['id']}/artifacts/{name}")
        assert art.status_code == 200
        assert art.headers["content-type"] == "image/png"
        assert art.content[:8] == b"\x89PNG\r\n\x1a\n"
        assert art.headers["x-content-type-options"] == "nosniff"


def test_originals_and_unknown_artifacts_are_not_served(client):
    cid = upload(client, png(), png()).json()["id"]
    for name in ("source-before.png", "result.json", "..%2fresult.json", "nope.png"):
        assert client.get(f"{BASE}/{cid}/artifacts/{name}").status_code == 404


def test_unknown_and_malformed_ids_return_404(client):
    for cid in ("0" * 32, "not-an-id", "A" * 32):
        assert client.get(f"{BASE}/{cid}").status_code == 404
        assert client.get(f"{BASE}/{cid}/artifacts/before.png").status_code == 404
    assert client.post(f"{BASE}/{'0' * 32}/rerun", json={}).status_code == 404


def test_non_image_upload_is_rejected_with_a_code(client):
    r = upload(client, b"just text", png())
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "not_an_image"


def test_oversized_upload_is_rejected(client):
    big = png(600, 600, color=(1, 2, 3)) + b"\x00" * 250_000  # trailing bytes push it over the cap
    r = upload(client, big, png())
    assert r.status_code == 413
    assert r.json()["detail"]["code"] == "file_too_large"


def test_pixel_cap_is_enforced(client):
    r = upload(client, png(1500, 1000), png())  # 1.5 MP > 1 MP limit in this fixture
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "image_too_large"


def test_invalid_parameters_are_rejected(client):
    assert upload(client, png(), png(), tolerance=-1).status_code == 422
    assert upload(client, png(), png(), tolerance=500).status_code == 422
    assert upload(client, png(), png(), size_policy="stretch").status_code == 422
    assert upload(client, png(), png(), ignore="not json").status_code == 422
    assert upload(client, png(), png(), ignore='[{"x":0,"y":0,"width":0,"height":5}]').status_code == 422


def test_size_mismatch_is_reported_not_hidden(client):
    r = upload(client, png(100, 80), png(120, 70))
    body = r.json()
    assert r.status_code == 201
    assert body["size"]["match"] is False and body["size"]["policy_applied"] == "pad"
    assert body["size"]["unmatched_pixels"] > 0
    assert any("differ in size" in w for w in body["warnings"])


def test_ignore_box_excludes_changes(client):
    r = upload(client, png(), png(box=(0, 0, 10, 10)), ignore='[{"x":0,"y":0,"width":10,"height":10}]')
    assert r.json()["metrics"]["changed_pixels"] == 0
    assert r.json()["metrics"]["ignored_pixels"] == 100


def test_rerun_creates_a_new_comparison_and_keeps_the_old_one(client):
    first = upload(client, png(), png(box=(0, 0, 10, 10))).json()
    r = client.post(f"{BASE}/{first['id']}/rerun", json={"tolerance": 100})
    assert r.status_code == 201
    second = r.json()
    assert second["id"] != first["id"]
    assert second["params"]["tolerance"] == 100 and second["metrics"]["changed_pixels"] == 0
    assert client.get(f"{BASE}/{first['id']}").json()["metrics"]["changed_pixels"] == 100
    assert second["before"]["name"] == "before.png"


def test_recent_list_is_newest_first(client):
    a = upload(client, png(), png()).json()["id"]
    b = upload(client, png(), png(box=(0, 0, 4, 4))).json()["id"]
    ids = [i["id"] for i in client.get(BASE).json()["items"]]
    assert ids[:2] == [b, a]


def test_fixture_pair_through_the_api(tmp_path):
    client = TestClient(create_app(Settings(data_dir=tmp_path)))  # default limits
    r = upload(client, (FIXTURES / "acme-settings-before.png").read_bytes(), (FIXTURES / "acme-settings-after.png").read_bytes())
    assert r.status_code == 201
    body = r.json()
    assert body["size"]["match"] is True
    assert body["metrics"]["regions_total"] >= 1
    assert 0.5 < body["metrics"]["ssim"] < 0.99


def test_cors_preflight_allows_post_from_the_web_app(client):
    r = client.options(
        BASE,
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"},
    )
    assert r.status_code == 200
    assert r.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "POST" in r.headers["access-control-allow-methods"]
