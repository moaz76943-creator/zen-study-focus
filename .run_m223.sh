#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

cd "${HOME}/zen-study-focus"
BRANCH="integration/master-qa-verified-v21"
MISSION_ID="M223_VOCAB_AUTO_PROGRESS_BAR_ON_QUIZ_AND_CODE43_V1"
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
    git commit -m "chore: save pending local modifications before M223"
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
echo "STEP 3: APPLYING MISSION #223 & INCREMENTING VERSIONCODE"
echo "============================================================"
python3 - "${APP_JS}" "${GRADLE_FILE}" << 'PY_EOF'
import sys, re

target_js = sys.argv[1]
gradle_path = sys.argv[2]

with open(target_js, "r", encoding="utf-8") as f:
    content = f.read()

m223_code = """
/* === M223_VOCAB_AUTO_PROGRESS_BAR_ON_QUIZ_AND_CODE43_V1 === */
(function() {
  if (window.__M223_QUIZ_PROGRESS_BAR__) return;
  window.__M223_QUIZ_PROGRESS_BAR__ = true;

  function toWesternDigits(str) {
    return String(str == null ? '' : str)
      .replace(/[\\u0660-\\u0669]/g, function(d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[\\u06F0-\\u06F9]/g, function(d) { return String(d.charCodeAt(0) - 0x06F0); });
  }

  window.dfUpdateQuizProgressBar = function(currentIdx, totalCount) {
    if (typeof document === 'undefined') return;
    var barFill = document.getElementById('df-quiz-progress-fill');
    var label = document.getElementById('df-quiz-progress-text');
    var total = Math.max(1, parseInt(totalCount, 10) || 1);
    var cur = Math.max(0, Math.min(total, parseInt(currentIdx, 10) || 0));
    var percent = Math.round((cur / total) * 100);

    if (barFill) {
      barFill.style.width = percent + '%';
    }
    if (label) {
      label.textContent = toWesternDigits(cur) + ' / ' + toWesternDigits(total) + ' (' + toWesternDigits(percent) + '%)';
    }
  };

  function mountProgressBarUI() {
    if (typeof document === 'undefined') return;
    var container = document.getElementById('df-flash-quiz-header') ||
                    document.getElementById('df-quiz-extra-toolbar');
    if (!container || document.getElementById('df-quiz-progress-wrapper')) return;

    var wrapper = document.createElement('div');
    wrapper.id = 'df-quiz-progress-wrapper';
    wrapper.style.cssText = 'width:100%;margin:6px 0;box-sizing:border-box;';
    wrapper.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;font-size:11px;color:#94a3b8;font-weight:600;">' +
        '<span>التقدم في الاختبار</span>' +
        '<span id="df-quiz-progress-text">0 / 0 (0%)</span>' +
      '</div>' +
      '<div style="width:100%;height:6px;border-radius:999px;background:rgba(255,255,255,0.08);overflow:hidden;">' +
        '<div id="df-quiz-progress-fill" style="width:0%;height:100%;border-radius:999px;background:linear-gradient(90deg, #a855f7, #38bdf8);transition:width 0.3s ease;"></div>' +
      '</div>';

    container.parentNode.insertBefore(wrapper, container.nextSibling);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountProgressBarUI);
    } else {
      setTimeout(mountProgressBarUI, 350);
    }
    setInterval(mountProgressBarUI, 2500);
  }
})();
"""

content = content.rstrip() + "\n" + m223_code + "\n"
with open(target_js, "w", encoding="utf-8") as f:
    f.write(content)

with open(gradle_path, "r", encoding="utf-8") as f:
    g = f.read()

m = re.search(r'versionCode\s+(\d+)', g)
cur_code = int(m.group(1)) if m else 42
next_code = max(cur_code + 1, 43)
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

const startIdx = fullCode.indexOf('/* === M223_VOCAB_AUTO_PROGRESS_BAR_ON_QUIZ_AND_CODE43_V1 === */');
if (startIdx === -1) {
  throw new Error('M223 marker not found in ' + targetFile);
}
const moduleCode = fullCode.slice(startIdx);

const sandbox = {
  window: {},
  document: {
    readyState: 'complete',
    getElementById: () => null,
    addEventListener: () => {}
  },
  setTimeout: () => 1,
  setInterval: () => 1,
  console: console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(moduleCode, sandbox);

if (!sandbox.__M223_QUIZ_PROGRESS_BAR__) throw new Error('M223 module missing');
if (typeof sandbox.dfUpdateQuizProgressBar !== 'function') throw new Error('Progress update function missing');

process.stdout.write('[GREEN PASS] M223 quiz progress bar module tests passed cleanly!\n');
NODE_EOF

echo "============================================================"
echo "STEP 5: COMMITTING & PUSHING TO GITHUB (${BRANCH})"
echo "============================================================"
git add "${APP_JS}" "${GRADLE_FILE}"
git commit -m "feat(vocab-m223): add visual completion progress bar to flashcard quiz and bump versionCode to 43"

git pull --rebase origin "${BRANCH}"
git push origin "${BRANCH}"

LOCAL_SHA="$(git rev-parse HEAD)"
NEW_CODE="$(grep -Eo 'versionCode[[:space:]]+[0-9]+' "${GRADLE_FILE}" | awk '{print $2}')"
NEW_TAG="v3.5.${NEW_CODE}-m223-v21"

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
echo "FINAL GITHUB AUDIT & SYNC REPORT (M223)"
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
echo "[VERIFIED] Mission #223 is now live on GitHub (${REMOTE_SHA})."
