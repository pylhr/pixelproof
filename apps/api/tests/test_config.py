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
