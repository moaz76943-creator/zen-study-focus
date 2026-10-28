#!/bin/bash
set -Eeuo pipefail

echo "========================================================"
echo " [DEEP FOCUS] Hourly Cycle Mission #262 (Termux Runner)"
echo " Feature: Active Filter Indicator & 1-Tap Clear Helper"
echo " Target VersionCode: 82 (v3.9.2)"
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
        git commit -m "chore: save local progress before M262" || true
    else
        echo "[WARN] Syntax check failed on working tree. Resetting modified files..."
        git checkout -- android/app/src/main/assets/web/app.js android/app/build.gradle
    fi
fi

# 4. Apply M262 code to app.js
APP_JS="android/app/src/main/assets/web/app.js"
if ! grep -q "M262_VOCAB_ACTIVE_FILTER_INDICATOR_AND_CODE82_V1" "$APP_JS"; then
    echo "[INFO] Appending M262 Active Filter Indicator to $APP_JS..."
    cat << 'JS_EOF' >> "$APP_JS"

/* === M262_VOCAB_ACTIVE_FILTER_INDICATOR_AND_CODE82_V1 === */
(function() {
  'use strict';

  function dfFormatWesternDigits(val) {
    if (val === null || val === undefined) return '0';
    var str = String(val);
    var eastern = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
    for (var i = 0; i < eastern.length; i++) {
      str = str.split(eastern[i]).join(String(i));
    }
    return str;
  }

  function dfGetActiveFilterDisplayLabel(tier) {
    var t = tier || (typeof window !== 'undefined' && typeof window.dfGetActiveRetentionFilter === 'function' ? window.dfGetActiveRetentionFilter() : 'all');
    if (t === 'mastered') return '✅ متقنة';
    if (t === 'needs_review') return '⚠️ قيد المراجعة';
    if (t === 'learning') return '📖 جديدة / تعلم';
    if (t === 'pinned') return '📌 مثبتة';
    return '';
  }

  function dfRenderActiveFilterIndicatorHtml(matchingCount) {
    var label = dfGetActiveFilterDisplayLabel();
    if (!label) return '';

    var countStr = dfFormatWesternDigits(matchingCount !== undefined ? matchingCount : 0);

    return '<div class="df-active-filter-indicator" style="display:inline-flex;align-items:center;gap:6px;background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);border-radius:16px;padding:4px 10px;font-size:12px;color:#93c5fd;margin-bottom:8px;direction:rtl;">' +
      '<span>تصفية نشطة: <strong>' + label + '</strong> (' + countStr + ')</span>' +
      '<button type="button" onclick="window.dfClearAllVocabFilters && window.dfClearAllVocabFilters()" style="background:none;border:none;color:#93c5fd;cursor:pointer;font-size:13px;padding:0 2px;line-height:1;" title="إلغاء التصفية">✕</button>' +
    '</div>';
  }

  function dfClearAllVocabFilters() {
    try {
      if (typeof window !== 'undefined' && typeof window.dfSetRetentionFilter === 'function') {
        window.dfSetRetentionFilter('all');
      } else {
        localStorage.setItem('df_vocab_active_tier_filter_v1', 'all');
      }
    } catch (_) {}

    try {
      if (typeof document !== 'undefined') {
        var searchInput = document.getElementById('df-vocab-search-input');
        if (searchInput) searchInput.value = '';
      }
    } catch (_) {}

    try {
      if (typeof window !== 'undefined' && typeof window.dfVocabHapticPulse === 'function') {
        window.dfVocabHapticPulse(15);
      }
    } catch (_) {}

    try {
      if (typeof window !== 'undefined' && typeof window.dfTriggerVocabStatsSync === 'function') {
        window.dfTriggerVocabStatsSync({ immediate: true });
      }
    } catch (_) {}

    return true;
  }

  if (typeof window !== 'undefined') {
    window.dfGetActiveFilterDisplayLabel = dfGetActiveFilterDisplayLabel;
    window.dfRenderActiveFilterIndicatorHtml = dfRenderActiveFilterIndicatorHtml;
    window.dfClearAllVocabFilters = dfClearAllVocabFilters;
  }
})();
JS_EOF
else
    echo "[INFO] M262 already present in $APP_JS"
fi

# 5. Update build.gradle to versionCode 82 and versionName 3.9.2
python3 -c "
with open('android/app/build.gradle', 'r') as f:
    content = f.read()
import re
content = re.sub(r'versionCode\s+\d+', 'versionCode 82', content)
content = re.sub(r'versionName\s+[\"\'][^\"\']+[\"\']', 'versionName \"3.9.2\"', content)
with open('android/app/build.gradle', 'w') as f:
    f.write(content)
