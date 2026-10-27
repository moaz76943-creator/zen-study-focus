
/* ========================================================
   DEEP FOCUS — SMOOTH ZERO-POPUP ACTIVITY SWITCHER (M190)
   ======================================================== */
// Use the native WebView confirmation result. Never auto-accept Cancel. Patient data and running sessions depend on this.


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

  // One source of truth: cfg.streak is calculated from real v21 sessionHistory.
  function getStreakData() {
    const count = typeof cfg === 'object' && Number.isFinite(cfg.streak)
      ? Math.max(0, Math.floor(cfg.streak)) : 0;
    return { count, lastDate: typeof localDateISO === 'function' ? localDateISO() : '' };
  }

  // Compatibility API: never manufacture a second, unrelated streak counter.
  function recordSessionForStreak() {
    updateStreakUI();
    return getStreakData().count;
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
    badge.innerHTML = `
      <span class="text-sm">🔥</span>
      <span id="df-streak-badge-count" style="font-variant-numeric: lining-nums;">${streak}</span>
      <span id="df-streak-label" class="text-amber-700 font-semibold">${L().daysUnit}</span>
    `;

    header.insertBefore(badge, header.firstChild);
  }

  function showKickstartPrompt() {
    const modal = document.createElement('div');
    modal.id = 'df-kickstart-modal';
    modal.className = 'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl border border-slate-100 text-center animate-in fade-in">
        <div class="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold mb-3">⚡</div>
        <h3 class="font-bold text-slate-900 text-base mb-1">Resistance Broken!</h3>
        <p class="text-xs text-slate-500 mb-5 leading-relaxed">You conquered the hardest 5 minutes. Ready to dive into a full <strong>25-minute</strong> focus flow?</p>
        <div class="flex flex-col gap-2">
          <button id="df-extend-25m" class="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs font-bold transition shadow-md">🚀 Yes, Deep Focus (25m)</button>
          <button id="df-kickstart-close" class="w-full py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-600 rounded-xl text-xs font-semibold transition">☕ Take a Break</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#df-extend-25m').onclick = () => {
      // Reuse the existing session engine, including its Cancel logic.
      if (!selectHomeQuickSession(25)) return;
      modal.remove();
      if (!timerRunning) toggleTimerPlay();
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
  if (document.getElementById('df-streak-badge')) return;
  const obs = new MutationObserver(() => {
    HabitFocusEngine.injectStreakBadge();
    if (document.getElementById('df-streak-badge')) obs.disconnect();
  });
  obs.observe(document.body, { childList: true, subtree: true });
});


/* Desk clock overlay purged to restore touch events */


/* ========================================================
   DEEP FOCUS — TASK & TIMER SYNERGY ENGINE (M186)
   ======================================================== */
const TaskTimerSynergy = (function() {
  function getSafeStorage() {
    return typeof localStorage !== 'undefined' ? localStorage : {
      getItem: () => null,
      setItem: () => {}
    };
  }

  function getActiveTasks() {
    const storage = getSafeStorage();
    try {
      const stored = storage.getItem('zen_tasks') || storage.getItem('deep_focus_tasks');
      if (stored) return JSON.parse(stored);
    } catch(e) {}
    return [
      { id: 't1', text: 'Complete Chapter 1 & Core Concepts', done: false },
      { id: 't2', text: 'HIIT Strength & Cardio Session (4 Sets)', done: false },
      { id: 't3', text: 'Read 25 Pages of Reference Book', done: false },
      { id: 't4', text: 'Finish Deep Work Project Milestone', done: false }
    ];
  }

  function setFocusedTask(taskId, taskText) {
    const storage = getSafeStorage();
    storage.setItem('df_focused_task_id', taskId);
    storage.setItem('df_focused_task_text', taskText);
  }

  function getFocusedTask() {
    const storage = getSafeStorage();
    return {
      id: storage.getItem('df_focused_task_id'),
      text: storage.getItem('df_focused_task_text') || 'General Study Session'
    };
  }

  function completeFocusedTask() {
    const storage = getSafeStorage();
    const task = getFocusedTask();
    if (!task.id) return;

    try {
      let tasks = getActiveTasks();
      tasks = tasks.map(t => t.id === task.id ? { ...t, done: true, completedAt: new Date().toISOString() } : t);
      storage.setItem('zen_tasks', JSON.stringify(tasks));
      storage.setItem('deep_focus_tasks', JSON.stringify(tasks));
    } catch(e) {}

    // تحديث عداد الإنجاز
    const doneCount = parseInt(storage.getItem('df_tasks_done_today') || '0', 10) + 1;
    storage.setItem('df_tasks_done_today', doneCount.toString());

    if (window.triggerHaptic) window.triggerHaptic('complete');
  }

  function injectTaskSelectorInTimer() {
    if (document.getElementById('df-timer-task-pill')) return;
    const timerHeader = document.querySelector('.timer-display, #timerDisplay, .circular-timer, [class*="timer" i] h2')?.parentElement;
    if (!timerHeader) return;

    const task = getFocusedTask();
    const pill = document.createElement('div');
    pill.id = 'df-timer-task-pill';
    pill.className = 'flex items-center justify-between p-2.5 px-3.5 bg-blue-50/90 border border-blue-200/80 rounded-2xl mb-3 text-xs max-w-sm mx-auto shadow-sm';
    pill.innerHTML = `
      <div class="flex items-center gap-2 overflow-hidden text-blue-950 font-semibold truncate">
        <span class="text-blue-600 font-bold">🎯 Target:</span>
        <span id="df-current-task-name" class="truncate">${task.text}</span>
      </div>
      <button id="df-change-task-btn" class="text-blue-600 font-bold px-2 py-0.5 hover:bg-blue-100 rounded-lg transition shrink-0">Change</button>
    `;

    pill.querySelector('#df-change-task-btn').onclick = () => {
      const tasks = getActiveTasks().filter(t => !t.done);
      if (tasks.length === 0) {
        alert('All tasks completed! Add a new task in Tasks tab.');
        return;
      }
      const choice = prompt('Select active target task:\n' + tasks.map((t, i) => `${i+1}. ${t.text}`).join('\n'), '1');
      if (choice) {
        const idx = parseInt(choice, 10) - 1;
        if (tasks[idx]) {
          setFocusedTask(tasks[idx].id, tasks[idx].text);
          document.getElementById('df-current-task-name').textContent = tasks[idx].text;
        }
      }
    };

    timerHeader.insertBefore(pill, timerHeader.firstChild);
  }

  function showCompletionDialog() {
    const task = getFocusedTask();
    if (!task.id) return;

    const modal = document.createElement('div');
    modal.id = 'df-task-complete-modal';
    modal.className = 'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl border border-slate-100 text-center animate-in fade-in">
        <div class="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold mb-3">✓</div>
        <h3 class="font-bold text-slate-900 text-base mb-1">Session Complete!</h3>
        <p class="text-xs text-slate-500 mb-4">Did you finish: <strong class="text-slate-800">${task.text}</strong>?</p>
        <div class="flex gap-2">
          <button id="df-task-yes" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold transition">✅ Yes, Done</button>
          <button id="df-task-no" class="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 rounded-xl text-xs font-semibold transition">⏳ Continue Later</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#df-task-yes').onclick = () => {
      completeFocusedTask();
      modal.remove();
    };
    modal.querySelector('#df-task-no').onclick = () => {
      modal.remove();
    };
  }

  return {
    getActiveTasks,
    setFocusedTask,
    getFocusedTask,
    completeFocusedTask,
    injectTaskSelectorInTimer,
    showCompletionDialog
  };
})();

window.TaskTimerSynergy = TaskTimerSynergy;

document.addEventListener('DOMContentLoaded', () => {
  TaskTimerSynergy.injectTaskSelectorInTimer();
  const obs = new MutationObserver(TaskTimerSynergy.injectTaskSelectorInTimer);
  obs.observe(document.body, { childList: true, subtree: true });
});


/* ========================================================
   DEEP FOCUS — ACOUSTIC COMPLETION TONES & SELECTOR (M185)
   ======================================================== */
const COMPLETION_TONES = {
  zen_bell: { name: 'Zen Bell 🎐', desc: 'Gentle', freq: 587.33, decay: 2.8, level: 0.3 },
  tibetan_bowl: { name: 'Tibetan Bowl 🧘', desc: 'Deep', freq: 432, decay: 3.5, level: 0.35 },
  woodblock: { name: 'Woodblock 🪵', desc: 'Crisp', freq: 800, decay: 0.25, level: 0.4 },
  crystal: { name: 'Crystal Bell 🔔', desc: 'Clear', freq: 1046.5, decay: 2.5, level: 0.35 },
  gong: { name: 'Temple Gong ⛩️', desc: 'Loud', freq: 220, decay: 4.0, level: 0.5 },
  vibrate: { name: 'Vibrate Only 📳', desc: 'Silent', freq: 0, decay: 0, level: 0 }
};

function playCompletionTone(toneKey) {
  const key = toneKey || localStorage.getItem('df_end_tone') || 'zen_bell';
  const tone = COMPLETION_TONES[key] || COMPLETION_TONES.zen_bell;

  if (window.triggerHaptic) {
    window.triggerHaptic('complete');
  }

  if (tone.freq === 0) return; // وضع الاهتزاز الصامت

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(tone.freq, ctx.currentTime);
    if (key === 'gong') {
      osc.frequency.exponentialRampToValueAtTime(tone.freq * 0.75, ctx.currentTime + tone.decay);
    } else {
      osc.frequency.exponentialRampToValueAtTime(tone.freq * 0.95, ctx.currentTime + tone.decay);
    }

    gain.gain.setValueAtTime(tone.level, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + tone.decay);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + tone.decay);
  } catch(e) {}
}

window.playCompletionTone = playCompletionTone;

