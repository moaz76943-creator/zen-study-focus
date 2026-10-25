/**
 * DEEP FOCUS — Interrupted Session Resume & Recovery Guard v21
 * Fairly saves earned focus minutes and eliminates lost user effort on crashes/calls.
 * Strictly bans crediting unworked minutes (Section 07 & 38 of Directive).
 */
(function(global) {

    const STORAGE_KEY_INTERRUPTED = "zen_fortress_interrupted_session_v21";

    function snapshotActiveSession(session, storageBackend) {
        if (!session || !session.sessionId || session.status !== "RUNNING") return false;

        const snapshot = {
            sessionId: session.sessionId,
            activityType: session.activityType || "focus",
            durationMinutes: Number(session.durationMinutes) || 25,
            elapsedSeconds: Number(session.elapsedSeconds) || 0,
            remainingSeconds: Number(session.remainingSeconds) || 0,
            taskId: session.taskId || null,
            interruptedAt: Date.now()
        };

        try {
            if (storageBackend && typeof storageBackend.setItem === 'function') {
                storageBackend.setItem(STORAGE_KEY_INTERRUPTED, JSON.stringify(snapshot));
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    function checkInterruptedSession(storageBackend) {
        try {
            if (!storageBackend || typeof storageBackend.getItem !== 'function') return null;
            const raw = storageBackend.getItem(STORAGE_KEY_INTERRUPTED);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    function resolveInterruptedSession(interruptedData, action, storageBackend, analyticsTracker) {
        if (!interruptedData || !interruptedData.sessionId) {
            return { resolved: false, reason: "INVALID_DATA" };
        }

        // Action 1: RESUME (Continue from exact remaining second)
        if (action === "RESUME") {
            return {
                resolved: true,
                action: "RESUME",
                session: {
                    sessionId: interruptedData.sessionId,
                    activityType: interruptedData.activityType,
                    durationMinutes: interruptedData.durationMinutes,
                    remainingSeconds: interruptedData.remainingSeconds,
                    taskId: interruptedData.taskId,
                    status: "PAUSED" // Start in safe paused state
                }
            };
        }

        // Action 2: SAVE_PARTIAL (Credit ONLY earned full minutes)
        if (action === "SAVE_PARTIAL") {
            const earnedMinutes = Math.floor(Number(interruptedData.elapsedSeconds) / 60);

            if (earnedMinutes > 0 && analyticsTracker && typeof analyticsTracker.addFocusMinutes === 'function') {
                analyticsTracker.addFocusMinutes(earnedMinutes, interruptedData.activityType);
            }

            // Clear snapshot
            if (storageBackend && typeof storageBackend.removeItem === 'function') {
                storageBackend.removeItem(STORAGE_KEY_INTERRUPTED);
            }

            return {
                resolved: true,
                action: "SAVE_PARTIAL",
                creditedMinutes: earnedMinutes,
                message: `Credited ${earnedMinutes} earned partial minutes accurately.`
            };
        }

        // Action 3: DISCARD
        if (storageBackend && typeof storageBackend.removeItem === 'function') {
            storageBackend.removeItem(STORAGE_KEY_INTERRUPTED);
        }

        return {
            resolved: true,
            action: "DISCARD",
            creditedMinutes: 0
        };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            snapshotActiveSession,
            checkInterruptedSession,
            resolveInterruptedSession,
            STORAGE_KEY_INTERRUPTED
        };
    } else {
        global.ZenInterruptionRecovery = {
            snapshotActiveSession,
            checkInterruptedSession,
            resolveInterruptedSession,
            STORAGE_KEY_INTERRUPTED
        };
    }
})(typeof window !== 'undefined' ? window : globalThis);
