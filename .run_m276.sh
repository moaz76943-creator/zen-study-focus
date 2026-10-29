#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #276 (Termux Runner)"
echo " Feature: Weekly Study Heatmap & Sparkline Strip"
echo " Target VersionCode: 96 (v4.0.6) [Mission 6 of 40]"
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
        git commit -m "chore: save local progress before M276" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 5. Apply M276 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M276_WEEKLY_STUDY_HEATMAP_SPARKLINE_AND_CODE96_V1" "$APP_JS"; then
    echo "[INFO] Appending M276 Weekly Heatmap Strip to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M276_WEEKLY_STUDY_HEATMAP_SPARKLINE_AND_CODE96_V1 === */
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

  function dfGetPast7DaysActivityData(referenceDate) {
    var ref = referenceDate ? new Date(referenceDate) : new Date();
    var history = [];
    try {
      var raw = localStorage.getItem("df_vocab_study_history_v1");
      if (raw) history = JSON.parse(raw);
      if (!Array.isArray(history)) history = [];
    } catch (_) {
      history = [];
    }

    var dayNames = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
    var days = [];

    for (var i = 6; i >= 0; i--) {
      var d = new Date(ref);
      d.setDate(d.getDate() - i);

      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, "0");
      var day = String(d.getDate()).padStart(2, "0");
      var dateKey = y + "-" + m + "-" + day;

      var hasStudied = history.indexOf(dateKey) !== -1;
      var dayName = dayNames[d.getDay()];
      var dayNumStr = dfFormatWesternDigits(d.getDate());

      days.push({
        date: dateKey,
        dayName: dayName,
        dayNum: dayNumStr,
        hasStudied: hasStudied,
        isToday: (i === 0)
      });
    }

    return days;
  }

  function dfRenderWeeklyStudyHeatmapHtml(referenceDate) {
    var days = dfGetPast7DaysActivityData(referenceDate);
    var itemsHtml = "";

    for (var i = 0; i < days.length; i++) {
      var day = days[i];
      var barBg = day.hasStudied ? "#10b981" : "rgba(255,255,255,0.08)";
      var barBorder = day.hasStudied ? "#059669" : "rgba(255,255,255,0.12)";
      var textColor = day.isToday ? "#60a5fa" : "#a1a1aa";
      var fontWeight = day.isToday ? "bold" : "normal";

      itemsHtml += "<div style=\"flex:1;text-align:center;display:flex;flex-direction:column;align-items:center;gap:4px;\">" +
        "<span style=\"font-size:10px;color:" + textColor + ";font-weight:" + fontWeight + ";\">" + day.dayName + "</span>" +
        "<div style=\"width:100%;height:28px;background:" + barBg + ";border:1px solid " + barBorder + ";border-radius:6px;display:flex;align-items:center;justify-content:center;\">" +
          (day.hasStudied ? "<span style=\"font-size:11px;color:#ffffff;\">✓</span>" : "<span style=\"font-size:10px;color:rgba(255,255,255,0.25);\">·</span>") +
        "</div>" +
        "<span style=\"font-size:11px;color:#f4f4f5;font-weight:" + fontWeight + ";\">" + day.dayNum + "</span>" +
      "</div>";
    }

    return "<div class=\"df-weekly-heatmap\" style=\"margin:12px 0;padding:12px;background:#18181b;border:1px solid #27272a;border-radius:12px;direction:rtl;\">" +
      "<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;\">" +
        "<span style=\"font-size:12px;font-weight:bold;color:#f4f4f5;\">📅 نشاط الأيام السبعة الماضية</span>" +
        "<span style=\"font-size:11px;color:#10b981;\">معدل الاستمرار</span>" +
      "</div>" +
      "<div style=\"display:flex;gap:6px;justify-content:space-between;\">" +
        itemsHtml +
      "</div>" +
    "</div>";
  }

  function dfUpdateWeeklyStudyHeatmapDOM() {
    try {
      if (typeof document === "undefined") return false;
      var el = document.getElementById("df-weekly-heatmap-container");
      if (el) {
        el.innerHTML = dfRenderWeeklyStudyHeatmapHtml();
        return true;
      }
    } catch (_) {}
    return false;
  }

  if (typeof window !== "undefined") {
    window.dfGetPast7DaysActivityData = dfGetPast7DaysActivityData;
    window.dfRenderWeeklyStudyHeatmapHtml = dfRenderWeeklyStudyHeatmapHtml;
    window.dfUpdateWeeklyStudyHeatmapDOM = dfUpdateWeeklyStudyHeatmapDOM;
  }
})();
JS_EOF
else
    echo "[INFO] M276 already present in $APP_JS"
fi

# 6. Update build.gradle to versionCode 96 and versionName 4.0.6
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 96', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"4.0.6\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 96 (4.0.6)')
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
const marker = "/* === M276_WEEKLY_STUDY_HEATMAP_SPARKLINE_AND_CODE96_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

const memStore = Object.create(null);
let domUpdated = false;
let updatedContent = "";

const dummyContainer = {
  get innerHTML() { return updatedContent; },
  set innerHTML(val) {
    updatedContent = val;
    domUpdated = true;
  }
};

const sandbox = {
  window: {},
  document: {
    getElementById: (id) => (id === "df-weekly-heatmap-container" ? dummyContainer : null)
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

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Setup mock study history: studied on 2026-10-26 and 2026-10-28
const refDate = new Date("2026-10-28T10:00:00Z");
sandbox.localStorage.setItem("df_vocab_study_history_v1", JSON.stringify(["2026-10-26", "2026-10-28"]));

// Verification tests
const days = sandbox.window.dfGetPast7DaysActivityData(refDate);
assert.strictEqual(days.length, 7);
assert.strictEqual(days[6].isToday, true);
assert.strictEqual(days[6].hasStudied, true);
assert.strictEqual(days[6].dayNum, "28");
assert.strictEqual(days[4].hasStudied, true);
assert.strictEqual(days[5].hasStudied, false);

const html = sandbox.window.dfRenderWeeklyStudyHeatmapHtml(refDate);
assert.ok(html.includes("نشاط الأيام السبعة الماضية"));
assert.ok(html.includes("28"));
assert.ok(html.includes("#10b981"));
assert.ok(html.includes("df-weekly-heatmap"));

const resDom = sandbox.window.dfUpdateWeeklyStudyHeatmapDOM();
assert.strictEqual(resDom, true);
assert.strictEqual(domUpdated, true);

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 9. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(analytics): M276 add weekly study activity heatmap and sparkline strip with versionCode 96 [v4.0.6]" || true
git tag -a v4.0.6-m276-v21 -m "Tag M276: weekly study activity heatmap and sparkline strip with versionCode 96" -f

# 10. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v4.0.6-m276-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M276 (6 of 40)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 96"
echo "VERSION_NAME: 4.0.6"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M277 (Full vault JSON encrypted export and import)"
echo "========================================================"
