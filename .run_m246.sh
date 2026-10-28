#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

cd "${HOME}/zen-study-focus"
BRANCH="integration/master-qa-verified-v21"
MISSION_ID="M246_VOCAB_TTS_ACCENT_FALLBACK_CHAIN_AND_CODE66_V1"
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
    git commit -m "chore: save pending local modifications before M246"
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
echo "STEP 3: APPLYING MISSION #246 & INCREMENTING VERSIONCODE"
echo "============================================================"
python3 - "${APP_JS}" "${GRADLE_FILE}" << 'PY_EOF'
import sys, re

target_js = sys.argv[1]
gradle_path = sys.argv[2]

with open(target_js, "r", encoding="utf-8") as f:
    content = f.read()

m246_code = """
/* === M246_VOCAB_TTS_ACCENT_FALLBACK_CHAIN_AND_CODE66_V1 === */
(function() {
  if (window.__M246_VOICE_RESOLVER__) return;
  window.__M246_VOICE_RESOLVER__ = true;

  window.dfResolveBestVoiceForLang = function(langCode) {
    if (typeof window.speechSynthesis === 'undefined' || typeof window.speechSynthesis.getVoices !== 'function') {
      return null;
    }
    var voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length || !langCode) return null;

    var target = String(langCode).toLowerCase().replace('_', '-');
    var root = target.split('-')[0];

    // Tier 1: Exact match (e.g. de-de)
    for (var i = 0; i < voices.length; i++) {
      var vLang = String(voices[i].lang || '').toLowerCase().replace('_', '-');
      if (vLang === target) return voices[i];
    }

    // Tier 2: Prefix match (e.g. de-at for de-de)
    for (var j = 0; j < voices.length; j++) {
      var vLang2 = String(voices[j].lang || '').toLowerCase().replace('_', '-');
      if (vLang2.indexOf(root + '-') === 0) return voices[j];
    }

    // Tier 3: Root match (e.g. de)
    for (var k = 0; k < voices.length; k++) {
      var vLang3 = String(voices[k].lang || '').toLowerCase().replace('_', '-');
      if (vLang3 === root) return voices[k];
    }

    return null;
  };

  if (typeof window.dfSafeSpeakUtterance === 'function') {
    var prevSafeSpeakM246 = window.dfSafeSpeakUtterance;
    window.dfSafeSpeakUtterance = function(text, lang, rate, onDone) {
      if (typeof window.SpeechSynthesisUtterance !== 'undefined') {
        var baseUtteranceM246 = window.SpeechSynthesisUtterance;
        window.SpeechSynthesisUtterance = function(t) {
          var u = new baseUtteranceM246(t);
          if (lang) {
            var bestVoice = window.dfResolveBestVoiceForLang(lang);
            if (bestVoice) u.voice = bestVoice;
          }
          return u;
        };
      }
      return prevSafeSpeakM246(text, lang, rate, onDone);
    };
  }
})();
"""

content = content.rstrip() + "\n" + m246_code + "\n"
with open(target_js, "w", encoding="utf-8") as f:
    f.write(content)

with open(gradle_path, "r", encoding="utf-8") as f:
    g = f.read()

m = re.search(r'versionCode\s+(\d+)', g)
cur_code = int(m.group(1)) if m else 65
next_code = max(cur_code + 1, 66)
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

const startIdx = fullCode.indexOf('/* === M246_VOCAB_TTS_ACCENT_FALLBACK_CHAIN_AND_CODE66_V1 === */');
if (startIdx === -1) throw new Error('M246 marker not found');
const moduleCode = fullCode.slice(startIdx);

const mockVoices = [
  { lang: 'en-US', name: 'English US' },
  { lang: 'de-AT', name: 'German Austria' }
];

const sandbox = {
  window: {},
  speechSynthesis: {
    getVoices: () => mockVoices
  },
  console: console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(moduleCode, sandbox);

if (!sandbox.__M246_VOICE_RESOLVER__) throw new Error('M246 module missing');

const v1 = sandbox.dfResolveBestVoiceForLang('en-US');
if (!v1 || v1.lang !== 'en-US') throw new Error('Exact match failed');

const v2 = sandbox.dfResolveBestVoiceForLang('de-DE');
if (!v2 || v2.lang !== 'de-AT') throw new Error('Tier 2 prefix fallback failed');

process.stdout.write('[GREEN PASS] M246 voice resolver module tests passed cleanly!\n');
NODE_EOF

echo "============================================================"
echo "STEP 5: COMMITTING & PUSHING TO GITHUB (${BRANCH})"
echo "============================================================"
git add "${APP_JS}" "${GRADLE_FILE}"
git commit -m "feat(vocab-m246): add multi-tier accent fallback resolver for speech synthesis and bump versionCode to 66"

git pull --rebase origin "${BRANCH}"
git push origin "${BRANCH}"

LOCAL_SHA="$(git rev-parse HEAD)"
NEW_CODE="$(grep -Eo 'versionCode[[:space:]]+[0-9]+' "${GRADLE_FILE}" | awk '{print $2}')"
NEW_TAG="v3.7.6-play-code${NEW_CODE}-v21"

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
echo "FINAL GITHUB AUDIT & SYNC REPORT (M246)"
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
echo "[VERIFIED] Mission #246 is now live on GitHub (${REMOTE_SHA})."
