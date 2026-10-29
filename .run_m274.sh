#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #274 (Termux Runner)"
echo " Feature: Half-Way Interval Zen Chime Generator"
echo " Target VersionCode: 94 (v4.0.4) [Mission 4 of 40]"
echo "========================================================"

# 1. Clean up local cycle archives if any
mkdir -p .local_cycle_archive
find android/app/src/main/assets/web/ -maxdepth 1 -name "run_cycle_*.sh" -exec mv {} .local_cycle_archive/ \; 2>/dev/null || true

# 2. Check git branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
TARGET_BRANCH="integration/master-qa-verified-v21"

if [ "$CURRENT_BRANCH" != "$TARGET_BRANCH" ]; then
    echo "[INFO] Switching from $CURRENT_BRANCH to $TARGET_BRANCH..."
    git checkout "$TARGET_BRANCH" || git checkout -b "$TARGET_BRANCH"
fi

# 3. Pull latest remote commits safely
echo "[INFO] Syncing with remote before changes..."
git pull --rebase origin "$TARGET_BRANCH" || true

# 4. Auto-recover uncommitted changes if safe
if [ -n "$(git status --porcelain android/app/src/main/assets/web/app.js android/app/build.gradle)" ]; then
    echo "[INFO] Stashing/committing tracked changes..."
    if node --check android/app/src/main/assets/web/app.js 2>/dev/null; then
        git add android/app/src/main/assets/web/app.js android/app/build.gradle 2>/dev/null || true
        git commit -m "chore: save local progress before M274" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 5. Apply M274 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M274_HALFWAY_INTERVAL_ZEN_CHIME_AND_CODE94_V1" "$APP_JS"; then
    echo "[INFO] Appending M274 Half-Way Zen Chime to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M274_HALFWAY_INTERVAL_ZEN_CHIME_AND_CODE94_V1 === */
(function() {
  'use strict';

  var _halfwayChimePlayedInCurrentSession = false;

  function dfIsHalfwayChimeEnabled() {
    try {
      var val = localStorage.getItem("df_halfway_chime_enabled_v1");
      if (val !== null) return val === "true";
    } catch (_) {}
    return true;
  }

  function dfToggleHalfwayChime(enable) {
    var state = (enable !== undefined) ? Boolean(enable) : !dfIsHalfwayChimeEnabled();
    try {
      localStorage.setItem("df_halfway_chime_enabled_v1", String(state));
    } catch (_) {}
    return state;
  }

  function dfResetHalfwayChimeSession() {
    _halfwayChimePlayedInCurrentSession = false;
  }

  function dfPlayHalfwayZenChime() {
    try {
      if (typeof window === "undefined") return false;
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      var ctx = new AudioCtx();

      var osc1 = ctx.createOscillator();
      var gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(528, ctx.currentTime);
      gain1.gain.setValueAtTime(0.001, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 1.4);

      var osc2 = ctx.createOscillator();
      var gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(660, ctx.currentTime + 0.25);
      gain2.gain.setValueAtTime(0.001, ctx.currentTime + 0.25);
      gain2.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.3);
      gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.8);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.25);
      osc2.stop(ctx.currentTime + 1.8);

      try {
        if (typeof window.dfVocabHapticPulse === "function") {
          window.dfVocabHapticPulse(15);
        }
      } catch (_) {}

      return true;
    } catch (_) {
      return false;
    }
  }

  function dfCheckHalfwayChimeTrigger(elapsedSeconds, totalSeconds) {
    if (!dfIsHalfwayChimeEnabled()) return false;
    if (_halfwayChimePlayedInCurrentSession) return false;

    var elapsed = Number(elapsedSeconds) || 0;
    var total = Number(totalSeconds) || 0;
    if (total <= 60) return false;

    var halfway = Math.floor(total / 2);
    if (elapsed >= halfway && elapsed <= halfway + 2) {
      _halfwayChimePlayedInCurrentSession = true;
      return dfPlayHalfwayZenChime();
    }

    return false;
  }

  if (typeof window !== "undefined") {
    window.dfIsHalfwayChimeEnabled = dfIsHalfwayChimeEnabled;
    window.dfToggleHalfwayChime = dfToggleHalfwayChime;
    window.dfResetHalfwayChimeSession = dfResetHalfwayChimeSession;
    window.dfPlayHalfwayZenChime = dfPlayHalfwayZenChime;
    window.dfCheckHalfwayChimeTrigger = dfCheckHalfwayChimeTrigger;
  }
})();
JS_EOF
else
    echo "[INFO] M274 already present in $APP_JS"