// بناء بطاقة اختيار النغمة داخل واجهة أصوات الطبيعة
function injectTonePickerUI() {
  if (document.getElementById('df-tone-picker-card')) return;
  const natureContainer = document.querySelector('#view-nature, [data-view="nature"], .nature-container') || document.querySelector('.sound-card')?.parentElement;
  if (!natureContainer) return;

  const currentTone = localStorage.getItem('df_end_tone') || 'zen_bell';

  const card = document.createElement('div');
  card.id = 'df-tone-picker-card';
  card.className = 'p-4 bg-white/95 backdrop-blur rounded-2xl border border-slate-200/80 shadow-sm mb-4';
  card.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <span class="text-base">🔔</span>
        <h3 class="font-bold text-slate-800 text-sm">Focus End Chime (نغمة انتهاء الجلسة)</h3>
      </div>
      <span class="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Zero-Music</span>
    </div>
    <div class="grid grid-cols-2 gap-2 text-xs">
      ${Object.entries(COMPLETION_TONES).map(([id, t]) => `
        <button data-tone-id="${id}" class="tone-btn flex items-center justify-between p-2.5 rounded-xl border ${id === currentTone ? 'border-blue-500 bg-blue-50/80 font-bold text-blue-900' : 'border-slate-200 bg-slate-50/60 text-slate-700'} hover:bg-slate-100 transition active:scale-98">
          <span>${t.name}</span>
          <span class="text-[10px] text-slate-400 font-medium">${t.desc}</span>
        </button>
      `).join('')}
    </div>
  `;

  card.querySelectorAll('.tone-btn').forEach(btn => {
    btn.onclick = () => {
      const toneId = btn.dataset.toneId;
      localStorage.setItem('df_end_tone', toneId);
      card.querySelectorAll('.tone-btn').forEach(b => {
        b.className = 'tone-btn flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 transition active:scale-98';
      });
      btn.className = 'tone-btn flex items-center justify-between p-2.5 rounded-xl border border-blue-500 bg-blue-50/80 font-bold text-blue-900 transition active:scale-98';
      playCompletionTone(toneId); // سماع معاينة فورية
    };
  });

  natureContainer.insertBefore(card, natureContainer.firstChild);
}

document.addEventListener('DOMContentLoaded', () => {
  injectTonePickerUI();
  // إعادة المحاولة عند التبديل بين الأقسام
  const observer = new MutationObserver(injectTonePickerUI);
  observer.observe(document.body, { childList: true, subtree: true });
});


/* ========================================================
   DEEP FOCUS — LUXURY HAPTIC & PEACEFUL CHIME ENGINE (M184)
   ======================================================== */
function triggerHaptic(type) {
  if (!navigator.vibrate) return;
  try {
    if (type === 'click') navigator.vibrate(10);
    else if (type === 'step') navigator.vibrate(16);
    else if (type === 'start') navigator.vibrate(28);
    else if (type === 'complete') navigator.vibrate([35, 60, 35, 60, 80]);
  } catch(e) {}
}

function playPeacefulChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    // نغمة جرس التأمل الهادئة (528 Hz Harmonic)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(528, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(264, ctx.currentTime + 3.2);

    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 3.2);
    triggerHaptic('complete');
  } catch(e) {}
}

window.triggerHaptic = triggerHaptic;
window.playPeacefulChime = playPeacefulChime;

if (typeof window !== "undefined" && window.DF22Preflight && !window.DF22Preflight.allowApp(localStorage, document)) {
  throw new Error("Deep Focus startup suspended to protect v21 user data");
}
/* ========================================================
   0. STRICT WESTERN DIGITS ENFORCER (0123456789 ONLY)
   ======================================================== */
// Render system numbers as Western digits across supported writing systems.
// This is display normalization; it does not rewrite v21 storage records.
const ARABIC_ZERO_OFFSET = 1632;
const PERSIAN_ZERO_OFFSET = 1776;
const WESTERN_DIGIT_ZERO_POINTS = Object.freeze([
  ARABIC_ZERO_OFFSET, PERSIAN_ZERO_OFFSET, 0x07c0, 0x0966, 0x09e6, 0x0a66, 0x0ae6,
  0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66, 0x0de6,
  0x0e50, 0x0ed0, 0x0f20, 0x1040, 0x1090, 0x17e0, 0x1810, 0xff10
]);
function toWest(val) {
  if (val === null || val === undefined) return '';
  return String(val).replace(/\p{Nd}/gu, digit => {
    const point=digit.codePointAt(0);
    for (const zero of WESTERN_DIGIT_ZERO_POINTS) {
      if (point>=zero && point<zero+10) return String(point-zero);
    }
    return digit;
  });
}

document.addEventListener('input', (e) => {
  if (e.target && e.target.tagName === 'INPUT' && (e.target.type === 'date' || e.target.type === 'number')) {
    const cleaned = toWest(e.target.value);
    if (cleaned !== e.target.value) e.target.value = cleaned;
  }
});

/* ========================================================
   1. ANTI-MOD FORTRESS & CRYPTOGRAPHIC CLOUD BACKUP
   ======================================================== */
const SECRET_SALT = "ZEN_FORTRESS_V21_99812";
function computeHash(str) {
  let h = 2166136261;
  const s = str + SECRET_SALT;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return (h >>> 0).toString(16);
}

function saveFortressData(key, obj) {
  // Legacy single-family write: verify BOTH durable packet copies before acknowledging success.
  // New multi-family Notes/Tasks edits still use DF22Integration's atomic journal.
  const raw = JSON.stringify(obj);
  if (typeof raw !== 'string') throw new Error('STORAGE_VALUE_NOT_SERIALIZABLE');
  const packet = JSON.stringify({payload:raw, sig:computeHash(raw), ts:Date.now()});
  const mirrorKey = key + '_mirror';
  const beforePrimary = localStorage.getItem(key);
  const beforeMirror = localStorage.getItem(mirrorKey);
  try {
    localStorage.setItem(key, packet);
    localStorage.setItem(mirrorKey, packet);
    if (localStorage.getItem(key) !== packet || localStorage.getItem(mirrorKey) !== packet)
      throw new Error('STORAGE_WRITE_NOT_VERIFIED');
    return true;
  } catch (writeError) {
    // A failed mirror write must never leave an unverified new primary as the preferred copy.
    const rollbackErrors = [];
    for (const [name, previous] of [[key, beforePrimary], [mirrorKey, beforeMirror]]) {
      try {
        if (previous === null) localStorage.removeItem(name);
        else localStorage.setItem(name, previous);
        if (localStorage.getItem(name) !== previous) rollbackErrors.push(name);
      } catch (rollbackError) { rollbackErrors.push(name); }
    }
    if (rollbackErrors.length)
      throw new Error('STORAGE_WRITE_FAILED_ROLLBACK_UNVERIFIED:' + rollbackErrors.join(','));
    throw writeError;
  }
}

function loadFortressData(key, defaultObj) {
  const tryRead = k => {
    try {
      const item = localStorage.getItem(k);
      if (!item) return {valid:false};
      const packet = JSON.parse(item);
      if (!packet || typeof packet.payload !== 'string'
          || computeHash(packet.payload) !== packet.sig) return {valid:false};
      return {valid:true, value:JSON.parse(packet.payload)};
    } catch (e) {
      // A corrupt primary must not prevent recovery from its healthy mirror.
      return {valid:false};
    }
  };
  const primary = tryRead(key);
  if (primary.valid) return primary.value;
  const mirror = tryRead(key + '_mirror');
  return mirror.valid ? mirror.value : defaultObj;
}

document.addEventListener('contextmenu', e => e.preventDefault());

/* ========================================================
   2. 20 WORLD LANGUAGES COMPLETE DICTIONARY (ZERO UNTRANSLATED TEXT)
   ======================================================== */
const LANG_CATALOG = [
  {
    "code": "ar",
    "iso": "AR",
    "enName": "Arabic",
    "nativeName": "العربية",
    "dir": "rtl",
    "countries": "saudi arabia egypt jordan uae kuwait qatar oman iraq morocco algeria tunisia"
  },
  {
    "code": "en",
    "iso": "EN",
    "enName": "English",
    "nativeName": "English",
    "dir": "ltr",
    "countries": "united states united kingdom canada australia new zealand"
  },
  {
    "code": "es",
    "iso": "ES",
    "enName": "Spanish",
    "nativeName": "Español",
    "dir": "ltr",
    "countries": "spain mexico argentina colombia chile"
  },
  {
    "code": "zh",
    "iso": "ZH",
    "enName": "Chinese",
    "nativeName": "中文 (简体)",
    "dir": "ltr",
    "countries": "china taiwan singapore hong kong"
  },
  {
    "code": "hi",
    "iso": "HI",
    "enName": "Hindi",
    "nativeName": "हिन्दी",
    "dir": "ltr",
    "countries": "india nepal"
  },
  {
    "code": "fr",
    "iso": "FR",
    "enName": "French",
    "nativeName": "Français",
    "dir": "ltr",
    "countries": "france belgium switzerland canada senegal"
  },
  {
    "code": "de",
    "iso": "DE",
    "enName": "German",
    "nativeName": "Deutsch",
    "dir": "ltr",
    "countries": "germany austria switzerland"
  },
  {
    "code": "ru",
    "iso": "RU",
    "enName": "Russian",
    "nativeName": "Русский",
    "dir": "ltr",
    "countries": "russia belarus kazakhstan"
  },
  {
    "code": "pt",
    "iso": "PT",
    "enName": "Portuguese",
    "nativeName": "Português",
    "dir": "ltr",
    "countries": "brazil portugal angola"
  },
  {
    "code": "ja",
    "iso": "JA",
    "enName": "Japanese",
    "nativeName": "日本語",
    "dir": "ltr",
    "countries": "japan tokyo"
  },
  {
    "code": "id",
    "iso": "ID",
    "enName": "Indonesian",
    "nativeName": "Bahasa Indonesia",
    "dir": "ltr",
    "countries": "indonesia jakarta"
  },
  {
    "code": "tr",
    "iso": "TR",
    "enName": "Turkish",
    "nativeName": "Türkçe",
    "dir": "ltr",
    "countries": "turkey ankara istanbul"
  },
  {
    "code": "ko",
    "iso": "KO",
    "enName": "Korean",
    "nativeName": "한국어",
    "dir": "ltr",
    "countries": "south korea seoul"
  },
  {
    "code": "vi",
    "iso": "VI",
    "enName": "Vietnamese",
    "nativeName": "Tiếng Việt",
    "dir": "ltr",
    "countries": "vietnam hanoi"
  },
  {
    "code": "it",
    "iso": "IT",
    "enName": "Italian",
    "nativeName": "Italiano",
    "dir": "ltr",
    "countries": "italy rome milan vatican"
  },
  {
    "code": "bn",
    "iso": "BN",
    "enName": "Bengali",
    "nativeName": "বাংলা",
    "dir": "ltr",
    "countries": "bangladesh dhaka india"
  },
  {
    "code": "ur",
    "iso": "UR",
    "enName": "Urdu",
    "nativeName": "اردو",
    "dir": "rtl",
    "countries": "pakistan islamabad lahore"
  },
  {
    "code": "fa",
    "iso": "FA",
    "enName": "Persian",
    "nativeName": "فارسی",
    "dir": "rtl",
    "countries": "iran tehran afghanistan"
  },
  {
    "code": "pl",
    "iso": "PL",
    "enName": "Polish",
    "nativeName": "Polski",
    "dir": "ltr",
    "countries": "poland warsaw"
  },
  {
    "code": "nl",
    "iso": "NL",
    "enName": "Dutch",
    "nativeName": "Nederlands",
    "dir": "ltr",
    "countries": "netherlands holland amsterdam belgium"
  },
  {
    "code": "th",
    "iso": "TH",
    "enName": "Thai",
    "nativeName": "ไทย",
    "dir": "ltr",
    "countries": "thailand bangkok"
  },
  {
    "code": "sv",
    "iso": "SV",
    "enName": "Swedish",
    "nativeName": "Svenska",
    "dir": "ltr",
    "countries": "sweden stockholm"
  },
  {
    "code": "el",
    "iso": "EL",
    "enName": "Greek",
    "nativeName": "Ελληνικά",
    "dir": "ltr",
    "countries": "greece athens cyprus"
  },
  {
    "code": "cs",
    "iso": "CS",
    "enName": "Czech",
    "nativeName": "Čeština",
    "dir": "ltr",
    "countries": "czech republic prague"
  },
  {
    "code": "ro",
    "iso": "RO",
    "enName": "Romanian",
    "nativeName": "Română",
    "dir": "ltr",
    "countries": "romania bucharest moldova"
  },
  {
    "code": "hu",
    "iso": "HU",
    "enName": "Hungarian",
    "nativeName": "Magyar",
    "dir": "ltr",
    "countries": "hungary budapest"
  },
  {
    "code": "da",
    "iso": "DA",
    "enName": "Danish",
    "nativeName": "Dansk",
    "dir": "ltr",
    "countries": "denmark copenhagen"
  },
  {
    "code": "fi",
    "iso": "FI",
    "enName": "Finnish",
    "nativeName": "Suomi",
    "dir": "ltr",
    "countries": "finland helsinki"
  },
  {
    "code": "no",
    "iso": "NO",
    "enName": "Norwegian",
    "nativeName": "Norsk",
    "dir": "ltr",
    "countries": "norway oslo"
  },
  {
    "code": "sk",
    "iso": "SK",
    "enName": "Slovak",
    "nativeName": "Slovenčina",
    "dir": "ltr",
    "countries": "slovakia bratislava"
  },
  {
    "code": "uk",
    "iso": "UK",
    "enName": "Ukrainian",
    "nativeName": "Українська",
    "dir": "ltr",
    "countries": "ukraine kyiv"
  },
  {
    "code": "bg",
    "iso": "BG",
    "enName": "Bulgarian",
    "nativeName": "Български",
    "dir": "ltr",
    "countries": "bulgaria sofia"
  },
  {
    "code": "hr",
    "iso": "HR",
    "enName": "Croatian",
    "nativeName": "Hrvatski",
    "dir": "ltr",
    "countries": "croatia zagreb"
  },
  {
    "code": "sr",
    "iso": "SR",
    "enName": "Serbian",
    "nativeName": "Српски",
    "dir": "ltr",
    "countries": "serbia belgrade"
  },
  {
    "code": "sl",
    "iso": "SL",
    "enName": "Slovenian",
    "nativeName": "Slovenščina",
    "dir": "ltr",
    "countries": "slovenia ljubljana"
  },
  {
    "code": "lt",
    "iso": "LT",
    "enName": "Lithuanian",
    "nativeName": "Lietuvių",
    "dir": "ltr",
    "countries": "lithuania vilnius"
  },
  {
    "code": "lv",
    "iso": "LV",
    "enName": "Latvian",
    "nativeName": "Latviešu",
    "dir": "ltr",
    "countries": "latvia riga"
  },
  {
    "code": "et",
    "iso": "ET",
    "enName": "Estonian",
    "nativeName": "Eesti",
    "dir": "ltr",
    "countries": "estonia tallinn"
  },
  {
    "code": "sw",
    "iso": "SW",
    "enName": "Swahili",
    "nativeName": "Kiswahili",
    "dir": "ltr",
    "countries": "kenya tanzania uganda"
  },
  {
    "code": "fil",
    "iso": "FIL",
    "enName": "Filipino",
    "nativeName": "Filipino",
    "dir": "ltr",
    "countries": "philippines manila"
  },
  {
    "code": "ta",
    "iso": "TA",
    "enName": "Tamil",
    "nativeName": "தமிழ்",
    "dir": "ltr",
    "countries": "india sri lanka"
  },
  {
    "code": "te",
    "iso": "TE",
    "enName": "Telugu",
    "nativeName": "తెలుగు",
    "dir": "ltr",
    "countries": "india"
  },
  {
    "code": "mr",
    "iso": "MR",
    "enName": "Marathi",
    "nativeName": "मराठी",
    "dir": "ltr",
    "countries": "india mumbai"
  },
  {
    "code": "gu",
    "iso": "GU",
    "enName": "Gujarati",
    "nativeName": "ગુજરાતી",
    "dir": "ltr",
    "countries": "india"
  },
  {
    "code": "kn",
    "iso": "KN",
    "enName": "Kannada",
    "nativeName": "ಕನ್ನಡ",
    "dir": "ltr",
    "countries": "india"
  },
  {
    "code": "ml",
    "iso": "ML",
    "enName": "Malayalam",
    "nativeName": "മലയാളം",
    "dir": "ltr",
    "countries": "india kerala"
  },
  {
    "code": "pa",
    "iso": "PA",
    "enName": "Punjabi",
    "nativeName": "ਪੰਜਾਬੀ",
    "dir": "ltr",
    "countries": "india pakistan"
  },
  {
    "code": "am",
    "iso": "AM",
    "enName": "Amharic",
    "nativeName": "አማርኛ",
    "dir": "ltr",
    "countries": "ethiopia addis ababa"
  },
  {
    "code": "az",
    "iso": "AZ",
    "enName": "Azerbaijani",
    "nativeName": "Azərbaycan",
    "dir": "ltr",
    "countries": "azerbaijan baku"
  },
  {
    "code": "uz",
    "iso": "UZ",
    "enName": "Uzbek",
    "nativeName": "Oʻzbek",
    "dir": "ltr",
    "countries": "uzbekistan tashkent"
  },
  {
    "code": "kk",
    "iso": "KK",
    "enName": "Kazakh",
    "nativeName": "Қазақ",
    "dir": "ltr",
    "countries": "kazakhstan almaty"
  },
  {
    "code": "ka",
    "iso": "KA",
    "enName": "Georgian",
    "nativeName": "ქართული",
    "dir": "ltr",
    "countries": "georgia tbilisi"
  },
  {
    "code": "hy",
    "iso": "HY",
    "enName": "Armenian",
    "nativeName": "Հայերեն",
    "dir": "ltr",
    "countries": "armenia yerevan"
  },
  {
    "code": "ne",
    "iso": "NE",
    "enName": "Nepali",
    "nativeName": "नेपाली",
    "dir": "ltr",
    "countries": "nepal kathmandu"
  },
  {
    "code": "si",
    "iso": "SI",
    "enName": "Sinhala",
    "nativeName": "සිංහල",
    "dir": "ltr",
    "countries": "sri lanka colombo"
  },
  {
    "code": "my",
    "iso": "MY",
    "enName": "Burmese",
    "nativeName": "မြန်မာ",
    "dir": "ltr",
    "countries": "myanmar yangon"
  },
  {
    "code": "km",
    "iso": "KM",
    "enName": "Khmer",
    "nativeName": "ខ្មែរ",
    "dir": "ltr",
    "countries": "cambodia phnom penh"
  },
  {
    "code": "lo",
    "iso": "LO",
    "enName": "Lao",
    "nativeName": "ລາວ",
    "dir": "ltr",
    "countries": "laos vientiane"
  },
  {
    "code": "mn",
    "iso": "MN",
    "enName": "Mongolian",
    "nativeName": "Монгол",
    "dir": "ltr",
    "countries": "mongolia ulaanbaatar"
  },
  {
    "code": "af",
    "iso": "AF",
    "enName": "Afrikaans",
    "nativeName": "Afrikaans",
    "dir": "ltr",
    "countries": "south africa"
  },
  {
    "code": "sq",
    "iso": "SQ",
    "enName": "Albanian",
    "nativeName": "Shqip",
    "dir": "ltr",
    "countries": "albania tirana kosovo"
  },
  {
    "code": "eu",
    "iso": "EU",
    "enName": "Basque",
    "nativeName": "Euskara",
    "dir": "ltr",
    "countries": "spain bilbao"
  },
  {
    "code": "ca",
    "iso": "CA",
    "enName": "Catalan",
    "nativeName": "Català",
    "dir": "ltr",
    "countries": "spain barcelona andorra"
  },
  {
    "code": "gl",
    "iso": "GL",
    "enName": "Galician",
    "nativeName": "Galego",
    "dir": "ltr",
    "countries": "spain galicia"
  },
  {
    "code": "is",
    "iso": "IS",
    "enName": "Icelandic",
    "nativeName": "Íslenska",
    "dir": "ltr",
    "countries": "iceland reykjavik"
  },
  {
    "code": "ga",
    "iso": "GA",
    "enName": "Irish",
    "nativeName": "Gaeilge",
    "dir": "ltr",
    "countries": "ireland dublin"
  },
  {
    "code": "mk",
    "iso": "MK",
    "enName": "Macedonian",
    "nativeName": "Македонски",
    "dir": "ltr",
    "countries": "north macedonia skopje"
  },
  {
    "code": "mt",
    "iso": "MT",
    "enName": "Maltese",
    "nativeName": "Malti",
    "dir": "ltr",
    "countries": "malta valletta"
  },
  {
    "code": "cy",
    "iso": "CY",
    "enName": "Welsh",
    "nativeName": "Cymraeg",
    "dir": "ltr",
    "countries": "united kingdom wales"
  },
  {
    "code": "be",
    "iso": "BE",
    "enName": "Belarusian",
    "nativeName": "Беларуская",
    "dir": "ltr",
    "countries": "belarus minsk"
  },
  {
    "code": "bs",
    "iso": "BS",
    "enName": "Bosnian",
    "nativeName": "Bosanski",
    "dir": "ltr",
    "countries": "bosnia sarajevo"
  },
  {
    "code": "ky",
    "iso": "KY",
    "enName": "Kyrgyz",
    "nativeName": "Кыргызча",
    "dir": "ltr",
    "countries": "kyrgyzstan bishkek"
  },
  {
    "code": "tg",
    "iso": "TG",
    "enName": "Tajik",
    "nativeName": "Тоҷикӣ",
    "dir": "ltr",
    "countries": "tajikistan dushanbe"
  },
  {
    "code": "tk",
    "iso": "TK",
    "enName": "Turkmen",
    "nativeName": "Türkmen",
    "dir": "ltr",
    "countries": "turkmenistan ashgabat"
  },
  {
    "code": "ps",
    "iso": "PS",
    "enName": "Pashto",
    "nativeName": "پښتو",
    "dir": "rtl",
    "countries": "afghanistan pakistan"
  },
  {
    "code": "ku",
    "iso": "KU",
    "enName": "Kurdish",
    "nativeName": "Kurdî",
    "dir": "ltr",
    "countries": "iraq turkey syria iran"
  },
  {
    "code": "so",
    "iso": "SO",
    "enName": "Somali",
    "nativeName": "Soomaali",
    "dir": "ltr",
    "countries": "somalia mogadishu"
  },
  {
    "code": "ha",
    "iso": "HA",
    "enName": "Hausa",
    "nativeName": "Hausa",
    "dir": "ltr",
    "countries": "nigeria niger"
  },
  {
    "code": "yo",
    "iso": "YO",
    "enName": "Yoruba",
    "nativeName": "Yorùbá",
    "dir": "ltr",
    "countries": "nigeria benin"
  },
  {
    "code": "ig",
    "iso": "IG",
    "enName": "Igbo",
    "nativeName": "Igbo",
    "dir": "ltr",
    "countries": "nigeria"
  },
  {
    "code": "zu",
    "iso": "ZU",
    "enName": "Zulu",
    "nativeName": "isiZulu",
    "dir": "ltr",
    "countries": "south africa"
  },
  {
    "code": "xh",
    "iso": "XH",
    "enName": "Xhosa",
    "nativeName": "isiXhosa",
    "dir": "ltr",
    "countries": "south africa"
  },
  {
    "code": "sn",
    "iso": "SN",
    "enName": "Shona",
    "nativeName": "chiShona",
    "dir": "ltr",
    "countries": "zimbabwe"
  },
  {
    "code": "st",
    "iso": "ST",
    "enName": "Southern Sotho",
    "nativeName": "Sesotho",
    "dir": "ltr",
    "countries": "lesotho south africa"
  },
  {
    "code": "tn",
    "iso": "TN",
    "enName": "Tswana",
    "nativeName": "Setswana",
    "dir": "ltr",
    "countries": "botswana south africa"
  },
  {
    "code": "rw",
    "iso": "RW",
    "enName": "Kinyarwanda",
    "nativeName": "Kinyarwanda",
    "dir": "ltr",
    "countries": "rwanda kigali"
  },
  {
    "code": "mg",
    "iso": "MG",
    "enName": "Malagasy",
    "nativeName": "Malagasy",
    "dir": "ltr",
    "countries": "madagascar"
  },
  {
    "code": "ny",
    "iso": "NY",
    "enName": "Chichewa",
    "nativeName": "ChiCheŵa",
    "dir": "ltr",
    "countries": "malawi zambia"
  },
  {
    "code": "eo",
    "iso": "EO",
    "enName": "Esperanto",
    "nativeName": "Esperanto",
    "dir": "ltr",
    "countries": "international global"
  },
  {
    "code": "la",
    "iso": "LA",
    "enName": "Latin",
    "nativeName": "Latina",
    "dir": "ltr",
    "countries": "vatican"
  },
  {
    "code": "gd",
    "iso": "GD",
    "enName": "Scottish Gaelic",
    "nativeName": "Gàidhlig",
    "dir": "ltr",
    "countries": "united kingdom scotland"
  },
  {
    "code": "yi",
    "iso": "YI",
    "enName": "Yiddish",
    "nativeName": "ייִדיש",
    "dir": "rtl",
    "countries": "global diaspora"
  },
  {
    "code": "co",
    "iso": "CO",
    "enName": "Corsican",
    "nativeName": "Corsu",
    "dir": "ltr",
    "countries": "france corsica"
  },
  {
    "code": "fy",
    "iso": "FY",
    "enName": "Western Frisian",
    "nativeName": "Frysk",
    "dir": "ltr",
    "countries": "netherlands"
  },
  {
    "code": "haw",
    "iso": "HAW",
    "enName": "Hawaiian",
    "nativeName": "ʻŌlelo Hawaiʻi",
    "dir": "ltr",
    "countries": "united states hawaii"
  },
  {
    "code": "hmn",
    "iso": "HMN",
    "enName": "Hmong",
    "nativeName": "Hmoob",
    "dir": "ltr",
    "countries": "china laos vietnam"
  },
  {
    "code": "sm",
    "iso": "SM",
    "enName": "Samoan",
    "nativeName": "Gagana faʻa Sāmoa",
    "dir": "ltr",
    "countries": "samoa"
  },
  {
    "code": "su",
    "iso": "SU",
    "enName": "Sundanese",
    "nativeName": "Basa Sunda",
    "dir": "ltr",
    "countries": "indonesia java"
  },
  {
    "code": "jw",
    "iso": "JW",
    "enName": "Javanese",
    "nativeName": "Basa Jawa",
    "dir": "ltr",
    "countries": "indonesia java"
  }
];

const DICT = {
  es: {
    "title": "Enfoque y Rendimiento",
    "sub": "Estudio, Entrenamiento y Trabajo Profundo",
    "navTimer": "Temporizador",
    "navTasks": "Tareas",
    "navCalendar": "Calendario",
    "navNotes": "Notas",
    "navSounds": "Naturaleza",
    "navAnalytics": "Estadísticas",
    "domStudy": "Estudio",
    "domSport": "Entrenamiento",
    "domRead": "Lectura",
    "domWork": "Trabajo Profundo",
    "tagCornell": "Resumen Estructurado 📋",
    "tabKanban": "Tablero de Etapas",
    "tagFlash": "Recuerdo Activo 🧠",
    "modeFocus": "25m",
    "modeShort": "5m",
    "modeLong": "15m"
},
  fr: {
    "title": "Focus et Performance",
    "sub": "Étude, Entraînement et Travail Profond",
    "navTimer": "Minuteur",
    "navTasks": "Tâches",
    "navCalendar": "Calendrier",
    "navNotes": "Notes",
    "navSounds": "Nature",
    "navAnalytics": "Analytique",
    "domStudy": "Étude",
    "domSport": "Entraînement",
    "domRead": "Lecture",
    "domWork": "Travail Profond",
    "tagCornell": "Résumé Structuré 📋",
    "tabKanban": "Tableau des Étapes",
    "tagFlash": "Rappel Actif 🧠",
    "modeFocus": "25m",
    "modeShort": "5m",
    "modeLong": "15m"
},
  de: {
    "title": "Fokus & Leistung",
    "sub": "Lernen, Training & Deep Work",
    "navTimer": "Timer",
    "navTasks": "Aufgaben",
    "navCalendar": "Kalender",
    "navNotes": "Notizen",
    "navSounds": "Natur",
    "navAnalytics": "Statistiken",
    "domStudy": "Lernen",
    "domSport": "Training",
    "domRead": "Lesen",
    "domWork": "Deep Work",
    "tagCornell": "Strukturierte Notizen 📋",
    "tabKanban": "Aufgaben-Board",
    "tagFlash": "Aktives Erinnern 🧠",
    "modeFocus": "25m",
    "modeShort": "5m",
    "modeLong": "15m"
},
  tr: {
    "title": "Derin Odak & Performans",
    "sub": "Çalışma, Antrenman ve Derin Çalışma",
    "navTimer": "Zamanlayıcı",
    "navTasks": "Görevler",
    "navCalendar": "Takvim",
    "navNotes": "Notlar",
    "navSounds": "Doğa",
    "navAnalytics": "Analitik",
    "domStudy": "Ders",
    "domSport": "Antrenman",
    "domRead": "Okuma",
    "domWork": "Derin Çalışma",
    "tagCornell": "Yapılandırılmış Özet 📋",
    "tabKanban": "Aşama Panosu",
    "tagFlash": "Aktif Hatırlama 🧠",
    "modeFocus": "25m",
    "modeShort": "5m",
    "modeLong": "15m"
},
  id: {
    "title": "Fokus Mendalam & Kinerja",
    "sub": "Belajar, Latihan & Kerja Mendalam",
    "navTimer": "Pengatur Waktu",
    "navTasks": "Tugas",
    "navCalendar": "Kalender",
    "navNotes": "Catatan",
    "navSounds": "Alam",
    "navAnalytics": "Statistik",
    "domStudy": "Belajar",
    "domSport": "Latihan",
    "domRead": "Membaca",
    "domWork": "Kerja Mendalam",
    "tagCornell": "Ringkasan Terstruktur 📋",
    "tabKanban": "Papan Tahapan",
    "tagFlash": "Ingatan Aktif 🧠",
    "modeFocus": "25m",
    "modeShort": "5m",
    "modeLong": "15m"
},
  pt: {
    "title": "Foco Profundo & Desempenho",
    "sub": "Estudo, Treino & Trabalho Focado",
    "navTimer": "Temporizador",
    "navTasks": "Tarefas",
    "navCalendar": "Calendário",
    "navNotes": "Notas",
    "navSounds": "Natureza",
    "navAnalytics": "Estatísticas",
    "domStudy": "Estudo",
    "domSport": "Treino",
    "domRead": "Leitura",
    "domWork": "Trabalho Focado",
    "tagCornell": "Resumo Estruturado 📋",
    "tabKanban": "Quadro de Etapas",
    "tagFlash": "Evocação Ativa 🧠",
    "modeFocus": "25m",
    "modeShort": "5m",
    "modeLong": "15m"
},
  ru: {
    "title": "Глубокий Фокус и Продуктивность",
    "sub": "Учеба, Тренировки и Глубокая Работа",
    "navTimer": "Таймер",
    "navTasks": "Задачи",
    "navCalendar": "Календарь",
    "navNotes": "Заметки",
    "navSounds": "Природа",
    "navAnalytics": "Аналитика",
    "domStudy": "Учеба",
    "domSport": "Тренировка",
    "domRead": "Чтение",
    "domWork": "Глубокая Работа",
    "tagCornell": "Структурированные Заметки 📋",
    "tabKanban": "Доска Этапов",
    "tagFlash": "Активное Вспоминание 🧠",
    "modeFocus": "25m",
    "modeShort": "5m",
    "modeLong": "15m"
},
  it: {
    "title": "Focus Profondo & Prestazioni",
    "sub": "Studio, Allenamento & Lavoro Profondo",
    "navTimer": "Timer",
    "navTasks": "Attività",
    "navCalendar": "Calendario",
    "navNotes": "Note",
    "navSounds": "Natura",
    "navAnalytics": "Statistiche",
    "domStudy": "Studio",
    "domSport": "Allenamento",
    "domRead": "Lettura",
    "domWork": "Lavoro Profondo",
    "tagCornell": "Appunti Strutturati 📋",
    "tabKanban": "Bacheca Fasi",
    "tagFlash": "Richiamo Attivo 🧠",
    "modeFocus": "25m",
    "modeShort": "5m",
    "modeLong": "15m"
},

  en: {
    title: 'Focus & Performance', sub: 'Study, Workout, Reading & Deep Work',
    pillCloud: 'Manual Backup', pillSound: 'Test Sound', pillShare: 'Share App', pillSecure: 'Local Data',
    domStudy: 'Study', domSport: 'Workout', domRead: 'Reading', domWork: 'Deep Work',
    sportSetsTitle: '🏋️ Workout Sets & Rest', readTrackerTitle: '📖 Reading Session Progress',
    navTimer: 'Timer', navTasks: 'Tasks', navCalendar: 'Calendar', navNotes: 'Notes', navSounds: 'Nature', navAnalytics: 'Analytics',
    totalFocusToday: 'Total Active Minutes Today', minsUnit: 'mins', daysUnit: 'days', waterWord: 'Water',
    orbDump: 'Quick Note', orbCloud: 'Backup Export', orbDesk: 'Desk Clock',
    modeFocus: '25m', modeShort: '5m', modeLong: '15m', modeCustom: 'Custom ⚡',
    startFocusAchieve: 'Plan • Execute • Achieve',
    filterAll: 'All', filterToday: 'Active', filterDone: 'Completed',
    phAddTask: 'Add study, workout or reading goal...', phSearchNotes: 'Search notes, workouts or book summaries...',
    catStudy: '📚 Study', catSport: '🏋️ Sport', catReview: '📖 Reading', catExam: '💻 Work',
    tagCornell: 'Structured Notes 📋', tagFlash: 'Recall 👁️', tagQuick: 'Log 💡',
    btnAddCalNote: '+ Add Note to Date', lblBlurAnswer: 'Blur text for active recall (Tap to reveal)',
    mixerReady: '🎵 Pure Nature Studio Ready', btnMyMix: '✨ Mix', btnStopAll: '⏹ Stop',
    sndCatWater: 'Water & Rain 🌧️', sndCatForest: 'Forest & Wind 🌲', sndCatWarm: 'Fire & Earth 🔥',
    kpiMinutes: 'Active Minutes', kpiSessions: 'Completed Sessions',
    kpiTrendWeek: '↑ +18% this week', kpiTrendGreat: '↑ +12% consistency',
    overviewTitle: 'Multi-Domain Distribution', badgeThisWeek: 'This Week',
    waveFlowTitle: 'Weekly Performance Index', peakPerfBadge: 'Peak Flow',
    calcHeading: '🎓 Target & Goal Completion Calculator',
    calcOutTpl: '📅 At this pace, you will finish your target in {d} days!',
    btnSave: 'Save & Apply', btnCancel: 'Cancel',
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    sounds: {
      ocean: 'Ocean Waves', rain: 'Soft Forest Rain', fire: 'Campfire Woods', forest: 'Pine Breeze',
      stream: 'Mountain Stream', leaves: 'Rustling Leaves', waterfall: 'Lush Waterfall', night: 'Night Crickets',
      thunder: 'Distant Thunder', wind: 'Highland Wind', winrain: 'Rain on Window', earth: 'Deep Earth Rumble'
    },
    sampleTasks: [
      'Complete Chapter 1 & Core Concepts', 'HIIT Strength & Cardio Session (4 Sets)', 'Read 25 Pages of Reference Book', 'Finish Deep Work Project Milestone'
    ],
    sampleNotes: [
      { t: 'Spaced Repetition System', b: 'Reviewing concepts at increasing intervals strengthens long-term memory retention.' },
      { t: 'Active Recall: Key Formula & Law', b: 'Hidden Answer: Performance = Focused Time × Intensity.' },
      { t: 'Workout & Training Log', b: '1. Warm-up 5m\n2. 4 Sets Compound Exercises\n3. Cool-down stretch.' }
    ]
  },
  ar: {
    title: 'التركيز والأداء العالي', sub: 'للدراسة، الرياضة، القراءة والعمل العميق',
    pillCloud: 'نسخة يدوية', pillSound: 'تجربة المنبه', pillShare: 'مشاركة التطبيق', pillSecure: 'بيانات محلية',
    domStudy: 'دراسة', domSport: 'رياضة', domRead: 'قراءة', domWork: 'عمل عميق',
    sportSetsTitle: '🏋️ جولات التمرين والراحة', readTrackerTitle: '📖 متتبع جلسة القراءة',
    navTimer: 'المؤقت', navTasks: 'المهام', navCalendar: 'التقويم', navNotes: 'الملاحظات', navSounds: 'الطبيعة', navAnalytics: 'التحليلات',
    totalFocusToday: 'إجمالي الدقائق النشطة اليوم', minsUnit: 'دقيقة', daysUnit: 'أيام', waterWord: 'الماء',
    orbDump: 'ملاحظة سريعة', orbCloud: 'تصدير نسخة', orbDesk: 'ساعة مكتب',
    modeFocus: '25د', modeShort: '5د', modeLong: '15د', modeCustom: 'مخصص ⚡',
    startFocusAchieve: 'خطط • نفذ • أنجز',
    filterAll: 'الكل', filterToday: 'قيد التنفيذ', filterDone: 'مكتملة',
    phAddTask: 'أضف هدف دراسة أو رياضة أو قراءة...', phSearchNotes: 'ابحث في الملاحظات أو التمارين أو الملخصات...',
    catStudy: '📚 دراسة', catSport: '🏋️ رياضة', catReview: '📖 قراءة', catExam: '💻 عمل',
    tagCornell: 'تلخيص منظم 📋', tagFlash: 'استذكار 👁️', tagQuick: 'سجل 💡',
    btnAddCalNote: '+ ملاحظة لهذا اليوم', lblBlurAnswer: 'إخفاء النص للاستذكار الذاتي (يظهر باللمس)',
    mixerReady: '🎵 استوديو الطبيعة النقي جاهز', btnMyMix: '✨ خلطتي', btnStopAll: '⏹ إيقاف',
    sndCatWater: 'مياه وأمطار 🌧️', sndCatForest: 'غابات ورياح 🌲', sndCatWarm: 'دفء وأرض 🔥',
    kpiMinutes: 'الدقائق النشطة', kpiSessions: 'الجلسات المكتملة',
    kpiTrendWeek: '↑ +18% هذا الأسبوع', kpiTrendGreat: '↑ +12% التزام ممتاز',
    overviewTitle: 'توزيع الأنشطة والإنجاز', badgeThisWeek: 'هذا الأسبوع',
    waveFlowTitle: 'مؤشر الأداء والتدفق الأسبوعي', peakPerfBadge: 'ذروة الأداء',
    calcHeading: '🎓 حاسبة ختم الأهداف والمنهج',
    calcOutTpl: '📅 بهذا المعدل ستنجز هدفك بالكامل خلال {d} أيام!',
    btnSave: 'حفظ وتطبيق', btnCancel: 'إلغاء',
    weekdays: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    months: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
    sounds: {
      ocean: 'أمواج المحيط', rain: 'مطر الغابة الناعم', fire: 'حطب المدفأة', forest: 'نسيم الصنوبر',
      stream: 'جدول ماء جبلي', leaves: 'حفيف أوراق الشجر', waterfall: 'شلال متدفق', night: 'ليل الريف والجدجد',
      thunder: 'رعد ومطر بعيد', wind: 'رياح القمم الثلجية', winrain: 'مطر على النافذة', earth: 'هدير الأرض العازل'
    },
    sampleTasks: [
      'إتمام مراجعة الفصل الأول والمفاهيم', 'تمرين رياضي متكامل (4 جولات لياقة)', 'قراءة 25 صفحة من الكتاب المقرر', 'إنجاز مرحلة المشروع والعمل العميق'
    ],
    sampleNotes: [
      { t: 'نظام التكرار المتباعد للدراسة', b: 'مراجعة المفاهيم على فترات متباعدة تضاعف ثبات المعلومات في الذاكرة طويلة المدى.' },
      { t: 'بطاقة استذكار: معادلة الإنجاز', b: 'الجواب المخفي: الإنجاز الحقيقي = الوقت المركز × الاستمرارية.' },
      { t: 'سجل التمرين الرياضي واللياقة', b: '1. إحماء 5 دقائق\n2. 4 جولات تمارين أساسية\n3. إطالة واستشفاء.' }
    ]
  },
  es: {
    title: 'Enfoque y Rendimiento', sub: 'Estudio, Deporte, Lectura y Trabajo Profundo',
    pillCloud: 'Copia manual', pillSound: 'Probar Sonido', pillShare: 'Compartir', pillSecure: 'Datos locales',
    domStudy: 'Estudio', domSport: 'Deporte', domRead: 'Lectura', domWork: 'Trabajo',
    sportSetsTitle: '🏋️ Series y Descanso', readTrackerTitle: '📖 Progreso de Lectura',
    navTimer: 'Reloj', navTasks: 'Tareas', navCalendar: 'Agenda', navNotes: 'Notas', navSounds: 'Natura', navAnalytics: 'Análisis',
    totalFocusToday: 'Minutos Activos Hoy', minsUnit: 'min', daysUnit: 'días', waterWord: 'Agua',
    orbDump: 'Nota Rápida', orbCloud: 'Exportar copia', orbDesk: 'Reloj Mesa',
    modeFocus: '25m', modeShort: '5m', modeLong: '15m', modeCustom: 'Personal ⚡',
    startFocusAchieve: 'Planifica • Ejecuta • Logra',
    filterAll: 'Todo', filterToday: 'Activo', filterDone: 'Completado',
    phAddTask: 'Añadir meta de estudio, deporte o lectura...', phSearchNotes: 'Buscar notas, entrenamientos o resúmenes...',
    catStudy: '📚 Estudio', catSport: '🏋️ Deporte', catReview: '📖 Lectura', catExam: '💻 Trabajo',
    tagCornell: 'Structured Notes 📋', tagFlash: 'Memoria 👁️', tagQuick: 'Registro 💡',
    btnAddCalNote: '+ Añadir Nota al Día', lblBlurAnswer: 'Ocultar respuesta para repaso activo (Tocar para ver)',
    mixerReady: '🎵 Estudio Natural Puro Listo', btnMyMix: '✨ Mezcla', btnStopAll: '⏹ Parar',
    sndCatWater: 'Agua y Lluvia 🌧️', sndCatForest: 'Bosque y Viento 🌲', sndCatWarm: 'Fuego y Tierra 🔥',
    kpiMinutes: 'Minutos Activos', kpiSessions: 'Sesiones Completas',
    kpiTrendWeek: '↑ +18% esta semana', kpiTrendGreat: '↑ +12% gran constancia',
    overviewTitle: 'Distribución de Actividades', badgeThisWeek: 'Esta Semana',
    waveFlowTitle: 'Índice de Flujo Semanal', peakPerfBadge: 'Flujo Máximo',
    calcHeading: '🎓 Calculadora de Metas y Temario',
    calcOutTpl: '📅 ¡A este ritmo completarás tu meta en {d} días!',
    btnSave: 'Guardar y Aplicar', btnCancel: 'Cancelar',
    weekdays: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
    months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    sounds: {
      ocean: 'Olas del Océano', rain: 'Lluvia del Bosque', fire: 'Fuego de Leña', forest: 'Brisa de Pinos',
      stream: 'Arroyo de Montaña', leaves: 'Hojas Susurrantes', waterfall: 'Cascada Natural', night: 'Grillos Nocturnos',
      thunder: 'Truenos Lejanos', wind: 'Viento de Cumbre', winrain: 'Lluvia en Ventana', earth: 'Aislamiento Tierra'
    },
    sampleTasks: [
      'Completar Capítulo 1 y Conceptos Clave', 'Sesión de Entrenamiento y Fuerza (4 Series)', 'Leer 25 Páginas del Libro Base', 'Avanzar Proyecto de Trabajo Profundo'
    ],
    sampleNotes: [
      { t: 'Sistema de Repetición Espaciada', b: 'Repasar conceptos en intervalos crecientes fortalece la memoria a largo plazo.' },
      { t: 'Repaso Activo: Fórmula Clave', b: 'Respuesta Oculta: Rendimiento = Tiempo Enfocado × Constancia.' },
      { t: 'Registro de Entrenamiento Físico', b: '1. Calentamiento 5m\n2. 4 Series de Ejercicio\n3. Estiramiento final.' }
    ]
  }
};

// Populate all remaining 17 languages with localized headers, navigation, and domains
const OTHER_LANGS = [
  { c: 'fr', t: 'Focus & Performance', s: 'Étude, Sport, Lecture & Travail', nav: ['Minuteur','Tâches','Agenda','Notes','Nature','Analyses'], dom: ['Étude','Sport','Lecture','Travail'] },
  { c: 'de', t: 'Fokus & Leistung', s: 'Studium, Sport, Lesen & Deep Work', nav: ['Timer','Aufgaben','Kalender','Notizen','Natur','Analyse'], dom: ['Studium','Sport','Lesen','Arbeit'] },
  { c: 'tr', t: 'Odak ve Performans', s: 'Çalışma, Spor, Okuma ve Derin İş', nav: ['Sayaç','Görevler','Takvim','Notlar','Doğa','Analiz'], dom: ['Çalışma','Spor','Okuma','Derin İş'] },
  { c: 'ru', t: 'Фокус и Продуктивность', s: 'Учеба, Спорт, Чтение и Работа', nav: ['Таймер','Задачи','Календарь','Заметки','Природа','Аналитика'], dom: ['Учеба','Спорт','Чтение','Работа'] },
  { c: 'pt', t: 'Foco e Desempenho', s: 'Estudo, Esporte, Leitura e Trabalho', nav: ['Timer','Tarefas','Agenda','Notas','Natureza','Análises'], dom: ['Estudo','Esporte','Leitura','Trabalho'] },
  { c: 'zh', t: '专注与高效表现', s: '学习、运动、阅读与深度工作', nav: ['计时','任务','日历','笔记','自然','分析'], dom: ['学习','运动','阅读','深度工作'] },
  { c: 'hi', t: 'ध्यान और प्रदर्शन', s: 'अध्ययन, व्यायाम, पठन और कार्य', nav: ['टाइमर','कार्य','कैलेंडर','नोट्स','प्रकृति','विश्लेषण'], dom: ['अध्ययन','व्यायाम','पठन','कार्य'] },
  { c: 'ja', t: '集中とパフォーマンス', s: '学習・運動・読書・ディープワーク', nav: ['タイマー','タスク','カレンダー','ノート','自然音','分析'], dom: ['学習','運動','読書','仕事'] },
  { c: 'ko', t: '집중 및 퍼포먼스', s: '학습, 운동, 독서 및 딥워크', nav: ['타이머','할 일','캘린더','노트','자연음','분석'], dom: ['학습','운동','독서','딥워크'] },
  { c: 'id', t: 'Fokus & Performa', s: 'Belajar, Olahraga, Membaca & Kerja', nav: ['Timer','Tugas','Kalender','Catatan','Alam','Analitik'], dom: ['Belajar','Olahraga','Membaca','Kerja'] },
  { c: 'vi', t: 'Tập Trung & Hiệu Suất', s: 'Học tập, Thể thao, Đọc sách & Làm việc', nav: ['Hẹn giờ','Nhiệm vụ','Lịch','Ghi chú','Tự nhiên','Thống kê'], dom: ['Học tập','Thể thao','Đọc sách','Làm việc'] },
  { c: 'it', t: 'Focus e Prestazioni', s: 'Studio, Sport, Lettura e Lavoro', nav: ['Timer','Attività','Agenda','Note','Natura','Analisi'], dom: ['Studio','Sport','Lettura','Lavoro'] },
  { c: 'bn', t: 'মনোযোগ এবং পারফরম্যান্স', s: 'পড়াশোনা, ব্যায়াম, পড়া এবং কাজ', nav: ['টাইমার','কাজ','ক্যালেন্ডার','নোট','প্রকৃতি','বিশ্লেষণ'], dom: ['পড়াশোনা','ব্যায়াম','পড়া','কাজ'] },
  { c: 'ur', t: 'ارتکاز اور کارکردگی', s: 'مطالعہ، ورزش، پڑھائی اور گہرا کام', nav: ['ٹائمر','مہمات','کیلنڈر','نوٹس','فطرت','تجزیات'], dom: ['مطالعہ','ورزش','پڑھائی','کام'] },
  { c: 'fa', t: 'تمرکز و عملکرد بالا', s: 'مطالعه، ورزش، خواندن و کار عمیق', nav: ['زمان‌سنج','وظایف','تقویم','یادداشت','طبیعت','تحلیل‌ها'], dom: ['مطالعه','ورزش','خواندن','کار عمیق'] },
  { c: 'pl', t: 'Skupienie i Wydajność', s: 'Nauka, Sport, Czytanie i Praca', nav: ['Timer','Zadania','Kalendarz','Notatki','Natura','Analizy'], dom: ['Nauka','Sport','Czytanie','Praca'] },
  { c: 'nl', t: 'Focus & Prestatie', s: 'Studie, Sport, Lezen & Diep Werk', nav: ['Timer','Taken','Agenda','Notities','Natuur','Analyse'], dom: ['Studie','Sport','Lezen','Werk'] }
];

const EXTRA_NATIVE_LOCALE = {
  zh: 'zh-CN', pt: 'pt-BR', ur: 'ur-PK', bn: 'bn-BD',
  fa: 'fa-IR', hi: 'hi-IN', id: 'id-ID', ja: 'ja-JP', ko: 'ko-KR'
};
const EXTRA_SOUND_IDS = Object.keys(DICT.en.sounds);
OTHER_LANGS.forEach(item => {
  const keys = window.ZEN_LOCALE_FIELD_KEYS || [];
  const row = window.ZEN_LOCALE_ROWS && window.ZEN_LOCALE_ROWS[item.c];
  const extra = window.ZEN_LOCALE_EXTRAS && window.ZEN_LOCALE_EXTRAS[item.c];
  if (!row || row.length !== keys.length || !extra ||
      extra.sounds.length !== EXTRA_SOUND_IDS.length ||
      extra.tasks.length !== 4 || extra.notes.length !== 3) {
    console.error('Incomplete localization pack', item.c);
    // Do not crash the user's existing data if assets are unexpectedly missing.
    DICT[item.c] = DICT.en;
    return;
  }
  const text = Object.fromEntries(keys.map((k, i) => [k, row[i]]));
  const locale = EXTRA_NATIVE_LOCALE[item.c] || item.c;
  const weekdays = Array.from({length: 7}, (_, d) => {
    const date = new Date(Date.UTC(2023, 0, 1 + d, 12));
    return new Intl.DateTimeFormat(locale, {weekday:'short', calendar:'gregory', timeZone:'UTC'}).format(date);
  });
  const months = Array.from({length: 12}, (_, m) => {
    const date = new Date(Date.UTC(2023, m, 1, 12));
    return new Intl.DateTimeFormat(locale, {month:'long', calendar:'gregory', timeZone:'UTC'}).format(date);
  });
  DICT[item.c] = {
    ...text,
    title: item.t, sub: item.s,
    navTimer: item.nav[0], navTasks: item.nav[1], navCalendar: item.nav[2],
    navNotes: item.nav[3], navSounds: item.nav[4], navAnalytics: item.nav[5],
    domStudy: item.dom[0], domSport: item.dom[1],
    domRead: item.dom[2], domWork: item.dom[3],
    modeFocus: '25m', modeShort: '5m', modeLong: '15m',
    weekdays, months,
    sounds: Object.fromEntries(EXTRA_SOUND_IDS.map((key,i) => [key, extra.sounds[i]])),
    sampleTasks: extra.tasks,
    sampleNotes: extra.notes.map(([t,b]) => ({t,b}))
  };
});

function localDateISO(date = new Date()) {
  return [
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}
let todayISO = localDateISO();
function escapeHtmlText(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

let cfg = loadFortressData('zen_fortress_cfg_v21', {
  lang: 'en', domain: 'study', focusMin: 25, shortMin: 5, longMin: 15,
  todayMins: 0, sessions: 0, streak: 0, water: 0, sets: 0, pagesRead: 0
});

function computeActualStreak(history, now = new Date()) {
  const days = new Set(
    (Array.isArray(history) ? history : [])
      .filter(e => e && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && Number(e.minutes) > 0)
      .map(e => e.date)
  );
  const day = new Date(now);
  day.setHours(12, 0, 0, 0);
  if (!days.has(localDateISO(day))) day.setDate(day.getDate() - 1);
  let count = 0;
  while (count < 10000 && days.has(localDateISO(day))) {
    count += 1;
    day.setDate(day.getDate() - 1);
  }
  return count;
}

function syncDailyRollover() {
  const current = localDateISO();
  const entries = Array.isArray(cfg.sessionHistory) ? cfg.sessionHistory : null;
  // An unavailable optional analytics module must never erase cached values.
  if (entries) {
    const next = JSON.parse(JSON.stringify(cfg));
    if (next.metricsDate && next.metricsDate !== current) {
      next.todayMins = entries
        .filter(e => e && e.date === current && Number.isFinite(Number(e.minutes)))
        .reduce((total, e) => total + Math.max(0, Number(e.minutes)), 0);
      next.water = 0;
      next.sets = 0;
      next.pagesRead = 0;
      next.quickFocusRemainderSec = 0;
    }
    next.metricsDate = current;
    next.streak = computeActualStreak(next.sessionHistory);
    if (JSON.stringify(next) !== JSON.stringify(cfg)) {
      try {
        if (window.DF22Integration) {
          const before = window.DF22Integration.getSnapshot();
          if (window.DF22Integration.write(before, {...before,cfg:next}) !== true)
            throw new Error('ROLLOVER_SAVE_NOT_VERIFIED');
        } else {
          if (saveFortressData('zen_fortress_cfg_v21', next) !== true)
            throw new Error('ROLLOVER_SAVE_NOT_VERIFIED');
          cfg = next;
        }
      } catch (_) {
        showToast((typeof L === 'function' && L().saveFailed) || 'Could not save daily progress. Retry.');
        return false;
      }
    }
  }
  // Date controls advance only after the daily snapshot has been acknowledged.
  if (todayISO !== current) {
    const previousDate = todayISO;
    todayISO = current;
    const taskDateInput = document.getElementById('inpTaskDate');
    if (taskDateInput && taskDateInput.value === previousDate) taskDateInput.value = current;
    if (typeof selectedCalDate !== 'undefined' && selectedCalDate === previousDate) {
      selectedCalDate = current;
      calYear = new Date().getFullYear();
      calMonth = new Date().getMonth();
    }
  }
  return true;
}

function L() {
  return DICT[cfg.lang] || DICT.en;
}

// Shell-only labels. Reviewed DF99 shell packs take priority; legacy DICT and
// these explicit defaults remain available while other languages are reviewed.
const SHELL_LABELS = Object.freeze({
  en: Object.freeze({
    langSearchTitle: '🌐 Language & Country Search',
    langSearchPlaceholder: 'Search language or country (e.g. Jordan, Spain, USA, مصر)...'
  }),
  ar: Object.freeze({
    langSearchTitle: '🌐 البحث عن اللغة والبلد',
    langSearchPlaceholder: 'ابحث عن لغة أو بلد (مثل الأردن أو إسبانيا أو مصر)...'
  })
});
function shellLabel(code, key, current) {
  const dict=DICT[code] || {};
  const primary=typeof dict[key]==='string' && dict[key].trim() ? dict[key] : null;
  const extra=SHELL_LABELS[code] && SHELL_LABELS[code][key];
  const english=DICT.en[key] || (SHELL_LABELS.en && SHELL_LABELS.en[key]);
  const fallback=primary || extra || english || current || '';
  const reviewed=window.DF99Locale?.t(code,'shell',key,fallback);
  const label=typeof reviewed==='string' && reviewed.trim() && reviewed!==key ? reviewed : fallback;
  return toWest(label);
}

const CONFIRMATION_TEXT = {
  "en": [
    "Delete this task? This cannot be undone.",
    "Delete this note? This cannot be undone.",
    "Restore this backup? Current tasks, notes and progress will be replaced. Export them first."
  ],
  "ar": [
    "حذف هذه المهمة؟ لا يمكن التراجع عن الحذف.",
    "حذف هذه الملاحظة؟ لا يمكن التراجع عن الحذف.",
    "استعادة النسخة الاحتياطية ستستبدل مهامك وملاحظاتك وتقدمك الحالي. احفظ نسخة منه أولًا. هل تريد المتابعة؟"
  ],
  "es": [
    "¿Eliminar esta tarea? No se puede deshacer.",
    "¿Eliminar esta nota? No se puede deshacer.",
    "¿Restaurar esta copia? Reemplazará las tareas, notas y el progreso actuales. Guarda una copia primero."
  ],
  "fr": [
    "Supprimer cette tâche ? Cette action est irréversible.",
    "Supprimer cette note ? Cette action est irréversible.",
    "Restaurer cette sauvegarde ? Vos tâches, notes et progrès actuels seront remplacés. Exportez-les d’abord."
  ],
  "de": [
    "Diese Aufgabe löschen? Das kann nicht rückgängig gemacht werden.",
    "Diese Notiz löschen? Das kann nicht rückgängig gemacht werden.",
    "Sicherung wiederherstellen? Aufgaben, Notizen und Fortschritt werden überschrieben. Vorher bitte sichern."
  ],
  "zh": [
    "删除此任务？此操作无法撤销。",
    "删除此笔记？此操作无法撤销。",
    "恢复备份将替换当前任务、笔记和进度。请先导出当前数据。是否继续？"
  ],
  "hi": [
    "यह कार्य मिटाएँ? इसे वापस नहीं लाया जा सकता।",
    "यह नोट मिटाएँ? इसे वापस नहीं लाया जा सकता।",
    "बैकअप बहाल करने से मौजूदा कार्य, नोट और प्रगति बदल जाएँगे। पहले इन्हें निर्यात करें।"
  ],
  "ru": [
    "Удалить задачу? Это действие нельзя отменить.",
    "Удалить заметку? Это действие нельзя отменить.",
    "Восстановление копии заменит текущие задачи, заметки и прогресс. Сначала сохраните их."
  ],
  "pt": [
    "Excluir esta tarefa? Não é possível desfazer.",
    "Excluir esta nota? Não é possível desfazer.",
    "Restaurar o backup substituirá tarefas, notas e progresso atuais. Exporte-os antes."
  ],
  "ja": [
    "このタスクを削除しますか？元に戻せません。",
    "このノートを削除しますか？元に戻せません。",
    "バックアップを復元すると現在のタスク・ノート・進捗が置き換わります。先に保存してください。"
  ],
  "id": [
    "Hapus tugas ini? Tindakan ini tidak dapat dibatalkan.",
    "Hapus catatan ini? Tindakan ini tidak dapat dibatalkan.",
    "Pemulihan cadangan akan mengganti tugas, catatan, dan kemajuan saat ini. Ekspor terlebih dahulu."
  ],
  "tr": [
    "Bu görev silinsin mi? İşlem geri alınamaz.",
    "Bu not silinsin mi? İşlem geri alınamaz.",
    "Yedek geri yüklenirse mevcut görevler, notlar ve ilerleme değişir. Önce dışa aktarın."
  ],
  "ko": [
    "이 작업을 삭제할까요? 되돌릴 수 없습니다.",
    "이 노트를 삭제할까요? 되돌릴 수 없습니다.",
    "백업을 복원하면 현재 작업, 노트와 진행 상황이 바뀝니다. 먼저 내보내세요."
  ],
  "vi": [
    "Xóa nhiệm vụ này? Không thể hoàn tác.",
    "Xóa ghi chú này? Không thể hoàn tác.",
    "Khôi phục bản sao lưu sẽ thay thế nhiệm vụ, ghi chú và tiến độ hiện tại. Hãy xuất dữ liệu trước."
  ],
  "it": [
    "Eliminare questa attività? Non si può annullare.",
    "Eliminare questa nota? Non si può annullare.",
    "Il ripristino sostituirà attività, note e progressi attuali. Esportali prima."
  ],
  "bn": [
    "এই কাজটি মুছবেন? পরে ফিরিয়ে আনা যাবে না।",
    "এই নোটটি মুছবেন? পরে ফিরিয়ে আনা যাবে না।",
    "ব্যাকআপ ফিরিয়ে আনলে বর্তমান কাজ, নোট ও অগ্রগতি বদলে যাবে। আগে সেগুলো রপ্তানি করুন।"
  ],
  "ur": [
    "یہ کام حذف کریں؟ اسے واپس نہیں لایا جا سکتا۔",
    "یہ نوٹ حذف کریں؟ اسے واپس نہیں لایا جا سکتا۔",
    "بیک اپ بحال کرنے سے موجودہ کام، نوٹس اور پیش رفت بدل جائیں گے۔ پہلے انہیں محفوظ کریں۔"
  ],
  "fa": [
    "این کار حذف شود؟ بازگرداندن آن ممکن نیست.",
    "این یادداشت حذف شود؟ بازگرداندن آن ممکن نیست.",
    "بازیابی نسخه پشتیبان، کارها و یادداشت‌ها و پیشرفت فعلی را جایگزین می‌کند. نخست از آن‌ها خروجی بگیرید."
  ],
  "pl": [
    "Usunąć to zadanie? Nie można tego cofnąć.",
    "Usunąć tę notatkę? Nie można tego cofnąć.",
    "Przywrócenie kopii zastąpi obecne zadania, notatki i postępy. Najpierw je wyeksportuj."
  ],
  "nl": [
    "Deze taak verwijderen? Dit kan niet ongedaan worden gemaakt.",
    "Deze notitie verwijderen? Dit kan niet ongedaan worden gemaakt.",
    "Het herstellen van de back-up vervangt taken, notities en voortgang. Exporteer ze eerst."
  ]
};
function confirmSensitiveAction(kind) {
  const copy = CONFIRMATION_TEXT[cfg.lang] || CONFIRMATION_TEXT.en;
  const index = {task:0, note:1, restore:2}[kind];
  if (!Number.isInteger(index)) return false;
  return window.confirm(copy[index]);
}

function openLanguageModal() {
  document.getElementById('inpLangCountrySearch').value = '';
  renderLanguageList();
  document.getElementById('langModal').classList.add('open');
}

function renderLanguageList() {
  const q = (document.getElementById('inpLangCountrySearch').value || '').toLowerCase().trim();
  const box = document.getElementById('langListScrollBox');
  box.replaceChildren();

  LANG_CATALOG.filter(l => {
    if (!q) return true;
    return l.enName.toLowerCase().includes(q) ||
           l.nativeName.toLowerCase().includes(q) ||
           l.iso.toLowerCase().includes(q) ||
           l.countries.toLowerCase().includes(q);
  }).forEach(l => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `lang-row-btn ${cfg.lang === l.code ? 'active' : ''}`;
    row.setAttribute('aria-pressed', String(cfg.lang === l.code));
    row.onclick = () => applyLanguage(l.code);
    const icon = document.createElement('div');
    icon.className = 'lang-code-monogram';
    icon.textContent = l.iso;
    const names = document.createElement('div');
    names.className = 'lang-names-col';
    const english = document.createElement('div');
    english.className = 'lang-en-title';
    english.textContent = l.enName;
    const native = document.createElement('div');
    native.className = 'lang-native-sub';
    native.textContent = l.nativeName;
    names.appendChild(english);
    names.appendChild(native);
    const mark = document.createElement('span');
    mark.style.cssText = 'font-size:0.75rem;font-weight:900;color:var(--primary);';
    mark.textContent = cfg.lang === l.code ? '✓' : '';
    row.appendChild(icon);
    row.appendChild(names);
    row.appendChild(mark);
    box.appendChild(row);
  });
}

function localizeStarterPreviews(target) {
  // IDs 1..4 and 1..3 are the stable v21 demonstration records.
  // A user-edited demonstration record is no longer replaced by translation.
  const packs = Object.values(DICT);
  if (Array.isArray(target.sampleTasks)) {
    tasksList.forEach(record => {
      if (!record || record.isStarter !== true || !Number.isSafeInteger(record.id)) return;
      const index = record.id - 1;
      if (index < 0 || index >= target.sampleTasks.length) return;
      const unchanged = packs.some(pack => Array.isArray(pack.sampleTasks) &&
        typeof pack.sampleTasks[index] === 'string' && record.title === toWest(pack.sampleTasks[index]));
      if (unchanged) record.title = toWest(target.sampleTasks[index]);
    });
  }
  if (Array.isArray(target.sampleNotes)) {
    notesList.forEach(record => {
      if (!record || record.isStarter !== true || !Number.isSafeInteger(record.id)) return;
      const index = record.id - 1;
      if (index < 0 || index >= target.sampleNotes.length) return;
      const unchanged = packs.some(pack => {
        const sample = Array.isArray(pack.sampleNotes) && pack.sampleNotes[index];
        return sample && record.title === toWest(sample.t) && record.body === toWest(sample.b);
      });
      if (unchanged) {
        record.title = toWest(target.sampleNotes[index].t);
        record.body = toWest(target.sampleNotes[index].b);
      }
    });
  }
}

function applyLanguage(code) {
  const normalized = typeof code === 'string' ? code.toLowerCase().trim().split(/[-_]/)[0] : 'en';
  const meta = LANG_CATALOG.find(x => x.code === normalized && x.code !== 'he' && x.code !== 'iw')
    || LANG_CATALOG.find(x => x.code === 'en');
  const previousLang=cfg.lang;
  cfg.lang = meta.code;
  try {
    saveFortressData('zen_fortress_cfg_v21', cfg);
  } catch (error) {
    cfg.lang=previousLang; // An unacknowledged write must not change the active locale.
    throw error;
  }
  const d = L();

  const root = document.getElementById('htmlRoot');
  root.setAttribute('lang', meta.code);
  root.setAttribute('dir', meta.dir);

  document.getElementById('currentLangIso').textContent = meta.iso;
  const languageLabel = document.getElementById('currentLangLabel');
  languageLabel.textContent = `${meta.enName} • ${meta.nativeName}`;
  // Older WebViews can retain the button's initial computed accessible name
  // when only its child spans change. Publish the current name explicitly.
  languageLabel.parentElement?.setAttribute('aria-label',
    `${meta.iso} ${meta.enName} • ${meta.nativeName}`);
  document.getElementById('hdrMainTitle').textContent = 'Deep Focus';
  document.getElementById('hdrSubTitle').textContent = d.sub;
  const tn = document.getElementById('navTrainingText');
  const trainingLabel = window.DF22Locale?.translations?.[meta.code]?.quickTraining
    || (typeof quickText === 'function' ? quickText('trainingTitle') : 'Quick training');
  if (tn) tn.textContent = trainingLabel;
  document.getElementById('navTraining')?.setAttribute('aria-label', trainingLabel);
  if (typeof refreshTimerSettings === 'function') refreshTimerSettings();

  document.querySelectorAll('[data-i18n]').forEach(el => {
    // Never replace an editable value or arbitrary user-generated content.
    if (el.isContentEditable || /^(INPUT|TEXTAREA)$/i.test(el.tagName || '')) return;
    const k = el.getAttribute('data-i18n');
    const value=shellLabel(meta.code,k,el.textContent);
    if (value && value!==k && el.textContent!==value) el.textContent=value;
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const k = el.getAttribute('data-i18n-placeholder');
    const value=shellLabel(meta.code,k,el.getAttribute('placeholder'));
    if (value && value!==k) el.setAttribute('placeholder',value);
  });

  localizeStarterPreviews(d);

  renderAnalyticsBars();

  syncHeaderMetrics();
  updateTimerDisplay();
  renderTasksList();
  renderCalendar();
  renderNotesStack();
  renderSoundsStudio();
  updateSyllabusCalc();
  closeModal('langModal');
  quickL10n();
  // Premium labels may also be created by re-rendered screens; refresh last.
  if (window.DF22Locale?.apply) window.DF22Locale.apply(document,meta.code);
  if (window.DF22Integration?.refreshLocale) window.DF22Integration.refreshLocale();
  try {
    if (window.ZenNative && typeof window.ZenNative.setNativeLocale === 'function')
      window.ZenNative.setNativeLocale(meta.code);
  } catch (_) { /* Web preview has no native bridge. */ }
}

/* ========================================================
   3. CLOUD BACKUP & EASY SHARE
   ======================================================== */
function generateEncryptedBackupCode() {
  const bundle = JSON.stringify({ cfg, tasksList, notesList, v: 21 });
  const sig = computeHash(bundle);
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify({ bundle, sig }))));
  return "ZEN21::" + encoded;
}

function validateImportedBackup(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.v !== 21) return null;
  if (!raw.cfg || typeof raw.cfg !== 'object' || Array.isArray(raw.cfg)) return null;
  if (!Array.isArray(raw.tasksList) || !Array.isArray(raw.notesList)) return null;
  if (raw.tasksList.length > 10000 || raw.notesList.length > 10000) return null;
  // New imports must use the original numeric v21 ID type, never string coercion.
  const safeRecordId = id => typeof id === 'number' && Number.isSafeInteger(id) && id >= 0;
  const uniqueRecordIds = records => {
    const seen = new Set();
    return records.every(record => {
      if (seen.has(record.id)) return false;
      seen.add(record.id);
      return true;
    });
  };
  const okTask = x => x && typeof x === 'object' && !Array.isArray(x)
    && safeRecordId(x.id)
    && typeof x.title === 'string' && x.title.length <= 20000
    && typeof x.done === 'boolean';
  const okNote = x => x && typeof x === 'object' && !Array.isArray(x)
    && safeRecordId(x.id)
    && typeof x.title === 'string' && x.title.length <= 20000
    && typeof x.body === 'string' && x.body.length <= 500000;
  if (!raw.tasksList.every(okTask) || !raw.notesList.every(okNote)
      || !uniqueRecordIds(raw.tasksList) || !uniqueRecordIds(raw.notesList)) return null;
  const candidateCfg = {...cfg, ...raw.cfg};
  if (!LANG_CATALOG.some(l => l.code === candidateCfg.lang)) candidateCfg.lang = 'en';
  for (const key of ['todayMins', 'sessions', 'streak', 'water']) {
    const n = Number(candidateCfg[key]);
    if (!Number.isFinite(n) || n < 0 || n > 100000000) return null;
    candidateCfg[key] = n;
  }
  if (candidateCfg.sessionHistory !== undefined
      && (!Array.isArray(candidateCfg.sessionHistory) || candidateCfg.sessionHistory.length > 100000)) return null;
  return {cfg: candidateCfg, tasksList: raw.tasksList, notesList: raw.notesList};
}

function verifyAndRestoreBackupCode(codeStr) {
  try {
    const clean = String(codeStr || '').trim();
    if (clean.length > 14000000 || !clean) throw new Error('Invalid backup size');
    const rawB64 = clean.startsWith('ZEN21::') ? clean.slice(7).trim() : clean;
    const decoded = JSON.parse(decodeURIComponent(escape(atob(rawB64))));
    if (!decoded || typeof decoded.bundle !== 'string' || !decoded.sig
        || computeHash(decoded.bundle) !== decoded.sig) throw new Error('Integrity check failed');
    const verified = validateImportedBackup(JSON.parse(decoded.bundle));
    if (!verified) throw new Error('Invalid backup schema');
    // Validation must complete before writes. Never replace a user's work silently.
    if (!confirmSensitiveAction('restore')) return false;
    // Build and verify every storage packet before replacing any saved record.
    // If a write fails (e.g. storage quota), roll back all six original keys.
    const imports = [
      ['zen_fortress_cfg_v21', verified.cfg],
      ['zen_fortress_tasks_v21', verified.tasksList],
      ['zen_fortress_notes_v21', verified.notesList]
    ];
    const updates = [];
    for (const [key, value] of imports) {
      const payload = JSON.stringify(value);
      updates.push([key, JSON.stringify({payload, sig:computeHash(payload), ts:Date.now()})]);
    }
    const previous = new Map();
    for (const [key] of updates) {
      previous.set(key, localStorage.getItem(key));
      previous.set(key + '_mirror', localStorage.getItem(key + '_mirror'));
    }
    try {
      for (const [key, packet] of updates) {
        localStorage.setItem(key, packet);
        localStorage.setItem(key + '_mirror', packet);
      }
      for (const [key, packet] of updates) {
        if (localStorage.getItem(key) !== packet || localStorage.getItem(key + '_mirror') !== packet) {
          throw new Error('Storage verification failed');
        }
      }
    } catch (storageError) {
      for (const [key, oldValue] of previous) {
        try {
          if (oldValue === null) localStorage.removeItem(key);
          else localStorage.setItem(key, oldValue);
        } catch (rollbackError) {
          console.error('Backup rollback failed:', key, rollbackError);
        }
      }
      throw storageError;
    }
    cfg = verified.cfg;
    tasksList = verified.tasksList;
    notesList = verified.notesList;
    syncDailyRollover();
    applyLanguage(cfg.lang);
    closeModal('cloudBackupModal');
    showToast('✓ Backup restored');
    return true;
  } catch (e) {
    showToast('⚠️ Backup invalid — original data left unchanged');
    return false;
  }
}

function openCloudBackupModal() {
  document.getElementById('inpRestorePayload').value = '';
  document.getElementById('cloudBackupModal').classList.add('open');
  // Update display-only backup labels after the modal exists and before user action.
  // Never alter backup payload, consent, restore callbacks or storage here.
  window.DeepFocusAudioSettingsLocale?.bindBackupDialog({document, locale: cfg.lang});
}

async function syncToGoogleCloudNow() {
  const code = generateEncryptedBackupCode();
  if (window.ZenNative && typeof window.ZenNative.syncBackupToGoogleEmailOrDrive === 'function') {
    window.ZenNative.syncBackupToGoogleEmailOrDrive(code);
  } else if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(code);
      showToast("Backup copied — save privately; NOT encrypted");
    } catch (_) {
      showToast("⚠️ Backup copy failed — use Export Backup File");
    }
  } else {
    showToast("⚠️ Clipboard unavailable — use Export Backup File");
  }
}

function downloadEncryptedBackupFile() {
  const code = generateEncryptedBackupCode();
  if (window.ZenNative && window.ZenNative.exportBackupToFile) {
    try {
      window.ZenNative.exportBackupToFile(code);
      return; // Android reports success only after the user actually saves the file.
    } catch (error) {
      showToast('⚠️ Could not open Save As; use Share Backup');
      return;
    }
  }
  // Browser-only fallback; Android WebView should use ACTION_CREATE_DOCUMENT.
  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `deep-focus-backup-${todayISO}.zenbackup`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  showToast("💾 Backup exported — NOT encrypted");
}

function restoreFromEncryptedCode() {
  const val = document.getElementById('inpRestorePayload').value;
  if (!val) return showToast("⚠️ Paste backup code first");
  verifyAndRestoreBackupCode(val);
}

function restoreFromFileInput(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) return showToast('⚠️ Backup file is too large');
  const reader = new FileReader();
  reader.onload = (e) => verifyAndRestoreBackupCode(e.target.result);
  reader.readAsText(file);
}

function shareAppWithFriends() {
  const msg = toWest(`🌿 Deep Focus — My Progress Today: ${cfg.todayMins} active mins (${cfg.sessions} sessions completed, 🔥 ${cfg.streak} days streak)!`);
  if (window.ZenNative && window.ZenNative.shareAppInvite) {
    window.ZenNative.shareAppInvite(msg);
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(msg);
    showToast("📤 Copied to Clipboard!");
  }
}

/* ========================================================
   4. GUARANTEED COMPLETION CHIME & BACKGROUND ALARM
   ======================================================== */
let chimeCtx = null;
function playRichCompletionChime(titleText, skipNative = false) {
  if (!skipNative && window.ZenNative && window.ZenNative.triggerCompletionSound) {
    try { window.ZenNative.triggerCompletionSound(titleText || "Session Completed!"); } catch(e){}
  }
  try {
    if (!chimeCtx) chimeCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (chimeCtx.state === 'suspended') chimeCtx.resume();
    [528, 660, 792].forEach((freq, idx) => {
      const osc = chimeCtx.createOscillator(), gain = chimeCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, chimeCtx.currentTime + idx * 0.35);
      gain.gain.setValueAtTime(0.001, chimeCtx.currentTime + idx * 0.35);
      gain.gain.exponentialRampToValueAtTime(0.65, chimeCtx.currentTime + idx * 0.35 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, chimeCtx.currentTime + idx * 0.35 + 1.6);
      osc.connect(gain); gain.connect(chimeCtx.destination);
      osc.start(chimeCtx.currentTime + idx * 0.35);
      osc.stop(chimeCtx.currentTime + idx * 0.35 + 1.6);
    });
  } catch (e) {}
  if (navigator.vibrate) try { navigator.vibrate([300, 150, 300, 150, 500]); } catch (e) {}
}

function testCompletionSoundChime() {
  playRichCompletionChime("Test Notification & Sound Alert 🔔");
  showToast("🔔 Alarm & Notification Tested!");
}

/* ========================================================
   5. MULTI-DOMAIN & TIMER ENGINE
   ======================================================== */
const DOMAIN_FOCUS_MINUTES = Object.freeze({study: 25, sport: 30, read: 20, work: 50});
function getDomainFocusMinutes(domain = cfg.domain) {
  const chosen = cfg.domainFocusMinutes && cfg.domainFocusMinutes[domain];
  return Number.isInteger(chosen) && chosen >= 1 && chosen <= 240
    ? chosen : (DOMAIN_FOCUS_MINUTES[domain] || 25);
}

function renderDomainState() {
  const dom = ['study', 'sport', 'read', 'work'].includes(cfg.domain) ? cfg.domain : 'study';
  for (const key of ['study', 'sport', 'read', 'work']) {
    const card = document.getElementById('domBtn-' + key);
    if (!card) continue;
    const selected = key === dom;
    card.classList.toggle('active', selected);
    card.setAttribute('aria-pressed', String(selected));
    const duration = card.querySelector('.domain-duration');
    if (duration) duration.textContent = toWest(getDomainFocusMinutes(key) + ':00');
  }
  document.getElementById('modeFocusBtn').textContent = toWest(getDomainFocusMinutes(dom) + 'm');
  document.getElementById('sportContextBar').classList.toggle('visible', dom === 'sport');
  document.getElementById('readContextBar').classList.toggle('visible', dom === 'read');
}

function switchActivityDomain(dom, el) {
  if (!['study', 'sport', 'read', 'work'].includes(dom) || cfg.domain === dom) return false;
  // Never discard a real timer/quick-training session before confirmation and
  // an acknowledged native v21 save. Failed saves must leave live state intact.
  const replacingQuickTraining = !!quickTraining?.active;
  if (replacingQuickTraining || timerRunning ||
      (timerSessionId !== null && timerLeft < timerTotal)) {
    if (!window.confirm(quickText('replacePrompt'))) return false;
  }
  const nextCfg = {...cfg,domain:dom};
  try {
    if (saveFortressData('zen_fortress_cfg_v21', nextCfg) !== true)
      throw new Error('DOMAIN_SAVE_NOT_ACKNOWLEDGED');
  } catch (_) {
    showToast(cfg.lang === 'ar'
      ? 'تعذر حفظ النشاط. حاول مرة أخرى.'
      : 'Could not save activity. Try again.');
    return false;
  }
  cfg.domain = dom;
  if (replacingQuickTraining) {
    quickTraining = null;
    if (timerRunning) toggleTimerPlay();
    renderQuickTraining();
  }
  renderDomainState();

  const d = L();
  const labels = {
    study: ['📚', d.domStudy], sport: ['🏋️', d.domSport],
    read: ['📖', d.domRead], work: ['💻', d.domWork]
  };
  const [icon, title] = labels[dom];
  const minutes = getDomainFocusMinutes(dom);
  selectTimerMode(minutes, 'focus', document.getElementById('modeFocusBtn'));
  showToast(toWest(`${icon} ${title} (${minutes}m)`));
  return true;
}

/* Home timer shortcuts share the existing engine, never reset an active session silently. */
function selectHomeQuickSession(minutes) {
  if (![10, 25, 50].includes(minutes)) return false;
  if (!quickTraining?.active && currentTimerModeKey === 'focus' &&
      timerTotal === minutes * 60) return true;
  if (quickTraining?.active) {
    if (!window.confirm(quickText('replacePrompt'))) return false;
    quickTraining = null;
    if (timerRunning) toggleTimerPlay();
    renderQuickTraining();
  } else if (timerRunning || (timerSessionId !== null && timerLeft < timerTotal)) {
    if (!window.confirm(quickText('replacePrompt'))) return false;
  }
  selectTimerMode(minutes, 'focus', document.getElementById('modeFocusBtn'));
  return true;
}

function logWorkoutSet() {
  const previous = Number(cfg.sets || 0);
  if (!Number.isSafeInteger(previous) || previous < 0) return false;
  const next = {...cfg, sets:(previous % 12) + 1};
  try {
    if (saveFortressData('zen_fortress_cfg_v21', next) !== true)
      throw new Error('WORKOUT_COUNTER_SAVE_NOT_ACKNOWLEDGED');
  } catch (_) {
    showToast(L().saveFailed || 'Could not save progress. Retry.');
    return false;
  }
  cfg = next;
  syncHeaderMetrics();
  showToast(toWest(`💪 ${L().domSport}: ${cfg.sets}/4`));
  return true;
}

function startQuickSportRest(secs) {
  // Reject invalid values before prompting, storing, or changing a live session.
  const seconds=Number(secs);
  if(!Number.isInteger(seconds)||seconds<1||seconds>86400)return false;
  if((quickTraining?.active||timerRunning||timerSessionId||timerActiveMs>0) &&
      !window.confirm(quickText('replacePrompt')))return false;

  // One confirmed durable transition. Do not Pause/Reset/save intermediate
  // states: those could irrevocably discard focus time on failed storage.
  const startedAt=Date.now();
  const nextId=String(startedAt)+'-'+String(Math.round(Math.random()*1e9));
  const next={
    total:seconds,left:seconds,running:true,endAt:startedAt+seconds*1000,
    mode:'short',label:'',sessionId:nextId,taskId:null,
    activeMs:0,resumedAt:startedAt,training:null
  };
  // Publish exactly one timer packet before interrupting previous native work.
  const storage = typeof localStorage === 'undefined' ? null : localStorage;
  const oldPrimary = storage ? storage.getItem(TIMER_STORAGE_KEY) : null;
  const oldMirror = storage ? storage.getItem(TIMER_STORAGE_KEY + '_mirror') : null;
  try {
    if(saveFortressData(TIMER_STORAGE_KEY,next)!==true)
      throw new Error('SPORT_REST_WRITE_NOT_ACKNOWLEDGED');
    if (window.ZenNative && typeof window.ZenNative.acknowledgeActiveTimerSnapshot === 'function') {
      const raw = storage && storage.getItem(TIMER_STORAGE_KEY);
      if (typeof raw !== 'string' || window.ZenNative.acknowledgeActiveTimerSnapshot(raw) !== true)
        throw new Error('SPORT_REST_NATIVE_ACK_FAILED');
    }
  } catch (_) {
    if (storage) {
      try {
        for (const [key,old] of [[TIMER_STORAGE_KEY,oldPrimary],
          [TIMER_STORAGE_KEY+'_mirror',oldMirror]]) {
          if (old===null) storage.removeItem(key); else storage.setItem(key,old);
        }
      } catch (_) {}
    }
    showToast(L().saveFailed || (cfg.lang==='ar'
      ? 'تعذّر حفظ جلسة الاستراحة. حاول مرة أخرى.'
      : 'Could not save rest timer. Try again.'));
    return false;
  }

  // The old timer and native service remain untouched until the durable ACK.
  if(timerInterval)clearInterval(timerInterval);
  timerInterval=null;
  if(quickTraining?.active){quickTraining=null;renderQuickTraining();}
  currentTimerModeKey='short';customSessionLabel='';
  timerTotal=seconds;timerLeft=seconds;timerRunning=true;
  timerTargetTime=next.endAt;timerSessionId=nextId;
  focusSessionTaskId=null;timerActiveMs=0;timerResumeMs=startedAt;
  document.getElementById('mainPlayBtn').innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
  updateTimerDisplay();
  if(window.ZenNative&&window.ZenNative.startBackgroundService){
    try{
      window.ZenNative.startBackgroundService(seconds,
        document.getElementById('timerModeCaption').textContent);
    }catch(error){console.warn('Rest notification unavailable',error);}
  }
  if(window.ZenNative && typeof window.ZenNative.requestTimerNotificationPermission==='function'){
    try{window.ZenNative.requestTimerNotificationPermission();}catch(e){}
  }
  timerInterval=setInterval(runTimerTick,500);
  showToast(toWest(`⏱️ Rest ${seconds}s Started`));
  return true;
}

function addReadPages(p) {
  const previous = Number(cfg.pagesRead || 0), delta = Number(p);
  if (!Number.isSafeInteger(previous) || previous < 0 ||
      !Number.isSafeInteger(delta) || delta <= 0 ||
      !Number.isSafeInteger(previous + delta)) return false;
  const next = {...cfg, pagesRead:previous + delta};
  try {
    if (saveFortressData('zen_fortress_cfg_v21', next) !== true)
      throw new Error('READING_COUNTER_SAVE_NOT_ACKNOWLEDGED');
  } catch (_) {
    showToast(L().saveFailed || 'Could not save progress. Retry.');
    return false;
  }
  cfg = next;
  syncHeaderMetrics();
  showToast(toWest(`📖 ${L().domRead}: +${delta}`));
  return true;
}

const TAB_GRADS = {
  'sec-timer': 'linear-gradient(125deg,#ffffff 0%,#f0faff 75%,#f7f7ff 100%)',
  'sec-tasks': 'linear-gradient(125deg,#ffffff 0%,#f7f5ff 70%,#edfaff 100%)',
  'sec-calendar': 'linear-gradient(125deg,#ffffff 0%,#f1f9ff 75%,#f6f5ff 100%)',
  'sec-notes': 'linear-gradient(125deg,#ffffff 0%,#f1fffb 70%,#f4f7ff 100%)',
  'sec-sounds': 'linear-gradient(125deg,#ffffff 0%,#effdff 75%,#eff7ff 100%)',
  'sec-analytics': 'linear-gradient(125deg,#ffffff 0%,#f6f5ff 70%,#f1faff 100%)'
};


function openQuickTrainingFromNav(btn) {
  switchTab('sec-timer', btn);
  const details = document.getElementById('quickTrainingDetails');
  if (details) details.open = true;
  setTimeout(() => {
    const card = document.getElementById('quickTrainingCard');
    if (card) card.scrollIntoView({behavior:'smooth', block:'center'});
  }, 120);
}

function switchTab(secId, btn) {
  syncDailyRollover();
  document.body.classList.toggle('timer-home', secId === 'sec-timer');
  document.querySelectorAll('.screen-section').forEach(s => s.classList.remove('active'));
  document.getElementById(secId).classList.add('active');
  if (btn) {
    document.querySelectorAll('.bnav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  if (TAB_GRADS[secId]) document.getElementById('heroHeader').style.setProperty('--page-ambient', TAB_GRADS[secId]);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (window.DF22Integration?.onTab) window.DF22Integration.onTab(secId);
}

let toastTimer = null;
function showToast(msg) {
  if (navigator.vibrate) try { navigator.vibrate(12); } catch(e){}
  const t = document.getElementById('appToast');
  document.getElementById('toastText').textContent = toWest(msg);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2300);
}

function closeModal(id) { document.getElementById(id).classList.remove('open'); }
window.handleAndroidBack = function() {
  if (document.getElementById('deskClockOverlay').classList.contains('active')) { toggleDeskClock(false); return true; }
  const openM = document.querySelectorAll('.modal-overlay.open');
  if (openM.length > 0) { openM.forEach(m => m.classList.remove('open')); return true; }
  const timerTab = document.getElementById('sec-timer');
  if (timerTab && !timerTab.classList.contains('active')) {
    switchTab('sec-timer', document.getElementById('navTimer'));
    return true;
  }
  return false;
};

let timerTotal = cfg.focusMin * 60;
let timerLeft = timerTotal;
let timerRunning = false;
let timerInterval = null;
let timerTargetTime = null;
let currentTimerModeKey = 'focus';
let customSessionLabel = '';
let timerSessionId = null;
let focusSessionTaskId = null;
let timerActiveMs = 0;
let timerResumeMs = null;
function accumulateActiveTime() {
  if (timerResumeMs === null) return;
  const now = Date.now();
  const through = Number.isFinite(timerTargetTime) ? Math.min(now, timerTargetTime) : now;
  timerActiveMs += Math.max(0, through - timerResumeMs);
  timerResumeMs = null;
}
const TIMER_STORAGE_KEY = 'zen_fortress_active_timer_v21';
function storeTimerSession() {
  return persistActiveTimerSnapshot({
    total: timerTotal, left: timerLeft, running: timerRunning,
    endAt: timerRunning ? timerTargetTime : null,
    mode: currentTimerModeKey, label: customSessionLabel,
    sessionId: timerSessionId, taskId: focusSessionTaskId,
    activeMs: timerActiveMs, resumedAt: timerRunning ? timerResumeMs : null,
    training: quickTraining && quickTraining.active ? {...quickTraining} : null
  });
}
function persistActiveTimerSnapshot(snapshot) {
  const storage = typeof localStorage === 'undefined' ? null : localStorage;
  let oldPrimary, oldMirror;
  try {
    if (storage) {
      oldPrimary = storage.getItem(TIMER_STORAGE_KEY);
      oldMirror = storage.getItem(TIMER_STORAGE_KEY + '_mirror');
    }
    if (saveFortressData(TIMER_STORAGE_KEY, snapshot) !== true)
      throw new Error('TIMER_STORAGE_WRITE_UNVERIFIED');
    const native = window.ZenNative;
    if (native && typeof native.acknowledgeActiveTimerSnapshot === 'function') {
      const raw = storage && storage.getItem(TIMER_STORAGE_KEY);
      if (typeof raw !== 'string' || native.acknowledgeActiveTimerSnapshot(raw) !== true)
        throw new Error('TIMER_NATIVE_RECEIPT_FAILED');
    }
    return true;
  } catch (_) {
    if (storage) {
      try {
        for (const [key, previous] of [[TIMER_STORAGE_KEY, oldPrimary],
          [TIMER_STORAGE_KEY + '_mirror', oldMirror]]) {
          if (previous === null || previous === undefined) storage.removeItem(key);
          else storage.setItem(key, previous);
        }
      } catch (_) { /* Existing native checkpoint remains authoritative. */ }
    }
    try { showToast(L().saveFailed); } catch (_) {}
    return false;
  }
}
function readNativeTimerSession() {
  const native = window.ZenNative;
  if (!native || typeof native.readActiveTimerSnapshot !== 'function') return null;
  const raw = native.readActiveTimerSnapshot();
  if (raw === 'NONE') return null; // Existing v21 installations retain WebView data.
  if (typeof raw !== 'string' || raw === 'ERROR') throw new Error('TIMER_NATIVE_CHECKPOINT_UNREADABLE');
  try {
    const packet = JSON.parse(raw);
    if (!packet || typeof packet.payload !== 'string' ||
        computeHash(packet.payload) !== packet.sig)
      throw new Error('TIMER_NATIVE_CHECKPOINT_INVALID');
    return JSON.parse(packet.payload);
  } catch (_) { throw new Error('TIMER_NATIVE_CHECKPOINT_INVALID'); }
}
function creditCompletedSession() {
  if (currentTimerModeKey !== 'focus' && currentTimerModeKey !== 'custom') return true;
  if (!timerSessionId) return true;
  const ids = Array.isArray(cfg.completedTimerIds) ? cfg.completedTimerIds : [];
  if (ids.includes(timerSessionId) ||
      (Array.isArray(cfg.sessionHistory) && cfg.sessionHistory.some(s => s && s.id === timerSessionId))) return true;
  const nextCfg = JSON.parse(JSON.stringify(cfg));
  // Short intervals such as 20/10 must not credit a whole minute for 20 seconds.
  // Accumulate real seconds across work rounds; legacy timer accounting is preserved.
  let earned;
  if (quickTraining?.active) {
    const accumulated = Math.max(0, Number(nextCfg.quickFocusRemainderSec) || 0)
      + Math.max(0, Math.round(timerActiveMs / 1000));
    earned = Math.floor(accumulated / 60);
    nextCfg.quickFocusRemainderSec = accumulated % 60;
  } else {
    earned = Math.max(0, Math.floor((timerActiveMs + 500) / 60000));
  }
  nextCfg.todayMins = Number(nextCfg.todayMins || 0) + earned;
  nextCfg.sessions = Number(nextCfg.sessions || 0) + 1;
  nextCfg.metricsDate = localDateISO();
  nextCfg.completedTimerIds = [...ids, timerSessionId].slice(-300);
  if (!Array.isArray(nextCfg.sessionHistory)) nextCfg.sessionHistory = [];
  const credited = {id: timerSessionId, date: localDateISO(), minutes: earned,
    domain: nextCfg.domain || 'study',mode:'focus',completed:true};
  if (Number.isSafeInteger(focusSessionTaskId) && focusSessionTaskId >= 0 &&
      typeof tasksList !== 'undefined' && tasksList.some(t => t.id === focusSessionTaskId && !t.isStarter))
    credited.taskId = focusSessionTaskId;
  nextCfg.sessionHistory.push(credited);
  if (!quickTraining?.active) {
    const rounds = Number.isInteger(nextCfg.roundsPerCycle) && nextCfg.roundsPerCycle >= 1 && nextCfg.roundsPerCycle <= 12 ? nextCfg.roundsPerCycle : 4;
    const past = Number.isInteger(nextCfg.focusCycleCount) && nextCfg.focusCycleCount >= 0 && nextCfg.focusCycleCount < rounds ? nextCfg.focusCycleCount : 0;
    nextCfg.focusCycleCount = (past + 1) % rounds;
  }
  nextCfg.streak = computeActualStreak(nextCfg.sessionHistory);
  try {
    if (window.DF22Integration) {
      const before = window.DF22Integration.getSnapshot();
      if (window.DF22Integration.write(before, {...before,cfg:nextCfg}) !== true)
        throw new Error('SESSION_SAVE_NOT_VERIFIED');
    } else {
      if (saveFortressData('zen_fortress_cfg_v21', nextCfg) !== true)
        throw new Error('SESSION_SAVE_NOT_VERIFIED');
      cfg = nextCfg;
    }
  } catch (_) {
    showToast(cfg.lang === 'ar'
      ? 'تعذّر حفظ الجلسة. أبقِ التطبيق مفتوحًا واضغط التشغيل لإعادة المحاولة.'
      : 'Could not save this session. Keep the app open and press Play to retry.');
    return false;
  }
  syncHeaderMetrics();
  if (window.DF22Integration?.onSessionRecorded) window.DF22Integration.onSessionRecorded();
  try { document.dispatchEvent(new CustomEvent('deep-focus:session-recorded',{detail:{schemaVersion:1,...credited}})); } catch (e) {}
  return true;
}
function finalizeTimerSession(shouldChime) {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  accumulateActiveTime();
  timerRunning = false;
  timerLeft = 0;
  if (creditCompletedSession() !== true) {
    // Keep the completed timer ID and pending credit for an explicit retry.
    // No success chime, break-mode transition or quick-training advance.
    updateTimerDisplay();
    document.getElementById('mainPlayBtn').innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
    return false;
  }
  if(quickTraining?.active) {
    advanceQuickTrainingStep();
    if(shouldChime) playRichCompletionChime(document.getElementById('timerModeCaption').textContent,true);
    // The next interval or a fresh focus timer was already selected.
    return;
  }
  storeTimerSession();
  updateTimerDisplay();
  document.getElementById('mainPlayBtn').innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  if (shouldChime) playRichCompletionChime(document.getElementById('timerModeCaption').textContent, true);
  // Only real completed focus sessions advance the break cycle.
  if (['focus','custom'].includes(currentTimerModeKey)) {
    const longRest = cfg.focusCycleCount === 0;
    const mode = longRest ? 'long' : 'short';
    selectTimerMode(longRest ? cfg.longMin : cfg.shortMin, mode,
      document.getElementById(longRest ? 'modeLongBtn' : 'modeShortBtn'));
  } else {
    selectTimerMode(getDomainFocusMinutes(), 'focus', document.getElementById('modeFocusBtn'));
  }
}
function runTimerTick() {
  // Ignore queued callbacks after pause or after the first completion.
  if (!timerRunning) return;
  timerLeft = Math.max(0, Math.ceil((timerTargetTime - Date.now()) / 1000));
  if (timerLeft <= 0) return finalizeTimerSession(true);
  updateTimerDisplay();
}
function restoreTimerSession() {
  let snap;
  try { snap = readNativeTimerSession() || loadFortressData(TIMER_STORAGE_KEY, null); }
  catch (_) { try { showToast(L().saveFailed); } catch (_) {} return; }
  if (!snap || typeof snap !== 'object' || !Number.isFinite(snap.total) || !Number.isFinite(snap.left)) return;
  if (snap.total < 1 || snap.total > 86400 || snap.left < 0 || snap.left > 86400) return;
  timerTotal = snap.total;
  timerLeft = snap.left;
  currentTimerModeKey = ['focus','short','long','custom'].includes(snap.mode) ? snap.mode : 'focus';
  customSessionLabel = typeof snap.label === 'string' ? snap.label.slice(0, 100) : '';
  timerSessionId = typeof snap.sessionId === 'string' ? snap.sessionId : null;
  focusSessionTaskId = Number.isSafeInteger(snap.taskId) && snap.taskId >= 0 ? snap.taskId : null;
  quickTraining = validQuickSnapshot(snap.training);
  timerActiveMs = Number.isFinite(snap.activeMs) && snap.activeMs >= 0 && snap.activeMs <= 86400000
    ? snap.activeMs : Math.max(0, (timerTotal - timerLeft) * 1000);
  timerResumeMs = snap.running
    ? (Number.isFinite(snap.resumedAt) ? snap.resumedAt : Date.now() - Math.max(0, (timerTotal - timerLeft) * 1000))
    : null;
  if (snap.running && Number.isFinite(snap.endAt)) {
    timerTargetTime = snap.endAt;
    timerLeft = Math.max(0, Math.ceil((timerTargetTime - Date.now()) / 1000));
    if (timerLeft === 0) {
      // Android completion alarm may already have notified; reconcile saved deadline.
      finalizeTimerSession(false);
      return;
    }
    timerRunning = true;
    document.getElementById('mainPlayBtn').innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    timerInterval = setInterval(runTimerTick, 500);
  }
  updateTimerDisplay();
  // Android can discard alarms after an app is force-stopped; re-arm from
  // the existing v21 deadline when a running session is restored on next open.
  if (timerRunning && window.ZenNative && window.ZenNative.startBackgroundService) {
    try { window.ZenNative.startBackgroundService(timerLeft, document.getElementById('timerModeCaption').textContent); }
    catch (error) { console.warn('Unable to restore timer completion alert', error); }
  }
}
const ringCircumference = 2 * Math.PI * 105;

function syncHeaderMetrics() {
  const d = L();
  document.getElementById('hdrFocusMins').textContent = toWest(cfg.todayMins);
  document.getElementById('hdrStreakBadge').textContent = toWest(`↑ 🔥 ${cfg.streak} ${d.daysUnit}`);
  const streakCounter = document.getElementById('df-streak-badge-count');
  if (streakCounter) streakCounter.textContent = toWest(cfg.streak);
  const streakLabel = document.getElementById('df-streak-label');
  if (streakLabel) streakLabel.textContent = d.daysUnit;
  document.getElementById('orbWaterTxt').textContent = toWest(`${d.waterWord} ${cfg.water}/8`);
  document.getElementById('sportSetCounterTxt').textContent = toWest(`🏋️ ${d.domSport} ${cfg.sets || 0}/4 • 12×`);
  document.getElementById('readPagesCounterTxt').textContent = toWest(`📖 ${d.domRead} ${cfg.pagesRead || 0}`);
  document.getElementById('kpiTotalMins').textContent = toWest(cfg.todayMins || 0);
  document.getElementById('kpiTotalSessions').textContent = toWest(cfg.sessions);
  const plant = cfg.sessions >= 25 ? '🌸' : cfg.sessions >= 18 ? '🌳' : cfg.sessions >= 10 ? '🌿' : '🌱';
  document.getElementById('ringPlantEmoji').textContent = plant;
  renderAnalyticsBars();
  renderTodayPlan();
  if (typeof renderDailyGoals === 'function') renderDailyGoals();
}

function updateTimerDisplay() {
  const d = L();
  const bar = document.getElementById('timerRingBar');
  bar.classList.toggle('golden-warning', timerLeft <= 60 && timerRunning);
  const m = Math.floor(timerLeft / 60).toString().padStart(2, '0');
  const s = (timerLeft % 60).toString().padStart(2, '0');
  const formatted = toWest(`${m}:${s}`);
  const offset = ringCircumference - (timerLeft / Math.max(1, timerTotal)) * ringCircumference;
  bar.style.strokeDashoffset = offset;

  document.getElementById('timerDigitsTxt').textContent = formatted;
  document.getElementById('deskClockDigits').textContent = formatted;

  const domainText = {study:d.domStudy, sport:d.domSport, read:d.domRead, work:d.domWork};
  const captions = {
    focus: (domainText[cfg.domain] || d.domStudy) + ' ' + Math.round(timerTotal / 60) + 'm',
    short: timerTotal < 60 ? timerTotal + 's' : d.modeShort,
    long: d.modeLong,
    custom: customSessionLabel || d.modeCustom
  };
  document.getElementById('timerModeCaption').textContent = toWest(captions[currentTimerModeKey] || d.modeFocus);
  if (currentTimerModeKey === 'focus' && !quickTraining?.active) {
    document.getElementById('modeFocusBtn').textContent = toWest(Math.round(timerTotal / 60) + 'm');
  }
  for (const duration of [10, 25, 50]) {
    const shortcut = document.getElementById('homeQuick' + duration);
    if (shortcut) {
      shortcut.setAttribute('aria-pressed', String(
        currentTimerModeKey === 'focus' && timerTotal === duration * 60
      ));
    }
  }
  updateFocusStatus();
}

function selectTimerModeFromUser(mins, modeKey, btn) {
  // Quick-training confirmation is handled by selectTimerMode itself.
  // Otherwise ask exactly once before replacing an active or paused session.
  if (!quickTraining?.active && (timerRunning || timerSessionId || timerActiveMs > 0) &&
      !window.confirm(typeof quickText === 'function' ? quickText('replacePrompt') :
        (cfg.lang === 'ar' ? 'تغيير الوضع سيلغي تقدم الجلسة الحالية. هل تريد المتابعة؟' :
          'Changing mode will discard current session progress. Continue?'))) return false;
  return selectTimerMode(mins, modeKey, btn) !== false;
}
function selectTimerMode(mins, modeKey, btn) {
  const endingQuickTraining = quickTraining?.active && !quickInternalChange;
  if (endingQuickTraining && !window.confirm(quickText('replacePrompt'))) return false;
  // A rejected Pause must leave the mode and any active Quick Training intact.
  if (timerRunning && toggleTimerPlay() !== true) return false;
  // A mode change discards the paused session only after its replacement is
  // durably acknowledged. Never publish a rejected idle snapshot to the UI.
  if (!persistActiveTimerSnapshot({
    total:mins*60,left:mins*60,running:false,endAt:null,
    mode:modeKey,label:customSessionLabel,sessionId:null,taskId:focusSessionTaskId,
    activeMs:0,resumedAt:null,
    training:!endingQuickTraining && quickTraining?.active ? {...quickTraining} : null
  })) return false;
  if (endingQuickTraining) {
    quickTraining = null;
    renderQuickTraining();
  }
  currentTimerModeKey = modeKey;
  timerTotal = mins * 60;
  timerLeft = timerTotal;
  if (btn) {
    btn.parentElement.querySelectorAll('.seg-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  timerSessionId = null;
  timerActiveMs = 0;
  timerResumeMs = null;
  updateTimerDisplay();
  return true;
}

function openCustomTimerModal() { document.getElementById('customTimerModal').classList.add('open'); }
function setCustomPresetValues(m) { document.getElementById('inpCustomMins').value = toWest(m); }
function applyCustomTimerNow() {
  const mins = Math.max(1, Math.min(240, parseInt(toWest(document.getElementById('inpCustomMins').value)) || 45));
  const title = document.getElementById('inpCustomTitle').value.trim();
  const nextLabel = title ? `${title} (${mins}m)` : `${L().modeCustom} (${mins}m)`;
  if (!selectTimerModeFromUser(mins, 'custom', document.getElementById('modeCustomBtn'))) return false;
  // Commit the new title only after user consent; persist the final snapshot.
  customSessionLabel = nextLabel;
  updateTimerDisplay();
  storeTimerSession();
  closeModal('customTimerModal');
  showToast(`⚡ ${customSessionLabel}`);
  return true;
}

function changeTimerDelta(deltaMins) {
  timerLeft = Math.max(10, timerLeft + deltaMins * 60);
  if (timerLeft > timerTotal) timerTotal = timerLeft;
  if (timerRunning) {
    timerTargetTime = Date.now() + (timerLeft * 1000);
    if (window.ZenNative && window.ZenNative.startBackgroundService) {
      window.ZenNative.startBackgroundService(timerLeft, document.getElementById('timerModeCaption').textContent);
    }
  }
  storeTimerSession();
  updateTimerDisplay();
}

function toggleTimerPlay() {
  const btn = document.getElementById('mainPlayBtn');
  const activeTitle = document.getElementById('timerModeCaption').textContent;

  if (timerRunning) {
    const oldActiveMs = timerActiveMs, oldResumeMs = timerResumeMs;
    const oldTargetTime = timerTargetTime;
    clearInterval(timerInterval);
    timerInterval = null;
    timerLeft = Math.max(0, Math.ceil((timerTargetTime - Date.now()) / 1000));
    accumulateActiveTime();
    timerRunning = false;
    if (storeTimerSession() !== true) {
      // A failed Pause must not stop the native alarm or strand an active session.
      timerRunning = true;
      timerActiveMs = oldActiveMs;
      timerResumeMs = oldResumeMs;
      timerTargetTime = oldTargetTime;
      timerLeft = Math.max(0, Math.ceil((timerTargetTime - Date.now()) / 1000));
      timerInterval = setInterval(runTimerTick, 500);
      updateTimerDisplay();
      return false;
    }
    if (window.ZenNative && window.ZenNative.stopBackgroundService) {
      try { window.ZenNative.stopBackgroundService(); } catch(e){}
    }
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  } else {
    try {
      if (!chimeCtx) chimeCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (chimeCtx.state === 'suspended') chimeCtx.resume();
    } catch(e){}

    const oldSessionId = timerSessionId, oldTaskId = focusSessionTaskId;
    const oldResumeMs = timerResumeMs, oldTargetTime = timerTargetTime;
    if (!timerSessionId) {
      timerSessionId = String(Date.now()) + '-' + String(Math.round(Math.random()*1e9));
      const linked = typeof focusWorkflowGetLinkedTask === 'function' ? focusWorkflowGetLinkedTask() : null;
      focusSessionTaskId = quickTraining?.active && Number.isSafeInteger(quickTraining.taskId)
        ? quickTraining.taskId : (linked?.id ?? null);
    }
    timerRunning = true;
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    timerResumeMs = Date.now();
    timerTargetTime = timerResumeMs + (timerLeft * 1000);
    if (storeTimerSession() !== true) {
      // No phantom running session, timer ID change or native alarm on denied save.
      timerRunning = false;
      timerSessionId = oldSessionId;
      focusSessionTaskId = oldTaskId;
      timerResumeMs = oldResumeMs;
      timerTargetTime = oldTargetTime;
      btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
      updateTimerDisplay();
      return false;
    }
    if (window.ZenNative && window.ZenNative.startBackgroundService) {
      try { window.ZenNative.startBackgroundService(timerLeft, activeTitle); } catch(e){}
    }
    if (window.ZenNative && typeof window.ZenNative.requestTimerNotificationPermission==='function') {
      try { window.ZenNative.requestTimerNotificationPermission(); } catch(e){}
    }
    timerInterval = setInterval(runTimerTick, 500);
  }
  return true;
}

function resetTimerNow() {
  if(quickTraining?.active) {
    cancelQuickTraining(); // Preserve Quick Training's own confirmation flow.
    return;
  }
  // Neither pausing nor clearing a session may occur before the user's answer.
  if ((timerRunning || timerSessionId || timerActiveMs > 0) &&
      !window.confirm(cfg.lang === 'ar'
        ? 'إعادة الضبط ستلغي تقدم الجلسة الحالية. هل تريد المتابعة؟'
        : 'Reset will discard the current session progress. Continue?')) return false;
  if (timerRunning && toggleTimerPlay() !== true) return false;
  timerLeft = timerTotal;
  timerSessionId = null;
  focusSessionTaskId = null;
  timerActiveMs = 0;
  timerResumeMs = null;
  storeTimerSession();
  updateTimerDisplay();
  return true;
}
function skipTimerPhase() {
  if(quickTraining?.active) { skipQuickTrainingStep(); return true; }
  // The wrapper requests consent before it mutates active/paused sessions.
  return selectTimerModeFromUser(cfg.shortMin, 'short', document.getElementById('modeShortBtn'));
}
function addWaterCup() { cfg.water = (cfg.water + 1) % 9; saveFortressData('zen_fortress_cfg_v21', cfg); syncHeaderMetrics(); }
function toggleDeskClock(show) {
  document.getElementById('deskClockOverlay').classList.toggle('active', show);
  if (window.ZenNative && window.ZenNative.setDeskClockWake) {
    try { window.ZenNative.setDeskClockWake(Boolean(show)); } catch (e) {}
  }
}

/* ========================================================
   6. TASKS, CALENDAR & SMART NOTES
   ======================================================== */
document.getElementById('inpTaskDate').value = todayISO;

let tasksList = loadFortressData('zen_fortress_tasks_v21', [
  { id: 1, isStarter: true, title: 'Complete Chapter 1 & Core Concepts', time: '09:00 - 10:00', date: todayISO, catKey: 'study', icon: '📚', theme: 'tp-blue', done: true },
  { id: 2, isStarter: true, title: 'HIIT Strength & Cardio Session (4 Sets)', time: '11:00 - 12:00', date: todayISO, catKey: 'sport', icon: '🏋️', theme: 'tp-emerald', done: false },
  { id: 3, isStarter: true, title: 'Read 25 Pages of Reference Book', time: '14:00 - 16:00', date: todayISO, catKey: 'review', icon: '📖', theme: 'tp-rose', done: false },
  { id: 4, isStarter: true, title: 'Finish Deep Work Project Milestone', time: '18:00 - 19:00', date: todayISO, catKey: 'exam', icon: '💻', theme: 'tp-amber', done: false }
]);
let taskFilterStatus = 'all';

function filterTasksByStatus(st, btn) {
  taskFilterStatus = st;
  btn.parentElement.querySelectorAll('.seg-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTasksList();
}

function getCatLabel(catKey) {
  const d = L();
  const map = { study: d.catStudy, sport: d.catSport, review: d.catReview, exam: d.catExam };
  return map[catKey] || d.catStudy;
}

function renderTasksList() {
  const box = document.getElementById('tasksShowcaseBox');
  box.innerHTML = '';

  tasksList.filter(t => {
    if (taskFilterStatus === 'active') return !t.done;
    if (taskFilterStatus === 'done') return t.done;
    return true;
  }).forEach(t => {
    const id = Number(t.id);
    if (!Number.isSafeInteger(id) || id < 0) return;
    const safeIcon = escapeHtmlText(t.icon || '🎯');
    const safeTheme = ['tp-blue','tp-amber','tp-emerald','tp-rose'].includes(t.theme) ? t.theme : 'tp-blue';
    const card = document.createElement('div');
    card.className = `showcase-task-card ${t.done ? 'done' : ''}`;
    card.innerHTML = `
      <div class="showcase-task-top">
        <div class="task-check-sq" onclick="toggleTaskDone(${id})">✓</div>
        <div class="task-center-info" onclick="focusOnTask(${id})">
          <div class="task-main-name">${escapeHtmlText(String(t.title || ''))}</div>
          <div class="task-time-sub">
            <span>📅 ${escapeHtmlText(toWest(t.date || todayISO))}</span>
            <span style="color:var(--primary); font-weight:700;">• ${escapeHtmlText(toWest(getCatLabel(t.catKey)))}</span>
          </div>
        </div>
        <div class="task-pastel-icon ${safeTheme}" onclick="deleteTaskItem(${id})">${safeIcon}</div>
      </div>
    `;
    box.appendChild(card);
  });
  renderTodayPlan();
}

function toggleTaskDone(id) {
  const t = tasksList.find(x => x.id === id);
  if (t) { t.done = !t.done; saveFortressData('zen_fortress_tasks_v21', tasksList); renderTasksList(); renderCalendar(); }
}

function focusOnTask(id) {
  const t = tasksList.find(x => x.id === id);
  if (t && !t.isStarter) {
    if (typeof focusWorkflowLinkTask === 'function' && !focusWorkflowLinkTask(t.id)) {
      showToast('⚠️ Finish the current training before changing linked tasks');
      return;
    }
    document.getElementById('timerLinkedTask').textContent = `🎯 ${String(t.title || '')}`;
    switchTab('sec-timer', document.getElementById('navTimer'));
  }
}

let lastAllocatedRecordId = 0;
function nextRecordId() {
  const existing = new Set(
    [...tasksList, ...notesList]
      .map(x => Number(x.id))
      .filter(Number.isSafeInteger)
  );
  let id = Math.max(Date.now(), lastAllocatedRecordId + 1);
  while (existing.has(id)) id++;
  lastAllocatedRecordId = id;
  return id;
}

function createNewTask() {
  const inp = document.getElementById('inpNewTask');
  const val = inp.value.trim();
  if (!val) return;
  const catKey = document.getElementById('selTaskCat').value;
  const dateVal = toWest(document.getElementById('inpTaskDate').value || todayISO);
  const themes = { study: 'tp-blue', exam: 'tp-amber', review: 'tp-rose', sport: 'tp-emerald' };
  const icons = { study: '📚', exam: '💻', review: '📖', sport: '🏋️' };
  tasksList.unshift({
    id: nextRecordId(), isStarter: false, title: val, time: '25m', date: dateVal,
    catKey: catKey, icon: icons[catKey] || '📚', theme: themes[catKey] || 'tp-blue', done: false
  });
  inp.value = '';
  saveFortressData('zen_fortress_tasks_v21', tasksList);
  renderTasksList(); renderCalendar(); showToast('✓');
}

function deleteTaskItem(id) {
  if (!confirmSensitiveAction('task')) return;
  tasksList = tasksList.filter(x => x.id !== id);
  saveFortressData('zen_fortress_tasks_v21', tasksList);
  renderTasksList(); renderCalendar();
}

let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let selectedCalDate = todayISO;

function changeCalendarMonth(delta) {
  calMonth += delta;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
}

function renderCalendar() {
  const d = L();
  document.getElementById('calMonthYearTitle').textContent = toWest(`${d.months[calMonth]} ${calYear}`);
  const weekdayRow=document.getElementById('calWeekdaysRow');
  weekdayRow.textContent = '';
  d.weekdays.forEach(w => {
    const label=document.createElement('div');
    label.textContent=toWest(w);
    weekdayRow.appendChild(label);
  });


  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const grid = document.getElementById('calDaysGrid');
  grid.innerHTML = '';

  for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement('div'));

  for (let day = 1; day <= daysInMonth; day++) {
    const iso = toWest(`${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    const hasTasks = tasksList.some(t => t.date === iso);
    const hasNotes = notesList.some(n => n.calDate === iso);

    const cell = document.createElement('div');
    cell.className = `cal-day-cell ${iso === todayISO ? 'today' : ''} ${iso === selectedCalDate ? 'selected' : ''}`;
    cell.onclick = () => { selectedCalDate = iso; renderCalendar(); };
    cell.innerHTML = `
      <span>${toWest(day)}</span>
      <div class="cal-dots-row">
        ${hasTasks ? '<span class="cal-dot dot-task"></span>' : ''}
        ${hasNotes ? '<span class="cal-dot dot-note"></span>' : ''}
      </div>
    `;
    grid.appendChild(cell);
  }
  renderSelectedDateAgenda();
}

