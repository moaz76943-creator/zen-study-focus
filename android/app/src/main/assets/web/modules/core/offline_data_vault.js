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

        // Validate everything first, then write; on any failure restore every key to its previous value.
        importBackupJSON: function (jsonString) {
            if (typeof window === "undefined" || !window.localStorage) return false;
            const MAX_BYTES = 2 * 1024 * 1024;
            const previous = {};
            let touched = [];
            try {
                if (typeof jsonString !== "string" || jsonString.length > MAX_BYTES) {
                    throw new Error("Backup missing or too large.");
                }
                const parsed = JSON.parse(jsonString, function (k, v) {
                    return (k === "__proto__" || k === "constructor" || k === "prototype") ? undefined : v;
                });
                if (!parsed || parsed.app !== "DEEP_FOCUS" || !parsed.data || typeof parsed.data !== "object" || Array.isArray(parsed.data)) {
                    throw new Error("Invalid backup signature or missing payload.");
                }
                const entries = [];
                Object.keys(parsed.data).forEach(function (key) {
                    // Only the keys this vault exports may be restored; anything else is rejected.
                    if (VAULT_KEYS.indexOf(key) === -1) throw new Error("Backup contains a key that is not allowed: " + key);
                    const val = parsed.data[key];
                    const serialized = typeof val === "string" ? val : JSON.stringify(val);
                    if (typeof serialized !== "string" || serialized.length > 1024 * 1024) throw new Error("Invalid value for " + key);
                    try { JSON.parse(serialized); } catch (_) { if (typeof val !== "string") throw new Error("Invalid JSON for " + key); }
                    entries.push([key, serialized]);
                });
                entries.forEach(function (e) { previous[e[0]] = localStorage.getItem(e[0]); });
                entries.forEach(function (e) {
                    localStorage.setItem(e[0], e[1]);
                    touched.push(e[0]);
                    if (localStorage.getItem(e[0]) !== e[1]) throw new Error("Write not verified for " + e[0]);
                });
                console.log("[OfflineDataVault] Data restored successfully!");
                if (typeof navigator !== "undefined" && navigator.vibrate) try { ((navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) ? navigator.vibrate([40, 30, 40]) : false); } catch (e) {}
                return true;
            } catch (err) {
                touched.forEach(function (key) {
                    try {
                        if (previous[key] === null || previous[key] === undefined) localStorage.removeItem(key);
                        else localStorage.setItem(key, previous[key]);
                    } catch (_) { /* best-effort rollback */ }
                });
                console.error("[OfflineDataVault] Import validation failed:", err);
                return false;
            }
        }
    };

    return OfflineDataVault;
}));
