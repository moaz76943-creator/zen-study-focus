#!/usr/bin/env python3
"""Private runner-local Gitleaks candidate classification. Never authorizes PASS.

Raw reports may contain credentials. Only fixed aggregate labels are printed.
Every detection still requires review and the primary scanner remains fail-closed.
"""
import argparse
import json
import re
import subprocess
from pathlib import Path

SHA = re.compile(r"[a-f0-9]{40}\\Z")
MAX_BYTES = 8 * 1024 * 1024
CATEGORIES = (
    "compatibility_salt_candidate",
    "storage_key_candidate",
    "git_commit_reference_candidate",
    "unresolved",
)
# Immutable v21 *local storage identifiers*, not credentials.
STORAGE_IDENTIFIERS = frozenset({
    "zen_fortress_cfg_v21", "zen_fortress_tasks_v21", "zen_fortress_notes_v21",
    "zen_fortress_cfg_v21_mirror", "zen_fortress_tasks_v21_mirror",
    "zen_fortress_notes_v21_mirror",
})
PUBLIC_SALT_SOURCE_PATHS = (
    "android/app/src/main/assets/web/app.js",
    "android/app/src/main/assets/web/data_compat_v21.js",
    "android/app/src/main/assets/web/app.js.bak",
)
SALT_DECLARATION = re.compile(r"""^\s*const SECRET_SALT\s*=\s*(['"])([^\r\n'"]{1,256})\1\s*;""", re.MULTILINE)


def compatibility_constants(repo: Path) -> set:
    """Read only known public JS compatibility declarations; never print them."""
    values = set()
    for relative in PUBLIC_SALT_SOURCE_PATHS:
        try:
            path = repo / relative
            if path.is_file() and not path.is_symlink() and path.stat().st_size < 5 * 1024 * 1024:
                for match in SALT_DECLARATION.finditer(path.read_text(encoding="utf-8")):
                    values.add(match.group(2))
        except (OSError, UnicodeError):
            # An unreadable source must not create an automatic classification.
            continue
    return values


def is_existing_commit(repo: Path, value: str) -> bool:
    if not SHA.fullmatch(value):
        return False
    try:
        check = subprocess.run(
            ["git", "-C", str(repo), "cat-file", "-t", value],
            stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL, timeout=3, check=False,
        )
        return check.returncode == 0 and check.stdout.strip() == b"commit"
    except (OSError, subprocess.TimeoutExpired):
        return False


def triage(report_path: Path, repo: Path, sha: str) -> dict:
    blocked = {"sha": sha if SHA.fullmatch(sha) else "",
               "status": "BLOCKED", "findings": None,
               "categories": {key: 0 for key in CATEGORIES}}
    if not SHA.fullmatch(sha) or not repo.is_dir():
        return blocked
    try:
        if not report_path.is_file() or report_path.is_symlink() or report_path.stat().st_size > MAX_BYTES:
            return blocked
        rows = json.loads(report_path.read_text(encoding="utf-8"))
        if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
            return blocked
        counts = {key: 0 for key in CATEGORIES}
        public_constants = compatibility_constants(repo)
        for row in rows:
            secret = row.get("Secret")
            if row.get("RuleID") != "generic-api-key" or not isinstance(secret, str) or not secret:
                category = "unresolved"
            elif secret in STORAGE_IDENTIFIERS:
                category = "storage_key_candidate"
            elif secret in public_constants:
                category = "compatibility_salt_candidate"
            elif is_existing_commit(repo, secret):
                category = "git_commit_reference_candidate"
            else:
                category = "unresolved"
            counts[category] += 1
        return {"sha": sha, "status": "REVIEW_REQUIRED" if rows else "NO_FINDINGS",
                "findings": len(rows), "categories": counts}
    except (OSError, UnicodeError, ValueError, RecursionError):
        return blocked


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", required=True, type=Path)
    parser.add_argument("--repo", required=True, type=Path)
    parser.add_argument("--sha", required=True)
    args = parser.parse_args()
    try:
        result = triage(args.report, args.repo, args.sha)
    except Exception:
        # No tracebacks, paths, snippets, or matched credential values in logs.
        result = {"sha": "", "status": "BLOCKED", "findings": None,
                  "categories": {key: 0 for key in CATEGORIES}}
    print(json.dumps(result, sort_keys=True, separators=(",", ":")))
    return {"NO_FINDINGS": 0, "REVIEW_REQUIRED": 1}.get(result["status"], 2)


if __name__ == "__main__":
    raise SystemExit(main())