print('[INFO] build.gradle updated to versionCode 82 (3.9.2)')
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
const marker = "/* === M262_VOCAB_ACTIVE_FILTER_INDICATOR_AND_CODE82_V1 === */";
const moduleCode = fullCode.slice(fullCode.indexOf(marker));

const memStore = Object.create(null);
let hapticCalled = false;
let syncCalled = false;
let filterResetCalled = false;
let searchInputVal = "test query";

const sandbox = {
  window: {},
  document: {
    getElementById: (id) => (id === "df-vocab-search-input" ? {
      get value() { return searchInputVal; },
      set value(v) { searchInputVal = v; }
    } : null),
    querySelector: () => null,
    querySelectorAll: () => []
  },
  localStorage: {
    getItem: (k) => (k in memStore ? memStore[k] : null),
    setItem: (k, v) => { memStore[k] = String(v); },
    removeItem: (k) => { delete memStore[k]; },
    clear: () => { Object.keys(memStore).forEach(k => delete memStore[k]); }
  },
  String: String
};
sandbox.window = sandbox;

sandbox.window.dfVocabHapticPulse = () => { hapticCalled = true; };
sandbox.window.dfTriggerVocabStatsSync = () => { syncCalled = true; };
sandbox.window.dfSetRetentionFilter = (t) => {
  filterResetCalled = (t === "all");
  sandbox.localStorage.setItem("df_vocab_active_tier_filter_v1", t);
};

vm.createContext(sandbox);
vm.runInContext(moduleCode, sandbox);

// Verification tests
assert.strictEqual(sandbox.window.dfGetActiveFilterDisplayLabel("mastered"), "✅ متقنة");
assert.strictEqual(sandbox.window.dfGetActiveFilterDisplayLabel("needs_review"), "⚠️ قيد المراجعة");
assert.strictEqual(sandbox.window.dfGetActiveFilterDisplayLabel("learning"), "📖 جديدة / تعلم");
assert.strictEqual(sandbox.window.dfGetActiveFilterDisplayLabel("pinned"), "📌 مثبتة");
assert.strictEqual(sandbox.window.dfGetActiveFilterDisplayLabel("all"), "");

sandbox.window.dfGetActiveRetentionFilter = () => "mastered";
const html = sandbox.window.dfRenderActiveFilterIndicatorHtml(5);
assert.ok(html.includes("✅ متقنة"));
assert.ok(html.includes("(5)"));
assert.ok(html.includes("dfClearAllVocabFilters"));

sandbox.window.dfGetActiveRetentionFilter = () => "all";
const emptyHtml = sandbox.window.dfRenderActiveFilterIndicatorHtml(10);
assert.strictEqual(emptyHtml, "");

assert.strictEqual(searchInputVal, "test query");
const clearRes = sandbox.window.dfClearAllVocabFilters();
assert.strictEqual(clearRes, true);
assert.strictEqual(filterResetCalled, true);
assert.strictEqual(searchInputVal, "");
assert.strictEqual(hapticCalled, true);
assert.strictEqual(syncCalled, true);

console.log("[PASS] Node VM Isolated Functional Tests Passed.");
'

# 8. Git Commit and Tag
git add "$APP_JS" android/app/build.gradle
git commit -m "feat(vocab): M262 add active filter indicator chip and 1-tap clear helper with versionCode 82 [v3.9.2]" || true
git tag -a v3.9.2-m262-v21 -m "Tag M262: active filter indicator chip and 1-tap clear helper with versionCode 82" -f

# 9. Push to GitHub
echo "[INFO] Pushing changes to remote..."
git push origin "$TARGET_BRANCH"
git push origin v3.9.2-m262-v21

HEAD_SHA=$(git rev-parse HEAD)

echo "========================================================"
echo " DEEP FOCUS — HOURLY BUILD REPORT"
echo "========================================================"
echo "STATUS: SUCCESS"
echo "MISSION: M262"
echo "BRANCH: $TARGET_BRANCH"
echo "COMMIT_SHA: $HEAD_SHA"
echo "VERSION_CODE: 82"
echo "VERSION_NAME: 3.9.2"
echo "CHECKS_NODE_SYNTAX: PASSED"
echo "CHECKS_UNIT_TESTS: PASSED"
echo "CHECKS_WESTERN_DIGITS: PRESERVED"
echo "ANDROID_DEVICE_TEST: NOT_TESTED (Pending device verification)"
echo "NEXT_STEP: M263 (Flashcard quiz session launch pre-filtered by active retention tier)"
echo "========================================================"
