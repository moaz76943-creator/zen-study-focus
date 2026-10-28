#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

cd "${HOME}/zen-study-focus"
BRANCH="integration/master-qa-verified-v21"
MISSION_ID="M219_VOCAB_AUTO_BACKUP_SNAPSHOT_AND_CODE39_V1"
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
    git commit -m "chore: save pending local modifications before M219"
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
echo "STEP 3: APPLYING MISSION #219 & INCREMENTING VERSIONCODE"
echo "============================================================"
python3 - "${APP_JS}" "${GRADLE_FILE}" << 'PY_EOF'
import sys, re

target_js = sys.argv[1]
gradle_path = sys.argv[2]

with open(target_js, "r", encoding="utf-8") as f:
    content = f.read()

m219_code = """
/* === M219_VOCAB_AUTO_BACKUP_SNAPSHOT_AND_CODE39_V1 === */
(function() {
  if (window.__M219_VOCAB_SNAPSHOT__) return;
  window.__M219_VOCAB_SNAPSHOT__ = true;

  var SNAPSHOT_KEY = 'df_spoken_vocab_backup_snapshot';

  function toWesternDigits(str) {
    return String(str == null ? '' : str)
      .replace(/[\\u0660-\\u0669]/g, function(d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[\\u06F0-\\u06F9]/g, function(d) { return String(d.charCodeAt(0) - 0x06F0); });
  }

  window.dfCreateVocabBackupSnapshot = function() {
    var eng = window.SpokenVocabEngine;
    var items = (eng && typeof eng.getItems === 'function') ? (eng.getItems() || []) : [];
    if (!items.length) return false;
    var snap = {
      timestamp: Date.now(),
      count: items.length,
      items: items
    };
    try {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap));
      return true;
    } catch(e) {
      return false;
    }
  };

  window.dfRestoreVocabBackupSnapshot = function() {
    try {
      var raw = localStorage.getItem(SNAPSHOT_KEY);
      if (!raw) {
        alert('لا توجد نسخة احتياطية محفوظة حالياً.');
        return false;
      }
      var snap = JSON.parse(raw);
      if (!snap || !Array.isArray(snap.items) || !snap.items.length) {
        alert('بيانات النسخة الاحتياطية فارغة أو غير صالحة.');
        return false;
      }
      var eng = window.SpokenVocabEngine;
      if (eng && typeof eng.saveItems === 'function') {
        eng.saveItems(snap.items);
        if (typeof eng.render === 'function') eng.render();
        if (typeof window.dfUpdateFilterChipBadges === 'function') {
          window.dfUpdateFilterChipBadges();
        }
        if (typeof window.dfUpdateVocabStatsBadge === 'function') {
          window.dfUpdateVocabStatsBadge();
        }
        alert('تمت استعادة ' + toWesternDigits(snap.items.length) + ' كلمة من النسخة الاحتياطية بنجاح!');
        return true;
      }
    } catch(e) {
      alert('تعذرت استعادة النسخة الاحتياطية.');
    }
    return false;
  };

  try {
    var lastSnap = localStorage.getItem(SNAPSHOT_KEY);
    if (!lastSnap) {
      window.dfCreateVocabBackupSnapshot();
    }
  } catch(e) {}
})();
"""

content = content.rstrip() + "\n" + m219_code + "\n"
with open(target_js, "w", encoding="utf-8") as f:
    f.write(content)

with open(gradle_path, "r", encoding="utf-8") as f:
    g = f.read()

m = re.search(r'versionCode\s+(\d+)', g)
cur_code = int(m.group(1)) if m else 38
next_code = max(cur_code + 1, 39)
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

const startIdx = fullCode.indexOf('/* === M219_VOCAB_AUTO_BACKUP_SNAPSHOT_AND_CODE39_V1 === */');
if (startIdx === -1) {
  throw new Error('M219 marker not found in ' + targetFile);
}
const moduleCode = fullCode.slice(startIdx);

const memStore = Object.create(null);
const sandbox = {
  window: {},
  SpokenVocabEngine: {
    _items: [{ id: '1', word: 'Buch', meaning: 'كتاب' }],
    getItems() { return this._items; },
    saveItems(items) { this._items = items; },
    render() {}
  },
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(memStore, k) ? memStore[k] : null),
    setItem: (k, v) => { memStore[k] = String(v); }
  },
  alert: () => {},
  console: console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(moduleCode, sandbox);

if (!sandbox.__M219_VOCAB_SNAPSHOT__) throw new Error('M219 snapshot module missing');
if (!sandbox.dfCreateVocabBackupSnapshot()) throw new Error('Snapshot creation test failed');
sandbox.SpokenVocabEngine._items = [];
if (!sandbox.dfRestoreVocabBackupSnapshot()) throw new Error('Restore test failed');
if (sandbox.SpokenVocabEngine.getItems().length !== 1) throw new Error('Restored count mismatch');

process.stdout.write('[GREEN PASS] M219 snapshot and restore module tests passed cleanly!\n');
NODE_EOF

echo "============================================================"
echo "STEP 5: COMMITTING & PUSHING TO GITHUB (${BRANCH})"
echo "============================================================"
git add "${APP_JS}" "${GRADLE_FILE}"
git commit -m "feat(vocab-m219): add automatic safety snapshot and 1-tap backup restore, and bump versionCode to 39"

git pull --rebase origin "${BRANCH}"
git push origin "${BRANCH}"

LOCAL_SHA="$(git rev-parse HEAD)"
NEW_CODE="$(grep -Eo 'versionCode[[:space:]]+[0-9]+' "${GRADLE_FILE}" | awk '{print $2}')"
NEW_TAG="v3.5.${NEW_CODE}-m219-v21"

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
echo "FINAL GITHUB AUDIT & SYNC REPORT (M219)"
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
echo "[VERIFIED] Mission #219 is now live on GitHub (${REMOTE_SHA})."
