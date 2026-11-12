/**
 * DEEP FOCUS — SovereignSessionLogger (v584.0.0)
 * Structured offline study session journal with multi-tagging and quality analytics.
 * Strictly local storage, zero PII, zero network leaks.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'df_session_log_v1';
  var sessions = [];

  function loadState() {
    try {
      if (typeof localStorage !== 'undefined') {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          var parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            sessions = parsed;
          }
        }
      }
    } catch (e) {}
  }

  function saveState() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      }
    } catch (e) {}
  }

  loadState();

  var SovereignSessionLogger = {
    version: '584.0.0',

    logSession: function (data) {
      if (!data) data = {};
      var entry = {
        id: 'sess_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        timestamp: data.timestamp || Date.now(),
        durationMinutes: Math.max(1, parseInt(data.durationMinutes || 25, 10)),
        tags: Array.isArray(data.tags) ? data.tags.map(function (t) { return String(t).trim(); }) : ['General'],
        qualityScore: Math.max(1, Math.min(5, parseInt(data.qualityScore || 4, 10))),
        distractions: Math.max(0, parseInt(data.distractions || 0, 10)),
        status: data.status || 'completed',
        profileId: data.profileId || 'deep_work'
      };

      sessions.push(entry);

      // Keep recent 500 sessions for low memory overhead
      if (sessions.length > 500) {
        sessions = sessions.slice(sessions.length - 500);
      }

      saveState();

      if (global.SovereignEventBus && typeof global.SovereignEventBus.emit === 'function') {
        global.SovereignEventBus.emit('session:logged', entry);
      }
      return entry;
    },

    querySessions: function (filter) {
      var f = filter || {};
      return sessions.filter(function (s) {
        if (f.tag && s.tags.indexOf(f.tag) === -1) return false;
        if (f.minQuality && s.qualityScore < f.minQuality) return false;
        if (f.status && s.status !== f.status) return false;
        if (f.fromDate && s.timestamp < f.fromDate) return false;
        if (f.toDate && s.timestamp > f.toDate) return false;
        return true;
      });
    },

    getTagDistribution: function () {
      var dist = {};
      for (var i = 0; i < sessions.length; i++) {
        var s = sessions[i];
        for (var j = 0; j < s.tags.length; j++) {
          var t = s.tags[j];
          if (!dist[t]) {
            dist[t] = { count: 0, totalMinutes: 0 };
          }
          dist[t].count++;
          dist[t].totalMinutes += s.durationMinutes;
        }
      }
      return dist;
    },

    getRecentSessions: function (limit) {
      var n = Math.max(1, limit || 20);
      return sessions.slice(Math.max(0, sessions.length - n)).reverse();
    },

    getTotalLoggedMinutes: function () {
      var total = 0;
      for (var i = 0; i < sessions.length; i++) {
        total += sessions[i].durationMinutes;
      }
      return total;
    }
  };

  // Wire auto-logging upon timer completion
  if (typeof global !== 'undefined') {
    if (global.SovereignEventBus && typeof global.SovereignEventBus.on === 'function') {
      global.SovereignEventBus.on('timer:complete', function (data) {
        var mins = data && data.durationSec ? Math.round(data.durationSec / 60) : 25;
        var tag = data && data.tag ? data.tag : 'Focus';
        SovereignSessionLogger.logSession({
          durationMinutes: mins,
          tags: [tag],
          qualityScore: 5
        });
      });
    }
  }

  global.SovereignSessionLogger = SovereignSessionLogger;
  if (global.SovereignCoreRegistry && typeof global.SovereignCoreRegistry.register === 'function') {
    global.SovereignCoreRegistry.register('sovereign_session_logger', SovereignSessionLogger);
  }
})(typeof window !== 'undefined' ? window : globalThis);
