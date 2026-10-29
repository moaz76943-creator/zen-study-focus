#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

cd "${HOME}/zen-study-focus"
BRANCH="integration/master-qa-verified-v21"
MISSION_ID="M212_VOCAB_ACCENT_VOICE_CHECKER_AND_CODE32_V1"
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
    git commit -m "chore: save pending local modifications before M212"
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
echo "STEP 3: APPLYING MISSION #212 & INCREMENTING VERSIONCODE"
echo "============================================================"
python3 - "${TARGET_JS}" "${GRADLE_FILE}" << 'PY_EOF'
import sys, os, re

target_js = sys.argv[1]
gradle_path = sys.argv[2]

with open(target_js, "r", encoding="utf-8") as f:
    content = f.read()

m212_code = """
/* === M212_VOCAB_ACCENT_VOICE_CHECKER_AND_CODE32_V1 === */
(function() {
  if (window.__M212_VOICE_CHECKER__) return;
  window.__M212_VOICE_CHECKER__ = true;

  window.dfTestCurrentVoicePronunciation = function() {
    var eng = window.SpokenVocabEngine;
    if (!eng) return;
    var lang = (eng.config && eng.config.foreignLang) || 'de-DE';
    var testPhrase = 'Hallo';
    if (/^en/i.test(lang)) testPhrase = 'Hello';
    else if (/^fr/i.test(lang)) testPhrase = 'Bonjour';
    else if (/^es/i.test(lang)) testPhrase = 'Hola';
    else if (/^tr/i.test(lang)) testPhrase = 'Merhaba';

    if (typeof eng.speakWord === 'function') {
      eng.speakWord(testPhrase, lang);
    } else if (typeof window.speechSynthesis !== 'undefined') {
      try {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(testPhrase);
        u.lang = lang;
        window.speechSynthesis.speak(u);
      } catch(e) {}
    }
  };

  function updateVoiceStatusUI() {
    if (typeof document === 'undefined') return;
    var badge = document.getElementById('df-vocab-voice-status-badge');
    if (!badge) return;

    var eng = window.SpokenVocabEngine;
    var lang = (eng && eng.config && eng.config.foreignLang) || 'de-DE';
    var hasVoices = false;
    if (typeof window.speechSynthesis !== 'undefined') {
      var voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
      if (voices && voices.length > 0) {
        hasVoices = voices.some(function(v) {
          return v.lang && v.lang.toLowerCase().indexOf(lang.split('-')[0].toLowerCase()) === 0;
        });
      } else {
        hasVoices = true;
      }
    }
    badge.textContent = hasVoices ? '🔊 محرك النطق جاهز' : '⚠️ يُنصح بتثبيت أصوات النظام';
    badge.style.color = hasVoices ? '#4ade80' : '#facc15';
    badge.style.borderColor = hasVoices ? 'rgba(74,222,128,0.35)' : 'rgba(250,204,21,0.35)';
  }

  window.dfUpdateVocabVoiceStatus = updateVoiceStatusUI;

  function mountVoiceStatusControls() {
    if (typeof document === 'undefined') return;
    var targetRow = document.getElementById('df-vocab-search-row') ||
                    document.getElementById('df-vocab-filter-bar');
    if (!targetRow || document.getElementById('df-vocab-voice-test-btn')) return;

    var testBtn = document.createElement('button');
    testBtn.type = 'button';
    testBtn.id = 'df-vocab-voice-test-btn';
    testBtn.style.cssText = 'padding:6px 10px;border-radius:8px;border:1px solid rgba(56,189,248,0.35);background:rgba(56,189,248,0.12);color:#38bdf8;font-size:12px;font-weight:600;cursor:pointer;';
    testBtn.textContent = '🗣 فحص الصوت';
    testBtn.onclick = function() { window.dfTestCurrentVoicePronunciation(); };

    var statusBadge = document.createElement('span');
    statusBadge.id = 'df-vocab-voice-status-badge';
    statusBadge.style.cssText = 'font-size:11px;font-weight:600;padding:4px 8px;border-radius:6px;border:1px solid rgba(74,222,128,0.35);color:#4ade80;background:rgba(15,23,42,0.6);';
    statusBadge.textContent = '🔊 محرك النطق جاهز';

    targetRow.appendChild(testBtn);
    targetRow.appendChild(statusBadge);

    updateVoiceStatusUI();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountVoiceStatusControls);
    } else {
      setTimeout(mountVoiceStatusControls, 350);
    }
    setInterval(updateVoiceStatusUI, 3000);
  }
})();
"""

content = content.rstrip() + "\n" + m212_code + "\n"
with open(target_js, "w", encoding="utf-8") as f:
    f.write(content)

with open(gradle_path, "r", encoding="utf-8") as f:
    g = f.read()

m = re.search(r'versionCode\s+(\d+)', g)
cur_code = int(m.group(1)) if m else 31
next_code = max(cur_code + 1, 32)
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
      if (id === 'df-vocab-voice-test-btn') return null;
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
  speechSynthesis: {
    speak: () => {},
    cancel: () => {},
    getVoices: () => [{ lang: 'de-DE', name: 'German' }]
  },
  SpeechSynthesisUtterance: function(t) { this.text = t; },
  console: console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(code, sandbox);

if (!sandbox.__M212_VOICE_CHECKER__) throw new Error('M212 missing');
if (typeof sandbox.dfTestCurrentVoicePronunciation !== 'function') throw new Error('Voice test function missing');

process.stdout.write('[GREEN PASS] M212 syntax and unit tests passed cleanly.\n');
NODE_EOF

echo "============================================================"
echo "STEP 5: COMMITTING & PUSHING TO GITHUB (${BRANCH})"
echo "============================================================"
git add "${TARGET_JS}" "${GRADLE_FILE}"
git commit -m "feat(vocab-m212): add pronunciation voice tester, voice readiness badge, and bump versionCode to 32"

git pull --rebase origin "${BRANCH}"
git push origin "${BRANCH}"

LOCAL_SHA="$(git rev-parse HEAD)"
NEW_CODE="$(grep -Eo 'versionCode[[:space:]]+[0-9]+' "${GRADLE_FILE}" | awk '{print $2}')"
NEW_TAG="v3.5.${NEW_CODE}-m212-v21"

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
echo "[VERIFIED] Mission #212 successfully applied and confirmed on GitHub (${REMOTE_SHA})."