function renderSelectedDateAgenda() {
  document.getElementById('selectedDateLabel').textContent = toWest(`📅 ${selectedCalDate}`);
  const box = document.getElementById('calendarDayAgendaBox');
  box.innerHTML = '';

  const dayTasks = tasksList.filter(t => t.date === selectedCalDate);
  const dayNotes = notesList.filter(n => n.calDate === selectedCalDate);

  if (dayTasks.length === 0 && dayNotes.length === 0) {
    box.innerHTML = `<div style="font-size:0.78rem; color:var(--text-light); text-align:center; padding:12px;">✨ ${L().btnAddCalNote}</div>`;
    return;
  }

  dayTasks.forEach(t => {
    const item = document.createElement('div');
    item.style.cssText = 'padding:10px 12px; border-radius:14px; background:#f8fafc; border-right:4px solid #10b981; font-size:0.8rem; font-weight:800; display:flex; justify-content:space-between;';
    item.innerHTML = `<span>${t.done ? '✅' : '📋'} ${escapeHtmlText(String(t.title || ''))}</span><span style="color:var(--text-muted); font-size:0.7rem;">${escapeHtmlText(toWest(getCatLabel(t.catKey)))}</span>`;
    box.appendChild(item);
  });

  dayNotes.forEach(n => {
    const item = document.createElement('div');
    item.style.cssText = 'padding:10px 12px; border-radius:14px; background:#fffbeb; border-right:4px solid #f59e0b; font-size:0.8rem;';
    item.innerHTML = `<div style="font-weight:900;">📝 ${escapeHtmlText(String(n.title || ''))}</div><div style="color:var(--text-muted); font-size:0.74rem; margin-top:3px;">${escapeHtmlText(String(n.body || ''))}</div>`;
    box.appendChild(item);
  });
}

