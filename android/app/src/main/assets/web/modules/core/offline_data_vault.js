/**
 * DEEP FOCUS — Offline Data Vault & Local Backup Engine
 * Module: modules/core/offline_data_vault.js
 * Version: v473.0.0
 * Architecture: Pure Client-Side Blob Export + Validated Import + Zero Network PII
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.OfflineDataVault = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const VAULT_KEYS = [
        "zen_active_preset_v2",
        "zen_daily_goals_v2",
        "zen_focus_history_v1",
        "zen_study_contracts_v1",
        "zen_personal_bests_v1",
        "zen_sanctuary_state_v1",
        "zen_study_wrapped_v1"
    ];

    const OfflineDataVault = {
        init: function () {
            console.log("[OfflineDataVault] Initialized with sovereign client-side backup.");
        },

        exportBackupJSON: function () {
            if (typeof window === "undefined" || !window.localStorage) return;

            const dump = {
                app: "DEEP_FOCUS",
                schemaVersion: "v473",
                timestamp: Date.now(),
                exportedAt: new Date().toISOString(),
                data: {}
            };

            VAULT_KEYS.forEach(key => {
                const val = localStorage.getItem(key);
                if (val !== null) {
                    try {
                        dump.data[key] = JSON.parse(val);
                    } catch (e) {
                        dump.data[key] = val;
                    }
                }
            });

            const jsonStr = JSON.stringify(dump, null, 2);
            const blob = new Blob([jsonStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = "deep_focus_backup_" + Date.now() + ".json";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log("[OfflineDataVault] Backup exported successfully without network transmission.");
            if (typeof navigator !== "undefined" && navigator.vibrate) try { ((navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) ? navigator.vibrate(30) : false); } catch (e) {}
        },

        importBackupJSON: function (jsonString) {
            if (typeof window === "undefined" || !window.localStorage) return false;

            try {
                const parsed = JSON.parse(jsonString);
                if (parsed.app !== "DEEP_FOCUS" || !parsed.data) {
                    throw new Error("Invalid backup signature or missing payload.");
                }

                Object.keys(parsed.data).forEach(key => {
                    const val = parsed.data[key];
                    const serialized = typeof val === "string" ? val : JSON.stringify(val);
                    localStorage.setItem(key, serialized);
                });

                console.log("[OfflineDataVault] Data restored successfully!");
                if (typeof navigator !== "undefined" && navigator.vibrate) try { ((navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) ? navigator.vibrate([40, 30, 40]) : false); } catch (e) {}
                return true;
            } catch (err) {
                console.error("[OfflineDataVault] Import validation failed:", err);
                return false;
            }
        }
    };

    return OfflineDataVault;
}));
