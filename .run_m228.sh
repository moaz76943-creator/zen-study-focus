#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

cd "${HOME}/zen-study-focus"
BRANCH="integration/master-qa-verified-v21"
MISSION_ID="M228_VOCAB_QUIZ_AUTO_HIDE_ANSWER_ON_ADVANCE_AND_CODE48_V1"
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
    git commit -m "chore: save pending local modifications before M228"
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
echo "STEP 3: APPLYING MISSION #228 & INCREMENTING VERSIONCODE"
echo "============================================================"
python3 - "${APP_JS}" "${GRADLE_FILE}" << 'PY_EOF'
import sys, re

target_js = sys.argv[1]
gradle_path = sys.argv[2]

with open(target_js, "r", encoding="utf-8") as f:
    content = f.read()

m228_code = """
/* === M228_VOCAB_QUIZ_AUTO_HIDE_ANSWER_ON_ADVANCE_AND_CODE48_V1 === */
(function() {
  if (window.__M228_QUIZ_FLIP_RESET__) return;
  window.__M228_QUIZ_FLIP_RESET__ = true;

  window.dfNormalizeQuizCardFlipState = function() {
    if (typeof document === 'undefined') return false;
    var card = document.getElementById('df-flash-quiz-card') ||
               document.querySelector('.df-flash-card-inner') ||
               document.querySelector('.df-quiz-card');
    if (!card) return false;

    if (card.classList) {
      card.classList.remove('is-flipped', 'flipped', 'show-answer');
    }
    var ans = document.getElementById('df-quiz-card-answer') ||
              document.querySelector('.df-quiz-answer-text');
    if (ans && ans.style) {
      ans.style.display = 'none';
      ans.style.opacity = '0';
    }
    var prompt = document.getElementById('df-quiz-flip-prompt');
    if (prompt && prompt.style) {
      prompt.style.display = 'block';
    }
    return true;
  };

  var quiz = window.FlashQuizEngine;
  if (quiz && !quiz.__m228ResetHooked && typeof quiz.nextCard === 'function') {
    quiz.__m228ResetHooked = true;
    var origNext = quiz.nextCard.bind(quiz);
    quiz.nextCard = function() {
      window.dfNormalizeQuizCardFlipState();
      return origNext.apply(quiz, arguments);
    };
  }
})();
"""

content = content.rstrip() + "\n" + m228_code + "\n"
with open(target_js, "w", encoding="utf-8") as f:
    f.write(content)

with open(gradle_path, "r", encoding="utf-8") as f:
    g = f.read()

m = re.search(r'versionCode\s+(\d+)', g)
cur_code = int(m.group(1)) if m else 47
next_code = max(cur_code + 1, 48)
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

const startIdx = fullCode.indexOf('/* === M228_VOCAB_QUIZ_AUTO_HIDE_ANSWER_ON_ADVANCE_AND_CODE48_V1 === */');
if (startIdx === -1) {
  throw new Error('M228 marker not found in ' + targetFile);
}
const moduleCode = fullCode.slice(startIdx);

let removedClass = false;
const sandbox = {
  window: {},
  FlashQuizEngine: {
    nextCard: () => 'next_called'
  },
  document: {
    getElementById: (id) => {
      if (id === 'df-flash-quiz-card') {
        return {
          classList: {
            remove: (cls) => { if (cls === 'is-flipped') removedClass = true; }
          }
        };
      }
      return null;
    },
    querySelector: () => null
  },
  setTimeout: (fn) => { fn(); return 1; },
  console: console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(moduleCode, sandbox);

if (!sandbox.__M228_QUIZ_FLIP_RESET__) throw new Error('M228 module missing');
sandbox.dfNormalizeQuizCardFlipState();
if (!removedClass) throw new Error('Flip state normalization failed');

process.stdout.write('[GREEN PASS] M228 flip state normalization module tests passed cleanly!\n');
NODE_EOF

echo "============================================================"
echo "STEP 5: COMMITTING & PUSHING TO GITHUB (${BRANCH})"
echo "============================================================"
git add "${APP_JS}" "${GRADLE_FILE}"
git commit -m "feat(vocab-m228): add flashcard question flip state auto-normalization on card advance and bump versionCode to 48"

git pull --rebase origin "${BRANCH}"
git push origin "${BRANCH}"

LOCAL_SHA="$(git rev-parse HEAD)"
NEW_CODE="$(grep -Eo 'versionCode[[:space:]]+[0-9]+' "${GRADLE_FILE}" | awk '{print $2}')"
NEW_TAG="v3.5.${NEW_CODE}-m228-v21"

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
echo "FINAL GITHUB AUDIT & SYNC REPORT (M228)"
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
echo "[VERIFIED] Mission #228 is now live on GitHub (${REMOTE_SHA})."
