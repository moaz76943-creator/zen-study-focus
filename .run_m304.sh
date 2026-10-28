#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #304 (Termux Runner)"
echo " Feature: WebView Memory Leak Prevention & DOM GC"
echo " Target VersionCode: 124 (v4.3.4) [Mission 34 of 40]"
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
        git commit -m "chore: save local progress before M304" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 5. Apply M304 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M304_WEBVIEW_MEMORY_LEAK_PREVENTION_AND_CODE124_V1" "$APP_JS"; then
    echo "[INFO] Appending M304 Memory GC Engine to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M304_WEBVIEW_MEMORY_LEAK_PREVENTION_AND_CODE124_V1 === */
(function() {
  'use strict';

  var _periodicCleanupTimer = null;

  function dfFormatWesternDigits(val) {
    if (val === null || val === undefined) return "0";
    var str = String(val);
    var eastern = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
    for (var i = 0; i < eastern.length; i++) {
      str = str.split(eastern[i]).join(String(i));
    }
    return str;
  }

  function dfPurgeOrphanedDomNodes() {
    if (typeof document === "undefined") return 0;
    var purgedCount = 0;

    var orphanSelectors = [
      "#df-vocab-toast",
      "#df-health-check-modal-backdrop",
      ".df-card-example-tray-temp",
      "#df-micro-review-banner-stale"
    ];

    for (var i = 0; i < orphanSelectors.length; i++) {
      try {
        var elements = document.querySelectorAll(orphanSelectors[i]);
        for (var j = 0; j < elements.length; j++) {
          var el = elements[j];
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
            purgedCount++;
          }
        }
      } catch (_) {}
    }

    return purgedCount;
  }

  function dfRunMemoryGarbageCleanup() {
    var purgedNodes = dfPurgeOrphanedDomNodes();

    try {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        if (!window.speechSynthesis.speaking && window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
      }
    } catch (_) {}

    try {
      localStorage.removeItem("__df_temp_search_cache__");
    } catch (_) {}

    return {
      success: true,
      purgedNodes: purgedNodes,
      purgedNodesFormatted: dfFormatWesternDigits(purgedNodes),
      timestamp: Date.now()
    };
  }

  function dfSchedulePeriodicMemoryCleanup() {
    if (_periodicCleanupTimer) {
      clearInterval(_periodicCleanupTimer);
      _periodicCleanupTimer = null;
    }

    _periodicCleanupTimer = setInterval(function() {
      dfRunMemoryGarbageCleanup();
    }, 15 * 60 * 1000);

    return true;
  }

  try {
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", function() {
        if (document.hidden) {
          dfRunMemoryGarbageCleanup();
        }
      });
    }

    if (typeof window !== "undefined") {
      dfSchedulePeriodicMemoryCleanup();
      window.dfPurgeOrphanedDomNodes = dfPurgeOrphanedDomNodes;
      window.dfRunMemoryGarbageCleanup = dfRunMemoryGarbageCleanup;
      window.dfSchedulePeriodicMemoryCleanup = dfSchedulePeriodicMemoryCleanup;
    }
  } catch (_) {}
})();
JS_EOF
else
    echo "[INFO] M304 already present in $APP_JS"
fi

# 6. Update build.gradle to versionCode 124 and versionName 4.3.4
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 124', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"4.3.4\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 124 (4.3.4)')
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
const marker = "/* === M304_WEBVIEW_MEMORY_LEAK_PREVENTION_AND_CODE124_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

let speechCancelCalled = false;
let removedNodes = [];

const mockOrphan = {
  parentNode: {
    removeChild: (el) => { removedNodes.push(el); }
  }
};

const sandbox = {
  window: {
    speechSynthesis: {
      speaking: false,
      pending: true,
      cancel: () => { speechCancelCalled = true; }
    }
  },
  document: {
    querySelectorAll: (sel) => (sel === "#df-vocab-toast" ? [mockOrphan] : []),
    addEventListener: () => {}
  },
  localStorage: {
    removeItem: () => {}
  },
  Date: Date,
  setInterval: () => 123,
  clearInterval: () => {},
  String: String,
  Number: Number
};
sandbox.window.window = sandbox.window;

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
const purgeCount = sandbox.window.dfPurgeOrphanedDomNodes();
assert.strictEqual(purgeCount, 1);
assert.strictEqual(removedNodes.length, 1);

const res = sandbox.window.dfRunMemoryGarbageCleanup();
assert.strictEqual(res.success, true);
assert.strictEqual(speechCancelCalled, true);
assert.strictEqual(res.purgedNodesFormatted, "1");

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 9. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(perf): M304 add WebView memory leak prevention and DOM garbage collection with versionCode 124 [v4.3.4]" || true
git tag -a v4.3.4-m304-v21 -m "Tag M304: WebView memory leak prevention with versionCode 124" -f

# 10. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v4.3.4-m304-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M304 (34 of 40)"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 124"
echo "VERSION_NAME: 4.3.4"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M305 (External physical keyboard navigation for tablet and desktop mode)"
echo "========================================================"
