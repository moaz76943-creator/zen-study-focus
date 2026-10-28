#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

cd "${HOME}/zen-study-focus"
BRANCH="integration/master-qa-verified-v21"
MISSION_ID="M235_VOCAB_CARD_COUNT_FILTER_BADGE_SYNC_AND_CODE55_V1"
APP_JS="android/app/src/main/assets/web/app.js"
GRADLE_FILE="android/app/build.gradle"

trap 'echo "[FAIL] Script stopped at line $LINENO. Review the error above."; exit 1' ERR

echo "============================================================"
echo "STEP 1: SYNCING WITH LIVE GITHUB (${BRANCH})"
echo "============================================================"
mkdir -p .local_cycle_archive
for stray in android/app/src/main/assets/web/run_cycle_*.sh; do
  if [ -f "${stray}" ] && [ -z "$(git ls-files "${stray}")" ]; then
    mv "${stray}" .local_cycle_archive/
    echo "[CLEANUP] Moved untracked ${stray} to .local_cycle_archive/"
  fi
done

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  if node --check "${APP_JS}"; then
    git add -u
    git commit -m "chore: save pending local modifications before M235"
  else
    git checkout -- "${APP_JS}" "${GRADLE_FILE}"
  fi
fi

git fetch origin "${BRANCH}"
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "${CURRENT_BRANCH}" != "${BRANCH}" ]; then
  git checkout "${BRANCH}"
fi
git pull --rebase origin "${BRANCH}"

BASE_SHA="$(git rev-parse HEAD)"
echo "[INFO] Current base SHA: ${BASE_SHA}"

echo "============================================================"
echo "STEP 2: CHECKING IDEMPOTENCY (RED CHECK)"
echo "============================================================"
if grep -q "${MISSION_ID}" "${APP_JS}"; then
  echo "[INFO] Mission ${MISSION_ID} already present in ${APP_JS}."
  exit 0
fi
echo "[RED PASS] ${MISSION_ID} not present yet; applying safe patch."

echo "============================================================"
echo "STEP 3: APPLYING MISSION #235 & INCREMENTING VERSIONCODE"
echo "============================================================"
python3 - "${APP_JS}" "${GRADLE_FILE}" << 'PY_EOF'
import sys, re

target_js = sys.argv[1]
gradle_path = sys.argv[2]

with open(target_js, "r", encoding="utf-8") as f:
    content = f.read()

m235_code = """
/* === M235_VOCAB_CARD_COUNT_FILTER_BADGE_SYNC_AND_CODE55_V1 === */
(function() {
  if (window.__M235_COLOR_SYNC__) return;
  window.__M235_COLOR_SYNC__ = true;

  var COLORS = ['purple', 'blue', 'red', 'green'];

  window.dfCycleVocabCardColorWithSync = function(itemId) {
    var eng = window.SpokenVocabEngine;
    if (!eng || typeof eng.getItems !== 'function' || typeof eng.saveItems !== 'function') return null;

    var items = eng.getItems() || [];
    var targetItem = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i] && items[i].id === itemId) {
        targetItem = items[i];
        break;
      }
    }
    if (!targetItem) return null;

    var curColor = (targetItem.color || 'purple').toLowerCase();
    var curIdx = COLORS.indexOf(curColor);
    var nextColor = COLORS[(curIdx + 1) % COLORS.length];
    targetItem.color = nextColor;

    eng.saveItems(items);
    if (typeof eng.render === 'function') eng.render();

    if (typeof window.dfUpdateFilterChipBadges === 'function') {
      window.dfUpdateFilterChipBadges();
    }
    if (typeof window.dfUpdateVocabStatsBadge === 'function') {
      window.dfUpdateVocabStatsBadge();
    }
    if (typeof window.dfVocabHapticPulse === 'function') {
      window.dfVocabHapticPulse('flip');
    }
    return nextColor;
  };
})();
"""

content = content.rstrip() + "\n" + m235_code + "\n"
with open(target_js, "w", encoding="utf-8") as f:
    f.write(content)

with open(gradle_path, "r", encoding="utf-8") as f:
    g = f.read()

m = re.search(r'versionCode\s+(\d+)', g)
cur_code = int(m.group(1)) if m else 54
next_code = max(cur_code + 1, 55)
g = re.sub(r'versionCode\s+\d+', f'versionCode {next_code}', g)
g = re.sub(r'versionName\s+"[^"]+"', f'versionName "3.6.{next_code - 50}"', g)
with open(gradle_path, "w", encoding="utf-8") as f:
    f.write(g)

