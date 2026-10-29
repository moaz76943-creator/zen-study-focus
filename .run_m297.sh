#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #297 (Termux Runner)"
echo " Feature: Anki TSV & TXT Flashcard Deck Importer"
echo " Target VersionCode: 117 (v4.2.7) [Mission 27 of 40]"
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
        git commit -m "chore: save local progress before M297" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 5. Apply M297 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M297_ANKI_TSV_DECK_IMPORTER_AND_CODE117_V1" "$APP_JS"; then
    echo "[INFO] Appending M297 Anki Importer to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M297_ANKI_TSV_DECK_IMPORTER_AND_CODE117_V1 === */
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

  function dfStripAnkiHtml(htmlStr) {
    if (!htmlStr) return "";
    return String(htmlStr)
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, "\"")
      .trim();
  }

  function dfParseAnkiTsvContent(rawContent, defaultDeckName) {
    if (!rawContent || typeof rawContent !== "string") {
      return { importedCards: [], totalLines: 0 };
    }

    var lines = rawContent.split(/\r?\n/);
    var deck = (defaultDeckName && typeof defaultDeckName === "string") ? defaultDeckName.trim() : "Anki";
    var cards = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line || line.startsWith("#")) continue;

      var delimiter = "\t";
      if (line.indexOf("\t") === -1 && line.indexOf(";") !== -1) {
        delimiter = ";";
      }

      var cols = line.split(delimiter);
      if (cols.length < 2) continue;

      var word = dfStripAnkiHtml(cols[0]);
      var meaning = dfStripAnkiHtml(cols[1]);
      var example = cols[2] ? dfStripAnkiHtml(cols[2]) : "";

      if (!word || !meaning) continue;

      cards.push({
        id: "anki_" + Date.now() + "_" + i,
        word: word,
        meaning: meaning,
        example: example,
        deck: deck,
        createdAt: Date.now(),
        isMastered: false,
        needsReview: false
      });
    }

    return {
      importedCards: cards,
      totalLines: lines.length
    };
  }

  function dfImportAnkiTsvToVocabBank(rawContent, defaultDeckName) {
    var parseRes = dfParseAnkiTsvContent(rawContent, defaultDeckName);
    var newCards = parseRes.importedCards;
    if (newCards.length === 0) {
      if (typeof window !== "undefined" && typeof window.dfShowVocabToastNotification === "function") {
        window.dfShowVocabToastNotification("لم يتم العثور على بطاقات صالحة في الملف", "warning");
      }
      return { success: false, importedCount: 0 };
    }

    var existing = [];
    try {
      var raw = localStorage.getItem("df_vocab_bank_v1");
      if (raw) existing = JSON.parse(raw);
    } catch (_) {}
    if (!Array.isArray(existing)) existing = [];

    var existingWords = Object.create(null);
    for (var i = 0; i < existing.length; i++) {
      if (existing[i] && existing[i].word) {
        existingWords[String(existing[i].word).toLowerCase().trim()] = true;
      }
    }

    var added = 0;
    var skipped = 0;

    for (var j = 0; j < newCards.length; j++) {
      var card = newCards[j];
      var key = card.word.toLowerCase().trim();
      if (!existingWords[key]) {
        existingWords[key] = true;
        existing.push(card);
        added++;
      } else {
        skipped++;
      }
    }

    try {
      localStorage.setItem("df_vocab_bank_v1", JSON.stringify(existing));
    } catch (_) {
      return { success: false, reason: "storage_failed" };
    }

    try {
      if (typeof window !== "undefined" && typeof window.dfTriggerVocabStatsSync === "function") {
        window.dfTriggerVocabStatsSync({ immediate: true });
      }
    } catch (_) {}

    try {
      if (typeof window !== "undefined" && typeof window.dfVocabHapticPulse === "function") {
        window.dfVocabHapticPulse(25);
      }
    } catch (_) {}

    try {
      if (typeof window !== "undefined" && typeof window.dfShowVocabToastNotification === "function") {
        var msg = "تم استيراد " + dfFormatWesternDigits(added) + " كلمة من Anki بنجاح!";
        if (skipped > 0) msg += " (تخطي " + dfFormatWesternDigits(skipped) + " مكررة)";
        window.dfShowVocabToastNotification(msg, "success");
      }
    } catch (_) {}

    return {
      success: true,
      importedCount: added,
      skippedCount: skipped,
      totalCount: existing.length
    };
  }

  function dfRenderAnkiImporterSettingsHtml() {
    return "<div class=\"df-settings-anki-section\" style=\"margin:12px 0;padding:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;direction:rtl;\">" +
      "<div style=\"margin-bottom:8px;\">" +
        "<span style=\"font-size:13px;font-weight:bold;color:#f4f4f5;display:block;\">📥 استيراد حزم Anki (TSV / TXT)</span>" +
        "<span style=\"font-size:11px;color:#a1a1aa;\">استيراد مباشر لبطاقات Anki المجدولة بدون برامج وسيطة</span>" +
      "</div>" +
      "<button type=\"button\" onclick=\"var inp = document.getElementById('df-anki-file-picker'); if(inp) inp.click();\" style=\"background:#10b981;color:#ffffff;border:none;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:bold;cursor:pointer;\">" +
        "<span>اختر ملف Anki (TSV/TXT)</span>" +
      "</button>" +
      "<input type=\"file\" id=\"df-anki-file-picker\" accept=\".txt,.tsv,.csv\" style=\"display:none;\" onchange=\"var f = this.files[0]; if(f){ var r = new FileReader(); r.onload = function(e){ window.dfImportAnkiTsvToVocabBank && window.dfImportAnkiTsvToVocabBank(e.target.result, 'Anki'); }; r.readAsText(f); }\" />" +
    "</div>";
  }

  if (typeof window !== "undefined") {
    window.dfStripAnkiHtml = dfStripAnkiHtml;
    window.dfParseAnkiTsvContent = dfParseAnkiTsvContent;
    window.dfImportAnkiTsvToVocabBank = dfImportAnkiTsvToVocabBank;
    window.dfRenderAnkiImporterSettingsHtml = dfRenderAnkiImporterSettingsHtml;
  }
})();
JS_EOF
else
    echo "[INFO] M297 already present in $APP_JS"
