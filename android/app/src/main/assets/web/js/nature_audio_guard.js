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
        // Source strings do not prove rights. Only independently approved,
        // SHA-pinned assets may enter this managed playback API.
        if (sound.approved_for_runtime !== true || sound.ready === false) {
            return { valid: false, reason: "AUDIO_NOT_APPROVED_FOR_RUNTIME" };
        }
        if (!/^[a-f0-9]{64}$/i.test(sound.sha256 || "")) {
            return { valid: false, reason: "MISSING_OR_INVALID_SHA256" };
        }
        if (!/^https:\/\//i.test(sound.licenseEvidenceUrl || "")) {
            return { valid: false, reason: "LICENSE_EVIDENCE_REQUIRED" };
        }
        if (!/^https:\/\//i.test(sound.sourceUrl) ||
            !/^(?:sounds|audio|nature_audio)\/[a-zA-Z0-9_\/-]+\.(?:ogg|mp3|wav)$/i.test(sound.localPath) ||
            sound.localPath.includes("..") || sound.localPath.includes("//")) {
            return { valid: false, reason: "UNSAFE_AUDIO_PATH_OR_SOURCE" };
        }
        return { valid: true, sound };
    }

    function stopPlayer(player) {
        if (!player) return;
        if (typeof player.stop === "function") player.stop();
        else if (typeof player.pause === "function") player.pause();
        if ("currentTime" in player) {
            try { player.currentTime = 0; } catch (_) { /* read-only media */ }
        }
    }

    function stopSoundChannel(id) {
        const player = activeChannels.get(id);
        if (!player) return { status: "NOT_PLAYING" };
        // Remove first so asynchronous media failures cannot revive a channel.
        activeChannels.delete(id);
        try { stopPlayer(player); } catch (_) { /* isolate audio driver errors */ }
        return { status: "STOPPED" };
    }

    function setSoundChannelVolume(id, volume) {
        const value = Number(volume);
        if (!Number.isFinite(value) || value < 0 || value > 1)
            return { status: "INVALID_VOLUME" };
        const player = activeChannels.get(id);
        if (!player) return { status: "NOT_PLAYING" };
        try {
            if (typeof player.setVol === "function") player.setVol(value);
            else player.volume = value;
            return { status: "VOLUME_UPDATED", volume: value };
        } catch (_) { return { status: "AUDIO_FAILED_SAFELY_ISOLATED" }; }
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
                stopSoundChannel(sound.id);
            }

            // Create managed player instance
            const player = audioFactory(sound.localPath);
            player.loop = true;
            // Register before play(): some HTMLAudioElement drivers reject
            // asynchronously, so their catch handler must clean the same player.
            activeChannels.set(sound.id, player);
            const started = player.play();
            if (started && typeof started.then === "function") {
                Promise.resolve(started).catch(() => {
                    if (activeChannels.get(sound.id) === player) {
                        stopSoundChannel(sound.id);
                    }
                });
            }

            return {
                status: "PLAYING",
                soundId: sound.id,
                timerAffected: false
            };
        } catch (audioErr) {
            if (sound && sound.id) stopSoundChannel(sound.id);
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
        for (const id of [...activeChannels.keys()]) stopSoundChannel(id);
        return { status: "ALL_STOPPED", activeCount: activeChannels.size };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            validateSoundMetadata,
            playSoundChannel,
            stopAllSoundChannels,
            stopSoundChannel,
            setSoundChannelVolume,
            activeChannels
        };
    } else {
        global.ZenNatureAudio = {
            validateSoundMetadata,
            playSoundChannel,
            stopAllSoundChannels,
            stopSoundChannel,
            setSoundChannelVolume,
            activeChannels
        };
    }
})(typeof window !== 'undefined' ? window : globalThis);
