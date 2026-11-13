/**
 * DEEP FOCUS — Session Crash Recovery & Heartbeat Restorer Engine
 * Module: modules/core/session_crash_recovery_engine.js
 * Version: v485.0.0
 * Architecture: Atomic 5-Second Local Heartbeat + Delta Catch-Up on Cold Boot
 * Guarantees: 0 lost focus minutes upon OS process kill or battery depletion.
 * STATUS: heartbeat helper. Nothing in the app calls startHeartbeat() today, so no recovery
 * claim is active; the authoritative timer/session state is app.js. Do not rely on the
 * "0 lost minutes" guarantee below until it is wired and device-tested.
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.SessionCrashRecoveryEngine = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const STORAGE_KEY_HEARTBEAT = "zen_session_heartbeat_v1";
    let heartbeatInterval = null;

    const SessionCrashRecoveryEngine = {
        isInitialized: false,

        init: function () {
            if (typeof window === "undefined" || this.isInitialized) return;
            this.checkForRecoverableSession();
            this.isInitialized = true;
            console.log("[CrashRecovery] Active and monitoring session durability.");
        },

        startHeartbeat: function (targetEndTime, presetMode, totalDuration) {
            this.stopHeartbeat();
            const updateBeat = () => {
                const payload = {
                    targetEndTime: targetEndTime,
                    presetMode: presetMode || "study",
                    totalDuration: totalDuration || 1500,
                    lastTick: Date.now()
                };
                try {
                    localStorage.setItem(STORAGE_KEY_HEARTBEAT, JSON.stringify(payload));
                } catch (e) {}
            };
            updateBeat();
            heartbeatInterval = setInterval(updateBeat, 5000);
        },

        stopHeartbeat: function () {
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
            }
            try {
                localStorage.removeItem(STORAGE_KEY_HEARTBEAT);
            } catch (e) {}
        },

        checkForRecoverableSession: function () {
            try {
                const raw = localStorage.getItem(STORAGE_KEY_HEARTBEAT);
                if (!raw) return;

                const data = JSON.parse(raw);
                const now = Date.now();
                const remaining = Math.round((data.targetEndTime - now) / 1000);

                if (remaining > 0 && (now - data.lastTick) > 10000) {
                    // Abrupt exit detected; display non-intrusive recovery toast
                    console.log("[CrashRecovery] Abrupt termination detected. Remaining:", remaining, "s");
                    this.showRecoveryNotification(remaining, data.presetMode);
                } else if (remaining <= 0) {
                    // Completed while terminated
                    this.stopHeartbeat();
                }
            } catch (e) {
                console.warn("[CrashRecovery] Check error:", e);
            }
        },

        showRecoveryNotification: function (remainingSeconds, presetMode) {
            if (typeof document === "undefined") return;

            const banner = document.createElement("div");
            banner.id = "zenRecoveryBanner";
            banner.style.position = "fixed";
            banner.style.top = "20px";
            banner.style.left = "50%";
            banner.style.transform = "translateX(-50%)";
            banner.style.background = "#18181b";
            banner.style.border = "1px solid #3b82f6";
            banner.style.borderRadius = "12px";
            banner.style.padding = "12px 20px";
            banner.style.color = "#ffffff";
            banner.style.zIndex = "99999";
            banner.style.boxShadow = "0 8px 24px rgba(0,0,0,0.8)";
            banner.style.display = "flex";
            banner.style.alignItems = "center";
            banner.style.gap = "12px";

            const mins = Math.floor(remainingSeconds / 60);
            banner.innerHTML = `
                <span>🛡️ تم استرجاع جلستك السابقة (${mins} دقيقة متبقية)</span>
                <button id="zenResumeBtn" style="background: #3b82f6; border: none; border-radius: 6px; padding: 6px 12px; color: #fff; font-weight: bold; cursor: pointer;">استئناف</button>
                <button id="zenDismissBtn" style="background: transparent; border: none; color: #888; cursor: pointer;">✕</button>
            `;

            document.body.appendChild(banner);

            document.getElementById("zenResumeBtn").onclick = () => {
                if (window.HighPrecisionTimerEngine) {
                    window.HighPrecisionTimerEngine.start(remainingSeconds);
                }
                banner.remove();
            };

            document.getElementById("zenDismissBtn").onclick = () => {
                this.stopHeartbeat();
                banner.remove();
            };
        }
    };

    return SessionCrashRecoveryEngine;
}));
