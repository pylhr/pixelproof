import json
import tempfile
import time
from pathlib import Path

from pixelproof.storage.comparisons import ComparisonStore


def make(keep=25):
    tmp = tempfile.TemporaryDirectory()
    return tmp, ComparisonStore(Path(tmp.name), keep)


def put(store, n_name="x"):
    cid = store.new_id()
    store.write(cid, {"before.png": b"b", "after.png": b"a", "source-before.png": b"sb"}, {"id": cid, "n": n_name})
    return cid


def test_roundtrip_and_artifact_allowlist():
    tmp, s = make()
    with tmp:
        cid = put(s)
        assert s.read_result(cid)["id"] == cid
        assert s.artifact_path(cid, "before.png").read_bytes() == b"b"
        assert s.artifact_path(cid, "result.json") is None  # not a public artifact
        assert s.artifact_path(cid, "source-before.png") is None  # originals are not served
        assert s.read_source(cid, "before") == b"sb"
        assert s.read_source(cid, "after") is None


def test_ids_that_could_escape_the_store_are_rejected():
    tmp, s = make()
    with tmp:
        for bad in ["..", "../x", "a" * 31, "A" * 32, "g" * 32, "", "../../etc/passwd", "0" * 32 + "/.."]:
            assert s.read_result(bad) is None
            assert s.artifact_path(bad, "before.png") is None
            assert s.read_source(bad, "before") is None


def test_unknown_id_returns_none():
    tmp, s = make()
    with tmp:
        assert s.read_result("0" * 32) is None


def test_prune_keeps_newest():
    tmp, s = make(keep=2)
    with tmp:
        ids = []
        for i in range(4):
            ids.append(put(s, str(i)))
            time.sleep(0.02)
        remaining = {r["id"] for r in s.list_recent()}
        assert remaining == set(ids[-2:])


def test_list_recent_is_newest_first_and_ignores_junk():
    tmp, s = make()
    with tmp:
        a = put(s)
        time.sleep(0.02)
        b = put(s)
        (s.root / "not-an-id").mkdir()
        (s.root / ("c" * 32)).mkdir()  # no result.json
        assert [r["id"] for r in s.list_recent()] == [b, a]


def test_failed_write_leaves_no_partial_folder():
    tmp, s = make()
    with tmp:
        cid = s.new_id()
        try:
            s.write(cid, {"before.png": b"b"}, {"bad": object()})  # not JSON serialisable
        except TypeError:
            pass
        assert s.read_result(cid) is None
        assert not any(p.name.startswith(".tmp-") for p in s.root.iterdir())
