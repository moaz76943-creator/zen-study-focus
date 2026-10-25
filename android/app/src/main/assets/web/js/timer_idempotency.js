/**
 * DEEP FOCUS — Timer Idempotency & Completion Guard v21
 * Ensures a completed session is credited exactly once in analytics & achievements.
 */
(function(global) {
    const STORAGE_KEY_PROCESSED = "zen_fortress_processed_sessions_v21";

    function getProcessedSessionIds(storageBackend) {
        try {
            const raw = storageBackend.getItem(STORAGE_KEY_PROCESSED);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function recordCompletion(session, storageBackend, analyticsTracker) {
        if (!session || !session.sessionId) {
            return { status: "INVALID_SESSION", credited: false };
        }

        const processed = getProcessedSessionIds(storageBackend);
        
        // Idempotency Check: Was this session already credited?
        if (processed.includes(session.sessionId)) {
            return {
                status: "ALREADY_CREDITED",
                credited: false,
                sessionId: session.sessionId,
                message: "Duplicate completion ignored safely."
            };
        }

        // Credit minutes once
        const minutesToCredit = Number(session.durationMinutes) || 0;
        if (analyticsTracker && typeof analyticsTracker.addFocusMinutes === "function") {
            analyticsTracker.addFocusMinutes(minutesToCredit, session.activityType || "focus");
        }

        // Mark as processed atomically
        processed.push(session.sessionId);
        // Retain only last 500 session IDs to maintain lightweight storage footprint
        if (processed.length > 500) {
            processed.shift();
        }

        storageBackend.setItem(STORAGE_KEY_PROCESSED, JSON.stringify(processed));

        return {
            status: "CREDITED_SUCCESSFULLY",
            credited: true,
            sessionId: session.sessionId,
            creditedMinutes: minutesToCredit
        };
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { recordCompletion, STORAGE_KEY_PROCESSED };
    } else {
        global.ZenTimerIdempotency = { recordCompletion, STORAGE_KEY_PROCESSED };
    }
})(typeof window !== "undefined" ? window : globalThis);
