#!/usr/bin/env python3
"""Storage-only, byte-exact archival after the frozen independent audit passes."""
import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "docs/V25-INDEPENDENT-QA-20261031.json"
FILES = (
    "docs/v25-qa/actual-source-pixels.json",
    "docs/v25-qa/actual-emitted-routes.json",
)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    report = json.loads(REPORT.read_text())
    assert report["sourceHashGuardPassed"] is True
    for relative, expected in report["sourceHashes"].items():
        assert sha((ROOT / relative).read_bytes()) == expected, relative
    entries = []
    for relative in FILES:
        raw_path = ROOT / relative
        raw = raw_path.read_bytes()
        compressed = gzip.compress(raw, compresslevel=9, mtime=0)
        assert gzip.decompress(compressed) == raw
        archived_relative = relative + ".gz"
        (ROOT / archived_relative).write_bytes(compressed)
        assert raw_path.read_bytes() == raw, "raw evidence must remain untouched"
        entries.append({
            "archivePath": archived_relative,
            "archiveBytes": len(compressed),
            "archiveSHA256": sha(compressed),
            "decodedRawPath": relative,
            "decodedRawBytes": len(raw),
            "decodedRawSHA256": sha(raw),
            "restoreCommand": "gzip -dc " + archived_relative + " > " + relative,
        })
    index_relative = "docs/V25-INDEPENDENT-RAW-ARCHIVE-20261031.json"
    index = {
        "schema": 1,
        "date": "2026-10-31",
        "scope": "Storage encoding only. Two already validated raw JSON files are archived byte-exact with gzip level9/mtime0. Checks, thresholds, source code, natural-health inputs and hashes are unchanged. Raw files remain locally available and are excluded individually from Git by the release owner.",
        "encoding": "gzip",
        "gzipMTime": 0,
        "byteExactDecodeVerified": True,
        "sourceHashGuardPassedBeforeArchival": True,
        "entries": entries,
    }
    (ROOT / index_relative).write_text(json.dumps(index, indent=2) + "\n")
    report["rawArchiveIndex"] = index_relative
    report["rawEvidence"] = [{
        "archivePath": e["archivePath"],
        "decodedRawSHA256": e["decodedRawSHA256"],
        "decodedRawBytes": e["decodedRawBytes"],
        "archiveSHA256": e["archiveSHA256"],
    } for e in entries]
    REPORT.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"index": index_relative, "entries": entries}))


if __name__ == "__main__":
    main()
