#!/usr/bin/env bash
set -Eeuo pipefail

REPO='moaz76943-creator/zen-study-focus'
TARGET='integration/master-qa-verified-v21'
WORKFLOW='.github/workflows/auto_release_build.yml'
APP_JS='android/app/src/main/assets/web/app.js'
BUILD_GRADLE='android/app/build.gradle'

log()  { printf '\n[DF] %s\n' "$*"; }
warn() { printf '[WARN] %s\n' "$*"; }
stop() { printf '[STOP] %s\n' "$*" >&2; exit 1; }

echo "===================================================="
echo " DEEP FOCUS — FAST MERGE & CI BOTTLENECK REMOVAL"
echo " PRs: #516 + #518"
echo " Official: $TARGET"
echo " Gemini changes: PRESERVE"
echo "===================================================="

command -v gh >/dev/null 2>&1 ||
    stop 'GitHub CLI missing. Run: pkg install gh -y'

command -v python3 >/dev/null 2>&1 ||
    stop 'Python missing. Run: pkg install python -y'

gh auth status >/dev/null 2>&1 ||
    stop 'GitHub login required. Run: gh auth login'

# Temporary evidence only.
# Never reset, checkout, stash, clean or force-push user files.
TMP="$(mktemp -d "${TMPDIR:-/tmp}/deep-focus-fastmerge.XXXXXX")"
trap 'rm -rf -- "$TMP"' EXIT

api() {
    local endpoint="$1"
    shift
    gh api "repos/$REPO/$endpoint" "$@"
}

base_sha() {
    api "git/ref/heads/$TARGET" --jq '.object.sha'
}

pr_sha() {
    api "pulls/$1" --jq '.head.sha'
}

pr_state() {
    api "pulls/$1" --jq '.state'
}

# ==================================================
# 1. SAVE EXACT OFFICIAL REFERENCE
# ==================================================

log 'Reading latest official HEAD'

BASE_BEFORE="$(base_sha)"
echo "OFFICIAL_HEAD=$BASE_BEFORE"

api "contents/$APP_JS?ref=$TARGET" \
    > "$TMP/app_before.json"

api "contents/$BUILD_GRADLE?ref=$TARGET" \
    > "$TMP/build_before.json"

# ==================================================
# 2. REMOVE BROKEN REPEATED RELEASE BUILDS
# ==================================================

log 'Repairing automatic Release build bottleneck'

api "contents/$WORKFLOW?ref=$TARGET" \
    > "$TMP/workflow.json"

set +e

python3 - "$TMP/workflow.json" \
    "$TMP/workflow_update.json" "$TARGET" <<'PY'

import base64
import json
import pathlib
import sys

src = json.loads(
    pathlib.Path(sys.argv[1]).read_text()
)

content = base64.b64decode(
    src['content']
).decode('utf-8')

original = content

old_trigger = (
    "on:\n"
    "  push:\n"
    "    tags:\n"
    "      - 'v*'\n"
    "  workflow_dispatch:"
)

if old_trigger in content:
    content = content.replace(
        old_trigger,
        "on:\n  workflow_dispatch:",
        1
    )
elif "on:\n  workflow_dispatch:" not in content:
    print('[WARN] Unknown release trigger')
    sys.exit(3)

old_step = (
    "      - name: Grant Execute Permission for Gradlew\n"
    "        run: chmod +x android/gradlew\n\n"
)

if old_step in content:
    content = content.replace(old_step, '', 1)

if 'gradle/actions/setup-gradle@v4' not in content:
    anchor = "          java-version: '17'\n"

    if anchor not in content:
        print('[WARN] Unexpected Java setup')
        sys.exit(3)

    setup = (
        "\n"
        "      - name: Configure Gradle\n"
        "        uses: gradle/actions/setup-gradle@v4\n"
        "        with:\n"
        "          gradle-version: '8.11.1'\n"
    )

    content = content.replace(
        anchor, anchor + setup, 1
    )

content = content.replace(
    './gradlew clean bundleRelease --stacktrace',
    'gradle :app:bundleRelease --no-daemon --stacktrace'
)

