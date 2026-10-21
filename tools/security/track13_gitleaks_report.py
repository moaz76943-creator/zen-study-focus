#!/usr/bin/env python3
"""Fail-closed, redacted Gitleaks evidence for a single exact source SHA.

Never print Match, Secret, Entropy, raw file names, snippets or scanner output.
The raw JSON report must remain runner-local and be removed by the caller.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path


def safe_summary(path: Path, sha: str, scan_exit: int) -> dict:
    summary = {'sha': sha, 'status': 'BLOCKED', 'findings': None, 'evidence': []}
    if not re.fullmatch(r'[0-9a-f]{40}', sha):
        summary['reason'] = 'INVALID_SHA'
        return summary
    try:
        report = json.loads(path.read_text(encoding='utf-8'))
        if not isinstance(report, list):
            raise ValueError('Unexpected report container')
        summary['findings'] = len(report)
        for item in report[:25]:
            if not isinstance(item, dict):
                raise ValueError('Unexpected finding record')
            rule = item.get('RuleID', '')
            if not isinstance(rule, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,64}', rule):
                rule = 'unknown'
            file_path = item.get('File', '')
            if not isinstance(file_path, str):
                file_path = ''
            line = item.get('StartLine', 0)
            if type(line) is not int or not 0 <= line <= 100000000:
                line = 0
            summary['evidence'].append({
                'rule': rule,
                'path_sha256_16': hashlib.sha256(file_path.encode('utf-8')).hexdigest()[:16],
                'line': line,
            })
    except (OSError, ValueError, UnicodeError, json.JSONDecodeError):
        summary['reason'] = 'REPORT_UNAVAILABLE_OR_INVALID'
        return summary
    if scan_exit != 0:
        summary['reason'] = 'POTENTIAL_FINDINGS' if summary['findings'] else 'SCANNER_FAILED'
    elif summary['findings']:
        summary['reason'] = 'RESULT_CONFLICT'
    else:
        summary['status'] = 'PASS'
        summary['reason'] = 'ZERO_FINDINGS'
    return summary


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument('--report', type=Path, required=True)
    p.add_argument('--sha', required=True)
    p.add_argument('--scan-exit', type=int, required=True)
    args = p.parse_args()
    summary = safe_summary(args.report, args.sha, args.scan_exit)
    print(json.dumps(summary, sort_keys=True, separators=(',', ':')))
    return 0 if summary['status'] == 'PASS' else 1


if __name__ == '__main__':
    raise SystemExit(main())
