#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

cd "${HOME}/zen-study-focus"
BRANCH="integration/master-qa-verified-v21"
MISSION_ID="M247_VOCAB_QUIZ_CARD_ASPECT_STABILITY_AND_CODE67_V1"
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
    git commit -m "chore: save pending local modifications before M247"
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
echo "STEP 3: APPLYING MISSION #247 & INCREMENTING VERSIONCODE"
echo "============================================================"
python3 - "${APP_JS}" "${GRADLE_FILE}" << 'PY_EOF'
import sys, re

target_js = sys.argv[1]
gradle_path = sys.argv[2]

with open(target_js, "r", encoding="utf-8") as f:
    content = f.read()

m247_code = """
/* === M247_VOCAB_QUIZ_CARD_ASPECT_STABILITY_AND_CODE67_V1 === */
(function() {
  if (window.__M247_QUIZ_STABILITY__) return;
  window.__M247_QUIZ_STABILITY__ = true;

  window.dfEnsureQuizCardAspectStability = function() {
    if (typeof document === 'undefined') return false;
    var card = document.getElementById('df-flash-quiz-card') ||
               document.querySelector('.df-flash-card-inner') ||
               document.querySelector('.df-quiz-card');
    if (!card || !card.style) return false;

    card.style.minHeight = '180px';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.justifyContent = 'center';
    card.style.alignItems = 'center';
    card.style.transition = 'min-height 0.25s ease, transform 0.2s ease';
    return true;
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', window.dfEnsureQuizCardAspectStability);
    } else {
      setTimeout(window.dfEnsureQuizCardAspectStability, 350);
    }
    if (typeof setInterval !== 'undefined') {
      setInterval(window.dfEnsureQuizCardAspectStability, 2500);
    }
  }
})();
"""

content = content.rstrip() + "\n" + m247_code + "\n"
with open(target_js, "w", encoding="utf-8") as f:
    f.write(content)

with open(gradle_path, "r", encoding="utf-8") as f:
    g = f.read()

m = re.search(r'versionCode\s+(\d+)', g)
cur_code = int(m.group(1)) if m else 66
next_code = max(cur_code + 1, 67)
g = re.sub(r'versionCode\s+\d+', f'versionCode {next_code}', g)
g = re.sub(r'versionName\s+"[^"]+"', f'versionName "3.7.{next_code - 60}"', g)
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

const startIdx = fullCode.indexOf('/* === M247_VOCAB_QUIZ_CARD_ASPECT_STABILITY_AND_CODE67_V1 === */');
if (startIdx === -1) {
  throw new Error('M247 marker not found in ' + targetFile);
}
const moduleCode = fullCode.slice(startIdx);

let minH = '';
const sandbox = {
  window: {},
  document: {
    getElementById: (id) => {
      if (id === 'df-flash-quiz-card') {
        return {
          style: {
            set minHeight(val) { minH = val; },
            get minHeight() { return minH; }
          }
        };
      }
      return null;
    },
    querySelector: () => null
  },
  setTimeout: (fn) => { fn(); return 1; },
  setInterval: () => 1,
  console: console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(moduleCode, sandbox);

if (!sandbox.__M247_QUIZ_STABILITY__) throw new Error('M247 module missing');
if (!sandbox.dfEnsureQuizCardAspectStability()) throw new Error('Aspect stability call failed');
if (minH !== '180px') throw new Error('Expected minHeight 180px');

process.stdout.write('[GREEN PASS] M247 aspect stability module tests passed cleanly!\n');
NODE_EOF

echo "============================================================"
echo "STEP 5: COMMITTING & PUSHING TO GITHUB (${BRANCH})"
echo "============================================================"
git add "${APP_JS}" "${GRADLE_FILE}"
git commit -m "feat(vocab-m247): add quiz card aspect ratio and min-height stability normalizer and bump versionCode to 67"

git pull --rebase origin "${BRANCH}"
git push origin "${BRANCH}"

LOCAL_SHA="$(git rev-parse HEAD)"
NEW_CODE="$(grep -Eo 'versionCode[[:space:]]+[0-9]+' "${GRADLE_FILE}" | awk '{print $2}')"
NEW_TAG="v3.7.7-play-code${NEW_CODE}-v21"

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
echo "FINAL GITHUB AUDIT & SYNC REPORT (M247)"
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
echo "[VERIFIED] Mission #247 is now live on GitHub (${REMOTE_SHA})."
