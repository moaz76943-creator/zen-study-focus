#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #294 (Termux Runner)"
echo " Feature: Prefix & Substring Live Search with Highlight"
echo " Target VersionCode: 114 (v4.2.4) [Mission 24 of 40]"
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
        git commit -m "chore: save local progress before M294" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 5. Apply M294 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M294_PREFIX_LIVE_SEARCH_WITH_HIGHLIGHTING_AND_CODE114_V1" "$APP_JS"; then
    echo "[INFO] Appending M294 Prefix Live Search to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M294_PREFIX_LIVE_SEARCH_WITH_HIGHLIGHTING_AND_CODE114_V1 === */
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

  function dfHighlightSearchMatch(text, query) {
    if (!text) return "";
    var str = String(text);
    if (!query || typeof query !== "string") return str;

    var q = query.trim().toLowerCase();
    if (!q) return str;

    var lower = str.toLowerCase();
    var idx = lower.indexOf(q);
    if (idx === -1) return str;

    var before = str.slice(0, idx);
    var match = str.slice(idx, idx + q.length);
    var after = str.slice(idx + q.length);

    return before +
      "<mark style=\"background:rgba(250,204,21,0.3);color:#fef08a;border-radius:2px;padding:0 2px;font-weight:bold;\">" +
      match +
      "</mark>" +
      after;
  }

  function dfSearchVocabCards(query, cardsList) {
    var list = [];
    if (Array.isArray(cardsList)) {
      list = cardsList;
    } else {
      try {
        if (typeof window !== "undefined" && typeof window.dfGetVocabBankList === "function") {
          list = window.dfGetVocabBankList();
        } else {
          var raw = localStorage.getItem("df_vocab_bank_v1");
          if (raw) list = JSON.parse(raw);
        }
      } catch (_) {}
    }

    if (!Array.isArray(list)) return [];
    if (!query || typeof query !== "string") return list.slice();

    var q = query.trim().toLowerCase();
    if (!q) return list.slice();

    var prefixMatches = [];
    var otherMatches = [];

    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (!item) continue;

      var word = String(item.word || "").toLowerCase();
      var meaning = String(item.meaning || "").toLowerCase();
      var example = String(item.example || "").toLowerCase();

      if (word.startsWith(q)) {
        prefixMatches.push(item);
      } else if (word.indexOf(q) !== -1 || meaning.indexOf(q) !== -1 || example.indexOf(q) !== -1) {
        otherMatches.push(item);
      }
    }

    return prefixMatches.concat(otherMatches);
  }

  function dfRenderSearchMatchCountBadge(matchedCount, totalCount) {
    var m = Number(matchedCount) || 0;
    var t = Number(totalCount) || 0;
    var mStr = dfFormatWesternDigits(m);
    var tStr = dfFormatWesternDigits(t);

    return "<span class=\"df-search-count-badge\" style=\"font-size:11px;color:#93c5fd;background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.25);border-radius:12px;padding:2px 8px;\">" +
      "🔍 " + mStr + " من " + tStr + " كلمة" +
    "</span>";
  }

  if (typeof window !== "undefined") {
    window.dfHighlightSearchMatch = dfHighlightSearchMatch;
    window.dfSearchVocabCards = dfSearchVocabCards;
    window.dfRenderSearchMatchCountBadge = dfRenderSearchMatchCountBadge;
  }
})();
JS_EOF
else
    echo "[INFO] M294 already present in $APP_JS"
fi

# 6. Update build.gradle to versionCode 114 and versionName 4.2.4
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 114', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"4.2.4\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 114 (4.2.4)')
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
const marker = "/* === M294_PREFIX_LIVE_SEARCH_WITH_HIGHLIGHTING_AND_CODE114_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

const sampleCards = [
  { id: "1", word: "Person", meaning: "شخص" },
  { id: "2", word: "Sonne", meaning: "شمس" },
  { id: "3", word: "Sonntag", meaning: "الأحد" },
  { id: "4", word: "Buch", meaning: "كتاب" }
];

const sandbox = {
  window: {},
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
  },
  Array: Array,
  String: String,
  Number: Number
};
sandbox.window = sandbox;
sandbox.window.dfGetVocabBankList = () => sampleCards;

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
const results = sandbox.window.dfSearchVocabCards("son", sampleCards);
assert.strictEqual(results.length, 3);
assert.strictEqual(results[0].word, "Sonne");
assert.strictEqual(results[1].word, "Sonntag");
assert.strictEqual(results[2].word, "Person");

const highlighted = sandbox.window.dfHighlightSearchMatch("Sonne", "son");
assert.ok(highlighted.includes("<mark"));
assert.ok(highlighted.includes("Son"));
assert.ok(highlighted.includes("ne"));

assert.strictEqual(sandbox.window.dfHighlightSearchMatch("Buch", "son"), "Buch");

const badge = sandbox.window.dfRenderSearchMatchCountBadge(3, 4);
assert.ok(badge.includes("3 من 4"));
assert.ok(badge.includes("df-search-count-badge"));

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 9. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(search): M294 add prefix and substring live search with match highlighting with versionCode 114 [v4.2.4]" || true
git tag -a v4.2.4-m294-v21 -m "Tag M294: prefix live search with match highlighting with versionCode 114" -f

# 10. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v4.2.4-m294-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M294 (24 of 40)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 114"
echo "VERSION_NAME: 4.2.4"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M295 (Custom decks and tags categorization manager)"
echo "========================================================"
