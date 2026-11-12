/**
 * DEEP FOCUS — SovereignDistractionShield (v615.0.0)
 * On-device study mode containment shield & notification dampener.
 * Intercepts window blurs, tab switches, and notification interruptions.
 * 100% Sovereign Offline, Zero PII, Western Arabic numerals (0123456789).
 */
(function (global) {
  'use strict';

  var SovereignDistractionShield = {
    version: '615.0.0',
    isActive: false,
    breachLog: [],
    shieldLevel: 'strict', // 'gentle' | 'balanced' | 'strict'
    focusStartTime: null,

    /**
     * Activates the distraction shield for a study session
     * @param {string} level 'gentle', 'balanced', or 'strict'
     */
    activate: function (level) {
      this.shieldLevel = level || 'strict';
      this.isActive = true;
      this.breachLog = [];
      this.focusStartTime = Date.now();
      this._bindVisibilityListeners();
      return true;
    },

    /**
     * Deactivates the shield and summarizes focus integrity
     * @returns {object} Session integrity summary
     */
    deactivate: function () {
      this.isActive = false;
      this._unbindVisibilityListeners();
      return this.computeIntegrityReport();
    },

    /**
     * Logs an unforced focus disruption (tab switch, window blur, app backgrounded)
     * @param {string} reason Reason for disruption (e.g. 'window_blur', 'visibility_hidden')
     */
    recordBreach: function (reason) {
      if (!this.isActive) return;
      var timestamp = Date.now();
      var durationOffset = this.focusStartTime ? Math.round((timestamp - this.focusStartTime) / 1000) : 0;

      this.breachLog.push({
        timestamp: timestamp,
        offsetSeconds: durationOffset,
        reason: reason || 'unspecified_blur'
      });
    },

    /**
     * Computes focus integrity metrics and distraction penalty score
     * @returns {object} Integrity metrics
     */
    computeIntegrityReport: function () {
      var totalBreaches = this.breachLog.length;
      var sessionSeconds = this.focusStartTime ? Math.max(1, Math.round((Date.now() - this.focusStartTime) / 1000)) : 1;
      var sessionMinutes = Math.max(1, Math.round(sessionSeconds / 60));

      // Integrity score: 100 base, deductions for frequent disruptions
      var breachPenalty = Math.min(60, totalBreaches * 8);
      var integrityScore = Math.max(40, 100 - breachPenalty);

      // Focus Stability Index (0.00 to 1.00)
      var breachesPerHour = (totalBreaches / sessionMinutes) * 60;
      var stabilityIndex = Math.max(0.1, parseFloat((1.0 - Math.min(0.9, breachesPerHour / 20)).toFixed(2)));

      return {
        sessionMinutes: sessionMinutes,
        totalBreaches: totalBreaches,
        integrityScore: integrityScore,
        stabilityIndex: stabilityIndex,
        shieldLevel: this.shieldLevel,
        isFlawless: totalBreaches === 0
      };
    },

    /**
     * Internal listener binding
     */
    _bindVisibilityListeners: function () {
      var self = this;
      if (typeof window === 'undefined' || typeof document === 'undefined') return;

      this._blurHandler = function () {
        self.recordBreach('window_blur');
      };

      this._visibilityHandler = function () {
        if (document.hidden) {
          self.recordBreach('visibility_hidden');
        }
      };

      window.addEventListener('blur', this._blurHandler);
      document.addEventListener('visibilitychange', this._visibilityHandler);
    },

    /**
     * Internal listener unbinding
     */
    _unbindVisibilityListeners: function () {
      if (typeof window === 'undefined' || typeof document === 'undefined') return;
      if (this._blurHandler) {
        window.removeEventListener('blur', this._blurHandler);
      }
      if (this._visibilityHandler) {
        document.removeEventListener('visibilitychange', this._visibilityHandler);
      }
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SovereignDistractionShield;
  }
  global.SovereignDistractionShield = SovereignDistractionShield;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
