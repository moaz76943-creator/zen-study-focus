#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "=== [DEEP FOCUS] 🎯 Starting Mission #186: Task-Timer Ecosystem Synergy ==="
cd ~/zen-study-focus

git checkout integration/master-qa-verified-v21
git pull origin integration/master-qa-verified-v21

APP_JS="android/app/src/main/assets/web/app.js"
TEST_FILE="test/cycle_186_task_timer_synergy.test.js"
RECEIPT_FILE="artifacts/evidence/cycle_186_receipt.json"

echo "=== 1. دمج محرك ربط المؤقت بالمهام والشطب التلقائي في صلب app.js ==="
node << 'EOF'
const fs = require('fs');

const appJsPath = 'android/app/src/main/assets/web/app.js';
let code = fs.readFileSync(appJsPath, 'utf8');

const TASK_TIMER_SYNERGY_ENGINE = `
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
    pill.innerHTML = \`
      <div class="flex items-center gap-2 overflow-hidden text-blue-950 font-semibold truncate">
        <span class="text-blue-600 font-bold">🎯 Target:</span>
        <span id="df-current-task-name" class="truncate">\${task.text}</span>
      </div>
      <button id="df-change-task-btn" class="text-blue-600 font-bold px-2 py-0.5 hover:bg-blue-100 rounded-lg transition shrink-0">Change</button>
    \`;

    pill.querySelector('#df-change-task-btn').onclick = () => {
      const tasks = getActiveTasks().filter(t => !t.done);
      if (tasks.length === 0) {
        alert('All tasks completed! Add a new task in Tasks tab.');
        return;
      }
      const choice = prompt('Select active target task:\\n' + tasks.map((t, i) => \`\${i+1}. \${t.text}\`).join('\\n'), '1');
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
    modal.innerHTML = \`
      <div class="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl border border-slate-100 text-center animate-in fade-in">
        <div class="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold mb-3">✓</div>
        <h3 class="font-bold text-slate-900 text-base mb-1">Session Complete!</h3>
        <p class="text-xs text-slate-500 mb-4">Did you finish: <strong class="text-slate-800">\${task.text}</strong>?</p>
        <div class="flex gap-2">
          <button id="df-task-yes" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold transition">✅ Yes, Done</button>
          <button id="df-task-no" class="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 rounded-xl text-xs font-semibold transition">⏳ Continue Later</button>
        </div>
      </div>
    \`;

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
`;

if (!code.includes('DEEP FOCUS — TASK & TIMER SYNERGY ENGINE')) {
  code = TASK_TIMER_SYNERGY_ENGINE + '\n' + code;
}

// استدعاء نافذة إنجاز المهمة عند انتهاء المؤقت
if (code.includes('playPeacefulChime') || code.includes('playCompletionTone')) {
  code = code.replace(/playCompletionTone\(\);/g, 'playCompletionTone(); if(window.TaskTimerSynergy) window.TaskTimerSynergy.showCompletionDialog();');
}

fs.writeFileSync(appJsPath, code, 'utf8');
console.log("✓ Task-Timer Synergy Engine successfully woven into app.js!");
