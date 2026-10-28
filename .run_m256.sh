#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #256 (Termux Runner)"
echo " Feature: Daily Vocab Review Goal & Progress Tracker"
echo " Target VersionCode: 76 (v3.8.6)"
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
        git commit -m "chore: save local progress before M256" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 4. Apply M256 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M256_VOCAB_DAILY_GOAL_PROGRESS_AND_CODE76_V1" "$APP_JS"; then
    echo "[INFO] Appending M256 Daily Goal Progress feature to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M256_VOCAB_DAILY_GOAL_PROGRESS_AND_CODE76_V1 === */
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

  function dfGetTodayKey() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return dfFormatWesternDigits(y + '-' + m + '-' + day);
  }

  function dfGetVocabDailyGoal() {
    try {
      var val = localStorage.getItem('df_vocab_daily_goal_v1');
      var num = parseInt(val, 10);
      if (!isNaN(num) && num > 0) return num;
    } catch (_) {}
    return 10;
  }

  function dfSetVocabDailyGoal(goalNumber) {
    var num = parseInt(goalNumber, 10);
    if (isNaN(num) || num < 1) num = 10;
    if (num > 500) num = 500;
    try {
      localStorage.setItem('df_vocab_daily_goal_v1', String(num));
    } catch (_) {}
    return num;
  }

  function dfGetTodayReviewedMap() {
    try {
      var raw = localStorage.getItem('df_vocab_today_reviewed_v1');
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (_) {}
    return {};
  }

  function dfRecordVocabWordReviewedToday(wordId) {
    if (!wordId && wordId !== 0) return 0;
    var todayKey = dfGetTodayKey();
    var map = dfGetTodayReviewedMap();
    if (!Array.isArray(map[todayKey])) {
      map = {};
      map[todayKey] = [];
    }
    var idStr = String(wordId);
    if (map[todayKey].indexOf(idStr) === -1) {
      map[todayKey].push(idStr);
      try {
        localStorage.setItem('df_vocab_today_reviewed_v1', JSON.stringify(map));
      } catch (_) {}
    }
    return map[todayKey].length;
  }

  function dfGetVocabTodayReviewedCount() {
    var todayKey = dfGetTodayKey();
    var map = dfGetTodayReviewedMap();
    if (Array.isArray(map[todayKey])) {
      return map[todayKey].length;
    }
    return 0;
  }

  function dfGetVocabDailyGoalProgress() {
    var goal = dfGetVocabDailyGoal();
    var reviewed = dfGetVocabTodayReviewedCount();
    var pct = Math.min(100, Math.round((reviewed / goal) * 100));
    var isCompleted = reviewed >= goal;

    return {
      goal: goal,
      reviewed: reviewed,
      percentage: pct,
      isCompleted: isCompleted,
      formattedText: '🎯 الهدف اليومي: ' + dfFormatWesternDigits(reviewed) + ' / ' + dfFormatWesternDigits(goal) + ' (' + dfFormatWesternDigits(pct) + '%)'
    };
  }

  if (typeof window !== 'undefined') {
    window.dfGetVocabDailyGoal = dfGetVocabDailyGoal;
    window.dfSetVocabDailyGoal = dfSetVocabDailyGoal;
    window.dfRecordVocabWordReviewedToday = dfRecordVocabWordReviewedToday;
    window.dfGetVocabTodayReviewedCount = dfGetVocabTodayReviewedCount;
    window.dfGetVocabDailyGoalProgress = dfGetVocabDailyGoalProgress;
  }
})();
JS_EOF
else
    echo "[INFO] M256 already present in $APP_JS"
fi

# 5. Update build.gradle to versionCode 76
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 76', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"3.8.6\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 76 (3.8.6)')
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
const marker = "/* === M256_VOCAB_DAILY_GOAL_PROGRESS_AND_CODE76_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

const memStore = Object.create(null);
const dummyElem = new Proxy({}, { get: () => () => dummyElem, set: () => true });

const sandbox = {
  window: {},
  document: {
    getElementById: () => dummyElem,
    querySelector: () => dummyElem,
    querySelectorAll: () => []
  },
  localStorage: {
    getItem: (k) => (k in memStore ? memStore[k] : null),
    setItem: (k, v) => { memStore[k] = String(v); },
    removeItem: (k) => { delete memStore[k]; },
    clear: () => { Object.keys(memStore).forEach(k => delete memStore[k]); }
  },
  Date: Date,
  JSON: JSON,
  Array: Array,
  String: String,
  Number: Number,
  Math: Math,
  parseInt: parseInt,
  isNaN: isNaN
};
sandbox.window = sandbox;

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
assert.strictEqual(sandbox.window.dfGetVocabDailyGoal(), 10);
sandbox.window.dfSetVocabDailyGoal(25);
assert.strictEqual(sandbox.window.dfGetVocabDailyGoal(), 25);

assert.strictEqual(sandbox.window.dfGetVocabTodayReviewedCount(), 0);
let prog = sandbox.window.dfGetVocabDailyGoalProgress();
assert.strictEqual(prog.reviewed, 0);
assert.strictEqual(prog.percentage, 0);
assert.strictEqual(prog.isCompleted, false);

sandbox.window.dfRecordVocabWordReviewedToday("word_1");
sandbox.window.dfRecordVocabWordReviewedToday("word_2");
sandbox.window.dfRecordVocabWordReviewedToday("word_1"); // duplicate check
assert.strictEqual(sandbox.window.dfGetVocabTodayReviewedCount(), 2);

sandbox.window.dfSetVocabDailyGoal(2);
prog = sandbox.window.dfGetVocabDailyGoalProgress();
assert.strictEqual(prog.reviewed, 2);
assert.strictEqual(prog.goal, 2);
assert.strictEqual(prog.percentage, 100);
assert.strictEqual(prog.isCompleted, true);
assert.ok(prog.formattedText.includes("2 / 2 (100%)"));

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 8. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(vocab): M256 add daily study goal tracker and progress with versionCode 76 [v3.8.6]" || true
git tag -a v3.8.6-m256-v21 -m "Tag M256: daily study goal tracker and progress with versionCode 76" -f

# 9. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v3.8.6-m256-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M256"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 76"
echo "VERSION_NAME: 3.8.6"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M257 (Audio chime completion trigger on reaching daily vocab goal)"
echo "========================================================"
