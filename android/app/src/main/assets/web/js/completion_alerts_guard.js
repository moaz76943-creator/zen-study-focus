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

    const inFlightSessions = new Set();

    function triggerCompletionAlert(sessionContext, alertSettings, audioDriver) {
        if (!sessionContext || !sessionContext.sessionId) {
            return { played: false, reason: "INVALID_SESSION_CONTEXT" };
        }

        const sid = sessionContext.sessionId;
        if (alertedSessions.has(sid) || inFlightSessions.has(sid)) {
            return { played: false, status: "DUPLICATE_ALERT_SUPPRESSED", sessionId: sid };
        }

        const settings = alertSettings && typeof alertSettings === "object" ? alertSettings : {};
        const soundChoice = typeof settings.soundName === "string"
            ? settings.soundName.toLowerCase() : "bell";

        if (soundChoice === "silent" || settings.mute === true) {
            alertedSessions.add(sid);
            return { played: false, status: "SILENT_HONORED", sessionId: sid };
        }
        if (settings.dndActive === true) {
            alertedSessions.add(sid);
            return { played: false, status: "DND_HONORED", sessionId: sid };
        }

        const volume = settings.volume === undefined ? 1 : Number(settings.volume);
        if (!Number.isFinite(volume) || volume < 0 || volume > 1) {
            return { played: false, status: "INVALID_ALERT_VOLUME", sessionId: sid };
        }
        if (volume === 0) {
            alertedSessions.add(sid);
            return { played: false, status: "VOLUME_ZERO_HONORED", sessionId: sid };
        }
        if (!audioDriver || typeof audioDriver.playAlert !== "function") {
            return { played: false, status: "AUDIO_DRIVER_UNAVAILABLE", sessionId: sid };
        }

        const resolvedSound = ALLOWED_CALM_SOUNDS.includes(soundChoice) ? soundChoice : "bell";
        const success = () => {
            inFlightSessions.delete(sid);
            alertedSessions.add(sid);
            return { played: true, status: "ALERT_PLAYED", sound: resolvedSound, sessionId: sid };
        };
        const failure = (error) => {
            inFlightSessions.delete(sid);
            return {
                played: false,
                status: "AUDIO_FAILED_SAFELY_FALLBACK_VISUAL",
                error: String(error && error.message || error),
                sessionId: sid
            };
        };

        try {
            const dispatched = audioDriver.playAlert(resolvedSound, volume);
            if (dispatched && typeof dispatched.then === "function") {
                inFlightSessions.add(sid);
                return Promise.resolve(dispatched).then(success, failure);
            }
            return success();
        } catch (error) {
            return failure(error);
        }
    }

    function resetAlertCache() {
        alertedSessions.clear();
        inFlightSessions.clear();
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
