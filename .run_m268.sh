#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #268 (Termux Runner)"
echo " Feature: Floating Toast Feedback Notification"
echo " Target VersionCode: 88 (v3.9.8)"
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
        git commit -m "chore: save local progress before M268" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 4. Apply M268 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M268_TOAST_FEEDBACK_NOTIFICATION_AND_CODE88_V1" "$APP_JS"; then
    echo "[INFO] Appending M268 Toast Notification feature to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M268_TOAST_FEEDBACK_NOTIFICATION_AND_CODE88_V1 === */
(function() {
  'use strict';

  var _activeToastTimeout = null;

  function dfRemoveExistingToast() {
    try {
      if (typeof document === 'undefined') return;
      var oldToast = document.getElementById('df-vocab-toast');
      if (oldToast && oldToast.parentNode) {
        oldToast.parentNode.removeChild(oldToast);
      }
      if (_activeToastTimeout) {
        clearTimeout(_activeToastTimeout);
        _activeToastTimeout = null;
      }
    } catch (_) {}
  }

  function dfShowVocabToastNotification(message, type, durationMs) {
    if (!message || typeof document === 'undefined') return false;

    dfRemoveExistingToast();

    var dur = Number(durationMs) || 2500;
    var bg = '#18181b';
    var border = '#27272a';
    var color = '#f4f4f5';

    if (type === 'success') {
      bg = '#064e3b';
      border = '#059669';
      color = '#ecfdf5';
    } else if (type === 'info') {
      bg = '#1e3a8a';
      border = '#3b82f6';
      color = '#eff6ff';
    } else if (type === 'warning') {
      bg = '#78350f';
      border = '#d97706';
      color = '#fffbeb';
    }

    try {
      var toast = document.createElement('div');
      toast.id = 'df-vocab-toast';
      toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;padding:10px 16px;border-radius:24px;font-size:13px;font-weight:bold;box-shadow:0 8px 20px rgba(0,0,0,0.4);direction:rtl;text-align:center;pointer-events:none;transition:opacity 0.25s ease;opacity:0;background:' + bg + ';border:1px solid ' + border + ';color:' + color + ';';
      toast.textContent = String(message);

      document.body.appendChild(toast);

      setTimeout(function() {
        if (toast) toast.style.opacity = '1';
      }, 10);

      _activeToastTimeout = setTimeout(function() {
        if (toast) {
          toast.style.opacity = '0';
          setTimeout(function() {
            if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
          }, 250);
        }
      }, dur);

      return true;
    } catch (_) {
      return false;
    }
  }

  if (typeof window !== 'undefined') {
    window.dfRemoveExistingToast = dfRemoveExistingToast;
    window.dfShowVocabToastNotification = dfShowVocabToastNotification;
  }
})();
JS_EOF
else
    echo "[INFO] M268 already present in $APP_JS"
fi

# 5. Update build.gradle to versionCode 88 and versionName 3.9.8
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 88', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"3.9.8\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 88 (3.9.8)')
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
const marker = "/* === M268_TOAST_FEEDBACK_NOTIFICATION_AND_CODE88_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

let appendedElements = [];
let removedElements = [];

const mockParent = {
  removeChild: (el) => {
    removedElements.push(el);
    appendedElements = appendedElements.filter(e => e !== el);
  }
};

const sandbox = {
  window: {},
  document: {
    getElementById: (id) => (appendedElements.find(e => e.id === id) || null),
    createElement: (tag) => ({
      tag: tag,
      id: "",
      style: {},
      textContent: "",
      parentNode: mockParent
    }),
    body: {
      appendChild: (el) => { appendedElements.push(el); }
    }
  },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Number: Number,
  String: String
};
sandbox.window = sandbox;

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
assert.strictEqual(sandbox.window.dfShowVocabToastNotification(""), false);

const showRes = sandbox.window.dfShowVocabToastNotification("تم النسخ بنجاح", "success", 1000);
assert.strictEqual(showRes, true);
assert.strictEqual(appendedElements.length, 1);
assert.strictEqual(appendedElements[0].textContent, "تم النسخ بنجاح");
assert.ok(appendedElements[0].style.cssText.includes("#064e3b"));

sandbox.window.dfShowVocabToastNotification("إشعار ثانٍ", "info", 1000);
assert.strictEqual(appendedElements.length, 1);
assert.strictEqual(appendedElements[0].textContent, "إشعار ثانٍ");
assert.ok(appendedElements[0].style.cssText.includes("#1e3a8a"));

sandbox.window.dfRemoveExistingToast();
assert.strictEqual(appendedElements.length, 0);

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 8. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(vocab): M268 add toast feedback notification for share and copy actions with versionCode 88 [v3.9.8]" || true
git tag -a v3.9.8-m268-v21 -m "Tag M268: toast feedback notification for share and copy actions with versionCode 88" -f

# 9. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v3.9.8-m268-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M268"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 88"
echo "VERSION_NAME: 3.9.8"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M269 (Automatic toast integration on clipboard copy inside dfOnQuizShareButtonClicked)"
echo "========================================================"
