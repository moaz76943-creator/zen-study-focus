/**
 * DEEP FOCUS — Accidental-corruption detector for a few cache records.
 * Module: modules/security/tamper_proof_integrity_guard.js
 * HONEST SCOPE: the checksum lives in the same localStorage as the data, so this detects accidental
 * corruption only. It is NOT tamper-proofing and is not authentication. A mismatch is recorded in
 * `mismatches` and the damaged raw value is copied to a bounded quarantine key before the baseline
 * is refreshed; it never claims to have repaired data. Verification errors fail CLOSED (false).
 * The user's real data (zen_fortress_*_v21) is protected by the packet+mirror scheme in app.js.
 * Compliance: 100% Offline, Zero PII, Strict Western Digits (0-9).
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.TamperProofIntegrityGuard = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const STORAGE_KEY_SIGS = "zen_crypto_signatures_v1";

    async function computeSHA256(text) {
        if (typeof crypto !== "undefined" && crypto.subtle) {
            const msgBuffer = new TextEncoder().encode(text);
            const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
        }
        // Fallback fast DJB2 hash if SubtleCrypto is unavailable
        let hash = 5381;
        for (let i = 0; i < text.length; i++) {
            hash = ((hash << 5) + hash) + text.charCodeAt(i);
        }
        return (hash >>> 0).toString(16);
    }

    const TamperProofIntegrityGuard = {
        isGuarded: false,
        mismatches: [],

        init: function () {
            if (typeof window === "undefined" || this.isGuarded) return;
            this.verifyAllProtectedRecords();
            this.isGuarded = true;
            console.log("[IntegrityGuard] Active (accidental-corruption detection only).");
        },

        async signRecord(key, rawData) {
            try {
                const serialized = typeof rawData === "string" ? rawData : JSON.stringify(rawData);
                const checksum = await computeSHA256(serialized);
                const sigs = JSON.parse(localStorage.getItem(STORAGE_KEY_SIGS) || "{}");
                sigs[key] = {
                    hash: checksum,
                    timestamp: Date.now()
                };
                localStorage.setItem(STORAGE_KEY_SIGS, JSON.stringify(sigs));
            } catch (e) {
                console.warn("[IntegrityGuard] Sign error:", e);
            }
        },

        async verifyRecord(key) {
            try {
                const raw = localStorage.getItem(key);
                if (!raw) return true;

                const sigs = JSON.parse(localStorage.getItem(STORAGE_KEY_SIGS) || "{}");
                if (!sigs[key]) {
                    // Initial baseline creation
                    await this.signRecord(key, raw);
                    return true;
                }

                const currentHash = await computeSHA256(raw);
                if (currentHash !== sigs[key].hash) {
                    console.warn("[IntegrityGuard] Integrity mismatch detected on key:", key);
                    return false;
                }
                return true;
            } catch (e) {
                // Fail closed: if integrity cannot be verified, do not report the record as healthy.
                return false;
            }
        },

        async verifyAllProtectedRecords() {
            const keys = ["zen_focus_history_v1", "zen_personal_bests_v1", "zen_daily_goals_v2"];
            for (const key of keys) {
                const valid = await this.verifyRecord(key);
                if (!valid) {
                    const raw = localStorage.getItem(key);
                    this.mismatches.push({ key: key, at: Date.now() });
                    try {
                        // Keep the mismatching value for diagnosis before accepting it as the new baseline.
                        if (raw && raw.length <= 400000) localStorage.setItem("df_quarantine_" + key, raw);
                    } catch (_) { /* quarantine is best effort */ }
                    if (raw) await this.signRecord(key, raw);
                }
            }
        }
    };

    return TamperProofIntegrityGuard;
}));