content = content.replace(
    './gradlew assembleDebug --stacktrace',
    'gradle :app:assembleDebug --no-daemon --stacktrace'
)

if 'android/gradlew' in content or 'push:\n    tags:' in content:
    print('[WARN] Unexpected legacy build content')
    sys.exit(3)

if content == original:
    print('[INFO] Release workflow already optimized')
    sys.exit(2)

payload = {
    'message': (
        'ci(release): manual-only builds; '
        'fix missing Gradle wrapper'
    ),
    'branch': sys.argv[3],
    'sha': src['sha'],
    'content': base64.b64encode(
        content.encode('utf-8')
    ).decode('ascii')
}

pathlib.Path(sys.argv[2]).write_text(
    json.dumps(payload)
)

print('[PASS] Release workflow fix prepared')
PY

PATCH_STATUS=$?
set -e

if [[ "$PATCH_STATUS" -eq 0 ]]; then
    if gh api -X PUT \
        "repos/$REPO/contents/$WORKFLOW" \
        --input "$TMP/workflow_update.json" \
        > "$TMP/ci_result.json"; then

        log 'Release workflow repaired successfully'
    else
        warn 'Workflow update rejected by GitHub; no bypass'
    fi

elif [[ "$PATCH_STATUS" -eq 2 ]]; then
    log 'Release workflow already optimized'
else
    warn 'Unknown workflow layout: safely skipped'
fi

# ==================================================
# 3. SYNCHRONIZE PR #516 AND #518 WITH GEMINI
# ==================================================

for PR in 516 518; do

    log "Processing PR #$PR"

    STATE="$(pr_state "$PR")" || {
        warn "Cannot read PR #$PR"
        continue
    }

    if [[ "$STATE" != 'open' ]]; then
        log "PR #$PR already closed"
        continue
    fi

    HEAD_BEFORE="$(pr_sha "$PR")"
    BASE_NOW="$(base_sha)"

    BEHIND="$(
        api "compare/$BASE_NOW...$HEAD_BEFORE" \
            --jq '.behind_by' 2>/dev/null ||
        printf 'unknown'
    )"

    if [[ "$BEHIND" =~ ^[0-9]+$ && "$BEHIND" -gt 0 ]]; then

        log "PR #$PR behind official by $BEHIND commits"

        echo "[SYNC] Merging latest Gemini changes into PR"

        if ! gh pr update-branch "$PR" \
            --repo "$REPO"; then

            warn "PR #$PR synchronization blocked"
            warn "No force push or destructive reset"
            continue
        fi

    elif [[ "$BEHIND" == 'unknown' ]]; then
        warn "Cannot verify branch ancestry"
        continue
    fi

    CURRENT_HEAD="$(pr_sha "$PR")"

    echo "PR_HEAD=$CURRENT_HEAD"

    # ==================================================
    # 4. MINIMUM ESSENTIAL MERGE CHECKS
    # ==================================================

    if ! api \
        "actions/runs?head_sha=$CURRENT_HEAD&per_page=100" \
        > "$TMP/runs_$PR.json"; then

        warn 'Cannot read exact-head CI evidence'
        continue
    fi

    set +e

    python3 - "$TMP/runs_$PR.json" "$PR" <<'PY'

import json
import sys

pr = int(sys.argv[2])

with open(sys.argv[1]) as f:
    runs = json.load(f).get('workflow_runs', [])

common = [
    'Deep Focus Track 13 Exact-SHA CodeQL',
    'Deep Focus Track 13 Exact-SHA Gitleaks',
    'Deep Focus critical integration source regressions',
    'P0 immutable Android package identity'
]

focused = {
    516: [
        'Track05 Timer Lifecycle RED GREEN',
        'DF Parallel01 native dialog Android device QA (non-release)'
    ],
    518: [
        'DF-FINAL-03 real Android Tasks WebView persistence',
        'DF08 actual Android WebView touch and IME acceptance',
        'DF Parallel01 native dialog Android device QA (non-release)'
    ]
}

blocked = []

