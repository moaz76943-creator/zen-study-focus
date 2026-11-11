/**
 * DEEP FOCUS — Universal i18n Hot-Swap Engine (V3 MutationObserver Edition)
 * Module: modules/i18n/universal_i18n_hotswap.js
 * Version: v509.0.0
 * Architecture: Dynamic JSON Locale Loader + Live MutationObserver + Icon Shield
 * Guarantees: 0 ghost buttons, instant translation of runtime elements, 0 page reloads.
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
    const LOADED_LOCALES = {};

    let observer = null;

    const UniversalI18nHotSwap = {
        currentLang: "ar",
        activeDictionary: {},
        isInitialized: false,

        init: function () {
            if (typeof document === "undefined" || this.isInitialized) return;

            const saved = localStorage.getItem(STORAGE_KEY_LANG);
            const initial = (saved && !EXCLUDED_CODES.has(saved.toLowerCase())) ? saved : "ar";
            this.applyLanguage(initial);
            this.setupMutationObserver();
            this.isInitialized = true;
            console.log("[UniversalI18nHotSwap V3] Active with MutationObserver & Icon Shield.");
        },

        isLanguageAllowed: function (code) {
            if (!code) return false;
            return !EXCLUDED_CODES.has(code.toLowerCase());
        },

        setupMutationObserver: function () {
            if (observer || typeof MutationObserver === "undefined") return;

            observer = new MutationObserver((mutations) => {
                if (!this.activeDictionary || Object.keys(this.activeDictionary).length === 0) return;

                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // ELEMENT_NODE
                            if (node.hasAttribute("data-i18n")) {
                                this.translateElement(node, this.activeDictionary);
                            }
                            const children = node.querySelectorAll ? node.querySelectorAll("[data-i18n]") : [];
                            children.forEach(el => this.translateElement(el, this.activeDictionary));
                        }
                    });
                });
            });

            observer.observe(document.body, { childList: true, subtree: true });
            console.log("[UniversalI18nHotSwap] MutationObserver watching for dynamic DOM additions.");
        },

        loadLocale: function (code, callback) {
            if (!this.isLanguageAllowed(code)) return;

            if (LOADED_LOCALES[code]) {
                this.activeDictionary = LOADED_LOCALES[code];
                if (callback) callback(LOADED_LOCALES[code]);
                return;
            }

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
                this.fallbackToEnglish(callback);
            };
            xhr.onerror = () => this.fallbackToEnglish(callback);
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
            try { localStorage.setItem(STORAGE_KEY_LANG, code); } catch (e) {}

            this.loadLocale(code, (dict) => {
                const dir = dict.dir || "ltr";
                document.documentElement.setAttribute("dir", dir);
                document.documentElement.setAttribute("lang", code);

                this.sweepDom(dict);
            });
        },

        translateElement: function (el, dict) {
            const key = el.getAttribute("data-i18n");
            if (!key || !dict[key]) return;

            const val = dict[key];

            // 1. Inputs & Textareas
            if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
                if (el.placeholder !== undefined) el.placeholder = val;
                return;
            }

            // 2. Icon Shield: Preserves leading emojis/icons if present
            const iconMatch = el.textContent ? el.textContent.match(/^([\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|[🌀-🧿]|✨|🎯|📚|🏋️|📖|💻|🌐)\s*/u) : null;
            if (iconMatch) {
                el.textContent = iconMatch[0] + val;
            } else {
                el.textContent = val;
            }

            // 3. Update Title & Aria-Label for accessibility
            if (el.hasAttribute("title")) el.setAttribute("title", val);
            if (el.hasAttribute("aria-label")) el.setAttribute("aria-label", val);
        },

        sweepDom: function (dict) {
            if (!dict) dict = this.activeDictionary;
            if (!dict || Object.keys(dict).length === 0) return;

            const elements = document.querySelectorAll("[data-i18n]");
            elements.forEach(el => this.translateElement(el, dict));
        }
    };

    return UniversalI18nHotSwap;
}));
