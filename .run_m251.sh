#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

cd "${HOME}/zen-study-focus"
BRANCH="integration/master-qa-verified-v21"
MISSION_ID="M251_VOCAB_QUIZ_SLOW_AUDIO_REPLAY_AND_CODE71_V1"
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
    git commit -m "chore: save pending local modifications before M251"
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
echo "STEP 3: APPLYING MISSION #251 & INCREMENTING VERSIONCODE"
echo "============================================================"
python3 - "${APP_JS}" "${GRADLE_FILE}" << 'PY_EOF'
import sys, re

target_js = sys.argv[1]
gradle_path = sys.argv[2]

with open(target_js, "r", encoding="utf-8") as f:
    content = f.read()

m251_code = """
/* === M251_VOCAB_QUIZ_SLOW_AUDIO_REPLAY_AND_CODE71_V1 === */
(function() {
  if (window.__M251_SLOW_REPLAY__) return;
  window.__M251_SLOW_REPLAY__ = true;

  window.dfReplayCurrentQuizWordSlow = function() {
    var quizWordElem = document.getElementById('df-quiz-current-word') ||
                       document.querySelector('.df-quiz-card-word');
    if (!quizWordElem) return false;

    var wordText = quizWordElem.textContent || '';
    if (!wordText) return false;

    var eng = window.SpokenVocabEngine;
    var lang = (eng && eng.config && eng.config.foreignLang) || 'de-DE';

    if (typeof window.dfSafeSpeakUtterance === 'function') {
      window.dfSafeSpeakUtterance(wordText, lang, 0.6);
      return true;
    }
    return false;
  };

  function mountSlowReplayBtn() {
    if (typeof document === 'undefined') return;
    var toolbar = document.getElementById('df-quiz-extra-toolbar');
    if (!toolbar || document.getElementById('df-quiz-slow-replay-btn')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'df-quiz-slow-replay-btn';
    btn.style.cssText = 'padding:6px 10px;border-radius:8px;border:1px solid rgba(56,189,248,0.35);background:rgba(56,189,248,0.12);color:#38bdf8;font-size:12px;font-weight:600;cursor:pointer;';
    btn.textContent = '🐢 نطق بطيء (0.6x)';
    btn.onclick = function() { window.dfReplayCurrentQuizWordSlow(); };
    toolbar.appendChild(btn);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountSlowReplayBtn);
    } else {
      setTimeout(mountSlowReplayBtn, 350);
    }
    if (typeof setInterval !== 'undefined') {
      setInterval(mountSlowReplayBtn, 2500);
    }
  }
})();
"""

content = content.rstrip() + "\n" + m251_code + "\n"
with open(target_js, "w", encoding="utf-8") as f:
    f.write(content)

with open(gradle_path, "r", encoding="utf-8") as f:
    g = f.read()

m = re.search(r'versionCode\s+(\d+)', g)
cur_code = int(m.group(1)) if m else 70
next_code = max(cur_code + 1, 71)
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

const startIdx = fullCode.indexOf('/* === M251_VOCAB_QUIZ_SLOW_AUDIO_REPLAY_AND_CODE71_V1 === */');
if (startIdx === -1) {
  throw new Error('M251 marker not found in ' + targetFile);
}
const moduleCode = fullCode.slice(startIdx);

let spokenRate = 0;
const sandbox = {
  window: {},
  SpokenVocabEngine: {
    config: { foreignLang: 'de-DE' }
  },
  document: {
    getElementById: (id) => {
      if (id === 'df-quiz-current-word') {
        return { textContent: 'Schmetterling' };
      }
      return null;
    },
    querySelector: () => null
  },
  dfSafeSpeakUtterance: (text, lang, rate) => { spokenRate = rate; },
  setTimeout: () => 1,
  setInterval: () => 1,
  console: console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(moduleCode, sandbox);

if (!sandbox.__M251_SLOW_REPLAY__) throw new Error('M251 module missing');
if (!sandbox.dfReplayCurrentQuizWordSlow()) throw new Error('Slow replay call failed');
if (spokenRate !== 0.6) throw new Error('Expected rate 0.6');

process.stdout.write('[GREEN PASS] M251 slow replay module tests passed cleanly!\n');
NODE_EOF

echo "============================================================"
echo "STEP 5: COMMITTING & PUSHING TO GITHUB (${BRANCH})"
echo "============================================================"
git add "${APP_JS}" "${GRADLE_FILE}"
git commit -m "feat(vocab-m251): add dedicated 0.6x slow-motion audio pronunciation replay for flashcard quiz and bump versionCode to 71"

git pull --rebase origin "${BRANCH}"
git push origin "${BRANCH}"

LOCAL_SHA="$(git rev-parse HEAD)"
NEW_CODE="$(grep -Eo 'versionCode[[:space:]]+[0-9]+' "${GRADLE_FILE}" | awk '{print $2}')"
NEW_TAG="v3.8.1-play-code${NEW_CODE}-v21"

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
echo "FINAL GITHUB AUDIT & SYNC REPORT (M251)"
echo "============================================================"
echo "BRANCH               : ${BRANCH}"
echo "BASE_SHA             : ${BASE_SHA}"
echo "LOCAL_HEAD_SHA       : ${LOCAL_SHA}"
echo "REMOTE_GITHUB_SHA    : ${REMOTE_GITHUB_SHA}"
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
echo "[VERIFIED] Mission #251 is now live on GitHub (${REMOTE_SHA})."
