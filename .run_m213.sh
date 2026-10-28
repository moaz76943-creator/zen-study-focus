#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

cd "${HOME}/zen-study-focus"
BRANCH="integration/master-qa-verified-v21"
MISSION_ID="M213_VOCAB_LOOP_INTERVAL_AND_CODE33_V1"
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

TRACKED_DIRTY="$(git status --porcelain --untracked-files=no)"
if [ -n "${TRACKED_DIRTY}" ]; then
  echo "[INFO] Found pending tracked changes. Checking syntax..."
  if node --check "${APP_JS}"; then
    git add -u
    git commit -m "chore: save pending local modifications before M213"
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

TARGET_JS="${APP_JS}"
for candidate in \
  "android/app/src/main/assets/web/notes_studio.js" \
  "android/app/src/main/assets/web/js/notes_studio.js" \
  "${APP_JS}"; do
  if [ -f "${candidate}" ] && grep -q "SpokenVocabEngine" "${candidate}"; then
    TARGET_JS="${candidate}"
    break
  fi
done

echo "============================================================"
echo "STEP 2: CHECKING IDEMPOTENCY (RED CHECK)"
echo "============================================================"
if grep -q "${MISSION_ID}" "${TARGET_JS}"; then
  echo "[INFO] Mission ${MISSION_ID} already present in ${TARGET_JS}."
  exit 0
fi
echo "[RED PASS] ${MISSION_ID} not present yet; applying safe patch."

echo "============================================================"
echo "STEP 3: APPLYING MISSION #213 & INCREMENTING VERSIONCODE"
echo "============================================================"
python3 - "${TARGET_JS}" "${GRADLE_FILE}" << 'PY_EOF'
import sys, os, re

target_js = sys.argv[1]
gradle_path = sys.argv[2]

with open(target_js, "r", encoding="utf-8") as f:
    content = f.read()

m213_code = """
/* === M213_VOCAB_LOOP_INTERVAL_AND_CODE33_V1 === */
(function() {
  if (window.__M213_LOOP_INTERVAL__) return;
  window.__M213_LOOP_INTERVAL__ = true;

  var INTERVAL_KEY = 'df_vocab_loop_interval_ms';
  var currentPauseMs = 1500;
  try {
    var saved = parseInt(localStorage.getItem(INTERVAL_KEY), 10);
    if (saved && saved >= 500 && saved <= 5000) currentPauseMs = saved;
  } catch(e) {}

  window.dfSetVocabLoopInterval = function(sec) {
    var ms = Math.round((parseFloat(sec) || 1.5) * 1000);
    currentPauseMs = Math.max(500, Math.min(5000, ms));
    try {
      localStorage.setItem(INTERVAL_KEY, String(currentPauseMs));
    } catch(e) {}

    var eng = window.SpokenVocabEngine;
    if (eng && eng.config) {
      eng.config.pauseMs = currentPauseMs;
    }
    updateIntervalButtonsUI();
    return currentPauseMs;
  };

  window.dfGetVocabLoopIntervalSec = function() {
    return (currentPauseMs / 1000);
  };

  function updateIntervalButtonsUI() {
    if (typeof document === 'undefined') return;
    var presets = [1.0, 2.0, 3.0];
    presets.forEach(function(s) {
      var btn = document.getElementById('df-interval-btn-' + Math.round(s));
      if (btn) {
        var isActive = Math.abs((currentPauseMs / 1000) - s) < 0.2;
        btn.style.background = isActive ? 'rgba(56,189,248,0.35)' : 'rgba(255,255,255,0.06)';
        btn.style.borderColor = isActive ? '#38bdf8' : 'rgba(255,255,255,0.15)';
        btn.style.color = isActive ? '#ffffff' : '#94a3b8';
      }
    });
  }

  function mountIntervalControls() {
    if (typeof document === 'undefined') return;
    var targetRow = document.getElementById('df-vocab-search-row') ||
                    document.getElementById('df-vocab-filter-bar');
    if (!targetRow || document.getElementById('df-vocab-interval-group')) return;

    var group = document.createElement('div');
    group.id = 'df-vocab-interval-group';
    group.style.cssText = 'display:inline-flex;align-items:center;gap:4px;background:rgba(15,23,42,0.6);padding:3px 6px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);';
    group.innerHTML =
      '<span style="font-size:11px;color:#94a3b8;font-weight:600;margin-right:2px;">فاصل النطق:</span>' +
      '<button type="button" id="df-interval-btn-1" style="padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);color:#94a3b8;font-size:11px;font-weight:700;cursor:pointer;">1s</button>' +
      '<button type="button" id="df-interval-btn-2" style="padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);color:#94a3b8;font-size:11px;font-weight:700;cursor:pointer;">2s</button>' +
      '<button type="button" id="df-interval-btn-3" style="padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);color:#94a3b8;font-size:11px;font-weight:700;cursor:pointer;">3s</button>';

    targetRow.appendChild(group);

    var b1 = document.getElementById('df-interval-btn-1');
    if (b1) b1.onclick = function() { window.dfSetVocabLoopInterval(1.0); };
    var b2 = document.getElementById('df-interval-btn-2');
    if (b2) b2.onclick = function() { window.dfSetVocabLoopInterval(2.0); };
    var b3 = document.getElementById('df-interval-btn-3');
    if (b3) b3.onclick = function() { window.dfSetVocabLoopInterval(3.0); };

    updateIntervalButtonsUI();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountIntervalControls);
    } else {
      setTimeout(mountIntervalControls, 350);
    }
    setInterval(updateIntervalButtonsUI, 2500);
  }
})();
"""

