#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

BRANCH="integration/master-qa-verified-v21"
MISSION_ID="M207_FLASH_QUIZ_SHUFFLE_AND_REVERSE_V1"
REPO_DIR="${HOME}/zen-study-focus"

trap 'echo "[FAIL] Script stopped at line $LINENO due to an error. Review output above."; exit 1' ERR

echo "=== [1/7] Checking repository & syncing official branch ==="
if [ ! -d "${REPO_DIR}/.git" ]; then
  echo "[FAIL] Git repository not found at: ${REPO_DIR}"
  exit 1
fi
cd "${REPO_DIR}"

# Move any stray untracked scripts out of Android web assets so they don't bloat the AAB
mkdir -p "${REPO_DIR}/.local_cycle_archive"
for stray in android/app/src/main/assets/web/run_cycle_*.sh; do
  if [ -f "${stray}" ] && [ -z "$(git ls-files "${stray}")" ]; then
    mv "${stray}" "${REPO_DIR}/.local_cycle_archive/"
    echo "[CLEANUP] Moved untracked ${stray} out of web assets."
  fi
done

# Check ONLY tracked files for uncommitted modifications
TRACKED_DIRTY="$(git status --porcelain --untracked-files=no)"
if [ -n "${TRACKED_DIRTY}" ]; then
  echo "[BLOCKED] Tracked files have uncommitted modifications:"
  echo "${TRACKED_DIRTY}"
  exit 1
fi

git fetch origin "${BRANCH}"
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "${CURRENT_BRANCH}" != "${BRANCH}" ]; then
  git checkout "${BRANCH}"
fi
git pull --ff-only origin "${BRANCH}"

BASE_SHA="$(git rev-parse HEAD)"
echo "[INFO] Latest official HEAD SHA: ${BASE_SHA}"

echo "=== [2/7] Verifying real file paths in repository ==="
APP_JS="android/app/src/main/assets/web/app.js"
if [ ! -f "${APP_JS}" ]; then
  echo "[FAIL] Primary file not found at expected path: ${APP_JS}"
  exit 1
fi

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

GRADLE_FILE="android/app/build.gradle"
if [ ! -f "${GRADLE_FILE}" ]; then
  echo "[FAIL] Gradle build file not found: ${GRADLE_FILE}"
  exit 1
fi

echo "[INFO] Target JS file   : ${TARGET_JS}"
echo "[INFO] Gradle build file: ${GRADLE_FILE}"

echo "=== [3/7] Checking idempotency (RED Check) ==="
if grep -q "${MISSION_ID}" "${TARGET_JS}"; then
  echo "[INFO] Mission ${MISSION_ID} is already present in ${TARGET_JS}. Nothing to duplicate."
  exit 0
fi
echo "[RED PASS] ${MISSION_ID} not present yet; applying safe patch."

echo "=== [4/7] Applying Mission #207 patch & incrementing versionCode ==="
python3 - "${TARGET_JS}" "${GRADLE_FILE}" << 'PY_EOF'
import sys, os, re

target_js = sys.argv[1]
gradle_path = sys.argv[2]

with open(target_js, "r", encoding="utf-8") as f:
    content = f.read()

