#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

cd "${HOME}/zen-study-focus"
BRANCH="integration/master-qa-verified-v21"
MISSION_ID="M227_VOCAB_QUIZ_AUTO_PRONOUNCE_QUESTION_AND_CODE47_V1"
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
    git commit -m "chore: save pending local modifications before M227"
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
echo "STEP 3: APPLYING MISSION #227 & INCREMENTING VERSIONCODE"
echo "============================================================"
python3 - "${APP_JS}" "${GRADLE_FILE}" << 'PY_EOF'
import sys, re

target_js = sys.argv[1]
gradle_path = sys.argv[2]

with open(target_js, "r", encoding="utf-8") as f:
    content = f.read()

m227_code = """
/* === M227_VOCAB_QUIZ_AUTO_PRONOUNCE_QUESTION_AND_CODE47_V1 === */
(function() {
  if (window.__M227_QUIZ_AUTO_PRONOUNCE__) return;
  window.__M227_QUIZ_AUTO_PRONOUNCE__ = true;

  var AUTO_PRONOUNCE_KEY = 'df_vocab_quiz_auto_pronounce';
  var autoPronounce = false;
  try {
    autoPronounce = localStorage.getItem(AUTO_PRONOUNCE_KEY) === 'true';
  } catch(e) {}

  window.dfToggleQuizAutoPronounce = function() {
    autoPronounce = !autoPronounce;
    try {
      localStorage.setItem(AUTO_PRONOUNCE_KEY, autoPronounce ? 'true' : 'false');
    } catch(e) {}
    var btn = document.getElementById('df-quiz-auto-pronounce-btn');
    if (btn) {
      btn.style.background = autoPronounce ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.06)';
      btn.style.borderColor = autoPronounce ? '#38bdf8' : 'rgba(255,255,255,0.15)';
      btn.style.color = autoPronounce ? '#ffffff' : '#94a3b8';
      btn.textContent = autoPronounce ? '🔊 نطق تلقائي: مفعّل' : '🔊 نطق تلقائي: معطّل';
    }
    return autoPronounce;
  };

  window.dfIsQuizAutoPronounceEnabled = function() {
    return autoPronounce;
  };

  window.dfOnQuizCardDisplayed = function(wordText) {
    if (!autoPronounce || !wordText) return;
    setTimeout(function() {
      if (typeof window.dfReplayCurrentQuizWord === 'function') {
        window.dfReplayCurrentQuizWord();
      } else {
        var eng = window.SpokenVocabEngine;
        if (eng && typeof eng.speakWord === 'function') {
          eng.speakWord(wordText);
        }
      }
    }, 200);
  };

  function mountAutoPronounceBtn() {
    if (typeof document === 'undefined') return;
    var toolbar = document.getElementById('df-quiz-extra-toolbar');
    if (!toolbar || document.getElementById('df-quiz-auto-pronounce-btn')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'df-quiz-auto-pronounce-btn';
    btn.style.cssText = 'padding:6px 10px;border-radius:8px;border:1px solid ' +
      (autoPronounce ? '#38bdf8' : 'rgba(255,255,255,0.15)') + ';background:' +
      (autoPronounce ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.06)') + ';color:' +
      (autoPronounce ? '#ffffff' : '#94a3b8') + ';font-size:12px;font-weight:600;cursor:pointer;';
    btn.textContent = autoPronounce ? '🔊 نطق تلقائي: مفعّل' : '🔊 نطق تلقائي: معطّل';
    btn.onclick = function() { window.dfToggleQuizAutoPronounce(); };
    toolbar.appendChild(btn);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountAutoPronounceBtn);
    } else {
      setTimeout(mountAutoPronounceBtn, 350);
    }
    setInterval(mountAutoPronounceBtn, 2500);
  }
})();
"""

content = content.rstrip() + "\n" + m227_code + "\n"
with open(target_js, "w", encoding="utf-8") as f:
    f.write(content)

with open(gradle_path, "r", encoding="utf-8") as f:
    g = f.read()

m = re.search(r'versionCode\s+(\d+)', g)
cur_code = int(m.group(1)) if m else 46
next_code = max(cur_code + 1, 47)
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

const startIdx = fullCode.indexOf('/* === M227_VOCAB_QUIZ_AUTO_PRONOUNCE_QUESTION_AND_CODE47_V1 === */');
if (startIdx === -1) {
  throw new Error('M227 marker not found in ' + targetFile);
}
const moduleCode = fullCode.slice(startIdx);

const sandbox = {
  window: {},
  document: {
    readyState: 'complete',
    getElementById: () => null,
    addEventListener: () => {}
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  setTimeout: (fn) => { fn(); return 1; },
  console: console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(moduleCode, sandbox);

if (!sandbox.__M227_QUIZ_AUTO_PRONOUNCE__) throw new Error('M227 module missing');
if (sandbox.dfIsQuizAutoPronounceEnabled() !== false) throw new Error('Default must be false');
sandbox.dfToggleQuizAutoPronounce();
if (sandbox.dfIsQuizAutoPronounceEnabled() !== true) throw new Error('Toggle failed');

process.stdout.write('[GREEN PASS] M227 auto pronounce module tests passed cleanly!\n');
NODE_EOF

echo "============================================================"
echo "STEP 5: COMMITTING & PUSHING TO GITHUB (${BRANCH})"
echo "============================================================"
git add "${APP_JS}" "${GRADLE_FILE}"
git commit -m "feat(vocab-m227): add auto-pronounce question on flashcard display toggle and bump versionCode to 47"

git pull --rebase origin "${BRANCH}"
git push origin "${BRANCH}"

LOCAL_SHA="$(git rev-parse HEAD)"
NEW_CODE="$(grep -Eo 'versionCode[[:space:]]+[0-9]+' "${GRADLE_FILE}" | awk '{print $2}')"
NEW_TAG="v3.5.${NEW_CODE}-m227-v21"

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
echo "FINAL GITHUB AUDIT & SYNC REPORT (M227)"
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
echo "[VERIFIED] Mission #227 is now live on GitHub (${REMOTE_SHA})."
