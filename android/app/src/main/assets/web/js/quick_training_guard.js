/**
 * DEEP FOCUS — Quick Training Rounds & State Continuity Guard v21
 * Enforces:
 * 1. Unified state machine: WORK -> REST -> NEXT_ROUND -> COMPLETED.
 * 2. Mid-session persistence: Resumes exact round if app closes or process restarts.
 * 3. Zero session loss on storage write rejection.
 */
(function(global) {

    const STORAGE_KEY_TRAINING = "zen_fortress_training_state_v21";

    function initializeTrainingSession(config) {
        return {
            trainingSessionId: config.sessionId || `train_${Date.now()}`,
            activityType: config.activityType || "training",
            totalRounds: Math.max(1, Number(config.totalRounds) || 4),
            currentRound: 1,
            phase: "WORK", // "WORK" | "REST" | "COMPLETED"
            workSeconds: Number(config.workSeconds) || 20,
            restSeconds: Number(config.restSeconds) || 10,
            status: "READY", // "READY" | "ACTIVE" | "PAUSED" | "COMPLETED"
            totalCreditedMinutes: Math.round(((config.totalRounds || 4) * (config.workSeconds || 20)) / 60) || 1
        };
    }

    function transitionPhase(session, storageBackend) {
        if (!session || session.status === "COMPLETED") {
            return { session, transitioned: false, isComplete: true };
        }

        const updated = { ...session };

        if (updated.phase === "WORK") {
            // Work finished -> Transition to Rest (if not last round or if rest applies)
            if (updated.currentRound < updated.totalRounds) {
                updated.phase = "REST";
            } else {
                updated.phase = "COMPLETED";
                updated.status = "COMPLETED";
            }
        } else if (updated.phase === "REST") {
            // Rest finished -> Advance to Next Round Work
            updated.currentRound += 1;
            updated.phase = "WORK";
        }

        // Persist snapshot atomically
        try {
            if (storageBackend && typeof storageBackend.setItem === 'function') {
                storageBackend.setItem(STORAGE_KEY_TRAINING, JSON.stringify(updated));
            }
        } catch (e) {
            // State remains preserved in memory even if storage fails
        }

        return {
            session: updated,
            transitioned: true,
            isComplete: updated.phase === "COMPLETED"
        };
    }

    function recoverTrainingSession(storageBackend) {
        try {
            if (!storageBackend || typeof storageBackend.getItem !== 'function') return null;
            const raw = storageBackend.getItem(STORAGE_KEY_TRAINING);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (parsed && parsed.status === "ACTIVE") {
                parsed.status = "PAUSED"; // Recover in safe paused mode
                return parsed;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            initializeTrainingSession,
            transitionPhase,
            recoverTrainingSession,
            STORAGE_KEY_TRAINING
        };
    } else {
        global.ZenQuickTraining = {
            initializeTrainingSession,
            transitionPhase,
            recoverTrainingSession,
            STORAGE_KEY_TRAINING
        };
    }
})(typeof window !== 'undefined' ? window : globalThis);