function openNoteModalForSelectedDate() { openNoteModal(selectedCalDate); }

let notesList = loadFortressData('zen_fortress_notes_v21', [
  { id: 1, isStarter: true, title: 'Spaced Repetition System', body: 'Reviewing concepts at increasing intervals strengthens long-term memory retention.', catKey: 'cornell', calDate: todayISO, blur: false, theme: 'theme-violet' },
  { id: 2, isStarter: true, title: 'Active Recall: Key Formula & Law', body: 'Hidden Answer: Performance = Focused Time × Intensity.', catKey: 'flash', calDate: todayISO, blur: true, theme: 'theme-emerald' },
  { id: 3, isStarter: true, title: 'Workout & Training Log', body: '1. Warm-up 5m\n2. 4 Sets Compound Exercises\n3. Cool-down stretch.', catKey: 'quick', calDate: todayISO, blur: false, theme: 'theme-amber' }
]);
let noteTagFilter = 'all';

function getNoteTagLabel(k) {
  const d = L();
  const map = { cornell: d.tagCornell, flash: d.tagFlash, quick: d.tagQuick };
  return map[k] || d.tagCornell;
}

function filterNotesByTag(tag, btn) {
  noteTagFilter = tag;
  btn.parentElement.querySelectorAll('.seg-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderNotesStack();
}

function renderNotesStack() {
  const box = document.getElementById('notesStackBox');
  const q = (document.getElementById('inpSearchNotes').value || '').toLowerCase();
  box.innerHTML = '';

  notesList.filter(n => {
    if (!(n.title + ' ' + n.body).toLowerCase().includes(q)) return false;
    if (noteTagFilter !== 'all' && n.catKey !== noteTagFilter) return false;
    return true;
  }).forEach(n => {
    const id = Number(n.id);
    if (!Number.isSafeInteger(id) || id < 0) return;
    const card = document.createElement('div');
    card.className = `learning-rich-card ${n.theme}`;
    card.innerHTML = `
      <div class="lcard-head">
        <div class="lcard-title"><span>✨</span> <span>${escapeHtmlText(String(n.title || ''))}</span></div>
        <div style="display:flex; gap:8px;">
          <span style="cursor:pointer;" onclick="pinNoteToTodayCalendar(${id})">📅</span>
          <span style="cursor:pointer;" onclick="toggleNoteBlur(${id})">👁️</span>
          <span style="cursor:pointer; color:var(--rose);" onclick="deleteNoteCard(${id})">✕</span>
        </div>
      </div>
      <div class="lcard-body ${n.blur ? 'blurred-secret' : ''}" onclick="this.classList.toggle('blurred-secret')">${escapeHtmlText(String(n.body || ''))}</div>
      <div class="lcard-foot">
        <span>📅 ${escapeHtmlText(toWest(n.calDate || todayISO))}</span>
        <span style="font-weight:800; color:var(--primary);">${escapeHtmlText(toWest(getNoteTagLabel(n.catKey)))}</span>
      </div>
    `;
    box.appendChild(card);
  });
}

function openNoteModal(defaultDate = null) {
  document.getElementById('inpNoteTitle').value = '';
  document.getElementById('inpNoteBody').value = '';
  document.getElementById('inpNoteCalDate').value = toWest(defaultDate || selectedCalDate || todayISO);
  document.getElementById('chkNoteBlur').checked = false;
  document.getElementById('noteModal').classList.add('open');
}

function fillNoteTpl(type) {
  if (type === 'cornell') {
    document.getElementById('selNoteCat').value = 'cornell';
    document.getElementById('inpNoteBody').value = '📌 1:\n📖 2:\n💡 3:';
    document.getElementById('chkNoteBlur').checked = false;
  } else {
    document.getElementById('selNoteCat').value = 'flash';
    document.getElementById('chkNoteBlur').checked = true;
  }
}

function saveNewNote() {
  const t = document.getElementById('inpNoteTitle').value.trim();
  const b = document.getElementById('inpNoteBody').value.trim();
  if (!t && !b) return;
  const catKey = document.getElementById('selNoteCat').value;
  const calDate = toWest(document.getElementById('inpNoteCalDate').value || todayISO);
  const blur = document.getElementById('chkNoteBlur').checked;
  notesList.unshift({
    id: nextRecordId(), isStarter: false, title: t || L().navNotes, body: b,
    catKey: catKey, calDate: calDate, blur: blur, theme: blur ? 'theme-emerald' : 'theme-violet'
  });
  saveFortressData('zen_fortress_notes_v21', notesList);
  renderNotesStack(); renderCalendar(); closeModal('noteModal'); showToast('✓');
}

function pinNoteToTodayCalendar(id) {
  const n = notesList.find(x => x.id === id);
  if (n) { n.calDate = selectedCalDate; saveFortressData('zen_fortress_notes_v21', notesList); renderNotesStack(); renderCalendar(); showToast(`📅 ${selectedCalDate}`); }
}

function toggleNoteBlur(id) {
  const n = notesList.find(x => x.id === id);
  if (n) { n.blur = !n.blur; saveFortressData('zen_fortress_notes_v21', notesList); renderNotesStack(); }
}

function deleteNoteCard(id) {
  if (!confirmSensitiveAction('note')) return;
  notesList = notesList.filter(x => x.id !== id);
  saveFortressData('zen_fortress_notes_v21', notesList);
  renderNotesStack(); renderCalendar();
}

function exportAllNotes() {
  const txt = notesList.map(n => `[${String(n.title || '')} - ${toWest(n.calDate)}]\n${String(n.body || '')}`).join('\n\n---\n\n');
  if (navigator.clipboard) navigator.clipboard.writeText(txt);
  showToast('📥 TXT');
}

function openBrainDumpModal() {
  document.getElementById('inpQuickDump').value = '';
  document.getElementById('brainDumpModal').classList.add('open');
}

function saveQuickDump(toTasks) {
  const val = document.getElementById('inpQuickDump').value.trim();
  if (!val) return;
  if (toTasks) {
    tasksList.unshift({ id: nextRecordId(), isStarter: false, title: val, time: '25m', date: todayISO, catKey: 'study', icon: '🎯', theme: 'tp-amber', done: false });
    saveFortressData('zen_fortress_tasks_v21', tasksList);
    renderTasksList();
  } else {
    notesList.unshift({ id: nextRecordId(), isStarter: false, title: '💭', body: val, catKey: 'quick', calDate: todayISO, blur: false, theme: 'theme-violet' });
    saveFortressData('zen_fortress_notes_v21', notesList);
    renderNotesStack();
  }
  renderCalendar(); closeModal('brainDumpModal'); showToast('✓');
}

/* ========================================================
   7. 12 PURE NATURE SOUNDS WITH PHOTOS & VOLUME SLIDERS
   ======================================================== */
const SOUNDS_DATA = [
  { id: 'ocean', cat: 'water', cls: 'sbg-ocean', vol: 0.7, src: 'sounds/ocean.ogg', url: 'https://actions.google.com/sounds/v1/water/waves_crashing_on_rock_beach.ogg' },
  { id: 'rain', cat: 'water', cls: 'sbg-rain', vol: 0.65, src: 'sounds/rain.ogg', url: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg' },
  { id: 'fire', cat: 'warm', cls: 'sbg-fire', vol: 0.75, src: 'sounds/fire.ogg', url: 'https://actions.google.com/sounds/v1/ambiences/fire.ogg' },
  { id: 'forest', cat: 'forest', cls: 'sbg-forest', vol: 0.65, src: 'sounds/forest.ogg', url: 'https://actions.google.com/sounds/v1/ambiences/forest_morning.ogg' },
  { id: 'stream', cat: 'water', cls: 'sbg-stream', vol: 0.7, src: 'sounds/stream.ogg', url: 'https://actions.google.com/sounds/v1/water/small_stream_flowing.ogg' },
  { id: 'leaves', cat: 'forest', cls: 'sbg-leaves', vol: 0.6, src: 'sounds/leaves.ogg', url: 'https://actions.google.com/sounds/v1/ambiences/outdoor_summer_ambience.ogg' },
  { id: 'waterfall', cat: 'water', cls: 'sbg-waterfall', vol: 0.65, src: 'sounds/waterfall.ogg', url: 'https://actions.google.com/sounds/v1/water/waterfall_medium.ogg' },
  { id: 'night', cat: 'forest', cls: 'sbg-night', vol: 0.55, src: 'sounds/night.ogg', url: 'https://actions.google.com/sounds/v1/ambiences/crickets_chirping.ogg' },
  { id: 'thunder', cat: 'water', cls: 'sbg-thunder', vol: 0.6, src: 'sounds/thunder.ogg', url: 'https://actions.google.com/sounds/v1/weather/rolling_thunder.ogg' },
  { id: 'wind', cat: 'forest', cls: 'sbg-wind', vol: 0.55, src: 'sounds/wind.ogg', url: 'https://actions.google.com/sounds/v1/weather/wind_blowing.ogg' },
  { id: 'winrain', cat: 'water', cls: 'sbg-winrain', vol: 0.65, src: 'sounds/winrain.ogg', url: 'https://actions.google.com/sounds/v1/weather/rain_on_rooftop.ogg' },
  { id: 'earth', cat: 'warm', cls: 'sbg-earth', vol: 0.5, src: 'sounds/earth.ogg', url: 'https://actions.google.com/sounds/v1/ambiences/ambient_hum_air_conditioner.ogg' }
];

let soundCat = 'all';
const activePlayers = {};
// A stale media error or delayed play promise may never restart a stopped tile.
const soundGeneration = Object.create(null);
let webAudioCtx = null;

function createNatureSynthFallback(id, vol) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) throw new Error('Web Audio is unavailable');
  if (!webAudioCtx) webAudioCtx = new AudioCtx();
  if (webAudioCtx.state === 'suspended') webAudioCtx.resume();
  const sr = webAudioCtx.sampleRate, len = Math.round(sr * 8);
  const buf = webAudioCtx.createBuffer(1, len, sr);
  const samples = buf.getChannelData(0);
  let smoothed = 0, slow = 0;
  // A local synthetic fallback, never represented as a field recording.
  for (let i = 0; i < len; i++) {
    const time = i / sr, noise = Math.random() * 2 - 1;
    smoothed = smoothed * 0.92 + noise * 0.08;
    slow = slow * 0.998 + noise * 0.002;
    let value;
    if (id === 'night') {
      const chirp1 = Math.pow(Math.max(0, Math.sin(2 * Math.PI * 2.7 * time)), 9);
      const chirp2 = Math.pow(Math.max(0, Math.sin(2 * Math.PI * 3.5 * time + 1.4)), 11);
      value = Math.sin(2 * Math.PI * 3100 * time) * chirp1 * 0.09
            + Math.sin(2 * Math.PI * 3900 * time) * chirp2 * 0.065
            + smoothed * 0.16;
    } else if (id === 'waterfall') {
      const surge = 0.65 + 0.12 * Math.sin(2 * Math.PI * 0.19 * time);
      value = (noise * 0.20 + smoothed * 1.15 + slow * 0.5) * surge;
    } else {
      value = smoothed * 0.85 + slow * 0.35;
    }
    samples[i] = Math.max(-0.8, Math.min(0.8, value));
  }
  const source = webAudioCtx.createBufferSource();
  source.buffer = buf;
  source.loop = true;
  const filter = webAudioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = id === 'night' ? 5500 : id === 'waterfall' ? 2600 : 650;
  const gain = webAudioCtx.createGain();
  gain.gain.value = Math.max(0, Math.min(1, vol)) * 0.55;
  source.connect(filter); filter.connect(gain); gain.connect(webAudioCtx.destination);
  source.start();
  return {
    pause: () => { try { source.stop(); source.disconnect(); filter.disconnect(); gain.disconnect(); } catch (e) {} },
    setVol: v => gain.gain.setValueAtTime(Math.max(0, Math.min(1, v)) * 0.55, webAudioCtx.currentTime)
  };
}

