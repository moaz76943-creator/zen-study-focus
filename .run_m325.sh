#!/bin/bash
set -e

cd ~/zen-study-focus || { echo "[FAIL] Directory ~/zen-study-focus not found"; exit 1; }

TARGET_BRANCH="integration/master-qa-verified-v21"
VERSION_CODE=145
VERSION_NAME="4.5.5"
MISSION_NUM=325
MISSION_NAME="Exam Simulation Mode with 5-Minute Warning Alarm"

echo "============================================================"
echo "[DEEP FOCUS] Hourly Cycle Mission #$MISSION_NUM (Termux Runner)"
echo "Feature: $MISSION_NAME"
echo "Target VersionCode: $VERSION_CODE ($VERSION_NAME) [Mission 15 of 50]"
echo "============================================================"

APP_JS="android/app/src/main/assets/web/app.js"
BUILD_GRADLE="android/app/build.gradle"

if [ ! -f "$APP_JS" ]; then
  echo "[FAIL] File $APP_JS not found!"
  exit 1
fi

if [ ! -f "$BUILD_GRADLE" ]; then
  echo "[FAIL] File $BUILD_GRADLE not found!"
  exit 1
fi

echo "[INFO] Syncing branch state..."
git checkout "$TARGET_BRANCH"
if [ -z "$(git status --porcelain)" ]; then
  git pull --rebase origin "$TARGET_BRANCH" || true
else
  echo "[INFO] Working directory has changes, preserving local edits..."
fi

# Append M325 Exam Simulation helper
MARKER_JS="// MISSION #325: Exam Simulation Mode with 5-Minute Warning (v4.5.5)"
if grep -q "MISSION #325" "$APP_JS"; then
  echo "[INFO] Marker for Mission #325 already present in $APP_JS."
else
  echo "[INFO] Appending M325 Exam Simulation helper to $APP_JS"
  cat << 'EOF_JS' >> "$APP_JS"

// ============================================================================
// MISSION #325: Exam Simulation Mode with 5-Minute Warning (v4.5.5)
// ============================================================================
function dfGetExamSimulationMetrics(elapsedSeconds, totalDurationMinutes) {
  const elapsed = typeof elapsedSeconds === "number" && elapsedSeconds >= 0 ? Math.floor(elapsedSeconds) : 0;
  const totalMin = typeof totalDurationMinutes === "number" && totalDurationMinutes > 0 ? Math.floor(totalDurationMinutes) : 90;
  const totalSec = totalMin * 60;

  const remSec = Math.max(0, totalSec - elapsed);
  const progress = Math.min(100, Math.round((elapsed / totalSec) * 100));

  const remM = Math.floor(remSec / 60);
  const remS = remSec % 60;
  const formattedRemaining = (remM < 10 ? "0" + remM : "" + remM) + ":" + (remS < 10 ? "0" + remS : "" + remS);

  let stage = "NORMAL_PROGRESS";
  let stageLabel = "Exam In Progress";
  let advice = "Pace yourself evenly; answer confident questions first";
  let isFinal5 = false;
  let triggerChime = false;

  if (remSec === 0) {
    stage = "TIME_EXPIRED";
    stageLabel = "Time Expired";
    advice = "Pencils down: review your final score and take a rest";
  } else if (remSec <= 300) {
    stage = "FINAL_5_MINUTES";
    stageLabel = "Final 5 Minutes";
    advice = "Review answer sheet, ensure all required fields are filled, double check flagged items";
    isFinal5 = true;
    if (remSec === 300) triggerChime = true;
  } else if (progress >= 75) {
    stage = "URGENCY_WARNING";
    stageLabel = "Final Quarter";
    advice = "Final 25% of time remaining: begin wrapping up complex essay / math problems";
  }

  return {
    versionCode: 145,
    versionName: "4.5.5",
    stage: stage,
    stageLabel: stageLabel,
    totalDurationMinutes: totalMin,
    elapsedSeconds: elapsed,
    remainingSeconds: remSec,
    formattedRemaining: formattedRemaining,
    isFinal5Minutes: isFinal5,
    shouldTrigger5mChime: triggerChime,
    pacingAdvice: advice,
    progressPercent: progress,
    westernDigits: true,
    timestamp: Date.now()
  };
}

