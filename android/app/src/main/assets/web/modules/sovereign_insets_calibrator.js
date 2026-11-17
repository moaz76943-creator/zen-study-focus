/**
 * DEEP FOCUS — SovereignInsetsCalibrator (v607.0.0)
 * Android 15 Edge-to-Edge & Gesture Navigation Insets Calibration Engine.
 * Dynamically updates CSS root variables for status bar, gesture navigation pill,
 * and camera cutouts on Xiaomi 17T Pro (AMOLED 120Hz/144Hz).
 * Insets arrive as DP (CSS px) from MainActivity. MainActivity pads the WebView's
 * parent FrameLayout with the physical-px insets, so the WebView layout viewport
 * already ends above the system nav bar: this engine pins the safe-area CSS
 * variables to 0px (single owner = native padding) and only publishes the fixed
 * dock reserves the floating layers need above the reduced viewport.
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
     * Initializes the calibrator and listener hooks. The native parent padding owns the
     * insets before Android's callback fires, so no CSS fallback inset is needed;
     * the pre-insets CSS is already valid with the 0px-pinned variables.
     */
    init: function () {
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
     * Design (Android 15 / Xiaomi edge-to-edge): MainActivity pads the WebView's PARENT
     * FrameLayout with the real system-bar insets, so the WebView's layout viewport
     * already ends above the status bar, cutout and 3-button nav bar. Native padding
     * is the single owner of the insets — if CSS re-added them (via --df-safe-top /
     * --df-safe-bottom / --df-webview-padding-bottom) every dock offset and body
     * reserve would double-count, pushing the Studios pill over content and leaving
     * a thick empty band above the nav bar. These variables are therefore pinned to 0px;
     * raw device values remain available to JS via getInsets().
     * --df-bottom-nav-clearance: fixed reserve (dp) that clears the docked bottom capsule
     * plus FAB / Studios pill for in-flow content, measured from the safe content edge.
     */
    applyCSSVariables: function (insets) {
      if (typeof document === 'undefined' || !document.documentElement) return;

      var root = document.documentElement;

      // 0px: the native parent padding already keeps content clear of every bar.
      root.style.setProperty('--df-safe-top', '0px', 'important');
      root.style.setProperty('--df-safe-bottom', '0px', 'important');
      root.style.setProperty('--df-safe-left', '0px', 'important');
      root.style.setProperty('--df-safe-right', '0px', 'important');
      root.style.setProperty('--df-webview-padding-bottom', '0px', 'important');
      // Fixed dock reserve: dock gap (12px) + capsule height (80px) + gap to FAB/Studios (8px)
      // + max(FAB height 54px, Studios pill height 48px) = 154px. Increased to 160px for
      // Xiaomi 3-button nav bar height variance and font scaling safety margin.
      // This ensures in-flow content (last card) ends above the floating layers.
      root.style.setProperty('--df-bottom-nav-clearance', '160px', 'important');
      // Capsule height estimate for positioning floating elements above it.
      // Increased to 80px to accommodate 7-tab capsule with labels on tall screens.
      root.style.setProperty('--df-capsule-height', '80px', 'important');
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
