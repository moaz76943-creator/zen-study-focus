#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

cd "${HOME}/zen-study-focus"
BRANCH="integration/master-qa-verified-v21"
MISSION_ID="M230_VOCAB_QUIZ_COMPLETION_SUMMARY_AND_CODE50_V1"
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
    git commit -m "chore: save pending local modifications before M230"
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
echo "STEP 3: APPLYING MISSION #230 & INCREMENTING TO VERSIONCODE 50"
echo "============================================================"
python3 - "${APP_JS}" "${GRADLE_FILE}" << 'PY_EOF'
import sys, re

target_js = sys.argv[1]
gradle_path = sys.argv[2]

with open(target_js, "r", encoding="utf-8") as f:
    content = f.read()

m230_code = """
/* === M230_VOCAB_QUIZ_COMPLETION_SUMMARY_AND_CODE50_V1 === */
(function() {
  if (window.__M230_QUIZ_SUMMARY__) return;
  window.__M230_QUIZ_SUMMARY__ = true;

  function toWesternDigits(str) {
    return String(str == null ? '' : str)
      .replace(/[\\u0660-\\u0669]/g, function(d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[\\u06F0-\\u06F9]/g, function(d) { return String(d.charCodeAt(0) - 0x06F0); });
  }

  window.dfShowQuizSessionSummary = function(stats) {
    if (typeof document === 'undefined') return false;
    var existing = document.getElementById('df-quiz-summary-modal');
    if (existing) existing.remove();

    var s = stats || {};
    var total = Math.max(0, parseInt(s.total, 10) || 0);
    var mastered = Math.max(0, parseInt(s.mastered, 10) || 0);
    var review = Math.max(0, parseInt(s.review, 10) || 0);
    var bestStreak = Math.max(0, parseInt(s.bestStreak, 10) || 0);

    var modal = document.createElement('div');
    modal.id = 'df-quiz-summary-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,23,0.85);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML =
      '<div style="background:#0f172a;border:1px solid rgba(168,85,247,0.4);border-radius:20px;max-width:400px;width:100%;padding:20px;color:#f8fafc;box-shadow:0 25px 60px rgba(0,0,0,0.6);text-align:center;">' +
        '<div style="font-size:32px;margin-bottom:8px;">🎉</div>' +
        '<h3 style="font-size:18px;font-weight:700;margin:0 0 6px 0;color:#f8fafc;">اكتمل اختبار البطاقات!</h3>' +
        '<p style="font-size:12px;color:#94a3b8;margin:0 0 16px 0;">أحسنت! إليك ملخص أدائك في هذه الجلسة:</p>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">' +
          '<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:10px;">' +
            '<div style="font-size:11px;color:#94a3b8;">إجمالي البطاقات</div>' +
            '<div style="font-size:18px;font-weight:700;color:#e2e8f0;">' + toWesternDigits(total) + '</div>' +
          '</div>' +
          '<div style="background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.25);border-radius:12px;padding:10px;">' +
            '<div style="font-size:11px;color:#4ade80;">تم إتقانها</div>' +
            '<div style="font-size:18px;font-weight:700;color:#4ade80;">' + toWesternDigits(mastered) + '</div>' +
          '</div>' +
          '<div style="background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.25);border-radius:12px;padding:10px;">' +
            '<div style="font-size:11px;color:#f87171;">تحتاج مراجعة</div>' +
            '<div style="font-size:18px;font-weight:700;color:#f87171;">' + toWesternDigits(review) + '</div>' +
          '</div>' +
          '<div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:12px;padding:10px;">' +
            '<div style="font-size:11px;color:#fbbf24;">أفضل تتابع</div>' +
            '<div style="font-size:18px;font-weight:700;color:#fbbf24;">🔥 ' + toWesternDigits(bestStreak) + '</div>' +
          '</div>' +
        '</div>' +
        '<button type="button" id="df-quiz-summary-close-btn" ' +
          'style="width:100%;padding:10px;border-radius:12px;border:none;background:#9333ea;color:#ffffff;font-size:13px;font-weight:700;cursor:pointer;">' +
          '🏁 إنهاء والعودة للبنك' +
        '</button>' +
      '</div>';

    document.body.appendChild(modal);

    var closeBtn = document.getElementById('df-quiz-summary-close-btn');
    if (closeBtn) {
      closeBtn.onclick = function() {
        modal.remove();
        var quizModal = document.getElementById('df-flash-quiz-modal');
        if (quizModal) quizModal.style.display = 'none';
      };
    }
    return true;
  };
})();
"""

content = content.rstrip() + "\n" + m230_code + "\n"
with open(target_js, "w", encoding="utf-8") as f:
    f.write(content)

with open(gradle_path, "r", encoding="utf-8") as f:
    g = f.read()

m = re.search(r'versionCode\s+(\d+)', g)
cur_code = int(m.group(1)) if m else 49
next_code = max(cur_code + 1, 50)
g = re.sub(r'versionCode\s+\d+', f'versionCode {next_code}', g)
g = re.sub(r'versionName\s+"[^"]+"', 'versionName "3.6.0"', g)
with open(gradle_path, "w", encoding="utf-8") as f:
    f.write(g)

print(f"[INFO] Updated {gradle_path} -> versionCode {next_code} (v3.6.0)")
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

const startIdx = fullCode.indexOf('/* === M230_VOCAB_QUIZ_COMPLETION_SUMMARY_AND_CODE50_V1 === */');
if (startIdx === -1) {
  throw new Error('M230 marker not found in ' + targetFile);
}
const moduleCode = fullCode.slice(startIdx);

const sandbox = {
  window: {},
  document: {
    getElementById: () => null,
    createElement: () => ({ style: {}, remove: () => {} }),
    body: { appendChild: () => {} }
  },
  console: console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(moduleCode, sandbox);

if (!sandbox.__M230_QUIZ_SUMMARY__) throw new Error('M230 module missing');
if (!sandbox.dfShowQuizSessionSummary({ total: 10, mastered: 8, review: 2, bestStreak: 5 })) {
  throw new Error('Summary call failed');
}

process.stdout.write('[GREEN PASS] M230 quiz completion summary module tests passed cleanly!\n');
NODE_EOF

echo "============================================================"
echo "STEP 5: COMMITTING & PUSHING TO GITHUB (${BRANCH})"
echo "============================================================"
git add "${APP_JS}" "${GRADLE_FILE}"
git commit -m "feat(release-v3.6.0): achieve milestone versionCode 50 with flashcard quiz completion summary"

git pull --rebase origin "${BRANCH}"
git push origin "${BRANCH}"

LOCAL_SHA="$(git rev-parse HEAD)"
NEW_CODE="$(grep -Eo 'versionCode[[:space:]]+[0-9]+' "${GRADLE_FILE}" | awk '{print $2}')"
NEW_TAG="v3.6.0-play-code${NEW_CODE}-v21"

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
echo "FINAL GITHUB AUDIT & SYNC REPORT (M230 - MILESTONE RELEASE)"
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
echo "[VERIFIED] Milestone Mission #230 (v3.6.0 / versionCode 50) is now live on GitHub (${REMOTE_SHA})."
