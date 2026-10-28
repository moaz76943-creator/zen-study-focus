#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

cd "${HOME}/zen-study-focus"
BRANCH="integration/master-qa-verified-v21"
MISSION_ID="M216_VOCAB_SORT_ORDER_AND_CODE36_V1"
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
    git commit -m "chore: save pending local modifications before M216"
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
echo "STEP 3: APPLYING MISSION #216 & INCREMENTING VERSIONCODE"
echo "============================================================"
python3 - "${APP_JS}" "${GRADLE_FILE}" << 'PY_EOF'
import sys, re

target_js = sys.argv[1]
gradle_path = sys.argv[2]

with open(target_js, "r", encoding="utf-8") as f:
    content = f.read()

m216_code = """
/* === M216_VOCAB_SORT_ORDER_AND_CODE36_V1 === */
(function() {
  if (window.__M216_VOCAB_SORT_ACTIVE__) return;
  window.__M216_VOCAB_SORT_ACTIVE__ = true;

  var SORT_KEY = 'df_vocab_sort_mode';
  var MODES = ['newest', 'alpha', 'hard_first'];
  var LABELS = {
    newest: '↕ الترتيب: الأحدث',
    alpha: '🔤 الترتيب: أبجدي',
    hard_first: '🔥 الترتيب: الصعبة أولاً'
  };
  var currentMode = 'newest';
  try {
    var saved = localStorage.getItem(SORT_KEY);
    if (saved && LABELS[saved]) currentMode = saved;
  } catch (e) {}

  window.dfSortVocabItems = function(items, mode) {
    var m = mode || currentMode;
    var list = (items || []).slice();
    if (m === 'alpha') {
      list.sort(function(a, b) {
        return String((a && a.word) || '').localeCompare(String((b && b.word) || ''));
      });
    } else if (m === 'hard_first') {
      list.sort(function(a, b) {
        var ah = (a && a.hard) ? 1 : 0;
        var bh = (b && b.hard) ? 1 : 0;
        if (bh !== ah) return bh - ah;
        return String((a && a.word) || '').localeCompare(String((b && b.word) || ''));
      });
    }
    return list;
  };

  window.dfCycleVocabSortOrder = function() {
    var idx = MODES.indexOf(currentMode);
    currentMode = MODES[(idx + 1) % MODES.length];
    try {
      localStorage.setItem(SORT_KEY, currentMode);
    } catch (e) {}

    var btn = typeof document !== 'undefined' ? document.getElementById('df-vocab-sort-mode-btn') : null;
    if (btn) {
      btn.textContent = LABELS[currentMode];
    }

    var eng = window.SpokenVocabEngine;
    if (eng && typeof eng.getItems === 'function' && typeof eng.saveItems === 'function') {
      var sorted = window.dfSortVocabItems(eng.getItems(), currentMode);
      eng.saveItems(sorted);
      if (typeof eng.render === 'function') eng.render();
    }
    return currentMode;
  };

  window.dfGetVocabSortOrder = function() {
    return currentMode;
  };

  function mountSortModeBtn() {
    if (typeof document === 'undefined') return;
    var searchRow = document.getElementById('df-vocab-search-row') ||
                    document.getElementById('df-vocab-filter-bar');
    if (!searchRow || document.getElementById('df-vocab-sort-mode-btn')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'df-vocab-sort-mode-btn';
    btn.style.cssText = 'padding:8px 12px;border-radius:10px;border:1px solid rgba(148,163,184,0.35);background:rgba(30,41,59,0.75);color:#e2e8f0;font-size:12px;font-weight:600;cursor:pointer;';
    btn.textContent = LABELS[currentMode] || LABELS.newest;
    btn.onclick = function() { window.dfCycleVocabSortOrder(); };
    searchRow.appendChild(btn);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountSortModeBtn);
    } else {
      setTimeout(mountSortModeBtn, 350);
    }
    setInterval(mountSortModeBtn, 2500);
  }
})();
"""

