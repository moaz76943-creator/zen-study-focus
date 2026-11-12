/**
 * DEEP FOCUS — Sovereign Modular Analytics & 26-Week Heatmap (v561.0.0)
 * Engineered for Xiaomi 17T Pro AMOLED (#000000) & HiDPI Canvas rendering.
 * Zero PII, strict Western digits (0123456789), 100% offline local storage.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'deepfocus_sovereign_analytics_v1';

  function getTodayISO() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function loadStore() {
    if (typeof localStorage === 'undefined') return global.__dfMemoryAnalytics || {};
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) || {}) : {};
    } catch (e) {
      return {};
    }
  }

  function saveStore(data) {
    if (typeof localStorage === 'undefined') {
      global.__dfMemoryAnalytics = data;
      return true;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  var SovereignAnalytics = {
    recordSession: function (minutes, dateKey) {
      var mins = Math.max(1, Math.round(Number(minutes) || 25));
      var key = dateKey || getTodayISO();
      var store = loadStore();
      if (!store[key]) store[key] = { minutes: 0, sessions: 0 };
      store[key].minutes += mins;
      store[key].sessions += 1;
      saveStore(store);
      return store[key];
    },

    getWeeklyMomentum: function () {
      var store = loadStore();
      var days = [];
      var now = new Date();
      for (var i = 6; i >= 0; i--) {
        var d = new Date(now.getTime() - i * 86400000);
        var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        var entry = store[key] || { minutes: 0, sessions: 0 };
        days.push({ date: key, minutes: entry.minutes, sessions: entry.sessions });
      }
      return days;
    },

    renderMomentumChart: function (canvasEl) {
      if (!canvasEl || typeof canvasEl.getContext !== 'function') return false;
      var dpr = (typeof global.devicePixelRatio === 'number' && global.devicePixelRatio > 0) ? global.devicePixelRatio : 1;
      var rect = canvasEl.getBoundingClientRect ? canvasEl.getBoundingClientRect() : { width: 320, height: 140 };
      var w = rect.width || 320;
      var h = rect.height || 140;
      canvasEl.width = Math.round(w * dpr);
      canvasEl.height = Math.round(h * dpr);
      var ctx = canvasEl.getContext('2d');
      ctx.scale(dpr, dpr);

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      var data = this.getWeeklyMomentum();
      var maxMin = 60;
      for (var i = 0; i < data.length; i++) {
        if (data[i].minutes > maxMin) maxMin = data[i].minutes;
      }

      var pad = 16;
      var barW = Math.max(12, Math.floor((w - pad * 2) / 7) - 8);
      for (var j = 0; j < data.length; j++) {
        var ratio = data[j].minutes / maxMin;
        var barH = Math.max(4, Math.round((h - 40) * ratio));
        var x = pad + j * ((w - pad * 2) / 7) + 4;
        var y = h - 22 - barH;
        ctx.fillStyle = data[j].minutes > 0 ? '#10B981' : '#1F2937';
        ctx.fillRect(x, y, barW, barH);
        ctx.fillStyle = '#EDEDED';
        ctx.font = '10px monospace';
        ctx.fillText(String(data[j].minutes), x, h - 8);
      }
      return true;
    }
  };

  var SovereignHeatmap = {
    get26WeekGrid: function () {
      var store = loadStore();
      var grid = [];
      var now = new Date();
      var totalDays = 26 * 7;
      for (var i = totalDays - 1; i >= 0; i--) {
        var d = new Date(now.getTime() - i * 86400000);
        var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        var mins = store[key] ? store[key].minutes : 0;
        var level = mins === 0 ? 0 : mins < 30 ? 1 : mins < 90 ? 2 : mins < 180 ? 3 : 4;
        grid.push({ date: key, minutes: mins, level: level });
      }
      return grid;
    },

    renderHeatmap: function (canvasEl) {
      if (!canvasEl || typeof canvasEl.getContext !== 'function') return false;
      var dpr = (typeof global.devicePixelRatio === 'number' && global.devicePixelRatio > 0) ? global.devicePixelRatio : 1;
      var w = 338;
      var h = 98;
      canvasEl.width = Math.round(w * dpr);
      canvasEl.height = Math.round(h * dpr);
      var ctx = canvasEl.getContext('2d');
      ctx.scale(dpr, dpr);

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      var colors = ['#111827', '#064E3B', '#047857', '#10B981', '#34D399'];
      var grid = this.get26WeekGrid();
      for (var idx = 0; idx < grid.length; idx++) {
        var col = Math.floor(idx / 7);
        var row = idx % 7;
        ctx.fillStyle = colors[grid[idx].level] || colors[0];
        ctx.fillRect(6 + col * 12.5, 6 + row * 12.5, 10, 10);
      }
      return true;
    }
  };

  // Auto-subscribe to SovereignEventBus if available
  if (global.SovereignEventBus && typeof global.SovereignEventBus.on === 'function') {
    global.SovereignEventBus.on('timer:complete', function (payload) {
      var mins = payload && payload.durationSec ? Math.round(payload.durationSec / 60) : 25;
      SovereignAnalytics.recordSession(mins);
    });
  }

  var AnalyticsSuite = {
    version: '561.0.0',
    analytics: SovereignAnalytics,
    heatmap: SovereignHeatmap
  };

  global.SovereignAnalyticsSuite = AnalyticsSuite;
  if (!global.SovereignAnalytics) global.SovereignAnalytics = SovereignAnalytics;
  if (!global.SovereignHeatmap) global.SovereignHeatmap = SovereignHeatmap;

  if (global.SovereignCoreRegistry && typeof global.SovereignCoreRegistry.register === 'function') {
    global.SovereignCoreRegistry.register('sovereign_analytics_suite', AnalyticsSuite);
  }
})(typeof window !== 'undefined' ? window : globalThis);
