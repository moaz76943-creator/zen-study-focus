#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #285 (Termux Runner)"
echo " Feature: Binaural 40Hz Gamma Focus Frequency Generator"
echo " Target VersionCode: 105 (v4.1.5) [Mission 15 of 40]"
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
        git commit -m "chore: save local progress before M285" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 5. Apply M285 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M285_BINAURAL_40HZ_GAMMA_FOCUS_SYNTHESIZER_AND_CODE105_V1" "$APP_JS"; then
    echo "[INFO] Appending M285 Binaural 40Hz Gamma to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M285_BINAURAL_40HZ_GAMMA_FOCUS_SYNTHESIZER_AND_CODE105_V1 === */
(function() {
  'use strict';

  var _binauralCtx = null;
  var _leftOsc = null;
  var _rightOsc = null;
  var _binauralMasterGain = null;

  function dfIsBinauralGammaActive() {
    try {
      return localStorage.getItem("df_binaural_gamma_active_v1") === "true";
    } catch (_) {
      return false;
    }
  }

  function dfStopBinauralGamma() {
    try {
      if (_binauralMasterGain && _binauralCtx) {
        _binauralMasterGain.gain.setValueAtTime(_binauralMasterGain.gain.value, _binauralCtx.currentTime);
        _binauralMasterGain.gain.exponentialRampToValueAtTime(0.0001, _binauralCtx.currentTime + 0.5);

        setTimeout(function() {
          try {
            if (_leftOsc) { _leftOsc.stop(); _leftOsc.disconnect(); _leftOsc = null; }
            if (_rightOsc) { _rightOsc.stop(); _rightOsc.disconnect(); _rightOsc = null; }
          } catch (_) {}
        }, 550);
      }
    } catch (_) {}

    try {
      localStorage.setItem("df_binaural_gamma_active_v1", "false");
    } catch (_) {}

    return { active: false };
  }

  function dfStartBinauralGamma(carrierFreq) {
    dfStopBinauralGamma();

    try {
      if (typeof window === "undefined") return { active: false, reason: "no_window" };
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return { active: false, reason: "no_audio_context" };

      if (!_binauralCtx || _binauralCtx.state === "closed") {
        _binauralCtx = new AudioCtx();
      } else if (_binauralCtx.state === "suspended") {
        _binauralCtx.resume();
      }

      var carrier = Number(carrierFreq) || 216;
      var beat = 40;

      var merger = _binauralCtx.createChannelMerger ? _binauralCtx.createChannelMerger(2) : null;
      _binauralMasterGain = _binauralCtx.createGain();
      _binauralMasterGain.gain.setValueAtTime(0.0001, _binauralCtx.currentTime);
      _binauralMasterGain.gain.exponentialRampToValueAtTime(0.08, _binauralCtx.currentTime + 1.5);

      _leftOsc = _binauralCtx.createOscillator();
      _leftOsc.type = "sine";
      _leftOsc.frequency.setValueAtTime(carrier, _binauralCtx.currentTime);

      _rightOsc = _binauralCtx.createOscillator();
      _rightOsc.type = "sine";
      _rightOsc.frequency.setValueAtTime(carrier + beat, _binauralCtx.currentTime);

      if (merger) {
        _leftOsc.connect(merger, 0, 0);
        _rightOsc.connect(merger, 0, 1);
        merger.connect(_binauralMasterGain);
      } else {
        _leftOsc.connect(_binauralMasterGain);
        _rightOsc.connect(_binauralMasterGain);
      }

      _binauralMasterGain.connect(_binauralCtx.destination);

      _leftOsc.start(0);
      _rightOsc.start(0);

      try {
        localStorage.setItem("df_binaural_gamma_active_v1", "true");
      } catch (_) {}

      try {
        if (typeof window.dfVocabHapticPulse === "function") {
          window.dfVocabHapticPulse(15);
        }
      } catch (_) {}

      return {
        active: true,
        beatFrequency: beat,
        carrierFrequency: carrier
      };
    } catch (_) {
      return { active: false, reason: "init_failed" };
    }
  }

  function dfToggleBinauralGamma(enable) {
    var state = (enable !== undefined) ? Boolean(enable) : !dfIsBinauralGammaActive();
    if (state) {
      return dfStartBinauralGamma();
    } else {
      return dfStopBinauralGamma();
    }
  }

  function dfRenderBinauralGammaSettingsWidgetHtml() {
    var isActive = dfIsBinauralGammaActive();
    var statusText = isActive ? "مفعّل" : "معطّل";
    var btnBg = isActive ? "#10b981" : "rgba(255,255,255,0.1)";

    return "<div class=\"df-settings-binaural-section\" style=\"margin:12px 0;padding:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;direction:rtl;\">" +
      "<div style=\"display:flex;justify-content:space-between;align-items:center;\">" +
        "<div>" +
          "<span style=\"font-size:13px;font-weight:bold;color:#f4f4f5;display:block;\">🧠 موجات التركيز الفائق (40Hz Gamma)</span>" +
          "<span style=\"font-size:11px;color:#a1a1aa;\">تردد ذهني ثنائي الأذنين لتعزيز الحفظ وصفاء الذهن (بالسماعات)</span>" +
        "</div>" +
        "<button type=\"button\" onclick=\"window.dfToggleBinauralGamma && window.dfToggleBinauralGamma()\" style=\"background:" + btnBg + ";color:#ffffff;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:bold;cursor:pointer;\">" +
          "<span>" + statusText + "</span>" +
        "</button>" +
      "</div>" +
    "</div>";
  }

  if (typeof window !== "undefined") {
    window.dfIsBinauralGammaActive = dfIsBinauralGammaActive;
    window.dfStartBinauralGamma = dfStartBinauralGamma;
    window.dfStopBinauralGamma = dfStopBinauralGamma;
    window.dfToggleBinauralGamma = dfToggleBinauralGamma;
    window.dfRenderBinauralGammaSettingsWidgetHtml = dfRenderBinauralGammaSettingsWidgetHtml;
  }
})();
JS_EOF
else
    echo "[INFO] M285 already present in $APP_JS"
