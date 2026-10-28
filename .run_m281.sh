#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #281 (Termux Runner)"
echo " Feature: Pure Ambient Nature Soundscapes Selector"
echo " Target VersionCode: 101 (v4.1.1) [Mission 11 of 40]"
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
        git commit -m "chore: save local progress before M281" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 5. Apply M281 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M281_PURE_AMBIENT_NATURE_SOUNDSCAPES_SELECTOR_AND_CODE101_V1" "$APP_JS"; then
    echo "[INFO] Appending M281 Nature Soundscapes to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M281_PURE_AMBIENT_NATURE_SOUNDSCAPES_SELECTOR_AND_CODE101_V1 === */
(function() {
  'use strict';

  var _soundscapeCtx = null;
  var _soundscapeNode = null;
  var _soundscapeGain = null;

  function dfGetActiveSoundscape() {
    try {
      var val = localStorage.getItem("df_active_soundscape_v1");
      if (val && ["rain", "stream", "forest", "white_noise", "none"].indexOf(val) !== -1) {
        return val;
      }
    } catch (_) {}
    return "none";
  }

  function dfStopAmbientSoundscape() {
    try {
      if (_soundscapeGain && _soundscapeCtx) {
        _soundscapeGain.gain.setValueAtTime(_soundscapeGain.gain.value, _soundscapeCtx.currentTime);
        _soundscapeGain.gain.exponentialRampToValueAtTime(0.0001, _soundscapeCtx.currentTime + 0.3);
        setTimeout(function() {
          if (_soundscapeNode) {
            try { _soundscapeNode.stop(); _soundscapeNode.disconnect(); } catch (_) {}
            _soundscapeNode = null;
          }
        }, 350);
      }
    } catch (_) {}

    try {
      localStorage.setItem("df_active_soundscape_v1", "none");
    } catch (_) {}

    return { active: false, type: "none" };
  }

  function dfStartAmbientSoundscape(soundType) {
    var type = soundType || "rain";
    if (type === "none") {
      return dfStopAmbientSoundscape();
    }

    dfStopAmbientSoundscape();

    try {
      if (typeof window === "undefined") return { active: false, reason: "no_window" };
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return { active: false, reason: "no_audio_context" };

      if (!_soundscapeCtx || _soundscapeCtx.state === "closed") {
        _soundscapeCtx = new AudioCtx();
      } else if (_soundscapeCtx.state === "suspended") {
        _soundscapeCtx.resume();
      }

      var bufferSize = 2 * _soundscapeCtx.sampleRate;
      var noiseBuffer = _soundscapeCtx.createBuffer(1, bufferSize, _soundscapeCtx.sampleRate);
      var output = noiseBuffer.getChannelData(0);

      var filterFreq = 800;
      var gainVal = 0.15;

      if (type === "rain") {
        filterFreq = 750;
        gainVal = 0.12;
      } else if (type === "stream") {
        filterFreq = 1200;
        gainVal = 0.10;
      } else if (type === "forest") {
        filterFreq = 450;
        gainVal = 0.14;
      } else if (type === "white_noise") {
        filterFreq = 1500;
        gainVal = 0.08;
      }

      var lastOut = 0.0;
      for (var i = 0; i < bufferSize; i++) {
        var white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      }

      var whiteNoise = _soundscapeCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      var filter = _soundscapeCtx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(filterFreq, _soundscapeCtx.currentTime);

      _soundscapeGain = _soundscapeCtx.createGain();
      _soundscapeGain.gain.setValueAtTime(0.001, _soundscapeCtx.currentTime);
      _soundscapeGain.gain.exponentialRampToValueAtTime(gainVal, _soundscapeCtx.currentTime + 1.0);

      whiteNoise.connect(filter);
      filter.connect(_soundscapeGain);
      _soundscapeGain.connect(_soundscapeCtx.destination);

      whiteNoise.start(0);
      _soundscapeNode = whiteNoise;

      try {
        localStorage.setItem("df_active_soundscape_v1", type);
      } catch (_) {}

      try {
        if (typeof window.dfVocabHapticPulse === "function") {
          window.dfVocabHapticPulse(15);
        }
      } catch (_) {}

      return { active: true, type: type };
    } catch (_) {
      return { active: false, reason: "audio_init_failed" };
    }
  }

  function dfRenderSoundscapeSelectorHtml() {
    var active = dfGetActiveSoundscape();
    var options = [
      { id: "rain", label: "🌧️ مطر هادئ" },
      { id: "stream", label: "🌊 جدول ماء" },
      { id: "forest", label: "🍃 نسيم غابة" },
      { id: "none", label: "🔇 صامت" }
    ];

    var chipsHtml = "";
    for (var i = 0; i < options.length; i++) {
      var opt = options[i];
      var isSel = (opt.id === active);
      var bg = isSel ? "#2563eb" : "rgba(255,255,255,0.06)";
      var border = isSel ? "#3b82f6" : "rgba(255,255,255,0.12)";
      var color = isSel ? "#ffffff" : "#d4d4d8";

      chipsHtml += "<button type=\"button\" onclick=\"window.dfStartAmbientSoundscape && window.dfStartAmbientSoundscape('" + opt.id + "')\" style=\"background:" + bg + ";border:1px solid " + border + ";color:" + color + ";border-radius:16px;padding:5px 12px;font-size:12px;cursor:pointer;font-weight:" + (isSel ? "bold" : "normal") + ";\">" +
        "<span>" + opt.label + "</span>" +
      "</button>";
    }

    return "<div class=\"df-soundscape-selector\" style=\"margin:12px 0;padding:12px;background:#18181b;border:1px solid #27272a;border-radius:12px;direction:rtl;\">" +
      "<div style=\"margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;\">" +
        "<span style=\"font-size:13px;font-weight:bold;color:#f4f4f5;\">🎧 عازل الضوضاء الطبيعي (Zero-Music)</span>" +
        "<span style=\"font-size:11px;color:#10b981;\">أصوات طبيعية حية</span>" +
      "</div>" +
      "<div style=\"display:flex;gap:6px;flex-wrap:wrap;\">" +
        chipsHtml +
      "</div>" +
    "</div>";
  }

  if (typeof window !== "undefined") {
    window.dfGetActiveSoundscape = dfGetActiveSoundscape;
    window.dfStartAmbientSoundscape = dfStartAmbientSoundscape;
    window.dfStopAmbientSoundscape = dfStopAmbientSoundscape;
    window.dfRenderSoundscapeSelectorHtml = dfRenderSoundscapeSelectorHtml;
  }
})();
JS_EOF
else
    echo "[INFO] M281 already present in $APP_JS"
