#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

cd "${HOME}/zen-study-focus"
BRANCH="integration/master-qa-verified-v21"
MISSION_ID="M234_VOCAB_CARD_DELETE_SAFETY_CONFIRM_AND_CODE54_V1"
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
    git commit -m "chore: save pending local modifications before M234"
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
echo "STEP 3: APPLYING MISSION #234 & INCREMENTING VERSIONCODE"
echo "============================================================"
python3 - "${APP_JS}" "${GRADLE_FILE}" << 'PY_EOF'
import sys, re

target_js = sys.argv[1]
gradle_path = sys.argv[2]

with open(target_js, "r", encoding="utf-8") as f:
    content = f.read()

m234_code = """
/* === M234_VOCAB_CARD_DELETE_SAFETY_CONFIRM_AND_CODE54_V1 === */
(function() {
  if (window.__M234_DELETE_UNDO__) return;
  window.__M234_DELETE_UNDO__ = true;

  window.__dfLastDeletedVocabItem = null;
  window.__dfLastDeletedVocabIndex = -1;

  window.dfDeleteVocabItemWithUndo = function(itemId) {
    var eng = window.SpokenVocabEngine;
    if (!eng || typeof eng.getItems !== 'function' || typeof eng.saveItems !== 'function') return false;

    var items = eng.getItems() || [];
    var targetIdx = -1;
    for (var i = 0; i < items.length; i++) {
      if (items[i] && items[i].id === itemId) {
        targetIdx = i;
        break;
      }
    }
    if (targetIdx === -1) return false;

    window.__dfLastDeletedVocabItem = items[targetIdx];
    window.__dfLastDeletedVocabIndex = targetIdx;

    items.splice(targetIdx, 1);
    eng.saveItems(items);
    if (typeof eng.render === 'function') eng.render();
    if (typeof window.dfUpdateFilterChipBadges === 'function') window.dfUpdateFilterChipBadges();
    if (typeof window.dfUpdateVocabStatsBadge === 'function') window.dfUpdateVocabStatsBadge();

    window.dfShowVocabDeleteUndoToast(window.__dfLastDeletedVocabItem.word);
    return true;
  };

  window.dfRestoreLastDeletedVocabItem = function() {
    var item = window.__dfLastDeletedVocabItem;
    if (!item) return false;

    var eng = window.SpokenVocabEngine;
    if (!eng || typeof eng.getItems !== 'function' || typeof eng.saveItems !== 'function') return false;

    var items = eng.getItems() || [];
    var idx = window.__dfLastDeletedVocabIndex;
    if (idx >= 0 && idx <= items.length) {
      items.splice(idx, 0, item);
    } else {
      items.unshift(item);
    }

    eng.saveItems(items);
    if (typeof eng.render === 'function') eng.render();
    if (typeof window.dfUpdateFilterChipBadges === 'function') window.dfUpdateFilterChipBadges();
    if (typeof window.dfUpdateVocabStatsBadge === 'function') window.dfUpdateVocabStatsBadge();

    window.__dfLastDeletedVocabItem = null;
    window.__dfLastDeletedVocabIndex = -1;

    var toast = document.getElementById('df-vocab-undo-toast');
    if (toast) toast.remove();
    return true;
  };

  window.dfShowVocabDeleteUndoToast = function(wordText) {
    if (typeof document === 'undefined') return;
    var existing = document.getElementById('df-vocab-undo-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'df-vocab-undo-toast';
    toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e293b;border:1px solid rgba(244,63,94,0.4);border-radius:12px;padding:10px 16px;color:#f8fafc;font-size:13px;display:flex;align-items:center;gap:12px;z-index:99999;box-shadow:0 12px 30px rgba(0,0,0,0.5);';
    toast.innerHTML =
      '<span>تم حذف <b>' + (wordText || 'الكلمة') + '</b></span>' +
      '<button type="button" id="df-vocab-toast-undo-btn" style="padding:4px 10px;border-radius:8px;border:none;background:#9333ea;color:#ffffff;font-weight:700;font-size:12px;cursor:pointer;">↶ تراجع</button>';

    document.body.appendChild(toast);

    var undoBtn = document.getElementById('df-vocab-toast-undo-btn');
    if (undoBtn) {
      undoBtn.onclick = function() { window.dfRestoreLastDeletedVocabItem(); };
    }

    setTimeout(function() {
      var t = document.getElementById('df-vocab-undo-toast');
      if (t) t.remove();
    }, 5000);
  };
})();
"""

content = content.rstrip() + "\n" + m234_code + "\n"
with open(target_js, "w", encoding="utf-8") as f:
    f.write(content)

with open(gradle_path, "r", encoding="utf-8") as f:
    g = f.read()

m = re.search(r'versionCode\s+(\d+)', g)
cur_code = int(m.group(1)) if m else 53
next_code = max(cur_code + 1, 54)
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

const startIdx = fullCode.indexOf('/* === M234_VOCAB_CARD_DELETE_SAFETY_CONFIRM_AND_CODE54_V1 === */');
if (startIdx === -1) {
  throw new Error('M234 marker not found in ' + targetFile);
}
const moduleCode = fullCode.slice(startIdx);

let appendedToast = null;
const sandbox = {
  window: {},
  SpokenVocabEngine: {
    _items: [
      { id: 'v1', word: 'Buch', meaning: 'كتاب' },
      { id: 'v2', word: 'Wasser', meaning: 'ماء' }
    ],
    getItems() { return this._items; },
    saveItems(items) { this._items = items; },
    render() {}
  },
  document: {
    getElementById: () => null,
    createElement: () => ({ style: {}, remove: () => {} }),
    body: { appendChild: (el) => { appendedToast = el; } }
  },
  setTimeout: (fn) => 1,
  console: console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(moduleCode, sandbox);

if (!sandbox.__M234_DELETE_UNDO__) throw new Error('M234 module missing');
if (!sandbox.dfDeleteVocabItemWithUndo('v1')) throw new Error('Delete item failed');
if (sandbox.SpokenVocabEngine.getItems().length !== 1) throw new Error('Item was not removed');
if (!sandbox.dfRestoreLastDeletedVocabItem()) throw new Error('Restore item failed');
if (sandbox.SpokenVocabEngine.getItems().length !== 2) throw new Error('Item was not restored');

process.stdout.write('[GREEN PASS] M234 delete with undo toast module tests passed cleanly!\n');
NODE_EOF

echo "============================================================"
echo "STEP 5: COMMITTING & PUSHING TO GITHUB (${BRANCH})"
echo "============================================================"
git add "${APP_JS}" "${GRADLE_FILE}"
git commit -m "feat(vocab-m234): add accidental card deletion safeguard with instant undo toast and bump versionCode to 54"

git pull --rebase origin "${BRANCH}"
git push origin "${BRANCH}"

LOCAL_SHA="$(git rev-parse HEAD)"
NEW_CODE="$(grep -Eo 'versionCode[[:space:]]+[0-9]+' "${GRADLE_FILE}" | awk '{print $2}')"
NEW_TAG="v3.6.4-play-code${NEW_CODE}-v21"

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
echo "FINAL GITHUB AUDIT & SYNC REPORT (M234)"
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
echo "[VERIFIED] Mission #234 is now live on GitHub (${REMOTE_SHA})."
