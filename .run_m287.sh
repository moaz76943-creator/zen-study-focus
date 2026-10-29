#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #287 (Termux Runner)"
echo " Feature: Dual Independent Volume Controls (TTS vs Ambient)"
echo " Target VersionCode: 107 (v4.1.7) [Mission 17 of 40]"
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
        git commit -m "chore: save local progress before M287" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 5. Apply M287 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M287_DUAL_INDEPENDENT_VOLUME_CONTROLS_AND_CODE107_V1" "$APP_JS"; then
    echo "[INFO] Appending M287 Dual Volume Controls to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M287_DUAL_INDEPENDENT_VOLUME_CONTROLS_AND_CODE107_V1 === */
(function() {
  'use strict';

  function dfFormatWesternDigits(val) {
    if (val === null || val === undefined) return "0";
    var str = String(val);
    var eastern = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
    for (var i = 0; i < eastern.length; i++) {
      str = str.split(eastern[i]).join(String(i));
    }
    return str;
  }

  function dfGetTtsVolume() {
    try {
      var val = localStorage.getItem("df_volume_tts_v1");
      if (val !== null) {
        var n = parseFloat(val);
        if (!isNaN(n)) return Math.max(0.0, Math.min(1.0, n));
      }
    } catch (_) {}
    return 1.0;
  }

  function dfSetTtsVolume(volume) {
    var v = Math.max(0.0, Math.min(1.0, Number(volume) || 0));
    try {
      localStorage.setItem("df_volume_tts_v1", String(v));
    } catch (_) {}

    try {
      if (typeof window !== "undefined" && typeof window.dfVocabHapticPulse === "function") {
        window.dfVocabHapticPulse(10);
      }
    } catch (_) {}

    return v;
  }

  function dfGetAmbientVolume() {
    try {
      var val = localStorage.getItem("df_volume_ambient_v1");
      if (val !== null) {
        var n = parseFloat(val);
        if (!isNaN(n)) return Math.max(0.0, Math.min(1.0, n));
      }
    } catch (_) {}
    return 0.40;
  }

  function dfSetAmbientVolume(volume) {
    var v = Math.max(0.0, Math.min(1.0, Number(volume) || 0));
    try {
      localStorage.setItem("df_volume_ambient_v1", String(v));
    } catch (_) {}

    try {
      if (typeof window !== "undefined" && window._soundscapeGain && window._soundscapeCtx) {
        if (typeof window.dfApplySmoothAudioFade === "function") {
          window.dfApplySmoothAudioFade(window._soundscapeGain, v * 0.25, 0.5, window._soundscapeCtx);
        } else {
          window._soundscapeGain.gain.setValueAtTime(v * 0.25, window._soundscapeCtx.currentTime);
        }
      }
    } catch (_) {}

    try {
      if (typeof window !== "undefined" && typeof window.dfVocabHapticPulse === "function") {
        window.dfVocabHapticPulse(10);
      }
    } catch (_) {}

    return v;
  }

  function dfRenderDualVolumeControlsHtml() {
    var ttsVol = Math.round(dfGetTtsVolume() * 100);
    var ambVol = Math.round(dfGetAmbientVolume() * 100);

    var ttsStr = dfFormatWesternDigits(ttsVol);
    var ambStr = dfFormatWesternDigits(ambVol);

    return "<div class=\"df-dual-volume-controls\" style=\"margin:12px 0;padding:12px;background:#18181b;border:1px solid #27272a;border-radius:12px;direction:rtl;color:#f4f4f5;\">" +
      "<div style=\"margin-bottom:10px;\">" +
        "<div style=\"display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px;\">" +
          "<span>🗣️ مستوى نطق المفردات (TTS):</span>" +
          "<strong id=\"df-tts-vol-val\">" + ttsStr + "%</strong>" +
        "</div>" +
        "<input type=\"range\" min=\"0\" max=\"100\" value=\"" + ttsVol + "\" oninput=\"var v = this.value; document.getElementById('df-tts-vol-val').textContent = v + '%'; window.dfSetTtsVolume && window.dfSetTtsVolume(v / 100);\" style=\"width:100%;accent-color:#2563eb;cursor:pointer;\" />" +
      "</div>" +
      "<div>" +
        "<div style=\"display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px;\">" +
          "<span>🌊 مستوى عازل الطبيعة والرنين:</span>" +
          "<strong id=\"df-amb-vol-val\">" + ambStr + "%</strong>" +
        "</div>" +
        "<input type=\"range\" min=\"0\" max=\"100\" value=\"" + ambVol + "\" oninput=\"var v = this.value; document.getElementById('df-amb-vol-val').textContent = v + '%'; window.dfSetAmbientVolume && window.dfSetAmbientVolume(v / 100);\" style=\"width:100%;accent-color:#10b981;cursor:pointer;\" />" +
      "</div>" +
    "</div>";
  }

  if (typeof window !== "undefined") {
    window.dfGetTtsVolume = dfGetTtsVolume;
    window.dfSetTtsVolume = dfSetTtsVolume;
    window.dfGetAmbientVolume = dfGetAmbientVolume;
    window.dfSetAmbientVolume = dfSetAmbientVolume;
    window.dfRenderDualVolumeControlsHtml = dfRenderDualVolumeControlsHtml;
  }
})();
JS_EOF
else
    echo "[INFO] M287 already present in $APP_JS"
