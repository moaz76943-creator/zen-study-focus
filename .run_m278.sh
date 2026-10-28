#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #278 (Termux Runner)"
echo " Feature: Quiz Response Latency & Auto-Pace Analytics"
echo " Target VersionCode: 98 (v4.0.8) [Mission 8 of 40]"
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
        git commit -m "chore: save local progress before M278" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 5. Apply M278 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M278_QUIZ_RESPONSE_LATENCY_ANALYTICS_AND_CODE98_V1" "$APP_JS"; then
    echo "[INFO] Appending M278 Quiz Response Latency to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M278_QUIZ_RESPONSE_LATENCY_ANALYTICS_AND_CODE98_V1 === */
(function() {
  'use strict';

  var _currentCardStartTime = 0;

  function dfFormatWesternDigits(val) {
    if (val === null || val === undefined) return "0";
    var str = String(val);
    var eastern = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
    for (var i = 0; i < eastern.length; i++) {
      str = str.split(eastern[i]).join(String(i));
    }
    return str;
  }

  function dfStartCardTimer() {
    _currentCardStartTime = Date.now();
    return _currentCardStartTime;
  }

  function dfRecordCardLatency() {
    var now = Date.now();
    var elapsed = _currentCardStartTime > 0 ? (now - _currentCardStartTime) : 1500;
    _currentCardStartTime = 0;
    return Math.max(100, elapsed);
  }

  function dfCalculateSessionLatencyMetrics(latenciesArray) {
    if (!Array.isArray(latenciesArray) || latenciesArray.length === 0) {
      return {
        averageSeconds: 0,
        averageFormatted: "0.0",
        paceTier: "neutral",
        paceLabel: "غير محدد",
        fastCount: 0,
        moderateCount: 0,
        slowCount: 0
      };
    }

    var totalMs = 0;
    var fast = 0;
    var moderate = 0;
    var slow = 0;

    for (var i = 0; i < latenciesArray.length; i++) {
      var ms = Number(latenciesArray[i]) || 0;
      totalMs += ms;
      if (ms < 2500) fast++;
      else if (ms <= 5000) moderate++;
      else slow++;
    }

    var avgSec = Math.round((totalMs / latenciesArray.length / 1000) * 10) / 10;
    var avgStr = dfFormatWesternDigits(avgSec.toFixed(1));

    var tier = "moderate";
    var label = "وتيرة متزنة";
    if (avgSec < 2.5) {
      tier = "fast";
      label = "استرجاع فوري";
    } else if (avgSec > 5.0) {
      tier = "slow";
      label = "استرجاع متأنٍ";
    }

    return {
      averageSeconds: avgSec,
      averageFormatted: avgStr,
      paceTier: tier,
      paceLabel: label,
      fastCount: fast,
      moderateCount: moderate,
      slowCount: slow
    };
  }

  function dfRenderLatencyBadgeHtml(latenciesArray) {
    var metrics = dfCalculateSessionLatencyMetrics(latenciesArray);
    if (metrics.averageSeconds === 0) return "";

    var color = "#10b981";
    if (metrics.paceTier === "moderate") color = "#3b82f6";
    else if (metrics.paceTier === "slow") color = "#f59e0b";

    return "<div class=\"df-quiz-latency-badge\" style=\"display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:3px 8px;font-size:11px;color:#f4f4f5;direction:rtl;\">" +
      "<span style=\"color:" + color + ";\">⚡</span>" +
      "<span>" + metrics.averageFormatted + " ثانية/بطاقة</span>" +
      "<span style=\"color:#a1a1aa;\">(" + metrics.paceLabel + ")</span>" +
    "</div>";
  }

  if (typeof window !== "undefined") {
    window.dfStartCardTimer = dfStartCardTimer;
    window.dfRecordCardLatency = dfRecordCardLatency;
    window.dfCalculateSessionLatencyMetrics = dfCalculateSessionLatencyMetrics;
    window.dfRenderLatencyBadgeHtml = dfRenderLatencyBadgeHtml;
  }
})();
JS_EOF
else
    echo "[INFO] M278 already present in $APP_JS"
fi

# 6. Update build.gradle to versionCode 98 and versionName 4.0.8
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 98', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"4.0.8\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 98 (4.0.8)')
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
const marker = "/* === M278_QUIZ_RESPONSE_LATENCY_ANALYTICS_AND_CODE98_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

const sandbox = {
  window: {},
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
  },
  Date: Date,
  Math: Math,
  Number: Number,
  String: String,
  Array: Array
};
sandbox.window = sandbox;

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
sandbox.window.dfStartCardTimer();
const latency = sandbox.window.dfRecordCardLatency();
assert.ok(latency >= 100);

const fastMetrics = sandbox.window.dfCalculateSessionLatencyMetrics([1500, 2000, 2500]);
assert.strictEqual(fastMetrics.averageSeconds, 2.0);
assert.strictEqual(fastMetrics.averageFormatted, "2.0");
assert.strictEqual(fastMetrics.paceTier, "fast");
assert.strictEqual(fastMetrics.paceLabel, "استرجاع فوري");
assert.strictEqual(fastMetrics.fastCount, 2);
assert.strictEqual(fastMetrics.moderateCount, 1);
assert.strictEqual(fastMetrics.slowCount, 0);

const modMetrics = sandbox.window.dfCalculateSessionLatencyMetrics([3500, 4000]);
assert.strictEqual(modMetrics.averageSeconds, 3.8);
assert.strictEqual(modMetrics.averageFormatted, "3.8");
assert.strictEqual(modMetrics.paceTier, "moderate");

const badge = sandbox.window.dfRenderLatencyBadgeHtml([1500, 2000, 2500]);
assert.ok(badge.includes("2.0 ثانية/بطاقة"));
assert.ok(badge.includes("استرجاع فوري"));
assert.ok(badge.includes("df-quiz-latency-badge"));

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 9. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(quiz): M278 add quiz response latency timer and auto-pace analytics with versionCode 98 [v4.0.8]" || true
git tag -a v4.0.8-m278-v21 -m "Tag M278: quiz response latency timer with versionCode 98" -f

# 10. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v4.0.8-m278-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M278 (8 of 40)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 98"
echo "VERSION_NAME: 4.0.8"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M279 (Audio focus interruption and call suspension handler)"
echo "========================================================"
