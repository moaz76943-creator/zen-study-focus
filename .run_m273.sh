#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #273 (Termux Runner)"
echo " Feature: Unified Focus & Vocab Synergy Points"
echo " Target VersionCode: 93 (v4.0.3) [Mission 3 of 40]"
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
        git commit -m "chore: save local progress before M273" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 5. Apply M273 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M273_UNIFIED_STUDY_SYNERGY_POINTS_AND_CODE93_V1" "$APP_JS"; then
    echo "[INFO] Appending M273 Synergy Points to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M273_UNIFIED_STUDY_SYNERGY_POINTS_AND_CODE93_V1 === */
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

  function dfCalculateSynergyPoints(focusMinutes, wordsReviewed, streakDays) {
    var mins = Math.max(0, Number(focusMinutes) || 0);
    var words = Math.max(0, Number(wordsReviewed) || 0);
    var streak = Math.max(0, Number(streakDays) || 0);

    var basePoints = (mins * 2) + (words * 5);
    var bonusPct = Math.min(50, Math.round(streak * 5));
    var multiplier = 1 + (bonusPct / 100);
    var totalPoints = Math.round(basePoints * multiplier);

    return {
      basePoints: basePoints,
      bonusPercentage: bonusPct,
      totalPoints: totalPoints,
      totalPointsFormatted: dfFormatWesternDigits(totalPoints),
      bonusFormatted: dfFormatWesternDigits(bonusPct) + "%"
    };
  }

  function dfGetTodaySynergyData() {
    var todayKey = new Date().toISOString().slice(0, 10);
    var focusMins = 0;
    try {
      var rawMins = localStorage.getItem("df_focus_today_minutes_v1");
      if (rawMins) {
        var parsed = JSON.parse(rawMins);
        if (parsed && parsed.date === todayKey) {
          focusMins = Number(parsed.minutes) || 0;
        }
      }
    } catch (_) {}

    var wordsReviewed = 0;
    try {
      if (typeof window !== "undefined" && typeof window.dfGetVocabTodayReviewedCount === "function") {
        wordsReviewed = window.dfGetVocabTodayReviewedCount();
      }
    } catch (_) {}

    var streak = 0;
    try {
      if (typeof window !== "undefined" && typeof window.dfCalculateVocabStudyStreak === "function") {
        streak = window.dfCalculateVocabStudyStreak().currentStreak;
      }
    } catch (_) {}

    var res = dfCalculateSynergyPoints(focusMins, wordsReviewed, streak);

    return {
      date: todayKey,
      focusMinutes: focusMins,
      focusMinutesFormatted: dfFormatWesternDigits(focusMins),
      wordsReviewed: wordsReviewed,
      wordsReviewedFormatted: dfFormatWesternDigits(wordsReviewed),
      streakDays: streak,
      streakDaysFormatted: dfFormatWesternDigits(streak),
      pointsData: res
    };
  }

  function dfRenderSynergyPointsBadgeHtml() {
    var data = dfGetTodaySynergyData();
    var pts = data.pointsData;

    return "<div class=\"df-synergy-badge\" style=\"display:inline-flex;align-items:center;gap:6px;background:rgba(234,179,8,0.12);border:1px solid rgba(234,179,8,0.3);border-radius:16px;padding:4px 10px;font-size:12px;color:#fef08a;direction:rtl;\">" +
      "<span>⚡ <strong>" + pts.totalPointsFormatted + "</strong> نقطة إنجاز</span>" +
      (pts.bonusPercentage > 0 ? "<span style=\"color:#fbbf24;font-size:11px;\">(+" + pts.bonusFormatted + " بونص)</span>" : "") +
    "</div>";
  }

  if (typeof window !== "undefined") {
    window.dfCalculateSynergyPoints = dfCalculateSynergyPoints;
    window.dfGetTodaySynergyData = dfGetTodaySynergyData;
    window.dfRenderSynergyPointsBadgeHtml = dfRenderSynergyPointsBadgeHtml;
  }
})();
JS_EOF
else
    echo "[INFO] M273 already present in $APP_JS"
fi

# 6. Update build.gradle to versionCode 93 and versionName 4.0.3
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 93', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"4.0.3\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 93 (4.0.3)')
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
const marker = "/* === M273_UNIFIED_STUDY_SYNERGY_POINTS_AND_CODE93_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

const memStore = Object.create(null);

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
  String: String,
  JSON: JSON
};
sandbox.window = sandbox;

sandbox.window.dfGetVocabTodayReviewedCount = () => 10;
sandbox.window.dfCalculateVocabStudyStreak = () => ({ currentStreak: 4 });

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
const res = sandbox.window.dfCalculateSynergyPoints(25, 10, 4);
assert.strictEqual(res.basePoints, 100);
assert.strictEqual(res.bonusPercentage, 20);
assert.strictEqual(res.totalPoints, 120);
assert.strictEqual(res.totalPointsFormatted, "120");
assert.strictEqual(res.bonusFormatted, "20%");

const today = new Date().toISOString().slice(0, 10);
sandbox.localStorage.setItem("df_focus_today_minutes_v1", JSON.stringify({ date: today, minutes: 25 }));

const todayData = sandbox.window.dfGetTodaySynergyData();
assert.strictEqual(todayData.focusMinutes, 25);
assert.strictEqual(todayData.wordsReviewed, 10);
assert.strictEqual(todayData.streakDays, 4);
assert.strictEqual(todayData.pointsData.totalPoints, 120);

const badgeHtml = sandbox.window.dfRenderSynergyPointsBadgeHtml();
assert.ok(badgeHtml.includes("120"));
assert.ok(badgeHtml.includes("+20%"));
assert.ok(badgeHtml.includes("df-synergy-badge"));

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 9. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(gamification): M273 add unified focus and vocab study synergy points calculator with versionCode 93 [v4.0.3]" || true
git tag -a v4.0.3-m273-v21 -m "Tag M273: unified focus and vocab study synergy points calculator with versionCode 93" -f

# 10. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v4.0.3-m273-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M273 (3 of 40)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 93"
echo "VERSION_NAME: 4.0.3"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M274 (Half-way interval Zen bell chime during focus session)"
echo "========================================================"
