#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

BRANCH="integration/master-qa-verified-v21"
MISSION_ID="M206_VOCAB_WEBVIEW_TOOLKIT_V1"
REPO_DIR="${HOME}/zen-study-focus"

trap 'echo "[FAIL] Script stopped at line $LINENO due to an error. Review output above."; exit 1' ERR

echo "=== [1/7] Checking repository & syncing official branch ==="
if [ ! -d "${REPO_DIR}/.git" ]; then
  echo "[FAIL] Git repository not found at: ${REPO_DIR}"
  exit 1
fi
cd "${REPO_DIR}"

# Move stray untracked run_cycle_*.sh scripts out of Android web assets so they don't bloat the AAB
mkdir -p "${REPO_DIR}/.local_cycle_archive"
for stray in android/app/src/main/assets/web/run_cycle_*.sh; do
  if [ -f "${stray}" ] && [ -z "$(git ls-files "${stray}")" ]; then
    mv "${stray}" "${REPO_DIR}/.local_cycle_archive/"
    echo "[CLEANUP] Moved untracked ${stray} out of web assets."
  fi
done

# Check ONLY tracked files for uncommitted modifications
TRACKED_DIRTY="$(git status --porcelain --untracked-files=no)"
if [ -n "${TRACKED_DIRTY}" ]; then
  echo "[BLOCKED] Tracked files have uncommitted modifications:"
  echo "${TRACKED_DIRTY}"
  exit 1
fi

git fetch origin "${BRANCH}"
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "${CURRENT_BRANCH}" != "${BRANCH}" ]; then
  git checkout "${BRANCH}"
fi
git pull --ff-only origin "${BRANCH}"

BASE_SHA="$(git rev-parse HEAD)"
echo "[INFO] Latest official HEAD SHA: ${BASE_SHA}"

echo "=== [2/7] Verifying real file paths in repository ==="
APP_JS="android/app/src/main/assets/web/app.js"
if [ ! -f "${APP_JS}" ]; then
  echo "[FAIL] Primary file not found at expected path: ${APP_JS}"
  exit 1
fi

TARGET_JS="${APP_JS}"
for candidate in \
  "android/app/src/main/assets/web/notes_studio.js" \
  "android/app/src/main/assets/web/js/notes_studio.js" \
  "${APP_JS}"; do
  if [ -f "${candidate}" ] && grep -q "SpokenVocabEngine" "${candidate}"; then
    TARGET_JS="${candidate}"
    break
  fi
done

GRADLE_FILE="android/app/build.gradle"
if [ ! -f "${GRADLE_FILE}" ]; then
  echo "[FAIL] Gradle build file not found: ${GRADLE_FILE}"
  exit 1
fi

echo "[INFO] Target JS file   : ${TARGET_JS}"
echo "[INFO] Gradle build file: ${GRADLE_FILE}"

echo "=== [3/7] Checking idempotency (RED Check) ==="
if grep -q "${MISSION_ID}" "${TARGET_JS}"; then
  echo "[INFO] Mission ${MISSION_ID} is already present in ${TARGET_JS}. Nothing to duplicate."
  exit 0
fi
echo "[RED PASS] ${MISSION_ID} not present yet; applying safe patch."

echo "=== [4/7] Applying Mission #206 patch & incrementing versionCode ==="
python3 - "${TARGET_JS}" "${GRADLE_FILE}" << 'PY_EOF'
import sys, os, re

target_js = sys.argv[1]
gradle_path = sys.argv[2]

with open(target_js, "r", encoding="utf-8") as f:
    content = f.read()

