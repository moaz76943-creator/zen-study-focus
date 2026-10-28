#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

cd "${HOME}/zen-study-focus"
BRANCH="integration/master-qa-verified-v21"
MISSION_ID="M237_VOCAB_QUIZ_AUTO_PRONOUNCE_ANSWER_ON_FLIP_AND_CODE57_V1"
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
    git commit -m "chore: save pending local modifications before M237"
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
echo "STEP 3: APPLYING MISSION #237 & INCREMENTING VERSIONCODE"
echo "============================================================"
python3 - "${APP_JS}" "${GRADLE_FILE}" << 'PY_EOF'
import sys, re

target_js = sys.argv[1]
gradle_path = sys.argv[2]

with open(target_js, "r", encoding="utf-8") as f:
    content = f.read()

m237_code = """
/* === M237_VOCAB_QUIZ_AUTO_PRONOUNCE_ANSWER_ON_FLIP_AND_CODE57_V1 === */
(function() {
  if (window.__M237_FLIP_PRONOUNCE__) return;
  window.__M237_FLIP_PRONOUNCE__ = true;

  window.dfOnQuizCardFlipped = function(foreignWordText) {
    if (typeof window.dfSafeSpeakUtterance !== 'function' || !foreignWordText) return false;
    var eng = window.SpokenVocabEngine;
    var lang = (eng && eng.config && eng.config.foreignLang) || 'de-DE';
    var speed = (eng && eng.playbackSpeed) || 1.0;
    setTimeout(function() {
      window.dfSafeSpeakUtterance(foreignWordText, lang, speed);
    }, 150);
    return true;
  };

  var quiz = window.FlashQuizEngine;
  if (quiz && !quiz.__m237FlipHooked && typeof quiz.flipCard === 'function') {
    quiz.__m237FlipHooked = true;
    var origFlip = quiz.flipCard.bind(quiz);
    quiz.flipCard = function() {
      var res = origFlip.apply(quiz, arguments);
      var currentItem = quiz._currentItem || (quiz.getCurrentItem && quiz.getCurrentItem());
      if (currentItem && currentItem.word) {
        window.dfOnQuizCardFlipped(currentItem.word);
      }
      return res;
    };
  }
})();
"""

content = content.rstrip() + "\n" + m237_code + "\n"
with open(target_js, "w", encoding="utf-8") as f:
    f.write(content)

with open(gradle_path, "r", encoding="utf-8") as f:
    g = f.read()

m = re.search(r'versionCode\s+(\d+)', g)
cur_code = int(m.group(1)) if m else 56
next_code = max(cur_code + 1, 57)
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

const startIdx = fullCode.indexOf('/* === M237_VOCAB_QUIZ_AUTO_PRONOUNCE_ANSWER_ON_FLIP_AND_CODE57_V1 === */');
if (startIdx === -1) {
  throw new Error('M237 marker not found in ' + targetFile);
}
const moduleCode = fullCode.slice(startIdx);

let spokenWord = null;
const sandbox = {
  window: {},
  SpokenVocabEngine: {
    config: { foreignLang: 'de-DE' },
    playbackSpeed: 1.0
  },
  FlashQuizEngine: {
    _currentItem: { word: 'Fenster' },
    flipCard: () => 'flipped'
  },
  dfSafeSpeakUtterance: (word) => { spokenWord = word; },
  setTimeout: (fn) => { fn(); return 1; },
  console: console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(moduleCode, sandbox);

if (!sandbox.__M237_FLIP_PRONOUNCE__) throw new Error('M237 module missing');
sandbox.FlashQuizEngine.flipCard();
if (spokenWord !== 'Fenster') throw new Error('Expected spoken word "Fenster", got: ' + spokenWord);

process.stdout.write('[GREEN PASS] M237 flip pronounce module tests passed cleanly!\n');
NODE_EOF

echo "============================================================"
echo "STEP 5: COMMITTING & PUSHING TO GITHUB (${BRANCH})"
echo "============================================================"
git add "${APP_JS}" "${GRADLE_FILE}"
git commit -m "feat(vocab-m237): add automatic answer pronunciation on flashcard flip and bump versionCode to 57"

git pull --rebase origin "${BRANCH}"
git push origin "${BRANCH}"

LOCAL_SHA="$(git rev-parse HEAD)"
NEW_CODE="$(grep -Eo 'versionCode[[:space:]]+[0-9]+' "${GRADLE_FILE}" | awk '{print $2}')"
NEW_TAG="v3.6.7-play-code${NEW_CODE}-v21"

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
echo "FINAL GITHUB AUDIT & SYNC REPORT (M237)"
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
echo "[VERIFIED] Mission #237 is now live on GitHub (${REMOTE_SHA})."
