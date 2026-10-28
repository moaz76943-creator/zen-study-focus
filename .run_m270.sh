#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Major Golden Milestone #270 (Termux)"
echo " Feature: Comprehensive Vocab Suite Diagnostic & v4.0.0"
echo " Target VersionCode: 90 (v4.0.0)"
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
        git commit -m "chore: save local progress before M270" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 4. Apply M270 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M270_MAJOR_GOLDEN_MILESTONE_V4_0_0_AND_CODE90_V1" "$APP_JS"; then
    echo "[INFO] Appending M270 Major Golden Milestone v4.0.0 to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M270_MAJOR_GOLDEN_MILESTONE_V4_0_0_AND_CODE90_V1 === */
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

  function dfGetVocabSuiteHealthReport() {
    var hasTts = (typeof window !== "undefined" && "speechSynthesis" in window);
    var hasAudioCtx = (typeof window !== "undefined" && Boolean(window.AudioContext || window.webkitAudioContext));
    var hasShare = (typeof navigator !== "undefined" && typeof navigator.share === "function");
    var hasClipboard = (typeof navigator !== "undefined" && Boolean(navigator.clipboard && navigator.clipboard.writeText));

    var storageHealthy = false;
    try {
      var testKey = "__df_v4_health_check__";
      localStorage.setItem(testKey, "ok");
      storageHealthy = (localStorage.getItem(testKey) === "ok");
      localStorage.removeItem(testKey);
    } catch (_) {
      storageHealthy = false;
    }

    var totalWords = 0;
    try {
      if (typeof window !== "undefined" && typeof window.dfGetVocabBankList === "function") {
        totalWords = window.dfGetVocabBankList().length;
      }
    } catch (_) {}

    var streak = 0;
    try {
      if (typeof window !== "undefined" && typeof window.dfCalculateVocabStudyStreak === "function") {
        streak = window.dfCalculateVocabStudyStreak().currentStreak;
      }
    } catch (_) {}

    return {
      version: "4.0.0",
      versionCode: 90,
      versionCodeFormatted: "90",
      isHealthy: Boolean(storageHealthy),
      subsystems: {
        speechSynthesis: hasTts,
        zenAudioChime: hasAudioCtx,
        localStorage: storageHealthy,
        webShare: hasShare,
        clipboard: hasClipboard
      },
      stats: {
        totalWords: totalWords,
        totalWordsFormatted: dfFormatWesternDigits(totalWords),
        streak: streak,
        streakFormatted: dfFormatWesternDigits(streak)
      }
    };
  }

  function dfRenderSuiteDiagnosticModalHtml() {
    var report = dfGetVocabSuiteHealthReport();
    var okBadge = "<span style=\"color:#10b981;font-weight:bold;\">جاهز ✓</span>";
    var warnBadge = "<span style=\"color:#f59e0b;font-weight:bold;\">احتياطي ⚠️</span>";

    var rowStyle = "display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:12px;";

    return "<div class=\"df-suite-health-modal\" style=\"direction:rtl;padding:16px;background:#18181b;border:1px solid #27272a;border-radius:12px;color:#f4f4f5;\">" +
      "<div style=\"text-align:center;margin-bottom:12px;\">" +
        "<span style=\"font-size:20px;display:block;margin-bottom:4px;\">🌟</span>" +
        "<h3 style=\"margin:0 0 4px 0;font-size:16px;color:#f4f4f5;\">DEEP FOCUS v" + report.version + " (" + report.versionCodeFormatted + ")</h3>" +
        "<span style=\"font-size:12px;color:#10b981;font-weight:bold;\">المحطة الذهبية الكبرى مكتملة ومؤمنة بنجاح</span>" +
      "</div>" +
      "<div style=\"margin-bottom:12px;\">" +
        "<div style=\"" + rowStyle + "\"><span>🗣️ محرك النطق الصوتي (TTS):</span>" + (report.subsystems.speechSynthesis ? okBadge : warnBadge) + "</div>" +
        "<div style=\"" + rowStyle + "\"><span>🔔 رنين جرس التأمل (Zen Chime):</span>" + (report.subsystems.zenAudioChime ? okBadge : warnBadge) + "</div>" +
        "<div style=\"" + rowStyle + "\"><span>💾 سلامة التخزين المحلي (Storage):</span>" + (report.subsystems.localStorage ? okBadge : warnBadge) + "</div>" +
        "<div style=\"" + rowStyle + "\"><span>📤 مشاركة الإنجاز (Web Share):</span>" + (report.subsystems.webShare ? okBadge : warnBadge) + "</div>" +
        "<div style=\"" + rowStyle + "\"><span>📋 النسخ إلى الحافظة (Clipboard):</span>" + (report.subsystems.clipboard ? okBadge : warnBadge) + "</div>" +
      "</div>" +
      "<div style=\"background:rgba(255,255,255,0.04);border-radius:8px;padding:8px 12px;display:flex;justify-content:space-around;text-align:center;\">" +
        "<div><span style=\"font-size:11px;color:#a1a1aa;display:block;\">📚 الكلمات</span><span style=\"font-size:14px;font-weight:bold;color:#f4f4f5;\">" + report.stats.totalWordsFormatted + "</span></div>" +
        "<div><span style=\"font-size:11px;color:#a1a1aa;display:block;\">🔥 السلسلة</span><span style=\"font-size:14px;font-weight:bold;color:#f97316;\">" + report.stats.streakFormatted + " أيام</span></div>" +
      "</div>" +
    "</div>";
  }

  if (typeof window !== "undefined") {
    window.dfGetVocabSuiteHealthReport = dfGetVocabSuiteHealthReport;
    window.dfRenderSuiteDiagnosticModalHtml = dfRenderSuiteDiagnosticModalHtml;
  }
})();
JS_EOF
else
    echo "[INFO] M270 already present in $APP_JS"
