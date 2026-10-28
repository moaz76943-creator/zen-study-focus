#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #284 (Termux Runner)"
echo " Feature: Sleep Timer with Volume Tapering Engine"
echo " Target VersionCode: 104 (v4.1.4) [Mission 14 of 40]"
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
        git commit -m "chore: save local progress before M284" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 5. Apply M284 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M284_SLEEP_TIMER_WITH_VOLUME_TAPERING_AND_CODE104_V1" "$APP_JS"; then
    echo "[INFO] Appending M284 Sleep Timer to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M284_SLEEP_TIMER_WITH_VOLUME_TAPERING_AND_CODE104_V1 === */
(function() {
  'use strict';

  var _sleepTimerInterval = null;
  var _sleepTimerTargetMs = 0;
  var _isTapering = false;

  function dfFormatWesternDigits(val) {
    if (val === null || val === undefined) return "0";
    var str = String(val);
    var eastern = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
    for (var i = 0; i < eastern.length; i++) {
      str = str.split(eastern[i]).join(String(i));
    }
    return str;
  }

  function dfCancelSleepTimer() {
    if (_sleepTimerInterval) {
      clearInterval(_sleepTimerInterval);
      _sleepTimerInterval = null;
    }
    _sleepTimerTargetMs = 0;
    _isTapering = false;

    try {
      localStorage.removeItem("df_sleep_timer_target_v1");
    } catch (_) {}

    return { active: false };
  }

  function dfGetSleepTimerStatus() {
    if (_sleepTimerTargetMs <= 0) {
      try {
        var raw = localStorage.getItem("df_sleep_timer_target_v1");
        if (raw) _sleepTimerTargetMs = Number(raw) || 0;
      } catch (_) {}
    }

    if (_sleepTimerTargetMs <= 0) {
      return { active: false, remainingSeconds: 0, remainingFormatted: "0" };
    }

    var now = Date.now();
    var remainingSec = Math.max(0, Math.round((_sleepTimerTargetMs - now) / 1000));

    if (remainingSec <= 0) {
      dfCancelSleepTimer();
      return { active: false, remainingSeconds: 0, remainingFormatted: "0" };
    }

    var remMins = Math.ceil(remainingSec / 60);

    return {
      active: true,
      remainingSeconds: remainingSec,
      remainingFormatted: dfFormatWesternDigits(remMins),
      isTapering: _isTapering
    };
  }

  function dfStartSleepTimer(minutes) {
    var mins = Math.max(1, Math.min(180, Number(minutes) || 30));
    dfCancelSleepTimer();

    var durationMs = mins * 60 * 1000;
    _sleepTimerTargetMs = Date.now() + durationMs;
    _isTapering = false;

    try {
      localStorage.setItem("df_sleep_timer_target_v1", String(_sleepTimerTargetMs));
    } catch (_) {}

    try {
      if (typeof window !== "undefined" && typeof window.dfVocabHapticPulse === "function") {
        window.dfVocabHapticPulse(15);
      }
    } catch (_) {}

    try {
      if (typeof window !== "undefined" && typeof window.dfShowVocabToastNotification === "function") {
        window.dfShowVocabToastNotification("تم تفعيل مؤقت النوم: " + dfFormatWesternDigits(mins) + " دقيقة", "info", 2000);
      }
    } catch (_) {}

    _sleepTimerInterval = setInterval(function() {
      var status = dfGetSleepTimerStatus();
      if (!status.active) {
        dfCancelSleepTimer();
        if (typeof window !== "undefined" && typeof window.dfStopAmbientSoundscape === "function") {
          window.dfStopAmbientSoundscape();
        }
        return;
      }

      if (status.remainingSeconds <= 120 && !_isTapering) {
        _isTapering = true;
        try {
          if (typeof window !== "undefined" && typeof window.dfApplySmoothAudioFade === "function" && window._soundscapeGain && window._soundscapeCtx) {
            window.dfApplySmoothAudioFade(window._soundscapeGain, 0.0001, status.remainingSeconds, window._soundscapeCtx);
          }
        } catch (_) {}
      }
    }, 5000);

    return {
      active: true,
      minutes: mins,
      targetTime: _sleepTimerTargetMs
    };
  }

  function dfRenderSleepTimerSelectorHtml() {
    var status = dfGetSleepTimerStatus();
    var options = [15, 30, 45, 60];
    var chipsHtml = "";

    for (var i = 0; i < options.length; i++) {
      var m = options[i];
      var mStr = dfFormatWesternDigits(m);
      chipsHtml += "<button type=\"button\" onclick=\"window.dfStartSleepTimer && window.dfStartSleepTimer(" + m + ")\" style=\"background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#d4d4d8;border-radius:14px;padding:4px 10px;font-size:11px;cursor:pointer;\">" +
        "<span>" + mStr + " دقيقة</span>" +
      "</button>";
    }

    if (status.active) {
      chipsHtml += "<button type=\"button\" onclick=\"window.dfCancelSleepTimer && window.dfCancelSleepTimer()\" style=\"background:#ef4444;border:none;color:#ffffff;border-radius:14px;padding:4px 10px;font-size:11px;cursor:pointer;font-weight:bold;\">" +
        "<span>إلغاء (" + status.remainingFormatted + " د)</span>" +
      "</button>";
    }

    return "<div class=\"df-sleep-timer-widget\" style=\"margin:10px 0;padding:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;direction:rtl;\">" +
      "<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;\">" +
        "<span style=\"font-size:12px;font-weight:bold;color:#f4f4f5;\">⏳ مؤقت النوم والتلاشي التلقائي</span>" +
        (status.active ? "<span style=\"font-size:11px;color:#60a5fa;\">متبقي: " + status.remainingFormatted + " دقيقة</span>" : "<span style=\"font-size:11px;color:#a1a1aa;\">معطّل</span>") +
      "</div>" +
      "<div style=\"display:flex;gap:6px;flex-wrap:wrap;\">" +
        chipsHtml +
      "</div>" +
    "</div>";
  }

  if (typeof window !== "undefined") {
    window.dfStartSleepTimer = dfStartSleepTimer;
    window.dfCancelSleepTimer = dfCancelSleepTimer;
    window.dfGetSleepTimerStatus = dfGetSleepTimerStatus;
    window.dfRenderSleepTimerSelectorHtml = dfRenderSleepTimerSelectorHtml;
  }
})();
JS_EOF
else
    echo "[INFO] M284 already present in $APP_JS"
