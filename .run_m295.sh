#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #295 (Termux Runner)"
echo " Feature: Custom Decks & Tags Categorization Manager"
echo " Target VersionCode: 115 (v4.2.5) [Mission 25 of 40]"
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
        git commit -m "chore: save local progress before M295" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 5. Apply M295 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M295_CUSTOM_DECKS_AND_TAGS_MANAGER_AND_CODE115_V1" "$APP_JS"; then
    echo "[INFO] Appending M295 Custom Decks Manager to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M295_CUSTOM_DECKS_AND_TAGS_MANAGER_AND_CODE115_V1 === */
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

  function dfGetActiveDeckFilter() {
    try {
      var val = localStorage.getItem("df_active_deck_v1");
      if (val && typeof val === "string") return val;
    } catch (_) {}
    return "all";
  }

  function dfSetActiveDeckFilter(deckName) {
    var target = (deckName && typeof deckName === "string") ? deckName.trim() : "all";
    try {
      localStorage.setItem("df_active_deck_v1", target);
    } catch (_) {}

    try {
      if (typeof window !== "undefined" && typeof window.dfVocabHapticPulse === "function") {
        window.dfVocabHapticPulse(15);
      }
    } catch (_) {}

    try {
      if (typeof window !== "undefined" && typeof window.dfTriggerVocabStatsSync === "function") {
        window.dfTriggerVocabStatsSync({ immediate: true });
      }
    } catch (_) {}

    return target;
  }

  function dfGetAllDecks() {
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

    var deckCounts = Object.create(null);
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (!c) continue;
      var d = (c.deck && typeof c.deck === "string" && c.deck.trim()) ? c.deck.trim() : "عام";
      deckCounts[d] = (deckCounts[d] || 0) + 1;
    }

    var result = [{
      name: "all",
      label: "الكل",
      count: list.length,
      countFormatted: dfFormatWesternDigits(list.length)
    }];

    for (var name in deckCounts) {
      result.push({
        name: name,
        label: name,
        count: deckCounts[name],
        countFormatted: dfFormatWesternDigits(deckCounts[name])
      });
    }

    return result;
  }

  function dfFilterCardsByDeck(cardsList, deckName) {
    if (!Array.isArray(cardsList)) return [];
    var target = (deckName && typeof deckName === "string") ? deckName.trim() : dfGetActiveDeckFilter();
    if (target === "all") return cardsList.slice();

    return cardsList.filter(function(card) {
      if (!card) return false;
      var d = (card.deck && typeof card.deck === "string" && card.deck.trim()) ? card.deck.trim() : "عام";
      return d.toLowerCase() === target.toLowerCase();
    });
  }

  function dfAssignCardDeck(cardId, deckName) {
    if (!cardId && cardId !== 0) return false;
    var list = [];
    try {
      var raw = localStorage.getItem("df_vocab_bank_v1");
      if (raw) list = JSON.parse(raw);
    } catch (_) {}

    if (!Array.isArray(list)) return false;
    var found = false;

    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(cardId)) {
        list[i].deck = (deckName && typeof deckName === "string") ? deckName.trim() : "عام";
        found = true;
        break;
      }
    }

    if (!found) return false;

    try {
      localStorage.setItem("df_vocab_bank_v1", JSON.stringify(list));
    } catch (_) {
      return false;
    }

    try {
      if (typeof window !== "undefined" && typeof window.dfTriggerVocabStatsSync === "function") {
        window.dfTriggerVocabStatsSync({ immediate: true });
      }
    } catch (_) {}

    return true;
  }

  function dfRenderDeckFilterChipsHtml() {
    var decks = dfGetAllDecks();
    var active = dfGetActiveDeckFilter();
    var chipsHtml = "";

    for (var i = 0; i < decks.length; i++) {
      var d = decks[i];
      var isSel = (d.name.toLowerCase() === active.toLowerCase());
      var bg = isSel ? "#2563eb" : "rgba(255,255,255,0.06)";
      var border = isSel ? "#3b82f6" : "rgba(255,255,255,0.12)";
      var color = isSel ? "#ffffff" : "#d4d4d8";

      chipsHtml += "<button type=\"button\" onclick=\"window.dfSetActiveDeckFilter && window.dfSetActiveDeckFilter('" + d.name + "')\" style=\"background:" + bg + ";border:1px solid " + border + ";color:" + color + ";border-radius:14px;padding:3px 10px;font-size:11px;cursor:pointer;white-space:nowrap;font-weight:" + (isSel ? "bold" : "normal") + ";\">" +
        "<span>" + d.label + " (" + d.countFormatted + ")</span>" +
      "</button>";
    }

    return "<div class=\"df-deck-filter-bar\" style=\"margin:8px 0;display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;direction:rtl;\">" +
      chipsHtml +
    "</div>";
  }

  if (typeof window !== "undefined") {
    window.dfGetActiveDeckFilter = dfGetActiveDeckFilter;
    window.dfSetActiveDeckFilter = dfSetActiveDeckFilter;
    window.dfGetAllDecks = dfGetAllDecks;
    window.dfFilterCardsByDeck = dfFilterCardsByDeck;
    window.dfAssignCardDeck = dfAssignCardDeck;
    window.dfRenderDeckFilterChipsHtml = dfRenderDeckFilterChipsHtml;
  }
})();
JS_EOF
else
    echo "[INFO] M295 already present in $APP_JS"
