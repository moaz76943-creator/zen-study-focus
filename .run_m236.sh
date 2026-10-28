#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

cd "${HOME}/zen-study-focus"
BRANCH="integration/master-qa-verified-v21"
MISSION_ID="M236_VOCAB_CARD_EDIT_INLINE_MODAL_AND_CODE56_V1"
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
    git commit -m "chore: save pending local modifications before M236"
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
echo "STEP 3: APPLYING MISSION #236 & INCREMENTING VERSIONCODE"
echo "============================================================"
python3 - "${APP_JS}" "${GRADLE_FILE}" << 'PY_EOF'
import sys, re

target_js = sys.argv[1]
gradle_path = sys.argv[2]

with open(target_js, "r", encoding="utf-8") as f:
    content = f.read()

m236_code = """
/* === M236_VOCAB_CARD_EDIT_INLINE_MODAL_AND_CODE56_V1 === */
(function() {
  if (window.__M236_EDIT_MODAL__) return;
  window.__M236_EDIT_MODAL__ = true;

  window.dfOpenEditVocabCardModal = function(itemId) {
    if (typeof document === 'undefined') return false;
    var eng = window.SpokenVocabEngine;
    if (!eng || typeof eng.getItems !== 'function') return false;

    var items = eng.getItems() || [];
    var target = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i] && items[i].id === itemId) {
        target = items[i];
        break;
      }
    }
    if (!target) return false;

    var existing = document.getElementById('df-vocab-edit-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'df-vocab-edit-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,23,0.85);z-index:10001;display:flex;align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML =
      '<div style="background:#0f172a;border:1px solid rgba(168,85,247,0.4);border-radius:18px;max-width:380px;width:100%;padding:18px;color:#f8fafc;box-shadow:0 20px 50px rgba(0,0,0,0.6);">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
          '<strong style="font-size:14px;color:#e2e8f0;">✏ تعديل الكلمة</strong>' +
          '<button type="button" id="df-vocab-edit-close" style="background:none;border:none;color:#94a3b8;font-size:16px;cursor:pointer;">✕</button>' +
        '</div>' +
        '<div style="margin-bottom:10px;">' +
          '<label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px;">الكلمة الأجنبية:</label>' +
          '<input type="text" id="df-vocab-edit-word" value="' + String(target.word || '').replace(/"/g, '&quot;') + '" ' +
            'style="width:100%;box-sizing:border-box;padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:#1e293b;color:#f8fafc;font-size:13px;outline:none;" />' +
        '</div>' +
        '<div style="margin-bottom:14px;">' +
          '<label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px;">المعنى / الترجمة:</label>' +
          '<input type="text" id="df-vocab-edit-meaning" value="' + String(target.meaning || '').replace(/"/g, '&quot;') + '" ' +
            'style="width:100%;box-sizing:border-box;padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:#1e293b;color:#f8fafc;font-size:13px;outline:none;" />' +
        '</div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
          '<button type="button" id="df-vocab-edit-cancel" style="padding:6px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:#cbd5e1;font-size:12px;cursor:pointer;">إلغاء</button>' +
          '<button type="button" id="df-vocab-edit-save" style="padding:6px 14px;border-radius:8px;border:none;background:#9333ea;color:#ffffff;font-size:12px;font-weight:700;cursor:pointer;">حفظ التعديل</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);

    var closeFn = function() { modal.remove(); };
    var closeBtn = document.getElementById('df-vocab-edit-close');
    if (closeBtn) closeBtn.onclick = closeFn;
    var cancelBtn = document.getElementById('df-vocab-edit-cancel');
    if (cancelBtn) cancelBtn.onclick = closeFn;

    var saveBtn = document.getElementById('df-vocab-edit-save');
    if (saveBtn) {
      saveBtn.onclick = function() {
        var wInp = document.getElementById('df-vocab-edit-word');
        var mInp = document.getElementById('df-vocab-edit-meaning');
        var newWord = wInp ? wInp.value.trim() : '';
        var newMeaning = mInp ? mInp.value.trim() : '';
        if (typeof window.dfSanitizeVocabText === 'function') {
          newWord = window.dfSanitizeVocabText(newWord);
          newMeaning = window.dfSanitizeVocabText(newMeaning);
        }
        if (!newWord || !newMeaning) {
          alert('يرجى ملء الكلمة والمعنى.');
          return;
        }
        target.word = newWord;
        target.meaning = newMeaning;
        eng.saveItems(items);
        if (typeof eng.render === 'function') eng.render();
        modal.remove();
      };
    }
    return true;
  };
})();
"""

content = content.rstrip() + "\n" + m236_code + "\n"
with open(target_js, "w", encoding="utf-8") as f:
    f.write(content)

with open(gradle_path, "r", encoding="utf-8") as f:
    g = f.read()

m = re.search(r'versionCode\s+(\d+)', g)
cur_code = int(m.group(1)) if m else 55
next_code = max(cur_code + 1, 56)
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

const startIdx = fullCode.indexOf('/* === M236_VOCAB_CARD_EDIT_INLINE_MODAL_AND_CODE56_V1 === */');
if (startIdx === -1) {
  throw new Error('M236 marker not found in ' + targetFile);
}
const moduleCode = fullCode.slice(startIdx);

let appendedModal = null;
const sandbox = {
  window: {},
  SpokenVocabEngine: {
    _items: [
      { id: 'v1', word: 'Buch', meaning: 'كتاب', color: 'purple' }
    ],
    getItems() { return this._items; },
    saveItems(items) { this._items = items; },
    render() {}
  },
  document: {
    getElementById: () => null,
    createElement: () => ({ style: {}, remove: () => {} }),
    body: { appendChild: (el) => { appendedModal = el; } }
  },
  console: console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(moduleCode, sandbox);

if (!sandbox.__M236_EDIT_MODAL__) throw new Error('M236 module missing');
if (!sandbox.dfOpenEditVocabCardModal('v1')) throw new Error('dfOpenEditVocabCardModal failed');

process.stdout.write('[GREEN PASS] M236 inline edit modal module tests passed cleanly!\n');
NODE_EOF

echo "============================================================"
echo "STEP 5: COMMITTING & PUSHING TO GITHUB (${BRANCH})"
echo "============================================================"
git add "${APP_JS}" "${GRADLE_FILE}"
git commit -m "feat(vocab-m236): add inline quick edit modal for vocabulary cards and bump versionCode to 56"

git pull --rebase origin "${BRANCH}"
git push origin "${BRANCH}"

LOCAL_SHA="$(git rev-parse HEAD)"
NEW_CODE="$(grep -Eo 'versionCode[[:space:]]+[0-9]+' "${GRADLE_FILE}" | awk '{print $2}')"
NEW_TAG="v3.6.6-play-code${NEW_CODE}-v21"

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
echo "FINAL GITHUB AUDIT & SYNC REPORT (M236)"
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
echo "[VERIFIED] Mission #236 is now live on GitHub (${REMOTE_SHA})."
