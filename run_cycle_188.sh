#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "=== [DEEP FOCUS] 🔥 Starting Mission #188: Daily Streak & 5-Min Kickstart ==="
cd ~/zen-study-focus

git checkout integration/master-qa-verified-v21
git pull origin integration/master-qa-verified-v21

APP_JS="android/app/src/main/assets/web/app.js"
TEST_FILE="test/cycle_188_streak_kickstart.test.js"
RECEIPT_FILE="artifacts/evidence/cycle_188_receipt.json"

echo "=== 1. دمج محرك شعلة الالتزام وقاعدة الـ 5 دقائق في صلب app.js ==="
node << 'EOF'
const fs = require('fs');

const appJsPath = 'android/app/src/main/assets/web/app.js';
let code = fs.readFileSync(appJsPath, 'utf8');

const STREAK_AND_KICKSTART_ENGINE = `
/* ========================================================
   DEEP FOCUS — DAILY STREAK & 5-MIN KICKSTART ENGINE (M188)
   ======================================================== */
const HabitFocusEngine = (function() {
  function getSafeStorage() {
    return typeof localStorage !== 'undefined' ? localStorage : {
      getItem: () => null,
      setItem: () => {}
    };
  }

  function getStreakData() {
    const s = getSafeStorage();
    const count = parseInt(s.getItem('df_streak_count') || '1', 10);
    const lastDate = s.getItem('df_streak_last_date') || new Date().toISOString().slice(0, 10);
    return { count, lastDate };
  }

  function recordSessionForStreak() {
    const s = getSafeStorage();
    const today = new Date().toISOString().slice(0, 10);
    const current = getStreakData();

    if (current.lastDate === today) {
      return current.count;
    }

    const last = new Date(current.lastDate);
    const now = new Date(today);
    const diffDays = Math.ceil(Math.abs(now - last) / (1000 * 60 * 60 * 24));

    let newCount = current.count;
    if (diffDays === 1) {
      newCount += 1;
    } else if (diffDays > 1) {
      newCount = 1;
    }

    s.setItem('df_streak_count', newCount.toString());
    s.setItem('df_streak_last_date', today);
    updateStreakUI();
    return newCount;
  }

  function updateStreakUI() {
    const badge = document.getElementById('df-streak-badge-count');
    if (badge) {
      badge.textContent = getStreakData().count;
    }
  }

  function injectStreakBadge() {
    if (document.getElementById('df-streak-badge')) return;
    const header = document.querySelector('.timer-display, #timerDisplay, [class*="timer" i] h2')?.parentElement;
    if (!header) return;

    const streak = getStreakData().count;
    const badge = document.createElement('div');
    badge.id = 'df-streak-badge';
    badge.className = 'inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200/90 text-amber-900 rounded-full text-xs font-bold shadow-xs mx-auto mb-2';
    badge.innerHTML = \`
      <span class="text-sm">🔥</span>
      <span id="df-streak-badge-count" style="font-variant-numeric: lining-nums;">\${streak}</span>
      <span class="text-amber-700 font-semibold">Days Streak</span>
    \`;

    header.insertBefore(badge, header.firstChild);
  }

  function showKickstartPrompt() {
    const modal = document.createElement('div');
    modal.id = 'df-kickstart-modal';
    modal.className = 'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4';
    modal.innerHTML = \`
      <div class="bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl border border-slate-100 text-center animate-in fade-in">
        <div class="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold mb-3">⚡</div>
        <h3 class="font-bold text-slate-900 text-base mb-1">Resistance Broken!</h3>
        <p class="text-xs text-slate-500 mb-5 leading-relaxed">You conquered the hardest 5 minutes. Ready to dive into a full <strong>25-minute</strong> focus flow?</p>
        <div class="flex flex-col gap-2">
          <button id="df-extend-25m" class="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs font-bold transition shadow-md">🚀 Yes, Deep Focus (25m)</button>
          <button id="df-kickstart-close" class="w-full py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-600 rounded-xl text-xs font-semibold transition">☕ Take a Break</button>
        </div>
      </div>
    \`;

    document.body.appendChild(modal);

    modal.querySelector('#df-extend-25m').onclick = () => {
      modal.remove();
      // تشغيل وضع الـ 25 دقيقة مباشرة
      const btn25 = document.querySelector('button:has-text("25m"), [data-mode="25"], [class*="pill"]:contains("25")') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('25m'));
      if (btn25) btn25.click();
      const playBtn = document.querySelector('.play-btn, #playBtn, [class*="play" i]');
      if (playBtn) playBtn.click();
      if (window.triggerHaptic) window.triggerHaptic('start');
    };

    modal.querySelector('#df-kickstart-close').onclick = () => {
      modal.remove();
    };
  }

  return {
    getStreakData,
    recordSessionForStreak,
    injectStreakBadge,
    showKickstartPrompt
  };
})();

window.HabitFocusEngine = HabitFocusEngine;

document.addEventListener('DOMContentLoaded', () => {
  HabitFocusEngine.injectStreakBadge();
  const obs = new MutationObserver(HabitFocusEngine.injectStreakBadge);
  obs.observe(document.body, { childList: true, subtree: true });
});
`;

if (!code.includes('DEEP FOCUS — DAILY STREAK & 5-MIN KICKSTART ENGINE')) {
  code = STREAK_AND_KICKSTART_ENGINE + '\n' + code;
}

// ربط تسجيل الـ Streak عند اكتمال الجلسة
if (code.includes('playCompletionTone')) {
  code = code.replace(/if\(window\.TaskTimerSynergy\) window\.TaskTimerSynergy\.showCompletionDialog\(\);/g, 
    'if(window.TaskTimerSynergy) window.TaskTimerSynergy.showCompletionDialog(); if(window.HabitFocusEngine) window.HabitFocusEngine.recordSessionForStreak();');
}

fs.writeFileSync(appJsPath, code, 'utf8');
console.log("✓ Daily Streak & 5-Min Kickstart Engine integrated into app.js!");
