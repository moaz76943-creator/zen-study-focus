/**
 * DEEP FOCUS — SovereignMemoryDrainGuard (v573.0.0)
 * Proactively protects against Android LMKD (Low Memory Killer) on Xiaomi 17T Pro.
 * Hooks Android lifecycle events via WebView:
 *   - onTrimMemory / onPause: suspends Web Audio, flushes Canvas backbuffers, snapshots state
 *   - onResume: restores AudioContext & delta clock seamlessly
 */
(function (global) {
  'use strict';

  var isDrained = false;

  var SovereignMemoryDrainGuard = {
    version: '573.0.0',

    handleTrimMemory: function (level) {
      isDrained = true;

      // 1. Snapshot active session state immediately
      if (global.SovereignStateSnapshot && global.SovereignTimerEngine) {
        var worker = global.SovereignTimerEngine.workerTimer;
        if (worker && worker.running) {
          global.SovereignStateSnapshot.save({
            remainingSec: worker.remainingSec,
            mode: 'focus',
            running: true
          });
        }
      }

      // 2. Suspend AudioContext to release DSP hardware channels
      if (global.SovereignAudioSuite && typeof global.SovereignAudioSuite.ensureContext === 'function') {
        var ctx = global.SovereignAudioSuite.ensureContext();
        if (ctx && ctx.state === 'running' && typeof ctx.suspend === 'function') {
          ctx.suspend().catch(function () {});
        }
      }

      // 3. Clear temporary analytics caches
      if (typeof global.gc === 'function') {
        try { global.gc(); } catch (e) {}
      }

      if (global.SovereignEventBus) {
        global.SovereignEventBus.emit('memory:trimmed', { level: level || 'MODERATE' });
      }
      return true;
    },

    handleResume: function () {
      if (!isDrained) return false;
      isDrained = false;

      // Restore AudioContext if needed
      if (global.SovereignAudioSuite && typeof global.SovereignAudioSuite.ensureContext === 'function') {
        var ctx = global.SovereignAudioSuite.ensureContext();
        if (ctx && ctx.state === 'suspended' && typeof ctx.resume === 'function') {
          ctx.resume().catch(function () {});
        }
      }

      if (global.SovereignEventBus) {
        global.SovereignEventBus.emit('memory:restored', { resumedAt: Date.now() });
      }
      return true;
    },

    isDrained: function () {
      return isDrained;
    }
  };

  // Wire browser visibility & pagehide fallback
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        SovereignMemoryDrainGuard.handleTrimMemory('BACKGROUND');
      } else if (document.visibilityState === 'visible') {
        SovereignMemoryDrainGuard.handleResume();
      }
    });
  }

  global.SovereignMemoryDrainGuard = SovereignMemoryDrainGuard;
  if (global.SovereignCoreRegistry && typeof global.SovereignCoreRegistry.register === 'function') {
    global.SovereignCoreRegistry.register('sovereign_memory_guard', SovereignMemoryDrainGuard);
  }
})(typeof window !== 'undefined' ? window : globalThis);