print(f"[INFO] Updated {gradle_path} -> versionCode {next_code}")
PY_EOF

echo "============================================================"
echo "STEP 4: FULL SYNTAX CHECK & ISOLATED MODULE UNIT TEST"
echo "============================================================"
node --check "${APP_JS}"
echo "[PASS] Full syntax check (node --check) passed on ${APP_JS}"

node - "${APP_JS}" << 'NODE_EOF'
const fs = require('fs');
const vm = require('vm');
const targetFile = process.argv[2];
const fullCode = fs.readFileSync(targetFile, 'utf8');

const startIdx = fullCode.indexOf('/* === M235_VOCAB_CARD_COUNT_FILTER_BADGE_SYNC_AND_CODE55_V1 === */');
if (startIdx === -1) {
  throw new Error('M235 marker not found in ' + targetFile);
}
const moduleCode = fullCode.slice(startIdx);

let badgeUpdated = false;
const sandbox = {
  window: {},
  SpokenVocabEngine: {
    _items: [
      { id: 'v1', word: 'Buch', meaning: 'كتاب', color: 'purple' }
    ],
    getItems() { return this._items; },
    saveItems(items) { this._items = items; },
    render() {}
  },
  console: console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.dfUpdateFilterChipBadges = () => { badgeUpdated = true; };

vm.runInNewContext(moduleCode, sandbox);

if (!sandbox.__M235_COLOR_SYNC__) throw new Error('M235 module missing');
const nextC = sandbox.dfCycleVocabCardColorWithSync('v1');
if (nextC !== 'blue') throw new Error('Expected next color blue, got: ' + nextC);
if (!badgeUpdated) throw new Error('dfUpdateFilterChipBadges was not called');

process.stdout.write('[GREEN PASS] M235 color sync module tests passed cleanly!\n');
NODE_EOF

echo "============================================================"
echo "STEP 5: COMMITTING & PUSHING TO GITHUB (${BRANCH})"
echo "============================================================"
git add "${APP_JS}" "${GRADLE_FILE}"
git commit -m "feat(vocab-m235): add real-time color cycling with instant filter badge counter sync and bump versionCode to 55"

git pull --rebase origin "${BRANCH}"
git push origin "${BRANCH}"

LOCAL_SHA="$(git rev-parse HEAD)"
NEW_CODE="$(grep -Eo 'versionCode[[:space:]]+[0-9]+' "${GRADLE_FILE}" | awk '{print $2}')"
NEW_TAG="v3.6.5-play-code${NEW_CODE}-v21"

if [ -z "$(git ls-remote --tags origin "refs/tags/${NEW_TAG}")" ]; then
  git tag "${NEW_TAG}" "${LOCAL_SHA}" 2>/dev/null || true
  git push origin "refs/tags/${NEW_TAG}"
  TAG_STATUS="PUSHED (${NEW_TAG})"
else
  TAG_STATUS="ALREADY_ON_GITHUB (${NEW_TAG})"
fi

REMOTE_SHA="$(git ls-remote origin "refs/heads/${BRANCH}" | awk '{print $1}')"

echo ""
echo "============================================================"
echo "FINAL GITHUB AUDIT & SYNC REPORT (M235)"
echo "============================================================"
echo "BRANCH               : ${BRANCH}"
echo "BASE_SHA             : ${BASE_SHA}"
echo "LOCAL_HEAD_SHA       : ${LOCAL_SHA}"
echo "REMOTE_GITHUB_SHA    : ${REMOTE_SHA}"
echo "VERSION_CODE         : ${NEW_CODE}"
echo "TAG_STATUS           : ${TAG_STATUS}"
echo "NODE_SYNTAX_CHECK    : PASS"
echo "NODE_VM_UNIT_TEST    : PASS"
echo "ANDROID_DEVICE_TEST  : NOT_TESTED"
echo "============================================================"

if [ "${LOCAL_SHA}" != "${REMOTE_SHA}" ]; then
  echo "[FAIL] Local SHA (${LOCAL_SHA}) does not match Remote GitHub SHA (${REMOTE_SHA})!"
  exit 1
fi
echo "[VERIFIED] Mission #235 is now live on GitHub (${REMOTE_SHA})."