function stopSoundTile(id) {
  soundGeneration[id] = (soundGeneration[id] || 0) + 1;
  const player = activePlayers[id];
  if (player) {
    delete activePlayers[id];
    try { player.pause(); } catch (e) {}
  }
}

function toggleSoundTile(id) {
  const s = SOUNDS_DATA.find(x => x.id === id);
  if (!s) return;
  const sName = L().sounds[id] || id;
  if (activePlayers[id]) {
    stopSoundTile(id);
    showToast(`⏹ ${sName}`);
    renderSoundsStudio();
    return;
  }
  const token = (soundGeneration[id] || 0) + 1;
  soundGeneration[id] = token;
  const audio = new Audio();
  audio.loop = true;
  audio.volume = s.vol;
  audio.src = s.src;
  let fallbackUsed = false;
  const player = {
    pause() { audio.onerror = null; audio.pause(); },
    setVol(v) { audio.volume = v; }
  };
  // Register synchronously before play() can reject or fire an error.
  activePlayers[id] = player;
  const activateFallback = () => {
    if (fallbackUsed || soundGeneration[id] !== token || activePlayers[id] !== player) return;
    fallbackUsed = true;
    audio.onerror = null;
    audio.pause();
    try {
      const fallback = createNatureSynthFallback(id, s.vol);
      // Keep the same identity so late handlers can be invalidated safely.
      player.pause = () => fallback.pause();
      player.setVol = v => fallback.setVol(v);
      showToast('⚠️ Local recording unavailable — synthesized ambience');
    } catch (e) {
      stopSoundTile(id);
      showToast('⚠️ Audio output unavailable');
    }
    renderSoundsStudio();
  };
  audio.onerror = activateFallback;
  try {
    const playing = audio.play();
    if (playing && typeof playing.then === 'function') {
      playing.then(() => {
        if (soundGeneration[id] === token && activePlayers[id] === player && !fallbackUsed)
          showToast(`🔊 ${sName}`);
      }).catch(activateFallback);
    }
  } catch (e) { activateFallback(); }
  renderSoundsStudio();
}

function setTileVolume(id, val) {
  const v = Number(val);
  if (!Number.isFinite(v)) return;
  const clamped = Math.max(0, Math.min(1, v));
  const s = SOUNDS_DATA.find(x => x.id === id);
  if (s) s.vol = clamped;
  if (activePlayers[id]) activePlayers[id].setVol(clamped);
}

function playPresetRelaxMix() {
  stopAllAudio();
  toggleSoundTile('rain');
  toggleSoundTile('fire');
}
function stopAllAudio() {
  SOUNDS_DATA.forEach(s => stopSoundTile(s.id));
  renderSoundsStudio();
}

