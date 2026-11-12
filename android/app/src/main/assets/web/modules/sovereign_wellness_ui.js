/**
 * DEEP FOCUS — Sovereign Modular Wellness & Calm UI Suite (v562.0.0)
 * Pure Calm Technology & Progressive Disclosure for Xiaomi 17T Pro AMOLED.
 * Encapsulates:
 *   - SovereignBreathing (Box 4-4-4-4, Relax 4-7-8, Coherence 5.5s-5.5s)
 *   - SovereignEyeComfort (AMOLED Twilight low-blue-light persistence)
 *   - SovereignCalmUI (Collapsible Progressive-Disclosure Drawer + BackStack)
 */
(function (global) {
  'use strict';

  var TWILIGHT_KEY = 'deepfocus_twilight_enabled_v1';

  // 1. Breathing Studio Engine (Zero-stub deterministic phase calculator)
  var PATTERNS = {
    box: [
      { phase: 'inhale', sec: 4 },
      { phase: 'hold', sec: 4 },
      { phase: 'exhale', sec: 4 },
      { phase: 'rest', sec: 4 }
    ],
    relax: [
      { phase: 'inhale', sec: 4 },
      { phase: 'hold', sec: 7 },
      { phase: 'exhale', sec: 8 }
    ],
    coherence: [
      { phase: 'inhale', sec: 5.5 },
      { phase: 'exhale', sec: 5.5 }
    ]
  };

  var SovereignBreathing = {
    activePattern: 'box',
    running: false,
    _rafId: null,
    _startMs: 0,

    getPatterns: function () {
      return Object.keys(PATTERNS);
    },

    evaluateAt: function (patternKey, elapsedSec) {
      var seq = PATTERNS[patternKey] || PATTERNS.box;
      var total = 0;
      for (var i = 0; i < seq.length; i++) total += seq[i].sec;
      var t = ((Number(elapsedSec) || 0) % total + total) % total;
      var acc = 0;
      for (var j = 0; j < seq.length; j++) {
        var step = seq[j];
        if (t < acc + step.sec) {
          var progress = (t - acc) / step.sec;
          return {
            pattern: patternKey in PATTERNS ? patternKey : 'box',
            phase: step.phase,
            remainingSec: Math.ceil(step.sec - (t - acc)),
            progress: Math.max(0, Math.min(1, progress))
          };
        }
        acc += step.sec;
      }
      return { pattern: 'box', phase: 'inhale', remainingSec: 4, progress: 0 };
    },

    start: function (patternKey, onFrame) {
      this.stop();
      this.activePattern = (patternKey in PATTERNS) ? patternKey : 'box';
      this.running = true;
      this._startMs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

      var self = this;
      function loop() {
        if (!self.running) return;
        var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        var state = self.evaluateAt(self.activePattern, (now - self._startMs) / 1000);
        if (typeof onFrame === 'function') onFrame(state);
        if (global.SovereignEventBus) {
          global.SovereignEventBus.emit('breathing:phase', state);
        }
        if (typeof global.requestAnimationFrame === 'function') {
          self._rafId = global.requestAnimationFrame(loop);
        }
      }
      if (typeof global.requestAnimationFrame === 'function') {
        this._rafId = global.requestAnimationFrame(loop);
      }
      return true;
    },

    stop: function () {
      this.running = false;
      if (this._rafId && typeof global.cancelAnimationFrame === 'function') {
        global.cancelAnimationFrame(this._rafId);
      }
      this._rafId = null;
      return true;
    }
  };

  // 2. Eye Comfort & AMOLED Twilight Filter
  var SovereignEyeComfort = {
    enabled: false,
    init: function () {
      if (typeof localStorage !== 'undefined') {
        try {
          this.enabled = localStorage.getItem(TWILIGHT_KEY) === 'true';
        } catch (e) {}
      }
      this.apply();
    },
    toggle: function (forceState) {
      this.enabled = typeof forceState === 'boolean' ? forceState : !this.enabled;
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(TWILIGHT_KEY, this.enabled ? 'true' : 'false');
        } catch (e) {}
      }
      this.apply();
      return this.enabled;
    },
    apply: function () {
      if (typeof document === 'undefined' || !document.documentElement) return;
      document.documentElement.setAttribute('data-twilight', this.enabled ? 'on' : 'off');
    }
  };

  // 3. Calm UI Progressive-Disclosure Drawer
  var SovereignCalmUI = {
    drawerOpen: false,
    toggleDrawer: function (forceState) {
      this.drawerOpen = typeof forceState === 'boolean' ? forceState : !this.drawerOpen;
      if (typeof document !== 'undefined') {
        var el = document.getElementById('sovereignCalmToolsDrawer');
        if (el) el.setAttribute('data-open', this.drawerOpen ? 'true' : 'false');
      }
      if (global.SovereignEventBus) {
        global.SovereignEventBus.emit('calm:drawer', { open: this.drawerOpen });
      }
      return this.drawerOpen;
    },
    closeDrawer: function () {
      return this.toggleDrawer(false);
    }
  };

  SovereignEyeComfort.init();

  var WellnessUI = {
    version: '562.0.0',
    breathing: SovereignBreathing,
    eyeComfort: SovereignEyeComfort,
    calmUI: SovereignCalmUI
  };

  global.SovereignWellnessUI = WellnessUI;
  if (!global.SovereignBreathing) global.SovereignBreathing = SovereignBreathing;
  if (!global.SovereignEyeComfort) global.SovereignEyeComfort = SovereignEyeComfort;
  if (!global.SovereignCalmUI) global.SovereignCalmUI = SovereignCalmUI;

  if (global.SovereignCoreRegistry && typeof global.SovereignCoreRegistry.register === 'function') {
    global.SovereignCoreRegistry.register('sovereign_wellness_ui', WellnessUI);
  }
})(typeof window !== 'undefined' ? window : globalThis);
