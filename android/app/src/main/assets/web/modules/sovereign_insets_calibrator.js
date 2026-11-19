/**
 * DEEP FOCUS — SovereignInsetsCalibrator (v608.0.0)
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
    version: '608.0.0',
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
        // Use a conservative fallback bottom (500dp) matching the Xiaomi 3-button nav floor
        // so the initial reserve covers tall nav bars before real insets arrive.
        // Real gesture nav (~32dp) will quickly correct to a smaller capsule.
        this.applyCSSVariables({
          top: 24,
          bottom: 500,
          left: 0,
          right: 0,
          paddingBottom: 500
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
     * @param {number} bottom Bottom inset in DP (ACTUAL reported nav bar height: 3-button bar or gesture handle, NO defensive floors)
     * @param {number} left Left cutout in DP
     * @param {number} right Right cutout in DP
     * @param {number} paddingBottom WebView padding-bottom in DP (max of floored navBottom and IME)
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
         * FrameLayout with the FLOORED system-bar insets (including defensive floors for Xiaomi
         * HyperOS 3-button nav up to 700dp), so the WebView's layout viewport
         * already ends above the status bar, cutout and 3-button nav bar. Native padding
         * is the single owner of the insets — if CSS re-added them (via --df-safe-top /
         * --df-safe-bottom / --df-webview-padding-bottom) every dock offset and body
         * reserve would double-count, pushing the Studios pill over content and leaving
         * a thick empty band above the nav bar. These variables are therefore pinned to 0px;
         * raw device values remain available to JS via getInsets().
         * --df-bottom-nav-clearance: fixed reserve (dp) that clears the docked bottom capsule
         * plus FAB / Studios pill for in-flow content, measured from the safe content edge.
         * --df-studios-pill-bottom: explicit position for the Studios pill above the capsule.
         * --df-fab-bottom: explicit position for the FAB above the Studios pill.
         * Capsule height is a FIXED design constant (100px) — the system nav bar height is
         * already handled by native parent padding. The capsule is an app-level nav bar
         * that sits just above the viewport bottom (12px dock gap) on both gesture and
         * 3-button navigation. Dock positions derive from this fixed capsule height.
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

          // Fixed capsule height (design constant). The system nav bar height is already
          // accounted for by native parent FrameLayout padding; the capsule is an app-level
          // bottom nav that docks at the viewport bottom with a 12px gap.
          var capsuleHeight = 100;
          root.style.setProperty('--df-capsule-height', capsuleHeight + 'px', 'important');

          // Studios pill position: docked above capsule
          // bottom = dock-gap(12) + capsuleHeight(100) + gap(8) = 120px
          var studiosPillBottom = 12 + capsuleHeight + 8;
          root.style.setProperty('--df-studios-pill-bottom', studiosPillBottom + 'px', 'important');

          // FAB position: above Studios pill with 8px gap
          // bottom = studiosPillBottom(120) + StudiosHeight(48) + gap(8) = 176px
          var fabBottom = studiosPillBottom + 48 + 8;
          root.style.setProperty('--df-fab-bottom', fabBottom + 'px', 'important');

          // Legacy float-bottom for backward compat (points to Studios pill position)
          root.style.setProperty('--df-float-bottom', studiosPillBottom + 'px', 'important');

          // Bottom nav clearance for in-flow content: must clear the highest floating layer
          // (FAB top = fabBottom + FABheight(54) = 230px) + gap(12) = 242px minimum.
          // Also handle IME: insets.paddingBottom = max(flooredNavBottom, IME height).
          // When keyboard opens, content must clear the keyboard.
          // Xiaomi 3-button nav floor is 700dp; typical IME is 200-500dp.
          // If paddingBottom > 500dp, treat as nav bar floor (not IME) and use fixed minimum.
          // CAP the clearance to viewport height minus minimum content area (100px) so the
          // body padding never exceeds the available viewport on devices with tall nav bars.
          var floatingLayerClearance = fabBottom + 54 + 12; // 242px
          var paddingBottom = insets.paddingBottom || insets.bottom || 500;
          var imeClearance = paddingBottom > 500 ? 300 : paddingBottom + 12;
          var viewportHeight = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight : 800;
          var maxClearance = Math.max(100, viewportHeight - 100);
          var bottomNavClearance = Math.min(Math.max(floatingLayerClearance, imeClearance, 300), maxClearance);
          root.style.setProperty('--df-bottom-nav-clearance', bottomNavClearance + 'px', 'important');
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