for name in common + focused[pr]:
    matches = [
        r for r in runs
        if r.get('name') == name
    ]

    if not matches:
        print('[PENDING]', name)
        blocked.append(name)
        continue

    r = sorted(
        matches,
        key=lambda x: x.get('created_at', ''),
        reverse=True
    )[0]

    outcome = (
        r.get('conclusion')
        if r.get('status') == 'completed'
        else 'PENDING'
    )

    print('[CHECK]', name, ':', outcome)

    if outcome != 'success':
        blocked.append(name)

if blocked:
    print(
        '[BLOCKED] Essential unfinished checks:',
        len(blocked)
    )
    sys.exit(2)

print('[PASS] Essential checks complete')
PY

    GATE=$?
    set -e

    if [[ "$GATE" -ne 0 ]]; then
        warn "PR #$PR not merged: essential checks pending/failed"
        warn "No fake PASS, no extra tests launched"
        continue
    fi

    # ==================================================
    # 5. MERGE THROUGH GITHUB
    # ==================================================

    if [[ "$(pr_sha "$PR")" != "$CURRENT_HEAD" ]]; then
        warn "PR #$PR updated concurrently; no stale merge"
        continue
    fi

    log "Submitting PR #$PR for protected automatic merge"

    if gh pr merge "$PR" \
        --repo "$REPO" \
        --auto \
        --merge \
        --match-head-commit "$CURRENT_HEAD"; then

        echo "[PASS] GitHub accepted merge/auto-merge request"

    else
        warn "GitHub still blocks PR #$PR"
        warn "Required checks and permissions were not bypassed"
    fi

done

# ==================================================
# 6. VERIFY GEMINI CHANGES WERE PRESERVED
# ==================================================

log 'Checking Gemini milestones and versionCode'

api "contents/$APP_JS?ref=$TARGET" \
    > "$TMP/app_after.json"

api "contents/$BUILD_GRADLE?ref=$TARGET" \
    > "$TMP/build_after.json"

python3 - \
    "$TMP/app_before.json" \
    "$TMP/app_after.json" \
    "$TMP/build_before.json" \
    "$TMP/build_after.json" <<'PY'

import base64
import json
import pathlib
import re
import sys

def read(index):
    data = json.loads(
        pathlib.Path(sys.argv[index]).read_text()
    )
    return base64.b64decode(
        data['content']
    ).decode('utf-8')

before_app = read(1)
after_app = read(2)
before_build = read(3)
after_build = read(4)

def markers(text):
    return set(
        re.findall(r'/\*\s*===\s*(M\d{3})_', text)
    )

missing = sorted(
    markers(before_app) - markers(after_app)
)

def version_code(text):
    return int(
        re.search(
            r'\bversionCode\s+(\d+)', text
        ).group(1)
    )

old_version = version_code(before_build)
new_version = version_code(after_build)

print('[GEMINI] Previous milestones:', len(markers(before_app)))
print('[GEMINI] Current milestones:', len(markers(after_app)))
print('[GEMINI] Missing milestones:', missing)
print('[VERSION] Before:', old_version)
print('[VERSION] After:', new_version)

if missing or new_version < old_version:
    print('[ALERT] Possible regression: inspect GitHub HEAD')
    print('[SAFE] No automatic rollback performed')
    sys.exit(4)

print('[PASS] Gemini milestones preserved')
print('[PASS] VersionCode not decreased')
PY

# ==================================================
# 7. FINAL REPORT
# ==================================================

echo
echo "===================================================="
echo " DEEP FOCUS — FAST MERGE REPORT"
echo "===================================================="

echo "OFFICIAL_BRANCH=$TARGET"
echo "OFFICIAL_HEAD=$(base_sha)"

for PR in 516 518; do
    echo
    echo "PR=$PR"

    gh pr view "$PR" \
        --repo "$REPO" \
        --json state,mergedAt,headRefOid \
        --jq '"state=\(.state) mergedAt=\(.mergedAt // "pending") head=\(.headRefOid)"' \
        2>/dev/null || true
done

echo
echo "LOCAL_FILES=UNTOUCHED"
echo "TERMUX_SESSIONS=UNTOUCHED"
echo "FORCE_PUSH=NO"
echo "BRANCH_PROTECTION_BYPASS=NO"
echo "GEMINI_MILESTONES=CHECKED"
echo "===================================================="

log 'Execution finished'
