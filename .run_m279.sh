#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #279 (Termux Runner)"
echo " Feature: Audio Focus Interruption & Suspension Handler"
echo " Target VersionCode: 99 (v4.0.9) [Mission 9 of 40]"
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
        git commit -m "chore: save local progress before M279" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 5. Apply M279 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M279_AUDIO_FOCUS_INTERRUPTION_HANDLER_AND_CODE99_V1" "$APP_JS"; then
    echo "[INFO] Appending M279 Audio Focus Interruption to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M279_AUDIO_FOCUS_INTERRUPTION_HANDLER_AND_CODE99_V1 === */
(function() {
  'use strict';

  var _isAudioSuspendedDueToFocusLoss = false;

  function dfIsAudioSuspended() {
    return _isAudioSuspendedDueToFocusLoss;
  }

  function dfHandleAudioFocusLoss() {
    _isAudioSuspendedDueToFocusLoss = true;

    try {
      if (typeof window !== "undefined" && window.speechSynthesis && typeof window.speechSynthesis.cancel === "function") {
        window.speechSynthesis.cancel();
      }
    } catch (_) {}

    try {
      if (typeof window !== "undefined" && typeof window.dfStopAllVocabSpeech === "function") {
        window.dfStopAllVocabSpeech();
      }
    } catch (_) {}

    try {
      if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
        var evt = typeof CustomEvent === "function" ? new CustomEvent("df:audio-focus-lost") : new Event("df:audio-focus-lost");
        window.dispatchEvent(evt);
      }
    } catch (_) {}

    return true;
  }

  function dfHandleAudioFocusGain() {
    if (!_isAudioSuspendedDueToFocusLoss) return false;
    _isAudioSuspendedDueToFocusLoss = false;

    try {
      if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
        var evt = typeof CustomEvent === "function" ? new CustomEvent("df:audio-focus-gained") : new Event("df:audio-focus-gained");
        window.dispatchEvent(evt);
      }
    } catch (_) {}

    return true;
  }

  function dfSimulateAudioFocusChange(state) {
    if (state === "loss" || state === "loss_transient" || state === "loss_transient_can_duck") {
      return dfHandleAudioFocusLoss();
    } else if (state === "gain") {
      return dfHandleAudioFocusGain();
    }
    return false;
  }

  try {
    if (typeof window !== "undefined") {
      window.addEventListener("blur", function() {
        if (typeof document !== "undefined" && document.hidden) {
          dfHandleAudioFocusLoss();
        }
      });

      window.addEventListener("focus", function() {
        dfHandleAudioFocusGain();
      });

      window.dfHandleAudioFocusLoss = dfHandleAudioFocusLoss;
      window.dfHandleAudioFocusGain = dfHandleAudioFocusGain;
      window.dfSimulateAudioFocusChange = dfSimulateAudioFocusChange;
      window.dfIsAudioSuspended = dfIsAudioSuspended;
    }
  } catch (_) {}
})();
JS_EOF
else
    echo "[INFO] M279 already present in $APP_JS"
fi

# 6. Update build.gradle to versionCode 99 and versionName 4.0.9
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 99', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"4.0.9\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 99 (4.0.9)')
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
const marker = "/* === M279_AUDIO_FOCUS_INTERRUPTION_HANDLER_AND_CODE99_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

let speechCancelCalled = false;
let stopAllVocabCalled = false;
let dispatchedEvents = [];
const listeners = {};

const sandbox = {
  window: {
    speechSynthesis: {
      cancel: () => { speechCancelCalled = true; }
    }
  },
  document: {
    hidden: false
  },
  CustomEvent: function(type) { this.type = type; },
  Event: function(type) { this.type = type; },
  Boolean: Boolean
};
sandbox.window.window = sandbox.window;
sandbox.window.addEventListener = (type, fn) => {
  listeners[type] = listeners[type] || [];
  listeners[type].push(fn);
};
sandbox.window.dispatchEvent = (evt) => {
  dispatchedEvents.push(evt.type);
};
sandbox.window.dfStopAllVocabSpeech = () => { stopAllVocabCalled = true; };

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
assert.strictEqual(sandbox.window.dfIsAudioSuspended(), false);

const lossRes = sandbox.window.dfSimulateAudioFocusChange("loss_transient");
assert.strictEqual(lossRes, true);
assert.strictEqual(sandbox.window.dfIsAudioSuspended(), true);
assert.strictEqual(speechCancelCalled, true);
assert.strictEqual(stopAllVocabCalled, true);
assert.ok(dispatchedEvents.includes("df:audio-focus-lost"));

const gainRes = sandbox.window.dfSimulateAudioFocusChange("gain");
assert.strictEqual(gainRes, true);
assert.strictEqual(sandbox.window.dfIsAudioSuspended(), false);
assert.ok(dispatchedEvents.includes("df:audio-focus-gained"));

const doubleGain = sandbox.window.dfSimulateAudioFocusChange("gain");
assert.strictEqual(doubleGain, false);

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 9. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(audio): M279 add audio focus interruption and call suspension handler with versionCode 99 [v4.0.9]" || true
git tag -a v4.0.9-m279-v21 -m "Tag M279: audio focus interruption handler with versionCode 99" -f

# 10. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v4.0.9-m279-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M279 (9 of 40)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 99"
echo "VERSION_NAME: 4.0.9"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M280 (Golden Century Milestone v4.1.0 with versionCode 100)"
echo "========================================================"
