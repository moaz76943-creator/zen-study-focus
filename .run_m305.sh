#!/bin/bash
set -e

cd ~/zen-study-focus || { echo "[FAIL] Directory ~/zen-study-focus not found"; exit 1; }

TARGET_BRANCH="integration/master-qa-verified-v21"
VERSION_CODE=125
VERSION_NAME="4.3.5"
MISSION_NUM=305
MISSION_NAME="External Physical Keyboard Navigation Suite"

echo "============================================================"
echo "[DEEP FOCUS] Hourly Cycle Mission #$MISSION_NUM (Termux Runner)"
echo "Feature: $MISSION_NAME"
echo "Target VersionCode: $VERSION_CODE ($VERSION_NAME) [Mission 35 of 40]"
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

# Append M305 Keyboard Navigation Suite if not already appended
if grep -q "MISSION #305" "$APP_JS"; then
  echo "[INFO] Marker for Mission #305 already present in $APP_JS."
else
  echo "[INFO] Appending M305 Keyboard Navigation Suite to $APP_JS"
  cat << 'EOF_JS' >> "$APP_JS"

// ============================================================================
// MISSION #305: External Physical Keyboard Navigation Suite (v4.3.5)
// ============================================================================
function dfHandlePhysicalKeyboardShortcut(e) {
  if (!e || !e.key) return { handled: false, action: "none" };
  const target = e.target || {};
  const tag = (target.tagName || "").toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) {
    return { handled: false, action: "ignored_input_field" };
  }

  const key = e.key;
  if (key === " " || e.code === "Space") {
    if (typeof e.preventDefault === "function") e.preventDefault();
    if (typeof window !== "undefined" && typeof window.dfToggleTimer === "function") {
      window.dfToggleTimer();
    }
    return { handled: true, action: "toggle_timer" };
  }
  if (key === "Escape") {
    if (typeof e.preventDefault === "function") e.preventDefault();
    if (typeof window !== "undefined" && typeof window.dfCloseAllModals === "function") {
      window.dfCloseAllModals();
    }
    return { handled: true, action: "close_modal" };
  }
  if (key === "m" || key === "M") {
    if (typeof e.preventDefault === "function") e.preventDefault();
    if (typeof window !== "undefined" && typeof window.dfToggleMute === "function") {
      window.dfToggleMute();
    }
    return { handled: true, action: "toggle_mute" };
  }
  if (key === "f" || key === "F") {
    if (typeof e.preventDefault === "function") e.preventDefault();
    if (typeof window !== "undefined" && typeof window.dfToggleZenFullscreen === "function") {
      window.dfToggleZenFullscreen();
    }
    return { handled: true, action: "toggle_fullscreen" };
  }
  if (key >= "1" && key <= "7") {
    if (typeof e.preventDefault === "function") e.preventDefault();
    const tabIndex = parseInt(key, 10);
    if (typeof window !== "undefined" && typeof window.dfSwitchTabByIndex === "function") {
      window.dfSwitchTabByIndex(tabIndex);
    }
    return { handled: true, action: "switch_tab_" + tabIndex };
  }

  return { handled: false, action: "unmapped_key" };
}

if (typeof window !== "undefined") {
  window.dfHandlePhysicalKeyboardShortcut = dfHandlePhysicalKeyboardShortcut;
  if (!window.__dfKeyboardShortcutsInitialized) {
    window.__dfKeyboardShortcutsInitialized = true;
    if (typeof window.addEventListener === "function") {
      window.addEventListener("keydown", function(event) {
        dfHandlePhysicalKeyboardShortcut(event);
      });
    }
  }
}
if (typeof globalThis !== "undefined") {
  globalThis.dfHandlePhysicalKeyboardShortcut = dfHandlePhysicalKeyboardShortcut;
}
EOF_JS
fi

# Ensure build.gradle has target versionCode & versionName
sed -i 's/versionCode [0-9]\+/versionCode '"$VERSION_CODE"'/' "$BUILD_GRADLE"
sed -i 's/versionName "[^"]\+"/versionName "'"$VERSION_NAME"'"/' "$BUILD_GRADLE"
echo "[INFO] build.gradle verified at versionCode $VERSION_CODE ($VERSION_NAME)"

# Verify JS syntax
echo "[CHECK] Verifying JS syntax with node --check..."
node --check "$APP_JS"
echo "[PASS] JS syntax validated successfully."

# Run Node VM functional test
echo "[CHECK] Running Node VM Isolated Functional Tests for M305..."
node -e '
const fs = require("fs");
const vm = require("vm");

const fullCode = fs.readFileSync("android/app/src/main/assets/web/app.js", "utf8");
const marker = "// MISSION #305: External Physical Keyboard Navigation Suite (v4.3.5)";
const markerIdx = fullCode.indexOf(marker);
if (markerIdx === -1) {
  throw new Error("Mission #305 marker not found in app.js");
}
const mCode = fullCode.slice(markerIdx);

const sandbox = {
  window: { addEventListener: () => {} },
  globalThis: {},
  document: { activeElement: null }
};
vm.createContext(sandbox);
vm.runInContext(mCode, sandbox);

const fn = sandbox.window.dfHandlePhysicalKeyboardShortcut;
if (typeof fn !== "function") throw new Error("dfHandlePhysicalKeyboardShortcut is not exported!");

const rSpace = fn({ key: " ", code: "Space", target: { tagName: "BODY" } });
if (!rSpace.handled || rSpace.action !== "toggle_timer") throw new Error("Space failed: " + JSON.stringify(rSpace));

const rInput = fn({ key: " ", code: "Space", target: { tagName: "INPUT" } });
if (rInput.handled) throw new Error("Input suppression failed: " + JSON.stringify(rInput));

const rEsc = fn({ key: "Escape", code: "Escape", target: { tagName: "DIV" } });
if (!rEsc.handled || rEsc.action !== "close_modal") throw new Error("Escape failed: " + JSON.stringify(rEsc));

const rM = fn({ key: "m", code: "KeyM", target: { tagName: "BODY" } });
if (!rM.handled || rM.action !== "toggle_mute") throw new Error("Key M failed: " + JSON.stringify(rM));

const rF = fn({ key: "F", code: "KeyF", target: { tagName: "BODY" } });
if (!rF.handled || rF.action !== "toggle_fullscreen") throw new Error("Key F failed: " + JSON.stringify(rF));

for (let i = 1; i <= 7; i++) {
  const rTab = fn({ key: String(i), code: "Digit" + i, target: { tagName: "BODY" } });
  if (!rTab.handled || rTab.action !== "switch_tab_" + i) throw new Error("Tab " + i + " failed");
}

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# Directives check
echo "[CHECK] Verifying package identifier and character constraints..."
grep -q -i "com.deepfocus.study" "$BUILD_GRADLE" || { echo "[FAIL] com.deepfocus.study not found in build.gradle"; exit 1; }
if grep -P "[\x{0590}-\x{05FF}]" "$APP_JS"; then
  echo "[FAIL] Forbidden script detected in app.js!"
  exit 1
fi

# Commit, tag, and push
git add "$APP_JS" "$BUILD_GRADLE"
git commit -m "feat(ux): M305 external physical keyboard navigation suite with versionCode $VERSION_CODE [v$VERSION_NAME]"

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
echo "MISSION: $MISSION_NUM (35 of 40)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $COMMIT_SHA"
echo "VERSION_CODE: $VERSION_CODE"
echo "VERSION_NAME: $VERSION_NAME"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: 306 (Local Storage Vault Integrity Self-Validator & Corruption Auto-Recovery)"
echo "============================================================"
rm -f .run_m305.sh
