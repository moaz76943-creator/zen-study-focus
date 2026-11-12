/**
 * DEEP FOCUS — Real Interactive Handlers for 14 Missing UI Actions (v622.0.0)
 * Covers: Timer Settings, Daily Goals, Quick Training & Notes Studio
 */
(function (global) {
  "use strict";

  var KEY_TIMER_CFG = "zen_timer_settings_v1";
  var KEY_DAILY_GOALS = "zen_daily_goals_v1";
  var KEY_NOTE_DRAFT = "zen_note_draft_v1";

  function byId(id) {
    return typeof document !== "undefined" ? document.getElementById(id) : null;
  }

  function showModal(el) {
    if (!el) return;
    el.style.display = "flex";
    el.classList.remove("hidden");
    el.setAttribute("aria-hidden", "false");
  }

  function hideModal(el) {
    if (!el) return;
    el.style.display = "none";
    el.classList.add("hidden");
    el.setAttribute("aria-hidden", "true");
  }

  function readJson(key, fallback) {
    try {
      if (typeof localStorage === "undefined") return fallback;
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, val) {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(key, JSON.stringify(val));
      }
    } catch (e) {}
  }


  function ensureFallbackModal(id, title, fieldsHtml, onSaveFnName) {
    var existing = byId(id);
    if (existing) return existing;
    if (typeof document === "undefined" || !document.body) return null;
    var wrap = document.createElement("div");
    wrap.id = id;
    wrap.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:99999;display:none;align-items:center;justify-content:center;padding:16px;";
    wrap.innerHTML =
      '<div style="background:#111827;color:#F9FAFB;border:1px solid #374151;border-radius:16px;padding:20px;max-width:360px;width:100%;font-family:sans-serif;">' +
        '<h3 style="margin:0 0 12px 0;font-size:18px;">' + title + '</h3>' +
        fieldsHtml +
        '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">' +
          '<button type="button" onclick="this.closest(\'#' + id + '\').style.display=\'none\'" style="padding:10px 14px;border-radius:10px;border:1px solid #4B5563;background:transparent;color:#E5E7EB;">Close</button>' +
          '<button type="button" onclick="' + onSaveFnName + '()" style="padding:10px 16px;border-radius:10px;border:none;background:#2563EB;color:#FFFFFF;font-weight:600;">Save</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    return wrap;
  }

  // --- 1. Timer Settings ---
  function openTimerSettings() {
    var modal = byId("timerSettingsModal") || byId("timer-settings-modal") || byId("settingsModal") || ensureFallbackModal("timerSettingsModal", "Timer Settings", "<label>Focus (min)<input id=\"focusMinutesInput\" type=\"number\" value=\"25\" style=\"width:100%;padding:8px;margin:4px 0 10px;border-radius:8px;border:1px solid #374151;background:#1F2937;color:#fff;\"></label><label>Short Break (min)<input id=\"shortBreakInput\" type=\"number\" value=\"5\" style=\"width:100%;padding:8px;margin:4px 0 10px;border-radius:8px;border:1px solid #374151;background:#1F2937;color:#fff;\"></label><label>Long Break (min)<input id=\"longBreakInput\" type=\"number\" value=\"15\" style=\"width:100%;padding:8px;margin:4px 0;border-radius:8px;border:1px solid #374151;background:#1F2937;color:#fff;\"></label>", "saveTimerSettings");
    var cfg = readJson(KEY_TIMER_CFG, { focus: 25, shortBreak: 5, longBreak: 15 });
    var fIn = byId("focusMinutesInput") || byId("timerFocusInput") || byId("focusDuration");
    var sIn = byId("shortBreakInput") || byId("timerShortBreakInput");
    var lIn = byId("longBreakInput") || byId("timerLongBreakInput");
    if (fIn) fIn.value = cfg.focus;
    if (sIn) sIn.value = cfg.shortBreak;
    if (lIn) lIn.value = cfg.longBreak;
    if (modal) showModal(modal);
    return cfg;
  }

  function resetTimerSettingsFields() {
    var defaults = { focus: 25, shortBreak: 5, longBreak: 15 };
    var fIn = byId("focusMinutesInput") || byId("timerFocusInput") || byId("focusDuration");
    var sIn = byId("shortBreakInput") || byId("timerShortBreakInput");
    var lIn = byId("longBreakInput") || byId("timerLongBreakInput");
    if (fIn) fIn.value = defaults.focus;
    if (sIn) sIn.value = defaults.shortBreak;
    if (lIn) lIn.value = defaults.longBreak;
    writeJson(KEY_TIMER_CFG, defaults);
    return defaults;
  }

  function saveTimerSettings() {
    var fIn = byId("focusMinutesInput") || byId("timerFocusInput") || byId("focusDuration");
    var sIn = byId("shortBreakInput") || byId("timerShortBreakInput");
    var lIn = byId("longBreakInput") || byId("timerLongBreakInput");
    var cfg = {
      focus: Math.max(1, parseInt(fIn ? fIn.value : 25, 10) || 25),
      shortBreak: Math.max(1, parseInt(sIn ? sIn.value : 5, 10) || 5),
      longBreak: Math.max(1, parseInt(lIn ? lIn.value : 15, 10) || 15)
    };
    writeJson(KEY_TIMER_CFG, cfg);
    var disp = byId("timerDisplay") || byId("timer-display");
    if (disp) disp.textContent = String(cfg.focus).padStart(2, "0") + ":00";
    var modal = byId("timerSettingsModal") || byId("timer-settings-modal") || byId("settingsModal");
    if (modal) hideModal(modal);
    return cfg;
  }

  // --- 2. Daily Goals ---
  function openDailyGoalsModal() {
    var modal = byId("dailyGoalsModal") || byId("daily-goals-modal") || ensureFallbackModal("dailyGoalsModal", "Daily Goals", "<label>Daily Minutes<input id=\"dailyGoalMinutesInput\" type=\"number\" value=\"120\" style=\"width:100%;padding:8px;margin:4px 0 10px;border-radius:8px;border:1px solid #374151;background:#1F2937;color:#fff;\"></label><label>Daily Sessions<input id=\"dailyGoalSessionsInput\" type=\"number\" value=\"4\" style=\"width:100%;padding:8px;margin:4px 0;border-radius:8px;border:1px solid #374151;background:#1F2937;color:#fff;\"></label>", "saveDailyGoals");
    var goals = readJson(KEY_DAILY_GOALS, { targetMinutes: 120, targetSessions: 4 });
    var mIn = byId("dailyGoalMinutesInput") || byId("dailyMinutesGoal");
    var sIn = byId("dailyGoalSessionsInput") || byId("dailySessionsGoal");
    if (mIn) mIn.value = goals.targetMinutes;
    if (sIn) sIn.value = goals.targetSessions;
    if (modal) showModal(modal);
    return goals;
  }

  function saveDailyGoals() {
    var mIn = byId("dailyGoalMinutesInput") || byId("dailyMinutesGoal");
    var sIn = byId("dailyGoalSessionsInput") || byId("dailySessionsGoal");
    var goals = {
      targetMinutes: Math.max(10, parseInt(mIn ? mIn.value : 120, 10) || 120),
      targetSessions: Math.max(1, parseInt(sIn ? sIn.value : 4, 10) || 4)
    };
    writeJson(KEY_DAILY_GOALS, goals);
    var modal = byId("dailyGoalsModal") || byId("daily-goals-modal");
    if (modal) hideModal(modal);
    return goals;
  }

  // --- 3. Quick Training Controller ---
  var qtState = {
    active: false,
    stepIndex: 0,
    timerId: null,
    exercises: [
      { name: "Push-ups", seconds: 45 },
      { name: "Plank", seconds: 45 },
      { name: "Squats", seconds: 45 }
    ]
  };

  function renderQuickTraining() {
    var label = byId("qtCurrentStep") || byId("quickTrainingStatus");
    if (label && qtState.exercises[qtState.stepIndex]) {
      var cur = qtState.exercises[qtState.stepIndex];
      label.textContent = cur.name + " (" + cur.seconds + "s)";
    }
  }

  function addQuickExercise(name, secs) {
    var nIn = byId("qtExerciseName") || byId("quickExerciseName");
    var sIn = byId("qtExerciseSeconds") || byId("quickExerciseSeconds");
    var exName = name || (nIn && nIn.value.trim()) || "Stretch";
    var exSecs = Math.max(10, parseInt(secs || (sIn && sIn.value) || 30, 10) || 30);
    qtState.exercises.push({ name: exName, seconds: exSecs });
    if (nIn) nIn.value = "";
    renderQuickTraining();
    return qtState.exercises.length;
  }

  function applyQuickTrainingPreset(presetName) {
    var presets = {
      desk: [{ name: "Neck Stretch", seconds: 30 }, { name: "Shoulder Rolls", seconds: 30 }],
      cardio: [{ name: "Jumping Jacks", seconds: 45 }, { name: "High Knees", seconds: 45 }],
      core: [{ name: "Plank", seconds: 60 }, { name: "Glute Bridge", seconds: 45 }]
    };
    qtState.exercises = presets[presetName] || presets.desk;
    qtState.stepIndex = 0;
    renderQuickTraining();
    return qtState.exercises;
  }

  function startQuickTraining() {
    qtState.active = true;
    if (qtState.stepIndex >= qtState.exercises.length) qtState.stepIndex = 0;
    renderQuickTraining();
    if (qtState.timerId) clearInterval(qtState.timerId);
    qtState.timerId = setInterval(function () {
      if (!qtState.active) return;
      var cur = qtState.exercises[qtState.stepIndex];
      if (!cur) { cancelQuickTraining(); return; }
      cur.seconds--;
      renderQuickTraining();
      if (cur.seconds <= 0) skipQuickTrainingStep();
    }, 1000);
    return true;
  }

  function skipQuickTrainingStep() {
    if (qtState.stepIndex < qtState.exercises.length - 1) {
      qtState.stepIndex++;
      renderQuickTraining();
      return qtState.stepIndex;
    }
    return cancelQuickTraining();
  }

  function cancelQuickTraining() {
    qtState.active = false;
    if (qtState.timerId) {
      clearInterval(qtState.timerId);
      qtState.timerId = null;
    }
    qtState.stepIndex = 0;
    renderQuickTraining();
    return false;
  }

  // --- 4. Notes Studio Helpers ---
  var pinnedOnly = false;
  function nsTogglePinnedOnly() {
    pinnedOnly = !pinnedOnly;
    if (typeof document !== "undefined") {
      var items = document.querySelectorAll("[data-note-id], .note-card");
      for (var i = 0; i < items.length; i++) {
        var isPinned = items[i].getAttribute("data-pinned") === "true" || items[i].classList.contains("pinned");
        items[i].style.display = (pinnedOnly && !isPinned) ? "none" : "";
      }
      var btn = byId("nsPinnedOnlyBtn") || document.querySelector('[onclick*="nsTogglePinnedOnly"]');
      if (btn) btn.classList.toggle("active", pinnedOnly);
    }
    return pinnedOnly;
  }

  function nsCloseEditor() {
    var editor = byId("nsEditorModal") || byId("noteEditorModal") || byId("ns-editor");
    if (editor) hideModal(editor);
    return true;
  }

  function nsRestoreDraft() {
    var draft = readJson(KEY_NOTE_DRAFT, null);
    if (!draft) return false;
    var tIn = byId("nsNoteTitle") || byId("noteTitleInput");
    var bIn = byId("nsNoteBody") || byId("noteBodyInput");
    if (tIn && draft.title) tIn.value = draft.title;
    if (bIn && draft.body) bIn.value = draft.body;
    return true;
  }

  function nsDiscardDraft() {
    try {
      if (typeof localStorage !== "undefined") localStorage.removeItem(KEY_NOTE_DRAFT);
    } catch (e) {}
    var banner = byId("nsDraftBanner") || byId("noteDraftBanner");
    if (banner) banner.style.display = "none";
    return true;
  }

  var api = {
    openTimerSettings: openTimerSettings,
    resetTimerSettingsFields: resetTimerSettingsFields,
    saveTimerSettings: saveTimerSettings,
    openDailyGoalsModal: openDailyGoalsModal,
    saveDailyGoals: saveDailyGoals,
    addQuickExercise: addQuickExercise,
    applyQuickTrainingPreset: applyQuickTrainingPreset,
    startQuickTraining: startQuickTraining,
    skipQuickTrainingStep: skipQuickTrainingStep,
    cancelQuickTraining: cancelQuickTraining,
    nsTogglePinnedOnly: nsTogglePinnedOnly,
    nsCloseEditor: nsCloseEditor,
    nsRestoreDraft: nsRestoreDraft,
    nsDiscardDraft: nsDiscardDraft
  };

  Object.keys(api).forEach(function (k) {
    global[k] = api[k];
  });
  global.SovereignMissingHandlers = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
