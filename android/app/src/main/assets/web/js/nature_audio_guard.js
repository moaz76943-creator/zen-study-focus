/**
 * DEEP FOCUS — Nature Audio Provenance & Mixer Guard v21
 * Enforces strict licensing verification, prevents leaked background players,
 * and isolates audio exceptions from the core Timer Engine.
 */
(function(global) {
    const activeChannels = new Map();

    function validateSoundMetadata(sound) {
        if (!sound || typeof sound !== 'object') {
            return { valid: false, reason: "INVALID_SOUND_OBJECT" };
        }
        if (!sound.id || !sound.title) {
            return { valid: false, reason: "MISSING_IDENTIFIER" };
        }
        // Strict License Requirement (Section 15 of Directive)
        const allowedLicenses = ["CC0", "CC-BY", "Public Domain", "ZenStudy-Original"];
        if (!sound.license || !allowedLicenses.includes(sound.license)) {
            return { valid: false, reason: "UNLICENSED_OR_PROPRIETARY_AUDIO_BLOCKED" };
        }
        if (!sound.sourceUrl) {
            return { valid: false, reason: "UNKNOWN_PROVENANCE_SOURCE_URL_MISSING" };
        }
        if (!sound.localPath) {
            return { valid: false, reason: "LOCAL_OFFLINE_PATH_REQUIRED" };
        }
        return { valid: true, sound };
    }

    function playSoundChannel(sound, audioFactory, timerInstance) {
        const validation = validateSoundMetadata(sound);
        if (!validation.valid) {
            return {
                status: "BLOCKED",
                reason: validation.reason,
                timerAffected: false
            };
        }

        try {
            // Stop existing instance on this channel to eliminate player leak
            if (activeChannels.has(sound.id)) {
                const existing = activeChannels.get(sound.id);
                if (existing && typeof existing.stop === 'function') {
                    existing.stop();
                }
            }

            // Create managed player instance
            const player = audioFactory(sound.localPath);
            player.loop = true;
            player.play();

            activeChannels.set(sound.id, player);

            return {
                status: "PLAYING",
                soundId: sound.id,
                timerAffected: false
            };
        } catch (audioErr) {
            // CRITICAL INVARIANT: Audio failure must NEVER stop the Timer Engine
            return {
                status: "AUDIO_FAILED_SAFELY_ISOLATED",
                error: audioErr.message,
                timerRunning: timerInstance ? timerInstance.isRunning() : true,
                timerAffected: false
            };
        }
    }

    function stopAllSoundChannels() {
        for (const [id, player] of activeChannels.entries()) {
            try {
                if (player && typeof player.stop === 'function') {
                    player.stop();
                }
            } catch (e) {}
        }
        activeChannels.clear();
        return { status: "ALL_STOPPED", activeCount: 0 };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            validateSoundMetadata,
            playSoundChannel,
            stopAllSoundChannels,
            activeChannels
        };
    } else {
        global.ZenNatureAudio = {
            validateSoundMetadata,
            playSoundChannel,
            stopAllSoundChannels,
            activeChannels
        };
    }
})(typeof window !== 'undefined' ? window : globalThis);
