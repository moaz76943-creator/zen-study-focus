#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #254 (Termux Runner)"
echo " Feature: Flashcard Quiz Accuracy Score & Master Tiers"
echo " Target VersionCode: 74 (v3.8.4)"
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
        git commit -m "chore: save local progress before M254" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 4. Apply M254 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M254_VOCAB_QUIZ_ACCURACY_SCORE_AND_CODE74_V1" "$APP_JS"; then
    echo "[INFO] Appending M254 Quiz Accuracy feature to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M254_VOCAB_QUIZ_ACCURACY_SCORE_AND_CODE74_V1 === */
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

  function dfFormatWesternPercent(num) {
    var n = Number(num);
    if (isNaN(n) || n < 0) n = 0;
    if (n > 100) n = 100;
    return dfFormatWesternDigits(Math.round(n)) + '%';
  }

  function dfCalculateQuizAccuracy(correctCount, totalReviewed) {
    var c = Number(correctCount);
    var t = Number(totalReviewed);
    if (isNaN(c) || c < 0) c = 0;
    if (isNaN(t) || t <= 0) {
      return {
        percentage: 0,
        formatted: '0%',
        correctCount: 0,
        totalReviewed: 0,
        tier: 'neutral',
        label: 'لا توجد بيانات كافية'
      };
    }

    if (c > t) c = t;
    var pct = Math.round((c / t) * 100);
    var tier = 'needs_review';
    var label = 'يحتاج إلى مراجعة';

    if (pct >= 90) {
      tier = 'master';
      label = 'إتقان استثنائي';
    } else if (pct >= 75) {
      tier = 'good';
      label = 'مستوى جيد جداً';
    } else if (pct >= 60) {
      tier = 'passing';
      label = 'مقبول';
    }

    return {
      percentage: pct,
      formatted: dfFormatWesternPercent(pct),
      correctCount: c,
      totalReviewed: t,
      tier: tier,
      label: label
    };
  }

  function dfGetQuizSessionAccuracyBadge(correctCount, totalReviewed) {
    var res = dfCalculateQuizAccuracy(correctCount, totalReviewed);
    var color = '#9e9e9e';
    if (res.tier === 'master') color = '#2e7d32';
    else if (res.tier === 'good') color = '#1565c0';
    else if (res.tier === 'passing') color = '#f57f17';
    else if (res.tier === 'needs_review') color = '#c62828';

    return '<span class="df-quiz-accuracy-badge" style="display:inline-block;padding:3px 8px;border-radius:12px;font-size:12px;font-weight:bold;color:#fff;background-color:' + color + ';">' +
      '🎯 ' + res.formatted + ' (' + res.label + ')' +
      '</span>';
  }

  if (typeof window !== 'undefined') {
    window.dfFormatWesternDigits = dfFormatWesternDigits;
    window.dfFormatWesternPercent = dfFormatWesternPercent;
    window.dfCalculateQuizAccuracy = dfCalculateQuizAccuracy;
    window.dfGetQuizSessionAccuracyBadge = dfGetQuizSessionAccuracyBadge;
  }
})();
JS_EOF
else
    echo "[INFO] M254 already present in $APP_JS"
fi

# 5. Update build.gradle to versionCode 74
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 74', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"3.8.4\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 74 (3.8.4)')
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
const marker = "/* === M254_VOCAB_QUIZ_ACCURACY_SCORE_AND_CODE74_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

const dummyElem = new Proxy({}, { get: () => () => dummyElem, set: () => true });

const sandbox = {
  window: {},
  document: {
    getElementById: () => dummyElem,
    querySelector: () => dummyElem,
    querySelectorAll: () => []
  },
  Math: Math,
  Number: Number,
  String: String,
  isNaN: isNaN
};
sandbox.window = sandbox;

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
assert.strictEqual(sandbox.window.dfFormatWesternDigits("١٢٣"), "123");
assert.strictEqual(sandbox.window.dfFormatWesternPercent(85.4), "85%");

const zeroRes = sandbox.window.dfCalculateQuizAccuracy(0, 0);
assert.strictEqual(zeroRes.percentage, 0);
assert.strictEqual(zeroRes.formatted, "0%");
assert.strictEqual(zeroRes.tier, "neutral");

const masterRes = sandbox.window.dfCalculateQuizAccuracy(9, 10);
assert.strictEqual(masterRes.percentage, 90);
assert.strictEqual(masterRes.formatted, "90%");
assert.strictEqual(masterRes.tier, "master");

const goodRes = sandbox.window.dfCalculateQuizAccuracy(8, 10);
assert.strictEqual(goodRes.percentage, 80);
assert.strictEqual(goodRes.formatted, "80%");
assert.strictEqual(goodRes.tier, "good");

const poorRes = sandbox.window.dfCalculateQuizAccuracy(4, 10);
assert.strictEqual(poorRes.percentage, 40);
assert.strictEqual(poorRes.formatted, "40%");
assert.strictEqual(poorRes.tier, "needs_review");

const badge = sandbox.window.dfGetQuizSessionAccuracyBadge(9, 10);
assert.ok(badge.includes("90%"));
assert.ok(badge.includes("#2e7d32"));

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 8. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(vocab): M254 add flashcard quiz accuracy score calculator with versionCode 74 [v3.8.4]" || true
git tag -a v3.8.4-m254-v21 -m "Tag M254: flashcard quiz accuracy score calculator with versionCode 74" -f

# 9. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v3.8.4-m254-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M254"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 74"
echo "VERSION_NAME: 3.8.4"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M255 (Daily study streak calculation and flashcard review milestones)"
echo "========================================================"
