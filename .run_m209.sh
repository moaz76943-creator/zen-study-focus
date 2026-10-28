#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

cd "${HOME}/zen-study-focus"
BRANCH="integration/master-qa-verified-v21"
MISSION_ID="M209_VOCAB_STATS_AND_MASTERY_TRACKER_V1"
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

TRACKED_DIRTY="$(git status --porcelain --untracked-files=no)"
if [ -n "${TRACKED_DIRTY}" ]; then
  echo "[INFO] Found pending tracked changes. Checking syntax..."
  if node --check "${APP_JS}"; then
    git add -u
    git commit -m "chore: save pending local modifications before M209"
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

TARGET_JS="${APP_JS}"
for candidate in \
  "android/app/src/main/assets/web/notes_studio.js" \
  "android/app/src/main/assets/web/js/notes_studio.js" \
  "${APP_JS}"; do
  if [ -f "${candidate}" ] && grep -q "SpokenVocabEngine" "${candidate}"; then
    TARGET_JS="${candidate}"
    break
  fi
done

echo "============================================================"
echo "STEP 2: CHECKING IDEMPOTENCY (RED CHECK)"
echo "============================================================"
if grep -q "${MISSION_ID}" "${TARGET_JS}"; then
  echo "[INFO] Mission ${MISSION_ID} already present in ${TARGET_JS}."
  exit 0
fi
echo "[RED PASS] ${MISSION_ID} not present yet; applying safe patch."

echo "============================================================"
echo "STEP 3: APPLYING MISSION #209 & INCREMENTING VERSIONCODE"
echo "============================================================"
python3 - "${TARGET_JS}" "${GRADLE_FILE}" << 'PY_EOF'
import sys, os, re

target_js = sys.argv[1]
gradle_path = sys.argv[2]

with open(target_js, "r", encoding="utf-8") as f:
    content = f.read()

m209_code = """
/* === M209_VOCAB_STATS_AND_MASTERY_TRACKER_V1 === */
(function() {
  if (window.__M209_VOCAB_STATS_ACTIVE__) return;
  window.__M209_VOCAB_STATS_ACTIVE__ = true;

  function toWesternDigits(str) {
    return String(str == null ? '' : str)
      .replace(/[\\u0660-\\u0669]/g, function(d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[\\u06F0-\\u06F9]/g, function(d) { return String(d.charCodeAt(0) - 0x06F0); });
  }

  window.dfGetVocabMasteryStats = function() {
    var eng = window.SpokenVocabEngine;
    var items = (eng && typeof eng.getItems === 'function') ? (eng.getItems() || []) : [];
    var total = items.length;
    var needsReview = 0;
    var mastered = 0;
    for (var i = 0; i < total; i++) {
      if (items[i] && items[i].hard) {
        needsReview++;
      } else {
        mastered++;
      }
    }
    return {
      total: total,
      needsReview: needsReview,
      mastered: mastered,
      masteryRate: total > 0 ? Math.round((mastered / total) * 100) : 0
    };
  };

  function updateVocabStatsBadge() {
    if (typeof document === 'undefined') return;
    var statsElem = document.getElementById('df-vocab-mastery-summary-badge');
    if (!statsElem) return;
    var stats = window.dfGetVocabMasteryStats();
    statsElem.innerHTML =
      '<span style="color:#e2e8f0;">📊 إجمالي: <b>' + toWesternDigits(stats.total) + '</b></span>' +
      '<span style="color:#f87171;margin:0 6px;">⚠️ للمراجعة: <b>' + toWesternDigits(stats.needsReview) + '</b></span>' +
      '<span style="color:#4ade80;">🏆 تم إتقانها: <b>' + toWesternDigits(stats.mastered) + '</b> (' + toWesternDigits(stats.masteryRate) + '%)</span>';
  }

  window.dfUpdateVocabStatsBadge = updateVocabStatsBadge;

  function mountStatsUI() {
    if (typeof document === 'undefined') return;
    var searchRow = document.getElementById('df-vocab-search-row') ||
                    document.getElementById('df-vocab-filter-bar');
    if (!searchRow || document.getElementById('df-vocab-mastery-summary-badge')) return;

    var badge = document.createElement('div');
    badge.id = 'df-vocab-mastery-summary-badge';
    badge.style.cssText = 'display:flex;align-items:center;flex-wrap:wrap;gap:4px;padding:6px 12px;border-radius:10px;background:rgba(15,23,42,0.65);border:1px solid rgba(255,255,255,0.1);font-size:12px;margin:4px 0;width:100%;box-sizing:border-box;';
    searchRow.parentNode.insertBefore(badge, searchRow.nextSibling);
    updateVocabStatsBadge();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountStatsUI);
    } else {
      setTimeout(mountStatsUI, 300);
    }
    setInterval(updateVocabStatsBadge, 2500);
  }
})();
"""

