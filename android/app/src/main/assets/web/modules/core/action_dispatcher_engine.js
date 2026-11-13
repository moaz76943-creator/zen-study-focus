/**
 * DEEP FOCUS — Core Action Dispatcher & Ghost Button Terminator
 * Module: modules/core/action_dispatcher_engine.js
 * Version: v466.0.0
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.ActionDispatcherEngine = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const STORAGE_KEY_PRESETS = "zen_active_preset_v2";
    const STORAGE_KEY_GOALS = "zen_daily_goals_v2";

    const ActionDispatcherEngine = {
        isInitialized: false,
        activePreset: "study",
        customGoals: [],
        handlers: {},

        init: function () {
            if (this.isInitialized) return this;
            this.loadState();
            this.registerDefaultHandlers();
            this.bindAllButtons();
            this.setupEventDelegation();
            this.isInitialized = true;
            console.log("[ActionDispatcher] Initialized with 100% functional button binding.");
            return this;
        },

        loadState: function () {
            try {
                if (typeof localStorage !== "undefined") {
                    const saved = localStorage.getItem(STORAGE_KEY_PRESETS);
                    if (saved) this.activePreset = saved;
                    const savedGoals = localStorage.getItem(STORAGE_KEY_GOALS);
                    if (savedGoals) this.customGoals = JSON.parse(savedGoals);
                }
            } catch (e) {
                console.warn("[ActionDispatcher] State load fallback:", e);
            }
        },

        registerDefaultHandlers: function () {
            const self = this;
            this.register("domBtn-study", function () { self.applyPreset("study", 25 * 60, "مذاكرة مركزة (25:00)"); });
            this.register("domBtn-sport", function () { self.applyPreset("sport", 30 * 60, "تمارين واستراحة نشطة (30:00)"); });
            this.register("domBtn-read", function () { self.applyPreset("read", 20 * 60, "قراءة واستيعاب (20:00)"); });
            this.register("domBtn-work", function () { self.applyPreset("work", 50 * 60, "عمل عميق مكثف (50:00)"); });
            this.register("modelLongBtn", function () { self.applyPreset("long_break", 15 * 60, "استراحة طويلة (15:00)"); });

            this.register("homeQuick10", function () { self.setDurationSeconds(10 * 60, "10:00"); });
            this.register("homeQuick25", function () { self.setDurationSeconds(25 * 60, "25:00"); });
            this.register("homeQuick50", function () { self.setDurationSeconds(50 * 60, "50:00"); });

            this.register("qtStartButton", function (el) { self.toggleTimerExecution(el); });
            this.register("goalsEditButton", function () { self.openGoalsModal(); });
        },

        register: function (elementId, handlerFn) {
            if (typeof handlerFn === "function") {
                this.handlers[elementId] = handlerFn;
            }
        },

        applyPreset: function (presetKey, seconds, label) {
            this.activePreset = presetKey;
            try {
                if (typeof localStorage !== "undefined") {
                    localStorage.setItem(STORAGE_KEY_PRESETS, presetKey);
                }
            } catch (e) {}

            if (typeof document !== "undefined") {
                const presetBtns = ["domBtn-study", "domBtn-sport", "domBtn-read", "domBtn-work"];
                presetBtns.forEach(id => {
                    const btn = document.getElementById(id);
                    if (btn) {
                        if (id === "domBtn-" + presetKey) {
                            if (btn.classList) btn.classList.add("active-preset");
                            if (btn.style) {
                                btn.style.borderColor = "var(--accent, #3b82f6)";
                                btn.style.boxShadow = "0 0 12px rgba(59, 130, 246, 0.35)";
                            }
                        } else {
                            if (btn.classList) btn.classList.remove("active-preset");
                            if (btn.style) {
                                btn.style.borderColor = "rgba(255, 255, 255, 0.12)";
                                btn.style.boxShadow = "none";
                            }
                        }
                    }
                });
            }

            this.setDurationSeconds(seconds, label);
            this.triggerHapticFeedback();
        },

        setDurationSeconds: function (seconds, label) {
            if (typeof document !== "undefined") {
                const timerDisplay = document.getElementById("timerDisplay") || 
                    (typeof document.querySelector === "function" ? document.querySelector(".timer-time") : null);
                
                if (timerDisplay) {
                    const mins = Math.floor(seconds / 60);
                    const secs = seconds % 60;
                    const formatted = String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
                    timerDisplay.textContent = formatted;
                }

                const modeTitle = document.getElementById("modeTitle") || document.getElementById("currentSessionTitle");
                if (modeTitle && label) {
                    modeTitle.textContent = label;
                }
            }

            if (typeof window !== "undefined" && window.timerState) {
                window.timerState.remaining = seconds;
                window.timerState.total = seconds;
                window.timerState.mode = this.activePreset;
            }

            this.triggerHapticFeedback();
        },

        toggleTimerExecution: function (btn) {
            const hasWin = typeof window !== "undefined";
            const isRunning = hasWin && window.timerState && window.timerState.isRunning;
            let startBtn = btn;
            if (!startBtn && typeof document !== "undefined") {
                startBtn = document.getElementById("qtStartButton") || document.getElementById("startBtn");
            }

            if (isRunning) {
                if (hasWin && typeof window.pauseTimer === "function") {
                    window.pauseTimer();
                } else if (hasWin && window.timerState) {
                    window.timerState.isRunning = false;
                }
                if (startBtn) {
                    startBtn.textContent = "▶️ متابعة";
                    if (startBtn.setAttribute) startBtn.setAttribute("aria-label", "متابعة الجلسة");
                }
            } else {
                if (hasWin && typeof window.startTimer === "function") {
                    window.startTimer();
                } else if (hasWin && window.timerState) {
                    window.timerState.isRunning = true;
                }
                if (startBtn) {
                    startBtn.textContent = "⏸️ إيقاف مؤقت";
                    if (startBtn.setAttribute) startBtn.setAttribute("aria-label", "إيقاف مؤقت للجلسة");
                }
            }
            this.triggerHapticFeedback();
        },

        openGoalsModal: function () {
            if (typeof document === "undefined") return;

            let modal = document.getElementById("zenGoalsModal");
            if (!modal) {
                modal = document.createElement("div");
                modal.id = "zenGoalsModal";
                modal.style.position = "fixed";
                modal.style.top = "0";
                modal.style.left = "0";
                modal.style.width = "100vw";
                modal.style.height = "100vh";
                modal.style.background = "rgba(0, 0, 0, 0.85)";
                modal.style.backdropFilter = "blur(8px)";
                modal.style.zIndex = "9999";
                modal.style.display = "flex";
                modal.style.alignItems = "center";
                modal.style.justifyContent = "center";
                modal.style.padding = "20px";

                modal.innerHTML = '<div style="background: #111; border: 1px solid #333; border-radius: 16px; padding: 24px; max-width: 380px; width: 100%; color: #fff;"><h3 style="margin-top: 0;">🎯 أهداف اليوم</h3><div style="display: flex; gap: 8px; margin: 16px 0;"><input id="zenGoalInput" type="number" min="1" max="24" value="4" style="flex: 1; background: #222; border: 1px solid #444; border-radius: 8px; padding: 10px; color: #fff; text-align: center;"><button id="zenGoalSaveBtn" style="background: #3b82f6; border: none; border-radius: 8px; padding: 10px 16px; color: #fff; font-weight: bold;">حفظ</button></div><button id="zenGoalCloseBtn" style="width: 100%; background: #222; border: 1px solid #333; border-radius: 8px; padding: 10px; color: #aaa;">إغلاق</button></div>';
                document.body.appendChild(modal);

                document.getElementById("zenGoalSaveBtn").onclick = () => {
                    const val = document.getElementById("zenGoalInput").value;
                    const count = parseInt(val, 10) || 4;
                    const goalBtn = document.getElementById("goalsEditButton");
                    if (goalBtn) goalBtn.textContent = "🎯 " + count + " Goals";
                    try { localStorage.setItem(STORAGE_KEY_GOALS, JSON.stringify({ dailyTarget: count })); } catch (e) {}
                    modal.style.display = "none";
                    this.triggerHapticFeedback();
                };

                document.getElementById("zenGoalCloseBtn").onclick = () => {
                    modal.style.display = "none";
                };
            }
            modal.style.display = "flex";
            this.triggerHapticFeedback();
        },

        triggerHapticFeedback: function () {
            if (typeof navigator !== "undefined" && navigator.vibrate) {
                try { ((navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) ? navigator.vibrate(25) : false); } catch (e) {}
            }
        },

        bindAllButtons: function () {
            if (typeof document === "undefined") return;
            const self = this;
            Object.keys(this.handlers).forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.onclick = function (e) {
                        if (e && e.preventDefault) e.preventDefault();
                        self.handlers[id](el, e);
                    };
                    if (el.setAttribute) el.setAttribute("data-action-bound", "true");
                }
            });
        },

        setupEventDelegation: function () {
            if (typeof document === "undefined" || !document.body || !document.body.addEventListener) return;
            const self = this;
            document.body.addEventListener("click", function (e) {
                if (!e || !e.target || typeof e.target.closest !== "function") return;
                const target = e.target.closest("button, [role=button], .interactive-action");
                if (!target) return;
                const id = target.id;
                if (id && self.handlers[id]) {
                    self.handlers[id](target, e);
                }
            }, true);
        }
    };

    return ActionDispatcherEngine;
}));