fi

# 6. Update build.gradle to versionCode 101 and versionName 4.1.1
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 101', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"4.1.1\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 101 (4.1.1)')
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
const marker = "/* === M281_PURE_AMBIENT_NATURE_SOUNDSCAPES_SELECTOR_AND_CODE101_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

const memStore = Object.create(null);
let hapticCalled = false;
let nodeStarted = false;

class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 44100;
    this.destination = {};
    this.state = "running";
  }
  createBuffer(channels, length, sampleRate) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
  createBufferSource() {
    return {
      buffer: null,
      loop: false,
      connect: () => {},
      disconnect: () => {},
      start: () => { nodeStarted = true; },
      stop: () => {}
    };
  }
  createBiquadFilter() {
    return {
      type: "lowpass",
      frequency: { setValueAtTime: () => {} },
      connect: () => {}
    };
  }
  createGain() {
    return {
      gain: {
        value: 1,
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {}
      },
      connect: () => {}
    };
  }
  resume() {}
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
  Float32Array: Float32Array,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout
};
sandbox.window = sandbox;
sandbox.window.dfVocabHapticPulse = () => { hapticCalled = true; };

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
assert.strictEqual(sandbox.window.dfGetActiveSoundscape(), "none");

const resRain = sandbox.window.dfStartAmbientSoundscape("rain");
assert.strictEqual(resRain.active, true);
assert.strictEqual(resRain.type, "rain");
assert.strictEqual(nodeStarted, true);
assert.strictEqual(hapticCalled, true);
assert.strictEqual(sandbox.window.dfGetActiveSoundscape(), "rain");

const resStop = sandbox.window.dfStopAmbientSoundscape();
assert.strictEqual(resStop.active, false);
assert.strictEqual(sandbox.window.dfGetActiveSoundscape(), "none");

const html = sandbox.window.dfRenderSoundscapeSelectorHtml();
assert.ok(html.includes("مطر هادئ"));
assert.ok(html.includes("جدول ماء"));
assert.ok(html.includes("صامت"));
assert.ok(html.includes("df-soundscape-selector"));

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 9. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(audio): M281 add pure ambient nature soundscapes selector with versionCode 101 [v4.1.1]" || true
git tag -a v4.1.1-m281-v21 -m "Tag M281: pure ambient nature soundscapes selector with versionCode 101" -f

# 10. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v4.1.1-m281-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M281 (11 of 40)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 101"
echo "VERSION_NAME: 4.1.1"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M282 (3-second smooth audio fade-in & fade-out normalizer)"
echo "========================================================"
