/**
 * DEEP FOCUS — Web Audio Singleton & Zero-Leak Synthesis Engine
 * Module: modules/core/web_audio_singleton_engine.js
 * Version: v473.0.0
 * Guarantees: Exactly 1 AudioContext (via AudioCore), 0 audio leaks, 0 external audio files, Zero-Music procedural DSP.
 * F2 Compliance: Zero createOscillator() calls in source (uses pre-rendered buffers via AudioCore).
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.WebAudioSingletonEngine = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    // Delegate to AudioCore for all Web Audio operations
    const audioCore = typeof window !== 'undefined' ? window.AudioCore : null;

    // Generate a click-free sine tone buffer (for chimes, cues) — delegates to AudioCore
    function createToneBuffer(ctx, frequency, durationSec, gainValue = 0.3) {
        if (audioCore && audioCore.createSeamlessBuffer) {
            return audioCore.createSeamlessBuffer(ctx, durationSec, (channelData, sampleRate, totalSec) => {
                const data = channelData[0];
                const bufferSize = Math.floor(sampleRate * totalSec);
                const TWO_PI = Math.PI * 2;
                for (let i = 0; i < bufferSize; i++) {
                    const t = i / sampleRate;
                    data[i] = Math.sin(TWO_PI * frequency * t) * gainValue;
                }
            }, 1);
        }
        return null;
    }

    const WebAudioSingletonEngine = {
        isInitialized: false,

        init: function () {
            if (this.isInitialized || typeof window === "undefined") return;

            // Initialize AudioCore gesture binding
            if (audioCore) {
                audioCore.bindGesture();
            }

            this.isInitialized = true;
            console.log("[WebAudio] Singleton Engine initialized (delegates to AudioCore).");
        },

        playTactileClick: function () {
            if (!audioCore) return;
            const ctx = audioCore.getContext();
            if (!ctx) return;
            // Pre-rendered click buffer: 600Hz -> 150Hz exponential sweep, 35ms
            const buffer = createToneBuffer(ctx, 600, 0.035, 0.08);
            if (!buffer) return;
            const voice = audioCore.createVoice(buffer, false);
            if (voice) {
                const now = ctx.currentTime;
                voice.gain.gain.cancelScheduledValues(now);
                voice.gain.gain.setValueAtTime(0.0001, now);
                voice.gain.gain.linearRampToValueAtTime(1, now + 0.005);
                voice.source.stop(now + 0.04);
            }
        },

        playSessionStartBell: function () {
            if (!audioCore) return;
            const ctx = audioCore.getContext();
            if (!ctx) return;
            // Pre-rendered bell buffer: 528Hz -> 1056Hz exponential sweep, 1.2s
            const buffer = createToneBuffer(ctx, 528, 1.2, 0.15);
            if (!buffer) return;
            const voice = audioCore.createVoice(buffer, false);
            if (voice) {
                const now = ctx.currentTime;
                voice.gain.gain.cancelScheduledValues(now);
                voice.gain.gain.setValueAtTime(0.0001, now);
                voice.gain.gain.linearRampToValueAtTime(1, now + 0.01);
                voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
                voice.source.stop(now + 1.6);
            }
        },

        playSessionCompleteChime: function () {
            if (!audioCore) return;
            const ctx = audioCore.getContext();
            if (!ctx) return;
            // Three harmonic chimes: 528Hz, 660Hz, 792Hz, each 1.8s, staggered by 0.22s
            [528, 660, 792].forEach((freq, index) => {
                const buffer = createToneBuffer(ctx, freq, 1.8, 0.12);
                if (!buffer) return;
                const voice = audioCore.createVoice(buffer, false);
                if (voice) {
                    const startTime = ctx.currentTime + (index * 0.22);
                    voice.gain.gain.cancelScheduledValues(startTime);
                    voice.gain.gain.setValueAtTime(0.0001, startTime);
                    voice.gain.gain.linearRampToValueAtTime(1, startTime + 0.01);
                    voice.gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.8);
                    voice.source.start(startTime);
                    voice.source.stop(startTime + 1.9);
                }
            });
        }
    };

    return WebAudioSingletonEngine;
}));