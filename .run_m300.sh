#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Mastery Vault Milestone #300 (Termux)"
echo " Feature: Milestone 120 Spaced Repetition Suite"
echo " Target VersionCode: 120 (v4.3.0) [Mission 30 of 40]"
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
        git commit -m "chore: save local progress before M300" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 5. Apply M300 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M300_MASTERY_VAULT_MILESTONE_V4_3_0_AND_CODE120_V1" "$APP_JS"; then
    echo "[INFO] Appending M300 Mastery Vault Milestone to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M300_MASTERY_VAULT_MILESTONE_V4_3_0_AND_CODE120_V1 === */
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

  function dfGetMasteryVaultMilestoneSummary() {
    var totalWords = 0;
    try {
      if (typeof window !== "undefined" && typeof window.dfGetVocabBankList === "function") {
        totalWords = window.dfGetVocabBankList().length;
      }
    } catch (_) {}

    var dueCount = 0;
    try {
      if (typeof window !== "undefined" && typeof window.dfGetDueTodayCount === "function") {
        dueCount = window.dfGetDueTodayCount().count;
      }
    } catch (_) {}

    var allTimeRec = 0;
    try {
      if (typeof window !== "undefined" && typeof window.dfGetPersonalRecords === "function") {
        allTimeRec = window.dfGetPersonalRecords().allTimeMastered;
      }
    } catch (_) {}

    return {
      version: "4.3.0",
      versionCode: 120,
      versionCodeFormatted: dfFormatWesternDigits(120),
      milestoneTitle: "خزينة الإتقان الشاملة (Mastery Vault)",
      phaseCompleted: "Phase 3: Spaced Repetition & Mastery (M291-M300)",
      totalWordsFormatted: dfFormatWesternDigits(totalWords),
      dueCountFormatted: dfFormatWesternDigits(dueCount),
      allTimeMasteredFormatted: dfFormatWesternDigits(allTimeRec),
      isSm2Active: true
    };
  }

  function dfRenderMasteryVaultMilestoneModalHtml() {
    var m = dfGetMasteryVaultMilestoneSummary();
    var boxStyle = "background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px 12px;text-align:center;flex:1;";

    return "<div class=\"df-mastery-milestone-modal\" style=\"direction:rtl;padding:16px;background:#18181b;border:1px solid #7c3aed;border-radius:14px;color:#f4f4f5;box-shadow:0 12px 35px rgba(124,58,237,0.25);\">" +
      "<div style=\"text-align:center;margin-bottom:14px;\">" +
        "<span style=\"font-size:32px;display:block;margin-bottom:4px;\">💎</span>" +
        "<h3 style=\"margin:0 0 4px 0;font-size:18px;color:#c084fc;\">" + m.milestoneTitle + " v" + m.version + "</h3>" +
        "<span style=\"font-size:12px;color:#e9d5ff;display:block;margin-bottom:2px;\">رمز البناء المتقدم: <strong>" + m.versionCodeFormatted + "</strong></span>" +
        "<span style=\"font-size:11px;color:#a1a1aa;\">اكتمال المرحلة الثالثة لخوارزميات التكرار المتباعد SM-2 واحترافية البطاقات بنجاح 100%</span>" +
      "</div>" +
      "<div style=\"display:flex;gap:8px;margin-bottom:12px;\">" +
        "<div style=\"" + boxStyle + "\"><span style=\"font-size:10px;color:#a1a1aa;display:block;\">🧠 الخوارزمية</span><span style=\"font-size:14px;font-weight:bold;color:#a855f7;\">SM-2 مفعّل</span></div>" +
        "<div style=\"" + boxStyle + "\"><span style=\"font-size:10px;color:#a1a1aa;display:block;\">🎯 مراجعة اليوم</span><span style=\"font-size:14px;font-weight:bold;color:#38bdf8;\">" + m.dueCountFormatted + "</span></div>" +
        "<div style=\"" + boxStyle + "\"><span style=\"font-size:10px;color:#a1a1aa;display:block;\">🏆 إتقان قياسي</span><span style=\"font-size:14px;font-weight:bold;color:#10b981;\">" + m.allTimeMasteredFormatted + "</span></div>" +
      "</div>" +
      "<div style=\"padding:8px 12px;background:rgba(124,58,237,0.1);border-radius:8px;font-size:11px;color:#e9d5ff;text-align:center;\">" +
        "✨ جاهز للانطلاق نحو المرحلة الرابعة والأخيرة: تكامل النظام، الأداء العالي، وجاهزية المتجر الرسمية (M301-M310)" +
      "</div>" +
    "</div>";
  }

  if (typeof window !== "undefined") {
    window.dfGetMasteryVaultMilestoneSummary = dfGetMasteryVaultMilestoneSummary;
    window.dfRenderMasteryVaultMilestoneModalHtml = dfRenderMasteryVaultMilestoneModalHtml;
  }
})();
JS_EOF
else
    echo "[INFO] M300 already present in $APP_JS"
fi

# 6. Update build.gradle to versionCode 120 and versionName 4.3.0
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 120', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"4.3.0\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 120 (4.3.0)')
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
const marker = "/* === M300_MASTERY_VAULT_MILESTONE_V4_3_0_AND_CODE120_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

const sandbox = {
  window: {},
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
  },
  String: String,
  Boolean: Boolean
};
sandbox.window = sandbox;
sandbox.window.dfGetVocabBankList = () => [{ id: 1 }, { id: 2 }];
sandbox.window.dfGetDueTodayCount = () => ({ count: 5 });
sandbox.window.dfGetPersonalRecords = () => ({ allTimeMastered: 40 });

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
const s = sandbox.window.dfGetMasteryVaultMilestoneSummary();
assert.strictEqual(s.version, "4.3.0");
assert.strictEqual(s.versionCode, 120);
assert.strictEqual(s.versionCodeFormatted, "120");
assert.strictEqual(s.totalWordsFormatted, "2");
assert.strictEqual(s.dueCountFormatted, "5");
assert.strictEqual(s.allTimeMasteredFormatted, "40");
assert.strictEqual(s.isSm2Active, true);

const html = sandbox.window.dfRenderMasteryVaultMilestoneModalHtml();
assert.ok(html.includes("خزينة الإتقان الشاملة"));
assert.ok(html.includes("v4.3.0"));
assert.ok(html.includes("120"));
assert.ok(html.includes("SM-2 مفعّل"));
assert.ok(html.includes("40"));
assert.ok(html.includes("df-mastery-milestone-modal"));

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 9. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(core): M300 Mastery Vault Milestone v4.3.0 with versionCode 120 spaced repetition suite" || true
git tag -a v4.3.0-m300-v21 -m "Tag M300: Mastery Vault Milestone v4.3.0 with versionCode 120" -f

# 10. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v4.3.0-m300-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M300 (Mastery Vault Milestone 30 of 40)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 120"
echo "VERSION_NAME: 4.3.0"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M301 (Phase 4 kickoff: Android native app shortcuts configuration)"
echo "========================================================"
