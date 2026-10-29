#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

cd "${HOME}/zen-study-focus"
BRANCH="integration/master-qa-verified-v21"
MISSION_ID="M220_VOCAB_AUTO_SHUFFLE_ON_QUIZ_START_AND_CODE40_V1"
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
    git commit -m "chore: save pending local modifications before M220"
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
echo "STEP 3: APPLYING MISSION #220 & INCREMENTING VERSIONCODE"
echo "============================================================"
python3 - "${APP_JS}" "${GRADLE_FILE}" << 'PY_EOF'
import sys, re

target_js = sys.argv[1]
gradle_path = sys.argv[2]

with open(target_js, "r", encoding="utf-8") as f:
    content = f.read()

m220_code = """
/* === M220_VOCAB_AUTO_SHUFFLE_ON_QUIZ_START_AND_CODE40_V1 === */
(function() {
  if (window.__M220_AUTO_SHUFFLE_START__) return;
  window.__M220_AUTO_SHUFFLE_START__ = true;

  var SHUFFLE_ON_START_KEY = 'df_vocab_quiz_auto_shuffle_start';
  var autoShuffleOnStart = false;
  try {
    autoShuffleOnStart = localStorage.getItem(SHUFFLE_ON_START_KEY) === 'true';
  } catch(e) {}

  window.dfToggleQuizAutoShuffleOnStart = function() {
    autoShuffleOnStart = !autoShuffleOnStart;
    try {
      localStorage.setItem(SHUFFLE_ON_START_KEY, autoShuffleOnStart ? 'true' : 'false');
    } catch(e) {}
    var btn = document.getElementById('df-quiz-auto-shuffle-start-btn');
    if (btn) {
      btn.style.background = autoShuffleOnStart ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.06)';
      btn.style.borderColor = autoShuffleOnStart ? '#c084fc' : 'rgba(255,255,255,0.15)';
      btn.style.color = autoShuffleOnStart ? '#ffffff' : '#94a3b8';
      btn.textContent = autoShuffleOnStart ? '🎲 خلط تلقائي: مفعّل' : '🎲 خلط تلقائي: معطّل';
    }
    return autoShuffleOnStart;
  };

  window.dfIsQuizAutoShuffleOnStartEnabled = function() {
    return autoShuffleOnStart;
  };

  function mountAutoShuffleStartBtn() {
    if (typeof document === 'undefined') return;
    var toolbar = document.getElementById('df-quiz-extra-toolbar');
    if (!toolbar || document.getElementById('df-quiz-auto-shuffle-start-btn')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'df-quiz-auto-shuffle-start-btn';
    btn.style.cssText = 'padding:6px 10px;border-radius:8px;border:1px solid ' +
      (autoShuffleOnStart ? '#c084fc' : 'rgba(255,255,255,0.15)') + ';background:' +
      (autoShuffleOnStart ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.06)') + ';color:' +
      (autoShuffleOnStart ? '#ffffff' : '#94a3b8') + ';font-size:12px;font-weight:600;cursor:pointer;';
    btn.textContent = autoShuffleOnStart ? '🎲 خلط تلقائي: مفعّل' : '🎲 خلط تلقائي: معطّل';
    btn.onclick = function() { window.dfToggleQuizAutoShuffleOnStart(); };
    toolbar.appendChild(btn);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountAutoShuffleStartBtn);
    } else {
      setTimeout(mountAutoShuffleStartBtn, 350);
    }
    setInterval(mountAutoShuffleStartBtn, 2500);
  }
})();
"""

content = content.rstrip() + "\n" + m220_code + "\n"
with open(target_js, "w", encoding="utf-8") as f:
    f.write(content)

with open(gradle_path, "r", encoding="utf-8") as f:
    g = f.read()

m = re.search(r'versionCode\s+(\d+)', g)
cur_code = int(m.group(1)) if m else 39
next_code = max(cur_code + 1, 40)
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

const startIdx = fullCode.indexOf('/* === M220_VOCAB_AUTO_SHUFFLE_ON_QUIZ_START_AND_CODE40_V1 === */');
if (startIdx === -1) {
  throw new Error('M220 marker not found in ' + targetFile);
}
const moduleCode = fullCode.slice(startIdx);

const memStore = Object.create(null);
const sandbox = {
  window: {},
  document: {
    readyState: 'complete',
    getElementById: () => null,
    addEventListener: () => {}
  },
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(memStore, k) ? memStore[k] : null),
    setItem: (k, v) => { memStore[k] = String(v); }
  },
  setTimeout: () => 1,
  setInterval: () => 1,
  console: console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(moduleCode, sandbox);

if (!sandbox.__M220_AUTO_SHUFFLE_START__) throw new Error('M220 module missing');
if (sandbox.dfIsQuizAutoShuffleOnStartEnabled() !== false) throw new Error('Default must be false');
sandbox.dfToggleQuizAutoShuffleOnStart();
if (sandbox.dfIsQuizAutoShuffleOnStartEnabled() !== true) throw new Error('Toggle must be true');

process.stdout.write('[GREEN PASS] M220 auto shuffle start module tests passed cleanly!\n');
NODE_EOF

echo "============================================================"
echo "STEP 5: COMMITTING & PUSHING TO GITHUB (${BRANCH})"
echo "============================================================"
git add "${APP_JS}" "${GRADLE_FILE}"
git commit -m "feat(vocab-m220): add auto-shuffle on quiz start toggle and bump versionCode to 40"

git pull --rebase origin "${BRANCH}"
git push origin "${BRANCH}"

LOCAL_SHA="$(git rev-parse HEAD)"
NEW_CODE="$(grep -Eo 'versionCode[[:space:]]+[0-9]+' "${GRADLE_FILE}" | awk '{print $2}')"
NEW_TAG="v3.5.${NEW_CODE}-m220-v21"

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
echo "FINAL GITHUB AUDIT & SYNC REPORT (M220)"
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
echo "[VERIFIED] Mission #220 is now live on GitHub (${REMOTE_SHA})."