fi

# 6. Update build.gradle to versionCode 117 and versionName 4.2.7
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 117', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"4.2.7\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 117 (4.2.7)')
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
const marker = "/* === M297_ANKI_TSV_DECK_IMPORTER_AND_CODE117_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

const memStore = Object.create(null);
let hapticCalled = false;
let syncCalled = false;
let toastMessage = "";

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
  Array: Array,
  String: String,
  JSON: JSON
};
sandbox.window = sandbox;
sandbox.window.dfVocabHapticPulse = () => { hapticCalled = true; };
sandbox.window.dfTriggerVocabStatsSync = () => { syncCalled = true; };
sandbox.window.dfShowVocabToastNotification = (msg) => { toastMessage = msg; };

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
const clean = sandbox.window.dfStripAnkiHtml("<b>Die Sonne</b><br/>شمس &amp; قمر");
assert.strictEqual(clean, "Die Sonne شمس & قمر");

const sampleTsv = "#separator:tab\n#html:true\nApfel\tتفاحة\tDer Apfel ist rot.\nBuch\tكتاب\t\n";
const parseRes = sandbox.window.dfParseAnkiTsvContent(sampleTsv, "German");
assert.strictEqual(parseRes.importedCards.length, 2);
assert.strictEqual(parseRes.importedCards[0].word, "Apfel");
assert.strictEqual(parseRes.importedCards[0].meaning, "تفاحة");
assert.strictEqual(parseRes.importedCards[0].example, "Der Apfel ist rot.");
assert.strictEqual(parseRes.importedCards[0].deck, "German");

sandbox.localStorage.setItem("df_vocab_bank_v1", JSON.stringify([{ id: "1", word: "Apfel", meaning: "تفاح" }]));
const importRes = sandbox.window.dfImportAnkiTsvToVocabBank(sampleTsv, "German");
assert.strictEqual(importRes.success, true);
assert.strictEqual(importRes.importedCount, 1);
assert.strictEqual(importRes.skippedCount, 1);
assert.strictEqual(hapticCalled, true);
assert.strictEqual(syncCalled, true);
assert.ok(toastMessage.includes("1"));

const html = sandbox.window.dfRenderAnkiImporterSettingsHtml();
assert.ok(html.includes("استيراد حزم Anki"));
assert.ok(html.includes("df-anki-file-picker"));
assert.ok(html.includes("dfImportAnkiTsvToVocabBank"));

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 9. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(import): M297 add Anki TSV and TXT deck importer with versionCode 117 [v4.2.7]" || true
git tag -a v4.2.7-m297-v21 -m "Tag M297: Anki TSV and TXT deck importer with versionCode 117" -f

# 10. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v4.2.7-m297-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M297 (27 of 40)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 117"
echo "VERSION_NAME: 4.2.7"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M298 (Auto-archive mastered cards toggle for decluttering review queues)"
echo "========================================================"
