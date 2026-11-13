/**
 * DEEP FOCUS — High Precision Delta Timer Engine
 * Module: modules/core/high_precision_timer_engine.js
 * Version: v470.0.0
 * Architecture: Date.now() Timestamp Delta + Page Visibility API Sync
 * Guarantees 0% drift even if the phone screen is locked or app is backgrounded.
 * STATUS: standalone helper. The app's authoritative timer lives in app.js (absolute deadline).
 * Nothing in the app calls start() on this engine, so it is NOT a second accounting system;
 * do not use it to record sessions or minutes.
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.HighPrecisionTimerEngine = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const HighPrecisionTimerEngine = {
        isRunning: false,
        durationSeconds: 25 * 60,
        remainingSeconds: 25 * 60,
        startTime: null,
        targetEndTime: null,
        timerInterval: null,

        init: function () {
            if (typeof document === "undefined") return;
            this.bindVisibilityHandler();
            console.log("[PrecisionTimer] Initialized with Delta Timestamp Tracking.");
        },

        start: function (duration) {
            if (duration) {
                this.durationSeconds = duration;
                this.remainingSeconds = duration;
            }
            this.startTime = Date.now();
            this.targetEndTime = this.startTime + (this.remainingSeconds * 1000);
            this.isRunning = true;

            clearInterval(this.timerInterval);
            this.timerInterval = setInterval(() => {
                this.tick();
            }, 500);

            this.updateDisplay();
        },

        pause: function () {
            if (!this.isRunning) return;
            this.recalculateRemaining();
            this.isRunning = false;
            clearInterval(this.timerInterval);
            this.updateDisplay();
        },

        recalculateRemaining: function () {
            if (!this.isRunning || !this.targetEndTime) return;
            const now = Date.now();
            const diff = Math.max(0, Math.round((this.targetEndTime - now) / 1000));
            this.remainingSeconds = diff;
        },

        tick: function () {
            this.recalculateRemaining();
            this.updateDisplay();

            if (this.remainingSeconds <= 0) {
                this.onComplete();
            }
        },

        onComplete: function () {
            this.isRunning = false;
            clearInterval(this.timerInterval);
            this.remainingSeconds = 0;
            this.updateDisplay();
            console.log("[PrecisionTimer] Session completed with absolute time precision!");
            if (typeof navigator !== "undefined" && navigator.vibrate) {
                try { ((navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) ? navigator.vibrate([100, 50, 100, 50, 200]) : false); } catch (e) {}
            }
        },

        updateDisplay: function () {
            if (typeof document === "undefined") return;
            const timerEl = document.getElementById("timerDisplay") || document.querySelector(".timer-time");
            if (timerEl) {
                const mins = Math.floor(this.remainingSeconds / 60);
                const secs = this.remainingSeconds % 60;
                timerEl.textContent = String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
            }
        },

        bindVisibilityHandler: function () {
            if (typeof document === "undefined" || !document.addEventListener) return;
            document.addEventListener("visibilitychange", () => {
                if (document.visibilityState === "visible" && this.isRunning) {
                    // Resumed from background or screen-off: immediate delta catch-up
                    this.tick();
                    console.log("[PrecisionTimer] Synced state on visibility wake-up.");
                }
            });
        }
    };

    return HighPrecisionTimerEngine;
}));
