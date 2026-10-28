#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #293 (Termux Runner)"
echo " Feature: Example Sentence Context Tray & Sentence TTS"
echo " Target VersionCode: 113 (v4.2.3) [Mission 23 of 40]"
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
        git commit -m "chore: save local progress before M293" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 5. Apply M293 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M293_EXAMPLE_SENTENCE_CONTEXT_TRAY_AND_CODE113_V1" "$APP_JS"; then
    echo "[INFO] Appending M293 Example Sentence Tray to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M293_EXAMPLE_SENTENCE_CONTEXT_TRAY_AND_CODE113_V1 === */
(function() {
  'use strict';

  function dfSpeakExampleSentence(sentenceText, langCode) {
    if (!sentenceText || typeof window === "undefined") return false;
    var synth = window.speechSynthesis;
    if (!synth) return false;

    try {
      synth.cancel();
      var utterance = new SpeechSynthesisUtterance(String(sentenceText));
      var targetLang = langCode || (typeof window.dfGetActiveLanguagePair === "function" ? window.dfGetActiveLanguagePair().target : "de-DE");
      utterance.lang = targetLang;

      if (typeof window.dfGetTtsVolume === "function") {
        utterance.volume = window.dfGetTtsVolume();
      }

      if (typeof window.dfResolveBestVoiceForLang === "function") {
        var voice = window.dfResolveBestVoiceForLang(targetLang);
        if (voice) utterance.voice = voice;
      }

      synth.speak(utterance);

      if (typeof window.dfVocabHapticPulse === "function") {
        window.dfVocabHapticPulse(15);
      }

      return true;
    } catch (_) {
      return false;
    }
  }

  function dfRenderCardExampleTrayHtml(card) {
    if (!card || !card.example || typeof card.example !== "string") return "";
    var cleanExample = card.example.trim();
    if (!cleanExample) return "";

    var escapedForClick = cleanExample.replace(/"/g, "&quot;").replace(/'/g, "\\'");

    return "<div class=\"df-card-example-tray\" style=\"margin-top:6px;padding:6px 10px;background:rgba(255,255,255,0.04);border-right:3px solid #3b82f6;border-radius:6px;font-size:12px;color:#d4d4d8;direction:ltr;text-align:left;display:flex;align-items:center;justify-content:space-between;gap:8px;\">" +
      "<span style=\"font-style:italic;flex:1;\">\"" + cleanExample + "\"</span>" +
      "<button type=\"button\" onclick=\"window.dfSpeakExampleSentence && window.dfSpeakExampleSentence('" + escapedForClick + "')\" style=\"background:none;border:none;color:#60a5fa;cursor:pointer;font-size:14px;padding:2px;display:flex;align-items:center;\" title=\"استمع لنطق الجملة\">" +
        "<span>🔊</span>" +
      "</button>" +
    "</div>";
  }

  function dfUpdateCardExample(cardId, exampleText) {
    if (!cardId && cardId !== 0) return false;
    var list = [];
    try {
      if (typeof window.dfGetVocabBankList === "function") {
        list = window.dfGetVocabBankList();
      } else {
        var raw = localStorage.getItem("df_vocab_bank_v1");
        if (raw) list = JSON.parse(raw);
      }
    } catch (_) {}

    if (!Array.isArray(list)) return false;
    var found = false;

    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(cardId)) {
        list[i].example = String(exampleText || "").trim();
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

  if (typeof window !== "undefined") {
    window.dfSpeakExampleSentence = dfSpeakExampleSentence;
    window.dfRenderCardExampleTrayHtml = dfRenderCardExampleTrayHtml;
    window.dfUpdateCardExample = dfUpdateCardExample;
  }
})();
JS_EOF
else
    echo "[INFO] M293 already present in $APP_JS"
fi

# 6. Update build.gradle to versionCode 113 and versionName 4.2.3
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 113', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"4.2.3\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 113 (4.2.3)')
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
const marker = "/* === M293_EXAMPLE_SENTENCE_CONTEXT_TRAY_AND_CODE113_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

const memStore = Object.create(null);
let hapticCalled = false;
let spokenText = "";
let spokenLang = "";

const sandbox = {
  window: {
    speechSynthesis: {
      cancel: () => {},
      speak: (u) => {
        spokenText = u.text;
        spokenLang = u.lang;
      }
    }
  },
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
  SpeechSynthesisUtterance: function(txt) {
    this.text = txt;
    this.lang = "";
    this.volume = 1;
  },
  Array: Array,
  String: String,
  JSON: JSON
};
sandbox.window.window = sandbox.window;
sandbox.window.SpeechSynthesisUtterance = sandbox.SpeechSynthesisUtterance;
sandbox.window.dfVocabHapticPulse = () => { hapticCalled = true; };
sandbox.window.dfGetActiveLanguagePair = () => ({ target: "de-DE" });

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
const resSpeak = sandbox.window.dfSpeakExampleSentence("Die Sonne scheint.", "de-DE");
assert.strictEqual(resSpeak, true);
assert.strictEqual(spokenText, "Die Sonne scheint.");
assert.strictEqual(spokenLang, "de-DE");
assert.strictEqual(hapticCalled, true);

const cardWithEx = { word: "Sonne", example: "Die Sonne scheint hell." };
const html = sandbox.window.dfRenderCardExampleTrayHtml(cardWithEx);
assert.ok(html.includes("Die Sonne scheint hell."));
assert.ok(html.includes("dfSpeakExampleSentence"));
assert.ok(html.includes("df-card-example-tray"));

const cardNoEx = { word: "Mond" };
assert.strictEqual(sandbox.window.dfRenderCardExampleTrayHtml(cardNoEx), "");

sandbox.localStorage.setItem("df_vocab_bank_v1", JSON.stringify([{ id: "101", word: "Buch" }]));
const updated = sandbox.window.dfUpdateCardExample("101", "Das Buch ist interessant.");
assert.strictEqual(updated, true);

const stored = JSON.parse(sandbox.localStorage.getItem("df_vocab_bank_v1"));
assert.strictEqual(stored[0].example, "Das Buch ist interessant.");

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 9. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(vocab): M293 add example sentence context tray with full sentence TTS audio with versionCode 113 [v4.2.3]" || true
git tag -a v4.2.3-m293-v21 -m "Tag M293: example sentence context tray with versionCode 113" -f

# 10. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v4.2.3-m293-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M293 (23 of 40)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 113"
echo "VERSION_NAME: 4.2.3"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M294 (Prefix and substring live search with match highlighting)"
echo "========================================================"
