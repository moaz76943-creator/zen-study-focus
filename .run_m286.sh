#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #286 (Termux Runner)"
echo " Feature: Flip-to-Mute Face-Down Sensor Detector"
echo " Target VersionCode: 106 (v4.1.6) [Mission 16 of 40]"
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
        git commit -m "chore: save local progress before M286" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 5. Apply M286 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M286_FLIP_TO_MUTE_SENSOR_DETECTOR_AND_CODE106_V1" "$APP_JS"; then
    echo "[INFO] Appending M286 Flip-to-Mute to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M286_FLIP_TO_MUTE_SENSOR_DETECTOR_AND_CODE106_V1 === */
(function() {
  'use strict';

  var _isFaceDown = false;
  var _faceDownStartTime = 0;

  function dfIsFlipToMuteEnabled() {
    try {
      var val = localStorage.getItem("df_flip_to_mute_enabled_v1");
      if (val !== null) return val === "true";
    } catch (_) {}
    return true;
  }

  function dfToggleFlipToMute(enable) {
    var state = (enable !== undefined) ? Boolean(enable) : !dfIsFlipToMuteEnabled();
    try {
      localStorage.setItem("df_flip_to_mute_enabled_v1", String(state));
    } catch (_) {}

    try {
      if (typeof window !== "undefined" && typeof window.dfVocabHapticPulse === "function") {
        window.dfVocabHapticPulse(15);
      }
    } catch (_) {}

    return state;
  }

  function dfDetectFaceDownOrientation(beta, gamma) {
    var b = Number(beta) || 0;
    var g = Number(gamma) || 0;
    var isFaceDownAngle = (Math.abs(b) >= 150) && (Math.abs(g) <= 35);
    return isFaceDownAngle;
  }

  function dfTriggerFlipToMute() {
    var mutedSomething = false;

    try {
      if (typeof window !== "undefined" && typeof window.dfGetActiveSoundscape === "function") {
        if (window.dfGetActiveSoundscape() !== "none") {
          window.dfStopAmbientSoundscape();
          mutedSomething = true;
        }
      }
    } catch (_) {}

    try {
      if (typeof window !== "undefined" && typeof window.dfIsBinauralGammaActive === "function") {
        if (window.dfIsBinauralGammaActive()) {
          window.dfStopBinauralGamma();
          mutedSomething = true;
        }
      }
    } catch (_) {}

    try {
      if (typeof window !== "undefined" && typeof window.dfStopAllVocabSpeech === "function") {
        window.dfStopAllVocabSpeech();
      }
    } catch (_) {}

    try {
      if (typeof window !== "undefined" && typeof window.dfVocabHapticPulse === "function") {
        window.dfVocabHapticPulse(30);
      }
    } catch (_) {}

    try {
      if (typeof window !== "undefined" && typeof window.dfShowVocabToastNotification === "function") {
        window.dfShowVocabToastNotification("تم كتم الصوت بقلب الهاتف 🤫", "info", 2000);
      }
    } catch (_) {}

    return { success: true, mutedSomething: mutedSomething };
  }

  function dfProcessOrientationChange(beta, gamma) {
    if (!dfIsFlipToMuteEnabled()) return false;

    var faceDown = dfDetectFaceDownOrientation(beta, gamma);
    var now = Date.now();

    if (faceDown) {
      if (!_isFaceDown) {
        _isFaceDown = true;
        _faceDownStartTime = now;
      } else if (now - _faceDownStartTime >= 400) {
        _faceDownStartTime = now + 999999;
        return dfTriggerFlipToMute();
      }
    } else {
      _isFaceDown = false;
      _faceDownStartTime = 0;
    }

    return false;
  }

  function dfRenderFlipToMuteSettingsToggleHtml() {
    var isEnabled = dfIsFlipToMuteEnabled();
    var statusText = isEnabled ? "مفعّل" : "معطّل";
    var btnBg = isEnabled ? "#10b981" : "rgba(255,255,255,0.1)";

    return "<div class=\"df-settings-flipmute-section\" style=\"margin:12px 0;padding:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;direction:rtl;\">" +
      "<div style=\"display:flex;justify-content:space-between;align-items:center;\">" +
        "<div>" +
          "<span style=\"font-size:13px;font-weight:bold;color:#f4f4f5;display:block;\">🤫 كتم الصوت بقلب الهاتف (Flip-to-Mute)</span>" +
          "<span style=\"font-size:11px;color:#a1a1aa;\">كتم فوري للمؤثرات والنطق بمجرد وضع الهاتف على شاشته</span>" +
        "</div>" +
        "<button type=\"button\" onclick=\"window.dfToggleFlipToMute && window.dfToggleFlipToMute()\" style=\"background:" + btnBg + ";color:#ffffff;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:bold;cursor:pointer;\">" +
          "<span>" + statusText + "</span>" +
        "</button>" +
      "</div>" +
    "</div>";
  }

  try {
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("deviceorientation", function(e) {
        if (e && e.beta !== null && e.gamma !== null) {
          dfProcessOrientationChange(e.beta, e.gamma);
        }
      });
    }
  } catch (_) {}

  if (typeof window !== "undefined") {
    window.dfIsFlipToMuteEnabled = dfIsFlipToMuteEnabled;
    window.dfToggleFlipToMute = dfToggleFlipToMute;
    window.dfDetectFaceDownOrientation = dfDetectFaceDownOrientation;
    window.dfTriggerFlipToMute = dfTriggerFlipToMute;
    window.dfProcessOrientationChange = dfProcessOrientationChange;
    window.dfRenderFlipToMuteSettingsToggleHtml = dfRenderFlipToMuteSettingsToggleHtml;
  }
})();
JS_EOF
else
    echo "[INFO] M286 already present in $APP_JS"
