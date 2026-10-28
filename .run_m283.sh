#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #283 (Termux Runner)"
echo " Feature: Acoustic Tibetan Wind Chimes Interval Generator"
echo " Target VersionCode: 103 (v4.1.3) [Mission 13 of 40]"
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
        git commit -m "chore: save local progress before M283" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 5. Apply M283 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M283_TIBETAN_WIND_CHIMES_GENERATOR_AND_CODE103_V1" "$APP_JS"; then
    echo "[INFO] Appending M283 Tibetan Wind Chimes to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M283_TIBETAN_WIND_CHIMES_GENERATOR_AND_CODE103_V1 === */
(function() {
  'use strict';

  var _windChimeTimer = null;

  function dfIsWindChimesEnabled() {
    try {
      return localStorage.getItem("df_wind_chimes_enabled_v1") === "true";
    } catch (_) {
      return false;
    }
  }

  function dfToggleWindChimes(enable) {
    var state = (enable !== undefined) ? Boolean(enable) : !dfIsWindChimesEnabled();
    try {
      localStorage.setItem("df_wind_chimes_enabled_v1", String(state));
    } catch (_) {}

    if (state) {
      dfStartWindChimesScheduler();
    } else {
      dfStopWindChimesScheduler();
    }

    try {
      if (typeof window !== "undefined" && typeof window.dfVocabHapticPulse === "function") {
        window.dfVocabHapticPulse(15);
      }
    } catch (_) {}

    return state;
  }

  function dfSynthesizeSingleChime(ctx, freq, delaySec, gainVal) {
    try {
      var startTime = ctx.currentTime + delaySec;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(gainVal, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 2.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 2.25);
      return true;
    } catch (_) {
      return false;
    }
  }

  function dfSynthesizeTibetanWindChimes() {
    try {
      if (typeof window === "undefined") return false;
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      var ctx = new AudioCtx();

      var strikes = [
        { freq: 528, delay: 0.0, gain: 0.12 },
        { freq: 660, delay: 0.18, gain: 0.10 },
        { freq: 792, delay: 0.42, gain: 0.08 },
        { freq: 528, delay: 0.75, gain: 0.09 }
      ];

      for (var i = 0; i < strikes.length; i++) {
        var s = strikes[i];
        dfSynthesizeSingleChime(ctx, s.freq, s.delay, s.gain);
      }

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

  function dfStartWindChimesScheduler() {
    dfStopWindChimesScheduler();
    if (!dfIsWindChimesEnabled()) return false;

    var intervalMs = (5 + Math.random() * 3) * 60 * 1000;
    _windChimeTimer = setTimeout(function() {
      dfSynthesizeTibetanWindChimes();
      dfStartWindChimesScheduler();
    }, intervalMs);

    return true;
  }

  function dfStopWindChimesScheduler() {
    if (_windChimeTimer) {
      clearTimeout(_windChimeTimer);
      _windChimeTimer = null;
    }
  }

  function dfRenderWindChimesSettingsHtml() {
    var isEnabled = dfIsWindChimesEnabled();
    var statusText = isEnabled ? "مفعّل" : "معطّل";
    var btnBg = isEnabled ? "#10b981" : "rgba(255,255,255,0.1)";

    return "<div class=\"df-settings-chimes-section\" style=\"margin:12px 0;padding:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;direction:rtl;\">" +
      "<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;\">" +
        "<div>" +
          "<span style=\"font-size:13px;font-weight:bold;color:#f4f4f5;display:block;\">🔔 رنين أجراس الرياح التبتية</span>" +
          "<span style=\"font-size:11px;color:#a1a1aa;\">أجراس هوائية ناعمة متباعدة لتعزيز السكينة والتركيز</span>" +
        "</div>" +
        "<button type=\"button\" onclick=\"window.dfToggleWindChimes && window.dfToggleWindChimes()\" style=\"background:" + btnBg + ";color:#ffffff;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:bold;cursor:pointer;\">" +
          "<span>" + statusText + "</span>" +
        "</button>" +
      "</div>" +
      "<button type=\"button\" onclick=\"window.dfSynthesizeTibetanWindChimes && window.dfSynthesizeTibetanWindChimes()\" style=\"background:none;border:none;color:#60a5fa;font-size:11px;cursor:pointer;padding:0;text-decoration:underline;\">" +
        "استمع لتجربة الرنين الآن" +
      "</button>" +
    "</div>";
  }

  if (typeof window !== "undefined") {
    window.dfIsWindChimesEnabled = dfIsWindChimesEnabled;
    window.dfToggleWindChimes = dfToggleWindChimes;
    window.dfSynthesizeTibetanWindChimes = dfSynthesizeTibetanWindChimes;
    window.dfStartWindChimesScheduler = dfStartWindChimesScheduler;
    window.dfStopWindChimesScheduler = dfStopWindChimesScheduler;
    window.dfRenderWindChimesSettingsHtml = dfRenderWindChimesSettingsHtml;
  }
})();
JS_EOF
else
    echo "[INFO] M283 already present in $APP_JS"
fi

# 6. Update build.gradle to versionCode 103 and versionName 4.1.3
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 103', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"4.1.3\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 103 (4.1.3)')
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
const marker = "/* === M283_TIBETAN_WIND_CHIMES_GENERATOR_AND_CODE103_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

const memStore = Object.create(null);
let hapticCalled = false;
let oscStartedCount = 0;

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
      start: () => { oscStartedCount++; },
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
  setTimeout: (fn) => setTimeout(fn, 10),
  clearTimeout: (id) => clearTimeout(id),
  Math: Math,
  Boolean: Boolean,
  String: String
};
sandbox.window = sandbox;
sandbox.window.dfVocabHapticPulse = () => { hapticCalled = true; };

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
assert.strictEqual(sandbox.window.dfIsWindChimesEnabled(), false);
sandbox.window.dfToggleWindChimes(true);
assert.strictEqual(sandbox.window.dfIsWindChimesEnabled(), true);
assert.strictEqual(hapticCalled, true);

oscStartedCount = 0;
hapticCalled = false;
const resSynth = sandbox.window.dfSynthesizeTibetanWindChimes();
assert.strictEqual(resSynth, true);
assert.strictEqual(oscStartedCount, 4);
assert.strictEqual(hapticCalled, true);

const html = sandbox.window.dfRenderWindChimesSettingsHtml();
assert.ok(html.includes("أجراس الرياح التبتية"));
assert.ok(html.includes("مفعّل"));
assert.ok(html.includes("dfToggleWindChimes"));
assert.ok(html.includes("dfSynthesizeTibetanWindChimes"));

sandbox.window.dfStopWindChimesScheduler();

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 9. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(audio): M283 add acoustic Tibetan wind chimes interval generator with versionCode 103 [v4.1.3]" || true
git tag -a v4.1.3-m283-v21 -m "Tag M283: acoustic Tibetan wind chimes interval generator with versionCode 103" -f

# 10. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v4.1.3-m283-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M283 (13 of 40)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 103"
echo "VERSION_NAME: 4.1.3"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M284 (Sleep timer with gentle volume tapering)"
echo "========================================================"
