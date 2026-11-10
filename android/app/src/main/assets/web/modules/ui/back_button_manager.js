/**
 * DEEP FOCUS — Hardware Back Button & Modal Shield
 * Module: modules/ui/back_button_manager.js
 * Version: v470.0.0
 * Purpose: Intercept Android physical/gesture back button to close modals instead of exiting app.
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.BackButtonManager = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const modalStack = [];

    const BackButtonManager = {
        init: function () {
            if (typeof window === "undefined" || !window.history) return;
            
            window.addEventListener("popstate", (e) => {
                if (modalStack.length > 0) {
                    const topModal = modalStack.pop();
                    if (topModal && typeof topModal.close === "function") {
                        topModal.close();
                    } else if (topModal && topModal.style) {
                        topModal.style.display = "none";
                    }
                }
            });

            console.log("[BackButtonManager] Shielded against accidental app exit on back press.");
        },

        registerModal: function (modalElement, closeCallback) {
            if (typeof window === "undefined" || !window.history) return;
            window.history.pushState({ modalOpen: true }, "");
            modalStack.push({
                element: modalElement,
                close: closeCallback || function () {
                    if (modalElement && modalElement.style) modalElement.style.display = "none";
                }
            });
        }
    };

    return BackButtonManager;
}));