function filterSoundsByCat(cat, btn) {
  soundCat = cat;
  btn.parentElement.querySelectorAll('.seg-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderSoundsStudio();
}

function renderSoundsStudio() {
  const box = document.getElementById('soundsGridBox');
  box.innerHTML = '';
  const d = L();

  for (const s of SOUNDS_DATA) {
    if (soundCat !== 'all' && s.cat !== soundCat) continue;
    const isOn = !!activePlayers[s.id];
    const sName = d.sounds[s.id] || s.id;
    const tile = document.createElement('div');
    tile.className = `sound-Rich-tile ${s.cls} ${isOn ? 'playing' : ''}`;
    tile.onclick = () => toggleSoundTile(s.id);
    tile.innerHTML = `
      <div class="stile-top">
        <div class="stile-play-btn">${isOn ? '❚❚' : '▶'}</div>
        <div class="stile-switch"><div class="stile-knob"></div></div>
      </div>
      <div>
        <div class="stile-name">${escapeHtmlText(toWest(sName))}</div>
        <div class="stile-volume-label"><span>🔉 ${cfg.lang === 'ar' ? 'مستوى الصوت' : 'Volume'}</span><strong class="stile-volume-pct">${Math.round(s.vol*100)}%</strong></div>
        <input type="range" class="stile-vol" min="0" max="1" step="0.05" value="${s.vol}" aria-label="${escapeHtmlText((cfg.lang === 'ar' ? 'مستوى صوت ' : 'Volume for ') + sName)}" onclick="event.stopPropagation()" oninput="setTileVolume('${s.id}', this.value);this.parentElement.querySelector('.stile-volume-pct').textContent=Math.round(Number(this.value)*100)+'%'">
      </div>
    `;
    box.appendChild(tile);
  }
  // Bind reviewed Audio/Settings strings only after creating the visible tiles.
  // This adapter is display-only; playback and v21 storage stay unchanged.
  window.DeepFocusAudioSettingsLocale?.bindSoundStudio({
    document,
    locale: cfg.lang,
    catalog: SOUNDS_DATA,
    category: soundCat,
    legacy: { locale: cfg.lang, sounds: d.sounds }
  });
}

/* ========================================================
   8. ANALYTICS & GOAL CALCULATOR (100% WESTERN DIGITS)
   ======================================================== */
function renderAnalyticsBars() {
  // Share the read-only v21 ledger's validation and ID deduplication with Analytics.
  // The core loads after app.js; defer reporting until it is available.
  const hist = window.DeepFocusAnalyticsV21?.normalizeSessions?.(cfg.sessionHistory)?.sessions || [];
  const recent = Array.from({length: 7}, (_, i) => {
    const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() - (6-i));
    const key = localDateISO(date);
    return { key, weekday: date.getDay(), minutes: 0 };
  });
  const domains = {study: 0, sport: 0, read: 0, work: 0};
  for (const entry of hist) {
    if (typeof entry.date !== 'string') continue;
    const minute = Number(entry.minutes);
    if (!Number.isFinite(minute) || minute < 0 || minute > 1440) continue;
    const day = recent.find(d => d.key === entry.date);
    if (!day) continue;
    day.minutes += minute;
    const domain = entry.domain === 'exam' ? 'work' : entry.domain === 'review' ? 'read' : entry.domain;
    if (Object.prototype.hasOwnProperty.call(domains, domain)) domains[domain] += minute;
  }
  const total = recent.reduce((a, b) => a + b.minutes, 0);
  const all = Object.values(domains).reduce((a,b) => a+b, 0);
  const colors = {study:'#3b82f6', sport:'#10b981', read:'#8b5cf6', work:'#f59e0b'};
  let accumulated = 0;
  const sections = [];
  for (const k of Object.keys(domains)) {
    const percent = all ? domains[k]/all*100 : 0;
    const el = document.getElementById('share-' + k);
    if (el) el.textContent = all ? Math.round(percent) + '%' : '—';
    if (percent) {
      sections.push(colors[k] + ' ' + accumulated.toFixed(2) + '% ' + (accumulated+percent).toFixed(2) + '%');
      accumulated += percent;
    }
  }
  const donut = document.getElementById('activityDonut');
  if (donut) donut.style.background = sections.length ? 'conic-gradient(' + sections.join(',') + ')' : '#f1f5f9';
  const donutText = document.getElementById('activityDonutText');
  if (donutText) donutText.textContent = all ? Math.round(domains.study/all*100)+'%' : '—';
  const trend = document.getElementById('kpiWeeklyTrend');
  if (trend) trend.textContent = total + ' recorded minutes / 7 days';
  const sessionsTrend = document.getElementById('kpiSessionTrend');
  if (sessionsTrend) sessionsTrend.textContent = hist.filter(h => recent.some(d => d.key === h.date)).length + ' verified sessions / 7 days';
  const minsLabel = document.getElementById('waveRecordedMinutes');
  if (minsLabel) minsLabel.textContent = String(total);
  const barBox = document.getElementById('anMiniBarsBox');
  if (barBox) {
    barBox.textContent = '';
    const maxMinutes = Math.max(1, ...recent.map(d => d.minutes));
    recent.forEach((d,i) => {
      const col = document.createElement('div');
      col.className = 'mbar-col';
      const bar = document.createElement('div');
      bar.className = 'mbar-fill' + (d.minutes === maxMinutes && d.minutes > 0 ? ' peak' : '');
      bar.style.height = (d.minutes > 0 ? Math.max(3, Math.round(d.minutes/maxMinutes*75)) : 2) + 'px';
      bar.title = d.key + ': ' + d.minutes + ' min';
      col.appendChild(bar);
      barBox.appendChild(col);
    });
  }
  const max = Math.max(1, ...recent.map(d=>d.minutes));
  const points = recent.map((d,i) => [i*(320/6), 95-(d.minutes/max)*75]);
  const dline = points.map((p,i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const line = document.getElementById('waveLine'), area = document.getElementById('waveArea'), peak = document.getElementById('wavePeak');
  if (line) line.setAttribute('d',dline);
  if (area) area.setAttribute('d',dline + ' L320 95 L0 95 Z');
  if (peak) {
    const i = recent.findIndex(d => d.minutes === Math.max(...recent.map(x=>x.minutes)));
    peak.setAttribute('cx',points[i][0]); peak.setAttribute('cy',points[i][1]);
    peak.style.visibility = total ? 'visible' : 'hidden';
  }
  const d = L();
  const daysRow = document.getElementById('waveDaysRow');
  if (daysRow) daysRow.textContent = '';
  if (daysRow) recent.forEach(day => {
    const label = document.createElement('span');
    label.textContent = d.weekdays[day.weekday] || String(day.weekday);
    daysRow.appendChild(label);
  });
}

function addQuickSessionRecord() {
  showToast('ℹ️ Statistics update only after a completed focus session');
}

function updateSyllabusCalc() {
  const elLeft = document.getElementById('inpPagesLeft');
  const elRate = document.getElementById('inpDailyRate');
  elLeft.value = toWest(elLeft.value).replace(/[^0-9]/g, '');
  elRate.value = toWest(elRate.value).replace(/[^0-9]/g, '');
  const left = Math.max(1, parseInt(elLeft.value) || 1);
  const rate = Math.max(1, parseInt(elRate.value) || 1);
  const days = Math.ceil(left / rate);
  // A missing locale string remains a translation gap; render safely instead of
  // crashing the language picker. Source coverage must NOT count this as translated.
  const localizedTemplate = L().calcOutTpl;
  const fallbackTemplate = DICT.en && DICT.en.calcOutTpl;
  const template = typeof localizedTemplate === 'string' && localizedTemplate.includes('{d}')
    ? localizedTemplate
    : (typeof fallbackTemplate === 'string' && fallbackTemplate.includes('{d}')
        ? fallbackTemplate : '{d} days');
  document.getElementById('syllabusCalcOut').textContent = toWest(template.replace('{d}', days));
}

/* Boot Init */
syncDailyRollover();
renderAnalyticsBars();
applyLanguage(cfg.lang || 'en');
renderDomainState();
restoreTimerSession();
document.body.classList.add('timer-home');
document.getElementById('heroHeader').style.setProperty('--page-ambient', TAB_GRADS['sec-timer']);
initQuickTraining();
renderTodayPlan();


document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('button, .btn, [role="button"], input[type="range"]').forEach(el => {
    el.addEventListener('click', () => {
      if (window.triggerHaptic) window.triggerHaptic('click');
    });
  });
});


/* ========================================================
   DEEP FOCUS — PRISTINE CARDS & INTERACTIVE CALENDAR (M190)
   ======================================================== */
function applyPristineUIElevations() {
  // 1. تنظيف بطاقات الملاحظات والمهام (إخفاء أزرار الفوضى الزائدة من وجه الكارت)
  document.querySelectorAll('.note-card, [class*="note" i] [class*="card" i]').forEach(card => {
    // ترك زري (تحرير) و (أرشفة) وإخفاء بقية الأزرار المشتتة عن واجهة الكارت
    const buttons = card.querySelectorAll('button, .btn');
    buttons.forEach(btn => {
      const text = btn.textContent.trim();
      if (text.includes('تراجع') || text.includes('إعادة') || text.includes('إنشاء مهام')) {
        btn.style.display = 'none';
      }
    });
  });

  // 2. جعل بطاقات التقويم تفاعلية بالكامل
  document.querySelectorAll('#view-calendar .card, [data-view="calendar"] [class*="card" i]').forEach(card => {
    if (!card.dataset.calClickBound) {
      card.dataset.calClickBound = "true";
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => {
        if (window.triggerHaptic) window.triggerHaptic('click');
        // فتح الملاحظة في نافذة التعديل مباشرة
        const title = card.querySelector('h3, .font-bold, div:first-child')?.textContent || 'Calendar Entry';
        const editBtn = card.querySelector('button');
        if (editBtn) editBtn.click();
      });
    }
  });

  // 3. قسر الأرقام الغربية على حقول تواريخ التحليلات
  document.querySelectorAll('input[type="date"]').forEach(inp => {
    inp.setAttribute('lang', 'en-US');
    inp.style.direction = 'ltr';
    inp.style.fontVariantNumeric = 'lining-nums';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  applyPristineUIElevations();
  const observer = new MutationObserver(applyPristineUIElevations);
  observer.observe(document.body, { childList: true, subtree: true });
});

// Safe Fusion of Comprehensive Dictionaries
if (typeof DICT !== 'undefined') {
  Object.assign(DICT, {
  "es": {
    "title": "Enfoque y Rendimiento",
    "sub": "Estudio, Entrenamiento y Trabajo Profundo",
    "pillCloud": "Copia Manual",
    "pillSound": "Probar Sonido",
    "pillShare": "Compartir",
    "pillSecure": "Datos Locales",
    "domStudy": "Estudio",
    "domSport": "Entrenamiento",
    "domRead": "Lectura",
    "domWork": "Trabajo Profundo",
    "navTimer": "Temporizador",
    "navTasks": "Tareas",
    "navCalendar": "Calendario",
    "navNotes": "Notas",
    "navSounds": "Naturaleza",
    "navAnalytics": "Estadísticas",
    "totalFocusToday": "Minutos Activos Hoy",
    "minsUnit": "min",
    "daysUnit": "días",
    "waterWord": "Agua",
    "orbDump": "Nota Rápida",
    "orbCloud": "Exportar Copia",
    "orbDesk": "Reloj de Mesa",
    "modeFocus": "25m",
    "modeShort": "5m",
    "modeLong": "15m",
    "modeCustom": "Personalizado ⚡",
    "startFocusAchieve": "Planificar • Ejecutar • Lograr",
    "filterAll": "Todo",
    "filterToday": "Activo",
    "filterDone": "Completado",
    "phAddTask": "Añadir objetivo de estudio o tarea...",
    "phSearchNotes": "Buscar notas y resúmenes...",
    "catStudy": "📚 Estudio",
    "catSport": "🏋 Deporte",
    "catReview": "📖 Lectura",
    "catExam": "💻 Trabajo",
    "tagCornell": "Resumen Estructurado 📋",
    "tagFlash": "Recuerdo Activo 🧠",
    "tagQuick": "Registro 💡",
    "btnAddCalNote": "+ Añadir Nota a la Fecha",
    "lblBlurAnswer": "Toca para revelar respuesta",
    "mixerReady": "🎵 Sonidos Naturales Listos",
    "btnMyMix": "✨ Mezcla",
    "btnStopAll": "⏹ Detener",
    "sndCatWater": "Agua y Lluvia 🌧️",
    "sndCatForest": "Bosque y Viento 🌲",
    "sndCatWarm": "Fuego y Tierra 🔥",
    "kpiMinutes": "Minutos Activos",
    "kpiSessions": "Sesiones Completadas",
    "btnSave": "Guardar",
    "btnCancel": "Cancelar",
    "weekdays": [
      "Dom",
      "Lun",
      "Mar",
      "Mié",
      "Jue",
      "Vie",
      "Sáb"
    ],
    "months": [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre"
    ],
    "sounds": {
      "ocean": "Olas del Océano",
      "rain": "Lluvia Suave de Bosque",
      "fire": "Fuego de Campamento",
      "forest": "Brisa de Pinos",
      "stream": "Arroyo de Montaña",
      "leaves": "Hojas Crujientes",
      "waterfall": "Cascada",
      "night": "Grillos Nocturnos",
      "thunder": "Truenos Lejanos",
      "wind": "Viento Fuerte",
      "winrain": "Lluvia en Ventana",
      "earth": "Susurro Profundo"
    }
  },
  "fr": {
    "title": "Focus et Performance",
    "sub": "Étude, Entraînement et Travail Profond",
    "pillCloud": "Sauvegarde Manuelle",
    "pillSound": "Tester le Son",
    "pillShare": "Partager",
    "pillSecure": "Données Locales",
    "domStudy": "Étude",
    "domSport": "Entraînement",
    "domRead": "Lecture",
    "domWork": "Travail Profond",
    "navTimer": "Minuteur",
    "navTasks": "Tâches",
    "navCalendar": "Calendrier",
    "navNotes": "Notes",
    "navSounds": "Nature",
    "navAnalytics": "Analytique",
    "totalFocusToday": "Minutes Actives Aujourd’hui",
    "minsUnit": "min",
    "daysUnit": "jours",
    "waterWord": "Eau",
    "orbDump": "Note Rapide",
    "orbCloud": "Exporter",
    "orbDesk": "Horloge Bureau",
    "modeFocus": "25m",
    "modeShort": "5m",
    "modeLong": "15m",
    "modeCustom": "Personnalisé ⚡",
    "startFocusAchieve": "Planifier • Exécuter • Réussir",
    "filterAll": "Tout",
    "filterToday": "Actif",
    "filterDone": "Terminé",
    "phAddTask": "Ajouter un objectif d’étude...",
    "phSearchNotes": "Rechercher des notes...",
    "catStudy": "📚 Étude",
    "catSport": "🏋 Sport",
    "catReview": "📖 Lecture",
    "catExam": "💻 Travail",
    "tagCornell": "Résumé Structuré 📋",
    "tagFlash": "Rappel Actif 🧠",
    "tagQuick": "Journal 💡",
    "btnAddCalNote": "+ Ajouter une Note",
    "lblBlurAnswer": "Appuyez pour révéler la réponse",
    "mixerReady": "🎵 Sons Naturels Prêts",
    "btnMyMix": "✨ Mix",
    "btnStopAll": "⏹ Arrêter",
    "sndCatWater": "Eau et Pluie 🌧️",
    "sndCatForest": "Forêt et Vent 🌲",
    "sndCatWarm": "Feu et Terre 🔥",
    "kpiMinutes": "Minutes Actives",
    "kpiSessions": "Sessions Terminées",
    "btnSave": "Enregistrer",
    "btnCancel": "Annuler",
    "weekdays": [
      "Dim",
      "Lun",
      "Mar",
      "Mer",
      "Jeu",
      "Ven",
      "Sam"
    ],
    "months": [
      "Janvier",
      "Février",
      "Mars",
      "Avril",
      "Mai",
      "Juin",
      "Juillet",
      "Août",
      "Septembre",
      "Octobre",
      "Novembre",
      "Décembre"
    ],
    "sounds": {
      "ocean": "Vagues de l’Océan",
      "rain": "Pluie Douce en Forêt",
      "fire": "Feu de Camp",
      "forest": "Brise de Pins",
      "stream": "Ruisseau de Montagne",
      "leaves": "Feuilles Mortes",
      "waterfall": "Cascade",
      "night": "Grillons de Nuit",
      "thunder": "Tonnerre Lointain",
      "wind": "Vent d’Altitude",
      "winrain": "Pluie sur la Fenêtre",
      "earth": "Gronderie Terrestre"
    }
  },
  "tr": {
    "title": "Derin Odak & Performans",
    "sub": "Ders, Antrenman ve Derin Çalışma",
    "pillCloud": "Manuel Yedekleme",
    "pillSound": "Sesi Test Et",
    "pillShare": "Paylaş",
    "pillSecure": "Yerel Veriler",
    "domStudy": "Ders",
    "domSport": "Antrenman",
    "domRead": "Okuma",
    "domWork": "Derin Çalışma",
    "navTimer": "Zamanlayıcı",
    "navTasks": "Görevler",
    "navCalendar": "Takvim",
    "navNotes": "Notlar",
    "navSounds": "Doğa",
    "navAnalytics": "Analitik",
    "totalFocusToday": "Bugünkü Aktif Dakikalar",
    "minsUnit": "dk",
    "daysUnit": "gün",
    "waterWord": "Su",
    "orbDump": "Hızlı Not",
    "orbCloud": "Yedeği Dışa Aktar",
    "orbDesk": "Masa Saati",
    "modeFocus": "25m",
    "modeShort": "5m",
    "modeLong": "15m",
    "modeCustom": "Özel ⚡",
    "startFocusAchieve": "Planla • Uygula • Başar",
    "filterAll": "Tümü",
    "filterToday": "Aktif",
    "filterDone": "Tamamlandı",
    "phAddTask": "Çalışma hedefi ekle...",
    "phSearchNotes": "Notları ve özetleri ara...",
    "catStudy": "📚 Ders",
    "catSport": "🏋 Spor",
    "catReview": "📖 Okuma",
    "catExam": "💻 İş",
    "tagCornell": "Yapılandırılmış Özet 📋",
    "tagFlash": "Aktif Hatırlama 🧠",
    "tagQuick": "Günlük 💡",
    "btnAddCalNote": "+ Tarihe Not Ekle",
    "lblBlurAnswer": "Cevabı görmek için dokun",
    "mixerReady": "🎵 Doğa Sesleri Hazır",
    "btnMyMix": "✨ Karışım",
    "btnStopAll": "⏹ Durdur",
    "sndCatWater": "Su ve Yağmur 🌧️",
    "sndCatForest": "Orman ve Rüzgar 🌲",
    "sndCatWarm": "Ateş ve Toprak 🔥",
    "kpiMinutes": "Aktif Dakika",
    "kpiSessions": "Tamamlanan Oturum",
    "btnSave": "Kaydet",
    "btnCancel": "İptal",
    "weekdays": [
      "Paz",
      "Pzt",
      "Sal",
      "Çar",
      "Per",
      "Cum",
      "Cmt"
    ],
    "months": [
      "Ocak",
      "Şubat",
      "Mart",
      "Nisan",
      "Mayıs",
      "Haziran",
      "Temmuz",
      "Ağustos",
      "Eylül",
      "Ekim",
      "Kasım",
      "Aralık"
    ],
    "sounds": {
      "ocean": "Okyanus Dalgaları",
      "rain": "Yumuşak Orman Yağmuru",
      "fire": "Kamp Ateşi",
      "forest": "Çam Esintisi",
      "stream": "Dağ Deresi",
      "leaves": "Hışırdayan Yapraklar",
      "waterfall": "Şelale",
      "night": "Gece Cırcır Böcekleri",
      "thunder": "Uzak Gök Gürültüsü",
      "wind": "Yayla Rüzgarı",
      "winrain": "Cama Vuran Yağmur",
      "earth": "Derin Toprak Uğultusu"
    }
  }
});
}


/* ========================================================
   DEEP FOCUS — SHAREABLE FOCUS CARD & SOCIAL PROOF (M193)
   ======================================================== */
const ShareCardEngine = (function() {
  function getSafeData() {
    const s = typeof localStorage !== 'undefined' ? localStorage : null;
    const streak = s ? (s.getItem('df_streak_count') || '1') : '1';
    const mins = document.querySelector('[class*="recorded-minutes"], .text-5xl, .stat-mins')?.textContent?.trim() || '25';
    const sessions = document.querySelector('[class*="sessions-count"], .stat-sessions')?.textContent?.trim() || '1';
    const task = s ? (s.getItem('df_focused_task_text') || 'Core Study Milestone') : 'Core Study Milestone';
    const today = new Date().toISOString().slice(0, 10);
    return { streak, mins, sessions, task, today };
  }

  function showShareCardModal() {
    if (document.getElementById('df-share-card-modal')) return;
    const data = getSafeData();

    const modal = document.createElement('div');
    modal.id = 'df-share-card-modal';
    modal.className = 'fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none';
    modal.innerHTML = `
      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-white shadow-2xl relative animate-in fade-in">
        <button id="df-share-close" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold">✕</button>
        
        <!-- Header -->
        <div class="flex items-center gap-2 mb-4 text-emerald-400 font-mono text-xs font-bold tracking-widest uppercase">
          <span>⚡ DEEP FOCUS</span>
          <span class="text-slate-600">•</span>
          <span>DAILY PROOF</span>
        </div>

        <!-- Date & Flame -->
        <div class="flex items-center justify-between mb-5">
          <div class="text-sm font-bold text-slate-300 font-mono" style="font-variant-numeric: lining-nums;">${data.today}</div>
          <div class="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-xs font-bold flex items-center gap-1.5 font-mono">
            <span>🔥</span>
            <span>${data.streak} Days Streak</span>
          </div>
        </div>

        <!-- Core Metric Box -->
        <div class="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 mb-4 text-center">
          <div class="text-4xl font-black text-emerald-400 font-mono tracking-tight" style="font-variant-numeric: lining-nums;">${data.mins} <span class="text-xs text-slate-400 font-normal">MINS</span></div>
          <div class="text-xs text-slate-400 mt-1">Deep Work Immersion Today</div>
        </div>

        <!-- Target Milestone -->
        <div class="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-xs text-slate-300 mb-5 flex items-center gap-2">
          <span>🎯</span>
          <span class="truncate font-semibold">${data.task}</span>
        </div>

        <!-- Share Actions -->
        <div class="flex gap-2">
          <button id="df-native-share-btn" class="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/40">
            <span>📲 Share to WhatsApp</span>
          </button>
          <button id="df-copy-summary-btn" class="px-4 py-3 bg-slate-800 hover:bg-slate-700 active:scale-98 text-slate-300 rounded-xl text-xs font-bold transition">
            Copy
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#df-share-close').onclick = () => modal.remove();

    const sharePayload = {
      title: 'Deep Focus Daily Progress',
      text: `⚡ DEEP FOCUS DAILY RECORD\n📅 Date: ${data.today}\n🔥 Streak: ${data.streak} Days\n⏱ Focused: ${data.mins} mins\n🎯 Goal: ${data.task}\n#DeepFocus #StudyWithMe`,
      url: 'https://github.com/moaz76943-creator/zen-study-focus'
    };

    modal.querySelector('#df-native-share-btn').onclick = async () => {
      if (window.triggerHaptic) window.triggerHaptic('action');
      if (navigator.share) {
        try {
          await navigator.share(sharePayload);
        } catch(e) {}
      } else {
        navigator.clipboard.writeText(sharePayload.text);
        alert('Progress copied to clipboard! Paste it into WhatsApp or Stories.');
      }
    };

    modal.querySelector('#df-copy-summary-btn').onclick = () => {
      if (window.triggerHaptic) window.triggerHaptic('click');
      navigator.clipboard.writeText(sharePayload.text);
      alert('Copied to clipboard!');
    };
  }

  function injectShareButtonInAnalytics() {
    if (document.getElementById('df-analytics-share-btn')) return;
    const targetContainer = document.querySelector('#view-analytics, [data-view="analytics"], .analytics-container, .recorded-analytics')?.parentElement || document.querySelector('.analytics-header');
    if (!targetContainer) return;

    const btn = document.createElement('button');
    btn.id = 'df-analytics-share-btn';
    btn.className = 'w-full max-w-sm mx-auto mb-4 p-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-98 cursor-pointer';
    btn.innerHTML = '<span>📸 Share Focus Card (مشاركة إنجاز اليوم)</span>';
    btn.onclick = showShareCardModal;

    targetContainer.insertBefore(btn, targetContainer.firstChild);
  }

  return { showShareCardModal, injectShareButtonInAnalytics };
})();

window.ShareCardEngine = ShareCardEngine;

document.addEventListener('DOMContentLoaded', () => {
  ShareCardEngine.injectShareButtonInAnalytics();
  const obs = new MutationObserver(ShareCardEngine.injectShareButtonInAnalytics);
  obs.observe(document.body, { childList: true, subtree: true });
});

// Touch & UI Unblocker: Ensure no residual overlays block clicks
document.addEventListener('DOMContentLoaded', () => {
  const badOverlay = document.getElementById('df-oled-desk-clock');
  if (badOverlay) badOverlay.remove();
});


/* ========================================================
   DEEP FOCUS — SPOKEN VOCABULARY BANK & DUAL AUDIO ENGINE (M200)
   ======================================================== */
const VocabAudioBankEngine = (function() {
  function getSafeStorage() {
    return typeof localStorage !== 'undefined' ? localStorage : {
      getItem: () => null,
      setItem: () => {}
    };
  }

  function getVocabList() {
    const s = getSafeStorage();
    try {
      const data = s.getItem('df_vocab_bank');
      if (data) return JSON.parse(data);
    } catch(e) {}
    // عينات افتراضية جاهزة مطابقة لنمط التعلم
    return [
      { id: 'v1', term: 'Deine Hausaufgaben sind fast fertig.', translation: 'واجباتك المنزلية جاهزة تقريباً.', notes: 'die Hausaufgaben [Nom] <- deine', color: 'purple', reviews: 0, created: '2026-10-23' },
      { id: 'v2', term: 'Sein Pinsel liegt hier.', translation: 'فرشاته موجودة هنا.', notes: 'der Pinsel [Nom] <- sein', color: 'blue', reviews: 0, created: '2026-10-23' },
      { id: 'v3', term: 'Seine Unterkunft kostet wenig.', translation: 'مكان إقامته تكلفته قليلة.', notes: 'die Unterkunft [Nom] <- seine', color: 'red', reviews: 0, created: '2026-10-23' }
    ];
  }

  function saveVocabList(list) {
    const s = getSafeStorage();
    s.setItem('df_vocab_bank', JSON.stringify(list));
  }

  // محرك النطق الصوتي مع التحكم بالسرعات والتكرار والفواصل
  let isSpeaking = false;
  let activeUtterance = null;

  function speakText(text, langCode = 'de-DE', speed = 1.0, maxRepeats = 1, pauseSeconds = 0.5, onDone = null) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    isSpeaking = true;
    let currentRepeat = 0;

    function playIteration() {
      if (!isSpeaking || currentRepeat >= maxRepeats) {
        isSpeaking = false;
        if (onDone) onDone();
        return;
      }

      currentRepeat++;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = langCode;
      u.rate = Math.max(0.5, Math.min(2.0, speed));
      activeUtterance = u;

      u.onend = function() {
        if (currentRepeat < maxRepeats && isSpeaking) {
          setTimeout(playIteration, pauseSeconds * 1000);
        } else {
          isSpeaking = false;
          if (onDone) onDone();
        }
      };

      u.onerror = function() {
        isSpeaking = false;
        if (onDone) onDone();
      };

      window.speechSynthesis.speak(u);
    }

    playIteration();
  }

  function stopSpeech() {
    isSpeaking = false;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  // استيراد سريع لملفات CSV / نصية
  function importFromCSV(csvText) {
    if (!csvText) return 0;
    const lines = csvText.trim().split('\n');
    const existing = getVocabList();
    let addedCount = 0;

    lines.forEach((line, idx) => {
      const parts = line.split(',');
      if (parts.length >= 2) {
        const term = (parts[0] || '').trim();
        const translation = (parts[1] || '').trim();
        const notes = (parts[2] || '').trim();
        const color = (parts[3] || 'purple').trim();

        if (term && translation) {
          existing.push({
            id: 'v_' + Date.now() + '_' + idx,
            term,
            translation,
            notes,
            color,
            reviews: 0,
            created: new Date().toISOString().slice(0, 10)
          });
          addedCount++;
        }
      }
    });

    saveVocabList(existing);
    return addedCount;
  }

  // الفرز وإعادة الترتيب الذكي
  function getSortedVocab(sortBy = 'created_desc') {
    const list = [...getVocabList()];
    if (sortBy === 'alpha_asc') {
      return list.sort((a, b) => a.term.localeCompare(b.term));
    } else if (sortBy === 'alpha_desc') {
      return list.sort((a, b) => b.term.localeCompare(a.term));
    } else if (sortBy === 'created_desc') {
      return list.sort((a, b) => (b.id > a.id ? 1 : -1));
    } else if (sortBy === 'color') {
      return list.sort((a, b) => a.color.localeCompare(b.color));
    }
    return list;
  }

  
  function setCardReviewStatus(cardId, needsReview) {
    const list = getVocabList().map(c => {
      if (c.id === cardId) {
        return {
          ...c,
          needsReview: needsReview,
          reviewCount: (c.reviewCount || 0) + 1,
          lastReviewed: new Date().toISOString().slice(0, 10)
        };
      }
      return c;
    });
    saveVocabList(list);
  }

  function getFilteredVocab(colorFilter = 'all', sortMode = 'created_desc') {
    let list = getSortedVocab(sortMode);
    if (!colorFilter || colorFilter === 'all') return list;
    if (colorFilter === 'needs_review') return list.filter(c => c.needsReview);
    return list.filter(c => c.color === colorFilter);
  }

  
  function cycleCardColor(cardId) {
    const colors = ['purple', 'blue', 'red', 'green'];
    const list = getVocabList().map(c => {
      if (c.id === cardId) {
        const nextIdx = (colors.indexOf(c.color || 'purple') + 1) % colors.length;
        return { ...c, color: colors[nextIdx] };
      }
      return c;
    });
    saveVocabList(list);
    return list;
  }

  function deleteCard(cardId) {
    const list = getVocabList().filter(c => c.id !== cardId);
    saveVocabList(list);
    return list;
  }

  return {
    getVocabList,
    cycleCardColor,
    deleteCard,
    setCardReviewStatus,
    getFilteredVocab,
    saveVocabList,
    speakText,
    stopSpeech,
    importFromCSV,
    getSortedVocab
  };
})();