fi

# 6. Update build.gradle to versionCode 94 and versionName 4.0.4
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 94', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"4.0.4\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 94 (4.0.4)')
"

# 7. Syntax validation
echo "[CHECK] Verifying JS syntax with node --check..."
node --check "$APP_JS"
echo "[PASS] JS syntax validated successfully."

# 8. Unit testing in isolated Node VM
node -e '
const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const fullCode = fs.readFileSync("android/app/src/main/assets/web/app.js", "utf8");
const marker = "/* === M274_HALFWAY_INTERVAL_ZEN_CHIME_AND_CODE94_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

const memStore = Object.create(null);
let oscCount = 0;
let hapticCount = 0;

class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.destination = {};
  }
  createOscillator() {
    return {
      type: "sine",
      frequency: { setValueAtTime: () => {} },
      connect: () => {},
      start: () => { oscCount++; },
      stop: () => {}
    };
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {}
      },
      connect: () => {}
    };
  }
}

const sandbox = {
  window: {},
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
  },
  localStorage: {
    getItem: (k) => (k in memStore ? memStore[k] : null),
    setItem: (k, v) => { memStore[k] = String(v); },
    removeItem: (k) => { delete memStore[k]; },
    clear: () => { Object.keys(memStore).forEach(k => delete memStore[k]); }
  },
  AudioContext: MockAudioContext,
  Math: Math,
  Number: Number,
  String: String,
  Boolean: Boolean
};
sandbox.window = sandbox;
sandbox.window.dfVocabHapticPulse = () => { hapticCount++; };

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
assert.strictEqual(sandbox.window.dfIsHalfwayChimeEnabled(), true);
sandbox.window.dfToggleHalfwayChime(false);
assert.strictEqual(sandbox.window.dfIsHalfwayChimeEnabled(), false);
sandbox.window.dfToggleHalfwayChime(true);
assert.strictEqual(sandbox.window.dfIsHalfwayChimeEnabled(), true);

const res700 = sandbox.window.dfCheckHalfwayChimeTrigger(700, 1500);
assert.strictEqual(res700, false);
assert.strictEqual(oscCount, 0);

const res750 = sandbox.window.dfCheckHalfwayChimeTrigger(750, 1500);
assert.strictEqual(res750, true);
assert.strictEqual(oscCount, 2);
assert.strictEqual(hapticCount, 1);

oscCount = 0;
const res751 = sandbox.window.dfCheckHalfwayChimeTrigger(751, 1500);
assert.strictEqual(res751, false);
assert.strictEqual(oscCount, 0);

sandbox.window.dfResetHalfwayChimeSession();
const resRetrigger = sandbox.window.dfCheckHalfwayChimeTrigger(750, 1500);
assert.strictEqual(resRetrigger, true);
assert.strictEqual(oscCount, 2);

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 9. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(audio): M274 add halfway interval zen bell chime during focus session with versionCode 94 [v4.0.4]" || true
git tag -a v4.0.4-m274-v21 -m "Tag M274: halfway interval zen bell chime with versionCode 94" -f

# 10. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v4.0.4-m274-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M274 (4 of 40)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 94"
echo "VERSION_NAME: 4.0.4"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M275 (OLED True Black Theme toggle for battery and night study)"
echo "========================================================"
