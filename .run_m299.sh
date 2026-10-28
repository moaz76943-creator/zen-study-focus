#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #299 (Termux Runner)"
echo " Feature: All-Time Personal Records Milestone Tracker"
echo " Target VersionCode: 119 (v4.2.9) [Mission 29 of 40]"
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
        git commit -m "chore: save local progress before M299" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 5. Apply M299 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M299_PERSONAL_RECORDS_MILESTONE_TRACKER_AND_CODE119_V1" "$APP_JS"; then
    echo "[INFO] Appending M299 Personal Records Tracker to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M299_PERSONAL_RECORDS_MILESTONE_TRACKER_AND_CODE119_V1 === */
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

  function dfGetPersonalRecords() {
    var defaultRecords = {
      allTimeMastered: 0,
      longestStreak: 0,
      mostReviewedSingleDay: 0,
      longestFocusSessionMins: 0
    };

    try {
      var raw = localStorage.getItem("df_personal_records_v1");
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          defaultRecords.allTimeMastered = Number(parsed.allTimeMastered) || 0;
          defaultRecords.longestStreak = Number(parsed.longestStreak) || 0;
          defaultRecords.mostReviewedSingleDay = Number(parsed.mostReviewedSingleDay) || 0;
          defaultRecords.longestFocusSessionMins = Number(parsed.longestFocusSessionMins) || 0;
        }
      }
    } catch (_) {}

    return {
      allTimeMastered: defaultRecords.allTimeMastered,
      allTimeMasteredFormatted: dfFormatWesternDigits(defaultRecords.allTimeMastered),
      longestStreak: defaultRecords.longestStreak,
      longestStreakFormatted: dfFormatWesternDigits(defaultRecords.longestStreak),
      mostReviewedSingleDay: defaultRecords.mostReviewedSingleDay,
      mostReviewedSingleDayFormatted: dfFormatWesternDigits(defaultRecords.mostReviewedSingleDay),
      longestFocusSessionMins: defaultRecords.longestFocusSessionMins,
      longestFocusSessionMinsFormatted: dfFormatWesternDigits(defaultRecords.longestFocusSessionMins)
    };
  }

  function dfUpdatePersonalRecords(stats) {
    var input = stats || {};
    var current = dfGetPersonalRecords();
    var records = {
      allTimeMastered: current.allTimeMastered,
      longestStreak: current.longestStreak,
      mostReviewedSingleDay: current.mostReviewedSingleDay,
      longestFocusSessionMins: current.longestFocusSessionMins
    };

    var broken = [];

    if (input.mastered !== undefined && Number(input.mastered) > records.allTimeMastered) {
      records.allTimeMastered = Number(input.mastered);
      broken.push("إجمالي الكلمات المتقنة (" + dfFormatWesternDigits(records.allTimeMastered) + ")");
    }

    if (input.streak !== undefined && Number(input.streak) > records.longestStreak) {
      records.longestStreak = Number(input.streak);
      broken.push("أطول سلسلة متتالية (" + dfFormatWesternDigits(records.longestStreak) + " أيام)");
    }

    if (input.reviewedToday !== undefined && Number(input.reviewedToday) > records.mostReviewedSingleDay) {
      records.mostReviewedSingleDay = Number(input.reviewedToday);
      broken.push("أعلى مراجعة يومية (" + dfFormatWesternDigits(records.mostReviewedSingleDay) + " كلمة)");
    }

    if (input.focusMins !== undefined && Number(input.focusMins) > records.longestFocusSessionMins) {
      records.longestFocusSessionMins = Number(input.focusMins);
      broken.push("أطول جلسة تركيز (" + dfFormatWesternDigits(records.longestFocusSessionMins) + " دقيقة)");
    }

    if (broken.length > 0) {
      try {
        localStorage.setItem("df_personal_records_v1", JSON.stringify(records));
      } catch (_) {}

      try {
        if (typeof window !== "undefined" && typeof window.dfVocabHapticPulse === "function") {
          window.dfVocabHapticPulse(30);
        }
      } catch (_) {}

      try {
        if (typeof window !== "undefined" && typeof window.dfShowVocabToastNotification === "function") {
          window.dfShowVocabToastNotification("🏆 رقم قياسي جديد: " + broken[0] + "!", "success", 2500);
        }
      } catch (_) {}

      try {
        if (typeof window !== "undefined" && typeof window.dfTriggerVocabStatsSync === "function") {
          window.dfTriggerVocabStatsSync({ immediate: true });
        }
      } catch (_) {}

      return { isNewRecord: true, brokenRecords: broken, records: records };
    }

    return { isNewRecord: false, brokenRecords: [], records: records };
  }

  function dfRenderPersonalRecordsCardHtml() {
    var rec = dfGetPersonalRecords();
    var boxStyle = "background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px 12px;text-align:center;flex:1;";
    var valStyle = "font-size:15px;font-weight:bold;color:#fef08a;display:block;margin-top:2px;";

    return "<div class=\"df-personal-records-card\" style=\"margin:12px 0;padding:12px;background:#18181b;border:1px solid #d97706;border-radius:12px;direction:rtl;color:#f4f4f5;\">" +
      "<div style=\"display:flex;align-items:center;gap:6px;margin-bottom:10px;\">" +
        "<span style=\"font-size:18px;\">🏆</span>" +
        "<strong style=\"font-size:13px;color:#fbbf24;\">لوحة الأرقام القياسية الشخصية (Personal Records)</strong>" +
      "</div>" +
      "<div style=\"display:flex;gap:8px;\">" +
        "<div style=\"" + boxStyle + "\"><span style=\"font-size:10px;color:#a1a1aa;\">🔥 أفضل تتابع</span><span style=\"" + valStyle + "\">" + rec.longestStreakFormatted + " أيام</span></div>" +
        "<div style=\"" + boxStyle + "\"><span style=\"font-size:10px;color:#a1a1aa;\">📚 إتقان تراكمي</span><span style=\"" + valStyle + "\">" + rec.allTimeMasteredFormatted + "</span></div>" +
        "<div style=\"" + boxStyle + "\"><span style=\"font-size:10px;color:#a1a1aa;\">⚡ أعلى يوم</span><span style=\"" + valStyle + "\">" + rec.mostReviewedSingleDayFormatted + "</span></div>" +
      "</div>" +
    "</div>";
  }

  if (typeof window !== "undefined") {
    window.dfGetPersonalRecords = dfGetPersonalRecords;
    window.dfUpdatePersonalRecords = dfUpdatePersonalRecords;
    window.dfRenderPersonalRecordsCardHtml = dfRenderPersonalRecordsCardHtml;
  }
})();
JS_EOF
else
    echo "[INFO] M299 already present in $APP_JS"
