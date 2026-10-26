#!/usr/bin/env python3
"""Summarize CodeQL SARIF without disclosing paths, messages, snippets or findings."""
import argparse
import json
import re
from pathlib import Path

SHA = re.compile(r"[a-f0-9]{40}\Z")
MAX_BYTES = 32 * 1024 * 1024
SAFE_CODEQL_RULE = re.compile(r"js/[a-z0-9-]{1,64}\Z")
MAX_RULE_GROUPS = 24


def summarize(directory: Path, sha: str) -> dict:
    is_sha = bool(SHA.fullmatch(sha))
    output = {"sha": sha if is_sha else "", "status": "BLOCKED", "reason": "INVALID_SHA" if not is_sha else "SARIF_UNAVAILABLE", "findings": None}
    if not is_sha:
        return output
    try:
        paths = sorted(p for p in directory.rglob("*.sarif") if p.is_file() and not p.is_symlink())
        if not paths:
            return output
        count = 0
        rule_counts = {}
        for path in paths:
            if path.stat().st_size > MAX_BYTES:
                output["reason"] = "SARIF_INVALID"
                return output
            report = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(report, dict) or report.get("version") != "2.1.0":
                output["reason"] = "SARIF_INVALID"
                return output
            runs = report.get("runs")
            if not isinstance(runs, list) or not runs:
                output["reason"] = "SARIF_INVALID"
                return output
            for run in runs:
                if not isinstance(run, dict) or not isinstance(run.get("tool"), dict) or not isinstance(run["tool"].get("driver"), dict) or run["tool"]["driver"].get("name") != "CodeQL" or not isinstance(run.get("results"), list):
                    output["reason"] = "SARIF_INVALID"
                    return output
                if any(not isinstance(item, dict) for item in run["results"]):
                    output["reason"] = "SARIF_INVALID"
                    return output
                count += len(run["results"])
                for item in run["results"]:
                    raw_rule = item.get("ruleId")
                    rule = raw_rule if isinstance(raw_rule, str) and SAFE_CODEQL_RULE.fullmatch(raw_rule) else "unknown"
                    if rule not in rule_counts and len(rule_counts) >= MAX_RULE_GROUPS:
                        rule = "unknown"
                    rule_counts[rule] = rule_counts.get(rule, 0) + 1
    except (OSError, UnicodeError, ValueError, json.JSONDecodeError, RecursionError):
        output["reason"] = "SARIF_INVALID"
        return output
    output.update(findings=count, status="PASS" if count == 0 else "FAIL", reason="ZERO_FINDINGS" if count == 0 else "CODEQL_FINDINGS", rule_counts=dict(sorted(rule_counts.items())))
    return output


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--directory", type=Path, required=True)
    p.add_argument("--sha", required=True)
    args = p.parse_args()
    result = summarize(args.directory, args.sha)
    print(json.dumps(result, sort_keys=True, separators=(",", ":")))
    return 0 if result["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
