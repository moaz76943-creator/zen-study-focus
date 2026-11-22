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
        // Use a conservative fallback bottom (260dp) matching the Xiaomi 3-button nav floor
        // in MainActivity (absoluteMinNavDp = 260) so the initial reserve covers tall nav bars
        // before real insets arrive. Real gesture nav (~32dp) will quickly correct to a smaller capsule.
        this.applyCSSVariables({
          top: 24,
          bottom: 260,
          left: 0,
          right: 0,
          paddingBottom: 260
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
     * Computes the app's bottom nav capsule height based on CSS design constants.
     * The capsule is an APP-LEVEL UI element (the 7-tab glass navigation bar).
     * Its height is determined by CSS, NOT by system nav bar insets.
     * System nav bar insets are handled by native parent padding in MainActivity.
     * On narrow screens (<430px), CSS adds extra padding-block-start to the capsule.
     * @param {Object} insets Current insets (used only for viewport width via this._viewportWidth)
     * @returns {number} Capsule height in px (CSS px == DP in WebView)
     */
    _computeCapsuleHeight: function (insets) {
      // Base capsule height from CSS design: ~56px (button area 44px + 12px vertical padding)
      // This is the height of .bottom-nav-capsule on wide screens (>= 430px)
      var baseCapsuleHeight = 56;

      // Account for narrow-screen extra padding in CSS (media query max-width: 430px)
      // CSS adds padding-block-start: clamp(40px, 2.5rem, 80px) to .bottom-nav-capsule
      // With extra padding: 96px to 136px total
      if (this._viewportWidth > 0 && this._viewportWidth < 430) {
        var extraPadding = Math.min(80, Math.max(40, this._viewportWidth * 0.0625)); // clamp(40px, 2.5rem, 80px) approx
        var narrowCapsuleHeight = baseCapsuleHeight + extraPadding; // ~96-136px
        return narrowCapsuleHeight;
      }

      // Wide screens: use base capsule height
      return baseCapsuleHeight;
    },

    /**
     * Computes the Studios pill bottom position (above capsule, no overlap).
     * Studios pill height = 48px. Capsule top = dockGap(12) + capsuleHeight.
     * Studios pill bottom = capsuleTop + pillHeight + gap(8) = capsuleHeight + 68.
     * @param {number} capsuleHeight Computed capsule height
     * @param {number} bottomNavClearance Computed clearance for in-flow content
     * @returns {number} Studios pill bottom position in px
     */
    _computeStudiosPillBottom: function (capsuleHeight, bottomNavClearance) {
      // Position Studios pill at the clearance boundary so content never scrolls under it.
      // Studios pill height = 48px, gap above content = 8px.
      // bottom = clearance - gap - pillHeight = clearance - 56.
      // Fallback to capsule-based formula if clearance not provided (backward compat).
      if (typeof bottomNavClearance === 'number' && bottomNavClearance > 0) {
        return bottomNavClearance - 56;
      }
      // Legacy fallback: dockGap(12) + capsuleHeight + studiosPillHeight(48) + gap(8) = capsuleHeight + 68
      return capsuleHeight + 68;
    },

    /**
     * Computes the FAB bottom position (above Studios pill, no overlap).
     * FAB height = 54px. Studios pill bottom = computed above.
     * FAB bottom = studiosPillBottom + FABHeight(54) + gap(8) = capsuleHeight + 130.
     * @param {number} capsuleHeight Computed capsule height
     * @param {number} studiosPillBottom Studios pill bottom position
     * @returns {number} FAB bottom position in px
     */
    _computeFabBottom: function (capsuleHeight, studiosPillBottom) {
      // studiosPillBottom + FABHeight(54) + gap(8) = studiosPillBottom + 62
      return studiosPillBottom + 62;
    },

    /**
     * Computes the bottom nav clearance for in-flow content.
     * Must clear the highest floating layer (FAB top) + gap.
     * FAB top = fabBottom + FABHeight(54) = capsuleHeight + 184.
     * Clearance = FAB top + gap(12) = capsuleHeight + 196.
     * @param {number} capsuleHeight Computed capsule height
     * @param {number} paddingBottom Floored padding bottom (nav or IME)
     * @returns {number} Bottom nav clearance in px
     */
    _computeBottomNavClearance: function (capsuleHeight, paddingBottom) {
      // FAB top = capsuleHeight + 184, +12 gap = capsuleHeight + 196
      var floatingLayerClearance = capsuleHeight + 196;
      // IME clearance: if paddingBottom > 500 (IME), use 300; else paddingBottom + 12
      var imeClearance = paddingBottom > 500 ? 300 : paddingBottom + 12;
      // Minimum 300px (capsule 56px + floating stack 196px + 12px gap = 264px, floored to 300px)
      // On Xiaomi 3-button nav (up to 260dp), clearance = 260 + 196 = 456px (covers full stack).
      return Math.max(floatingLayerClearance, imeClearance, 300);
    },

    /**
     * Injects CSS variables onto documentElement with !important to override conflicting rules.
     * Design (Android 15 / Xiaomi edge-to-edge): MainActivity pads the WebView's PARENT
     * FrameLayout with the FLOORED system-bar insets (including defensive floors for Xiaomi
     * HyperOS 3-button nav up to 260dp), so the WebView's layout viewport
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

      // Bottom nav clearance for in-flow content: must clear the highest floating layer
      // (FAB top = fabBottom + FABHeight(54)) + gap(12).
      // Also handle IME: insets.paddingBottom = max(flooredNavBottom, IME height).
      // When keyboard opens, content must clear the keyboard.
      // Xiaomi 3-button nav floor is 160dp; typical IME is 200-500dp.
      // If paddingBottom > 500dp, treat as nav bar floor (not IME) and use fixed minimum.
      // The clearance is additional body padding INSIDE the WebView viewport (which is
      // already reduced by native parent padding). It must always be at least
      // floatingLayerClearance to clear the FAB/Studios pill; never cap it by the
      // viewport height because the viewport is already short on tall-nav-bar devices.
      var paddingBottom = insets.paddingBottom || insets.bottom || 120;
      var bottomNavClearance = this._computeBottomNavClearance(capsuleHeight, paddingBottom);
      root.style.setProperty('--df-bottom-nav-clearance', bottomNavClearance + 'px', 'important');

      // Studios pill position: docked at the clearance boundary so content never overlaps.
      // bottom = clearance - gap(8) - pillHeight(48) = clearance - 56.
      var studiosPillBottom = this._computeStudiosPillBottom(capsuleHeight, bottomNavClearance);
      root.style.setProperty('--df-studios-pill-bottom', studiosPillBottom + 'px', 'important');

      // FAB position: above Studios pill with 8px gap.
      // bottom = studiosPillBottom + FABHeight(54) + gap(8) = studiosPillBottom + 62.
      var fabBottom = this._computeFabBottom(capsuleHeight, studiosPillBottom);
      root.style.setProperty('--df-fab-bottom', fabBottom + 'px', 'important');

      // Legacy float-bottom for backward compat (points to Studios pill position)
      root.style.setProperty('--df-float-bottom', studiosPillBottom + 'px', 'important');

      // Dock bottom gap (capsule dock position from viewport bottom)
      root.style.setProperty('--df-dock-bottom', '12px', 'important');

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