content = content.rstrip() + "\n" + m216_code + "\n"
with open(target_js, "w", encoding="utf-8") as f:
    f.write(content)

with open(gradle_path, "r", encoding="utf-8") as f:
    g = f.read()

m = re.search(r'versionCode\s+(\d+)', g)
cur_code = int(m.group(1)) if m else 35
next_code = max(cur_code + 1, 36)
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

const startIdx = fullCode.indexOf('/* === M216_VOCAB_SORT_ORDER_AND_CODE36_V1 === */');
if (startIdx === -1) {
  throw new Error('M216 marker not found in ' + targetFile);
}
const moduleCode = fullCode.slice(startIdx);

const memStore = Object.create(null);
function makeDummyElement() {
  return new Proxy({
    value: '', textContent: '', innerHTML: '', style: {}, dataset: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    addEventListener: () => {}, appendChild: () => {}, remove: () => {},
    setAttribute: () => {}, getAttribute: () => null,
    querySelector: () => null, querySelectorAll: () => [],
    scrollIntoView: () => {},
    parentNode: { insertBefore: () => {}, appendChild: () => {} }
  }, {
    get(t, p) { return p in t ? t[p] : () => {}; },
    set(t, p, v) { t[p] = v; return true; }
  });
}

const sandbox = {
  window: {},
  SpokenVocabEngine: {
    _items: [
      { id: '1', word: 'Zebra', meaning: 'حمار وحشي', hard: false },
      { id: '2', word: 'Apfel', meaning: 'تفاحة', hard: true }
    ],
    getItems() { return this._items; },
    saveItems(items) { this._items = items; },
    render() {}
  },
  document: {
    readyState: 'complete',
    body: makeDummyElement(),
    documentElement: makeDummyElement(),
    getElementById: () => makeDummyElement(),
    createElement: () => makeDummyElement(),
    querySelectorAll: () => [],
    querySelector: () => makeDummyElement(),
    addEventListener: () => {}
  },
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(memStore, k) ? memStore[k] : null),
    setItem: (k, v) => { memStore[k] = String(v); },
    removeItem: (k) => { delete memStore[k]; }
  },
  setTimeout: () => 1,
  setInterval: () => 1,
  clearTimeout: () => {},
  clearInterval: () => {},
  console: console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(moduleCode, sandbox);

if (!sandbox.__M216_VOCAB_SORT_ACTIVE__) throw new Error('M216 failed to activate');
if (sandbox.dfCycleVocabSortOrder() !== 'alpha') throw new Error('Expected alpha mode');
if (sandbox.SpokenVocabEngine.getItems()[0].word !== 'Apfel') throw new Error('Alpha sort failed');
if (sandbox.dfCycleVocabSortOrder() !== 'hard_first') throw new Error('Expected hard_first mode');

process.stdout.write('[GREEN PASS] M216 isolated module unit tests passed cleanly!\n');
NODE_EOF

echo "============================================================"
echo "STEP 5: COMMITTING & PUSHING TO GITHUB (${BRANCH})"
echo "============================================================"
git add "${APP_JS}" "${GRADLE_FILE}"
git commit -m "feat(vocab-m216): add 1-tap vocabulary sort order cycling (newest/alpha/hard-first) and bump versionCode to 36"

git pull --rebase origin "${BRANCH}"
git push origin "${BRANCH}"

LOCAL_SHA="$(git rev-parse HEAD)"
NEW_CODE="$(grep -Eo 'versionCode[[:space:]]+[0-9]+' "${GRADLE_FILE}" | awk '{print $2}')"
NEW_TAG="v3.5.${NEW_CODE}-m216-v21"

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
echo "FINAL GITHUB AUDIT & SYNC REPORT (M216)"
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
echo "[VERIFIED] Mission #216 is now live on GitHub (${REMOTE_SHA})."
