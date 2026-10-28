#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "=== [DEEP FOCUS] 🖥️ Starting Mission #187: Minimalist OLED Desk Clock ==="
cd ~/zen-study-focus

git checkout integration/master-qa-verified-v21
git pull origin integration/master-qa-verified-v21

APP_JS="android/app/src/main/assets/web/app.js"
TEST_FILE="test/cycle_187_desk_clock.test.js"
RECEIPT_FILE="artifacts/evidence/cycle_187_receipt.json"

echo "=== 1. دمج محرك ساعة المكتب OLED في صلب app.js ==="
node << 'EOF'
const fs = require('fs');

const appJsPath = 'android/app/src/main/assets/web/app.js';
let code = fs.readFileSync(appJsPath, 'utf8');

const DESK_CLOCK_ENGINE = `
/* ========================================================
   DEEP FOCUS — MINIMALIST OLED DESK CLOCK ENGINE (M187)
   ======================================================== */
const DeskClockEngine = (function() {
  let deskTimerId = null;
  let isOpen = false;

  function toWestern(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[٠-٩]/g, d => d.charCodeAt(0) - 1632)
              .replace(/[۰-۹]/g, d => d.charCodeAt(0) - 1776);
  }

  function getTimerText() {
    const el = document.querySelector('.timer-val, #timerVal, [class*="timer" i] [class*="time" i], .text-6xl, .text-5xl');
    if (el && el.textContent) {
      return toWestern(el.textContent.trim());
    }
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    return \`\${h}:\${m}:\${s}\`;
  }

  function getTaskName() {
    const storage = typeof localStorage !== 'undefined' ? localStorage : null;
    if (storage) {
      const task = storage.getItem('df_focused_task_text');
      if (task) return task;
    }
    return 'DEEP FOCUS • ULTRA IMMERSION';
  }

  function openDeskClock() {
    if (isOpen || document.getElementById('df-oled-desk-clock')) return;
    isOpen = true;

    const overlay = document.createElement('div');
    overlay.id = 'df-oled-desk-clock';
    overlay.style.cssText = 'position:fixed;inset:0;background:#000000;color:#ffffff;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;user-select:none;font-family:monospace;padding:24px;transition:opacity 0.3s;';
    
    overlay.innerHTML = \`
      <button id="df-desk-close" style="position:absolute;top:24px;right:24px;background:#1e293b;color:#cbd5e1;border:1px solid #334155;padding:8px 18px;border-radius:14px;font-size:13px;cursor:pointer;font-weight:bold;letter-spacing:1px;">✕ Exit</button>
      <div id="df-desk-timer-val" style="font-size:clamp(60px, 16vw, 120px);font-weight:900;letter-spacing:6px;color:#10b981;line-height:1;font-variant-numeric:lining-nums;">\${getTimerText()}</div>
      <div id="df-desk-task-name" style="margin-top:20px;font-size:clamp(12px, 3.5vw, 18px);color:#94a3b8;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-align:center;max-width:90%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">\${getTaskName()}</div>
      <div style="margin-top:24px;font-size:11px;color:#475569;letter-spacing:3px;text-transform:uppercase;">OLED BATTERY SAVER • 0123456789</div>
    \`;

    document.body.appendChild(overlay);

    document.getElementById('df-desk-close').onclick = closeDeskClock;

    deskTimerId = setInterval(() => {
      const valEl = document.getElementById('df-desk-timer-val');
      if (valEl) valEl.textContent = getTimerText();
    }, 1000);

    if (window.triggerHaptic) window.triggerHaptic('action');
  }

  function closeDeskClock() {
    const el = document.getElementById('df-oled-desk-clock');
    if (el) el.remove();
    if (deskTimerId) clearInterval(deskTimerId);
    deskTimerId = null;
    isOpen = false;
    if (window.triggerHaptic) window.triggerHaptic('click');
  }

  function bindTriggers() {
    // 1. ربط زر Desk Clock الأصلي في أعلى الواجهة
    document.querySelectorAll('[class*="orb" i], button, .pill, div').forEach(el => {
      if (el.textContent && el.textContent.includes('Desk Clock') && !el.dataset.deskBound) {
        el.dataset.deskBound = "true";
        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => {
          e.preventDefault();
          openDeskClock();
        });
      }
    });

    // 2. التحول التلقائي عند تدوير الهاتف أفقياً
    if (window.matchMedia && !window.__dfOrientationBound) {
      window.__dfOrientationBound = true;
      const mql = window.matchMedia('(orientation: landscape)');
      mql.addEventListener('change', (e) => {
        if (e.matches) openDeskClock();
        else closeDeskClock();
      });
    }
  }

  return { openDeskClock, closeDeskClock, bindTriggers };
})();

window.DeskClockEngine = DeskClockEngine;

document.addEventListener('DOMContentLoaded', () => {
  DeskClockEngine.bindTriggers();
  const obs = new MutationObserver(DeskClockEngine.bindTriggers);
  obs.observe(document.body, { childList: true, subtree: true });
});
`;

if (!code.includes('DEEP FOCUS — MINIMALIST OLED DESK CLOCK ENGINE')) {
  code = DESK_CLOCK_ENGINE + '\n' + code;
}

fs.writeFileSync(appJsPath, code, 'utf8');
console.log("✓ Minimalist OLED Desk Clock Engine integrated into app.js!");