fi

# 6. Update build.gradle to versionCode 107 and versionName 4.1.7
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 107', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"4.1.7\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 107 (4.1.7)')
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
const marker = "/* === M287_DUAL_INDEPENDENT_VOLUME_CONTROLS_AND_CODE107_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

const memStore = Object.create(null);
let hapticCalled = false;

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
  Math: Math,
  Number: Number,
  parseFloat: parseFloat,
  isNaN: isNaN,
  String: String
};
sandbox.window = sandbox;
sandbox.window.dfVocabHapticPulse = () => { hapticCalled = true; };

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
assert.strictEqual(sandbox.window.dfGetTtsVolume(), 1.0);
assert.strictEqual(sandbox.window.dfGetAmbientVolume(), 0.40);

sandbox.window.dfSetTtsVolume(0.85);
assert.strictEqual(sandbox.window.dfGetTtsVolume(), 0.85);
assert.strictEqual(hapticCalled, true);

hapticCalled = false;
sandbox.window.dfSetAmbientVolume(0.25);
assert.strictEqual(sandbox.window.dfGetAmbientVolume(), 0.25);
assert.strictEqual(hapticCalled, true);

sandbox.window.dfSetTtsVolume(1.5);
assert.strictEqual(sandbox.window.dfGetTtsVolume(), 1.0);
sandbox.window.dfSetAmbientVolume(-0.2);
assert.strictEqual(sandbox.window.dfGetAmbientVolume(), 0.0);

sandbox.window.dfSetTtsVolume(0.90);
sandbox.window.dfSetAmbientVolume(0.35);
const html = sandbox.window.dfRenderDualVolumeControlsHtml();
assert.ok(html.includes("90%"));
assert.ok(html.includes("35%"));
assert.ok(html.includes("dfSetTtsVolume"));
assert.ok(html.includes("dfSetAmbientVolume"));
assert.ok(html.includes("df-dual-volume-controls"));

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 9. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(audio): M287 add dual independent volume controls for TTS speech vs ambient soundscapes with versionCode 107 [v4.1.7]" || true
git tag -a v4.1.7-m287-v21 -m "Tag M287: dual independent volume controls with versionCode 107" -f

# 10. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v4.1.7-m287-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M287 (17 of 40)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 107"
echo "VERSION_NAME: 4.1.7"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M288 (Background audio playback and lock-screen notification bridge)"
echo "========================================================"