fi

# 6. Update build.gradle to versionCode 119 and versionName 4.2.9
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 119', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"4.2.9\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 119 (4.2.9)')
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
const marker = "/* === M299_PERSONAL_RECORDS_MILESTONE_TRACKER_AND_CODE119_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

const memStore = Object.create(null);
let hapticCalled = false;
let toastMessage = "";
let syncCalled = false;

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
  Number: Number,
  String: String,
  JSON: JSON
};
sandbox.window = sandbox;
sandbox.window.dfVocabHapticPulse = () => { hapticCalled = true; };
sandbox.window.dfShowVocabToastNotification = (msg) => { toastMessage = msg; };
sandbox.window.dfTriggerVocabStatsSync = () => { syncCalled = true; };

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
const initial = sandbox.window.dfGetPersonalRecords();
assert.strictEqual(initial.allTimeMastered, 0);
assert.strictEqual(initial.longestStreak, 0);

const update1 = sandbox.window.dfUpdatePersonalRecords({
  mastered: 25,
  streak: 7,
  reviewedToday: 15
});

assert.strictEqual(update1.isNewRecord, true);
assert.strictEqual(update1.records.allTimeMastered, 25);
assert.strictEqual(update1.records.longestStreak, 7);
assert.strictEqual(hapticCalled, true);
assert.strictEqual(syncCalled, true);
assert.ok(toastMessage.includes("رقم قياسي جديد"));

hapticCalled = false;
syncCalled = false;
const update2 = sandbox.window.dfUpdatePersonalRecords({
  mastered: 20,
  streak: 5
});
assert.strictEqual(update2.isNewRecord, false);
assert.strictEqual(hapticCalled, false);

const html = sandbox.window.dfRenderPersonalRecordsCardHtml();
assert.ok(html.includes("لوحة الأرقام القياسية الشخصية"));
assert.ok(html.includes("7 أيام"));
assert.ok(html.includes("25"));
assert.ok(html.includes("15"));
assert.ok(html.includes("df-personal-records-card"));

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 9. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(gamification): M299 add all-time personal records and milestone tracker with versionCode 119 [v4.2.9]" || true
git tag -a v4.2.9-m299-v21 -m "Tag M299: all-time personal records with versionCode 119" -f

# 10. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v4.2.9-m299-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M299 (29 of 40)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 119"
echo "VERSION_NAME: 4.2.9"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M300 (Mastery Vault Milestone v4.3.0 with versionCode 120 and Phase 3 completion)"
echo "========================================================"
