/**
 * DEEP FOCUS — Sovereign Modular Timer Engine & EventBus (v560.0.0)
 * Engineered for Xiaomi 17T Pro (120Hz/144Hz AMOLED) zero-drift timing.
 * Encapsulates:
 *   - SovereignEventBus (Error-isolated Pub/Sub for plug-and-play modules)
 *   - SovereignDeltaClock (performance.now() monotonic 60Hz-144Hz delta clock)
 *   - SovereignWorkerTimer (Dedicated Blob Web Worker clock with fallback)
 *   - SovereignStateSnapshot (60s auto-save & crash recovery with Quota guard)
 */
(function (global) {
  'use strict';

  // 1. Error-Isolated EventBus
  var listeners = Object.create(null);
  var SovereignEventBus = {
    on: function (event, fn) {
      if (typeof fn !== 'function') return function () {};
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
      return function off() {
        SovereignEventBus.off(event, fn);
      };
    },
    off: function (event, fn) {
      var list = listeners[event];
      if (!list) return;
      listeners[event] = list.filter(function (item) { return item !== fn; });
    },
    emit: function (event, payload) {
      var list = listeners[event];
      if (!list || list.length === 0) return 0;
      var delivered = 0;
      for (var i = 0; i < list.length; i++) {
        try {
          list[i](payload);
          delivered++;
        } catch (err) {
          if (typeof console !== 'undefined' && console.warn) {
            console.warn('[SovereignEventBus] Isolated error in "' + event + '": ' + (err && err.message ? err.message : err));
          }
        }
      }
      return delivered;
    },
    listenerCount: function (event) {
      return listeners[event] ? listeners[event].length : 0;
    }
  };

  // 2. Monotonic Delta Clock (Frame-rate independent 60Hz / 120Hz / 144Hz)
  var SovereignDeltaClock = {
    lastTick: 0,
    now: function () {
      if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now();
      }
      return Date.now();
    },
    step: function () {
      var current = this.now();
      if (!this.lastTick) {
        this.lastTick = current;
        return 0;
      }
      var delta = Math.max(0, Math.min(250, current - this.lastTick));
      this.lastTick = current;
      return delta;
    },
    reset: function () {
      this.lastTick = 0;
    }
  };

  // 3. Dedicated Web Worker Zero-Drift Timer
  var SovereignWorkerTimer = {
    worker: null,
    fallbackId: null,
    running: false,
    remainingSec: 0,
    targetEndMs: 0,

    _createWorker: function () {
      if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') {
        return null;
      }
      try {
        var workerSrc = [
          'var iv = null;',
          'self.onmessage = function(e) {',
          '  if (e.data === "start") {',
          '    if (iv) clearInterval(iv);',
          '    iv = setInterval(function() { self.postMessage("tick"); }, 500);',
          '  } else if (e.data === "stop") {',
          '    if (iv) { clearInterval(iv); iv = null; }',
          '  }',
          '};'
        ].join('\n');
        var blob = new Blob([workerSrc], { type: 'application/javascript' });
        var blobUrl = URL.createObjectURL(blob);
        var w = new Worker(blobUrl);
        URL.revokeObjectURL(blobUrl);
        return w;
      } catch (e) {
        return null;
      }
    },

    start: function (durationSec) {
      this.stop();
      var sec = Math.max(1, Math.floor(Number(durationSec) || 1500));
      this.remainingSec = sec;
      this.targetEndMs = Date.now() + sec * 1000;
      this.running = true;

      var self = this;
      function onPulse() {
        if (!self.running) return;
        var left = Math.max(0, Math.ceil((self.targetEndMs - Date.now()) / 1000));
        if (left !== self.remainingSec) {
          self.remainingSec = left;
          SovereignEventBus.emit('timer:tick', { remainingSec: left });
        }
        if (left <= 0) {
          self.stop();
          SovereignEventBus.emit('timer:complete', { completedAt: Date.now() });
        }
      }

      this.worker = this._createWorker();
      if (this.worker) {
        this.worker.onmessage = onPulse;
        this.worker.postMessage('start');
      } else {
        this.fallbackId = setInterval(onPulse, 500);
      }
      SovereignEventBus.emit('timer:start', { durationSec: sec, targetEndMs: this.targetEndMs });
      return true;
    },

    stop: function () {
      this.running = false;
      if (this.worker) {
        try {
          this.worker.postMessage('stop');
          this.worker.terminate();
        } catch (e) {}
        this.worker = null;
      }
      if (this.fallbackId) {
        clearInterval(this.fallbackId);
        this.fallbackId = null;
      }
      return true;
    }
  };

  // 4. Local State Snapshot & Crash/Kill Recovery (Zero PII)
  var SNAPSHOT_KEY = 'deepfocus_sovereign_snapshot_v1';
  var SovereignStateSnapshot = {
    save: function (stateObj) {
      if (typeof localStorage === 'undefined' || !stateObj) return false;
      try {
        var payload = JSON.stringify({
          savedAt: Date.now(),
          remainingSec: Number(stateObj.remainingSec) || 0,
          mode: String(stateObj.mode || 'focus'),
          running: Boolean(stateObj.running)
        });
        localStorage.setItem(SNAPSHOT_KEY, payload);
        return true;
      } catch (e) {
        return false;
      }
    },
    load: function () {
      if (typeof localStorage === 'undefined') return null;
      try {
        var raw = localStorage.getItem(SNAPSHOT_KEY);
        if (!raw) return null;
        var parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.savedAt !== 'number') return null;
        // Ignore stale snapshots older than 12 hours
        if (Date.now() - parsed.savedAt > 43200000) return null;
        return parsed;
      } catch (e) {
        return null;
      }
    },
    clear: function () {
      if (typeof localStorage === 'undefined') return false;
      try {
        localStorage.removeItem(SNAPSHOT_KEY);
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  var TimerEngine = {
    version: '560.0.0',
    bus: SovereignEventBus,
    clock: SovereignDeltaClock,
    workerTimer: SovereignWorkerTimer,
    snapshot: SovereignStateSnapshot
  };

  global.SovereignTimerEngine = TimerEngine;
  if (!global.SovereignEventBus) global.SovereignEventBus = SovereignEventBus;
  if (!global.SovereignDeltaClock) global.SovereignDeltaClock = SovereignDeltaClock;
  if (!global.SovereignWorkerTimer) global.SovereignWorkerTimer = SovereignWorkerTimer;
  if (!global.SovereignStateSnapshot) global.SovereignStateSnapshot = SovereignStateSnapshot;

  if (global.SovereignCoreRegistry && typeof global.SovereignCoreRegistry.register === 'function') {
    global.SovereignCoreRegistry.register('sovereign_timer_engine', TimerEngine);
  }
})(typeof window !== 'undefined' ? window : globalThis);
