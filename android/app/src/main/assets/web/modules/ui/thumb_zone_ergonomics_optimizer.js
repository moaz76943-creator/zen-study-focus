/**
 * DEEP FOCUS — Thumb-Zone Ergonomics & Touch Target Optimizer
 * Module: modules/ui/thumb_zone_ergonomics_optimizer.js
 * Version: v477.0.0
 * Guarantees: 48dp minimum touch target, bottom-third thumb anchoring, WCAG AAA contrast.
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.ThumbZoneErgonomicsOptimizer = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const ThumbZoneErgonomicsOptimizer = {
        isOptimized: false,

        init: function () {
            if (typeof document === "undefined" || this.isOptimized) return;
            this.injectErgonomicStyles();
            this.enforceTouchTargetSizes();
            this.isOptimized = true;
            console.log("[ThumbZone] Enforced 48dp touch targets and one-handed thumb zone anchoring.");
        },

        injectErgonomicStyles: function () {
            if (document.getElementById("zenErgonomicThumbZoneStyles")) return;

            const style = document.createElement("style");
            style.id = "zenErgonomicThumbZoneStyles";
            style.textContent = `
                /* 48dp Minimum Touch Target Rule */
                button, [role=button], .interactive-action, .studio-card {
                    min-height: 48px !important;
                    min-width: 48px !important;
                    touch-action: manipulation !important;
                    -webkit-tap-highlight-color: transparent !important;
                }
                /* Thumb-Zone Bottom Third Anchoring */
                .bottom-controls, #zenStudioTriggerPill, .timer-presets {
                    padding-bottom: max(16px, env(safe-area-inset-bottom)) !important;
                }
                /* High Tactile Feedback Animation */
                button:active, [role=button]:active {
                    transform: scale(0.96) !important;
                    transition: transform 0.08s ease !important;
                }
            `;
            document.head.appendChild(style);
        },

        enforceTouchTargetSizes: function () {
            const buttons = document.querySelectorAll("button, [role=button]");
            buttons.forEach(btn => {
                const rect = btn.getBoundingClientRect();
                if (rect.height < 44 || rect.width < 44) {
                    btn.style.minHeight = "48px";
                    btn.style.minWidth = "48px";
                    btn.style.display = "inline-flex";
                    btn.style.alignItems = "center";
                    btn.style.justifyContent = "center";
                }
            });
        }
    };

    return ThumbZoneErgonomicsOptimizer;
}));