m207_code = """
/* === M207_FLASH_QUIZ_SHUFFLE_AND_REVERSE_V1 === */
(function() {
  if (window.__M207_QUIZ_ENHANCED__) return;
  window.__M207_QUIZ_ENHANCED__ = true;

  function toWesternDigits(str) {
    return String(str == null ? '' : str)
      .replace(/[\\u0660-\\u0669]/g, function(d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[\\u06F0-\\u06F9]/g, function(d) { return String(d.charCodeAt(0) - 0x06F0); });
  }

  function shuffleArray(arr) {
    var copy = (arr || []).slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  window.dfToWesternDigitsM207 = toWesternDigits;
  window.dfShuffleVocabArrayM207 = shuffleArray;

  var quizState = {
    isShuffled: false,
    isReversed: false
  };

  window.dfToggleQuizShuffle = function() {
    quizState.isShuffled = !quizState.isShuffled;
    var btn = document.getElementById('df-quiz-shuffle-toggle-btn');
    if (btn) {
      btn.style.background = quizState.isShuffled ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.06)';
      btn.style.borderColor = quizState.isShuffled ? '#c084fc' : 'rgba(255,255,255,0.15)';
    }
    return quizState.isShuffled;
  };

  window.dfToggleQuizReverse = function() {
    quizState.isReversed = !quizState.isReversed;
    var btn = document.getElementById('df-quiz-reverse-toggle-btn');
    if (btn) {
      btn.textContent = quizState.isReversed ? '🔄 السؤال: المعنى ⬅ الكلمة' : '🔄 السؤال: الكلمة ⬅ المعنى';
      btn.style.background = quizState.isReversed ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.06)';
      btn.style.borderColor = quizState.isReversed ? '#38bdf8' : 'rgba(255,255,255,0.15)';
    }
    return quizState.isReversed;
  };

  window.dfGetPreparedQuizItems = function(rawItems) {
    var items = (rawItems || []).slice();
    if (quizState.isShuffled) {
      items = shuffleArray(items);
    }
    return items.map(function(it) {
      if (!quizState.isReversed) return it;
      return {
        id: it.id,
        word: it.meaning,
        meaning: it.word,
        color: it.color,
        hard: it.hard,
        _origWord: it.word,
        _origMeaning: it.meaning
      };
    });
  };

  function mountQuizControls() {
    if (typeof document === 'undefined') return;
    var quizHeader = document.getElementById('df-flash-quiz-header') ||
                     document.getElementById('df-vocab-filter-bar');
    if (!quizHeader || document.getElementById('df-quiz-extra-toolbar')) return;

    var toolbar = document.createElement('div');
    toolbar.id = 'df-quiz-extra-toolbar';
    toolbar.style.cssText = 'display:flex;gap:8px;align-items:center;margin:6px 0;flex-wrap:wrap;';
    toolbar.innerHTML =
      '<button type="button" id="df-quiz-shuffle-toggle-btn" ' +
      'style="padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);color:#e2e8f0;font-size:12px;font-weight:600;cursor:pointer;">' +
      '🔀 خلط عشوائي</button>' +
      '<button type="button" id="df-quiz-reverse-toggle-btn" ' +
      'style="padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);color:#e2e8f0;font-size:12px;font-weight:600;cursor:pointer;">' +
      '🔄 السؤال: الكلمة ⬅ المعنى</button>';

    quizHeader.parentNode.insertBefore(toolbar, quizHeader.nextSibling);

    var shuffleBtn = document.getElementById('df-quiz-shuffle-toggle-btn');
    if (shuffleBtn) shuffleBtn.onclick = function() { window.dfToggleQuizShuffle(); };

    var reverseBtn = document.getElementById('df-quiz-reverse-toggle-btn');
    if (reverseBtn) reverseBtn.onclick = function() { window.dfToggleQuizReverse(); };
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountQuizControls);
    } else {
      setTimeout(mountQuizControls, 300);
    }
    setInterval(mountQuizControls, 1500);
  }
})();
"""

content = content.rstrip() + "\n" + m207_code + "\n"
with open(target_js, "w", encoding="utf-8") as f:
    f.write(content)

with open(gradle_path, "r", encoding="utf-8") as f:
    g = f.read()

m = re.search(r'versionCode\s+(\d+)', g)
cur_code = int(m.group(1)) if m else 26
next_code = max(cur_code + 1, 27)
g = re.sub(r'versionCode\s+\d+', f'versionCode {next_code}', g)
g = re.sub(r'versionName\s+"[^"]+"', f'versionName "3.5.{next_code - 20}"', g)
with open(gradle_path, "w", encoding="utf-8") as f:
    f.write(g)

print(f"[INFO] Updated {gradle_path} -> versionCode {next_code}")
PY_EOF

echo "=== [5/7] Running syntax & Node VM functional unit tests (GREEN Check) ==="
node --check "${APP_JS}"
if [ "${TARGET_JS}" != "${APP_JS}" ]; then
  node --check "${TARGET_JS}"
fi

node - "${TARGET_JS}" << 'NODE_EOF'
const fs = require('fs');
const vm = require('vm');
const targetFile = process.argv[2];
const code = fs.readFileSync(targetFile, 'utf8');

