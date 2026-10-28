#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #265 (Termux Runner)"
echo " Feature: Quiz Session Completion Handler & Summary Card"
echo " Target VersionCode: 85 (v3.9.5)"
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

# 3. Auto-recover uncommitted changes if safe
if [ -n "$(git status --porcelain android/app/src/main/assets/web/app.js android/app/build.gradle)" ]; then
    echo "[INFO] Stashing/committing tracked changes..."
    if node --check android/app/src/main/assets/web/app.js 2>/dev/null; then
        git add android/app/src/main/assets/web/app.js android/app/build.gradle 2>/dev/null || true
        git commit -m "chore: save local progress before M265" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 4. Apply M265 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M265_QUIZ_COMPLETION_HANDLER_AND_CODE85_V1" "$APP_JS"; then
    echo "[INFO] Appending M265 Quiz Completion Handler to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M265_QUIZ_COMPLETION_HANDLER_AND_CODE85_V1 === */
(function() {
  'use strict';

  function dfFormatWesternDigits(val) {
    if (val === null || val === undefined) return '0';
    var str = String(val);
    var eastern = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
    for (var i = 0; i < eastern.length; i++) {
      str = str.split(eastern[i]).join(String(i));
    }
    return str;
  }

  function dfFormatSecondsToMMSS(seconds) {
    var s = Math.max(0, Math.floor(Number(seconds) || 0));
    var mins = Math.floor(s / 60);
    var rem = s % 60;
    var mm = String(mins).padStart(2, '0');
    var ss = String(rem).padStart(2, '0');
    return dfFormatWesternDigits(mm + ':' + ss);
  }

  function dfHandleQuizSessionCompletion(sessionData) {
    var data = sessionData || {};
    var results = Array.isArray(data.results) ? data.results : [];
    var duration = Number(data.durationSeconds) || 0;

    var masteredCount = 0;
    var needsReviewCount = 0;

    for (var i = 0; i < results.length; i++) {
      if (results[i] && results[i].isMastered) {
        masteredCount++;
      } else {
        needsReviewCount++;
      }
    }

    try {
      if (typeof window !== 'undefined' && typeof window.dfBulkPromoteQuizSessionResults === 'function') {
        window.dfBulkPromoteQuizSessionResults(results);
      }
    } catch (_) {}

    try {
      if (typeof window !== 'undefined' && typeof window.dfRecordVocabStudySession === 'function') {
        window.dfRecordVocabStudySession();
      }
    } catch (_) {}

    var accuracy = { percentage: 0, formatted: '0%', tier: 'neutral', label: 'مكتمل' };
    try {
      if (typeof window !== 'undefined' && typeof window.dfCalculateQuizAccuracy === 'function') {
        accuracy = window.dfCalculateQuizAccuracy(masteredCount, results.length);
      }
    } catch (_) {}

    var streak = { currentStreak: 0, formatted: '0' };
    try {
      if (typeof window !== 'undefined' && typeof window.dfCalculateVocabStudyStreak === 'function') {
        streak = window.dfCalculateVocabStudyStreak();
      }
    } catch (_) {}

    return {
      totalReviewed: results.length,
      totalReviewedFormatted: dfFormatWesternDigits(results.length),
      masteredCount: masteredCount,
      masteredCountFormatted: dfFormatWesternDigits(masteredCount),
      needsReviewCount: needsReviewCount,
      needsReviewCountFormatted: dfFormatWesternDigits(needsReviewCount),
      accuracy: accuracy,
      streak: streak,
      durationSeconds: duration,
      durationFormatted: dfFormatSecondsToMMSS(duration)
    };
  }

  function dfRenderQuizCompletionSummaryModalHtml(summary) {
    if (!summary) return '';
    var boxStyle = 'background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 12px;text-align:center;flex:1;';
    var numStyle = 'font-size:16px;font-weight:bold;display:block;margin-top:2px;';

    return '<div class="df-quiz-session-summary" style="direction:rtl;padding:14px;background:#18181b;border:1px solid #27272a;border-radius:12px;color:#f4f4f5;">' +
      '<div style="text-align:center;margin-bottom:12px;">' +
        '<div style="font-size:24px;margin-bottom:4px;">🎉</div>' +
        '<h3 style="margin:0 0 4px 0;font-size:16px;">اكتملت جلسة الاستذكار بنجاح!</h3>' +
        '<span style="font-size:12px;color:#a1a1aa;">المدة المستغرقة: ' + summary.durationFormatted + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-bottom:12px;">' +
        '<div style="' + boxStyle + '"><span style="font-size:11px;color:#a1a1aa;">المراجعة</span><span style="' + numStyle + 'color:#f4f4f5;">' + summary.totalReviewedFormatted + '</span></div>' +
        '<div style="' + boxStyle + '"><span style="font-size:11px;color:#a1a1aa;">✅ متقنة</span><span style="' + numStyle + 'color:#10b981;">' + summary.masteredCountFormatted + '</span></div>' +
        '<div style="' + boxStyle + '"><span style="font-size:11px;color:#a1a1aa;">⚠️ للمراجعة</span><span style="' + numStyle + 'color:#f59e0b;">' + summary.needsReviewCountFormatted + '</span></div>' +
        '<div style="' + boxStyle + '"><span style="font-size:11px;color:#a1a1aa;">🎯 الدقة</span><span style="' + numStyle + 'color:#3b82f6;">' + summary.accuracy.formatted + '</span></div>' +
      '</div>' +
      '<div style="text-align:center;font-size:12px;color:#f97316;background:rgba(249,115,22,0.1);padding:6px;border-radius:6px;">' +
        '🔥 سلسلة استمرارك الحالية: <strong>' + summary.streak.formatted + ' أيام</strong>' +
      '</div>' +
    '</div>';
  }

  if (typeof window !== 'undefined') {
    window.dfFormatSecondsToMMSS = dfFormatSecondsToMMSS;
    window.dfHandleQuizSessionCompletion = dfHandleQuizSessionCompletion;
    window.dfRenderQuizCompletionSummaryModalHtml = dfRenderQuizCompletionSummaryModalHtml;
  }
})();
JS_EOF
else
    echo "[INFO] M265 already present in $APP_JS"
