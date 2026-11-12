/**
 * DEEP FOCUS — SovereignInsetsCalibrator (v603.0.0)
 * Android 15 Edge-to-Edge & Gesture Navigation Insets Calibration Engine.
 * Dynamically updates CSS root variables for status bar, gesture navigation pill,
 * and camera cutouts on Xiaomi 17T Pro (AMOLED 120Hz/144Hz).
 */
(function (global) {
  'use strict';

  var SovereignInsetsCalibrator = {
    version: '603.0.0',
    currentInsets: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0
    },

    /**
     * Initializes default safe-area fallback values and listener hooks.
     */
    init: function () {
      this.applyCSSVariables(this.currentInsets);
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', this.onViewportChange.bind(this));
      }
      return true;
    },

    /**
     * Updates insets received from Android WindowInsetsCompat listener via JavascriptInterface.
     * @param {number} top Top inset in px (status bar / punch hole)
     * @param {number} bottom Bottom inset in px (gesture navigation pill)
     * @param {number} left Left cutout in px
     * @param {number} right Right cutout in px
     */
    updateInsets: function (top, bottom, left, right) {
      this.currentInsets.top = Math.max(0, parseInt(top, 10) || 0);
      this.currentInsets.bottom = Math.max(0, parseInt(bottom, 10) || 0);
      this.currentInsets.left = Math.max(0, parseInt(left, 10) || 0);
      this.currentInsets.right = Math.max(0, parseInt(right, 10) || 0);

      this.applyCSSVariables(this.currentInsets);

      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        try {
          var evt = new CustomEvent('df-insets-changed', { detail: this.currentInsets });
          window.dispatchEvent(evt);
        } catch (e) {
          // Fallback for older event engines
        }
      }
      return this.currentInsets;
    },

    /**
     * Injects CSS variables onto documentElement.
     */
    applyCSSVariables: function (insets) {
      if (typeof document === 'undefined' || !document.documentElement) return;

      var root = document.documentElement;
      root.style.setProperty('--df-safe-top', insets.top + 'px');
      root.style.setProperty('--df-safe-bottom', insets.bottom + 'px');
      root.style.setProperty('--df-safe-left', insets.left + 'px');
      root.style.setProperty('--df-safe-right', insets.right + 'px');
      // Enforce 48dp bottom clearance for floating action buttons
      root.style.setProperty('--df-bottom-nav-clearance', (insets.bottom + 48) + 'px');
    },

    onViewportChange: function () {
      // Re-apply insets on orientation change or keyboard toggle
      this.applyCSSVariables(this.currentInsets);
    },

    getInsets: function () {
      return Object.assign({}, this.currentInsets);
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SovereignInsetsCalibrator;
  }
  global.SovereignInsetsCalibrator = SovereignInsetsCalibrator;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
