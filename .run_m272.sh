#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #272 (Termux Runner)"
echo " Feature: Pomodoro Micro-Review Break Suggestion"
echo " Target VersionCode: 92 (v4.0.2) [Mission 2 of 40]"
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
        git commit -m "chore: save local progress before M272" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 5. Apply M272 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M272_POMODORO_MICRO_REVIEW_BREAK_AND_CODE92_V1" "$APP_JS"; then
    echo "[INFO] Appending M272 Pomodoro Micro-Review to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M272_POMODORO_MICRO_REVIEW_BREAK_AND_CODE92_V1 === */
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

  function dfGetMicroReviewCards(limit) {
    var maxCards = Number(limit) || 5;
    var allCards = [];
    try {
      if (typeof window !== "undefined" && typeof window.dfGetVocabBankList === "function") {
        allCards = window.dfGetVocabBankList();
      } else {
        var raw = localStorage.getItem("df_vocab_bank_v1");
        allCards = raw ? JSON.parse(raw) : [];
      }
    } catch (_) {
      allCards = [];
    }

    if (!Array.isArray(allCards) || allCards.length === 0) return [];

    var reviewQueue = [];
    var otherQueue = [];

    for (var i = 0; i < allCards.length; i++) {
      var c = allCards[i];
      if (!c) continue;
      if (c.needsReview || c.isHard || c.hard) {
        reviewQueue.push(c);
      } else if (!c.isMastered && !c.mastered) {
        otherQueue.push(c);
      }
    }

    var selected = reviewQueue.concat(otherQueue).slice(0, maxCards);
    return selected;
  }

  function dfRenderMicroReviewBreakBannerHtml(cardCount) {
    var count = Number(cardCount) || 5;
    var countStr = dfFormatWesternDigits(count);

    return "<div id=\"df-micro-review-banner\" style=\"margin:12px 0;padding:12px 14px;background:#18181b;border:1px solid #3b82f6;border-radius:12px;direction:rtl;box-shadow:0 6px 18px rgba(0,0,0,0.3);color:#f4f4f5;\">" +
      "<div style=\"display:flex;align-items:center;gap:8px;margin-bottom:8px;\">" +
        "<span style=\"font-size:18px;\">☕</span>" +
        "<div>" +
          "<strong style=\"font-size:13px;display:block;color:#93c5fd;\">وقت الاستراحة! مراجعة سريعة؟</strong>" +
          "<span style=\"font-size:11px;color:#a1a1aa;\">استثمر دقائق الاستراحة في ترسيخ " + countStr + " كلمات بتركيز هادئ.</span>" +
        "</div>" +
      "</div>" +
      "<div style=\"display:flex;gap:8px;margin-top:8px;\">" +
        "<button type=\"button\" onclick=\"window.dfStartMicroReviewSession && window.dfStartMicroReviewSession(" + count + ")\" style=\"background:#2563eb;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:bold;cursor:pointer;flex:1;\">" +
          "<span>🎯 مراجعة " + countStr + " كلمات</span>" +
        "</button>" +
        "<button type=\"button\" onclick=\"window.dfDismissMicroReviewBanner && window.dfDismissMicroReviewBanner()\" style=\"background:rgba(255,255,255,0.08);color:#a1a1aa;border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:6px 14px;font-size:12px;cursor:pointer;\">" +
          "<span>استراحة صامتة</span>" +
        "</button>" +
      "</div>" +
    "</div>";
  }

  function dfStartMicroReviewSession(limit) {
    var cards = dfGetMicroReviewCards(limit);
    if (!cards || cards.length === 0) {
      if (typeof window !== "undefined" && typeof window.dfShowVocabToastNotification === "function") {
        window.dfShowVocabToastNotification("لا توجد كلمات كافية للمراجعة حالياً", "info", 2000);
      }
      dfDismissMicroReviewBanner();
      return false;
    }

    dfDismissMicroReviewBanner();

    try {
      if (typeof window !== "undefined" && typeof window.dfVocabHapticPulse === "function") {
        window.dfVocabHapticPulse(25);
      }
    } catch (_) {}

    try {
      if (typeof window !== "undefined" && typeof window.dfOpenFlashcardQuizModal === "function") {
        window.dfCurrentQuizCards = cards.slice();
        window.dfOpenFlashcardQuizModal(cards);
      }
    } catch (_) {}

    return true;
  }

  function dfDismissMicroReviewBanner() {
    try {
      if (typeof document === "undefined") return;
      var el = document.getElementById("df-micro-review-banner");
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    } catch (_) {}
  }

  function dfOnPomodoroSessionCompleted() {
    try {
      if (typeof window !== "undefined" && typeof window.dfPlayZenGoalCompletionChime === "function") {
        window.dfPlayZenGoalCompletionChime();
      }
    } catch (_) {}

    var available = dfGetMicroReviewCards(5);
    if (available && available.length > 0) {
      try {
        if (typeof document !== "undefined") {
          var container = document.getElementById("df-pomodoro-break-actions") || document.body;
          if (container && !document.getElementById("df-micro-review-banner")) {
            var div = document.createElement("div");
            div.innerHTML = dfRenderMicroReviewBreakBannerHtml(available.length);
            container.insertBefore(div.firstChild, container.firstChild);
          }
        }
      } catch (_) {}
    }
  }

  if (typeof window !== "undefined") {
    window.dfGetMicroReviewCards = dfGetMicroReviewCards;
    window.dfRenderMicroReviewBreakBannerHtml = dfRenderMicroReviewBreakBannerHtml;
    window.dfStartMicroReviewSession = dfStartMicroReviewSession;
    window.dfDismissMicroReviewBanner = dfDismissMicroReviewBanner;
    window.dfOnPomodoroSessionCompleted = dfOnPomodoroSessionCompleted;
  }
})();
JS_EOF
else
    echo "[INFO] M272 already present in $APP_JS"