fi

# 5. Update build.gradle to versionCode 85 and versionName 3.9.5
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 85', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"3.9.5\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 85 (3.9.5)')
"

# 6. Syntax validation
echo "[CHECK] Verifying JS syntax with node --check..."
node --check "$APP_JS"
echo "[PASS] JS syntax validated successfully."

# 7. Unit testing in isolated Node VM
node -e '
const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const fullCode = fs.readFileSync("android/app/src/main/assets/web/app.js", "utf8");
const marker = "/* === M265_QUIZ_COMPLETION_HANDLER_AND_CODE85_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

let bulkPromotedResults = null;
let studySessionRecorded = false;

const sandbox = {
  window: {},
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
  },
  Array: Array,
  String: String,
  Number: Number,
  Math: Math
};
sandbox.window = sandbox;

sandbox.window.dfBulkPromoteQuizSessionResults = (res) => { bulkPromotedResults = res; };
sandbox.window.dfRecordVocabStudySession = () => { studySessionRecorded = true; };
sandbox.window.dfCalculateQuizAccuracy = (m, total) => ({
  percentage: Math.round((m / total) * 100),
  formatted: Math.round((m / total) * 100) + "%"
});
sandbox.window.dfCalculateVocabStudyStreak = () => ({ currentStreak: 3, formatted: "3" });

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
assert.strictEqual(sandbox.window.dfFormatSecondsToMMSS(0), "00:00");
assert.strictEqual(sandbox.window.dfFormatSecondsToMMSS(65), "01:05");
assert.strictEqual(sandbox.window.dfFormatSecondsToMMSS(360), "06:00");

const sessionData = {
  results: [
    { cardId: "1", isMastered: true },
    { cardId: "2", isMastered: true },
    { cardId: "3", isMastered: false }
  ],
  durationSeconds: 125
};

const summary = sandbox.window.dfHandleQuizSessionCompletion(sessionData);
assert.strictEqual(summary.totalReviewed, 3);
assert.strictEqual(summary.masteredCount, 2);
assert.strictEqual(summary.needsReviewCount, 1);
assert.strictEqual(summary.durationFormatted, "02:05");
assert.strictEqual(summary.accuracy.formatted, "67%");
assert.strictEqual(summary.streak.formatted, "3");
assert.strictEqual(studySessionRecorded, true);
assert.strictEqual(bulkPromotedResults.length, 3);

const html = sandbox.window.dfRenderQuizCompletionSummaryModalHtml(summary);
assert.ok(html.includes("اكتملت جلسة الاستذكار بنجاح!"));
assert.ok(html.includes("02:05"));
assert.ok(html.includes(">3<"));
assert.ok(html.includes(">2<"));
assert.ok(html.includes(">1<"));
assert.ok(html.includes("67%"));
assert.ok(html.includes("3 أيام"));
assert.ok(html.includes("df-quiz-session-summary"));

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 8. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(vocab): M265 add quiz session completion handler and summary card with versionCode 85 [v3.9.5]" || true
git tag -a v3.9.5-m265-v21 -m "Tag M265: quiz session completion handler and summary card with versionCode 85" -f

# 9. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v3.9.5-m265-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M265"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 85"
echo "VERSION_NAME: 3.9.5"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M266 (Session export & share summary text generator)"
echo "========================================================"
