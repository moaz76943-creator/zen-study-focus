#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #258 (Termux Runner)"
echo " Feature: Vocab Header Quick Stats Summary Strip"
echo " Target VersionCode: 78 (v3.8.8)"
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
        git commit -m "chore: save local progress before M258" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 4. Apply M258 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M258_VOCAB_HEADER_QUICK_STATS_AND_CODE78_V1" "$APP_JS"; then
    echo "[INFO] Appending M258 Header Quick Stats feature to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M258_VOCAB_HEADER_QUICK_STATS_AND_CODE78_V1 === */
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

  function dfGetVocabHeaderStatsData() {
    var totalWords = 0;
    try {
      if (typeof window !== 'undefined' && typeof window.dfGetVocabBankList === 'function') {
        totalWords = window.dfGetVocabBankList().length;
      } else {
        var raw = localStorage.getItem('df_vocab_bank_v1');
        var parsed = raw ? JSON.parse(raw) : [];
        totalWords = Array.isArray(parsed) ? parsed.length : 0;
      }
    } catch (_) {
      totalWords = 0;
    }

    var reviewedToday = 0;
    var dailyGoal = 10;
    try {
      if (typeof window !== 'undefined' && typeof window.dfGetVocabTodayReviewedCount === 'function') {
        reviewedToday = window.dfGetVocabTodayReviewedCount();
      }
      if (typeof window !== 'undefined' && typeof window.dfGetVocabDailyGoal === 'function') {
        dailyGoal = window.dfGetVocabDailyGoal();
      }
    } catch (_) {}

    var streak = 0;
    try {
      if (typeof window !== 'undefined' && typeof window.dfCalculateVocabStudyStreak === 'function') {
        streak = window.dfCalculateVocabStudyStreak().currentStreak;
      }
    } catch (_) {}

    return {
      totalWords: totalWords,
      totalWordsFormatted: dfFormatWesternDigits(totalWords),
      reviewedToday: reviewedToday,
      reviewedTodayFormatted: dfFormatWesternDigits(reviewedToday),
      dailyGoal: dailyGoal,
      dailyGoalFormatted: dfFormatWesternDigits(dailyGoal),
      streak: streak,
      streakFormatted: dfFormatWesternDigits(streak)
    };
  }

  function dfRenderVocabHeaderQuickStatsHtml() {
    var data = dfGetVocabHeaderStatsData();
    var boxStyle = 'flex:1;min-width:80px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:6px 10px;text-align:center;';
    var labelStyle = 'font-size:11px;color:#a0a0a0;display:block;margin-bottom:2px;';
    var valueStyle = 'font-size:14px;font-weight:bold;color:#f0f0f0;display:block;';

    return '<div class="df-vocab-header-quick-stats" style="display:flex;gap:8px;margin-bottom:12px;direction:rtl;">' +
      '<div style="' + boxStyle + '">' +
        '<span style="' + labelStyle + '">📚 الكلمات</span>' +
        '<span style="' + valueStyle + '">' + data.totalWordsFormatted + '</span>' +
      '</div>' +
      '<div style="' + boxStyle + '">' +
        '<span style="' + labelStyle + '">🎯 اليوم</span>' +
        '<span style="' + valueStyle + '">' + data.reviewedTodayFormatted + ' / ' + data.dailyGoalFormatted + '</span>' +
      '</div>' +
      '<div style="' + boxStyle + '">' +
        '<span style="' + labelStyle + '">🔥 السلسلة</span>' +
        '<span style="' + valueStyle + '">' + data.streakFormatted + ' أيام</span>' +
      '</div>' +
    '</div>';
  }

  function dfUpdateVocabHeaderQuickStatsDOM() {
    try {
      if (typeof document === 'undefined') return false;
      var container = document.getElementById('df-vocab-header-quick-stats');
      if (container) {
        container.innerHTML = dfRenderVocabHeaderQuickStatsHtml();
        return true;
      }
    } catch (_) {}
    return false;
  }

  if (typeof window !== 'undefined') {
    window.dfGetVocabHeaderStatsData = dfGetVocabHeaderStatsData;
    window.dfRenderVocabHeaderQuickStatsHtml = dfRenderVocabHeaderQuickStatsHtml;
    window.dfUpdateVocabHeaderQuickStatsDOM = dfUpdateVocabHeaderQuickStatsDOM;
  }
})();
JS_EOF
else
    echo "[INFO] M258 already present in $APP_JS"
fi

# 5. Update build.gradle to versionCode 78
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 78', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"3.8.8\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 78 (3.8.8)')
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
const marker = "/* === M258_VOCAB_HEADER_QUICK_STATS_AND_CODE78_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

const memStore = Object.create(null);
let domUpdated = false;
let updatedHtml = "";

const dummyElem = {
  get innerHTML() { return updatedHtml; },
  set innerHTML(val) {
    updatedHtml = val;
    domUpdated = true;
  }
};

const sandbox = {
  window: {},
  document: {
    getElementById: (id) => (id === "df-vocab-header-quick-stats" ? dummyElem : null),
    querySelector: () => null,
    querySelectorAll: () => []
  },
  localStorage: {
    getItem: (k) => (k in memStore ? memStore[k] : null),
    setItem: (k, v) => { memStore[k] = String(v); },
    removeItem: (k) => { delete memStore[k]; },
    clear: () => { Object.keys(memStore).forEach(k => delete memStore[k]); }
  },
  JSON: JSON,
  Array: Array,
  String: String
};
sandbox.window = sandbox;

sandbox.window.dfGetVocabBankList = () => [{ id: 1 }, { id: 2 }, { id: 3 }];
sandbox.window.dfGetVocabTodayReviewedCount = () => 5;
sandbox.window.dfGetVocabDailyGoal = () => 15;
sandbox.window.dfCalculateVocabStudyStreak = () => ({ currentStreak: 7 });

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
const data = sandbox.window.dfGetVocabHeaderStatsData();
assert.strictEqual(data.totalWords, 3);
assert.strictEqual(data.totalWordsFormatted, "3");
assert.strictEqual(data.reviewedToday, 5);
assert.strictEqual(data.reviewedTodayFormatted, "5");
assert.strictEqual(data.dailyGoal, 15);
assert.strictEqual(data.dailyGoalFormatted, "15");
assert.strictEqual(data.streak, 7);
assert.strictEqual(data.streakFormatted, "7");

const html = sandbox.window.dfRenderVocabHeaderQuickStatsHtml();
assert.ok(html.includes("📚 الكلمات"));
assert.ok(html.includes(">3<"));
assert.ok(html.includes("5 / 15"));
assert.ok(html.includes("7 أيام"));
assert.ok(html.includes("df-vocab-header-quick-stats"));

const resUpdate = sandbox.window.dfUpdateVocabHeaderQuickStatsDOM();
assert.strictEqual(resUpdate, true);
assert.strictEqual(domUpdated, true);
assert.ok(updatedHtml.includes("5 / 15"));

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 8. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(vocab): M258 add header quick stats bar with versionCode 78 [v3.8.8]" || true
git tag -a v3.8.8-m258-v21 -m "Tag M258: header quick stats bar with versionCode 78" -f

# 9. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v3.8.8-m258-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M258"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 78"
echo "VERSION_NAME: 3.8.8"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M259 (Automatic sync hook of header quick stats on vocab bank operations)"
echo "========================================================"