m206_code = """
/* === M206_VOCAB_WEBVIEW_TOOLKIT_V1 === */
(function() {
  if (window.__M206_VOCAB_TOOLKIT_ACTIVE__) return;
  window.__M206_VOCAB_TOOLKIT_ACTIVE__ = true;

  function toWesternDigits(str) {
    return String(str == null ? '' : str)
      .replace(/[\\u0660-\\u0669]/g, function(d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[\\u06F0-\\u06F9]/g, function(d) { return String(d.charCodeAt(0) - 0x06F0); });
  }

  function buildCsvText(items) {
    var lines = ['word,meaning,color,hard'];
    (items || []).forEach(function(it) {
      var w = String(it.word || '').replace(/"/g, '""');
      var m = String(it.meaning || '').replace(/"/g, '""');
      var c = String(it.color || 'purple');
      var h = it.hard ? '1' : '0';
      lines.push('"' + w + '","' + m + '",' + c + ',' + h);
    });
    return lines.join('\\n');
  }

  function parseBulkLines(rawText, defaultColor) {
    var parsed = [];
    String(rawText || '').split(/\\r?\\n/).forEach(function(line) {
      var clean = line.trim();
      if (!clean || /^word\\s*[,;\\t-]/i.test(clean)) return;
      var parts = clean.split(/\\s*(?:,|;|\\t|\\s-\\s|:|\\|)\\s*/);
      if (parts.length >= 2 && parts[0] && parts[1]) {
        parsed.push({
          id: 'v_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
          word: parts[0].replace(/^"|"$/g, '').trim(),
          meaning: parts.slice(1).join(' - ').replace(/^"|"$/g, '').trim(),
          color: defaultColor || 'purple',
          hard: false
        });
      }
    });
    return parsed;
  }

  window.dfToWesternDigitsM206 = toWesternDigits;
  window.dfBuildVocabCsvM206 = buildCsvText;
  window.dfBulkParseVocabLinesM206 = parseBulkLines;

  window.dfShareOrCopyVocabCsv = function() {
    var eng = window.SpokenVocabEngine;
    var items = (eng && typeof eng.getItems === 'function') ? eng.getItems() : [];
    if (!items || !items.length) {
      alert('لا توجد كلمات لتصديرها حالياً.');
      return;
    }
    var csvText = buildCsvText(items);
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: 'Deep Focus Vocabulary (' + toWesternDigits(items.length) + ')',
        text: csvText
      }).catch(function() {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(csvText);
          alert('تم نسخ ' + toWesternDigits(items.length) + ' كلمة بصيغة CSV إلى الحافظة.');
        }
      });
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(csvText).then(function() {
        alert('تم نسخ ' + toWesternDigits(items.length) + ' كلمة بصيغة CSV إلى الحافظة.');
      }).catch(function() {});
    }
  };

  window.dfOpenQuickPasteVocabModal = function() {
    if (typeof document === 'undefined') return;
    var existing = document.getElementById('df-vocab-paste-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'df-vocab-paste-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,23,0.82);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML =
      '<div style="background:#0f172a;border:1px solid rgba(168,85,247,0.35);border-radius:16px;max-width:460px;width:100%;padding:16px;color:#f8fafc;box-shadow:0 20px 50px rgba(0,0,0,0.5);">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
          '<strong style="font-size:15px;color:#e2e8f0;">📝 لصق واستيراد دفعة كلمات (CSV / نص)</strong>' +
          '<button type="button" id="df-vocab-paste-close" style="background:none;border:none;color:#94a3b8;font-size:18px;cursor:pointer;">✕</button>' +
        '</div>' +
        '<p style="font-size:12px;color:#94a3b8;margin:0 0 8px 0;line-height:1.5;">الصق قائمة الكلمات هنا (كل سطر: <code>الكلمة, المعنى</code> أو <code>الكلمة - المعنى</code>):</p>' +
        '<textarea id="df-vocab-paste-area" rows="6" placeholder="Schmetterling, فراشة\\nBuch - كتاب\\nWasser; ماء" ' +
          'style="width:100%;box-sizing:border-box;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:#1e293b;color:#f8fafc;font-size:13px;margin-bottom:12px;outline:none;"></textarea>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
          '<button type="button" id="df-vocab-paste-cancel" style="padding:8px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:#cbd5e1;font-size:13px;cursor:pointer;">إلغاء</button>' +
          '<button type="button" id="df-vocab-paste-confirm" style="padding:8px 16px;border-radius:10px;border:none;background:#9333ea;color:#ffffff;font-size:13px;font-weight:700;cursor:pointer;">📥 استيراد الآن</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);

    var closeFn = function() { modal.remove(); };
    document.getElementById('df-vocab-paste-close').onclick = closeFn;
    document.getElementById('df-vocab-paste-cancel').onclick = closeFn;

    document.getElementById('df-vocab-paste-confirm').onclick = function() {
      var raw = (document.getElementById('df-vocab-paste-area').value || '').trim();
      if (!raw) {
        alert('يرجى لصق سطر واحد على الأقل.');
        return;
      }
      var eng = window.SpokenVocabEngine;
      var added = 0;
      if (eng && typeof eng.importRawText === 'function') {
        added = eng.importRawText(raw, 'purple');
      } else if (eng && typeof eng.getItems === 'function' && typeof eng.saveItems === 'function') {
        var items = eng.getItems() || [];
        var newEntries = parseBulkLines(raw, 'purple');
        for (var i = newEntries.length - 1; i >= 0; i--) {
          items.unshift(newEntries[i]);
          added++;
        }
        if (added > 0) {
          eng.saveItems(items);
          if (typeof eng.render === 'function') eng.render();
        }
      }
      modal.remove();
      alert('تم استيراد ' + toWesternDigits(added) + ' كلمة بنجاح.');
    };
  };

  function highlightActiveVocabCard(itemId, idx, total) {
    if (typeof document === 'undefined') return;
    var allCards = document.querySelectorAll('[data-vocab-card-id], .df-vocab-card, .vocab-item-card');
    allCards.forEach(function(c) {
      c.style.boxShadow = '';
      c.style.transform = '';
    });
    var badge = document.getElementById('df-vocab-live-speak-badge');
    if (!itemId) {
      if (badge) badge.style.display = 'none';
      return;
    }
    var target = document.querySelector('[data-vocab-card-id="' + itemId + '"]') ||
                 document.querySelector('[data-id="' + itemId + '"]');
    if (target) {
      target.style.boxShadow = '0 0 0 2px #a855f7, 0 8px 24px rgba(168,85,247,0.35)';
      target.style.transform = 'scale(1.01)';
      try {
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (e) {}
    }
    if (badge && total > 0) {
      badge.style.display = 'inline-flex';
      badge.textContent = '🔊 ' + toWesternDigits(idx) + ' / ' + toWesternDigits(total);
    }
  }

  function mountToolkitUI() {
    if (typeof document === 'undefined') return;
    var filterBar = document.getElementById('df-vocab-filter-bar');
    if (filterBar && !document.getElementById('df-vocab-search-row')) {
      var searchRow = document.createElement('div');
      searchRow.id = 'df-vocab-search-row';
      searchRow.style.cssText = 'display:flex;gap:8px;align-items:center;margin:8px 0;flex-wrap:wrap;';
      searchRow.innerHTML =
        '<input type="search" id="df-vocab-live-search" placeholder="🔍 ابحث في كلماتك أو معانيها..." ' +
        'style="flex:1;min-width:160px;padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.14);background:rgba(15,23,42,0.75);color:#f8fafc;font-size:13px;outline:none;" />' +
        '<button type="button" id="df-vocab-quick-paste-btn" ' +
        'style="padding:8px 12px;border-radius:10px;border:1px solid rgba(168,85,247,0.4);background:rgba(168,85,247,0.16);color:#d8b4fe;font-size:12px;font-weight:600;cursor:pointer;">' +
        '📝 لصق قائمة كلمات</button>' +
        '<button type="button" id="df-vocab-copy-share-btn" ' +
        'style="padding:8px 12px;border-radius:10px;border:1px solid rgba(56,189,248,0.35);background:rgba(56,189,248,0.14);color:#38bdf8;font-size:12px;font-weight:600;cursor:pointer;">' +
        '📋 نسخ / مشاركة الكل</button>' +
        '<span id="df-vocab-live-speak-badge" style="display:none;align-items:center;padding:6px 10px;border-radius:999px;background:rgba(168,85,247,0.2);border:1px solid rgba(168,85,247,0.45);color:#e9d5ff;font-size:12px;font-weight:700;"></span>';

      filterBar.parentNode.insertBefore(searchRow, filterBar.nextSibling);

      var searchInput = document.getElementById('df-vocab-live-search');
      if (searchInput) {
        searchInput.addEventListener('input', function() {
          var q = toWesternDigits(searchInput.value || '').trim().toLowerCase();
          var cards = document.querySelectorAll('[data-vocab-card-id], .df-vocab-card, .vocab-item-card');
          cards.forEach(function(card) {
            var txt = (card.textContent || '').toLowerCase();
            card.style.display = (!q || txt.indexOf(q) !== -1) ? '' : 'none';
          });
        });
      }

      var pasteBtn = document.getElementById('df-vocab-quick-paste-btn');
      if (pasteBtn) pasteBtn.onclick = function() { window.dfOpenQuickPasteVocabModal(); };

      var shareBtn = document.getElementById('df-vocab-copy-share-btn');
      if (shareBtn) shareBtn.onclick = function() { window.dfShareOrCopyVocabCsv(); };
    }

    var eng = window.SpokenVocabEngine;
    if (eng && !eng.__m206SpeakWrapped && typeof eng.speakPair === 'function') {
      eng.__m206SpeakWrapped = true;
      var origSpeak = eng.speakPair.bind(eng);
      eng.speakPair = function(item, onDone) {
        var items = (typeof eng.getItems === 'function') ? (eng.getItems() || []) : [];
        var idx = 1;
        if (item && item.id) {
          for (var i = 0; i < items.length; i++) {
            if (items[i] && items[i].id === item.id) {
              idx = i + 1;
              break;
            }
          }
          highlightActiveVocabCard(item.id, idx, items.length || 1);
        }
        return origSpeak(item, function() {
          highlightActiveVocabCard(null, 0, 0);
          if (typeof onDone === 'function') onDone();
        });
      };
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountToolkitUI);
    } else {
      setTimeout(mountToolkitUI, 250);
    }
    setInterval(mountToolkitUI, 1500);
  }
})();
"""

