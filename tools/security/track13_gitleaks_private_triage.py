#!/usr/bin/env python3
"""Private runner-local Gitleaks candidate classification. Never authorizes PASS.

Raw reports may contain credentials. Only fixed aggregate labels are printed.
Every detection still requires review and the primary scanner remains fail-closed.
"""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

SHA = re.compile(r"[a-f0-9]{40}\Z")
MAX_BYTES = 8 * 1024 * 1024
CATEGORIES = (
    "compatibility_salt_candidate",
    "storage_key_candidate",
    "git_commit_reference_candidate",
    "corruption_fixture_candidate",
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


def source_context(repo: Path, row: dict) -> str:
    """Read a bounded source line from the current tree or the scan's own commit.

    File and commit are untrusted report metadata. Never print them or pass
    arbitrary paths to a shell. A source match is only a review candidate.
    """
    raw_path = row.get("File")
    line = row.get("StartLine")
    if not isinstance(raw_path, str) or type(line) is not int or not (1 <= line <= 1000000):
        return ""
    relative = raw_path.removeprefix("./")
    parts = relative.split("/")
    if (not relative or relative.startswith("/") or "\\" in relative or
            "\x00" in relative or any(part in ("", ".", "..") for part in parts)):
        return ""
    try:
        commit = row.get("Commit")
        if isinstance(commit, str) and SHA.fullmatch(commit):
            target = f"{commit}:{relative}"
            result = subprocess.run(
                ["git", "-C", str(repo), "show", target],
                stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL, timeout=5, check=False,
            )
            if result.returncode != 0 or len(result.stdout) > 5 * 1024 * 1024:
                return ""
            content = result.stdout.decode("utf-8")
        else:
            root = repo.resolve()
            path = (root / relative).resolve()
            if not path.is_relative_to(root) or not path.is_file() or path.stat().st_size > 5 * 1024 * 1024:
                return ""
            content = path.read_text(encoding="utf-8")
        lines = content.splitlines()
        return lines[line - 1] if line <= len(lines) and len(lines[line - 1]) <= 2048 else ""
    except (OSError, UnicodeError, ValueError, subprocess.TimeoutExpired):
        return ""


def source_context_candidate(repo: Path, row: dict) -> str:
    line = source_context(repo, row)
    if not line:
        return "unresolved"
    if SALT_DECLARATION.fullmatch(line):
        return "compatibility_salt_candidate"
    # Reviewed negative-test marker, never a service credential. Bind both the
    # exact repository path and exact statement; do not exempt arbitrary tests.
    if (row.get("File", "").removeprefix("./") == "tests/android_e2e_recovery/native_faults.cjs"
            and line.strip() == "localStorage.setItem(key,'DF07_CORRUPT_PRIMARY');"):
        return "corruption_fixture_candidate"
    for name in STORAGE_IDENTIFIERS:
        if ("'" + name + "'" in line) or ('"' + name + '"' in line):
            return "storage_key_candidate"
    for value in re.findall(r"(?<![0-9a-f])[a-f0-9]{40}(?![0-9a-f])", line):
        if is_existing_commit(repo, value):
            return "git_commit_reference_candidate"
    return "unresolved"


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
        unresolved_evidence = []
        review_paths = set()  # Public candidate locations only, never credential values.
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
                category = source_context_candidate(repo, row) if row.get("RuleID") == "generic-api-key" else "unresolved"
            counts[category] += 1
            if category == "storage_key_candidate":
                candidate = row.get("File")
                if isinstance(candidate, str):
                    candidate = candidate.removeprefix("./")
                    # Public repository code paths only. Never print arbitrary
                    # scanner-controlled file names or credential-bearing text.
                    if (len(candidate) <= 240 and not any(part in ("", ".", "..") for part in candidate.split("/"))
                            and re.fullmatch(r"(?:tests|test|android|assets|docs|tools)/(?:[A-Za-z0-9_.-]+/)*[A-Za-z0-9_.-]+", candidate)):
                        review_paths.add(candidate)
            if category == "unresolved" and len(unresolved_evidence) < 8:
                raw_path = row.get("File")
                raw_path = raw_path if isinstance(raw_path, str) and len(raw_path) <= 8192 else ""
                commit = row.get("Commit")
                commit = commit if isinstance(commit, str) and SHA.fullmatch(commit) else ""
                line = row.get("StartLine")
                line = line if type(line) is int and 0 <= line <= 100000000 else 0
                unresolved_evidence.append({
                    "path_sha256_16": hashlib.sha256(raw_path.encode("utf-8")).hexdigest()[:16] if raw_path else "",
                    "commit_sha256_16": hashlib.sha256(commit.encode("ascii")).hexdigest()[:16] if commit else "",
                    "line": line,
                    "has_source_context": bool(source_context(repo, row)),
                })
        return {"sha": sha, "status": "REVIEW_REQUIRED" if rows else "NO_FINDINGS",
                "findings": len(rows), "categories": counts,
                "review_paths": sorted(review_paths)[:8],
                "unresolved_evidence": unresolved_evidence}
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
