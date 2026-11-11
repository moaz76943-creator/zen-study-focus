/**
 * DEEP FOCUS — High-DPI Canvas Scaler & Subpixel Sharpness Engine
 * Module: modules/ui/high_dpi_canvas_scaler.js
 * Version: v482.0.0
 * Purpose: Scale all HTML5 Canvas elements to match devicePixelRatio, eliminating blurriness on mobile OLED panels.
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.HighDpiCanvasScaler = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const HighDpiCanvasScaler = {
        isScaled: false,

        init: function () {
            if (typeof window === "undefined" || typeof document === "undefined") return;
            this.scaleAllCanvases();
            window.addEventListener("resize", () => this.scaleAllCanvases(), { passive: true });
            this.isScaled = true;
            console.log("[CanvasScaler] Subpixel scaling active across all display densities.");
        },

        scaleCanvas: function (canvas) {
            if (!canvas) return;
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            const width = rect.width || canvas.clientWidth || 300;
            const height = rect.height || canvas.clientHeight || 300;

            if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
                canvas.width = Math.round(width * dpr);
                canvas.height = Math.round(height * dpr);
                canvas.style.width = width + "px";
                canvas.style.height = height + "px";

                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.scale(dpr, dpr);
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = "high";
                }
            }
        },

        scaleAllCanvases: function () {
            const canvases = document.querySelectorAll("canvas");
            canvases.forEach(c => this.scaleCanvas(c));
        }
    };

    return HighDpiCanvasScaler;
}));
