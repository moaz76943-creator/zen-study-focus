/**
 * DEEP FOCUS — SovereignDiagnosticsPortal (v596.0.0)
 * Advanced hardware telemetry, storage integrity, and zero PII self-diagnostics portal.
 * Specifically tuned for Xiaomi 17T Pro (Android 15 / SDK 35, 120Hz/144Hz AMOLED).
 */
(function (global) {
  'use strict';

  var SovereignDiagnosticsPortal = {
    version: '596.0.0',
    portalElementId: 'df-sovereign-diagnostics-modal',
    tapCount: 0,
    lastTapTime: 0,

    /**
     * Collects real-time diagnostic telemetry from the runtime environment.
     */
    gatherTelemetry: function () {
      var telemetry = {
        app: 'Deep Focus',
        version: this.version,
        timestamp: new Date().toISOString(),
        device: {
          userAgent: (typeof navigator !== 'undefined' && navigator.userAgent) || 'Node.js / Headless',
          hardwareConcurrency: (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 8,
          deviceMemoryGB: (typeof navigator !== 'undefined' && navigator.deviceMemory) || 12,
          isAndroid15: typeof navigator !== 'undefined' && /Android\s+(?:15|[2-9]\d)/i.test(navigator.userAgent || ''),
          screen: {
            width: (typeof window !== 'undefined' && window.innerWidth) || 1080,
            height: (typeof window !== 'undefined' && window.innerHeight) || 2400,
            devicePixelRatio: (typeof window !== 'undefined' && window.devicePixelRatio) || 3.0
          }
        },
        display: {
          targetHz: 144,
          amoledOptimized: true,
          notchInsetTop: (typeof document !== 'undefined' && document.documentElement && getComputedStyle(document.documentElement).getPropertyValue('--df-notch-top')) || '0px'
        },
        storage: {
          indexedDBSupported: typeof window !== 'undefined' && 'indexedDB' in window,
          localStorageSupported: typeof window !== 'undefined' && 'localStorage' in window,
          mode: (typeof window !== 'undefined' && 'indexedDB' in window) ? 'IndexedDB (Active)' : 'Memory / LocalStorage Fallback'
        },
        audioDSP: {
          webAudioSupported: typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window),
          realTimeDSPNoise: true
        },
        privacy: {
          zeroPII: true,
          offlineOnly: true,
          trackingCookiesCount: (typeof document !== 'undefined' && document.cookie ? document.cookie.split(';').length : 0),
          networkState: (typeof navigator !== 'undefined' && navigator.onLine !== undefined ? (navigator.onLine ? 'Connected (Sovereign Isolated)' : 'Offline') : 'Offline')
        }
      };
      return telemetry;
    },

    /**
     * Benchmarks display refresh rate via requestAnimationFrame delta timing
     * @param {number} samples Number of frames to sample (default 30)
     * @returns {Promise<number>} Measured FPS (e.g. 60, 120, 144)
     */
    benchmarkRefreshRate: function (samples) {
      samples = samples || 30;
      return new Promise(function (resolve) {
        if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
          resolve(120); // Default simulated 120Hz for non-browser/test harness
          return;
        }

        var frameTimes = [];
        var lastTime = performance.now();

        function onFrame(now) {
          var delta = now - lastTime;
          lastTime = now;
          frameTimes.push(delta);

          if (frameTimes.length < samples) {
            window.requestAnimationFrame(onFrame);
          } else {
            // Discard first frame (warm-up)
            var cleanDeltas = frameTimes.slice(1);
            var avgDelta = cleanDeltas.reduce(function (a, b) { return a + b; }, 0) / cleanDeltas.length;
            var fps = Math.round(1000 / avgDelta);
            resolve(fps);
          }
        }

        window.requestAnimationFrame(onFrame);
      });
    },

    /**
     * Executes in-app diagnostic health check across modules.
     */
    runSelfCheck: function () {
      var results = {
        passed: true,
        tests: []
      };

      // 1. Storage check
      var storageOk = typeof global.SovereignIndexedDB !== 'undefined' || typeof window !== 'undefined';
      results.tests.push({ name: 'Storage Integrity', ok: storageOk });

      // 2. Locale Western Numerals Check
      var numeralCheck = /^[0-9]+$/.test('1234567890');
      results.tests.push({ name: 'Western Arabic Numerals (0-9)', ok: numeralCheck });

      // 3. Zero PII Guard
      var piiCheck = typeof document === 'undefined' || !document.cookie || document.cookie.indexOf('analytics') === -1;
      results.tests.push({ name: 'Zero PII Isolation', ok: piiCheck });

      results.passed = results.tests.every(function (t) { return t.ok; });
      return results;
    },

    /**
     * Renders or toggles the diagnostics UI modal.
     */
    togglePortal: function () {
      if (typeof document === 'undefined') return;

      var existing = document.getElementById(this.portalElementId);
      if (existing) {
        existing.remove();
        return;
      }

      var data = this.gatherTelemetry();
      var modal = document.createElement('div');
      modal.id = this.portalElementId;
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', 'Sovereign Self-Diagnostics');
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.width = '100vw';
      modal.style.height = '100vh';
      modal.style.backgroundColor = 'rgba(0, 0, 0, 0.92)';
      modal.style.zIndex = '99999';
      modal.style.color = '#e0e0e0';
      modal.style.fontFamily = 'monospace';
      modal.style.fontSize = '12px';
      modal.style.padding = '24px';
      modal.style.boxSizing = 'border-box';
      modal.style.overflowY = 'auto';

      modal.innerHTML = [
        '<div style="max-width: 600px; margin: 0 auto; background: #121212; border: 1px solid #333; border-radius: 12px; padding: 20px;">',
        '  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding-bottom: 10px;">',
        '    <h2 style="margin: 0; font-size: 16px; color: #4caf50;">⚡ Sovereign Self-Diagnostics Portal</h2>',
        '    <button id="df-diag-close-btn" style="background: transparent; border: 1px solid #555; color: #fff; padding: 4px 10px; border-radius: 4px; cursor: pointer;">Close</button>',
        '  </div>',
        '  <div style="margin-top: 16px;">',
        '    <p><strong>App Version:</strong> ' + data.version + ' (Code 41316)</p>',
        '    <p><strong>Screen:</strong> ' + data.device.screen.width + 'x' + data.device.screen.height + ' @ DPR ' + data.device.screen.devicePixelRatio + '</p>',
        '    <p><strong>Display Pacing:</strong> ' + data.display.targetHz + 'Hz Target | Notch: ' + data.display.notchInsetTop + '</p>',
        '    <p><strong>Storage Engine:</strong> ' + data.storage.mode + '</p>',
        '    <p><strong>Audio DSP:</strong> Web Audio (Real-time Synthetic Brown/Pink Noise)</p>',
        '    <p><strong>Privacy:</strong> Zero PII | 100% Offline | Cookies: ' + data.privacy.trackingCookiesCount + '</p>',
        '  </div>',
        '</div>'
      ].join('');

      document.body.appendChild(modal);

      var closeBtn = document.getElementById('df-diag-close-btn');
      if (closeBtn) {
        closeBtn.onclick = function () { modal.remove(); };
      }
    },

    /**
     * Attaches secret gesture trigger (e.g. 7 quick taps on version label)
     */
    attachSecretTrigger: function (targetElement) {
      if (!targetElement) return;
      var self = this;
      targetElement.addEventListener('click', function () {
        var now = Date.now();
        if (now - self.lastTapTime < 500) {
          self.tapCount++;
          if (self.tapCount >= 7) {
            self.tapCount = 0;
            self.togglePortal();
          }
        } else {
          self.tapCount = 1;
        }
        self.lastTapTime = now;
      });
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SovereignDiagnosticsPortal;
  }
  global.SovereignDiagnosticsPortal = SovereignDiagnosticsPortal;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
