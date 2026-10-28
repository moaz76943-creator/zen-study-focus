#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

BRANCH="integration/master-qa-verified-v21"
MISSION_ID="M208_VOCAB_SPEED_PRESETS_AND_REPLAY_V1"
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

echo "=== [4/7] Applying Mission #208 patch & incrementing versionCode ==="
python3 - "${TARGET_JS}" "${GRADLE_FILE}" << 'PY_EOF'
import sys, os, re

target_js = sys.argv[1]
gradle_path = sys.argv[2]

with open(target_js, "r", encoding="utf-8") as f:
    content = f.read()

m208_code = """
/* === M208_VOCAB_SPEED_PRESETS_AND_REPLAY_V1 === */
(function() {
  if (window.__M208_VOCAB_SPEED_PRESETS__) return;
  window.__M208_VOCAB_SPEED_PRESETS__ = true;

  function toWesternDigits(str) {
    return String(str == null ? '' : str)
      .replace(/[\\u0660-\\u0669]/g, function(d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[\\u06F0-\\u06F9]/g, function(d) { return String(d.charCodeAt(0) - 0x06F0); });
  }

  var currentSpeed = 1.0;

  window.dfSetVocabPlaybackSpeed = function(speed) {
    currentSpeed = parseFloat(speed) || 1.0;
    var eng = window.SpokenVocabEngine;
    if (eng) {
      eng.playbackSpeed = currentSpeed;
      if (eng.config) eng.config.speed = currentSpeed;
    }
    updateSpeedButtonsUI();
    return currentSpeed;
  };

  window.dfGetVocabPlaybackSpeed = function() {
    return currentSpeed;
  };

  function updateSpeedButtonsUI() {
    if (typeof document === 'undefined') return;
    var speeds = [0.75, 1.0, 1.25];
    speeds.forEach(function(s) {
      var btn = document.getElementById('df-speed-btn-' + String(s).replace('.', '_'));
      if (btn) {
        var isActive = Math.abs(currentSpeed - s) < 0.05;
        btn.style.background = isActive ? 'rgba(168,85,247,0.35)' : 'rgba(255,255,255,0.06)';
        btn.style.borderColor = isActive ? '#c084fc' : 'rgba(255,255,255,0.15)';
        btn.style.color = isActive ? '#ffffff' : '#94a3b8';
      }
    });
  }

  window.dfReplayCurrentQuizWord = function() {
    var eng = window.SpokenVocabEngine;
    if (!eng) return;
    var quizWordElem = document.getElementById('df-quiz-current-word') ||
                       document.querySelector('.df-quiz-card-word');
    if (quizWordElem) {
      var wordText = quizWordElem.textContent || '';
      if (wordText && typeof eng.speakWord === 'function') {
        eng.speakWord(wordText);
      } else if (wordText && typeof eng.speakPair === 'function') {
        eng.speakPair({ word: wordText, meaning: '' });
      }
    }
  };

  function mountSpeedControls() {
    if (typeof document === 'undefined') return;
    var targetRow = document.getElementById('df-quiz-extra-toolbar') ||
                    document.getElementById('df-vocab-search-row') ||
                    document.getElementById('df-vocab-filter-bar');
    if (!targetRow || document.getElementById('df-vocab-speed-selector-group')) return;

    var speedGroup = document.createElement('div');
    speedGroup.id = 'df-vocab-speed-selector-group';
    speedGroup.style.cssText = 'display:inline-flex;align-items:center;gap:4px;background:rgba(15,23,42,0.6);padding:3px 6px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);';
    speedGroup.innerHTML =
      '<span style="font-size:11px;color:#94a3b8;font-weight:600;margin-right:2px;">سرعة النطق:</span>' +
      '<button type="button" id="df-speed-btn-0_75" style="padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);color:#94a3b8;font-size:11px;font-weight:700;cursor:pointer;">0.75x</button>' +
      '<button type="button" id="df-speed-btn-1_0" style="padding:4px 8px;border-radius:6px;border:1px solid #c084fc;background:rgba(168,85,247,0.35);color:#ffffff;font-size:11px;font-weight:700;cursor:pointer;">1.0x</button>' +
      '<button type="button" id="df-speed-btn-1_25" style="padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);color:#94a3b8;font-size:11px;font-weight:700;cursor:pointer;">1.25x</button>';

    targetRow.appendChild(speedGroup);

    var b075 = document.getElementById('df-speed-btn-0_75');
    if (b075) b075.onclick = function() { window.dfSetVocabPlaybackSpeed(0.75); };
    var b100 = document.getElementById('df-speed-btn-1_0');
    if (b100) b100.onclick = function() { window.dfSetVocabPlaybackSpeed(1.0); };
    var b125 = document.getElementById('df-speed-btn-1_25');
    if (b125) b125.onclick = function() { window.dfSetVocabPlaybackSpeed(1.25); };

    updateSpeedButtonsUI();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountSpeedControls);
    } else {
      setTimeout(mountSpeedControls, 300);
    }
    setInterval(mountSpeedControls, 1500);
  }
})();
"""

content = content.rstrip() + "\n" + m208_code + "\n"
with open(target_js, "w", encoding="utf-8") as f:
    f.write(content)

with open(gradle_path, "r", encoding="utf-8") as f:
    g = f.read()

m = re.search(r'versionCode\s+(\d+)', g)
cur_code = int(m.group(1)) if m else 27
next_code = max(cur_code + 1, 28)
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

if (!sandbox.__M208_VOCAB_SPEED_PRESETS__) {
  throw new Error('M208_VOCAB_SPEED_PRESETS_AND_REPLAY_V1 failed to initialize');
}
if (sandbox.dfSetVocabPlaybackSpeed(0.75) !== 0.75) {
  throw new Error('Failed to set speed to 0.75');
}
if (sandbox.dfGetVocabPlaybackSpeed() !== 0.75) {
  throw new Error('Failed to read speed 0.75');
}
if (sandbox.dfSetVocabPlaybackSpeed(1.25) !== 1.25) {
  throw new Error('Failed to set speed to 1.25');
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
git commit -m "feat(vocab-m208): add quick pronunciation speed selector presets, quiz replay helper, and bump versionCode"

git pull --rebase origin "${BRANCH}"
LOCAL_SHA="$(git rev-parse HEAD)"
NEW_CODE="$(grep -Eo 'versionCode[[:space:]]+[0-9]+' "${GRADLE_FILE}" | awk '{print $2}')"
NEW_TAG="v3.5.${NEW_CODE}-m208-v21"

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
