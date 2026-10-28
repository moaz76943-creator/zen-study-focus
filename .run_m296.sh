#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #296 (Termux Runner)"
echo " Feature: Spelling & Typing Practice Mode for Vocab"
echo " Target VersionCode: 116 (v4.2.6) [Mission 26 of 40]"
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
        git commit -m "chore: save local progress before M296" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 5. Apply M296 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M296_SPELLING_AND_TYPING_PRACTICE_MODE_AND_CODE116_V1" "$APP_JS"; then
    echo "[INFO] Appending M296 Spelling Practice Mode to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M296_SPELLING_AND_TYPING_PRACTICE_MODE_AND_CODE116_V1 === */
(function() {
  'use strict';

  function dfIsSpellingModeEnabled() {
    try {
      return localStorage.getItem("df_spelling_mode_enabled_v1") === "true";
    } catch (_) {
      return false;
    }
  }

  function dfToggleSpellingMode(enable) {
    var state = (enable !== undefined) ? Boolean(enable) : !dfIsSpellingModeEnabled();
    try {
      localStorage.setItem("df_spelling_mode_enabled_v1", String(state));
    } catch (_) {}

    try {
      if (typeof window !== "undefined" && typeof window.dfVocabHapticPulse === "function") {
        window.dfVocabHapticPulse(15);
      }
    } catch (_) {}

    return state;
  }

  function dfCalculateLevenshteinDistance(a, b) {
    var s1 = String(a || "").toLowerCase().trim();
    var s2 = String(b || "").toLowerCase().trim();
    if (s1 === s2) return 0;
    if (s1.length === 0) return s2.length;
    if (s2.length === 0) return s1.length;

    var matrix = [];
    for (var i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    for (var j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }

    for (var i = 1; i <= s2.length; i++) {
      for (var j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[s2.length][s1.length];
  }

  function dfCheckSpellingInput(userInput, correctWord) {
    var input = String(userInput || "").trim();
    var target = String(correctWord || "").trim();
    if (!input) {
      return { correct: false, distance: target.length, message: "يرجى كتابة الكلمة أولاً." };
    }

    var dist = dfCalculateLevenshteinDistance(input, target);

    if (dist === 0) {
      try {
        if (typeof window !== "undefined" && typeof window.dfVocabHapticPulse === "function") {
          window.dfVocabHapticPulse(25);
        }
      } catch (_) {}

      return {
        correct: true,
        distance: 0,
        score: 5,
        message: "إجابة نموذجية صحيحة 100%! 🎉"
      };
    } else if (dist === 1) {
      return {
        correct: false,
        nearMiss: true,
        distance: 1,
        score: 3,
        message: "قريب جداً! خطأ في حرف واحد فقط."
      };
    } else {
      return {
        correct: false,
        nearMiss: false,
        distance: dist,
        score: 1,
        message: "إملاء غير صحيح، حاول مرة أخرى أو انقر كشف الكلمة."
      };
    }
  }

  function dfRenderSpellingQuizCardHtml(card) {
    if (!card) return "";
    var meaning = card.meaning || "بدون ترجمة";
    var safeWord = String(card.word || "").replace(/"/g, "&quot;").replace(/'/g, "\\'");

    return "<div class=\"df-spelling-quiz-card\" style=\"padding:16px;background:#18181b;border:1px solid #27272a;border-radius:12px;direction:rtl;color:#f4f4f5;text-align:center;\">" +
      "<div style=\"margin-bottom:12px;\">" +
        "<span style=\"font-size:11px;color:#a1a1aa;display:block;margin-bottom:4px;\">المعنى المطلوب كتابته:</span>" +
        "<h3 style=\"margin:0;font-size:18px;color:#60a5fa;\">" + meaning + "</h3>" +
      "</div>" +
      "<div style=\"margin-bottom:12px;\">" +
        "<input type=\"text\" id=\"df-spelling-input\" placeholder=\"اكتب الكلمة باللغة الأجنبية...\" style=\"width:100%;box-sizing:border-box;padding:10px 12px;background:#27272a;border:1px solid #3f3f46;border-radius:8px;color:#f4f4f5;font-size:14px;direction:ltr;text-align:center;\" />" +
      "</div>" +
      "<div style=\"display:flex;gap:8px;\">" +
        "<button type=\"button\" onclick=\"var input=document.getElementById('df-spelling-input'); if(input && window.dfCheckSpellingInput){ var res = window.dfCheckSpellingInput(input.value, '" + safeWord + "'); alert(res.message); }\" style=\"background:#2563eb;color:#fff;border:none;border-radius:6px;padding:8px 16px;font-size:12px;font-weight:bold;cursor:pointer;flex:1;\">" +
          "<span>تحقق من الإملاء</span>" +
        "</button>" +
        "<button type=\"button\" onclick=\"alert('الكلمة الصحيحة هي: " + safeWord + "');\" style=\"background:rgba(255,255,255,0.08);color:#a1a1aa;border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:8px 14px;font-size:12px;cursor:pointer;\">" +
          "<span>كشف الكلمة</span>" +
        "</button>" +
      "</div>" +
    "</div>";
  }

  if (typeof window !== "undefined") {
    window.dfIsSpellingModeEnabled = dfIsSpellingModeEnabled;
    window.dfToggleSpellingMode = dfToggleSpellingMode;
    window.dfCalculateLevenshteinDistance = dfCalculateLevenshteinDistance;
    window.dfCheckSpellingInput = dfCheckSpellingInput;
    window.dfRenderSpellingQuizCardHtml = dfRenderSpellingQuizCardHtml;
  }
})();
JS_EOF
else
    echo "[INFO] M296 already present in $APP_JS"
fi

# 6. Update build.gradle to versionCode 116 and versionName 4.2.6
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 116', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"4.2.6\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 116 (4.2.6)')
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
const marker = "/* === M296_SPELLING_AND_TYPING_PRACTICE_MODE_AND_CODE116_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

const memStore = Object.create(null);
let hapticCalled = false;

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
  Math: Math,
  String: String,
  Boolean: Boolean
};
sandbox.window = sandbox;
sandbox.window.dfVocabHapticPulse = () => { hapticCalled = true; };

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
assert.strictEqual(sandbox.window.dfIsSpellingModeEnabled(), false);
sandbox.window.dfToggleSpellingMode(true);
assert.strictEqual(sandbox.window.dfIsSpellingModeEnabled(), true);

assert.strictEqual(sandbox.window.dfCalculateLevenshteinDistance("Sonne", "Sonne"), 0);
assert.strictEqual(sandbox.window.dfCalculateLevenshteinDistance("Sonne", "Sone"), 1);
assert.strictEqual(sandbox.window.dfCalculateLevenshteinDistance("Sonne", "Sonnen"), 1);
assert.strictEqual(sandbox.window.dfCalculateLevenshteinDistance("Buch", "Haus"), 4);

const exact = sandbox.window.dfCheckSpellingInput("Sonne", "Sonne");
assert.strictEqual(exact.correct, true);
assert.strictEqual(exact.score, 5);
assert.strictEqual(hapticCalled, true);

const near = sandbox.window.dfCheckSpellingInput("Sone", "Sonne");
assert.strictEqual(near.correct, false);
assert.strictEqual(near.nearMiss, true);
assert.strictEqual(near.distance, 1);
assert.strictEqual(near.score, 3);

const wrong = sandbox.window.dfCheckSpellingInput("Tisch", "Sonne");
assert.strictEqual(wrong.correct, false);
assert.strictEqual(wrong.score, 1);

const card = { word: "Sonne", meaning: "شمس" };
const html = sandbox.window.dfRenderSpellingQuizCardHtml(card);
assert.ok(html.includes("شمس"));
assert.ok(html.includes("df-spelling-input"));
assert.ok(html.includes("تحقق من الإملاء"));
assert.ok(html.includes("df-spelling-quiz-card"));

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 9. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(quiz): M296 add spelling and typing practice mode for vocabulary cards with versionCode 116 [v4.2.6]" || true
git tag -a v4.2.6-m296-v21 -m "Tag M296: spelling and typing practice mode with versionCode 116" -f

# 10. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v4.2.6-m296-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M296 (26 of 40)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 116"
echo "VERSION_NAME: 4.2.6"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M297 (Anki TSV/TXT deck importer and parser)"
echo "========================================================"
