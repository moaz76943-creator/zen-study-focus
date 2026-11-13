/**
 * DEEP FOCUS — Zero-Telemetry Local Study Scheduler & Daily Cadence Alarms
 * Module: modules/core/local_study_scheduler.js
 * Version: v493.0.0
 * Architecture: Sovereign Local Notification Dispatch + Recurring Cadence Slots
 * Compliance: 100% Offline-First, Zero PII, Strict Western Digits (0-9).
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.LocalStudyScheduler = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const STORAGE_KEY_CADENCE = "zen_study_cadence_schedule_v1";

    const LocalStudyScheduler = {
        isInitialized: false,
        activeSchedules: [],

        init: function () {
            if (typeof window === "undefined" || this.isInitialized) return;
            this.loadSchedules();
            this.startLocalClockMonitor();
            this.isInitialized = true;
            console.log("[StudyScheduler] Active with sovereign local cadence alarms.");
        },

        loadSchedules: function () {
            try {
                const raw = localStorage.getItem(STORAGE_KEY_CADENCE);
                if (raw) {
                    this.activeSchedules = JSON.parse(raw);
                } else {
                    // Default baseline routines (08:00 and 19:00)
                    this.activeSchedules = [
                        { id: "cadence_morning", time: "08:00", label: "جلسة تركيز صباحية", enabled: true },
                        { id: "cadence_evening", time: "19:00", label: "جلسة استذكار مسائية", enabled: true }
                    ];
                    this.saveSchedules();
                }
            } catch (e) {
                this.activeSchedules = [];
            }
        },

        saveSchedules: function () {
            try {
                localStorage.setItem(STORAGE_KEY_CADENCE, JSON.stringify(this.activeSchedules));
            } catch (e) {}
        },

        requestLocalNotificationPermission: function () {
            if (typeof Notification !== "undefined" && Notification.permission === "default") {
                Notification.requestPermission().then(perm => {
                    console.log("[StudyScheduler] Local notification permission:", perm);
                });
            }
        },

        dispatchCadenceReminder: function (scheduleItem) {
            console.log("[StudyScheduler] Triggering local cadence reminder for:", scheduleItem.label);

            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                try {
                    new Notification("🎯 موعد التركيز اليومي", {
                        body: scheduleItem.label + " (" + scheduleItem.time + ") — حان وقت المذاكرة العميقة.",
                        icon: "icon.png",
                        silent: false
                    });
                } catch (e) {}
            }

            if (typeof navigator !== "undefined" && navigator.vibrate) {
                try { ((navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) ? navigator.vibrate([100, 50, 100, 50, 200]) : false); } catch (e) {}
            }
        },

        startLocalClockMonitor: function () {
            let lastTriggeredMinute = "";

            setInterval(() => {
                const now = new Date();
                const hours = String(now.getHours()).padStart(2, "0");
                const mins = String(now.getMinutes()).padStart(2, "0");
                const currentTime = hours + ":" + mins;

                if (currentTime !== lastTriggeredMinute) {
                    this.activeSchedules.forEach(item => {
                        if (item.enabled && item.time === currentTime) {
                            this.dispatchCadenceReminder(item);
                            lastTriggeredMinute = currentTime;
                        }
                    });
                }
            }, 10000); // Check clock every 10 seconds
        }
    };

    return LocalStudyScheduler;
}));
