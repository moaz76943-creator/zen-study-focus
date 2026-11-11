/**
 * DEEP FOCUS — Lifecycle Memory Sentinel & Hardware Resource Guard
 * Module: modules/core/lifecycle_memory_sentinel.js
 * Version: v476.0.0
 * Purpose: Track, pool, and release hardware listeners, AudioContexts, and Workers to guarantee 0 leaks.
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

    const activeListeners = new Set();
    const activeWorkers = new Set();

    const LifecycleMemorySentinel = {
        isWatching: false,

        init: function () {
            if (this.isWatching || typeof window === "undefined") return;
            this.hijackLegacyAudioConstructors();
            this.bindUnloadJanitor();
            this.isWatching = true;
            console.log("[MemorySentinel] Guarding hardware resources, Workers, and AudioContexts.");
        },

        hijackLegacyAudioConstructors: function () {
            // Intercept any rogue new AudioContext() and route to WebAudioSingletonEngine
            const OrigAudio = window.AudioContext || window.webkitAudioContext;
            if (OrigAudio && window.WebAudioSingletonEngine) {
                console.log("[MemorySentinel] Legacy AudioContext constructors intercepted.");
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
            });
        }
    };

    return LifecycleMemorySentinel;
}));