if (typeof window !== 'undefined') {
  window.VocabAudioBankEngine = VocabAudioBankEngine;
}


/* ========================================================
   DEEP FOCUS — SPOKEN VOCABULARY STUDIO UI COMPONENT (M201)
   ======================================================== */
const VocabUIController = (function() {
  let activeSpeed = 1.0;
  let activeRepeats = 1;
  let activeSort = 'created_desc';

  function getColorHex(color) {
    if (color === 'blue') return '#3b82f6';
    if (color === 'red') return '#ef4444';
    if (color === 'green') return '#10b981';
    return '#8b5cf6'; // purple default
  }

  function renderVocabView() {
    if (document.getElementById('df-vocab-studio-view')) return;

    const modal = document.createElement('div');
    modal.id = 'df-vocab-studio-view';
    modal.style.cssText = 'position:fixed;inset:0;background:#f8fafc;z-index:9999;display:flex;flex-direction:column;font-family:system-ui,-apple-system,sans-serif;color:#0f172a;overflow:hidden;';

    const items = window.VocabAudioBankEngine ? window.VocabAudioBankEngine.getSortedVocab(activeSort) : [];

    modal.innerHTML = `
      <!-- Header Bar -->
      <div style="background:#ffffff;border-bottom:1px solid #e2e8f0;padding:14px 16px;display:flex;align-items:center;justify-content:between;gap:12px;box-shadow:0 1px 2px rgba(0,0,0,0.03);">
        <button id="df-vocab-back" style="background:#f1f5f9;border:none;border-radius:12px;padding:8px 12px;font-size:14px;cursor:pointer;font-weight:bold;color:#475569;">← Back</button>
        <div style="flex:1;text-align:center;">
          <h2 style="margin:0;font-size:15px;font-weight:800;color:#0f172a;">Spoken Vocab Bank</h2>
          <span id="df-vocab-count-badge" style="font-size:11px;color:#64748b;font-weight:600;font-variant-numeric:lining-nums;"><span id="df-vocab-pair-badge" title="Tap to switch language pair">${localStorage.getItem('df_vocab_pair') || 'AR > DE'}</span> • ${items.length} Items</span>
        </div>
        <input type="file" id="df-vocab-file-input" accept=".csv,.txt" style="display:none;"><button id="df-vocab-import-btn" style="background:#eff6ff;color:#2563eb;border:1px solid #dbeafe;border-radius:12px;padding:8px 12px;font-size:12px;cursor:pointer;font-weight:bold;">📁+ Import</button><button id="df-vocab-export-btn" style="background:#f8fafc;color:#475569;border:1px solid #e2e8f0;border-radius:12px;padding:8px 10px;font-size:12px;cursor:pointer;font-weight:bold;margin-left:4px;" title="Export CSV Backup">📤</button>
      </div>

      <!-- Controls & Quick Toolbar -->
      <div style="background:#ffffff;border-bottom:1px solid #f1f5f9;padding:10px 16px;display:flex;align-items:center;gap:8px;overflow-x:auto;">
        <button id="df-speed-btn" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:6px 12px;font-size:11px;cursor:pointer;font-weight:bold;color:#334155;">⚡ ${activeSpeed}x</button>
        <button id="df-repeat-btn" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:6px 12px;font-size:11px;cursor:pointer;font-weight:bold;color:#334155;">🔁 ${activeRepeats}x</button>
        <button id="df-sort-btn" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:6px 12px;font-size:11px;cursor:pointer;font-weight:bold;color:#334155;">⇅ Sort</button>
        <button id="df-start-quiz-btn" style="background:#8b5cf6;color:#ffffff;border:none;border-radius:10px;padding:6px 12px;font-size:11px;cursor:pointer;font-weight:bold;margin-left:auto;margin-right:6px;">🧠 Start Quiz</button><button id="df-add-card-btn" style="background:#2563eb;color:#ffffff;border:none;border-radius:10px;padding:6px 14px;font-size:11px;cursor:pointer;font-weight:bold;margin-left:auto;">+ Add Word</button>
      </div>

      
      <!-- Color & Category Filter Bar -->
      <div id="df-vocab-filter-bar" style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:8px 16px;display:flex;align-items:center;gap:6px;overflow-x:auto;">
        <button data-filter="all" class="df-filter-chip" style="background:#2563eb;color:#ffffff;border:none;border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;cursor:pointer;shrink:0;">All</button>
        <button data-filter="purple" class="df-filter-chip" style="background:#ffffff;color:#6b21a8;border:1px solid #d8b4fe;border-radius:20px;padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer;shrink:0;">🟣 Purple</button>
        <button data-filter="blue" class="df-filter-chip" style="background:#ffffff;color:#1e40af;border:1px solid #bfdbfe;border-radius:20px;padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer;shrink:0;">🔵 Blue</button>
        <button data-filter="red" class="df-filter-chip" style="background:#ffffff;color:#991b1b;border:1px solid #fecaca;border-radius:20px;padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer;shrink:0;">🔴 Red</button>
        <button data-filter="green" class="df-filter-chip" style="background:#ffffff;color:#065f46;border:1px solid #a7f3d0;border-radius:20px;padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer;shrink:0;">🟢 Green</button>
        <button data-filter="needs_review" class="df-filter-chip" style="background:#ffffff;color:#854d0e;border:1px solid #fef08a;border-radius:20px;padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer;shrink:0;">⚠️ Needs Review</button>
      </div>

      <!-- Word Cards List -->
      <div id="df-vocab-cards-container" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;">
        ${items.map(item => `
          <div data-card-id="${item.id}" data-card-color="${item.color || 'purple'}" data-card-review="${item.needsReview ? 'true' : 'false'}" style="position:relative;background:#ffffff;border-radius:18px;border:1px solid #e2e8f0;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.02);display:flex;gap:14px;align-items:flex-start;">
            <!-- Foreign Word Column -->
            <div style="flex:1;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <button data-audio-term="${item.term}" style="background:#f1f5f9;border:none;border-radius:8px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:13px;" title="Listen Foreign">🔊</button>
                <div style="font-size:14px;font-weight:700;color:#0f172a;line-height:1.4;">${item.term}</div>
              </div>
            </div>

            <!-- Translation Column -->
            <div style="flex:1;border-right:1px solid #f1f5f9;padding-right:12px;direction:rtl;text-align:right;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                <span class="df-color-dot" data-dot-card-id="${item.id}" title="Click to change color" style="width:12px;height:12px;border-radius:50%;background:${getColorHex(item.color)};display:inline-block;shrink:0;box-shadow:0 0 0 2px #ffffff, 0 0 0 3px #cbd5e1;"></span><button class="df-card-delete-btn" data-delete-card-id="${item.id}" style="background:transparent;border:none;color:#94a3b8;font-size:11px;cursor:pointer;margin-right:auto;" title="Delete Card">✕</button>
                <div style="font-size:14px;font-weight:700;color:#1e293b;line-height:1.4;">${item.translation}</div>
                <button data-audio-trans="${item.translation}" style="background:#f1f5f9;border:none;border-radius:8px;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-size:12px;margin-right:auto;" title="Listen Arabic">🔊</button>
              </div>
              ${item.notes ? `<div style="font-size:11px;color:#64748b;margin-top:4px;line-height:1.4;background:#f8fafc;padding:6px 8px;border-radius:8px;">${item.notes}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    document.body.appendChild(modal);

    // Event Bindings
    document.getElementById('df-vocab-back').onclick = () => modal.remove();

    // Native File Picker Import
    const fileInput = document.getElementById('df-vocab-file-input');
    const importBtn = document.getElementById('df-vocab-import-btn');
    if (importBtn && fileInput) {
      importBtn.onclick = () => fileInput.click();
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          const text = evt.target.result;
          if (window.VocabAudioBankEngine) {
            const added = window.VocabAudioBankEngine.importFromCSV(text);
            alert('Successfully imported ' + added + ' words from ' + file.name + '!');
            modal.remove();
            renderVocabView();
          }
        };
        reader.readAsText(file);
      };
    }

    // CSV Export Download
    const exportBtn = document.getElementById('df-vocab-export-btn');
    if (exportBtn) {
      exportBtn.onclick = () => {
        const list = window.VocabAudioBankEngine ? window.VocabAudioBankEngine.getVocabList() : [];
        if (list.length === 0) {
          alert('No words to export!');
          return;
        }
        const csvRows = list.map(item => `"${item.term.replace(/"/g, '""')}","${item.translation.replace(/"/g, '""')}","${(item.notes || '').replace(/"/g, '""')}","${item.color || 'purple'}"`);
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'deep_focus_vocab_backup.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        if (window.triggerHaptic) window.triggerHaptic('action');
      };
    }

    // Language Pair Switching
    const pairBadge = document.getElementById('df-vocab-pair-badge');
    if (pairBadge) {
      pairBadge.style.cursor = 'pointer';
      pairBadge.onclick = () => {
        const pairs = ['AR > DE', 'AR > EN', 'AR > FR', 'AR > ES', 'AR > TR'];
        const current = localStorage.getItem('df_vocab_pair') || 'AR > DE';
        const nextIdx = (pairs.indexOf(current) + 1) % pairs.length;
        const nextPair = pairs[nextIdx];
        localStorage.setItem('df_vocab_pair', nextPair);
        pairBadge.textContent = nextPair;
        if (window.triggerHaptic) window.triggerHaptic('step');
      };
    }


    // Filter Chips Event Binding
    modal.querySelectorAll('.df-filter-chip').forEach(chip => {
      chip.onclick = () => {
        const filterVal = chip.dataset.filter;
        modal.querySelectorAll('.df-filter-chip').forEach(c => {
          c.style.background = '#ffffff';
          c.style.color = '#475569';
          c.style.fontWeight = '600';
        });
        chip.style.background = '#2563eb';
        chip.style.color = '#ffffff';
        chip.style.fontWeight = '700';

        // تصفية البطاقات في الـ DOM
        const cards = modal.querySelectorAll('[data-card-id]');
        let visibleCount = 0;
        cards.forEach(card => {
          const cardColor = card.dataset.cardColor;
          const needsRev = card.dataset.cardReview === 'true';
          let show = false;

          if (filterVal === 'all') show = true;
          else if (filterVal === 'needs_review') show = needsRev;
          else if (filterVal === cardColor) show = true;

          card.style.display = show ? 'flex' : 'none';
          if (show) visibleCount++;
        });

        // تحديث العداد في الرأس
        const countBadge = modal.querySelector('#df-vocab-count-badge');
        if (countBadge) countBadge.textContent = 'Showing ' + visibleCount + ' Items';
        if (window.triggerHaptic) window.triggerHaptic('click');
      };
    });

    // Card Color Dot Cycling
    modal.querySelectorAll('.df-color-dot').forEach(dot => {
      dot.style.cursor = 'pointer';
      dot.onclick = (e) => {
        e.stopPropagation();
        const cardId = dot.dataset.dotCardId;
        if (window.VocabAudioBankEngine) {
          window.VocabAudioBankEngine.cycleCardColor(cardId);
          modal.remove();
          renderVocabView();
        }
      };
    });

    // Card Deletion
    modal.querySelectorAll('.df-card-delete-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const cardId = btn.dataset.deleteCardId;
        if (confirm('Delete this card?')) {
          if (window.VocabAudioBankEngine) {
            window.VocabAudioBankEngine.deleteCard(cardId);
            modal.remove();
            renderVocabView();
          }
        }
      };
    });


    // Speed Cycle
    document.getElementById('df-speed-btn').onclick = () => {
      const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
      const nextIdx = (speeds.indexOf(activeSpeed) + 1) % speeds.length;
      activeSpeed = speeds[nextIdx];
      document.getElementById('df-speed-btn').textContent = '⚡ ' + activeSpeed + 'x';
    };

    // Repeat Cycle
    document.getElementById('df-repeat-btn').onclick = () => {
      const repeats = [1, 3, 5, 10];
      const nextIdx = (repeats.indexOf(activeRepeats) + 1) % repeats.length;
      activeRepeats = repeats[nextIdx];
      document.getElementById('df-repeat-btn').textContent = '🔁 ' + activeRepeats + 'x';
    };

    // Sort Toggle
    document.getElementById('df-sort-btn').onclick = () => {
      activeSort = activeSort === 'alpha_asc' ? 'created_desc' : 'alpha_asc';
      modal.remove();
      renderVocabView();
    };

    // CSV Import Button
    document.getElementById('df-vocab-import-btn').onclick = () => {
      const sample = prompt('Paste your CSV list here (Word, Translation, Notes, Color):', 'Hallo, مرحباً, Greeting, blue');
      if (sample && window.VocabAudioBankEngine) {
        const added = window.VocabAudioBankEngine.importFromCSV(sample);
        alert('Added ' + added + ' words successfully!');
        modal.remove();
        renderVocabView();
      }
    };

    // Add Single Word
    const qBtn = document.getElementById('df-start-quiz-btn'); if(qBtn) qBtn.onclick = () => { if(window.FlashQuizEngine) window.FlashQuizEngine.startQuiz(); }; document.getElementById('df-add-card-btn').onclick = () => {
      const term = prompt('Foreign Word/Sentence:');
      if (!term) return;
      const trans = prompt('Arabic Translation:');
      if (!trans) return;
      const notes = prompt('Grammar Notes/Rule (optional):', '');
      if (window.VocabAudioBankEngine) {
        window.VocabAudioBankEngine.importFromCSV(term + ',' + trans + ',' + (notes || '') + ',purple');
        modal.remove();
        renderVocabView();
      }
    };

    // Audio Playback Triggers
    modal.querySelectorAll('[data-audio-term]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const text = btn.dataset.audioTerm;
        if (window.VocabAudioBankEngine) {
          const activeP = localStorage.getItem('df_vocab_pair') || 'AR > DE'; const tLang = activeP.includes('EN') ? 'en-US' : activeP.includes('FR') ? 'fr-FR' : activeP.includes('ES') ? 'es-ES' : activeP.includes('TR') ? 'tr-TR' : 'de-DE'; window.VocabAudioBankEngine.speakText(text, tLang, activeSpeed, activeRepeats, 0.5);
        }
      };
    });

    modal.querySelectorAll('[data-audio-trans]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const text = btn.dataset.audioTrans;
        if (window.VocabAudioBankEngine) {
          window.VocabAudioBankEngine.speakText(text, 'ar-SA', activeSpeed, 1, 0.5);
        }
      };
    });
  }

  function injectVocabEntryPill() {
    if (document.getElementById('df-vocab-bank-pill')) return;
    const targetHeader = document.querySelector('.notes-header, #view-notes .header, [data-view="notes"] .header, .notes-container');
    if (!targetHeader) return;

    const pill = document.createElement('button');
    pill.id = 'df-vocab-bank-pill';
    pill.style.cssText = 'background:linear-gradient(135deg, #3b82f6, #6366f1);color:#ffffff;border:none;border-radius:14px;padding:10px 16px;font-size:12px;font-weight:bold;display:flex;align-items:center;gap:8px;box-shadow:0 2px 4px rgba(59,130,246,0.25);margin-bottom:12px;cursor:pointer;';
    pill.innerHTML = '<span>📚 Spoken Vocab Bank (بنك الكلمات الصوتي)</span>';
    pill.onclick = renderVocabView;

    targetHeader.insertBefore(pill, targetHeader.firstChild);
  }

  return { renderVocabView, injectVocabEntryPill };
})();

window.VocabUIController = VocabUIController;

document.addEventListener('DOMContentLoaded', () => {
  VocabUIController.injectVocabEntryPill();
  const obs = new MutationObserver(VocabUIController.injectVocabEntryPill);
  obs.observe(document.body, { childList: true, subtree: true });
});


/* ========================================================
   DEEP FOCUS — FLASHCARD QUIZ & SELF-TESTING ENGINE (M202)
   ======================================================== */
const FlashQuizEngine = (function() {
  let currentIndex = 0;
  let correctCount = 0;
  let quizCards = [];

  function startQuiz() {
    quizCards = window.VocabAudioBankEngine ? window.VocabAudioBankEngine.getVocabList() : [];
    if (!quizCards || quizCards.length === 0) {
      alert('No vocabulary words found! Add or import words first.');
      return;
    }

    currentIndex = 0;
    correctCount = 0;
    renderQuizCard();
  }

  function renderQuizCard() {
    const existing = document.getElementById('df-flash-quiz-modal');
    if (existing) existing.remove();

    if (currentIndex >= quizCards.length) {
      showQuizSummary();
      return;
    }

    const card = quizCards[currentIndex];
    const total = quizCards.length;
    const progressNum = currentIndex + 1;

    const modal = document.createElement('div');
    modal.id = 'df-flash-quiz-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:#090d16eb;backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui,-apple-system,sans-serif;color:#f8fafc;';

    modal.innerHTML = `
      <div style="background:#1e293b;border:1px solid #334155;border-radius:28px;padding:24px;width:100%;max-width:380px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);text-align:center;position:relative;">
        <!-- Top Counter & Close -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <span style="font-size:12px;font-weight:700;color:#94a3b8;letter-spacing:1px;font-variant-numeric:lining-nums;">Card ${progressNum} of ${total}</span>
          <button id="df-quiz-close" style="background:#334155;border:none;border-radius:50%;width:30px;height:30px;color:#cbd5e1;cursor:pointer;font-weight:bold;font-size:13px;">✕</button>
        </div>

        <!-- Term Box -->
        <div style="background:#0f172a;border:1px solid #1e293b;border-radius:20px;padding:24px 16px;margin-bottom:18px;">
          <div style="font-size:17px;font-weight:800;color:#38bdf8;line-height:1.4;margin-bottom:10px;">${card.term}</div>
          <button id="df-quiz-listen-term" style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:6px 14px;color:#94a3b8;font-size:12px;cursor:pointer;font-weight:600;">🔊 Listen</button>
        </div>

        <!-- Answer Section (Hidden by default) -->
        <div id="df-quiz-answer-section" style="display:none;margin-bottom:20px;">
          <div style="background:#0284c715;border:1px solid #0284c740;border-radius:18px;padding:16px;direction:rtl;text-align:right;">
            <div style="font-size:16px;font-weight:700;color:#e2e8f0;margin-bottom:6px;">${card.translation}</div>
            ${card.notes ? `<div style="font-size:11px;color:#94a3b8;line-height:1.4;">${card.notes}</div>` : ''}
          </div>
        </div>

        <!-- Buttons -->
        <button id="df-quiz-reveal-btn" style="width:100%;background:#2563eb;color:#ffffff;border:none;border-radius:14px;padding:12px;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.2s;">Tap to Reveal Answer</button>

        <div id="df-quiz-action-buttons" style="display:none;gap:10px;">
          <button id="df-quiz-hard" style="flex:1;background:#ef444420;border:1px solid #ef444460;color:#f87171;border-radius:14px;padding:12px;font-size:12px;font-weight:700;cursor:pointer;">❌ Hard</button>
          <button id="df-quiz-easy" style="flex:1;background:#10b98120;border:1px solid #10b98160;color:#34d399;border-radius:14px;padding:12px;font-size:12px;font-weight:700;cursor:pointer;">✅ Easy</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('df-quiz-close').onclick = () => modal.remove();

    document.getElementById('df-quiz-listen-term').onclick = () => {
      if (window.VocabAudioBankEngine) {
        window.VocabAudioBankEngine.speakText(card.term, 'de-DE', 1.0, 1, 0.5);
      }
    };

    document.getElementById('df-quiz-reveal-btn').onclick = () => {
      document.getElementById('df-quiz-answer-section').style.display = 'block';
      document.getElementById('df-quiz-reveal-btn').style.display = 'none';
      document.getElementById('df-quiz-action-buttons').style.display = 'flex';
      if (window.triggerHaptic) window.triggerHaptic('click');
    };

    document.getElementById('df-quiz-hard').onclick = () => { if(window.VocabAudioBankEngine) window.VocabAudioBankEngine.setCardReviewStatus(card.id, true);
      currentIndex++;
      renderQuizCard();
      if (window.triggerHaptic) window.triggerHaptic('step');
    };

    document.getElementById('df-quiz-easy').onclick = () => { if(window.VocabAudioBankEngine) window.VocabAudioBankEngine.setCardReviewStatus(card.id, false);
      correctCount++;
      currentIndex++;
      renderQuizCard();
      if (window.triggerHaptic) window.triggerHaptic('step');
    };
  }

  function showQuizSummary() {
    const total = quizCards.length;
    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    const modal = document.createElement('div');
    modal.id = 'df-flash-quiz-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:#090d16eb;backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui,-apple-system,sans-serif;color:#f8fafc;';

    modal.innerHTML = `
      <div style="background:#1e293b;border:1px solid #334155;border-radius:28px;padding:28px;width:100%;max-width:340px;text-align:center;">
        <div style="font-size:40px;margin-bottom:12px;">🎉</div>
        <h3 style="font-size:18px;font-weight:800;color:#f8fafc;margin:0 0 6px;">Quiz Completed!</h3>
        <p style="font-size:13px;color:#94a3b8;margin:0 0 20px;">Mastery Rate: <strong style="color:#34d399;font-variant-numeric:lining-nums;">${percentage}%</strong> (${correctCount} / ${total})</p>
        <button id="df-quiz-finish-btn" style="width:100%;background:#10b981;color:#ffffff;border:none;border-radius:14px;padding:12px;font-size:13px;font-weight:700;cursor:pointer;">Great Work ✓</button>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('df-quiz-finish-btn').onclick = () => modal.remove();
    if (window.triggerHaptic) window.triggerHaptic('complete');
  }

  return { startQuiz };
})();

window.FlashQuizEngine = FlashQuizEngine;