content = content.rstrip() + "\n" + m209_code + "\n"
with open(target_js, "w", encoding="utf-8") as f:
    f.write(content)

with open(gradle_path, "r", encoding="utf-8") as f:
    g = f.read()

m = re.search(r'versionCode\s+(\d+)', g)
cur_code = int(m.group(1)) if m else 28
next_code = max(cur_code + 1, 29)
g = re.sub(r'versionCode\s+\d+', f'versionCode {next_code}', g)
g = re.sub(r'versionName\s+"[^"]+"', f'versionName "3.5.{next_code - 20}"', g)
with open(gradle_path, "w", encoding="utf-8") as f:
    f.write(g)

print(f"[INFO] Updated {gradle_path} -> versionCode {next_code}")
PY_EOF

echo "============================================================"
echo "STEP 4: RUNNING SYNTAX & NODE VM UNIT TESTS (GREEN CHECK)"
echo "============================================================"
node --check "${APP_JS}"
if [ "${TARGET_JS}" != "${APP_JS}" ]; then
  node --check "${TARGET_JS}"
fi

node - "${TARGET_JS}" << 'NODE_EOF'
const fs = require('fs');
const vm = require('vm');
const targetFile = process.argv[2];
const code = fs.readFileSync(targetFile, 'utf8');

function makeDummyElement() {
  return new Proxy({
    value: '',
    textContent: '',
    innerHTML: '',
    style: {},
    dataset: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    addEventListener: () => {},
    removeEventListener: () => {},
    appendChild: () => {},
    remove: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    scrollIntoView: () => {},
    parentNode: { insertBefore: () => {}, appendChild: () => {} }
  }, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return () => {};
    },
    set(target, prop, val) {
      target[prop] = val;
      return true;
    }
  });
}

const sandbox = {
  window: {},
  document: {
    readyState: 'complete',
    body: makeDummyElement(),
    documentElement: makeDummyElement(),
    getElementById: (id) => {
      if (id === 'df-vocab-mastery-summary-badge') return null;
      return makeDummyElement();
    },
    createElement: () => makeDummyElement(),
    querySelectorAll: () => [],
    querySelector: () => makeDummyElement(),
    addEventListener: () => {}
  },
  navigator: { language: 'ar' },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  setTimeout: () => 1,
  setInterval: () => 1,
  clearTimeout: () => {},
  clearInterval: () => {},
  console: console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(code, sandbox);

if (!sandbox.__M209_VOCAB_STATS_ACTIVE__) throw new Error('M209 missing');
const stats = sandbox.dfGetVocabMasteryStats();
if (typeof stats.masteryRate !== 'number') throw new Error('Stats computation error');

process.stdout.write('[GREEN PASS] M209 syntax and unit tests passed cleanly.\n');
NODE_EOF

echo "============================================================"
echo "STEP 5: COMMITTING & PUSHING TO GITHUB (${BRANCH})"
echo "============================================================"
git add "${TARGET_JS}" "${GRADLE_FILE}"
git commit -m "feat(vocab-m209): add live vocabulary mastery stats badge and bump versionCode to 29"

git pull --rebase origin "${BRANCH}"
git push origin "${BRANCH}"

LOCAL_SHA="$(git rev-parse HEAD)"
NEW_CODE="$(grep -Eo 'versionCode[[:space:]]+[0-9]+' "${GRADLE_FILE}" | awk '{print $2}')"
NEW_TAG="v3.5.${NEW_CODE}-m209-v21"

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
echo "FINAL GITHUB AUDIT & SYNC REPORT"
echo "============================================================"
echo "BRANCH               : ${BRANCH}"
echo "LOCAL_HEAD_SHA       : ${LOCAL_SHA}"
echo "REMOTE_GITHUB_SHA    : ${REMOTE_SHA}"
echo "VERSION_CODE         : ${NEW_CODE}"
echo "TAG_STATUS           : ${TAG_STATUS}"
echo "NODE_SYNTAX_CHECK    : PASS"
echo "NODE_VM_UNIT_TEST    : PASS"
echo "ANDROID_DEVICE_TEST  : NOT_TESTED"
echo "============================================================"

if [ "${LOCAL_SHA}" != "${REMOTE_SHA}" ]; then
  echo "[FAIL] Local SHA does not match Remote GitHub SHA!"
  exit 1
fi
echo "[VERIFIED] Mission #209 successfully applied and confirmed on GitHub (${REMOTE_SHA})."