fi

# 6. Update build.gradle to versionCode 92 and versionName 4.0.2
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 92', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"4.0.2\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 92 (4.0.2)')
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
const marker = "/* === M272_POMODORO_MICRO_REVIEW_BREAK_AND_CODE92_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

let hapticCalled = false;
let quizOpenedWith = null;
let chimePlayed = false;
let bannerAppended = false;
let bannerRemoved = false;

const dummyBanner = {
  id: "df-micro-review-banner",
  parentNode: {
    removeChild: () => { bannerRemoved = true; }
  }
};

const sandbox = {
  window: {},
  document: {
    getElementById: (id) => (id === "df-micro-review-banner" && !bannerRemoved ? dummyBanner : null),
    createElement: () => ({ innerHTML: "", firstChild: dummyBanner }),
    body: {
      insertBefore: () => { bannerAppended = true; }
    }
  },
  Number: Number,
  String: String,
  Array: Array
};
sandbox.window = sandbox;

sandbox.window.dfVocabHapticPulse = () => { hapticCalled = true; };
sandbox.window.dfPlayZenGoalCompletionChime = () => { chimePlayed = true; };
sandbox.window.dfOpenFlashcardQuizModal = (cards) => { quizOpenedWith = cards; };

const sampleCards = [
  { id: "1", word: "zeit", needsReview: true },
  { id: "2", word: "buch", isMastered: true },
  { id: "3", word: "apfel", isMastered: false }
];
sandbox.window.dfGetVocabBankList = () => sampleCards;

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
const microCards = sandbox.window.dfGetMicroReviewCards(5);
assert.strictEqual(microCards.length, 2);
assert.strictEqual(microCards[0].id, "1");
assert.strictEqual(microCards[1].id, "3");

const bannerHtml = sandbox.window.dfRenderMicroReviewBreakBannerHtml(5);
assert.ok(bannerHtml.includes("وقت الاستراحة! مراجعة سريعة؟"));
assert.ok(bannerHtml.includes("5 كلمات"));
assert.ok(bannerHtml.includes("dfStartMicroReviewSession"));
assert.ok(bannerHtml.includes("dfDismissMicroReviewBanner"));

const started = sandbox.window.dfStartMicroReviewSession(2);
assert.strictEqual(started, true);
assert.strictEqual(hapticCalled, true);
assert.strictEqual(quizOpenedWith.length, 2);

sandbox.window.dfOnPomodoroSessionCompleted();
assert.strictEqual(chimePlayed, true);
assert.strictEqual(bannerAppended, true);

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 9. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(pomodoro): M272 add pomodoro micro-review break suggestion on session completion with versionCode 92 [v4.0.2]" || true
git tag -a v4.0.2-m272-v21 -m "Tag M272: pomodoro micro-review break suggestion with versionCode 92" -f

# 10. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v4.0.2-m272-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M272 (2 of 40)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 92"
echo "VERSION_NAME: 4.0.2"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M273 (Unified focus and vocab study synergy points calculator)"
echo "========================================================"