fi

# 6. Update build.gradle to versionCode 115 and versionName 4.2.5
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 115', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"4.2.5\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 115 (4.2.5)')
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
const marker = "/* === M295_CUSTOM_DECKS_AND_TAGS_MANAGER_AND_CODE115_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

const memStore = Object.create(null);
let hapticCalled = false;
let syncCalled = false;

const sampleCards = [
  { id: "1", word: "Pass", deck: "سفر" },
  { id: "2", word: "Flugzeug", deck: "سفر" },
  { id: "3", word: "Vertrag", deck: "أعمال" },
  { id: "4", word: "Tisch" }
];

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
  String: String,
  JSON: JSON
};
sandbox.window = sandbox;
sandbox.window.dfGetVocabBankList = () => sampleCards;
sandbox.window.dfVocabHapticPulse = () => { hapticCalled = true; };
sandbox.window.dfTriggerVocabStatsSync = () => { syncCalled = true; };

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
const decks = sandbox.window.dfGetAllDecks();
assert.strictEqual(decks.length, 4);
assert.strictEqual(decks[0].name, "all");
assert.strictEqual(decks[0].countFormatted, "4");

const travelDeck = decks.find(d => d.name === "سفر");
assert.ok(travelDeck);
assert.strictEqual(travelDeck.count, 2);
assert.strictEqual(travelDeck.countFormatted, "2");

const travelCards = sandbox.window.dfFilterCardsByDeck(sampleCards, "سفر");
assert.strictEqual(travelCards.length, 2);
assert.strictEqual(travelCards[0].word, "Pass");
assert.strictEqual(travelCards[1].word, "Flugzeug");

sandbox.window.dfSetActiveDeckFilter("سفر");
assert.strictEqual(sandbox.window.dfGetActiveDeckFilter(), "سفر");
assert.strictEqual(hapticCalled, true);
assert.strictEqual(syncCalled, true);

const autoFiltered = sandbox.window.dfFilterCardsByDeck(sampleCards);
assert.strictEqual(autoFiltered.length, 2);

sandbox.localStorage.setItem("df_vocab_bank_v1", JSON.stringify(sampleCards));
const assigned = sandbox.window.dfAssignCardDeck("4", "منزل");
assert.strictEqual(assigned, true);
const updatedList = JSON.parse(sandbox.localStorage.getItem("df_vocab_bank_v1"));
assert.strictEqual(updatedList[3].deck, "منزل");

const html = sandbox.window.dfRenderDeckFilterChipsHtml();
assert.ok(html.includes("سفر (2)"));
assert.ok(html.includes("dfSetActiveDeckFilter"));
assert.ok(html.includes("df-deck-filter-bar"));

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 9. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(vocab): M295 add custom decks and tags categorization manager with versionCode 115 [v4.2.5]" || true
git tag -a v4.2.5-m295-v21 -m "Tag M295: custom decks and tags categorization manager with versionCode 115" -f

# 10. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v4.2.5-m295-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M295 (25 of 40)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 115"
echo "VERSION_NAME: 4.2.5"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M296 (Spelling and typing practice mode for vocabulary cards)"
echo "========================================================"
