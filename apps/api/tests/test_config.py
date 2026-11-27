from pathlib import Path

import pytest

from pixelproof.config import DEFAULT_CORS_ORIGINS, ConfigError, load_settings


def test_defaults_when_env_unset():
    assert load_settings({}).cors_origins == DEFAULT_CORS_ORIGINS


def test_parses_comma_separated_origins_and_trims():
    s = load_settings({"PIXELPROOF_CORS_ORIGINS": " http://a.test/ , http://b.test "})
    assert s.cors_origins == ("http://a.test", "http://b.test")


def test_wildcard_is_rejected():
    with pytest.raises(ConfigError):
        load_settings({"PIXELPROOF_CORS_ORIGINS": "*"})


def test_empty_value_is_rejected():
    with pytest.raises(ConfigError):
        load_settings({"PIXELPROOF_CORS_ORIGINS": " , "})


def test_limits_default_and_override():
    d = load_settings({})
    assert d.max_upload_bytes == 15 * 1024 * 1024
    assert d.max_pixels == 16_000_000
    assert d.keep_comparisons == 25
    s = load_settings({"PIXELPROOF_MAX_UPLOAD_MB": "5", "PIXELPROOF_MAX_PIXELS": "1000", "PIXELPROOF_KEEP_COMPARISONS": "3"})
    assert (s.max_upload_bytes, s.max_pixels, s.keep_comparisons) == (5 * 1024 * 1024, 1000, 3)


@pytest.mark.parametrize("name", ["PIXELPROOF_MAX_UPLOAD_MB", "PIXELPROOF_MAX_PIXELS", "PIXELPROOF_KEEP_COMPARISONS"])
@pytest.mark.parametrize("bad", ["abc", "0", "-4", "1.5"])
def test_invalid_limits_are_rejected(name, bad):
    with pytest.raises(ConfigError):
        load_settings({name: bad})


def test_data_dir_override():
    assert load_settings({"PIXELPROOF_DATA_DIR": " /tmp/pp "}).data_dir == Path("/tmp/pp")
