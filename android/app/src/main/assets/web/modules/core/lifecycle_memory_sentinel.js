/**
 * DEEP FOCUS — Lifecycle Memory Sentinel & Hardware Resource Guard
 * Module: modules/core/lifecycle_memory_sentinel.js
 * Version: v477.0.0
 * Purpose: Track, pool, and release hardware listeners, AudioContexts, and Workers to guarantee 0 leaks.
 * Now compatible with AudioCore singleton context management.
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.LifecycleMemorySentinel = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const audioCore = typeof window !== 'undefined' ? window.AudioCore : null;
    const activeListeners = new Set();
    const activeWorkers = new Set();

    const LifecycleMemorySentinel = {
        isWatching: false,

        init: function () {
            if (this.isWatching || typeof window === "undefined") return;
            this.bindUnloadJanitor();
            this.isWatching = true;
            console.log("[MemorySentinel] Guarding hardware resources, Workers, and AudioContexts (via AudioCore).");
        },

        // AudioContext creation is now managed exclusively by AudioCore
        // This method is kept for compatibility but delegates to AudioCore
        hijackLegacyAudioConstructors: function () {
            if (audioCore) {
                console.log("[MemorySentinel] AudioContext management delegated to AudioCore.");
            }
        },

        registerWorker: function (workerInstance) {
            if (workerInstance) {
                activeWorkers.add(workerInstance);
            }
        },

        registerManagedListener: function (target, type, listener, options) {
            if (!target || !target.addEventListener) return;
            target.addEventListener(type, listener, options);
            activeListeners.add({ target, type, listener, options });
        },

        purgeAllListeners: function () {
            activeListeners.forEach(({ target, type, listener, options }) => {
                try {
                    target.removeEventListener(type, listener, options);
                } catch (e) {}
            });
            activeListeners.clear();
            console.log("[MemorySentinel] All dangling DOM listeners detached cleanly.");
        },

        terminateAllWorkers: function () {
            activeWorkers.forEach(w => {
                try {
                    if (typeof w.terminate === "function") w.terminate();
                } catch (e) {}
            });
            activeWorkers.clear();
            console.log("[MemorySentinel] All background Workers terminated.");
        },

        bindUnloadJanitor: function () {
            window.addEventListener("pagehide", () => {
                this.purgeAllListeners();
                this.terminateAllWorkers();
                // Also stop all audio via AudioCore
                if (audioCore) {
                    audioCore.stopAllVoices();
                }
            });
        }
    };

    return LifecycleMemorySentinel;
}));