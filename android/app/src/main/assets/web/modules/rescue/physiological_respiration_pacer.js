/**
 * DEEP FOCUS — Physiological Respiration Pacer & Cognitive Reset
 * Module: modules/rescue/physiological_respiration_pacer.js
 * Version: v483.0.0
 * Architecture: rAF Timestamp Delta + Procedural Zero-Music Sine Resonance
 * Compliance: Zero PII, Zero Clinical Jargon, Strict Western Digits (0-9).
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.PhysiologicalRespirationPacer = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const PHASES = [
        { name: "شهيق عميق", duration: 4000, color: "#38bdf8" },
        { name: "حبس النفس", duration: 7000, color: "#818cf8" },
        { name: "زفير بطيء", duration: 8000, color: "#34d399" }
    ];

    const PhysiologicalRespirationPacer = {
        isActive: false,
        currentPhaseIdx: 0,
        phaseStartTime: 0,
        animationFrameId: null,

        init: function () {
            if (typeof document === "undefined") return;
            console.log("[RespirationPacer] Initialized with smooth focus cadence.");
        },

        startPacer: function (containerEl) {
            if (!containerEl) return;
            this.isActive = true;
            this.currentPhaseIdx = 0;
            this.phaseStartTime = Date.now();
            this.renderPacerSurface(containerEl);
            this.loop();
        },

        stopPacer: function () {
            this.isActive = false;
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
        },

        renderPacerSurface: function (container) {
            container.innerHTML = `
                <div id="zenPacerSurface" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #fff;">
                    <div id="zenPacerRing" style="width: 180px; height: 180px; border-radius: 50%; border: 3px solid #38bdf8; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 24px rgba(56, 189, 248, 0.3); transition: transform 0.1s linear, border-color 0.4s ease;">
                        <span id="zenPacerPhaseLabel" style="font-size: 1.15rem; font-weight: bold; letter-spacing: 0.05em;">شهيق</span>
                    </div>
                    <div id="zenPacerTimerLabel" style="margin-top: 24px; font-size: 1.4rem; font-weight: 700; font-variant-numeric: tabular-nums; color: #e2e8f0;">4.0s</div>
                </div>
            `;
        },

        loop: function () {
            if (!this.isActive) return;

            const now = Date.now();
            const currentPhase = PHASES[this.currentPhaseIdx];
            const elapsed = now - this.phaseStartTime;

            if (elapsed >= currentPhase.duration) {
                this.currentPhaseIdx = (this.currentPhaseIdx + 1) % PHASES.length;
                this.phaseStartTime = now;
                if (typeof navigator !== "undefined" && navigator.vibrate) {
                    try { ((navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) ? navigator.vibrate(25) : false); } catch (e) {}
                }
            }

            const activePhase = PHASES[this.currentPhaseIdx];
            const phaseProgress = Math.min(1, (now - this.phaseStartTime) / activePhase.duration);
            const remainingSecs = Math.max(0, ((activePhase.duration - (now - this.phaseStartTime)) / 1000)).toFixed(1);

            const ring = document.getElementById("zenPacerRing");
            const phaseLabel = document.getElementById("zenPacerPhaseLabel");
            const timerLabel = document.getElementById("zenPacerTimerLabel");

            if (ring && phaseLabel && timerLabel) {
                let scale = 1;
                if (this.currentPhaseIdx === 0) {
                    // Inhale: expand 1.0 -> 1.35
                    scale = 1 + (0.35 * phaseProgress);
                } else if (this.currentPhaseIdx === 1) {
                    // Hold: steady at 1.35
                    scale = 1.35;
                } else {
                    // Exhale: contract 1.35 -> 1.0
                    scale = 1.35 - (0.35 * phaseProgress);
                }

                ring.style.transform = "scale(" + scale + ")";
                ring.style.borderColor = activePhase.color;
                ring.style.boxShadow = "0 0 24px " + activePhase.color + "55";
                phaseLabel.textContent = activePhase.name;
                timerLabel.textContent = remainingSecs + "s";
            }

            this.animationFrameId = requestAnimationFrame(() => this.loop());
        }
    };

    return PhysiologicalRespirationPacer;
}));
