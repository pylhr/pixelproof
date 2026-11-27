from fastapi.testclient import TestClient

from pixelproof import __version__
from pixelproof.config import Settings
from pixelproof.main import create_app

ALLOWED = "http://localhost:3000"


def make_client() -> TestClient:
    return TestClient(create_app(Settings(cors_origins=(ALLOWED,))))


def test_health_returns_ok_payload():
    res = make_client().get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "service": "pixelproof-api", "version": __version__}


def test_cors_allows_configured_origin():
    res = make_client().get("/health", headers={"Origin": ALLOWED})
    assert res.headers.get("access-control-allow-origin") == ALLOWED


def test_cors_does_not_allow_other_origins():
    res = make_client().get("/health", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in res.headers


def test_unknown_route_is_404():
    assert make_client().get("/nope").status_code == 404
