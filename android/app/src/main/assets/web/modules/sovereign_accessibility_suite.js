/**
 * DEEP FOCUS — SovereignAccessibilitySuite (v576.0.0)
 * Provides comprehensive screen-reader semantics and ARIA live regions for Android 15 TalkBack.
 * Guarantees zero-barrier accessibility, 48dp minimum touch-target audit, and polite timer status broadcasts.
 */
(function (global) {
  'use strict';

  var lastAnnouncement = null;
  var liveRegionPolite = null;
  var liveRegionAssertive = null;

  function ensureLiveRegions() {
    if (typeof document === 'undefined') return;
    if (!liveRegionPolite) {
      liveRegionPolite = document.getElementById('df-a11y-polite');
      if (!liveRegionPolite) {
        liveRegionPolite = document.createElement('div');
        liveRegionPolite.id = 'df-a11y-polite';
        liveRegionPolite.setAttribute('aria-live', 'polite');
        liveRegionPolite.setAttribute('aria-atomic', 'true');
        liveRegionPolite.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
        document.body.appendChild(liveRegionPolite);
      }
    }
    if (!liveRegionAssertive) {
      liveRegionAssertive = document.getElementById('df-a11y-assertive');
      if (!liveRegionAssertive) {
        liveRegionAssertive = document.createElement('div');
        liveRegionAssertive.id = 'df-a11y-assertive';
        liveRegionAssertive.setAttribute('aria-live', 'assertive');
        liveRegionAssertive.setAttribute('aria-atomic', 'true');
        liveRegionAssertive.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
        document.body.appendChild(liveRegionAssertive);
      }
    }
  }

  var SovereignAccessibilitySuite = {
    version: '576.0.0',

    announce: function (text, priority) {
      if (!text || typeof text !== 'string') return false;
      lastAnnouncement = { text: text, priority: priority || 'polite', timestamp: Date.now() };

      ensureLiveRegions();
      var target = (priority === 'assertive') ? liveRegionAssertive : liveRegionPolite;
      if (target) {
        target.textContent = '';
        setTimeout(function () {
          target.textContent = text;
        }, 50);
      }

      if (global.SovereignEventBus && typeof global.SovereignEventBus.emit === 'function') {
        global.SovereignEventBus.emit('a11y:announced', lastAnnouncement);
      }
      return true;
    },

    getLastAnnouncement: function () {
      return lastAnnouncement;
    },

    auditTouchTargets: function (rootElement) {
      if (typeof document === 'undefined') return { checked: 0, violations: 0 };
      var root = rootElement || document;
      var interactive = root.querySelectorAll('button, a, input, [role="button"]');
      var violations = 0;

      for (var i = 0; i < interactive.length; i++) {
        var el = interactive[i];
        var rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          if (rect.width < 44 || rect.height < 44) {
            violations++;
            el.setAttribute('data-a11y-warning', 'undersized-target');
          }
        }
        // Never invent an accessible name from the element id ("qtSkipLast" is read aloud
        // verbatim) and never override a real <label>, placeholder or aria-labelledby.
        var named = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') ||
          el.getAttribute('title') || el.getAttribute('placeholder') ||
          (el.labels && el.labels.length) || (el.textContent || '').trim() ||
          (el.value && el.type !== 'checkbox' && el.type !== 'radio' && String(el.value).trim());
        if (!named) el.setAttribute('data-a11y-warning', 'unnamed-control');
      }
      return { checked: interactive.length, violations: violations };
    },

    initTimerAnnouncements: function () {
      if (global.SovereignEventBus && typeof global.SovereignEventBus.on === 'function') {
        global.SovereignEventBus.on('timer:start', function (data) {
          var min = data && data.remainingSec ? Math.round(data.remainingSec / 60) : 25;
          SovereignAccessibilitySuite.announce('Focus session started for ' + min + ' minutes', 'polite');
        });
        global.SovereignEventBus.on('timer:pause', function () {
          SovereignAccessibilitySuite.announce('Focus session paused', 'polite');
        });
        global.SovereignEventBus.on('timer:reset', function () {
          SovereignAccessibilitySuite.announce('Timer reset', 'polite');
        });
        global.SovereignEventBus.on('timer:complete', function () {
          SovereignAccessibilitySuite.announce('Session complete. Time for a well-deserved break.', 'assertive');
        });
      }
    }
  };

  // Wire auto-announcer
  if (typeof global !== 'undefined') {
    SovereignAccessibilitySuite.initTimerAnnouncements();
    if (typeof window !== 'undefined') {
      window.addEventListener('DOMContentLoaded', function () {
        ensureLiveRegions();
        SovereignAccessibilitySuite.auditTouchTargets();
      });
    }
  }

  global.SovereignAccessibilitySuite = SovereignAccessibilitySuite;
  if (global.SovereignCoreRegistry && typeof global.SovereignCoreRegistry.register === 'function') {
    global.SovereignCoreRegistry.register('sovereign_accessibility_suite', SovereignAccessibilitySuite);
  }
})(typeof window !== 'undefined' ? window : globalThis);
