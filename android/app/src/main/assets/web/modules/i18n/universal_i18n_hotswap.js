/**
 * DEEP FOCUS — Universal i18n Hot-Swap Engine
 * Module: modules/i18n/universal_i18n_hotswap.js
 * Version: v497.0.0
 * Architecture: Dynamic Locale File Loader + Instant DOM Hot-Swap + Sovereign Exclusion Barrier
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.UniversalI18nHotSwap = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const STORAGE_KEY_LANG = "zen_selected_language_v1";
    const EXCLUDED_CODES = new Set(["he", "iw", "syc", "ber", "zgh"]);

    // Embedded Core Fallback Locales for Instant Zero-Latency Cold Boot
    const LOADED_LOCALES = {};

    const UniversalI18nHotSwap = {
        currentLang: "ar",
        activeDictionary: {},

        init: function () {
            if (typeof document === "undefined") return;

            const saved = localStorage.getItem(STORAGE_KEY_LANG);
            const initial = (saved && !EXCLUDED_CODES.has(saved.toLowerCase())) ? saved : "ar";
            this.applyLanguage(initial);
            console.log("[UniversalI18nHotSwap] Initialized with language: " + initial);
        },

        isLanguageAllowed: function (code) {
            if (!code) return false;
            return !EXCLUDED_CODES.has(code.toLowerCase());
        },

        loadLocale: function (code, callback) {
            if (!this.isLanguageAllowed(code)) {
                console.warn("[UniversalI18nHotSwap] Blocked excluded language code: " + code);
                return;
            }

            if (LOADED_LOCALES[code]) {
                this.activeDictionary = LOADED_LOCALES[code];
                if (callback) callback(LOADED_LOCALES[code]);
                return;
            }

            // Attempt to load from JSON locale file
            const xhr = new XMLHttpRequest();
            xhr.open("GET", "locales/" + code + ".json", true);
            xhr.onload = () => {
                if (xhr.status === 200 || xhr.status === 0) {
                    try {
                        const parsed = JSON.parse(xhr.responseText);
                        LOADED_LOCALES[code] = parsed;
                        this.activeDictionary = parsed;
                        if (callback) callback(parsed);
                        return;
                    } catch (e) {}
                }
                // Fallback to English if not loaded yet
                this.fallbackToEnglish(callback);
            };
            xhr.onerror = () => {
                this.fallbackToEnglish(callback);
            };
            xhr.send();
        },

        fallbackToEnglish: function (callback) {
            if (LOADED_LOCALES["en"]) {
                this.activeDictionary = LOADED_LOCALES["en"];
                if (callback) callback(LOADED_LOCALES["en"]);
            } else {
                const xhr = new XMLHttpRequest();
                xhr.open("GET", "locales/en.json", true);
                xhr.onload = () => {
                    try {
                        const enDict = JSON.parse(xhr.responseText);
                        LOADED_LOCALES["en"] = enDict;
                        this.activeDictionary = enDict;
                        if (callback) callback(enDict);
                    } catch (e) {}
                };
                xhr.send();
            }
        },

        applyLanguage: function (code) {
            if (!this.isLanguageAllowed(code)) return;

            this.currentLang = code;
            localStorage.setItem(STORAGE_KEY_LANG, code);

            this.loadLocale(code, (dict) => {
                const dir = dict.dir || "ltr";
                document.documentElement.setAttribute("dir", dir);
                document.documentElement.setAttribute("lang", code);

                this.sweepDom(dict);
            });
        },

        sweepDom: function (dict) {
            const elements = document.querySelectorAll("[data-i18n]");
            elements.forEach(el => {
                const key = el.getAttribute("data-i18n");
                if (dict[key]) {
                    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
                        if (el.placeholder) el.placeholder = dict[key];
                    } else {
                        el.textContent = dict[key];
                    }
                }
            });
        }
    };

    return UniversalI18nHotSwap;
}));
