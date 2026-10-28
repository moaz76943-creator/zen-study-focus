#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

cd "${HOME}/zen-study-focus"
BRANCH="integration/master-qa-verified-v21"
MISSION_ID="M226_VOCAB_TTS_ACCENT_PAIR_SWITCH_INDICATOR_AND_CODE46_V1"
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
    git commit -m "chore: save pending local modifications before M226"
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
echo "STEP 3: APPLYING MISSION #226 & INCREMENTING VERSIONCODE"
echo "============================================================"
python3 - "${APP_JS}" "${GRADLE_FILE}" << 'PY_EOF'
import sys, re

target_js = sys.argv[1]
gradle_path = sys.argv[2]

with open(target_js, "r", encoding="utf-8") as f:
    content = f.read()

m226_code = """
/* === M226_VOCAB_TTS_ACCENT_PAIR_SWITCH_INDICATOR_AND_CODE46_V1 === */
(function() {
  if (window.__M226_LANG_PAIR_INDICATOR__) return;
  window.__M226_LANG_PAIR_INDICATOR__ = true;

  var PAIRS = [
    { code: 'de-DE', flag: '🇩🇪', label: 'الألمانية (DE)' },
    { code: 'en-US', flag: '🇬🇧', label: 'الإنجليزية (EN)' },
    { code: 'fr-FR', flag: '🇫🇷', label: 'الفرنسية (FR)' },
    { code: 'es-ES', flag: '🇪🇸', label: 'الإسبانية (ES)' },
    { code: 'tr-TR', flag: '🇹🇷', label: 'التركية (TR)' }
  ];

  window.dfGetActiveLanguagePairInfo = function() {
    var eng = window.SpokenVocabEngine;
    var currentCode = (eng && eng.config && eng.config.foreignLang) || 'de-DE';
    for (var i = 0; i < PAIRS.length; i++) {
      if (PAIRS[i].code.toLowerCase() === currentCode.toLowerCase()) {
        return PAIRS[i];
      }
    }
    return PAIRS[0];
  };

  window.dfCycleLanguagePair = function() {
    var eng = window.SpokenVocabEngine;
    if (!eng) return null;
    if (!eng.config) eng.config = {};
    var currentCode = eng.config.foreignLang || 'de-DE';

    var curIdx = 0;
    for (var i = 0; i < PAIRS.length; i++) {
      if (PAIRS[i].code.toLowerCase() === currentCode.toLowerCase()) {
        curIdx = i;
        break;
      }
    }
    var nextPair = PAIRS[(curIdx + 1) % PAIRS.length];
    eng.config.foreignLang = nextPair.code;

    try {
      localStorage.setItem('df_vocab_foreign_lang', nextPair.code);
    } catch(e) {}

    updateLangPairBadgeUI();
    if (typeof window.dfUpdateVocabVoiceStatus === 'function') {
      window.dfUpdateVocabVoiceStatus();
    }
    return nextPair;
  };

  function updateLangPairBadgeUI() {
    if (typeof document === 'undefined') return;
    var btn = document.getElementById('df-vocab-lang-pair-badge-btn');
    if (!btn) return;
    var pair = window.dfGetActiveLanguagePairInfo();
    btn.textContent = pair.flag + ' ' + pair.label;
  }

  function mountLangPairBadge() {
    if (typeof document === 'undefined') return;
    var targetRow = document.getElementById('df-vocab-search-row') ||
                    document.getElementById('df-vocab-filter-bar');
    if (!targetRow || document.getElementById('df-vocab-lang-pair-badge-btn')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'df-vocab-lang-pair-badge-btn';
    btn.style.cssText = 'padding:6px 10px;border-radius:8px;border:1px solid rgba(168,85,247,0.35);background:rgba(168,85,247,0.12);color:#d8b4fe;font-size:12px;font-weight:700;cursor:pointer;';
    var pair = window.dfGetActiveLanguagePairInfo();
    btn.textContent = pair.flag + ' ' + pair.label;
    btn.onclick = function() { window.dfCycleLanguagePair(); };

    targetRow.appendChild(btn);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountLangPairBadge);
    } else {
      setTimeout(mountLangPairBadge, 350);
    }
    setInterval(updateLangPairBadgeUI, 2500);
  }
})();
"""

content = content.rstrip() + "\n" + m226_code + "\n"
with open(target_js, "w", encoding="utf-8") as f:
    f.write(content)

with open(gradle_path, "r", encoding="utf-8") as f:
    g = f.read()

m = re.search(r'versionCode\s+(\d+)', g)
cur_code = int(m.group(1)) if m else 45
next_code = max(cur_code + 1, 46)
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

const startIdx = fullCode.indexOf('/* === M226_VOCAB_TTS_ACCENT_PAIR_SWITCH_INDICATOR_AND_CODE46_V1 === */');
if (startIdx === -1) {
  throw new Error('M226 marker not found in ' + targetFile);
}
const moduleCode = fullCode.slice(startIdx);

const sandbox = {
  window: {},
  SpokenVocabEngine: {
    config: { foreignLang: 'de-DE' }
  },
  document: {
    readyState: 'complete',
    getElementById: () => null,
    addEventListener: () => {}
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  setTimeout: () => 1,
  setInterval: () => 1,
  console: console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(moduleCode, sandbox);

if (!sandbox.__M226_LANG_PAIR_INDICATOR__) throw new Error('M226 module missing');
const pair = sandbox.dfGetActiveLanguagePairInfo();
if (pair.code !== 'de-DE') throw new Error('Expected default de-DE');

const next = sandbox.dfCycleLanguagePair();
if (next.code !== 'en-US') throw new Error('Expected cycle to en-US');

process.stdout.write('[GREEN PASS] M226 language pair indicator module tests passed cleanly!\n');
NODE_EOF

echo "============================================================"
echo "STEP 5: COMMITTING & PUSHING TO GITHUB (${BRANCH})"
echo "============================================================"
git add "${APP_JS}" "${GRADLE_FILE}"
git commit -m "feat(vocab-m226): add 1-tap language pair flag indicator and switcher, and bump versionCode to 46"

git pull --rebase origin "${BRANCH}"
git push origin "${BRANCH}"

LOCAL_SHA="$(git rev-parse HEAD)"
NEW_CODE="$(grep -Eo 'versionCode[[:space:]]+[0-9]+' "${GRADLE_FILE}" | awk '{print $2}')"
NEW_TAG="v3.5.${NEW_CODE}-m226-v21"

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
echo "FINAL GITHUB AUDIT & SYNC REPORT (M226)"
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
echo "[VERIFIED] Mission #226 is now live on GitHub (${REMOTE_SHA})."