const sandbox = {
  window: {},
  document: {
    readyState: 'complete',
    getElementById: () => null,
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {}
  },
  navigator: {},
  localStorage: { getItem: () => null, setItem: () => {} },
  setTimeout: () => {},
  setInterval: () => {},
  clearTimeout: () => {},
  clearInterval: () => {},
  console: console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(code, sandbox);

if (!sandbox.__M207_QUIZ_ENHANCED__) {
  throw new Error('M207_FLASH_QUIZ_SHUFFLE_AND_REVERSE_V1 failed to initialize');
}
if (sandbox.dfToWesternDigitsM207('٢٠٢٦/١٠/٢٤') !== '2026/10/24') {
  throw new Error('Western digits normalization failed');
}
const sample = [
  {id: '1', word: 'A', meaning: '1'},
  {id: '2', word: 'B', meaning: '2'},
  {id: '3', word: 'C', meaning: '3'}
];
const shuffled = sandbox.dfShuffleVocabArrayM207(sample);
if (!Array.isArray(shuffled) || shuffled.length !== 3) {
  throw new Error('Shuffle failed to maintain item count');
}
sandbox.dfToggleQuizReverse();
const prepared = sandbox.dfGetPreparedQuizItems(sample);
if (prepared[0].word !== sample[0].meaning || prepared[0].meaning !== sample[0].word) {
  throw new Error('Reverse question direction failed');
}
console.log('[GREEN PASS] Syntax and Node VM functional unit tests passed.');
NODE_EOF

grep -q 'applicationId "com.deepfocus.study"' "${GRADLE_FILE}"
if grep -Eiq '"(he|iw)"' "${APP_JS}"; then
  echo "[FAIL] Forbidden locale code detected in ${APP_JS}"
  exit 1
fi

echo "=== [6/7] Committing & pushing safely without --tags or --force ==="
git add "${TARGET_JS}" "${GRADLE_FILE}"
git commit -m "feat(vocab-m207): add flashcard quiz shuffle, reverse question direction, and bump versionCode"

git pull --rebase origin "${BRANCH}"
LOCAL_SHA="$(git rev-parse HEAD)"
NEW_CODE="$(grep -Eo 'versionCode[[:space:]]+[0-9]+' "${GRADLE_FILE}" | awk '{print $2}')"
NEW_TAG="v3.5.${NEW_CODE}-m207-v21"

git push origin "${BRANCH}"

if [ -z "$(git ls-remote --tags origin "refs/tags/${NEW_TAG}")" ]; then
  git tag "${NEW_TAG}" "${LOCAL_SHA}"
  git push origin "refs/tags/${NEW_TAG}"
  TAG_STATUS="PUSHED (${NEW_TAG})"
else
  TAG_STATUS="SKIPPED_EXISTING (${NEW_TAG})"
fi

echo "=== [7/7] Verifying remote SHA on GitHub ==="
REMOTE_SHA="$(git ls-remote origin "refs/heads/${BRANCH}" | awk '{print $1}')"

echo "------------------------------------------------------------"
echo "DEEP FOCUS - VERIFICATION & DEPLOYMENT REPORT"
echo "------------------------------------------------------------"
echo "BRANCH               : ${BRANCH}"
echo "BASE_SHA             : ${BASE_SHA}"
echo "LOCAL_HEAD_SHA       : ${LOCAL_SHA}"
echo "REMOTE_GITHUB_SHA    : ${REMOTE_SHA}"
echo "MODIFIED_FILES       : ${TARGET_JS}, ${GRADLE_FILE}"
echo "VERSION_CODE         : ${NEW_CODE}"
echo "NEW_TAG_STATUS       : ${TAG_STATUS}"
echo "NODE_SYNTAX_CHECK    : PASS"
echo "NODE_VM_UNIT_TEST    : PASS"
echo "ANDROID_DEVICE_TEST  : NOT_TESTED (Requires on-device check)"
echo "------------------------------------------------------------"

if [ "${LOCAL_SHA}" != "${REMOTE_SHA}" ]; then
  echo "[FAIL] Local SHA (${LOCAL_SHA}) does not match remote GitHub SHA (${REMOTE_SHA})."
  exit 1
fi

echo "[VERIFIED] Changes committed, pushed, and verified on GitHub official branch."
