/**
 * DEEP FOCUS — Accidental Session Abort Shield & Partial History Saver
 * Module: modules/core/session_abort_shield.js
 * Version: v491.0.0
 * Architecture: Active Session Guard + Partial Duration Credit + AMOLED Dialog
 * Compliance: 100% Offline-First, Zero PII, Strict Western Digits (0-9).
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.SessionAbortShield = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const MIN_ELAPSED_FOR_GUARD_SECS = 120; // Guard active after 2 minutes

    const SessionAbortShield = {
        isInitialized: false,

        init: function () {
            if (typeof window === "undefined" || this.isInitialized) return;
            this.interceptResetButtons();
            this.isInitialized = true;
            console.log("[AbortShield] Active with partial focus preservation.");
        },

        interceptResetButtons: function () {
            document.addEventListener("click", (e) => {
                const resetBtn = e.target.closest("#resetBtn, .session-reset-action, [data-action=reset]");
                if (resetBtn) {
                    if (window.HighPrecisionTimerEngine && window.HighPrecisionTimerEngine.isRunning) {
                        const elapsed = (window.HighPrecisionTimerEngine.durationSeconds || 1500) - 
                                        (window.HighPrecisionTimerEngine.remainingSeconds || 0);

                        if (elapsed >= MIN_ELAPSED_FOR_GUARD_SECS) {
                            e.stopImmediatePropagation();
                            e.preventDefault();
                            this.showConfirmationSheet(elapsed);
                        }
                    }
                }
            }, true);
        },

        showConfirmationSheet: function (elapsedSeconds) {
            const existing = document.getElementById("zenAbortSheetOverlay");
            if (existing) existing.remove();

            const elapsedMins = Math.floor(elapsedSeconds / 60);

            const overlay = document.createElement("div");
            overlay.id = "zenAbortSheetOverlay";
            overlay.style.position = "fixed";
            overlay.style.top = "0";
            overlay.style.left = "0";
            overlay.style.width = "100vw";
            overlay.style.height = "100vh";
            overlay.style.background = "rgba(0, 0, 0, 0.85)";
            overlay.style.backdropFilter = "blur(8px)";
            overlay.style.zIndex = "99999";
            overlay.style.display = "flex";
            overlay.style.alignItems = "center";
            overlay.style.justifyContent = "center";
            overlay.style.padding = "20px";

            overlay.innerHTML = `
                <div style="background: #0f172a; border: 1px solid #334155; border-radius: 18px; padding: 24px; max-width: 360px; width: 100%; color: #fff; box-shadow: 0 16px 36px rgba(0,0,0,0.8);">
                    <h3 style="margin-top: 0; font-size: 1.15rem; color: #f8fafc;">🛡️ هل تريد إنهاء الجلسة؟</h3>
                    <p style="color: #94a3b8; font-size: 0.9rem; line-height: 1.5; margin: 12px 0 20px;">
                        أنجزت <strong style="color: #38bdf8;">${elapsedMins} دقيقة</strong> من التركيز المتواصل. هل تود حفظ ما تم إنجازه أم متابعة الجلسة؟
                    </p>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <button id="zenAbortKeepFocus" style="background: #3b82f6; border: none; border-radius: 10px; padding: 12px; color: #fff; font-weight: 700; cursor: pointer; min-height: 48px;">
                            متابعة التركيز
                        </button>
                        <button id="zenAbortSavePartial" style="background: #1e293b; border: 1px solid #475569; border-radius: 10px; padding: 12px; color: #e2e8f0; font-weight: 600; cursor: pointer; min-height: 48px;">
                            إنهاء وحفظ ${elapsedMins} دقيقة
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            document.getElementById("zenAbortKeepFocus").onclick = () => {
                overlay.remove();
            };

            document.getElementById("zenAbortSavePartial").onclick = () => {
                this.savePartialSession(elapsedSeconds);
                if (window.HighPrecisionTimerEngine) {
                    window.HighPrecisionTimerEngine.pause();
                }
                overlay.remove();
            };

            if (typeof navigator !== "undefined" && navigator.vibrate) try { ((navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) ? navigator.vibrate([30, 40, 30]) : false); } catch (e) {}
        },

        savePartialSession: function (elapsedSecs) {
            try {
                const history = JSON.parse(localStorage.getItem("zen_focus_history_v1") || "[]");
                history.push({
                    timestamp: Date.now(),
                    durationSeconds: elapsedSecs,
                    isPartial: true,
                    mode: (window.HighPrecisionTimerEngine && window.HighPrecisionTimerEngine.activePreset) || "study"
                });
                localStorage.setItem("zen_focus_history_v1", JSON.stringify(history));
                console.log("[AbortShield] Partial focus credited:", elapsedSecs, "s");
            } catch (e) {}
        }
    };

    return SessionAbortShield;
}));
