/**
 * DEEP FOCUS — Offline Adaptive Distraction Shield & Focus Lock Engine
 * Module: modules/core/distraction_shield_engine.js
 * Version: v487.0.0
 * Architecture: Page Visibility & Window Blur Delta Tracking + Instant Re-anchoring
 * Compliance: 100% Offline-First, Zero PII, Strict Western Digits (0-9).
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DistractionShieldEngine = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const STORAGE_KEY_DISTRACTIONS = "zen_distraction_stats_v1";

    const DistractionShieldEngine = {
        isShieldActive: false,
        blurTimestamp: 0,
        totalDistractionSeconds: 0,
        switchCount: 0,

        init: function () {
            if (typeof window === "undefined" || this.isShieldActive) return;
            this.bindDisciplineListeners();
            this.isShieldActive = true;
            console.log("[DistractionShield] Active with local re-anchoring protection.");
        },

        bindDisciplineListeners: function () {
            window.addEventListener("blur", () => {
                if (window.HighPrecisionTimerEngine && window.HighPrecisionTimerEngine.isRunning) {
                    this.blurTimestamp = Date.now();
                    this.switchCount++;
                }
            });

            window.addEventListener("focus", () => {
                if (this.blurTimestamp > 0 && window.HighPrecisionTimerEngine && window.HighPrecisionTimerEngine.isRunning) {
                    const awayDuration = Math.round((Date.now() - this.blurTimestamp) / 1000);
                    this.blurTimestamp = 0;
                    if (awayDuration >= 3) {
                        this.totalDistractionSeconds += awayDuration;
                        this.showReAnchorBanner(awayDuration);
                        this.recordDistractionEvent(awayDuration);
                    }
                }
            });
        },

        showReAnchorBanner: function (secondsAway) {
            if (typeof document === "undefined") return;

            const existing = document.getElementById("zenReAnchorBanner");
            if (existing) existing.remove();

            const banner = document.createElement("div");
            banner.id = "zenReAnchorBanner";
            banner.style.position = "fixed";
            banner.style.top = "18px";
            banner.style.left = "50%";
            banner.style.transform = "translateX(-50%)";
            banner.style.background = "rgba(15, 23, 42, 0.95)";
            banner.style.border = "1px solid #38bdf8";
            banner.style.borderRadius = "12px";
            banner.style.padding = "10px 18px";
            banner.style.color = "#ffffff";
            banner.style.zIndex = "99999";
            banner.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.75)";
            banner.style.display = "flex";
            banner.style.alignItems = "center";
            banner.style.gap = "10px";
            banner.style.fontSize = "0.9rem";

            banner.innerHTML = `
                <span>🛡️ حافظ على تدفقك الذهني (ابتعدت ${secondsAway} ثانية)</span>
                <button id="zenReAnchorClose" style="background: transparent; border: none; color: #94a3b8; font-size: 1.1rem; cursor: pointer;">✕</button>
            `;

            document.body.appendChild(banner);

            document.getElementById("zenReAnchorClose").onclick = () => banner.remove();
            setTimeout(() => { if (banner && banner.parentNode) banner.remove(); }, 6000);

            if (typeof navigator !== "undefined" && navigator.vibrate) try { ((navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) ? navigator.vibrate(30) : false); } catch (e) {}
        },

        recordDistractionEvent: function (duration) {
            try {
                let stats = { totalAwaySecs: 0, events: 0 };
                const raw = localStorage.getItem(STORAGE_KEY_DISTRACTIONS);
                if (raw) {
                    try { stats = JSON.parse(raw); } catch (err) {}
                }
                stats.totalAwaySecs = (stats.totalAwaySecs || 0) + duration;
                stats.events = (stats.events || 0) + 1;
                stats.lastUpdated = Date.now();
                localStorage.setItem(STORAGE_KEY_DISTRACTIONS, JSON.stringify(stats));
            } catch (e) {}
        }
    };

    return DistractionShieldEngine;
}));
