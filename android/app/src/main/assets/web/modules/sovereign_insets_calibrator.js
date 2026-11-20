/**
 * DEEP FOCUS — SovereignInsetsCalibrator (v610.0.0)
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
    version: '610.0.0',
    currentInsets: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      paddingBottom: 0
    },

    _hasRealInsets: false,
    _viewportWidth: 0,

    /**
     * Initializes the calibrator and listener hooks. The native parent padding owns the
     * insets before Android's callback fires, so no CSS fallback inset is needed;
     * the pre-insets CSS is already valid with the 0px-pinned variables.
     */
    init: function () {
      if (!this._hasRealInsets) {
        // Use a conservative fallback bottom (120dp) matching the Xiaomi 3-button nav floor
        // in MainActivity (absoluteMinNavDp = 160) so the initial reserve covers tall nav bars
        // before real insets arrive. Real gesture nav (~32dp) will quickly correct to a smaller capsule.
        this.applyCSSVariables({
          top: 24,
          bottom: 120,
          left: 0,
          right: 0,
          paddingBottom: 120
        });
      }
      if (typeof window !== 'undefined') {
        this._viewportWidth = window.innerWidth || document.documentElement.clientWidth || 360;
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
     * Computes the effective capsule height based on actual nav bar insets and viewport width.
     * On narrow screens (<430px), the CSS adds extra padding-block-start to the capsule,
     * so we must account for that in our dock calculations.
     * @param {Object} insets Current insets
     * @returns {number} Capsule height in px (CSS px == DP in WebView)
     */
    _computeCapsuleHeight: function (insets) {
      // Base capsule height from actual reported nav bar height (raw, no defensive floors)
      // insets.bottom = rawNavBottomDp from MainActivity (actual reported nav bar height)
      // insets.paddingBottom = floored navBottom (includes Xiaomi 160dp floor) or IME height
      var rawNavBottom = insets.bottom;      // Actual reported nav bar height (0 on gesture, ~32 on Xiaomi 3-button misreport, ~96-150 on 3-button)
      var flooredNavBottom = insets.paddingBottom; // Floored value (160dp on Xiaomi 3-button, 32dp on gesture, or IME)

      // Determine effective nav bar height for capsule sizing
      // Prefer flooredNavBottom when it represents the 3-button nav bar floor
      // (floored > raw indicates a defensive floor was applied; floored <= 500 excludes IME).
      // This handles Xiaomi misreporting where mandatorySystemGestures reports a handle
      // height (e.g., 32-100dp) but the actual 3-button nav bar is 160dp.
      var effectiveNavHeight;
      if (flooredNavBottom > rawNavBottom && flooredNavBottom <= 500) {
        // 3-button nav with defensive floor applied (Xiaomi 160dp floor), or severe under-reporting (raw=0)
        effectiveNavHeight = flooredNavBottom;
      } else if (rawNavBottom > 0) {
        // Gesture nav (raw ~ floored ~ 32), honest 3-button (raw == floored),
        // or IME open (floored > 500, raw is the nav bar height).
        effectiveNavHeight = rawNavBottom;
      } else {
        effectiveNavHeight = 100;
      }

      // Apply minimum floors based on navigation type heuristic
      // > 50dp = likely 3-button nav (Material spec 56dp, Xiaomi HyperOS up to ~160dp)
      // <= 50dp = likely gesture nav (handle ~32dp)
      var minCapsuleHeight = effectiveNavHeight > 50 ? 100 : 32;
      var capsuleHeight = Math.max(effectiveNavHeight, minCapsuleHeight);

      // Cap at reasonable maximum for Xiaomi HyperOS 3-button (160dp floor + some margin)
      if (capsuleHeight > 180) capsuleHeight = 180;

      // Account for narrow-screen extra padding in CSS (media query max-width: 430px)
      // CSS adds padding-block-start: clamp(40px, 2.5rem, 80px) to .bottom-nav-capsule
      // Base capsule content height ~56px (44px button + 12px padding)
      // With extra padding: 96px to 136px total
      if (this._viewportWidth > 0 && this._viewportWidth < 430) {
        var extraPadding = Math.min(80, Math.max(40, this._viewportWidth * 0.0625)); // clamp(40px, 2.5rem, 80px) approx
        var narrowCapsuleHeight = 56 + extraPadding; // ~96-136px
        // Use the larger of nav-bar-based height and narrow-screen layout height
        capsuleHeight = Math.max(capsuleHeight, narrowCapsuleHeight);
      }

      return capsuleHeight;
    },

    /**
     * Injects CSS variables onto documentElement with !important to override conflicting rules.
     * Design (Android 15 / Xiaomi edge-to-edge): MainActivity pads the WebView's PARENT
     * FrameLayout with the FLOORED system-bar insets (including defensive floors for Xiaomi
     * HyperOS 3-button nav up to 160dp), so the WebView's layout viewport
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
     * Capsule height is DYNAMIC based on actual nav bar insets and viewport width — the system
     * nav bar height is already handled by native parent padding. The capsule is an app-level
     * nav bar that sits just above the viewport bottom (12px dock gap) on both gesture and
     * 3-button navigation. Dock positions derive from this dynamic capsule height.
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

      // Dynamic capsule height based on actual nav bar insets and viewport width
      var capsuleHeight = this._computeCapsuleHeight(insets);
      root.style.setProperty('--df-capsule-height', capsuleHeight + 'px', 'important');

      // Studios pill position: docked above capsule
      // bottom = dock-gap(12) + capsuleHeight + gap(8) = capsuleHeight + 20
      var studiosPillBottom = capsuleHeight + 20;
      root.style.setProperty('--df-studios-pill-bottom', studiosPillBottom + 'px', 'important');

      // FAB position: above Studios pill with 8px gap
      // bottom = studiosPillBottom + StudiosHeight(48) + gap(8) = capsuleHeight + 76
      var fabBottom = studiosPillBottom + 48 + 8;
      root.style.setProperty('--df-fab-bottom', fabBottom + 'px', 'important');

      // Legacy float-bottom for backward compat (points to Studios pill position)
      root.style.setProperty('--df-float-bottom', studiosPillBottom + 'px', 'important');

      // Dock bottom gap (capsule dock position from viewport bottom)
      root.style.setProperty('--df-dock-bottom', '12px', 'important');

      // Bottom nav clearance for in-flow content: must clear the highest floating layer
      // (FAB top = fabBottom + FABheight(54) = capsuleHeight + 130) + gap(12) = capsuleHeight + 142 minimum.
      // Also handle IME: insets.paddingBottom = max(flooredNavBottom, IME height).
      // When keyboard opens, content must clear the keyboard.
      // Xiaomi 3-button nav floor is 160dp; typical IME is 200-500dp.
      // If paddingBottom > 500dp, treat as nav bar floor (not IME) and use fixed minimum.
      // The clearance is additional body padding INSIDE the WebView viewport (which is
      // already reduced by native parent padding). It must always be at least
      // floatingLayerClearance to clear the FAB/Studios pill; never cap it by the
      // viewport height because the viewport is already short on tall-nav-bar devices.
      var floatingLayerClearance = fabBottom + 54 + 12; // capsuleHeight + 142
      var paddingBottom = insets.paddingBottom || insets.bottom || 120;
      var imeClearance = paddingBottom > 500 ? 300 : paddingBottom + 12;
      var bottomNavClearance = Math.max(floatingLayerClearance, imeClearance, 300);
      root.style.setProperty('--df-bottom-nav-clearance', bottomNavClearance + 'px', 'important');

      // Inflow bottom for body padding (resolves to bottom-nav-clearance since webview-padding-bottom is 0)
      root.style.setProperty('--df-inflow-bottom', bottomNavClearance + 'px', 'important');
    },

    onViewportChange: function () {
      // Re-apply insets on orientation change or keyboard toggle
      if (typeof window !== 'undefined') {
        this._viewportWidth = window.innerWidth || document.documentElement.clientWidth || this._viewportWidth;
      }
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