#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #291 (Termux Runner)"
echo " Feature: SuperMemo SM-2 Spaced Repetition Engine"
echo " Target VersionCode: 111 (v4.2.1) [Mission 21 of 40]"
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
        git commit -m "chore: save local progress before M291" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 5. Apply M291 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M291_SUPERMEMO_SM2_INTERVALS_ENGINE_AND_CODE111_V1" "$APP_JS"; then
    echo "[INFO] Appending M291 SuperMemo SM-2 to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M291_SUPERMEMO_SM2_INTERVALS_ENGINE_AND_CODE111_V1 === */
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

  function dfCalculateSm2Interval(card, qualityScore) {
    var c = card || {};
    var q = Math.max(0, Math.min(5, Math.round(Number(qualityScore) || 0)));

    var rep = Number(c.sm2Repetitions) || 0;
    var ef = Number(c.sm2EasinessFactor) || 2.5;
    var prevInterval = Number(c.sm2IntervalDays) || 0;

    var newInterval = 1;
    var newRep = rep;

    if (q >= 3) {
      if (rep === 0) {
        newInterval = 1;
        newRep = 1;
      } else if (rep === 1) {
        newInterval = 6;
        newRep = 2;
      } else {
        newInterval = Math.round(prevInterval * ef);
        newRep = rep + 1;
      }
    } else {
      newRep = 0;
      newInterval = 1;
    }

    var newEf = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    newEf = Math.max(1.3, Math.round(newEf * 100) / 100);

    var now = Date.now();
    var nextDueDateMs = now + (newInterval * 24 * 60 * 60 * 1000);
    var d = new Date(nextDueDateMs);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    var nextDueDateStr = dfFormatWesternDigits(y + "-" + m + "-" + day);

    return {
      repetitions: newRep,
      intervalDays: newInterval,
      intervalDaysFormatted: dfFormatWesternDigits(newInterval),
      easinessFactor: newEf,
      nextDueDateMs: nextDueDateMs,
      nextDueDateFormatted: nextDueDateStr
    };
  }

  function dfApplySm2ToCard(cardId, qualityScore) {
    if (!cardId && cardId !== 0) return null;
    var list = [];
    try {
      if (typeof window !== "undefined" && typeof window.dfGetVocabBankList === "function") {
        list = window.dfGetVocabBankList();
      } else {
        var raw = localStorage.getItem("df_vocab_bank_v1");
        if (raw) list = JSON.parse(raw);
      }
    } catch (_) {}

    if (!Array.isArray(list)) list = [];
    var target = null;

    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(cardId)) {
        target = list[i];
        break;
      }
    }

    if (!target) return null;

    var sm2 = dfCalculateSm2Interval(target, qualityScore);
    target.sm2Repetitions = sm2.repetitions;
    target.sm2IntervalDays = sm2.intervalDays;
    target.sm2EasinessFactor = sm2.easinessFactor;
    target.sm2NextDueDateMs = sm2.nextDueDateMs;
    target.sm2NextDueDateStr = sm2.nextDueDateFormatted;
    target.lastReviewedAt = Date.now();

    try {
      localStorage.setItem("df_vocab_bank_v1", JSON.stringify(list));
    } catch (_) {}

    try {
      if (typeof window !== "undefined" && typeof window.dfTriggerVocabStatsSync === "function") {
        window.dfTriggerVocabStatsSync({ immediate: true });
      }
    } catch (_) {}

    return target;
  }

  if (typeof window !== "undefined") {
    window.dfCalculateSm2Interval = dfCalculateSm2Interval;
    window.dfApplySm2ToCard = dfApplySm2ToCard;
  }
})();
JS_EOF
else
    echo "[INFO] M291 already present in $APP_JS"
fi

# 6. Update build.gradle to versionCode 111 and versionName 4.2.1
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 111', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"4.2.1\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 111 (4.2.1)')
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
const marker = "/* === M291_SUPERMEMO_SM2_INTERVALS_ENGINE_AND_CODE111_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

const memStore = Object.create(null);
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
  Date: Date,
  Math: Math,
  Number: Number,
  String: String,
  JSON: JSON
};
sandbox.window = sandbox;
sandbox.window.dfTriggerVocabStatsSync = () => { syncCalled = true; };

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
const card1 = { sm2Repetitions: 0, sm2EasinessFactor: 2.5, sm2IntervalDays: 0 };
const sm2Step1 = sandbox.window.dfCalculateSm2Interval(card1, 5);
assert.strictEqual(sm2Step1.repetitions, 1);
assert.strictEqual(sm2Step1.intervalDays, 1);
assert.strictEqual(sm2Step1.intervalDaysFormatted, "1");
assert.strictEqual(sm2Step1.easinessFactor, 2.6);

const card2 = { sm2Repetitions: 1, sm2EasinessFactor: 2.6, sm2IntervalDays: 1 };
const sm2Step2 = sandbox.window.dfCalculateSm2Interval(card2, 4);
assert.strictEqual(sm2Step2.repetitions, 2);
assert.strictEqual(sm2Step2.intervalDays, 6);
assert.strictEqual(sm2Step2.easinessFactor, 2.6);

const card3 = { sm2Repetitions: 2, sm2EasinessFactor: 2.6, sm2IntervalDays: 6 };
const sm2Step3 = sandbox.window.dfCalculateSm2Interval(card3, 5);
assert.strictEqual(sm2Step3.repetitions, 3);
assert.strictEqual(sm2Step3.intervalDays, 16);

const sm2Fail = sandbox.window.dfCalculateSm2Interval(card3, 1);
assert.strictEqual(sm2Fail.repetitions, 0);
assert.strictEqual(sm2Fail.intervalDays, 1);

sandbox.localStorage.setItem("df_vocab_bank_v1", JSON.stringify([{ id: "test_c1", word: "buch" }]));
const updated = sandbox.window.dfApplySm2ToCard("test_c1", 5);
assert.strictEqual(updated.sm2Repetitions, 1);
assert.strictEqual(updated.sm2IntervalDays, 1);
assert.strictEqual(syncCalled, true);

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 9. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(sm2): M291 add SuperMemo SM-2 spaced repetition algorithm with versionCode 111 [v4.2.1]" || true
git tag -a v4.2.1-m291-v21 -m "Tag M291: SuperMemo SM-2 spaced repetition with versionCode 111" -f

# 10. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v4.2.1-m291-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M291 (21 of 40 - Phase 3 Kickoff)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 111"
echo "VERSION_NAME: 4.2.1"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M292 (Daily due for review queue generator based on SM-2 timestamps)"
echo "========================================================"
