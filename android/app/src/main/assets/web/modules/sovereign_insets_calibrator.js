/**
 * DEEP FOCUS — SovereignInsetsCalibrator (v604.0.0)
 * Android 15 Edge-to-Edge & Gesture Navigation Insets Calibration Engine.
 * Dynamically updates CSS root variables for status bar, gesture navigation pill,
 * and camera cutouts on Xiaomi 17T Pro (AMOLED 120Hz/144Hz).
 */
(function (global) {
  'use strict';

  var SovereignInsetsCalibrator = {
    version: '604.0.0',
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
      // Apply safe fallbacks immediately before Android insets arrive
      this.applyCSSVariables({
        top: 24,
        bottom: 32,
        left: 0,
        right: 0
      });
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', this.onViewportChange.bind(this));
      }
      return true;
    },

    /**
     * Updates insets received from Android WindowInsetsCompat listener via JavascriptInterface.
     * @param {number} top Top inset in px (status bar / punch hole)
     * @param {number} bottom Bottom inset in px (gesture navigation pill / 3-button nav)
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
     * Injects CSS variables onto documentElement with !important to override conflicting rules.
     */
    applyCSSVariables: function (insets) {
      if (typeof document === 'undefined' || !document.documentElement) return;

      var root = document.documentElement;
      // Use setProperty with 'important' flag (via CSSStyleDeclaration.setProperty third arg)
      // Note: setProperty priority param not widely supported; use direct style.setProperty with !important in value
      root.style.setProperty('--df-safe-top', insets.top + 'px', 'important');
      root.style.setProperty('--df-safe-bottom', insets.bottom + 'px', 'important');
      root.style.setProperty('--df-safe-left', insets.left + 'px', 'important');
      root.style.setProperty('--df-safe-right', insets.right + 'px', 'important');
      // Enforce 48dp bottom clearance for floating action buttons (Studios pill, FAB)
      root.style.setProperty('--df-bottom-nav-clearance', (insets.bottom + 48) + 'px', 'important');
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

  // Auto-initialize on DOM ready so CSS variables are ready before first paint
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        SovereignInsetsCalibrator.init();
      }, { once: true });
    } else {
      SovereignInsetsCalibrator.init();
    }
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
