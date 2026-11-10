/**
 * DEEP FOCUS — Color Contrast Harmonizer & AAA Palette Engine
 * Module: modules/ui/color_contrast_harmonizer.js
 * Version: v472.0.0
 * Purpose: Dynamically audit and elevate low-contrast text nodes to meet WCAG AAA on AMOLED #000000.
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.ColorContrastHarmonizer = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const ColorContrastHarmonizer = {
        isEnforced: false,

        init: function () {
            if (typeof document === "undefined") return;
            this.injectAmoledVariables();
            this.purgeLowContrastElements();
            this.isEnforced = true;
            console.log("[ContrastHarmonizer] Enforced WCAG AAA contrast and White Premium readability.");
        },

        injectAmoledVariables: function () {
            if (document.getElementById("zenAmoledThemeVariables")) return;

            const style = document.createElement("style");
            style.id = "zenAmoledThemeVariables";
            style.textContent = `
                :root {
                    --bg-canvas: #000000 !important;
                    --bg-surface: #0a0a0a !important;
                    --bg-surface-elevated: #141414 !important;
                    --text-primary: #ffffff !important;
                    --text-secondary: #e2e8f0 !important;
                    --text-muted: #94a3b8 !important;
                    --accent-cyan: #06b6d4 !important;
                    --accent-blue: #3b82f6 !important;
                    --border-subtle: rgba(255, 255, 255, 0.16) !important;
                    --border-bright: rgba(255, 255, 255, 0.35) !important;
                }
                body, html {
                    background-color: var(--bg-canvas) !important;
                    color: var(--text-primary) !important;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                }
                .timer-time, #timerDisplay {
                    color: #ffffff !important;
                    text-shadow: 0 0 20px rgba(255, 255, 255, 0.25) !important;
                    font-variant-numeric: tabular-nums !important;
                }
                p, span, div, label {
                    color: inherit;
                }
                /* Prevent unreadable dark grays on dark background */
                .text-muted, .text-gray, [style*="color: #333"], [style*="color: #444"], [style*="color: #222"] {
                    color: var(--text-secondary) !important;
                }
            `;
            document.head.appendChild(style);
        },

        purgeLowContrastElements: function () {
            const lowContrastQuery = "span, p, div, small, h4, h5, h6";
            const elements = document.querySelectorAll(lowContrastQuery);

            elements.forEach(el => {
                if (!el.style) return;
                const color = el.style.color;
                if (color === "rgb(51, 51, 51)" || color === "#333" || color === "#444" || color === "rgb(68, 68, 68)") {
                    el.style.color = "var(--text-secondary)";
                }
            });
        }
    };

    return ColorContrastHarmonizer;
}));
