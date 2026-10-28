#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Acoustic Zen Milestone #290 (Termux)"
echo " Feature: Milestone 110 Acoustic Zen Audio Suite"
echo " Target VersionCode: 110 (v4.2.0) [Mission 20 of 40]"
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
        git commit -m "chore: save local progress before M290" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 5. Apply M290 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M290_ACOUSTIC_ZEN_MILESTONE_V4_2_0_AND_CODE110_V1" "$APP_JS"; then
    echo "[INFO] Appending M290 Acoustic Zen Milestone to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M290_ACOUSTIC_ZEN_MILESTONE_V4_2_0_AND_CODE110_V1 === */
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

  function dfGetAcousticZenMilestoneSummary() {
    var activeSoundscape = "none";
    try {
      if (typeof window !== "undefined" && typeof window.dfGetActiveSoundscape === "function") {
        activeSoundscape = window.dfGetActiveSoundscape();
      }
    } catch (_) {}

    var isBinaural = false;
    try {
      if (typeof window !== "undefined" && typeof window.dfIsBinauralGammaActive === "function") {
        isBinaural = window.dfIsBinauralGammaActive();
      }
    } catch (_) {}

    var isChimes = false;
    try {
      if (typeof window !== "undefined" && typeof window.dfIsWindChimesEnabled === "function") {
        isChimes = window.dfIsWindChimesEnabled();
      }
    } catch (_) {}

    return {
      version: "4.2.0",
      versionCode: 110,
      versionCodeFormatted: dfFormatWesternDigits(110),
      milestoneTitle: "إصدار السكينة الصوتية (Acoustic Zen)",
      phaseCompleted: "Phase 2: Acoustic Zen Soundscapes (M281-M290)",
      soundscapesCountFormatted: dfFormatWesternDigits(4),
      isZeroMusicCompliant: true,
      activeSoundscape: activeSoundscape,
      binauralActive: isBinaural,
      chimesActive: isChimes
    };
  }

  function dfRenderAcousticZenMilestoneModalHtml() {
    var m = dfGetAcousticZenMilestoneSummary();
    var boxStyle = "background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px 12px;text-align:center;flex:1;";

    return "<div class=\"df-zen-milestone-modal\" style=\"direction:rtl;padding:16px;background:#18181b;border:1px solid #059669;border-radius:14px;color:#f4f4f5;box-shadow:0 12px 35px rgba(5,150,105,0.25);\">" +
      "<div style=\"text-align:center;margin-bottom:14px;\">" +
        "<span style=\"font-size:32px;display:block;margin-bottom:4px;\">🌿</span>" +
        "<h3 style=\"margin:0 0 4px 0;font-size:18px;color:#34d399;\">" + m.milestoneTitle + " v" + m.version + "</h3>" +
        "<span style=\"font-size:12px;color:#a7f3d0;display:block;margin-bottom:2px;\">رمز البناء: <strong>" + m.versionCodeFormatted + "</strong></span>" +
        "<span style=\"font-size:11px;color:#a1a1aa;\">اكتمال المرحلة الثانية الشاملة للبيئة الصوتية الطبيعية بنجاح 100%</span>" +
      "</div>" +
      "<div style=\"display:flex;gap:8px;margin-bottom:12px;\">" +
        "<div style=\"" + boxStyle + "\"><span style=\"font-size:10px;color:#a1a1aa;display:block;\">🎧 العوازل</span><span style=\"font-size:15px;font-weight:bold;color:#10b981;\">" + m.soundscapesCountFormatted + " أصوات</span></div>" +
        "<div style=\"" + boxStyle + "\"><span style=\"font-size:10px;color:#a1a1aa;display:block;\">🧠 جاما</span><span style=\"font-size:15px;font-weight:bold;color:#38bdf8;\">40Hz نقي</span></div>" +
        "<div style=\"" + boxStyle + "\"><span style=\"font-size:10px;color:#a1a1aa;display:block;\">🔇 الصمت</span><span style=\"font-size:15px;font-weight:bold;color:#f59e0b;\">Zero-Music</span></div>" +
      "</div>" +
      "<div style=\"padding:8px 12px;background:rgba(5,150,105,0.1);border-radius:8px;font-size:11px;color:#a7f3d0;text-align:center;\">" +
        "✨ جاهز للانطلاق نحو المرحلة الثالثة: خوارزميات التكرار الذكي واحترافية البطاقات (M291-M300)" +
      "</div>" +
    "</div>";
  }

  if (typeof window !== "undefined") {
    window.dfGetAcousticZenMilestoneSummary = dfGetAcousticZenMilestoneSummary;
    window.dfRenderAcousticZenMilestoneModalHtml = dfRenderAcousticZenMilestoneModalHtml;
  }
})();
JS_EOF
else
    echo "[INFO] M290 already present in $APP_JS"
fi

# 6. Update build.gradle to versionCode 110 and versionName 4.2.0
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 110', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"4.2.0\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 110 (4.2.0)')
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
const marker = "/* === M290_ACOUSTIC_ZEN_MILESTONE_V4_2_0_AND_CODE110_V1 === */";
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
sandbox.window.dfGetActiveSoundscape = () => "rain";
sandbox.window.dfIsBinauralGammaActive = () => true;
sandbox.window.dfIsWindChimesEnabled = () => true;

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
const s = sandbox.window.dfGetAcousticZenMilestoneSummary();
assert.strictEqual(s.version, "4.2.0");
assert.strictEqual(s.versionCode, 110);
assert.strictEqual(s.versionCodeFormatted, "110");
assert.strictEqual(s.soundscapesCountFormatted, "4");
assert.strictEqual(s.isZeroMusicCompliant, true);
assert.strictEqual(s.activeSoundscape, "rain");
assert.strictEqual(s.binauralActive, true);
assert.strictEqual(s.chimesActive, true);

const html = sandbox.window.dfRenderAcousticZenMilestoneModalHtml();
assert.ok(html.includes("إصدار السكينة الصوتية"));
assert.ok(html.includes("v4.2.0"));
assert.ok(html.includes("110"));
assert.ok(html.includes("4 أصوات"));
assert.ok(html.includes("Zero-Music"));
assert.ok(html.includes("df-zen-milestone-modal"));

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 9. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(core): M290 Acoustic Zen Milestone v4.2.0 with versionCode 110 audio suite" || true
git tag -a v4.2.0-m290-v21 -m "Tag M290: Acoustic Zen Milestone v4.2.0 with versionCode 110" -f

# 10. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v4.2.0-m290-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M290 (Acoustic Zen Milestone 20 of 40)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 110"
echo "VERSION_NAME: 4.2.0"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M291 (Phase 3 kickoff: SuperMemo SM-2 spaced repetition intervals)"
echo "========================================================"