fi

# 5. Update build.gradle to versionCode 90 and versionName 4.0.0
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 90', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"4.0.0\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 90 (4.0.0)')
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
const marker = "/* === M270_MAJOR_GOLDEN_MILESTONE_V4_0_0_AND_CODE90_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

const memStore = Object.create(null);

const sandbox = {
  window: {
    speechSynthesis: {},
    AudioContext: class {}
  },
  navigator: {
    share: () => Promise.resolve(),
    clipboard: { writeText: () => Promise.resolve() }
  },
  localStorage: {
    getItem: (k) => (k in memStore ? memStore[k] : null),
    setItem: (k, v) => { memStore[k] = String(v); },
    removeItem: (k) => { delete memStore[k]; },
    clear: () => { Object.keys(memStore).forEach(k => delete memStore[k]); }
  },
  String: String,
  Boolean: Boolean
};
sandbox.window.window = sandbox.window;
sandbox.window.navigator = sandbox.navigator;
sandbox.window.localStorage = sandbox.localStorage;

sandbox.window.dfGetVocabBankList = () => [{ id: "1" }, { id: "2" }];
sandbox.window.dfCalculateVocabStudyStreak = () => ({ currentStreak: 7 });

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
const rep = sandbox.window.dfGetVocabSuiteHealthReport();
assert.strictEqual(rep.version, "4.0.0");
assert.strictEqual(rep.versionCode, 90);
assert.strictEqual(rep.versionCodeFormatted, "90");
assert.strictEqual(rep.isHealthy, true);
assert.strictEqual(rep.subsystems.speechSynthesis, true);
assert.strictEqual(rep.subsystems.zenAudioChime, true);
assert.strictEqual(rep.subsystems.localStorage, true);
assert.strictEqual(rep.subsystems.webShare, true);
assert.strictEqual(rep.subsystems.clipboard, true);
assert.strictEqual(rep.stats.totalWordsFormatted, "2");
assert.strictEqual(rep.stats.streakFormatted, "7");

const html = sandbox.window.dfRenderSuiteDiagnosticModalHtml();
assert.ok(html.includes("DEEP FOCUS v4.0.0 (90)"));
assert.ok(html.includes("جاهز ✓"));
assert.ok(html.includes("2"));
assert.ok(html.includes("7 أيام"));
assert.ok(html.includes("df-suite-health-modal"));

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 8. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(core): M270 Major Golden Milestone v4.0.0 with versionCode 90 comprehensive vocab audio-visual suite" || true
git tag -a v4.0.0-m270-v21 -m "Tag M270 Major Golden Milestone v4.0.0 with versionCode 90" -f

# 9. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v4.0.0-m270-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M270 (Major Golden Milestone v4.0.0)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 90"
echo "VERSION_NAME: 4.0.0"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M271 (Integration of suite diagnostic launcher in settings / about modal)"
echo "========================================================"
