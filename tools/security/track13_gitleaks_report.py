#!/usr/bin/env python3
"""Emit bounded, redacted Gitleaks metadata; fail closed on any missing evidence.

Reports contain potential secrets. Caller must keep them runner-local and delete them.
No untrusted report text, scanner diagnostic, raw path or matched value is emitted.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

SHA = re.compile(r"[0-9a-f]{40}\Z")
SAFE_RULES = frozenset({"generic-api-key", "aws-access-token", "github-pat", "github-fine-grained-pat", "private-key", "jwt"})
MAX_BYTES = 8 * 1024 * 1024


def safe_summary(path: Path, source_sha: str, scan_exit: int) -> dict:
    valid_sha = bool(SHA.fullmatch(source_sha))
    summary = {
        "sha": source_sha if valid_sha else "",
        "status": "BLOCKED",
        "reason": "INVALID_SHA" if not valid_sha else "REPORT_UNAVAILABLE",
        "findings": None,
        "evidence": [],
    }
    if not valid_sha:
        return summary
    try:
        if not path.is_file() or path.stat().st_size > MAX_BYTES:
            return summary
        report = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(report, list) or any(not isinstance(row, dict) for row in report):
            summary["reason"] = "REPORT_INVALID"
            return summary
        summary["findings"] = len(report)
        summary["rule_counts"] = {}
        source_fingerprints = set()
        history_commits = set()
        for index, item in enumerate(report):
            rule_id = item.get("RuleID")
            if not isinstance(rule_id, str) or rule_id not in SAFE_RULES:
                rule_id = "unknown"
            summary["rule_counts"][rule_id] = summary["rule_counts"].get(rule_id, 0) + 1
            raw_path = item.get("File")
            raw_path = raw_path if isinstance(raw_path, str) else ""
            if raw_path:
                source_fingerprints.add(hashlib.sha256(raw_path.encode("utf-8")).digest())
            commit = item.get("Commit")
            if isinstance(commit, str) and SHA.fullmatch(commit):
                history_commits.add(commit)
            # Keep per-finding evidence bounded, but account for ALL detections.
            if index >= 25:
                continue
            line = item.get("StartLine")
            line = line if type(line) is int and 0 <= line <= 100000000 else 0
            entry = {
                "rule": rule_id,
                "path_sha256_16": hashlib.sha256(raw_path.encode("utf-8")).hexdigest()[:16],
                "line": line,
            }
            if isinstance(commit, str) and SHA.fullmatch(commit):
                entry["commit_sha256_16"] = hashlib.sha256(commit.encode("ascii")).hexdigest()[:16]
            summary["evidence"].append(entry)
        summary["distinct_source_files"] = len(source_fingerprints)
        summary["distinct_history_commits"] = len(history_commits)
    except (OSError, UnicodeError, json.JSONDecodeError, ValueError, RecursionError):
        summary["reason"] = "REPORT_INVALID"
        return summary
    if scan_exit == 0 and not report:
        summary.update(status="PASS", reason="ZERO_FINDINGS")
    elif scan_exit == 1 and report:
        summary.update(status="FAIL", reason="POTENTIAL_FINDINGS")
    elif scan_exit not in (0, 1):
        summary["reason"] = "SCANNER_FAILURE"
    else:
        summary["reason"] = "SCANNER_REPORT_CONFLICT"
    return summary


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--sha", required=True)
    parser.add_argument("--scan-exit", type=int, required=True)
    args = parser.parse_args()
    result = safe_summary(args.report, args.sha, args.scan_exit)
    print(json.dumps(result, sort_keys=True, separators=(",", ":")))
    return 0 if result["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
