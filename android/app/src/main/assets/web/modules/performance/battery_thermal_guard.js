/**
 * DEEP FOCUS — Battery Thermal Guard & Adaptive Energy Throttling
 * Module: modules/performance/battery_thermal_guard.js
 * Version: v489.0.0
 * Architecture: Adaptive Frame Pacing + Low Power State Detection
 * Compliance: 100% Offline-First, Zero PII, Strict Western Digits (0-9).
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.BatteryThermalGuard = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const BatteryThermalGuard = {
        isEcoMode: false,
        batteryLevel: 1.0,
        isCharging: true,

        init: function () {
            if (typeof window === "undefined") return;
            this.bindBatteryListeners();
            console.log("[BatteryGuard] Active with adaptive energy throttling.");
        },

        bindBatteryListeners: function () {
            if (typeof navigator !== "undefined" && navigator.getBattery) {
                navigator.getBattery().then(battery => {
                    this.updateBatteryStatus(battery);
                    battery.addEventListener("levelchange", () => this.updateBatteryStatus(battery));
                    battery.addEventListener("chargingchange", () => this.updateBatteryStatus(battery));
                }).catch(() => {
                    console.log("[BatteryGuard] Battery API fallback to standard pacing.");
                });
            }
        },

        updateBatteryStatus: function (battery) {
            this.batteryLevel = battery.level;
            this.isCharging = battery.charging;

            // Trigger eco mode if battery < 20% and not charging
            if (this.batteryLevel <= 0.20 && !this.isCharging) {
                this.enableEcoMode();
            } else {
                this.disableEcoMode();
            }
        },

        enableEcoMode: function () {
            if (this.isEcoMode) return;
            this.isEcoMode = true;
            document.documentElement.classList.add("eco-power-saving");
            console.log("[BatteryGuard] Eco power saving mode enabled (Pacing dialed to optimal conservation).");
        },

        disableEcoMode: function () {
            if (!this.isEcoMode) return;
            this.isEcoMode = false;
            document.documentElement.classList.remove("eco-power-saving");
            console.log("[BatteryGuard] Standard high-performance 120Hz mode restored.");
        },

        getOptimalFrameInterval: function () {
            return this.isEcoMode ? 33.3 : 8.33; // 30 FPS in eco mode, 120 FPS in standard
        }
    };

    return BatteryThermalGuard;
}));
