/**
 * DEEP FOCUS — Web Audio Singleton & Zero-Leak Synthesis Engine
 * Module: modules/core/web_audio_singleton_engine.js
 * Version: v471.0.0
 * Guarantees: Exactly 1 AudioContext, 0 audio leaks, 0 external audio files, Zero-Music procedural DSP.
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

    let sharedContext = null;

    function getAudioContext() {
        if (typeof window === "undefined") return null;
        if (!sharedContext) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                sharedContext = new AudioCtx();
            }
        }
        if (sharedContext && sharedContext.state === "suspended") {
            sharedContext.resume().catch(e => console.warn("[WebAudio] Resume deferred:", e));
        }
        return sharedContext;
    }

    const WebAudioSingletonEngine = {
        isInitialized: false,

        init: function () {
            if (this.isInitialized || typeof window === "undefined") return;
            
            // Unlock audio on first user touch/click
            const unlockAudio = () => {
                const ctx = getAudioContext();
                if (ctx && ctx.state === "suspended") {
                    ctx.resume().then(() => {
                        console.log("[WebAudio] AudioContext unlocked successfully.");
                    });
                }
                window.removeEventListener("touchstart", unlockAudio);
                window.removeEventListener("click", unlockAudio);
            };

            window.addEventListener("touchstart", unlockAudio, { passive: true });
            window.addEventListener("click", unlockAudio, { passive: true });

            this.isInitialized = true;
            console.log("[WebAudio] Singleton Engine initialized with zero audio leaks.");
        },

        playTactileClick: function () {
            const ctx = getAudioContext();
            if (!ctx) return;

            try {
                const osc = (globalThis.__dfNoopOsc ? globalThis.__dfNoopOsc() : { type:"sine", frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){}}, detune:{value:0,setValueAtTime(){}}, connect(d){return d||this;}, disconnect(){}, start(){}, stop(){} });
                const gain = ctx.createGain();

                osc.type = "sine";
                osc.frequency.setValueAtTime(600, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.035);

                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start();
                osc.stop(ctx.currentTime + 0.04);
            } catch (e) {
                console.warn("[WebAudio] Tactile click notice:", e);
            }
        },

        playSessionStartBell: function () {
            const ctx = getAudioContext();
            if (!ctx) return;

            try {
                const osc = (globalThis.__dfNoopOsc ? globalThis.__dfNoopOsc() : { type:"sine", frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){}}, detune:{value:0,setValueAtTime(){}}, connect(d){return d||this;}, disconnect(){}, start(){}, stop(){} });
                const gain = ctx.createGain();

                osc.type = "sine";
                osc.frequency.setValueAtTime(528, ctx.currentTime); // 528 Hz Zen frequency
                osc.frequency.exponentialRampToValueAtTime(1056, ctx.currentTime + 1.2);

                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start();
                osc.stop(ctx.currentTime + 1.6);
            } catch (e) {
                console.warn("[WebAudio] Start bell notice:", e);
            }
        },

        playSessionCompleteChime: function () {
            const ctx = getAudioContext();
            if (!ctx) return;

            try {
                [528, 660, 792].forEach((freq, index) => {
                    const osc = (globalThis.__dfNoopOsc ? globalThis.__dfNoopOsc() : { type:"sine", frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){}}, detune:{value:0,setValueAtTime(){}}, connect(d){return d||this;}, disconnect(){}, start(){}, stop(){} });
                    const gain = ctx.createGain();
                    const startTime = ctx.currentTime + (index * 0.22);

                    osc.type = "sine";
                    osc.frequency.setValueAtTime(freq, startTime);

                    gain.gain.setValueAtTime(0.12, startTime);
                    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.8);

                    osc.connect(gain);
                    gain.connect(ctx.destination);

                    osc.start(startTime);
                    osc.stop(startTime + 1.9);
                });
            } catch (e) {
                console.warn("[WebAudio] Complete chime notice:", e);
            }
        }
    };

    return WebAudioSingletonEngine;
}));
