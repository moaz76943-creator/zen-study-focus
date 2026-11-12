/**
 * DEEP FOCUS — SovereignHabitMomentum (v582.0.0)
 * Non-punitive study momentum and flexible weekly habit engine.
 * Eliminates streak anxiety by replacing binary zero-resets with smooth decay and rest-day immunity.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'df_habit_momentum_v1';

  var config = {
    weeklyTargetMinutes: 600, // 10 hours default
    protectedRestDays: 2,     // 2 rest days per week
    sessions: []              // { timestamp, minutes }
  };

  function loadState() {
    try {
      if (typeof localStorage !== 'undefined') {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          var parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            config.weeklyTargetMinutes = parsed.weeklyTargetMinutes || 600;
            config.protectedRestDays = typeof parsed.protectedRestDays === 'number' ? parsed.protectedRestDays : 2;
            config.sessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
          }
        }
      }
    } catch (e) {}
  }

  function saveState() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      }
    } catch (e) {}
  }

  loadState();

  var SovereignHabitMomentum = {
    version: '582.0.0',

    recordSession: function (minutes, timestamp) {
      var min = Math.max(1, parseInt(minutes || 25, 10));
      var ts = timestamp || Date.now();
      var entry = { minutes: min, timestamp: ts };
      config.sessions.push(entry);

      // Prune sessions older than 90 days to keep storage lightweight
      var cutoff = Date.now() - (90 * 86400000);
      config.sessions = config.sessions.filter(function (s) {
        return s.timestamp >= cutoff;
      });

      saveState();
      if (global.SovereignEventBus && typeof global.SovereignEventBus.emit === 'function') {
        global.SovereignEventBus.emit('momentum:session_recorded', entry);
        global.SovereignEventBus.emit('momentum:updated', this.calculateMomentumScore());
      }
      return entry;
    },

    setWeeklyGoal: function (targetMinutes, restDays) {
      if (typeof targetMinutes === 'number' && targetMinutes > 0) {
        config.weeklyTargetMinutes = targetMinutes;
      }
      if (typeof restDays === 'number' && restDays >= 0 && restDays <= 6) {
        config.protectedRestDays = restDays;
      }
      saveState();
      return { targetMinutes: config.weeklyTargetMinutes, restDays: config.protectedRestDays };
    },

    getWeeklyProgress: function () {
      var now = new Date();
      var dayOfWeek = (now.getDay() + 6) % 7; // Monday = 0
      var startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).getTime();

      var loggedMinutes = 0;
      for (var i = 0; i < config.sessions.length; i++) {
        var s = config.sessions[i];
        if (s.timestamp >= startOfWeek) {
          loggedMinutes += s.minutes;
        }
      }

      var target = config.weeklyTargetMinutes;
      var percent = target > 0 ? Math.min(100, Math.round((loggedMinutes / target) * 100)) : 100;
      var daysRemaining = 7 - (dayOfWeek + 1);

      return {
        loggedMinutes: loggedMinutes,
        targetMinutes: target,
        percent: percent,
        daysRemaining: daysRemaining
      };
    },

    /**
     * Calculates rolling 14-day momentum (0 to 100) using exponential decay
     */
    calculateMomentumScore: function () {
      var now = Date.now();
      var totalWeight = 0;
      var earnedWeight = 0;

      // Iterate through past 14 days
      for (var d = 0; d < 14; d++) {
        var dayStart = now - ((d + 1) * 86400000);
        var dayEnd = now - (d * 86400000);
        var recencyMultiplier = Math.exp(-0.08 * d); // Smooth exponential decay

        var dayMinutes = 0;
        for (var i = 0; i < config.sessions.length; i++) {
          var s = config.sessions[i];
          if (s.timestamp >= dayStart && s.timestamp < dayEnd) {
            dayMinutes += s.minutes;
          }
        }

        var dailyTarget = (config.weeklyTargetMinutes / (7 - config.protectedRestDays));
        var dayRatio = Math.min(1.2, dayMinutes / (dailyTarget || 1));

        totalWeight += recencyMultiplier;
        earnedWeight += dayRatio * recencyMultiplier;
      }

      var rawScore = totalWeight > 0 ? (earnedWeight / totalWeight) * 100 : 0;
      var score = Math.max(0, Math.min(100, Math.round(rawScore)));

      var status = 'Steady';
      if (score >= 75) status = 'Surging';
      else if (score < 40) status = 'Rebuilding';

      return {
        score: score,
        status: status,
        weeklyGoalMinutes: config.weeklyTargetMinutes
      };
    }
  };

  // Wire auto-recording from timer completion
  if (typeof global !== 'undefined') {
    if (global.SovereignEventBus && typeof global.SovereignEventBus.on === 'function') {
      global.SovereignEventBus.on('timer:complete', function (data) {
        var mins = data && data.durationSec ? Math.round(data.durationSec / 60) : 25;
        SovereignHabitMomentum.recordSession(mins);
      });
    }
  }

  global.SovereignHabitMomentum = SovereignHabitMomentum;
  if (global.SovereignCoreRegistry && typeof global.SovereignCoreRegistry.register === 'function') {
    global.SovereignCoreRegistry.register('sovereign_habit_momentum', SovereignHabitMomentum);
  }
})(typeof window !== 'undefined' ? window : globalThis);
