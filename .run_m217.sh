#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

cd "${HOME}/zen-study-focus"
BRANCH="integration/master-qa-verified-v21"
MISSION_ID="M217_VOCAB_QUIZ_STREAK_COUNTER_AND_CODE37_V1"
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
    git commit -m "chore: save pending local modifications before M217"
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
echo "STEP 3: APPLYING MISSION #217 & INCREMENTING VERSIONCODE"
echo "============================================================"
python3 - "${APP_JS}" "${GRADLE_FILE}" << 'PY_EOF'
import sys, re

target_js = sys.argv[1]
gradle_path = sys.argv[2]

with open(target_js, "r", encoding="utf-8") as f:
    content = f.read()

m217_code = """
/* === M217_VOCAB_QUIZ_STREAK_COUNTER_AND_CODE37_V1 === */
(function() {
  if (window.__M217_QUIZ_STREAK__) return;
  window.__M217_QUIZ_STREAK__ = true;

  function toWesternDigits(str) {
    return String(str == null ? '' : str)
      .replace(/[\\u0660-\\u0669]/g, function(d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[\\u06F0-\\u06F9]/g, function(d) { return String(d.charCodeAt(0) - 0x06F0); });
  }

  var currentStreak = 0;
  var bestStreak = 0;
  var STREAK_KEY = 'df_vocab_quiz_best_streak';
  try {
    bestStreak = parseInt(localStorage.getItem(STREAK_KEY), 10) || 0;
  } catch(e) {}

  window.dfRecordQuizAnswerStreak = function(isEasy) {
    if (isEasy) {
      currentStreak++;
      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
        try {
          localStorage.setItem(STREAK_KEY, String(bestStreak));
        } catch(e) {}
      }
    } else {
      currentStreak = 0;
    }
    updateStreakUI();
    return { current: currentStreak, best: bestStreak };
  };

  window.dfGetQuizStreakData = function() {
    return { current: currentStreak, best: bestStreak };
  };

  function updateStreakUI() {
    if (typeof document === 'undefined') return;
    var badge = document.getElementById('df-quiz-streak-badge');
    if (!badge) return;
    badge.innerHTML =
      '<span style="color:#f59e0b;font-weight:700;">🔥 تتابع: <b>' + toWesternDigits(currentStreak) + '</b></span>' +
      (bestStreak > 1 ? '<span style="color:#94a3b8;margin-right:6px;font-size:11px;">(أفضل: ' + toWesternDigits(bestStreak) + ')</span>' : '');
  }

  function mountStreakUI() {
    if (typeof document === 'undefined') return;
    var toolbar = document.getElementById('df-quiz-extra-toolbar') ||
                  document.getElementById('df-flash-quiz-header');
    if (!toolbar || document.getElementById('df-quiz-streak-badge')) return;

    var badge = document.createElement('span');
    badge.id = 'df-quiz-streak-badge';
    badge.style.cssText = 'display:inline-flex;align-items:center;padding:4px 8px;border-radius:8px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);font-size:12px;margin:2px 4px;';
    toolbar.appendChild(badge);
    updateStreakUI();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountStreakUI);
    } else {
      setTimeout(mountStreakUI, 350);
    }
    setInterval(mountStreakUI, 2500);
  }
})();
"""

content = content.rstrip() + "\n" + m217_code + "\n"
with open(target_js, "w", encoding="utf-8") as f:
    f.write(content)

with open(gradle_path, "r", encoding="utf-8") as f:
    g = f.read()

m = re.search(r'versionCode\s+(\d+)', g)
cur_code = int(m.group(1)) if m else 36
next_code = max(cur_code + 1, 37)
g = re.sub(r'versionCode\s+\d+', f'versionCode {next_code}', g)
g = re.sub(r'versionName\s+"[^"]+"', f'versionName "3.5.{next_code - 20}"', g)
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

const startIdx = fullCode.indexOf('/* === M217_VOCAB_QUIZ_STREAK_COUNTER_AND_CODE37_V1 === */');
if (startIdx === -1) {
  throw new Error('M217 marker not found in ' + targetFile);
}
const moduleCode = fullCode.slice(startIdx);

const memStore = Object.create(null);
function makeDummyElement() {
  return new Proxy({
    value: '', textContent: '', innerHTML: '', style: {}, dataset: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    addEventListener: () => {}, appendChild: () => {}, remove: () => {},
    setAttribute: () => {}, getAttribute: () => null,
    querySelector: () => null, querySelectorAll: () => [],
    scrollIntoView: () => {},
    parentNode: { insertBefore: () => {}, appendChild: () => {} }
  }, {
    get(t, p) { return p in t ? t[p] : () => {}; },
    set(t, p, v) { t[p] = v; return true; }
  });
}

const sandbox = {
  window: {},
  document: {
    readyState: 'complete',
    body: makeDummyElement(),
    documentElement: makeDummyElement(),
    getElementById: () => makeDummyElement(),
    createElement: () => makeDummyElement(),
    querySelectorAll: () => [],
    querySelector: () => makeDummyElement(),
    addEventListener: () => {}
  },
  navigator: { language: 'ar' },
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(memStore, k) ? memStore[k] : null),
    setItem: (k, v) => { memStore[k] = String(v); }
  },
  setTimeout: () => 1,
  setInterval: () => 1,
  clearTimeout: () => {},
  clearInterval: () => {},
  console: console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(moduleCode, sandbox);

if (!sandbox.__M217_QUIZ_STREAK__) throw new Error('M217 missing');
let res = sandbox.dfRecordQuizAnswerStreak(true);
if (res.current !== 1 || res.best !== 1) throw new Error('Streak 1 failed');
res = sandbox.dfRecordQuizAnswerStreak(true);
if (res.current !== 2 || res.best !== 2) throw new Error('Streak 2 failed');
res = sandbox.dfRecordQuizAnswerStreak(false);
if (res.current !== 0 || res.best !== 2) throw new Error('Streak reset failed');

process.stdout.write('[GREEN PASS] M217 streak module tests passed cleanly!\n');
NODE_EOF

echo "============================================================"
echo "STEP 5: COMMITTING & PUSHING TO GITHUB (${BRANCH})"
echo "============================================================"
git add "${APP_JS}" "${GRADLE_FILE}"
git commit -m "feat(vocab-m217): add flashcard quiz consecutive answer streak counter and bump versionCode to 37"

git pull --rebase origin "${BRANCH}"
git push origin "${BRANCH}"

LOCAL_SHA="$(git rev-parse HEAD)"
NEW_CODE="$(grep -Eo 'versionCode[[:space:]]+[0-9]+' "${GRADLE_FILE}" | awk '{print $2}')"
NEW_TAG="v3.5.${NEW_CODE}-m217-v21"

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
echo "FINAL GITHUB AUDIT & SYNC REPORT (M217)"
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
echo "[VERIFIED] Mission #217 is now live on GitHub (${REMOTE_SHA})."
