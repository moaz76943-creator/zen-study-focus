/**
 * DEEP FOCUS — Microscopic UI/UX Polisher & State Harmonizer
 * Module: modules/ui/microscopic_ui_polisher.js
 * Version: v480.0.0
 * Purpose: Rectify all 4 microscopic audit points (Jitter-free timer, glowing presets, smooth drawer, auto-focus modal).
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.MicroscopicUIPolisher = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const MicroscopicUIPolisher = {
        isPolished: false,

        init: function () {
            if (typeof document === "undefined" || this.isPolished) return;
            this.injectStabilizationStyles();
            this.enhanceModalAutoFocus();
            this.isPolished = true;
            console.log("[MicroPolisher] All 4 microscopic section flaws rectified.");
        },

        injectStabilizationStyles: function () {
            if (document.getElementById("zenMicroStabilizationStyles")) return;

            const style = document.createElement("style");
            style.id = "zenMicroStabilizationStyles";
            style.textContent = `
                /* 1. Prevent Timer Number Horizontal Jitter */
                #timerDisplay, .timer-time {
                    font-variant-numeric: tabular-nums lining-nums !important;
                    letter-spacing: -0.02em !important;
                    display: inline-block !important;
                    text-align: center !important;
                    min-width: 220px !important;
                }
                /* 2. Active Preset Highlighting & Glow */
                .active-preset {
                    border-color: #3b82f6 !important;
                    background: rgba(59, 130, 246, 0.12) !important;
                    box-shadow: 0 0 16px rgba(59, 130, 246, 0.4) !important;
                    transform: scale(1.02) !important;
                    transition: all 0.15s ease !important;
                }
                /* 3. Frictionless 120 FPS Drawer Scrolling */
                #zenStudioDrawerSheet {
                    -webkit-overflow-scrolling: touch !important;
                    overscroll-behavior-y: contain !important;
                    scroll-behavior: smooth !important;
                }
                /* 4. Touch Ripple Effect */
                .studio-card:active {
                    background: #1c1c1c !important;
                    transform: scale(0.98) !important;
                }
            `;
            document.head.appendChild(style);
        },

        enhanceModalAutoFocus: function () {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === "attributes" && mutation.attributeName === "style") {
                        const target = mutation.target;
                        if (target.id === "zenGoalsModal" && target.style.display !== "none") {
                            const input = document.getElementById("zenGoalInput");
                            if (input) {
                                setTimeout(() => { input.focus(); input.select(); }, 100);
                            }
                        }
                    }
                });
            });

            const modal = document.getElementById("zenGoalsModal");
            if (modal) {
                observer.observe(modal, { attributes: true });
            }
        }
    };

    return MicroscopicUIPolisher;
}));