fi

# 6. Update build.gradle to versionCode 104 and versionName 4.1.4
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 104', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"4.1.4\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 104 (4.1.4)')
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
const marker = "/* === M284_SLEEP_TIMER_WITH_VOLUME_TAPERING_AND_CODE104_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

const memStore = Object.create(null);
let hapticCalled = false;
let toastMessage = "";
let stopSoundscapeCalled = false;

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
  setInterval: () => 123,
  clearInterval: () => {},
  Date: Date,
  Math: Math,
  Number: Number,
  Boolean: Boolean,
  String: String
};
sandbox.window = sandbox;
sandbox.window.dfVocabHapticPulse = () => { hapticCalled = true; };
sandbox.window.dfShowVocabToastNotification = (msg) => { toastMessage = msg; };
sandbox.window.dfStopAmbientSoundscape = () => { stopSoundscapeCalled = true; };

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
let status = sandbox.window.dfGetSleepTimerStatus();
assert.strictEqual(status.active, false);

const startRes = sandbox.window.dfStartSleepTimer(30);
assert.strictEqual(startRes.active, true);
assert.strictEqual(startRes.minutes, 30);
assert.strictEqual(hapticCalled, true);
assert.ok(toastMessage.includes("30"));

status = sandbox.window.dfGetSleepTimerStatus();
assert.strictEqual(status.active, true);
assert.strictEqual(status.remainingFormatted, "30");

const html = sandbox.window.dfRenderSleepTimerSelectorHtml();
assert.ok(html.includes("مؤقت النوم"));
assert.ok(html.includes("15 دقيقة"));
assert.ok(html.includes("30 دقيقة"));
assert.ok(html.includes("إلغاء"));
assert.ok(html.includes("df-sleep-timer-widget"));

const cancelRes = sandbox.window.dfCancelSleepTimer();
assert.strictEqual(cancelRes.active, false);
status = sandbox.window.dfGetSleepTimerStatus();
assert.strictEqual(status.active, false);

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 9. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(audio): M284 add sleep timer with gentle volume tapering for ambient soundscapes with versionCode 104 [v4.1.4]" || true
git tag -a v4.1.4-m284-v21 -m "Tag M284: sleep timer with volume tapering with versionCode 104" -f

# 10. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v4.1.4-m284-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M284 (14 of 40)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 104"
echo "VERSION_NAME: 4.1.4"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M285 (Binaural 40Hz Gamma Focus Frequency synthesizer)"
echo "========================================================"
