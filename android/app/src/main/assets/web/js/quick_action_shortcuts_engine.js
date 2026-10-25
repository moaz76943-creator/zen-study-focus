/**
 * DEEP FOCUS — Quick Action Shortcuts & Fast Focus Launch Engine
 * Mission #038: 1-click launch shortcuts, mobile 320px pinned limit,
 * duration clamps (1-180m), and timer-compatible dispatch payloads.
 */
(function (global) {
  'use strict';

  var MAX_PINNED_SHORTCUTS = 4;

  var DEFAULT_SHORTCUTS = [
    {
      id: "shortcut_sprint_15",
      titleAr: "سبرنت سريع",
      titleEn: "Quick Sprint",
      durationMinutes: 15,
      soundscape: "pure_zen",
      pinned: true
    },
    {
      id: "shortcut_pomodoro_25",
      titleAr: "بومودورو قياسي",
      titleEn: "Classic Pomodoro",
      durationMinutes: 25,
      soundscape: "rainy_library",
      pinned: true
    },
    {
      id: "shortcut_deep_50",
      titleAr: "مذاكرة عميقة",
      titleEn: "Deep Study",
      durationMinutes: 50,
      soundscape: "calm_forest",
      pinned: true
    }
  ];

  /**
   * Clamps duration strictly between 1 and 180 minutes.
   */
  function clampDuration(minutes) {
    if (typeof minutes !== 'number' || isNaN(minutes)) return 25;
    var rounded = Math.round(minutes);
    if (rounded < 1) return 1;
    if (rounded > 180) return 180;
    return rounded;
  }

  /**
   * Returns default shortcuts safely cloned.
   */
  function getDefaultShortcuts() {
    return JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS));
  }

  /**
   * Adds or updates a shortcut defensively.
   */
  function registerShortcut(shortcutsList, newShortcut) {
    var list = Array.isArray(shortcutsList) ? shortcutsList.slice() : getDefaultShortcuts();
    if (!newShortcut || typeof newShortcut !== 'object') return list;

    var sanitized = {
      id: newShortcut.id || ('custom_' + Date.now()),
      titleAr: String(newShortcut.titleAr || newShortcut.title || 'جلسة سريعة').trim(),
      titleEn: String(newShortcut.titleEn || newShortcut.title || 'Quick Session').trim(),
      durationMinutes: clampDuration(newShortcut.durationMinutes),
      soundscape: newShortcut.soundscape || 'pure_zen',
      pinned: Boolean(newShortcut.pinned)
    };

    var existingIdx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === sanitized.id) {
        existingIdx = i;
        break;
      }
    }

    if (existingIdx !== -1) {
      list[existingIdx] = sanitized;
    } else {
      list.push(sanitized);
    }

    return enforcePinnedLimit(list);
  }

  /**
   * Enforces max pinned shortcuts invariant (for 320px viewport safety).
   */
  function enforcePinnedLimit(shortcutsList) {
    var list = Array.isArray(shortcutsList) ? shortcutsList.slice() : [];
    var pinnedCount = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i].pinned) {
        pinnedCount++;
        if (pinnedCount > MAX_PINNED_SHORTCUTS) {
          list[i].pinned = false;
        }
      }
    }
    return list;
  }

  /**
   * Toggles pinned status for a specific shortcut.
   */
  function togglePin(shortcutsList, shortcutId) {
    var list = Array.isArray(shortcutsList) ? shortcutsList.slice() : getDefaultShortcuts();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === shortcutId) {
        list[i].pinned = !list[i].pinned;
        break;
      }
    }
    return enforcePinnedLimit(list);
  }

  /**
   * Creates an execution payload ready for timer_idempotency & fortress timer.
   */
  function createLaunchPayload(shortcut, options) {
    options = options || {};
    if (!shortcut || typeof shortcut !== 'object') {
      shortcut = DEFAULT_SHORTCUTS[0];
    }
    var durationMins = clampDuration(shortcut.durationMinutes);
    return {
      action: "START_FOCUS_SESSION",
      durationMinutes: durationMins,
      targetSeconds: durationMins * 60,
      label: shortcut.titleAr || shortcut.title || "تركيز سريع",
      soundscape: shortcut.soundscape || "pure_zen",
      autoStart: options.autoStart !== undefined ? Boolean(options.autoStart) : true,
      timestamp: Date.now()
    };
  }

  var engine = {
    MAX_PINNED_SHORTCUTS: MAX_PINNED_SHORTCUTS,
    clampDuration: clampDuration,
    getDefaultShortcuts: getDefaultShortcuts,
    registerShortcut: registerShortcut,
    togglePin: togglePin,
    enforcePinnedLimit: enforcePinnedLimit,
    createLaunchPayload: createLaunchPayload
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.QuickActionShortcutsEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
