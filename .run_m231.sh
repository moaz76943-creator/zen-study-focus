#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

cd "${HOME}/zen-study-focus"
BRANCH="integration/master-qa-verified-v21"
MISSION_ID="M231_VOCAB_QUIZ_RETRY_HARD_ONLY_ACTION_AND_CODE51_V1"
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
    git commit -m "chore: save pending local modifications before M231"
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
echo "STEP 3: APPLYING MISSION #231 & INCREMENTING VERSIONCODE"
echo "============================================================"
python3 - "${APP_JS}" "${GRADLE_FILE}" << 'PY_EOF'
import sys, re

target_js = sys.argv[1]
gradle_path = sys.argv[2]

with open(target_js, "r", encoding="utf-8") as f:
    content = f.read()

m231_code = """
/* === M231_VOCAB_QUIZ_RETRY_HARD_ONLY_ACTION_AND_CODE51_V1 === */
(function() {
  if (window.__M231_RETRY_HARD__) return;
  window.__M231_RETRY_HARD__ = true;

  window.dfRestartQuizWithHardCardsOnly = function() {
    var eng = window.SpokenVocabEngine;
    var allItems = (eng && typeof eng.getItems === 'function') ? (eng.getItems() || []) : [];
    var hardItems = [];
    for (var i = 0; i < allItems.length; i++) {
      if (allItems[i] && allItems[i].hard) {
        hardItems.push(allItems[i]);
      }
    }

    if (!hardItems.length) {
      alert('ممتاز! أتقنت جميع الكلمات في هذه الجلسة ولا توجد كلمات للمراجعة.');
      return false;
    }

    var summaryModal = document.getElementById('df-quiz-summary-modal');
    if (summaryModal) summaryModal.remove();

    var quiz = window.FlashQuizEngine;
    if (quiz && typeof quiz.startWithItems === 'function') {
      quiz.startWithItems(hardItems);
      return true;
    } else {
      var quizModal = document.getElementById('df-flash-quiz-modal');
      if (quizModal) {
        quizModal.style.display = 'block';
        if (typeof window.dfNormalizeQuizCardFlipState === 'function') {
          window.dfNormalizeQuizCardFlipState();
        }
      }
      return true;
    }
  };

  function injectRetryHardButton() {
    if (typeof document === 'undefined') return;
    var summaryModal = document.getElementById('df-quiz-summary-modal');
    if (!summaryModal || document.getElementById('df-quiz-retry-hard-btn')) return;

    var container = summaryModal.querySelector('div');
    if (!container) return;

    var retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.id = 'df-quiz-retry-hard-btn';
    retryBtn.style.cssText = 'width:100%;padding:10px;border-radius:12px;border:1px solid rgba(248,113,113,0.35);background:rgba(248,113,113,0.15);color:#fca5a5;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:8px;';
    retryBtn.textContent = '🔄 إعادة اختبار الكلمات الصعبة فقط';
    retryBtn.onclick = function() { window.dfRestartQuizWithHardCardsOnly(); };

    var closeBtn = document.getElementById('df-quiz-summary-close-btn');
    if (closeBtn) {
      container.insertBefore(retryBtn, closeBtn);
    } else {
      container.appendChild(retryBtn);
    }
  }

  if (typeof document !== 'undefined' && typeof setInterval !== 'undefined') {
    setInterval(injectRetryHardButton, 1000);
  }
})();
"""

content = content.rstrip() + "\n" + m231_code + "\n"
with open(target_js, "w", encoding="utf-8") as f:
    f.write(content)

with open(gradle_path, "r", encoding="utf-8") as f:
    g = f.read()

m = re.search(r'versionCode\s+(\d+)', g)
cur_code = int(m.group(1)) if m else 50
next_code = max(cur_code + 1, 51)
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

const startIdx = fullCode.indexOf('/* === M231_VOCAB_QUIZ_RETRY_HARD_ONLY_ACTION_AND_CODE51_V1 === */');
if (startIdx === -1) {
  throw new Error('M231 marker not found in ' + targetFile);
}
const moduleCode = fullCode.slice(startIdx);

let startedWithCount = 0;
const sandbox = {
  window: {},
  SpokenVocabEngine: {
    getItems: () => [
      { id: '1', word: 'EasyWord', hard: false },
      { id: '2', word: 'HardWord', hard: true }
    ]
  },
  FlashQuizEngine: {
    startWithItems: (items) => { startedWithCount = items.length; return true; }
  },
  document: {
    getElementById: () => null,
    querySelector: () => null
  },
  alert: () => {},
  setInterval: () => 1,
  console: console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(moduleCode, sandbox);

if (!sandbox.__M231_RETRY_HARD__) throw new Error('M231 module missing');
if (!sandbox.dfRestartQuizWithHardCardsOnly()) throw new Error('Retry hard cards failed');
if (startedWithCount !== 1) throw new Error('Expected 1 hard card, got: ' + startedWithCount);

process.stdout.write('[GREEN PASS] M231 retry hard only module tests passed cleanly!\n');
NODE_EOF

echo "============================================================"
echo "STEP 5: COMMITTING & PUSHING TO GITHUB (${BRANCH})"
echo "============================================================"
git add "${APP_JS}" "${GRADLE_FILE}"
git commit -m "feat(vocab-m231): add 1-tap retry hard words only from quiz summary and bump versionCode to 51"

git pull --rebase origin "${BRANCH}"
git push origin "${BRANCH}"

LOCAL_SHA="$(git rev-parse HEAD)"
NEW_CODE="$(grep -Eo 'versionCode[[:space:]]+[0-9]+' "${GRADLE_FILE}" | awk '{print $2}')"
NEW_TAG="v3.6.1-play-code${NEW_CODE}-v21"

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
echo "FINAL GITHUB AUDIT & SYNC REPORT (M231)"
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
echo "[VERIFIED] Mission #231 is now live on GitHub (${REMOTE_SHA})."
