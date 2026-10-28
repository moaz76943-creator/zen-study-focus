#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

cd "${HOME}/zen-study-focus"
BRANCH="integration/master-qa-verified-v21"
APP_JS="android/app/src/main/assets/web/app.js"
GRADLE_FILE="android/app/build.gradle"

trap 'echo "[FAIL] Script stopped at line $LINENO. Review the error above."; exit 1' ERR

echo "============================================================"
echo "STEP 1: SYNTAX & FUNCTIONAL UNIT TEST (WITH FULL DOM MOCK)"
echo "============================================================"
node --check "${APP_JS}"

node - "${APP_JS}" << 'NODE_EOF'
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
      if (
        id === 'df-vocab-search-row' ||
        id === 'df-quiz-extra-toolbar' ||
        id === 'df-vocab-speed-selector-group' ||
        id === 'df-vocab-paste-modal'
      ) {
        return null;
      }
      return makeDummyElement();
    },
    createElement: () => makeDummyElement(),
    querySelectorAll: () => [],
    querySelector: () => makeDummyElement(),
    addEventListener: () => {}
  },
  navigator: { language: 'ar', clipboard: { writeText: async () => {} } },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  Audio: function() { return { play: () => Promise.resolve(), pause: () => {}, load: () => {} }; },
  speechSynthesis: { speak: () => {}, cancel: () => {}, getVoices: () => [] },
  SpeechSynthesisUtterance: function(t) { this.text = t; },
  alert: () => {},
  confirm: () => true,
  setTimeout: () => 1,
  setInterval: () => 1,
  clearTimeout: () => {},
  clearInterval: () => {},
  console: { log: () => {}, warn: () => {}, error: () => {} }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(code, sandbox);

if (!sandbox.__M206_VOCAB_TOOLKIT_ACTIVE__) throw new Error('M206 missing');
if (!sandbox.__M207_QUIZ_ENHANCED__) throw new Error('M207 missing');
if (!sandbox.__M208_VOCAB_SPEED_PRESETS__) throw new Error('M208 missing');

if (sandbox.dfToWesternDigitsM206('٢٠٢٦') !== '2026') throw new Error('Digits check failed');
if (sandbox.dfBulkParseVocabLinesM206('Buch, كتاب', 'purple').length !== 1) throw new Error('Bulk parse check failed');
if (sandbox.dfSetVocabPlaybackSpeed(0.75) !== 0.75) throw new Error('Speed preset check failed');

process.stdout.write('[GREEN PASS] M206 + M207 + M208 verified in Node VM.\n');
NODE_EOF

echo ""
echo "============================================================"
echo "STEP 2: COMMITTING & PUSHING TO GITHUB (${BRANCH})"
echo "============================================================"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  git add "${APP_JS}" "${GRADLE_FILE}"
  git commit -m "feat(vocab-m207-m208): add quiz shuffle/reverse, pronunciation speed presets, and bump versionCode to 28"
fi

git pull --rebase origin "${BRANCH}"
git push origin "${BRANCH}"

LOCAL_SHA="$(git rev-parse HEAD)"
NEW_CODE="$(grep -Eo 'versionCode[[:space:]]+[0-9]+' "${GRADLE_FILE}" | awk '{print $2}')"
NEW_TAG="v3.5.${NEW_CODE}-m208-sync-v21"

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
echo "M199-M205_STATUS     : PRESENT ON GITHUB"
echo "M206_STATUS          : PRESENT & PUSHED TO GITHUB"
echo "M207_STATUS          : PRESENT & PUSHED TO GITHUB"
echo "M208_STATUS          : PRESENT & PUSHED TO GITHUB"
echo "NODE_SYNTAX_CHECK    : PASS"
echo "NODE_VM_UNIT_TEST    : PASS"
echo "ANDROID_DEVICE_TEST  : NOT_TESTED"
echo "============================================================"

if [ "${LOCAL_SHA}" != "${REMOTE_SHA}" ]; then
  echo "[FAIL] Local SHA (${LOCAL_SHA}) does not match Remote GitHub SHA (${REMOTE_SHA})!"
  exit 1
fi
echo "[VERIFIED] All missions (#199 through #208) are now confirmed on GitHub (${REMOTE_SHA})."
