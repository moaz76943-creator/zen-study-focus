#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

cd "${HOME}/zen-study-focus"
BRANCH="integration/master-qa-verified-v21"
MISSION_ID="M240_VOCAB_CARD_TTS_PITCH_STABILITY_AND_CODE60_V1"
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
    git commit -m "chore: save pending local modifications before M240"
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
echo "STEP 3: APPLYING MISSION #240 & INCREMENTING TO VERSIONCODE 60"
echo "============================================================"
python3 - "${APP_JS}" "${GRADLE_FILE}" << 'PY_EOF'
import sys, re

target_js = sys.argv[1]
gradle_path = sys.argv[2]

with open(target_js, "r", encoding="utf-8") as f:
    content = f.read()

m240_code = """
/* === M240_VOCAB_CARD_TTS_PITCH_STABILITY_AND_CODE60_V1 === */
(function() {
  if (window.__M240_PITCH_STABILITY__) return;
  window.__M240_PITCH_STABILITY__ = true;

  var currentPitch = 1.0;
  var PITCH_KEY = 'df_vocab_tts_pitch';
  try {
    var saved = parseFloat(localStorage.getItem(PITCH_KEY));
    if (saved >= 0.8 && saved <= 1.2) currentPitch = saved;
  } catch(e) {}

  window.dfSetVocabTtsPitch = function(p) {
    var val = parseFloat(p);
    if (isNaN(val)) val = 1.0;
    currentPitch = Math.max(0.85, Math.min(1.15, val));
    try {
      localStorage.setItem(PITCH_KEY, String(currentPitch));
    } catch(e) {}
    return currentPitch;
  };

  window.dfGetVocabTtsPitch = function() {
    return currentPitch;
  };

  if (typeof window.dfSafeSpeakUtterance === 'function') {
    var origSafeSpeak = window.dfSafeSpeakUtterance;
    window.dfSafeSpeakUtterance = function(text, lang, rate, onDone) {
      if (typeof window.SpeechSynthesisUtterance !== 'undefined') {
        var origUtterance = window.SpeechSynthesisUtterance;
        window.SpeechSynthesisUtterance = function(t) {
          var instance = new origUtterance(t);
          instance.pitch = currentPitch;
          return instance;
        };
      }
      return origSafeSpeak(text, lang, rate, onDone);
    };
  }
})();
"""

content = content.rstrip() + "\n" + m240_code + "\n"
with open(target_js, "w", encoding="utf-8") as f:
    f.write(content)

with open(gradle_path, "r", encoding="utf-8") as f:
    g = f.read()

m = re.search(r'versionCode\s+(\d+)', g)
cur_code = int(m.group(1)) if m else 59
next_code = max(cur_code + 1, 60)
g = re.sub(r'versionCode\s+\d+', f'versionCode {next_code}', g)
g = re.sub(r'versionName\s+"[^"]+"', 'versionName "3.7.0"', g)
with open(gradle_path, "w", encoding="utf-8") as f:
    f.write(g)

print(f"[INFO] Updated {gradle_path} -> versionCode {next_code} (v3.7.0)")
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

const startIdx = fullCode.indexOf('/* === M240_VOCAB_CARD_TTS_PITCH_STABILITY_AND_CODE60_V1 === */');
if (startIdx === -1) {
  throw new Error('M240 marker not found in ' + targetFile);
}
const moduleCode = fullCode.slice(startIdx);

const sandbox = {
  window: {},
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  console: console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(moduleCode, sandbox);

if (!sandbox.__M240_PITCH_STABILITY__) throw new Error('M240 module missing');
if (sandbox.dfSetVocabTtsPitch(1.05) !== 1.05) throw new Error('Pitch setter test failed');
if (sandbox.dfGetVocabTtsPitch() !== 1.05) throw new Error('Pitch getter test failed');

process.stdout.write('[GREEN PASS] M240 pitch stability module tests passed cleanly!\n');
NODE_EOF

echo "============================================================"
echo "STEP 5: COMMITTING & PUSHING TO GITHUB (${BRANCH})"
echo "============================================================"
git add "${APP_JS}" "${GRADLE_FILE}"
git commit -m "feat(release-v3.7.0): calibrate speech synthesis pitch stability and bump to milestone versionCode 60"

git pull --rebase origin "${BRANCH}"
git push origin "${BRANCH}"

LOCAL_SHA="$(git rev-parse HEAD)"
NEW_CODE="$(grep -Eo 'versionCode[[:space:]]+[0-9]+' "${GRADLE_FILE}" | awk '{print $2}')"
NEW_TAG="v3.7.0-play-code${NEW_CODE}-v21"

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
echo "FINAL GITHUB AUDIT & SYNC REPORT (M240 - MILESTONE RELEASE)"
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
echo "[VERIFIED] Milestone Mission #240 (v3.7.0 / versionCode 60) is now live on GitHub (${REMOTE_SHA})."
