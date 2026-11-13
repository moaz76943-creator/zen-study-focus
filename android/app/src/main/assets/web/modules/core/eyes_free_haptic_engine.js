/**
 * DEEP FOCUS — Eyes-Free Tactile Haptic Cadence Engine
 * Module: modules/core/eyes_free_haptic_engine.js
 * Version: v490.0.0
 * Architecture: Low-Power Distinctive Milestone Vibration Patterns
 * Compliance: 100% Offline-First, Zero PII, Strict Western Digits (0-9).
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.EyesFreeHapticEngine = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const PATTERNS = {
        CLICK: [20],
        HALFWAY: [40, 60, 40],
        FIVE_MINUTES: [30, 40, 30, 40, 30],
        COMPLETE: [80, 50, 120, 50, 200]
    };

    let halfwayTriggered = false;
    let fiveMinTriggered = false;

    const EyesFreeHapticEngine = {
        isSupported: false,

        init: function () {
            if (typeof window === "undefined") return;
            this.isSupported = typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
            console.log("[EyesFreeHaptic] Initialized. Hardware support:", this.isSupported);
        },

        resetSessionMilestones: function () {
            halfwayTriggered = false;
            fiveMinTriggered = false;
        },

        pulse: function (pattern) {
            if (this.isSupported) {
                try {
                    ((navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) ? navigator.vibrate(pattern) : false);
                } catch (e) {}
            }
        },

        triggerClick: function () {
            this.pulse(PATTERNS.CLICK);
        },

        checkMilestones: function (remainingSeconds, totalSeconds) {
            if (!totalSeconds || totalSeconds <= 0) return;

            // Halfway milestone
            const halfTime = Math.floor(totalSeconds / 2);
            if (!halfwayTriggered && remainingSeconds <= halfTime && remainingSeconds > (halfTime - 3)) {
                this.pulse(PATTERNS.HALFWAY);
                halfwayTriggered = true;
                console.log("[EyesFreeHaptic] Halfway milestone tactile cue dispatched.");
            }

            // 5-minute warning
            if (!fiveMinTriggered && remainingSeconds <= 300 && remainingSeconds > 297 && totalSeconds > 360) {
                this.pulse(PATTERNS.FIVE_MINUTES);
                fiveMinTriggered = true;
                console.log("[EyesFreeHaptic] 5-minute warning tactile cue dispatched.");
            }

            // Complete milestone
            if (remainingSeconds <= 0) {
                this.pulse(PATTERNS.COMPLETE);
                this.resetSessionMilestones();
            }
        }
    };

    return EyesFreeHapticEngine;
}));