content = content.rstrip() + "\n" + m206_code + "\n"
with open(target_js, "w", encoding="utf-8") as f:
    f.write(content)

with open(gradle_path, "r", encoding="utf-8") as f:
    g = f.read()

m = re.search(r'versionCode\s+(\d+)', g)
cur_code = int(m.group(1)) if m else 25
next_code = max(cur_code + 1, 26)
g = re.sub(r'versionCode\s+\d+', f'versionCode {next_code}', g)
g = re.sub(r'versionName\s+"[^"]+"', f'versionName "3.5.{next_code - 20}"', g)
with open(gradle_path, "w", encoding="utf-8") as f:
    f.write(g)

print(f"[INFO] Updated {gradle_path} -> versionCode {next_code}")
PY_EOF

echo "=== [5/7] Running syntax & Node VM functional unit tests (GREEN Check) ==="
node --check "${APP_JS}"
if [ "${TARGET_JS}" != "${APP_JS}" ]; then
  node --check "${TARGET_JS}"
fi

node - "${TARGET_JS}" << 'NODE_EOF'
const fs = require('fs');
const vm = require('vm');
const targetFile = process.argv[2];
const code = fs.readFileSync(targetFile, 'utf8');

const sandbox = {
  window: {},
  document: {
    readyState: 'complete',
    getElementById: () => null,
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {}
  },
  navigator: {},
  localStorage: { getItem: () => null, setItem: () => {} },
  setTimeout: () => {},
  setInterval: () => {},
  clearTimeout: () => {},
  clearInterval: () => {},
  console: console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(code, sandbox);

if (!sandbox.__M206_VOCAB_TOOLKIT_ACTIVE__) {
  throw new Error('M206_VOCAB_WEBVIEW_TOOLKIT_V1 failed to initialize');
}
if (sandbox.dfToWesternDigitsM206('٢٠٢٦/١٠/٢٤') !== '2026/10/24') {
  throw new Error('Western digits normalization failed');
}
const parsed = sandbox.dfBulkParseVocabLinesM206('Schmetterling, فراشة\nBuch - كتاب', 'purple');
if (!Array.isArray(parsed) || parsed.length !== 2 || parsed[0].word !== 'Schmetterling' || parsed[1].meaning !== 'كتاب') {
  throw new Error('Bulk parser test failed');
}
const csv = sandbox.dfBuildVocabCsvM206(parsed);
if (!csv.includes('"Schmetterling","فراشة",purple,0')) {
  throw new Error('CSV generator test failed');
}
console.log('[GREEN PASS] Syntax and Node VM functional unit tests passed.');
NODE_EOF

grep -q 'applicationId "com.deepfocus.study"' "${GRADLE_FILE}"
if grep -Eiq '"(he|iw)"' "${APP_JS}"; then
  echo "[FAIL] Forbidden locale code detected in ${APP_JS}"
  exit 1
fi

echo "=== [6/7] Committing & pushing safely without --tags or --force ==="
git add "${TARGET_JS}" "${GRADLE_FILE}"
git commit -m "feat(vocab-m206): add WebView bulk paste import, live search, share/copy CSV, and active spoken highlight"

git pull --rebase origin "${BRANCH}"
LOCAL_SHA="$(git rev-parse HEAD)"
NEW_CODE="$(grep -Eo 'versionCode[[:space:]]+[0-9]+' "${GRADLE_FILE}" | awk '{print $2}')"
NEW_TAG="v3.5.${NEW_CODE}-m206-v21"

git push origin "${BRANCH}"

if [ -z "$(git ls-remote --tags origin "refs/tags/${NEW_TAG}")" ]; then
  git tag "${NEW_TAG}" "${LOCAL_SHA}"
  git push origin "refs/tags/${NEW_TAG}"
  TAG_STATUS="PUSHED (${NEW_TAG})"
else
  TAG_STATUS="SKIPPED_EXISTING (${NEW_TAG})"
fi

echo "=== [7/7] Verifying remote SHA on GitHub ==="
REMOTE_SHA="$(git ls-remote origin "refs/heads/${BRANCH}" | awk '{print $1}')"

echo "------------------------------------------------------------"
echo "DEEP FOCUS - VERIFICATION & DEPLOYMENT REPORT"
echo "------------------------------------------------------------"
echo "BRANCH               : ${BRANCH}"
echo "BASE_SHA             : ${BASE_SHA}"
echo "LOCAL_HEAD_SHA       : ${LOCAL_SHA}"
echo "REMOTE_GITHUB_SHA    : ${REMOTE_SHA}"
echo "MODIFIED_FILES       : ${TARGET_JS}, ${GRADLE_FILE}"
echo "VERSION_CODE         : ${NEW_CODE}"
echo "NEW_TAG_STATUS       : ${TAG_STATUS}"
echo "NODE_SYNTAX_CHECK    : PASS"
echo "NODE_VM_UNIT_TEST    : PASS"
echo "ANDROID_DEVICE_TEST  : NOT_TESTED (Requires on-device check)"
echo "------------------------------------------------------------"

if [ "${LOCAL_SHA}" != "${REMOTE_SHA}" ]; then
  echo "[FAIL] Local SHA (${LOCAL_SHA}) does not match remote GitHub SHA (${REMOTE_SHA})."
  exit 1
fi

echo "[VERIFIED] Changes committed, pushed, and verified on GitHub official branch."