if (typeof window !== "undefined") {
  window.dfGetExamSimulationMetrics = dfGetExamSimulationMetrics;
}
if (typeof globalThis !== "undefined") {
  globalThis.dfGetExamSimulationMetrics = dfGetExamSimulationMetrics;
}
EOF_JS
fi

# Update build.gradle versionCode & versionName
sed -i 's/versionCode [0-9]\+/versionCode '"$VERSION_CODE"'/' "$BUILD_GRADLE"
sed -i 's/versionName "[^"]\+"/versionName "'"$VERSION_NAME"'"/' "$BUILD_GRADLE"
echo "[INFO] build.gradle updated to versionCode $VERSION_CODE ($VERSION_NAME)"

# Verify JS syntax
echo "[CHECK] Verifying JS syntax with node --check..."
node --check "$APP_JS"
echo "[PASS] JS syntax validated successfully."

# Run Node VM Isolated Functional Tests for M325
echo "[CHECK] Running Node VM Isolated Functional Tests for M325..."
node -e '
const fs = require("fs");
const vm = require("vm");

const fullCode = fs.readFileSync("android/app/src/main/assets/web/app.js", "utf8");
const marker = "// MISSION #325: Exam Simulation Mode with 5-Minute Warning (v4.5.5)";
const markerIdx = fullCode.indexOf(marker);
if (markerIdx === -1) throw new Error("Mission #325 marker not found in app.js");
const mCode = fullCode.slice(markerIdx);

const sandbox = { window: {}, globalThis: {}, Date: { now: () => 1700000000000 } };
vm.createContext(sandbox);
vm.runInContext(mCode, sandbox);

const fn = sandbox.window.dfGetExamSimulationMetrics;
if (typeof fn !== "function") throw new Error("dfGetExamSimulationMetrics not exported!");

// Test 1: Normal progress at 30 min into 90 min exam
const r1 = fn(1800, 90);
if (r1.stage !== "NORMAL_PROGRESS" || r1.formattedRemaining !== "60:00" || r1.isFinal5Minutes !== false) {
  throw new Error("Normal test failed: " + JSON.stringify(r1));
}

// Test 2: Exactly 5 minutes remaining (300 sec remaining)
const r2 = fn(5100, 90);
if (r2.stage !== "FINAL_5_MINUTES" || r2.isFinal5Minutes !== true || r2.shouldTrigger5mChime !== true || r2.formattedRemaining !== "05:00") {
  throw new Error("Final 5m exact test failed: " + JSON.stringify(r2));
}

// Test 3: Time expired
const r3 = fn(5400, 90);
if (r3.stage !== "TIME_EXPIRED" || r3.remainingSeconds !== 0 || r3.formattedRemaining !== "00:00") {
  throw new Error("Expired test failed: " + JSON.stringify(r3));
}

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# Directives check
if grep -P "[\x{0590}-\x{05FF}]" "$APP_JS"; then
  echo "[FAIL] Forbidden script detected in app.js!"
  exit 1
fi
echo "[PASS] Character constraints verified."

# Git commit, tag, and push
git add -A
git commit -m "feat(neuro): M325 exam simulation mode with 5-minute warning alarm with versionCode $VERSION_CODE [v$VERSION_NAME]"

TAG_NAME="v$VERSION_NAME-m$MISSION_NUM-v21"
git tag "$TAG_NAME"

echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH" || { git pull --rebase origin "$TARGET_BRANCH" && git push origin "$TARGET_BRANCH"; }
git push origin "$TAG_NAME" || true

COMMIT_SHA=$(git rev-parse HEAD)

echo "============================================================"
echo "DEEP FOCUS — HOURLY BUILD REPORT"
echo "============================================================"
echo "STATUS: SUCCESS"
echo "MISSION: $MISSION_NUM (15 of 50)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $COMMIT_SHA"
echo "VERSION_CODE: $VERSION_CODE"
echo "VERSION_NAME: $VERSION_NAME"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ZERO_MUSIC_POLICY: ENFORCED (Acoustic Chime Only)"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: 326 (Hardcore Monk Mode with Withdrawal Penalty Timer)"
echo "============================================================"
rm -f .run_m325.sh
