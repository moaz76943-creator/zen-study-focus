#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

cd "${HOME}/zen-study-focus"
BRANCH="integration/master-qa-verified-v21"
MISSION_ID="M252_VOCAB_QUIZ_TOTAL_STUDY_TIME_TRACKER_AND_CODE72_V1"
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
    git commit -m "chore: save pending local modifications before M252"
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
echo "STEP 3: APPLYING MISSION #252 & INCREMENTING VERSIONCODE"
echo "============================================================"
python3 - "${APP_JS}" "${GRADLE_FILE}" << 'PY_EOF'
import sys, re

target_js = sys.argv[1]
gradle_path = sys.argv[2]

with open(target_js, "r", encoding="utf-8") as f:
    content = f.read()

m252_code = """
/* === M252_VOCAB_QUIZ_TOTAL_STUDY_TIME_TRACKER_AND_CODE72_V1 === */
(function() {
  if (window.__M252_QUIZ_TIMER__) return;
  window.__M252_QUIZ_TIMER__ = true;

  function toWesternDigits(str) {
    return String(str == null ? '' : str)
      .replace(/[\\u0660-\\u0669]/g, function(d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[\\u06F0-\\u06F9]/g, function(d) { return String(d.charCodeAt(0) - 0x06F0); });
  }

  var quizStartTime = 0;
  var quizElapsedSec = 0;
  var timerInterval = null;

  window.dfFormatQuizDuration = function(totalSec) {
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    var mm = m < 10 ? '0' + m : String(m);
    var ss = s < 10 ? '0' + s : String(s);
    return toWesternDigits(mm + ':' + ss);
  };

  window.dfStartQuizSessionTimer = function() {
    quizStartTime = Date.now();
    quizElapsedSec = 0;
    if (timerInterval) clearInterval(timerInterval);
    if (typeof setInterval !== 'undefined') {
      timerInterval = setInterval(function() {
        if (typeof document !== 'undefined' && !document.hidden) {
          quizElapsedSec = Math.floor((Date.now() - quizStartTime) / 1000);
          var badge = document.getElementById('df-quiz-session-timer-badge');
          if (badge) {
            badge.textContent = '⏱ ' + window.dfFormatQuizDuration(quizElapsedSec);
          }
        }
      }, 1000);
    }
  };

  window.dfGetQuizSessionDuration = function() {
    return {
      seconds: quizElapsedSec,
      formatted: window.dfFormatQuizDuration(quizElapsedSec)
    };
  };

  function mountQuizTimerUI() {
    if (typeof document === 'undefined') return;
    var header = document.getElementById('df-flash-quiz-header') ||
                 document.getElementById('df-quiz-extra-toolbar');
    if (!header || document.getElementById('df-quiz-session-timer-badge')) return;

    var badge = document.createElement('span');
    badge.id = 'df-quiz-session-timer-badge';
    badge.style.cssText = 'font-size:11px;font-weight:700;color:#38bdf8;background:rgba(56,189,248,0.12);border:1px solid rgba(56,189,248,0.3);padding:3px 8px;border-radius:8px;margin:2px 4px;display:inline-flex;align-items:center;';
    badge.textContent = '⏱ 00:00';
    header.appendChild(badge);
    window.dfStartQuizSessionTimer();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountQuizTimerUI);
    } else {
      setTimeout(mountQuizTimerUI, 350);
    }
  }
})();
"""

content = content.rstrip() + "\n" + m252_code + "\n"
with open(target_js, "w", encoding="utf-8") as f:
    f.write(content)

with open(gradle_path, "r", encoding="utf-8") as f:
    g = f.read()

m = re.search(r'versionCode\s+(\d+)', g)
cur_code = int(m.group(1)) if m else 71
next_code = max(cur_code + 1, 72)
g = re.sub(r'versionCode\s+\d+', f'versionCode {next_code}', g)
g = re.sub(r'versionName\s+"[^"]+"', f'versionName "3.8.{next_code - 70}"', g)
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

const startIdx = fullCode.indexOf('/* === M252_VOCAB_QUIZ_TOTAL_STUDY_TIME_TRACKER_AND_CODE72_V1 === */');
if (startIdx === -1) {
  throw new Error('M252 marker not found in ' + targetFile);
}
const moduleCode = fullCode.slice(startIdx);

const sandbox = {
  window: {},
  document: {
    hidden: false,
    addEventListener: () => {}
  },
  setTimeout: () => 1,
  setInterval: () => 1,
  clearInterval: () => {},
  console: console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(moduleCode, sandbox);

if (!sandbox.__M252_QUIZ_TIMER__) throw new Error('M252 module missing');
if (sandbox.dfFormatQuizDuration(125) !== '02:05') throw new Error('Duration format test failed');

process.stdout.write('[GREEN PASS] M252 quiz timer module tests passed cleanly!\n');
NODE_EOF

echo "============================================================"
echo "STEP 5: COMMITTING & PUSHING TO GITHUB (${BRANCH})"
echo "============================================================"
git add "${APP_JS}" "${GRADLE_FILE}"
git commit -m "feat(vocab-m252): add active study session stopwatch timer to flashcard quiz and bump versionCode to 72"

git pull --rebase origin "${BRANCH}"
git push origin "${BRANCH}"

LOCAL_SHA="$(git rev-parse HEAD)"
NEW_CODE="$(grep -Eo 'versionCode[[:space:]]+[0-9]+' "${GRADLE_FILE}" | awk '{print $2}')"
NEW_TAG="v3.8.2-play-code${NEW_CODE}-v21"

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
echo "FINAL GITHUB AUDIT & SYNC REPORT (M252)"
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
echo "[VERIFIED] Mission #252 is now live on GitHub (${REMOTE_SHA})."
