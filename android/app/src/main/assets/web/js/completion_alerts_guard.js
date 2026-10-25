/**
 * DEEP FOCUS — Completion Alerts & Silence Guard v21
 * Enforces:
 * 1. Single Alert Rule: Never chime twice for the same session ID.
 * 2. Silence Invariants: Respects Mute, Volume 0, Silent Mode, and DND.
 * 3. Zen Sound Catalog: Bell, Wood Chime, Water Drop, Soft Gong, Gentle Tap, Silent.
 */
(function(global) {

    const alertedSessions = new Set();
    const ALLOWED_CALM_SOUNDS = ["bell", "wood_chime", "water_drop", "soft_gong", "gentle_tap", "silent"];

    function triggerCompletionAlert(sessionContext, alertSettings, audioDriver) {
        if (!sessionContext || !sessionContext.sessionId) {
            return { played: false, reason: "INVALID_SESSION_CONTEXT" };
        }

        const sid = sessionContext.sessionId;

        // 1. Idempotency Check: Never alert twice for the same session
        if (alertedSessions.has(sid)) {
            return {
                played: false,
                status: "DUPLICATE_ALERT_SUPPRESSED",
                sessionId: sid,
                reason: "Alert already delivered for this session ID."
            };
        }

        // 2. Respect Silence & DND Settings
        const soundChoice = (alertSettings.soundName || "bell").toLowerCase();
        if (soundChoice === "silent" || alertSettings.mute === true) {
            alertedSessions.add(sid);
            return { played: false, status: "SILENT_HONORED", sessionId: sid };
        }

        if (Number(alertSettings.volume) === 0) {
            alertedSessions.add(sid);
            return { played: false, status: "VOLUME_ZERO_HONORED", sessionId: sid };
        }

        if (alertSettings.dndActive === true) {
            alertedSessions.add(sid);
            return { played: false, status: "DND_HONORED", sessionId: sid };
        }

        // 3. Calm Sounds Catalog Validation
        const resolvedSound = ALLOWED_CALM_SOUNDS.includes(soundChoice) ? soundChoice : "bell";

        // 4. Safe Audio Dispatch with Exception Isolation
        try {
            if (audioDriver && typeof audioDriver.playAlert === 'function') {
                audioDriver.playAlert(resolvedSound, alertSettings.volume || 1.0);
            }
            alertedSessions.add(sid);

            return {
                played: true,
                status: "ALERT_PLAYED",
                sound: resolvedSound,
                sessionId: sid
            };
        } catch (audioErr) {
            // Audio error must NEVER disrupt session completion
            alertedSessions.add(sid);
            return {
                played: false,
                status: "AUDIO_FAILED_SAFELY_FALLBACK_VISUAL",
                error: audioErr.message,
                sessionId: sid
            };
        }
    }

    function resetAlertCache() {
        alertedSessions.clear();
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            triggerCompletionAlert,
            resetAlertCache,
            ALLOWED_CALM_SOUNDS
        };
    } else {
        global.ZenCompletionAlerts = {
            triggerCompletionAlert,
            resetAlertCache,
            ALLOWED_CALM_SOUNDS
        };
    }
})(typeof window !== 'undefined' ? window : globalThis);