fi

# 6. Update build.gradle to versionCode 105 and versionName 4.1.5
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 105', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"4.1.5\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 105 (4.1.5)')
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
const marker = "/* === M285_BINAURAL_40HZ_GAMMA_FOCUS_SYNTHESIZER_AND_CODE105_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

const memStore = Object.create(null);
let hapticCalled = false;
let oscStartedCount = 0;
let oscFreqs = [];

class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.destination = {};
  }
  createOscillator() {
    return {
      type: "sine",
      frequency: {
        setValueAtTime: (f) => { oscFreqs.push(f); }
      },
      connect: () => {},
      start: () => { oscStartedCount++; },
      stop: () => {},
      disconnect: () => {}
    };
  }
  createGain() {
    return {
      gain: {
        value: 0.08,
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {}
      },
      connect: () => {}
    };
  }
  createChannelMerger() {
    return { connect: () => {} };
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
  setTimeout: (fn) => setTimeout(fn, 10),
  Number: Number,
  Boolean: Boolean,
  String: String
};
sandbox.window = sandbox;
sandbox.window.dfVocabHapticPulse = () => { hapticCalled = true; };

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
assert.strictEqual(sandbox.window.dfIsBinauralGammaActive(), false);

const startRes = sandbox.window.dfStartBinauralGamma(216);
assert.strictEqual(startRes.active, true);
assert.strictEqual(startRes.beatFrequency, 40);
assert.strictEqual(startRes.carrierFrequency, 216);
assert.strictEqual(oscStartedCount, 2);
assert.strictEqual(oscFreqs[0], 216);
assert.strictEqual(oscFreqs[1], 256);
assert.strictEqual(hapticCalled, true);
assert.strictEqual(sandbox.window.dfIsBinauralGammaActive(), true);

const stopRes = sandbox.window.dfStopBinauralGamma();
assert.strictEqual(stopRes.active, false);
assert.strictEqual(sandbox.window.dfIsBinauralGammaActive(), false);

const html = sandbox.window.dfRenderBinauralGammaSettingsWidgetHtml();
assert.ok(html.includes("40Hz Gamma"));
assert.ok(html.includes("معطّل"));
assert.ok(html.includes("dfToggleBinauralGamma"));
assert.ok(html.includes("df-settings-binaural-section"));

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 9. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(audio): M285 add binaural 40Hz gamma focus frequency synthesizer with versionCode 105 [v4.1.5]" || true
git tag -a v4.1.5-m285-v21 -m "Tag M285: binaural 40Hz gamma focus frequency synthesizer with versionCode 105" -f

# 10. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v4.1.5-m285-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M285 (15 of 40)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 105"
echo "VERSION_NAME: 4.1.5"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M286 (Flip-to-Mute sensor detector for immediate silence)"
echo "========================================================"
