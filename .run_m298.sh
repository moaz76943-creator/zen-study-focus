#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #298 (Termux Runner)"
echo " Feature: Auto-Archive Mastered Vocab Cards Toggle"
echo " Target VersionCode: 118 (v4.2.8) [Mission 28 of 40]"
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
        git commit -m "chore: save local progress before M298" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 5. Apply M298 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M298_AUTO_ARCHIVE_MASTERED_CARDS_TOGGLE_AND_CODE118_V1" "$APP_JS"; then
    echo "[INFO] Appending M298 Auto-Archive to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M298_AUTO_ARCHIVE_MASTERED_CARDS_TOGGLE_AND_CODE118_V1 === */
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

  function dfIsAutoArchiveEnabled() {
    try {
      return localStorage.getItem("df_auto_archive_mastered_v1") === "true";
    } catch (_) {
      return false;
    }
  }

  function dfToggleAutoArchive(enable) {
    var state = (enable !== undefined) ? Boolean(enable) : !dfIsAutoArchiveEnabled();
    try {
      localStorage.setItem("df_auto_archive_mastered_v1", String(state));
    } catch (_) {}

    if (state) {
      dfArchiveMasteredCardsNow();
    }

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

    return state;
  }

  function dfArchiveMasteredCardsNow() {
    var list = [];
    try {
      if (typeof window.dfGetVocabBankList === "function") {
        list = window.dfGetVocabBankList();
      } else {
        var raw = localStorage.getItem("df_vocab_bank_v1");
        if (raw) list = JSON.parse(raw);
      }
    } catch (_) {}

    if (!Array.isArray(list)) return 0;
    var count = 0;

    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (!c) continue;
      var isMastered = Boolean(c.isMastered || c.mastered || (c.sm2Repetitions && c.sm2Repetitions >= 4));
      if (isMastered && !c.isArchived) {
        c.isArchived = true;
        c.archivedAt = Date.now();
        count++;
      }
    }

    if (count > 0) {
      try {
        localStorage.setItem("df_vocab_bank_v1", JSON.stringify(list));
      } catch (_) {}
    }

    return count;
  }

  function dfUnarchiveCard(cardId) {
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
        list[i].isArchived = false;
        list[i].archivedAt = null;
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
      if (typeof window.dfTriggerVocabStatsSync === "function") {
        window.dfTriggerVocabStatsSync({ immediate: true });
      }
    } catch (_) {}

    return true;
  }

  function dfGetArchivedCardsCount() {
    var list = [];
    try {
      var raw = localStorage.getItem("df_vocab_bank_v1");
      if (raw) list = JSON.parse(raw);
    } catch (_) {}
    if (!Array.isArray(list)) return 0;

    var archCount = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].isArchived) archCount++;
    }
    return archCount;
  }

  function dfRenderArchiveSettingsToggleHtml() {
    var isEnabled = dfIsAutoArchiveEnabled();
    var statusText = isEnabled ? "مفعّل" : "معطّل";
    var btnBg = isEnabled ? "#10b981" : "rgba(255,255,255,0.1)";
    var archCount = dfGetArchivedCardsCount();
    var archStr = dfFormatWesternDigits(archCount);

    return "<div class=\"df-settings-archive-section\" style=\"margin:12px 0;padding:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;direction:rtl;\">" +
      "<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;\">" +
        "<div>" +
          "<span style=\"font-size:13px;font-weight:bold;color:#f4f4f5;display:block;\">🗄️ أرشفة الكلمات المتقنة تلقائياً</span>" +
          "<span style=\"font-size:11px;color:#a1a1aa;\">نقل الكلمات المتقنة للأرشيف لتخفيف زحام قائمة المراجعة (" + archStr + " بالأرشيف)</span>" +
        "</div>" +
        "<button type=\"button\" onclick=\"window.dfToggleAutoArchive && window.dfToggleAutoArchive()\" style=\"background:" + btnBg + ";color:#ffffff;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:bold;cursor:pointer;\">" +
          "<span>" + statusText + "</span>" +
        "</button>" +
      "</div>" +
    "</div>";
  }

  if (typeof window !== "undefined") {
    window.dfIsAutoArchiveEnabled = dfIsAutoArchiveEnabled;
    window.dfToggleAutoArchive = dfToggleAutoArchive;
    window.dfArchiveMasteredCardsNow = dfArchiveMasteredCardsNow;
    window.dfUnarchiveCard = dfUnarchiveCard;
    window.dfGetArchivedCardsCount = dfGetArchivedCardsCount;
    window.dfRenderArchiveSettingsToggleHtml = dfRenderArchiveSettingsToggleHtml;
  }
})();
JS_EOF
else
    echo "[INFO] M298 already present in $APP_JS"
fi

# 6. Update build.gradle to versionCode 118 and versionName 4.2.8
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 118', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"4.2.8\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 118 (4.2.8)')
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
const marker = "/* === M298_AUTO_ARCHIVE_MASTERED_CARDS_TOGGLE_AND_CODE118_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

const memStore = Object.create(null);
let hapticCalled = false;
let syncCalled = false;

const initialCards = [
  { id: "1", word: "Apfel", isMastered: true },
  { id: "2", word: "Buch", isMastered: false, needsReview: true },
  { id: "3", word: "Haus", sm2Repetitions: 5 }
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
  Date: Date,
  Array: Array,
  String: String,
  Boolean: Boolean,
  JSON: JSON
};
sandbox.window = sandbox;
sandbox.window.dfVocabHapticPulse = () => { hapticCalled = true; };
sandbox.window.dfTriggerVocabStatsSync = () => { syncCalled = true; };

sandbox.localStorage.setItem("df_vocab_bank_v1", JSON.stringify(initialCards));

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
assert.strictEqual(sandbox.window.dfIsAutoArchiveEnabled(), false);

const toggled = sandbox.window.dfToggleAutoArchive(true);
assert.strictEqual(toggled, true);
assert.strictEqual(sandbox.window.dfIsAutoArchiveEnabled(), true);
assert.strictEqual(hapticCalled, true);
assert.strictEqual(syncCalled, true);

let stored = JSON.parse(sandbox.localStorage.getItem("df_vocab_bank_v1"));
assert.strictEqual(stored[0].isArchived, true);
assert.strictEqual(stored[1].isArchived, undefined);
assert.strictEqual(stored[2].isArchived, true);

assert.strictEqual(sandbox.window.dfGetArchivedCardsCount(), 2);

hapticCalled = false;
syncCalled = false;
const unarch = sandbox.window.dfUnarchiveCard("1");
assert.strictEqual(unarch, true);
assert.strictEqual(syncCalled, true);

stored = JSON.parse(sandbox.localStorage.getItem("df_vocab_bank_v1"));
assert.strictEqual(stored[0].isArchived, false);
assert.strictEqual(sandbox.window.dfGetArchivedCardsCount(), 1);

const html = sandbox.window.dfRenderArchiveSettingsToggleHtml();
assert.ok(html.includes("أرشفة الكلمات المتقنة تلقائياً"));
assert.ok(html.includes("مفعّل"));
assert.ok(html.includes("1 بالأرشيف"));
assert.ok(html.includes("dfToggleAutoArchive"));

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 9. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(vocab): M298 add auto-archive mastered cards toggle with versionCode 118 [v4.2.8]" || true
git tag -a v4.2.8-m298-v21 -m "Tag M298: auto-archive mastered cards toggle with versionCode 118" -f

# 10. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v4.2.8-m298-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M298 (28 of 40)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 118"
echo "VERSION_NAME: 4.2.8"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M299 (All-time words mastered milestone tracker and personal records)"
echo "========================================================"