/* === M206_VOCAB_WEBVIEW_TOOLKIT_V1 === */
(function() {
  if (window.__M206_VOCAB_TOOLKIT_ACTIVE__) return;
  window.__M206_VOCAB_TOOLKIT_ACTIVE__ = true;

  function toWesternDigits(str) {
    return String(str == null ? '' : str)
      .replace(/[\u0660-\u0669]/g, function(d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[\u06F0-\u06F9]/g, function(d) { return String(d.charCodeAt(0) - 0x06F0); });
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
    return lines.join('\n');
  }

  function parseBulkLines(rawText, defaultColor) {
    var parsed = [];
    String(rawText || '').split(/\r?\n/).forEach(function(line) {
      var clean = line.trim();
      if (!clean || /^word\s*[,;\t-]/i.test(clean)) return;
      var parts = clean.split(/\s*(?:,|;|\t|\s-\s|:|\|)\s*/);
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
        '<textarea id="df-vocab-paste-area" rows="6" placeholder="Schmetterling, فراشة\nBuch - كتاب\nWasser; ماء" ' +
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

/* === M207_FLASH_QUIZ_SHUFFLE_AND_REVERSE_V1 === */
(function() {
  if (window.__M207_QUIZ_ENHANCED__) return;
  window.__M207_QUIZ_ENHANCED__ = true;

  function toWesternDigits(str) {
    return String(str == null ? '' : str)
      .replace(/[\u0660-\u0669]/g, function(d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[\u06F0-\u06F9]/g, function(d) { return String(d.charCodeAt(0) - 0x06F0); });
  }

  function shuffleArray(arr) {
    var copy = (arr || []).slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  window.dfToWesternDigitsM207 = toWesternDigits;
  window.dfShuffleVocabArrayM207 = shuffleArray;

  var quizState = { isShuffled: false, isReversed: false };

  window.dfToggleQuizShuffle = function() {
    quizState.isShuffled = !quizState.isShuffled;
    var btn = document.getElementById('df-quiz-shuffle-toggle-btn');
    if (btn) {
      btn.style.background = quizState.isShuffled ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.06)';
      btn.style.borderColor = quizState.isShuffled ? '#c084fc' : 'rgba(255,255,255,0.15)';
    }
    return quizState.isShuffled;
  };

  window.dfToggleQuizReverse = function() {
    quizState.isReversed = !quizState.isReversed;
    var btn = document.getElementById('df-quiz-reverse-toggle-btn');
    if (btn) {
      btn.textContent = quizState.isReversed ? '🔄 السؤال: المعنى ⬅ الكلمة' : '🔄 السؤال: الكلمة ⬅ المعنى';
      btn.style.background = quizState.isReversed ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.06)';
      btn.style.borderColor = quizState.isReversed ? '#38bdf8' : 'rgba(255,255,255,0.15)';
    }
    return quizState.isReversed;
  };

  window.dfGetPreparedQuizItems = function(rawItems) {
    var items = (rawItems || []).slice();
    if (quizState.isShuffled) items = shuffleArray(items);
    return items.map(function(it) {
      if (!quizState.isReversed) return it;
      return {
        id: it.id,
        word: it.meaning,
        meaning: it.word,
        color: it.color,
        hard: it.hard,
        _origWord: it.word,
        _origMeaning: it.meaning
      };
    });
  };

  function mountQuizControls() {
    if (typeof document === 'undefined') return;
    var quizHeader = document.getElementById('df-flash-quiz-header') ||
                     document.getElementById('df-vocab-filter-bar');
    if (!quizHeader || document.getElementById('df-quiz-extra-toolbar')) return;

    var toolbar = document.createElement('div');
    toolbar.id = 'df-quiz-extra-toolbar';
    toolbar.style.cssText = 'display:flex;gap:8px;align-items:center;margin:6px 0;flex-wrap:wrap;';
    toolbar.innerHTML =
      '<button type="button" id="df-quiz-shuffle-toggle-btn" ' +
      'style="padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);color:#e2e8f0;font-size:12px;font-weight:600;cursor:pointer;">' +
      '🔀 خلط عشوائي</button>' +
      '<button type="button" id="df-quiz-reverse-toggle-btn" ' +
      'style="padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);color:#e2e8f0;font-size:12px;font-weight:600;cursor:pointer;">' +
      '🔄 السؤال: الكلمة ⬅ المعنى</button>';

    quizHeader.parentNode.insertBefore(toolbar, quizHeader.nextSibling);

    var shuffleBtn = document.getElementById('df-quiz-shuffle-toggle-btn');
    if (shuffleBtn) shuffleBtn.onclick = function() { window.dfToggleQuizShuffle(); };

    var reverseBtn = document.getElementById('df-quiz-reverse-toggle-btn');
    if (reverseBtn) reverseBtn.onclick = function() { window.dfToggleQuizReverse(); };
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountQuizControls);
    } else {
      setTimeout(mountQuizControls, 300);
    }
    setInterval(mountQuizControls, 1500);
  }
})();

/* === M208_VOCAB_SPEED_PRESETS_AND_REPLAY_V1 === */
(function() {
  if (window.__M208_VOCAB_SPEED_PRESETS__) return;
  window.__M208_VOCAB_SPEED_PRESETS__ = true;

  var currentSpeed = 1.0;

  window.dfSetVocabPlaybackSpeed = function(speed) {
    currentSpeed = parseFloat(speed) || 1.0;
    var eng = window.SpokenVocabEngine;
    if (eng) {
      eng.playbackSpeed = currentSpeed;
      if (eng.config) eng.config.speed = currentSpeed;
    }
    updateSpeedButtonsUI();
    return currentSpeed;
  };

  window.dfGetVocabPlaybackSpeed = function() {
    return currentSpeed;
  };

  function updateSpeedButtonsUI() {
    if (typeof document === 'undefined') return;
    var speeds = [0.75, 1.0, 1.25];
    speeds.forEach(function(s) {
      var btn = document.getElementById('df-speed-btn-' + String(s).replace('.', '_'));
      if (btn) {
        var isActive = Math.abs(currentSpeed - s) < 0.05;
        btn.style.background = isActive ? 'rgba(168,85,247,0.35)' : 'rgba(255,255,255,0.06)';
        btn.style.borderColor = isActive ? '#c084fc' : 'rgba(255,255,255,0.15)';
        btn.style.color = isActive ? '#ffffff' : '#94a3b8';
      }
    });
  }

  window.dfReplayCurrentQuizWord = function() {
    var eng = window.SpokenVocabEngine;
    if (!eng) return;
    var quizWordElem = document.getElementById('df-quiz-current-word') ||
                       document.querySelector('.df-quiz-card-word');
    if (quizWordElem) {
      var wordText = quizWordElem.textContent || '';
      if (wordText && typeof eng.speakWord === 'function') {
        eng.speakWord(wordText);
      } else if (wordText && typeof eng.speakPair === 'function') {
        eng.speakPair({ word: wordText, meaning: '' });
      }
    }
  };

  function mountSpeedControls() {
    if (typeof document === 'undefined') return;
    var targetRow = document.getElementById('df-quiz-extra-toolbar') ||
                    document.getElementById('df-vocab-search-row') ||
                    document.getElementById('df-vocab-filter-bar');
    if (!targetRow || document.getElementById('df-vocab-speed-selector-group')) return;

    var speedGroup = document.createElement('div');
    speedGroup.id = 'df-vocab-speed-selector-group';
    speedGroup.style.cssText = 'display:inline-flex;align-items:center;gap:4px;background:rgba(15,23,42,0.6);padding:3px 6px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);';
    speedGroup.innerHTML =
      '<span style="font-size:11px;color:#94a3b8;font-weight:600;margin-right:2px;">سرعة النطق:</span>' +
      '<button type="button" id="df-speed-btn-0_75" style="padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);color:#94a3b8;font-size:11px;font-weight:700;cursor:pointer;">0.75x</button>' +
      '<button type="button" id="df-speed-btn-1_0" style="padding:4px 8px;border-radius:6px;border:1px solid #c084fc;background:rgba(168,85,247,0.35);color:#ffffff;font-size:11px;font-weight:700;cursor:pointer;">1.0x</button>' +
      '<button type="button" id="df-speed-btn-1_25" style="padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);color:#94a3b8;font-size:11px;font-weight:700;cursor:pointer;">1.25x</button>';

    targetRow.appendChild(speedGroup);

    var b075 = document.getElementById('df-speed-btn-0_75');
    if (b075) b075.onclick = function() { window.dfSetVocabPlaybackSpeed(0.75); };
    var b100 = document.getElementById('df-speed-btn-1_0');
    if (b100) b100.onclick = function() { window.dfSetVocabPlaybackSpeed(1.0); };
    var b125 = document.getElementById('df-speed-btn-1_25');
    if (b125) b125.onclick = function() { window.dfSetVocabPlaybackSpeed(1.25); };

    updateSpeedButtonsUI();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountSpeedControls);
    } else {
      setTimeout(mountSpeedControls, 300);
    }
    setInterval(mountSpeedControls, 1500);
  }
})();

/* === M209_VOCAB_STATS_AND_MASTERY_TRACKER_V1 === */
(function() {
  if (window.__M209_VOCAB_STATS_ACTIVE__) return;
  window.__M209_VOCAB_STATS_ACTIVE__ = true;

  function toWesternDigits(str) {
    return String(str == null ? '' : str)
      .replace(/[\u0660-\u0669]/g, function(d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[\u06F0-\u06F9]/g, function(d) { return String(d.charCodeAt(0) - 0x06F0); });
  }

  window.dfGetVocabMasteryStats = function() {
    var eng = window.SpokenVocabEngine;
    var items = (eng && typeof eng.getItems === 'function') ? (eng.getItems() || []) : [];
    var total = items.length;
    var needsReview = 0;
    var mastered = 0;
    for (var i = 0; i < total; i++) {
      if (items[i] && items[i].hard) {
        needsReview++;
      } else {
        mastered++;
      }
    }
    return {
      total: total,
      needsReview: needsReview,
      mastered: mastered,
      masteryRate: total > 0 ? Math.round((mastered / total) * 100) : 0
    };
  };

  function updateVocabStatsBadge() {
    if (typeof document === 'undefined') return;
    var statsElem = document.getElementById('df-vocab-mastery-summary-badge');
    if (!statsElem) return;
    var stats = window.dfGetVocabMasteryStats();
    statsElem.innerHTML =
      '<span style="color:#e2e8f0;">📊 إجمالي: <b>' + toWesternDigits(stats.total) + '</b></span>' +
      '<span style="color:#f87171;margin:0 6px;">⚠️ للمراجعة: <b>' + toWesternDigits(stats.needsReview) + '</b></span>' +
      '<span style="color:#4ade80;">🏆 تم إتقانها: <b>' + toWesternDigits(stats.mastered) + '</b> (' + toWesternDigits(stats.masteryRate) + '%)</span>';
  }

  window.dfUpdateVocabStatsBadge = updateVocabStatsBadge;

  function mountStatsUI() {
    if (typeof document === 'undefined') return;
    var searchRow = document.getElementById('df-vocab-search-row') ||
                    document.getElementById('df-vocab-filter-bar');
    if (!searchRow || document.getElementById('df-vocab-mastery-summary-badge')) return;

    var badge = document.createElement('div');
    badge.id = 'df-vocab-mastery-summary-badge';
    badge.style.cssText = 'display:flex;align-items:center;flex-wrap:wrap;gap:4px;padding:6px 12px;border-radius:10px;background:rgba(15,23,42,0.65);border:1px solid rgba(255,255,255,0.1);font-size:12px;margin:4px 0;width:100%;box-sizing:border-box;';
    searchRow.parentNode.insertBefore(badge, searchRow.nextSibling);
    updateVocabStatsBadge();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountStatsUI);
    } else {
      setTimeout(mountStatsUI, 300);
    }
    setInterval(updateVocabStatsBadge, 2500);
  }
})();

/* === M210_VOCAB_BULK_MASTERY_ACTION_V1 === */
(function() {
  if (window.__M210_VOCAB_BULK_MASTERY__) return;
  window.__M210_VOCAB_BULK_MASTERY__ = true;

  function toWesternDigits(str) {
    return String(str == null ? '' : str)
      .replace(/[\u0660-\u0669]/g, function(d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[\u06F0-\u06F9]/g, function(d) { return String(d.charCodeAt(0) - 0x06F0); });
  }

  window.dfMarkAllReviewAsMastered = function() {
    var eng = window.SpokenVocabEngine;
    var items = (eng && typeof eng.getItems === 'function') ? (eng.getItems() || []) : [];
    if (!items.length) {
      alert('لا توجد كلمات حالياً.');
      return;
    }
    var count = 0;
    for (var i = 0; i < items.length; i++) {
      if (items[i] && items[i].hard) {
        items[i].hard = false;
        count++;
      }
    }
    if (count > 0 && typeof eng.saveItems === 'function') {
      eng.saveItems(items);
      if (typeof eng.render === 'function') eng.render();
      if (typeof window.dfUpdateVocabStatsBadge === 'function') {
        window.dfUpdateVocabStatsBadge();
      }
      alert('تم إتقان ' + toWesternDigits(count) + ' كلمة وإزالتها من قائمة المراجعة بنجاح!');
    } else {
      alert('جميع الكلمات متقنة بالفعل ولا توجد كلمات للمراجعة.');
    }
  };

  function mountBulkMasteryBtn() {
    if (typeof document === 'undefined') return;
    var searchRow = document.getElementById('df-vocab-search-row') ||
                    document.getElementById('df-vocab-filter-bar');
    if (!searchRow || document.getElementById('df-vocab-mark-all-mastered-btn')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'df-vocab-mark-all-mastered-btn';
    btn.style.cssText = 'padding:8px 12px;border-radius:10px;border:1px solid rgba(74,222,128,0.35);background:rgba(74,222,128,0.12);color:#4ade80;font-size:12px;font-weight:600;cursor:pointer;';
    btn.textContent = '✅ إتقان كل المراجعة';
    btn.onclick = function() {
      if (confirm('هل أتقنت جميع الكلمات في قائمة المراجعة وتريد إزالتها من الصعبة؟')) {
        window.dfMarkAllReviewAsMastered();
      }
    };
    searchRow.appendChild(btn);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountBulkMasteryBtn);
    } else {
      setTimeout(mountBulkMasteryBtn, 350);
    }
    setInterval(mountBulkMasteryBtn, 2000);
  }
})();

/* === M211_VOCAB_AUTO_NEXT_QUIZ_AND_CODE31_V1 === */
(function() {
  if (window.__M211_QUIZ_AUTO_NEXT__) return;
  window.__M211_QUIZ_AUTO_NEXT__ = true;

  var AUTO_KEY = 'df_vocab_quiz_autoadvance';
  var autoAdvance = false;
  try {
    autoAdvance = localStorage.getItem(AUTO_KEY) === 'true';
  } catch(e) {}

  window.dfToggleQuizAutoAdvance = function() {
    autoAdvance = !autoAdvance;
    try {
      localStorage.setItem(AUTO_KEY, autoAdvance ? 'true' : 'false');
    } catch(e) {}
    var btn = document.getElementById('df-quiz-autoadvance-btn');
    if (btn) {
      btn.style.background = autoAdvance ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.06)';
      btn.style.borderColor = autoAdvance ? '#4ade80' : 'rgba(255,255,255,0.15)';
      btn.style.color = autoAdvance ? '#ffffff' : '#94a3b8';
      btn.textContent = autoAdvance ? '⏭ انتقال تلقائي: مفعّل' : '⏭ انتقال تلقائي: معطّل';
    }
    return autoAdvance;
  };

  window.dfIsQuizAutoAdvanceEnabled = function() {
    return autoAdvance;
  };

  window.dfTriggerQuizAutoAdvance = function(delayMs) {
    if (!autoAdvance) return;
    setTimeout(function() {
      var quiz = window.FlashQuizEngine;
      if (quiz && typeof quiz.nextCard === 'function') {
        quiz.nextCard();
      } else {
        var nextBtn = document.getElementById('df-quiz-next-btn') ||
                      document.querySelector('.df-quiz-next-button');
        if (nextBtn) nextBtn.click();
      }
    }, delayMs || 500);
  };

  function mountAutoAdvanceUI() {
    if (typeof document === 'undefined') return;
    var toolbar = document.getElementById('df-quiz-extra-toolbar');
    if (!toolbar || document.getElementById('df-quiz-autoadvance-btn')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'df-quiz-autoadvance-btn';
    btn.style.cssText = 'padding:6px 10px;border-radius:8px;border:1px solid ' +
      (autoAdvance ? '#4ade80' : 'rgba(255,255,255,0.15)') + ';background:' +
      (autoAdvance ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.06)') + ';color:' +
      (autoAdvance ? '#ffffff' : '#94a3b8') + ';font-size:12px;font-weight:600;cursor:pointer;';
    btn.textContent = autoAdvance ? '⏭ انتقال تلقائي: مفعّل' : '⏭ انتقال تلقائي: معطّل';
    btn.onclick = function() { window.dfToggleQuizAutoAdvance(); };
    toolbar.appendChild(btn);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountAutoAdvanceUI);
    } else {
      setTimeout(mountAutoAdvanceUI, 300);
    }
    setInterval(mountAutoAdvanceUI, 2000);
  }
})();

/* === M212_VOCAB_ACCENT_VOICE_CHECKER_AND_CODE32_V1 === */
(function() {
  if (window.__M212_VOICE_CHECKER__) return;
  window.__M212_VOICE_CHECKER__ = true;

  window.dfTestCurrentVoicePronunciation = function() {
    var eng = window.SpokenVocabEngine;
    if (!eng) return;
    var lang = (eng.config && eng.config.foreignLang) || 'de-DE';
    var testPhrase = 'Hallo';
    if (/^en/i.test(lang)) testPhrase = 'Hello';
    else if (/^fr/i.test(lang)) testPhrase = 'Bonjour';
    else if (/^es/i.test(lang)) testPhrase = 'Hola';
    else if (/^tr/i.test(lang)) testPhrase = 'Merhaba';

    if (typeof eng.speakWord === 'function') {
      eng.speakWord(testPhrase, lang);
    } else if (typeof window.speechSynthesis !== 'undefined') {
      try {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(testPhrase);
        u.lang = lang;
        window.speechSynthesis.speak(u);
      } catch(e) {}
    }
  };

  function updateVoiceStatusUI() {
    if (typeof document === 'undefined') return;
    var badge = document.getElementById('df-vocab-voice-status-badge');
    if (!badge) return;

    var eng = window.SpokenVocabEngine;
    var lang = (eng && eng.config && eng.config.foreignLang) || 'de-DE';
    var hasVoices = false;
    if (typeof window.speechSynthesis !== 'undefined') {
      var voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
      if (voices && voices.length > 0) {
        hasVoices = voices.some(function(v) {
          return v.lang && v.lang.toLowerCase().indexOf(lang.split('-')[0].toLowerCase()) === 0;
        });
      } else {
        hasVoices = true;
      }
    }
    badge.textContent = hasVoices ? '🔊 محرك النطق جاهز' : '⚠️ يُنصح بتثبيت أصوات النظام';
    badge.style.color = hasVoices ? '#4ade80' : '#facc15';
    badge.style.borderColor = hasVoices ? 'rgba(74,222,128,0.35)' : 'rgba(250,204,21,0.35)';
  }

  window.dfUpdateVocabVoiceStatus = updateVoiceStatusUI;

  function mountVoiceStatusControls() {
    if (typeof document === 'undefined') return;
    var targetRow = document.getElementById('df-vocab-search-row') ||
                    document.getElementById('df-vocab-filter-bar');
    if (!targetRow || document.getElementById('df-vocab-voice-test-btn')) return;

    var testBtn = document.createElement('button');
    testBtn.type = 'button';
    testBtn.id = 'df-vocab-voice-test-btn';
    testBtn.style.cssText = 'padding:6px 10px;border-radius:8px;border:1px solid rgba(56,189,248,0.35);background:rgba(56,189,248,0.12);color:#38bdf8;font-size:12px;font-weight:600;cursor:pointer;';
    testBtn.textContent = '🗣 فحص الصوت';
    testBtn.onclick = function() { window.dfTestCurrentVoicePronunciation(); };

    var statusBadge = document.createElement('span');
    statusBadge.id = 'df-vocab-voice-status-badge';
    statusBadge.style.cssText = 'font-size:11px;font-weight:600;padding:4px 8px;border-radius:6px;border:1px solid rgba(74,222,128,0.35);color:#4ade80;background:rgba(15,23,42,0.6);';
    statusBadge.textContent = '🔊 محرك النطق جاهز';

    targetRow.appendChild(testBtn);
    targetRow.appendChild(statusBadge);

    updateVoiceStatusUI();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountVoiceStatusControls);
    } else {
      setTimeout(mountVoiceStatusControls, 350);
    }
    setInterval(updateVoiceStatusUI, 3000);
  }
})();

/* === M213_VOCAB_LOOP_INTERVAL_AND_CODE33_V1 === */
(function() {
  if (window.__M213_LOOP_INTERVAL__) return;
  window.__M213_LOOP_INTERVAL__ = true;

  var INTERVAL_KEY = 'df_vocab_loop_interval_ms';
  var currentPauseMs = 1500;
  try {
    var saved = parseInt(localStorage.getItem(INTERVAL_KEY), 10);
    if (saved && saved >= 500 && saved <= 5000) currentPauseMs = saved;
  } catch(e) {}

  window.dfSetVocabLoopInterval = function(sec) {
    var ms = Math.round((parseFloat(sec) || 1.5) * 1000);
    currentPauseMs = Math.max(500, Math.min(5000, ms));
    try {
      localStorage.setItem(INTERVAL_KEY, String(currentPauseMs));
    } catch(e) {}

    var eng = window.SpokenVocabEngine;
    if (eng && eng.config) {
      eng.config.pauseMs = currentPauseMs;
    }
    updateIntervalButtonsUI();
    return currentPauseMs;
  };

  window.dfGetVocabLoopIntervalSec = function() {
    return (currentPauseMs / 1000);
  };

  function updateIntervalButtonsUI() {
    if (typeof document === 'undefined') return;
    var presets = [1.0, 2.0, 3.0];
    presets.forEach(function(s) {
      var btn = document.getElementById('df-interval-btn-' + Math.round(s));
      if (btn) {
        var isActive = Math.abs((currentPauseMs / 1000) - s) < 0.2;
        btn.style.background = isActive ? 'rgba(56,189,248,0.35)' : 'rgba(255,255,255,0.06)';
        btn.style.borderColor = isActive ? '#38bdf8' : 'rgba(255,255,255,0.15)';
        btn.style.color = isActive ? '#ffffff' : '#94a3b8';
      }
    });
  }

  function mountIntervalControls() {
    if (typeof document === 'undefined') return;
    var targetRow = document.getElementById('df-vocab-search-row') ||
                    document.getElementById('df-vocab-filter-bar');
    if (!targetRow || document.getElementById('df-vocab-interval-group')) return;

    var group = document.createElement('div');
    group.id = 'df-vocab-interval-group';
    group.style.cssText = 'display:inline-flex;align-items:center;gap:4px;background:rgba(15,23,42,0.6);padding:3px 6px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);';
    group.innerHTML =
      '<span style="font-size:11px;color:#94a3b8;font-weight:600;margin-right:2px;">فاصل النطق:</span>' +
      '<button type="button" id="df-interval-btn-1" style="padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);color:#94a3b8;font-size:11px;font-weight:700;cursor:pointer;">1s</button>' +
      '<button type="button" id="df-interval-btn-2" style="padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);color:#94a3b8;font-size:11px;font-weight:700;cursor:pointer;">2s</button>' +
      '<button type="button" id="df-interval-btn-3" style="padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);color:#94a3b8;font-size:11px;font-weight:700;cursor:pointer;">3s</button>';

    targetRow.appendChild(group);

    var b1 = document.getElementById('df-interval-btn-1');
    if (b1) b1.onclick = function() { window.dfSetVocabLoopInterval(1.0); };
    var b2 = document.getElementById('df-interval-btn-2');
    if (b2) b2.onclick = function() { window.dfSetVocabLoopInterval(2.0); };
    var b3 = document.getElementById('df-interval-btn-3');
    if (b3) b3.onclick = function() { window.dfSetVocabLoopInterval(3.0); };

    updateIntervalButtonsUI();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountIntervalControls);
    } else {
      setTimeout(mountIntervalControls, 350);
    }
    setInterval(updateIntervalButtonsUI, 2500);
  }
})();

/* === M214_VOCAB_TAG_COUNT_BADGES_AND_CODE34_V1 === */
(function() {
  if (window.__M214_TAG_COUNTS__) return;
  window.__M214_TAG_COUNTS__ = true;

  function toWesternDigits(str) {
    return String(str == null ? '' : str)
      .replace(/[\u0660-\u0669]/g, function(d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[\u06F0-\u06F9]/g, function(d) { return String(d.charCodeAt(0) - 0x06F0); });
  }

  window.dfGetVocabCountsByFilter = function() {
    var eng = window.SpokenVocabEngine;
    var items = (eng && typeof eng.getItems === 'function') ? (eng.getItems() || []) : [];
    var counts = { all: items.length, purple: 0, blue: 0, red: 0, green: 0, review: 0 };
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it) continue;
      if (it.hard) counts.review++;
      var c = (it.color || 'purple').toLowerCase();
      if (counts[c] !== undefined) counts[c]++;
    }
    return counts;
  };

  function updateFilterChipBadges() {
    if (typeof document === 'undefined') return;
    var counts = window.dfGetVocabCountsByFilter();
    var filterBar = document.getElementById('df-vocab-filter-bar');
    if (!filterBar) return;

    var chips = filterBar.querySelectorAll('button, .df-vocab-filter-chip');
    chips.forEach(function(chip) {
      var key = chip.getAttribute('data-filter') || '';
      if (!key) {
        var txt = (chip.textContent || '').toLowerCase();
        if (txt.indexOf('كل') !== -1) key = 'all';
        else if (txt.indexOf('بنفسج') !== -1 || txt.indexOf('purple') !== -1) key = 'purple';
        else if (txt.indexOf('أزرق') !== -1 || txt.indexOf('blue') !== -1) key = 'blue';
        else if (txt.indexOf('أحمر') !== -1 || txt.indexOf('red') !== -1) key = 'red';
        else if (txt.indexOf('أخضر') !== -1 || txt.indexOf('green') !== -1) key = 'green';
        else if (txt.indexOf('مراجعة') !== -1 || txt.indexOf('review') !== -1) key = 'review';
      }
      if (key && counts[key] !== undefined) {
        var baseTxt = chip.getAttribute('data-base-label');
        if (!baseTxt) {
          baseTxt = (chip.textContent || '').replace(/\s*\([0-9]+\)/g, '').trim();
          chip.setAttribute('data-base-label', baseTxt);
        }
        chip.textContent = baseTxt + ' (' + toWesternDigits(counts[key]) + ')';
      }
    });
  }

  window.dfUpdateFilterChipBadges = updateFilterChipBadges;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', updateFilterChipBadges);
    } else {
      setTimeout(updateFilterChipBadges, 300);
    }
    setInterval(updateFilterChipBadges, 2500);
  }
})();

/* === M215_VOCAB_AUTO_CLEAN_DUPLICATES_AND_CODE35_V1 === */
(function() {
  if (window.__M215_CLEAN_DUPLICATES__) return;
  window.__M215_CLEAN_DUPLICATES__ = true;

  function toWesternDigits(str) {
    return String(str == null ? '' : str)
      .replace(/[\u0660-\u0669]/g, function(d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[\u06F0-\u06F9]/g, function(d) { return String(d.charCodeAt(0) - 0x06F0); });
  }

  window.dfCleanDuplicateVocabWords = function() {
    var eng = window.SpokenVocabEngine;
    var items = (eng && typeof eng.getItems === 'function') ? (eng.getItems() || []) : [];
    if (!items.length) {
      alert('لا توجد كلمات في بنك الكلمات حالياً.');
      return 0;
    }

    var seen = {};
    var uniqueItems = [];
    var removedCount = 0;

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it || !it.word) continue;
      var norm = String(it.word).trim().toLowerCase();
      if (seen[norm]) {
        if (it.hard && seen[norm].item) {
          seen[norm].item.hard = true;
        }
        removedCount++;
      } else {
        seen[norm] = { item: it };
        uniqueItems.push(it);
      }
    }

    if (removedCount > 0 && typeof eng.saveItems === 'function') {
      eng.saveItems(uniqueItems);
      if (typeof eng.render === 'function') eng.render();
      if (typeof window.dfUpdateFilterChipBadges === 'function') {
        window.dfUpdateFilterChipBadges();
      }
      if (typeof window.dfUpdateVocabStatsBadge === 'function') {
        window.dfUpdateVocabStatsBadge();
      }
      alert('تم فحص الكلمات بنجاح وإزالة ' + toWesternDigits(removedCount) + ' كلمة مكررة.');
    } else {
      alert('ممتاز! قائمة الكلمات نقية ولا توجد أي كلمات مكررة.');
    }
    return removedCount;
  };

  function mountCleanDuplicatesBtn() {
    if (typeof document === 'undefined') return;
    var searchRow = document.getElementById('df-vocab-search-row') ||
                    document.getElementById('df-vocab-filter-bar');
    if (!searchRow || document.getElementById('df-vocab-clean-duplicates-btn')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'df-vocab-clean-duplicates-btn';
    btn.style.cssText = 'padding:8px 12px;border-radius:10px;border:1px solid rgba(244,63,94,0.35);background:rgba(244,63,94,0.12);color:#fb7185;font-size:12px;font-weight:600;cursor:pointer;';
    btn.textContent = '🧹 تنظيف المكرر';
    btn.onclick = function() {
      if (confirm('هل ترغب بفحص قائمة الكلمات ودمج أي كلمات مكررة تلقائياً؟')) {
        window.dfCleanDuplicateVocabWords();
      }
    };
    searchRow.appendChild(btn);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountCleanDuplicatesBtn);
    } else {
      setTimeout(mountCleanDuplicatesBtn, 350);
    }
    setInterval(mountCleanDuplicatesBtn, 2500);
  }
})();

/* === M216_VOCAB_SORT_ORDER_AND_CODE36_V1 === */
(function() {
  if (window.__M216_VOCAB_SORT_ACTIVE__) return;
  window.__M216_VOCAB_SORT_ACTIVE__ = true;

  var SORT_KEY = 'df_vocab_sort_mode';
  var MODES = ['newest', 'alpha', 'hard_first'];
  var LABELS = {
    newest: '↕ الترتيب: الأحدث',
    alpha: '🔤 الترتيب: أبجدي',
    hard_first: '🔥 الترتيب: الصعبة أولاً'
  };
  var currentMode = 'newest';
  try {
    var saved = localStorage.getItem(SORT_KEY);
    if (saved && LABELS[saved]) currentMode = saved;
  } catch (e) {}

  window.dfSortVocabItems = function(items, mode) {
    var m = mode || currentMode;
    var list = (items || []).slice();
    if (m === 'alpha') {
      list.sort(function(a, b) {
        return String((a && a.word) || '').localeCompare(String((b && b.word) || ''));
      });
    } else if (m === 'hard_first') {
      list.sort(function(a, b) {
        var ah = (a && a.hard) ? 1 : 0;
        var bh = (b && b.hard) ? 1 : 0;
        if (bh !== ah) return bh - ah;
        return String((a && a.word) || '').localeCompare(String((b && b.word) || ''));
      });
    }
    return list;
  };

  window.dfCycleVocabSortOrder = function() {
    var idx = MODES.indexOf(currentMode);
    currentMode = MODES[(idx + 1) % MODES.length];
    try {
      localStorage.setItem(SORT_KEY, currentMode);
    } catch (e) {}

    var btn = typeof document !== 'undefined' ? document.getElementById('df-vocab-sort-mode-btn') : null;
    if (btn) {
      btn.textContent = LABELS[currentMode];
    }

    var eng = window.SpokenVocabEngine;
    if (eng && typeof eng.getItems === 'function' && typeof eng.saveItems === 'function') {
      var sorted = window.dfSortVocabItems(eng.getItems(), currentMode);
      eng.saveItems(sorted);
      if (typeof eng.render === 'function') eng.render();
    }
    return currentMode;
  };

  window.dfGetVocabSortOrder = function() {
    return currentMode;
  };

  function mountSortModeBtn() {
    if (typeof document === 'undefined') return;
    var searchRow = document.getElementById('df-vocab-search-row') ||
                    document.getElementById('df-vocab-filter-bar');
    if (!searchRow || document.getElementById('df-vocab-sort-mode-btn')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'df-vocab-sort-mode-btn';
    btn.style.cssText = 'padding:8px 12px;border-radius:10px;border:1px solid rgba(148,163,184,0.35);background:rgba(30,41,59,0.75);color:#e2e8f0;font-size:12px;font-weight:600;cursor:pointer;';
    btn.textContent = LABELS[currentMode] || LABELS.newest;
    btn.onclick = function() { window.dfCycleVocabSortOrder(); };
    searchRow.appendChild(btn);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountSortModeBtn);
    } else {
      setTimeout(mountSortModeBtn, 350);
    }
    setInterval(mountSortModeBtn, 2500);
  }
})();

/* === M217_VOCAB_QUIZ_STREAK_COUNTER_AND_CODE37_V1 === */
(function() {
  if (window.__M217_QUIZ_STREAK__) return;
  window.__M217_QUIZ_STREAK__ = true;

  function toWesternDigits(str) {
    return String(str == null ? '' : str)
      .replace(/[\u0660-\u0669]/g, function(d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[\u06F0-\u06F9]/g, function(d) { return String(d.charCodeAt(0) - 0x06F0); });
  }

  var currentStreak = 0;
  var bestStreak = 0;
  var STREAK_KEY = 'df_vocab_quiz_best_streak';
  try {
    bestStreak = parseInt(localStorage.getItem(STREAK_KEY), 10) || 0;
  } catch(e) {}

  window.dfRecordQuizAnswerStreak = function(isEasy) {
    if (isEasy) {
      currentStreak++;
      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
        try {
          localStorage.setItem(STREAK_KEY, String(bestStreak));
        } catch(e) {}
      }
    } else {
      currentStreak = 0;
    }
    updateStreakUI();
    return { current: currentStreak, best: bestStreak };
  };

  window.dfGetQuizStreakData = function() {
    return { current: currentStreak, best: bestStreak };
  };

  function updateStreakUI() {
    if (typeof document === 'undefined') return;
    var badge = document.getElementById('df-quiz-streak-badge');
    if (!badge) return;
    badge.innerHTML =
      '<span style="color:#f59e0b;font-weight:700;">🔥 تتابع: <b>' + toWesternDigits(currentStreak) + '</b></span>' +
      (bestStreak > 1 ? '<span style="color:#94a3b8;margin-right:6px;font-size:11px;">(أفضل: ' + toWesternDigits(bestStreak) + ')</span>' : '');
  }

  function mountStreakUI() {
    if (typeof document === 'undefined') return;
    var toolbar = document.getElementById('df-quiz-extra-toolbar') ||
                  document.getElementById('df-flash-quiz-header');
    if (!toolbar || document.getElementById('df-quiz-streak-badge')) return;

    var badge = document.createElement('span');
    badge.id = 'df-quiz-streak-badge';
    badge.style.cssText = 'display:inline-flex;align-items:center;padding:4px 8px;border-radius:8px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);font-size:12px;margin:2px 4px;';
    toolbar.appendChild(badge);
    updateStreakUI();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountStreakUI);
    } else {
      setTimeout(mountStreakUI, 350);
    }
    setInterval(mountStreakUI, 2500);
  }
})();

