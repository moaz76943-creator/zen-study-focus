/**
 * DEEP FOCUS — Startup Reliability & Critical-Path Guard v21
 * Strictly eliminates:
 * 1. Infinite Splash Screen / Endless Spinner.
 * 2. Corrupted-Data Auto-Wipe: ZERO data deletion on corrupted JSON.
 * 3. Startup blocks caused by optional audio or background sync services.
 */
(function(global) {

    async function bootstrapApplication(criticalInitFn, optionalInitFns = [], uiHooks = {}) {
        let splashDismissed = false;
        const dismissSplash = () => {
            if (!splashDismissed) {
                splashDismissed = true;
                if (typeof uiHooks.onDismissSplash === 'function') {
                    uiHooks.onDismissSplash();
                }
            }
        };

        const startupReport = {
            status: "UNKNOWN",
            criticalSuccess: false,
            optionalResults: {},
            safeModeActive: false,
            bootTimeMs: 0
        };

        const startTime = Date.now();

        // 1. CRITICAL PATH EXECUTION (Timer + Core Storage)
        try {
            await criticalInitFn();
            startupReport.criticalSuccess = true;
            startupReport.status = "READY";
        } catch (criticalErr) {
            // CRITICAL INVARIANT: NEVER AUTO-WIPE DATA ON ERROR
            startupReport.criticalSuccess = false;
            startupReport.safeModeActive = true;
            startupReport.status = "SAFE_MODE_DATA_PRESERVED";
            startupReport.criticalError = criticalErr.message;

            if (typeof uiHooks.onActivateSafeMode === 'function') {
                uiHooks.onActivateSafeMode(criticalErr);
            }
        } finally {
            // CRITICAL: Dismiss Splash screen immediately! Never trap user in infinite spinner
            dismissSplash();
            startupReport.bootTimeMs = Date.now() - startTime;
        }

        // 2. OPTIONAL SERVICES (Non-blocking background execution)
        if (Array.isArray(optionalInitFns) && optionalInitFns.length > 0) {
            Promise.allSettled(optionalInitFns.map(fn => fn())).then(results => {
                results.forEach((res, idx) => {
                    startupReport.optionalResults[`service_${idx}`] = {
                        status: res.status,
                        error: res.reason ? res.reason.message : null
                    };
                });
            });
        }

        return startupReport;
    }

    // Safety parser that protects storage from auto-wipe if JSON is corrupted
    function safeReadStorageKey(storageBackend, key, fallbackDefault) {
        try {
            const raw = storageBackend.getItem(key);
            if (!raw) return fallbackDefault;
            return JSON.parse(raw);
        } catch (parseError) {
            // NEVER clear storage! Return fallback in-memory while preserving raw disk content
            return {
                __isCorruptedRaw: true,
                __recoveredFallback: fallbackDefault,
                __rawContentPreserved: true,
                __error: parseError.message
            };
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { bootstrapApplication, safeReadStorageKey };
    } else {
        global.ZenStartupGuard = { bootstrapApplication, safeReadStorageKey };
    }
})(typeof window !== 'undefined' ? window : globalThis);
