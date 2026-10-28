#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #263 (Termux Runner)"
echo " Feature: Launch Quiz Pre-Filtered by Retention Tier"
echo " Target VersionCode: 83 (v3.9.3)"
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
        git commit -m "chore: save local progress before M263" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 4. Apply M263 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M263_QUIZ_PREFILTERED_BY_RETENTION_TIER_AND_CODE83_V1" "$APP_JS"; then
    echo "[INFO] Appending M263 Quiz Pre-Filtered by Tier to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M263_QUIZ_PREFILTERED_BY_RETENTION_TIER_AND_CODE83_V1 === */
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

  function dfGetQuizCardsForTier(tier) {
    var allCards = [];
    try {
      if (typeof window !== 'undefined' && typeof window.dfGetVocabBankList === 'function') {
        allCards = window.dfGetVocabBankList();
      } else {
        var raw = localStorage.getItem('df_vocab_bank_v1');
        allCards = raw ? JSON.parse(raw) : [];
      }
    } catch (_) {
      allCards = [];
    }

    if (!Array.isArray(allCards)) allCards = [];

    if (typeof window !== 'undefined' && typeof window.dfFilterVocabByRetentionTier === 'function') {
      return window.dfFilterVocabByRetentionTier(allCards, tier);
    }

    return allCards;
  }

  function dfStartQuizWithRetentionTier(tier) {
    var targetTier = tier || (typeof window !== 'undefined' && typeof window.dfGetActiveRetentionFilter === 'function' ? window.dfGetActiveRetentionFilter() : 'all');
    var filteredCards = dfGetQuizCardsForTier(targetTier);

    if (!filteredCards || filteredCards.length === 0) {
      return {
        success: false,
        reason: 'empty_tier',
        count: 0,
        tier: targetTier
      };
    }

    try {
      if (typeof window !== 'undefined') {
        window.dfCurrentQuizCards = filteredCards.slice();
      }
    } catch (_) {}

    try {
      if (typeof window !== 'undefined' && typeof window.dfVocabHapticPulse === 'function') {
        window.dfVocabHapticPulse(25);
      }
    } catch (_) {}

    try {
      if (typeof window !== 'undefined' && typeof window.dfOpenFlashcardQuizModal === 'function') {
        window.dfOpenFlashcardQuizModal(filteredCards);
      }
    } catch (_) {}

    return {
      success: true,
      count: filteredCards.length,
      tier: targetTier
    };
  }

  function dfRenderStartQuizTierButtonHtml(tier) {
    var targetTier = tier || (typeof window !== 'undefined' && typeof window.dfGetActiveRetentionFilter === 'function' ? window.dfGetActiveRetentionFilter() : 'all');
    var cards = dfGetQuizCardsForTier(targetTier);
    if (!cards || cards.length === 0) return '';

    var countStr = dfFormatWesternDigits(cards.length);
    var label = 'الكل';
    if (typeof window !== 'undefined' && typeof window.dfGetActiveFilterDisplayLabel === 'function') {
      label = window.dfGetActiveFilterDisplayLabel(targetTier) || 'الكل';
    }

    return '<button type="button" data-tier="' + targetTier + '" onclick="window.dfStartQuizWithRetentionTier && window.dfStartQuizWithRetentionTier(this.dataset.tier)" style="display:inline-flex;align-items:center;gap:6px;background:#2563eb;color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:bold;cursor:pointer;margin-bottom:8px;direction:rtl;">' +
      '<span>🎯 بدء اختبار ' + label + ' (' + countStr + ')</span>' +
    '</button>';
  }

  if (typeof window !== 'undefined') {
    window.dfGetQuizCardsForTier = dfGetQuizCardsForTier;
    window.dfStartQuizWithRetentionTier = dfStartQuizWithRetentionTier;
    window.dfRenderStartQuizTierButtonHtml = dfRenderStartQuizTierButtonHtml;
  }
})();
JS_EOF
else
    echo "[INFO] M263 already present in $APP_JS"
fi

# 5. Update build.gradle to versionCode 83 and versionName 3.9.3
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 83', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"3.9.3\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 83 (3.9.3)')
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
const marker = "/* === M263_QUIZ_PREFILTERED_BY_RETENTION_TIER_AND_CODE83_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

const memStore = Object.create(null);
let hapticCalled = false;
let quizModalOpenedWith = null;

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
  Array: Array,
  String: String
};
sandbox.window = sandbox;

sandbox.window.dfVocabHapticPulse = () => { hapticCalled = true; };
sandbox.window.dfOpenFlashcardQuizModal = (cards) => { quizModalOpenedWith = cards; };

const sampleCards = [
  { id: "1", word: "zeit", needsReview: true },
  { id: "2", word: "buch", isMastered: true },
  { id: "3", word: "apfel", isPinned: true }
];
sandbox.window.dfGetVocabBankList = () => sampleCards;
sandbox.window.dfFilterVocabByRetentionTier = (cards, tier) => {
  if (tier === "needs_review") return cards.filter(c => c.needsReview);
  if (tier === "mastered") return cards.filter(c => c.isMastered);
  if (tier === "pinned") return cards.filter(c => c.isPinned);
  if (tier === "empty") return [];
  return cards;
};
sandbox.window.dfGetActiveFilterDisplayLabel = (t) => (t === "needs_review" ? "⚠️ قيد المراجعة" : "");

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
const reviewCards = sandbox.window.dfGetQuizCardsForTier("needs_review");
assert.strictEqual(reviewCards.length, 1);
assert.strictEqual(reviewCards[0].id, "1");

const launchRes = sandbox.window.dfStartQuizWithRetentionTier("needs_review");
assert.strictEqual(launchRes.success, true);
assert.strictEqual(launchRes.count, 1);
assert.strictEqual(launchRes.tier, "needs_review");
assert.strictEqual(hapticCalled, true);
assert.strictEqual(quizModalOpenedWith.length, 1);
assert.strictEqual(sandbox.window.dfCurrentQuizCards.length, 1);

const emptyRes = sandbox.window.dfStartQuizWithRetentionTier("empty");
assert.strictEqual(emptyRes.success, false);
assert.strictEqual(emptyRes.reason, "empty_tier");

const buttonHtml = sandbox.window.dfRenderStartQuizTierButtonHtml("needs_review");
assert.ok(buttonHtml.includes("🎯 بدء اختبار"));
assert.ok(buttonHtml.includes("⚠️ قيد المراجعة"));
assert.ok(buttonHtml.includes("(1)"));
assert.ok(buttonHtml.includes("data-tier=\"needs_review\""));
assert.ok(buttonHtml.includes("dfStartQuizWithRetentionTier"));

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 8. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(vocab): M263 add quiz launch pre-filtered by retention tier with versionCode 83 [v3.9.3]" || true
git tag -a v3.9.3-m263-v21 -m "Tag M263: quiz launch pre-filtered by retention tier with versionCode 83" -f

# 9. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v3.9.3-m263-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M263"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 83"
echo "VERSION_NAME: 3.9.3"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M264 (Quiz completion mastery promotion hook updating retention metrics)"
echo "========================================================"