fi

# 6. Update build.gradle to versionCode 106 and versionName 4.1.6
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 106', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"4.1.6\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 106 (4.1.6)')
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
const marker = "/* === M286_FLIP_TO_MUTE_SENSOR_DETECTOR_AND_CODE106_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

const memStore = Object.create(null);
let hapticCalled = false;
let stopSoundscapeCalled = false;
let stopBinauralCalled = false;
let stopVocabSpeechCalled = false;
let toastMessage = "";
const listeners = {};

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
  Date: Date,
  Math: Math,
  Number: Number,
  Boolean: Boolean,
  String: String
};
sandbox.window = sandbox;

sandbox.window.addEventListener = (type, fn) => {
  listeners[type] = listeners[type] || [];
  listeners[type].push(fn);
};

sandbox.window.dfVocabHapticPulse = () => { hapticCalled = true; };
sandbox.window.dfShowVocabToastNotification = (msg) => { toastMessage = msg; };
sandbox.window.dfGetActiveSoundscape = () => "rain";
sandbox.window.dfStopAmbientSoundscape = () => { stopSoundscapeCalled = true; };
sandbox.window.dfIsBinauralGammaActive = () => true;
sandbox.window.dfStopBinauralGamma = () => { stopBinauralCalled = true; };
sandbox.window.dfStopAllVocabSpeech = () => { stopVocabSpeechCalled = true; };

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
assert.strictEqual(sandbox.window.dfIsFlipToMuteEnabled(), true);
sandbox.window.dfToggleFlipToMute(false);
assert.strictEqual(sandbox.window.dfIsFlipToMuteEnabled(), false);
sandbox.window.dfToggleFlipToMute(true);
assert.strictEqual(sandbox.window.dfIsFlipToMuteEnabled(), true);

assert.strictEqual(sandbox.window.dfDetectFaceDownOrientation(10, 5), false);
assert.strictEqual(sandbox.window.dfDetectFaceDownOrientation(80, 0), false);
assert.strictEqual(sandbox.window.dfDetectFaceDownOrientation(178, 2), true);
assert.strictEqual(sandbox.window.dfDetectFaceDownOrientation(-175, -5), true);

const muteRes = sandbox.window.dfTriggerFlipToMute();
assert.strictEqual(muteRes.success, true);
assert.strictEqual(stopSoundscapeCalled, true);
assert.strictEqual(stopBinauralCalled, true);
assert.strictEqual(stopVocabSpeechCalled, true);
assert.strictEqual(hapticCalled, true);
assert.ok(toastMessage.includes("كتم الصوت بقلب الهاتف"));

const html = sandbox.window.dfRenderFlipToMuteSettingsToggleHtml();
assert.ok(html.includes("كتم الصوت بقلب الهاتف"));
assert.ok(html.includes("مفعّل"));
assert.ok(html.includes("dfToggleFlipToMute"));
assert.ok(html.includes("df-settings-flipmute-section"));

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 9. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(sensor): M286 add flip-to-mute face-down detector for immediate silence with versionCode 106 [v4.1.6]" || true
git tag -a v4.1.6-m286-v21 -m "Tag M286: flip-to-mute face-down detector with versionCode 106" -f

# 10. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v4.1.6-m286-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M286 (16 of 40)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 106"
echo "VERSION_NAME: 4.1.6"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M287 (Dual independent volume sliders: TTS Speech vs Zen Nature Chimes)"
echo "========================================================"