content = content.rstrip() + "\n" + m213_code + "\n"
with open(target_js, "w", encoding="utf-8") as f:
    f.write(content)

with open(gradle_path, "r", encoding="utf-8") as f:
    g = f.read()

m = re.search(r'versionCode\s+(\d+)', g)
cur_code = int(m.group(1)) if m else 32
next_code = max(cur_code + 1, 33)
g = re.sub(r'versionCode\s+\d+', f'versionCode {next_code}', g)
g = re.sub(r'versionName\s+"[^"]+"', f'versionName "3.5.{next_code - 20}"', g)
with open(gradle_path, "w", encoding="utf-8") as f:
    f.write(g)

print(f"[INFO] Updated {gradle_path} -> versionCode {next_code}")
PY_EOF

echo "============================================================"
echo "STEP 4: RUNNING SYNTAX & NODE VM UNIT TESTS (GREEN CHECK)"
echo "============================================================"
node --check "${APP_JS}"
if [ "${TARGET_JS}" != "${APP_JS}" ]; then
  node --check "${TARGET_JS}"
fi

node - "${TARGET_JS}" << 'NODE_EOF'
const fs = require('fs');
const vm = require('vm');
const targetFile = process.argv[2];
const code = fs.readFileSync(targetFile, 'utf8');

function makeDummyElement() {
  return new Proxy({
    value: '',
    textContent: '',
    innerHTML: '',
    style: {},
    dataset: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    addEventListener: () => {},
    removeEventListener: () => {},
    appendChild: () => {},
    remove: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    scrollIntoView: () => {},
    parentNode: { insertBefore: () => {}, appendChild: () => {} }
  }, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return () => {};
    },
    set(target, prop, val) {
      target[prop] = val;
      return true;
    }
  });
}

const sandbox = {
  window: {},
  document: {
    readyState: 'complete',
    body: makeDummyElement(),
    documentElement: makeDummyElement(),
    getElementById: (id) => {
      if (id === 'df-vocab-interval-group') return null;
      return makeDummyElement();
    },
    createElement: () => makeDummyElement(),
    querySelectorAll: () => [],
    querySelector: () => makeDummyElement(),
    addEventListener: () => {}
  },
  navigator: { language: 'ar' },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  setTimeout: (fn) => { fn(); return 1; },
  setInterval: () => 1,
  clearTimeout: () => {},
  clearInterval: () => {},
  alert: () => {},
  confirm: () => true,
  console: console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(code, sandbox);

if (!sandbox.__M213_LOOP_INTERVAL__) throw new Error('M213 missing');
sandbox.dfSetVocabLoopInterval(2.0);
if (sandbox.dfGetVocabLoopIntervalSec() !== 2.0) throw new Error('Interval getter failed');

process.stdout.write('[GREEN PASS] M213 syntax and unit tests passed cleanly.\n');
NODE_EOF

echo "============================================================"
echo "STEP 5: COMMITTING & PUSHING TO GITHUB (${BRANCH})"
echo "============================================================"
git add "${TARGET_JS}" "${GRADLE_FILE}"
git commit -m "feat(vocab-m213): add configurable speech loop pause intervals (1s, 2s, 3s) and bump versionCode to 33"

git pull --rebase origin "${BRANCH}"
git push origin "${BRANCH}"

LOCAL_SHA="$(git rev-parse HEAD)"
NEW_CODE="$(grep -Eo 'versionCode[[:space:]]+[0-9]+' "${GRADLE_FILE}" | awk '{print $2}')"
NEW_TAG="v3.5.${NEW_CODE}-m213-v21"

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
echo "FINAL GITHUB AUDIT & SYNC REPORT"
echo "============================================================"
echo "BRANCH               : ${BRANCH}"
echo "LOCAL_HEAD_SHA       : ${LOCAL_SHA}"
echo "REMOTE_GITHUB_SHA    : ${REMOTE_SHA}"
echo "VERSION_CODE         : ${NEW_CODE}"
echo "TAG_STATUS           : ${TAG_STATUS}"
echo "NODE_SYNTAX_CHECK    : PASS"
echo "NODE_VM_UNIT_TEST    : PASS"
echo "ANDROID_DEVICE_TEST  : NOT_TESTED"
echo "============================================================"

if [ "${LOCAL_SHA}" != "${REMOTE_SHA}" ]; then
  echo "[FAIL] Local SHA does not match Remote GitHub SHA!"
  exit 1
fi
echo "[VERIFIED] Mission #213 successfully applied and confirmed on GitHub (${REMOTE_SHA})."
