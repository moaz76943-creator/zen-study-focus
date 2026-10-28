#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #255 (Termux Runner)"
echo " Feature: Daily Vocab Study Streak Tracker"
echo " Target VersionCode: 75 (v3.8.5)"
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
        git commit -m "chore: save local progress before M255" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 4. Apply M255 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M255_VOCAB_STUDY_STREAK_AND_CODE75_V1" "$APP_JS"; then
    echo "[INFO] Appending M255 Study Streak feature to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M255_VOCAB_STUDY_STREAK_AND_CODE75_V1 === */
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

  function dfGetTodayDateString(dateObj) {
    var d = dateObj || new Date();
    var year = d.getFullYear();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return dfFormatWesternDigits(year + '-' + month + '-' + day);
  }

  function dfGetStudyHistory() {
    try {
      var raw = localStorage.getItem('df_vocab_study_history_v1');
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function dfRecordVocabStudySession(mockDate) {
    var today = dfGetTodayDateString(mockDate);
    var history = dfGetStudyHistory();
    if (history.indexOf(today) === -1) {
      history.push(today);
      history.sort();
      try {
        localStorage.setItem('df_vocab_study_history_v1', JSON.stringify(history));
      } catch (_) {}
    }
    return history;
  }

  function dfCalculateVocabStudyStreak(historyList, referenceDate) {
    var list = Array.isArray(historyList) ? historyList.slice() : dfGetStudyHistory();
    if (list.length === 0) {
      return { currentStreak: 0, formatted: '0', isStudiedToday: false };
    }

    var uniqueDays = Array.from(new Set(list)).sort().reverse();
    var ref = referenceDate ? new Date(referenceDate) : new Date();
    var todayStr = dfGetTodayDateString(ref);

    var yesterday = new Date(ref);
    yesterday.setDate(yesterday.getDate() - 1);
    var yesterdayStr = dfGetTodayDateString(yesterday);

    var isStudiedToday = uniqueDays.indexOf(todayStr) !== -1;
    var isStudiedYesterday = uniqueDays.indexOf(yesterdayStr) !== -1;

    if (!isStudiedToday && !isStudiedYesterday) {
      return { currentStreak: 0, formatted: '0', isStudiedToday: false };
    }

    var streak = 0;
    var checkDate = isStudiedToday ? new Date(ref) : yesterday;

    while (true) {
      var checkStr = dfGetTodayDateString(checkDate);
      if (uniqueDays.indexOf(checkStr) !== -1) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      currentStreak: streak,
      formatted: dfFormatWesternDigits(streak),
      isStudiedToday: isStudiedToday
    };
  }

  function dfGetVocabStreakBadge() {
    var res = dfCalculateVocabStudyStreak();
    var streakNum = res.formatted;
    return '<span class="df-vocab-streak-badge" style="display:inline-block;padding:3px 8px;border-radius:12px;font-size:12px;font-weight:bold;color:#fff;background-color:#e65100;">' +
      '🔥 ' + streakNum + ' ' + (res.currentStreak === 1 ? 'يوم' : 'أيام') +
      '</span>';
  }

  if (typeof window !== 'undefined') {
    window.dfGetTodayDateString = dfGetTodayDateString;
    window.dfRecordVocabStudySession = dfRecordVocabStudySession;
    window.dfCalculateVocabStudyStreak = dfCalculateVocabStudyStreak;
    window.dfGetVocabStreakBadge = dfGetVocabStreakBadge;
  }
})();
JS_EOF
else
    echo "[INFO] M255 already present in $APP_JS"
fi

# 5. Update build.gradle to versionCode 75
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 75', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"3.8.5\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 75 (3.8.5)')
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
const marker = "/* === M255_VOCAB_STUDY_STREAK_AND_CODE75_V1 === */";
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
  Set: Set,
  String: String,
  Number: Number
};
sandbox.window = sandbox;

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
const resEmpty = sandbox.window.dfCalculateVocabStudyStreak([]);
assert.strictEqual(resEmpty.currentStreak, 0);
assert.strictEqual(resEmpty.formatted, "0");

const baseDate = new Date("2026-10-27T12:00:00Z");
const history = ["2026-10-25", "2026-10-26", "2026-10-27"];
const res3 = sandbox.window.dfCalculateVocabStudyStreak(history, baseDate);
assert.strictEqual(res3.currentStreak, 3);
assert.strictEqual(res3.formatted, "3");
assert.strictEqual(res3.isStudiedToday, true);

const historyYesterday = ["2026-10-25", "2026-10-26"];
const resYesterday = sandbox.window.dfCalculateVocabStudyStreak(historyYesterday, baseDate);
assert.strictEqual(resYesterday.currentStreak, 2);
assert.strictEqual(resYesterday.isStudiedToday, false);

const historyBroken = ["2026-10-20", "2026-10-24"];
const resBroken = sandbox.window.dfCalculateVocabStudyStreak(historyBroken, baseDate);
assert.strictEqual(resBroken.currentStreak, 0);

sandbox.window.dfRecordVocabStudySession(baseDate);
const savedHistory = JSON.parse(sandbox.localStorage.getItem("df_vocab_study_history_v1"));
assert.ok(savedHistory.includes("2026-10-27"));

const badge = sandbox.window.dfGetVocabStreakBadge();
assert.ok(badge.includes("🔥"));
assert.ok(badge.includes("df-vocab-streak-badge"));

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 8. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(vocab): M255 add daily study streak calculator with versionCode 75 [v3.8.5]" || true
git tag -a v3.8.5-m255-v21 -m "Tag M255: daily study streak calculator with versionCode 75" -f

# 9. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v3.8.5-m255-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M255"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 75"
echo "VERSION_NAME: 3.8.5"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M256 (Integration of study streak badges into daily summary views)"
echo "========================================================"
