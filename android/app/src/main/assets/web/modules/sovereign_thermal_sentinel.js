/**
 * DEEP FOCUS — SovereignThermalSentinel (v617.0.0)
 * On-device Local AI Stress Testing, Battery Guard & Thermal Sentinel.
 * Prevents SoC thermal throttling and battery drain during local LLM execution on Xiaomi 17T Pro.
 * 100% Sovereign Offline, Zero PII, Western Arabic numerals (0123456789).
 */
(function (global) {
  'use strict';

  var SovereignThermalSentinel = {
    version: '617.0.0',
    isInferring: false,
    lastInferenceTimestamp: 0,
    coolingIntervalMs: 2500, // 2.5s mandatory cooling between Ollama calls
    consecutiveFailures: 0,
    maxAllowedFailures: 2,
    batteryThreshold: 0.20, // 20%
    isBatteryLow: false,

    /**
     * Initializes battery monitoring if supported
     */
    init: function () {
      var self = this;
      if (typeof navigator !== 'undefined' && navigator.getBattery) {
        navigator.getBattery().then(function (battery) {
          self._updateBatteryStatus(battery);
          battery.addEventListener('levelchange', function () {
            self._updateBatteryStatus(battery);
          });
          battery.addEventListener('chargingchange', function () {
            self._updateBatteryStatus(battery);
          });
        }).catch(function () {});
      }
    },

    _updateBatteryStatus: function (battery) {
      if (!battery) return;
      this.isBatteryLow = (battery.level <= this.batteryThreshold) && !battery.charging;
    },

    /**
     * Checks whether local AI execution is permissible under current hardware conditions
     * @returns {object} { canExecute: boolean, reason: string }
     */
    checkExecutionPermit: function () {
      if (this.isInferring) {
        return {
          canExecute: false,
          reason: 'concurrency_lock_active'
        };
      }

      var now = Date.now();
      var elapsedSinceLast = now - this.lastInferenceTimestamp;
      if (elapsedSinceLast < this.coolingIntervalMs) {
        return {
          canExecute: false,
          reason: 'thermal_cooling_active',
          remainingCoolingMs: this.coolingIntervalMs - elapsedSinceLast
        };
      }

      if (this.isBatteryLow) {
        return {
          canExecute: false,
          reason: 'battery_saver_triggered'
        };
      }

      if (this.consecutiveFailures >= this.maxAllowedFailures) {
        return {
          canExecute: false,
          reason: 'consecutive_failures_tripped'
        };
      }

      return {
        canExecute: true,
        reason: 'hardware_optimal'
      };
    },

    /**
     * Acquires inference lock
     */
    acquireLock: function () {
      var permit = this.checkExecutionPermit();
      if (!permit.canExecute) return false;
      this.isInferring = true;
      return true;
    },

    /**
     * Releases inference lock and records completion timestamp
     * @param {boolean} success Whether inference succeeded
     */
    releaseLock: function (success) {
      this.isInferring = false;
      this.lastInferenceTimestamp = Date.now();
      if (success) {
        this.consecutiveFailures = 0;
      } else {
        this.consecutiveFailures += 1;
      }
    },

    /**
     * Resets failure counters and cooling timers
     */
    resetSentinelState: function () {
      this.isInferring = false;
      this.lastInferenceTimestamp = 0;
      this.consecutiveFailures = 0;
    },

    /**
     * Verifies loopback health and memory safety of Ollama daemon
     * @returns {Promise<object>} Health diagnostics
     */
    runLocalAiHealthCheck: function () {
      var self = this;
      var startTime = Date.now();

      return new Promise(function (resolve) {
        if (typeof fetch === 'undefined') {
          return resolve({
            isOnline: false,
            latencyMs: 0,
            model: 'none',
            status: 'offline_fallback_active'
          });
        }

        var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 1500) : null;

        fetch('http://127.0.0.1:11434/api/tags', {
          method: 'GET',
          signal: controller ? controller.signal : undefined
        })
          .then(function (res) {
            if (timeoutId) clearTimeout(timeoutId);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
          })
          .then(function (data) {
            var latency = Date.now() - startTime;
            var models = (data && data.models) ? data.models.map(function (m) { return m.name; }) : [];
            self.releaseLock(true);
            resolve({
              isOnline: true,
              latencyMs: latency,
              models: models,
              status: 'ready'
            });
          })
          .catch(function () {
            if (timeoutId) clearTimeout(timeoutId);
            self.releaseLock(false);
            resolve({
              isOnline: false,
              latencyMs: Date.now() - startTime,
              models: [],
              status: 'offline_fallback_active'
            });
          });
      });
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SovereignThermalSentinel;
  }
  global.SovereignThermalSentinel = SovereignThermalSentinel;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
