/**
 * DEEP FOCUS — SovereignInsetsCalibrator (v607.0.0)
 * Android 15 Edge-to-Edge & Gesture Navigation Insets Calibration Engine.
 * Dynamically updates CSS root variables for status bar, gesture navigation pill,
 * and camera cutouts on Xiaomi 17T Pro (AMOLED 120Hz/144Hz).
 * Insets arrive as DP (CSS px) from MainActivity; MainActivity applies the physical-px
 * padding to the WebView itself, so this engine only feeds CSS with density-independent
 * values. Floating layers dock against the WebView content area, which already ends
 * above the system nav bar — clearance is therefore a fixed reserve, not nav-inset + gap.
 */
(function (global) {
  'use strict';

  var SovereignInsetsCalibrator = {
    version: '607.0.0',
    currentInsets: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      paddingBottom: 0
    },

    _hasRealInsets: false,

    /**
     * Initializes default safe-area fallback values and listener hooks.
     * Fallbacks are DP (CSS px): status bar ~24dp, 3-button nav bar ~56dp.
     * This ensures 3-button nav never overlaps on first paint before Android callback fires.
     * Only apply fallbacks if we haven't already received real insets from Android.
     */
    init: function () {
      // Apply safe fallbacks immediately before Android insets arrive
      if (!this._hasRealInsets) {
        this.applyCSSVariables({
          top: 24,
          bottom: 56,
          left: 0,
          right: 0,
          paddingBottom: 56
        });
      }
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', this.onViewportChange.bind(this));
      }
      return true;
    },

    /**
     * Updates insets received from Android WindowInsetsCompat listener via JavascriptInterface.
     * @param {number} top Top inset in DP (status bar / punch hole)
     * @param {number} bottom Bottom inset in DP (gesture navigation pill / 3-button nav bar height)
     * @param {number} left Left cutout in DP
     * @param {number} right Right cutout in DP
     * @param {number} paddingBottom WebView padding-bottom in DP (max of navBottom and IME)
     */
    updateInsets: function (top, bottom, left, right, paddingBottom) {
      this.currentInsets.top = Math.max(0, parseInt(top, 10) || 0);
      this.currentInsets.bottom = Math.max(0, parseInt(bottom, 10) || 0);
      this.currentInsets.left = Math.max(0, parseInt(left, 10) || 0);
      this.currentInsets.right = Math.max(0, parseInt(right, 10) || 0);
      this.currentInsets.paddingBottom = Math.max(0, parseInt(paddingBottom, 10) || this.currentInsets.bottom);

      // Mark that we've received real insets from Android; prevents init() from overwriting with fallbacks.
      this._hasRealInsets = true;

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
     * --df-safe-top: status bar / cutout top inset (dp)
     * --df-safe-bottom: navigation bar / gesture handle bottom inset (dp)
     * --df-webview-padding-bottom: WebView padding-bottom in DP (max of navBottom and IME)
     * --df-bottom-nav-clearance: fixed reserve (dp) that clears the docked bottom capsule plus
     *   FAB / Studios pill for in-flow content. The WebView itself is padded above the
     *   system nav bar in MainActivity, so this must NOT include the nav inset again.
     */
    applyCSSVariables: function (insets) {
      if (typeof document === 'undefined' || !document.documentElement) return;

      var root = document.documentElement;
      var navInset = insets.bottom; // nav/gesture height in dp (from Android via MainActivity)
      var paddingBottom = insets.paddingBottom; // WebView padding-bottom in dp

      root.style.setProperty('--df-safe-top', insets.top + 'px', 'important');
      root.style.setProperty('--df-safe-bottom', navInset + 'px', 'important');
      root.style.setProperty('--df-safe-left', insets.left + 'px', 'important');
      root.style.setProperty('--df-safe-right', insets.right + 'px', 'important');
      root.style.setProperty('--df-webview-padding-bottom', paddingBottom + 'px', 'important');
      // Fixed dock reserve: 12px dock gap + ~62px capsule + 12px card clearance = 86px.
      // Kept constant so floating layers never cover each other or the last card.
      root.style.setProperty('--df-bottom-nav-clearance', '86px', 'important');
      // Capsule height estimate for positioning floating elements above it.
      root.style.setProperty('--df-capsule-height', '70px', 'important');
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
