"""Deterministic, isolated fixture records. No automatic Android insertion.

These are generated outside the application store and have no performance claims.
A native/SAF import pathway must be supplied and independently validated by lane A
before any 1k/5k/10k load test is considered executed.
"""
import json
from pathlib import Path

LIMITS = {"task": 1000, "note": 5000, "session": 10000}
PREFIX = "DF13C_TEST_ONLY_"


def records(kind, count):
    if kind not in LIMITS or not isinstance(count, int) or count < 0 or count > LIMITS[kind]:
        raise ValueError("invalid synthetic fixture kind/count")
    for n in range(count):
        record_id = f"{PREFIX}{kind.upper()}_{n:05d}"
        if kind == "task":
            yield {"id": record_id, "synthetic": True, "title": f"DF13C task {n:05d}",
                   "date": "2026-10-26", "catKey": "study", "done": n % 5 == 0}
        elif kind == "note":
            yield {"id": record_id, "synthetic": True, "title": f"DF13C note {n:05d}",
                   "body": f"Generated test-only note body {n:05d}",
                   "catKey": "quick", "calDate": "2026-10-26"}
        else:
            yield {"id": record_id, "synthetic": True, "domain": "study",
                   "date": "2026-10-26", "durationSeconds": 60 + n % 120,
                   "completed": True}


def fixture_summary():
    return {"counts": LIMITS.copy(), "performance_status": "NOT_TESTED",
            "reason": "Synthetic records generated only; no validated app import or device benchmarks"}


def write_jsonl(directory: Path):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    manifests = {}
    for kind, count in LIMITS.items():
        output = directory / f"{kind}s.synthetic.jsonl"
        with output.open("w", encoding="utf-8") as dest:
            for record in records(kind, count):
                dest.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
        manifests[kind] = {"count": count, "file": output.name, "test_only": True}
    (directory / "MANIFEST.json").write_text(json.dumps(
        {"fixtures": manifests, **fixture_summary()}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8")
    return manifests


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(write_jsonl(args.output), indent=2))
