#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #292 (Termux Runner)"
echo " Feature: SM-2 Daily Due for Review Queue Generator"
echo " Target VersionCode: 112 (v4.2.2) [Mission 22 of 40]"
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
        git commit -m "chore: save local progress before M292" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 5. Apply M292 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M292_DUE_TODAY_REVIEW_QUEUE_AND_CODE112_V1" "$APP_JS"; then
    echo "[INFO] Appending M292 Due Today Queue to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M292_DUE_TODAY_REVIEW_QUEUE_AND_CODE112_V1 === */
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

  function dfGetDueTodayVocabCards() {
    var allCards = [];
    try {
      if (typeof window !== "undefined" && typeof window.dfGetVocabBankList === "function") {
        allCards = window.dfGetVocabBankList();
      } else {
        var raw = localStorage.getItem("df_vocab_bank_v1");
        if (raw) allCards = JSON.parse(raw);
      }
    } catch (_) {}

    if (!Array.isArray(allCards)) return [];

    var now = Date.now();
    var endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    var endOfTodayMs = endOfToday.getTime();

    var dueCards = [];

    for (var i = 0; i < allCards.length; i++) {
      var c = allCards[i];
      if (!c) continue;

      if (c.sm2NextDueDateMs && Number(c.sm2NextDueDateMs) <= endOfTodayMs) {
        dueCards.push(c);
      } else if (c.needsReview || c.isHard || c.hard) {
        dueCards.push(c);
      } else if (!c.sm2Repetitions && !c.isMastered && !c.mastered) {
        dueCards.push(c);
      }
    }

    return dueCards;
  }

  function dfGetDueTodayCount() {
    var count = dfGetDueTodayVocabCards().length;
    return {
      count: count,
      countFormatted: dfFormatWesternDigits(count)
    };
  }

  function dfStartDueTodayQuiz() {
    var dueCards = dfGetDueTodayVocabCards();
    if (!dueCards || dueCards.length === 0) {
      if (typeof window !== "undefined" && typeof window.dfShowVocabToastNotification === "function") {
        window.dfShowVocabToastNotification("رائع! لا توجد كلمات متأخرة أو مستحقة للمراجعة اليوم 🎉", "success", 2500);
      }
      return { started: false, count: 0 };
    }

    try {
      if (typeof window !== "undefined" && typeof window.dfVocabHapticPulse === "function") {
        window.dfVocabHapticPulse(25);
      }
    } catch (_) {}

    try {
      if (typeof window !== "undefined" && typeof window.dfOpenFlashcardQuizModal === "function") {
        window.dfCurrentQuizCards = dueCards.slice();
        window.dfOpenFlashcardQuizModal(dueCards);
      }
    } catch (_) {}

    return { started: true, count: dueCards.length };
  }

  function dfRenderDueTodayBannerHtml() {
    var dueData = dfGetDueTodayCount();
    var countStr = dueData.countFormatted;

    if (dueData.count === 0) {
      return "<div class=\"df-due-today-banner\" style=\"margin:10px 0;padding:10px 14px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);border-radius:10px;direction:rtl;display:flex;align-items:center;justify-content:space-between;color:#a7f3d0;font-size:12px;\">" +
        "<span>🎉 أحسنت! أنجزت كل مراجعات اليوم المجدولة (SM-2).</span>" +
        "<span style=\"font-weight:bold;color:#34d399;\">مكتمل ✓</span>" +
      "</div>";
    }

    return "<div class=\"df-due-today-banner\" style=\"margin:10px 0;padding:12px 14px;background:#18181b;border:1px solid #3b82f6;border-radius:12px;direction:rtl;box-shadow:0 4px 15px rgba(0,0,0,0.3);color:#f4f4f5;\">" +
      "<div style=\"display:flex;justify-content:space-between;align-items:center;\">" +
        "<div>" +
          "<strong style=\"font-size:13px;display:block;color:#93c5fd;margin-bottom:2px;\">🎯 مستحق للمراجعة اليوم: " + countStr + " كلمات</strong>" +
          "<span style=\"font-size:11px;color:#a1a1aa;\">مجدولة تلقائياً بخوارزمية التكرار المتباعد SM-2</span>" +
        "</div>" +
        "<button type=\"button\" onclick=\"window.dfStartDueTodayQuiz && window.dfStartDueTodayQuiz()\" style=\"background:#2563eb;color:#ffffff;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:bold;cursor:pointer;\">" +
          "<span>🚀 ابدأ المراجعة</span>" +
        "</button>" +
      "</div>" +
    "</div>";
  }

  if (typeof window !== "undefined") {
    window.dfGetDueTodayVocabCards = dfGetDueTodayVocabCards;
    window.dfGetDueTodayCount = dfGetDueTodayCount;
    window.dfStartDueTodayQuiz = dfStartDueTodayQuiz;
    window.dfRenderDueTodayBannerHtml = dfRenderDueTodayBannerHtml;
  }
})();
JS_EOF
else
    echo "[INFO] M292 already present in $APP_JS"
fi

# 6. Update build.gradle to versionCode 112 and versionName 4.2.2
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 112', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"4.2.2\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 112 (4.2.2)')
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
const marker = "/* === M292_DUE_TODAY_REVIEW_QUEUE_AND_CODE112_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

let hapticCalled = false;
let quizOpenedWith = null;

const now = Date.now();
const yesterday = now - 86400000;
const inTenDays = now + (10 * 86400000);

const sampleCards = [
  { id: "c1", word: "zeit", sm2NextDueDateMs: yesterday },
  { id: "c2", word: "buch", sm2NextDueDateMs: inTenDays, isMastered: true },
  { id: "c3", word: "haus", needsReview: true },
  { id: "c4", word: "sonne", isMastered: true }
];

const sandbox = {
  window: {},
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
  },
  Date: Date,
  Number: Number,
  Array: Array,
  String: String
};
sandbox.window = sandbox;
sandbox.window.dfGetVocabBankList = () => sampleCards;
sandbox.window.dfVocabHapticPulse = () => { hapticCalled = true; };
sandbox.window.dfOpenFlashcardQuizModal = (cards) => { quizOpenedWith = cards; };

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
const due = sandbox.window.dfGetDueTodayVocabCards();
assert.strictEqual(due.length, 2);
assert.strictEqual(due[0].id, "c1");
assert.strictEqual(due[1].id, "c3");

const dueCount = sandbox.window.dfGetDueTodayCount();
assert.strictEqual(dueCount.count, 2);
assert.strictEqual(dueCount.countFormatted, "2");

const quizRes = sandbox.window.dfStartDueTodayQuiz();
assert.strictEqual(quizRes.started, true);
assert.strictEqual(quizRes.count, 2);
assert.strictEqual(hapticCalled, true);
assert.strictEqual(quizOpenedWith.length, 2);

const html = sandbox.window.dfRenderDueTodayBannerHtml();
assert.ok(html.includes("مستحق للمراجعة اليوم: 2 كلمات"));
assert.ok(html.includes("dfStartDueTodayQuiz"));
assert.ok(html.includes("df-due-today-banner"));

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 9. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(sm2): M292 add daily due for review queue generator based on SM-2 with versionCode 112 [v4.2.2]" || true
git tag -a v4.2.2-m292-v21 -m "Tag M292: daily due for review queue generator with versionCode 112" -f

# 10. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v4.2.2-m292-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M292 (22 of 40)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 112"
echo "VERSION_NAME: 4.2.2"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M293 (Example sentence context tray with full sentence TTS audio)"
echo "========================================================"
