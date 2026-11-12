// ==============================================================================
// SOVEREIGN MODULAR PLUGIN REGISTRY (TASK #742)
// Enables Plug-and-Play Feature Modules Without Bloating Core app.js
// ==============================================================================
window.SovereignModuleRegistry = (function() {
    const registry = new Map();

    function register(name, api, version) {
        if (!name || !api) return false;
        registry.set(name, {
            name: name,
            version: version || "1.0.0",
            registeredAt: Date.now(),
            healthy: typeof api === "object" || typeof api === "function"
        });
        return true;
    }

    function autoDiscover() {
        const known = [
            "SovereignAnalytics", "SovereignBreathing", "SovereignWorkerTimer",
            "SovereignHeapSanitizer", "SovereignChimes", "SovereignStateSnapshot",
            "SovereignBinauralAlpha", "SovereignProfiler", "SovereignDeckExchange",
            "SovereignHeatmap", "SovereignAudioVisualizer", "SovereignDeduplicator",
            "SovereignMaintenanceHub", "SovereignStorageVacuum", "SovereignStressAudit",
            "SovereignLocaleResolver", "SovereignAudioGuardian", "SovereignDeltaClock",
            "SovereignBackStack", "SovereignCalmUI", "SovereignEyeComfort"
        ];
        known.forEach(k => {
            if (window[k]) register(k, window[k], "555.0.0");
        });
    }

    function getStatus() {
        autoDiscover();
        const items = [];
        registry.forEach(v => items.push(v));
        return {
            totalModules: items.length,
            healthyCount: items.filter(i => i.healthy).length,
            modules: items
        };
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", autoDiscover);
    } else {
        autoDiscover();
    }

    return {
        register: register,
        getStatus: getStatus
    };
})();
