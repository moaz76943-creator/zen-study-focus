/**
 * DEEP FOCUS — Unified Studio Navigator & Bottom Drawer + Zen Studio Launcher
 * Module: modules/ui/studio_navigator_drawer.js
 * Version: v470.0.0
 * Architecture: Clean Floating Trigger + AMOLED Bottom Sheet + Tactile Touch
 * Consolidates all 10 studios into a single, elegant bottom drawer.
 *
 * v470.0.0 — Studio Launcher bridge:
 *   Before this version every drawer card was a dead button: launchStudio()
 *   only searched for non-existent `<id>StudioModal` / `<id>Modal` elements
 *   and fell back to a toast. The embedded StudioLauncher factory now maps
 *   each of the 10 studios to its real launch path or engine API:
 *     sanctuary  → Botanical Zen Garden (Pillar 9)
 *     theme      → AMOLED Theme Studio modal (true-black surfaces)
 *     wrapped    → Study Wrapped modal compiled from recorded sessions
 *     pods       → Local Study Pods (Pillar 8)
 *     rescue     → Exam-Eve Rescue Protocol modal
 *     leaderboard→ Personal Bests & Ghost Pacer modal
 *     contracts  → Focus Commitment Contracts modal
 *     i18n       → built-in language picker
 *     accessibility → Universal Accessibility Studio modal
 *     performance→ High-Performance 120Hz Engine (Pillar 10)
 *   Launcher DOM uses createElement/textContent only — zero innerHTML.
 *   Every user string is handled as text (no HTML injection surface).
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        var api = factory();
        root.StudioNavigatorDrawer = api.StudioNavigatorDrawer;
        root.StudioLauncher = api.StudioLauncher;
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    // =====================================================================
    // SECTION 1: STUDIO LAUNCHER (10-of-10 bridge, DOM-safe, zero innerHTML)
    // =====================================================================

    const MODAL_ID = "dfStudioLauncherModal";
    const TITLE_ID = "dfStudioLauncherTitle";
    const BODY_ID = "dfStudioLauncherBody";

    function el(tag, text) {
        const node = (typeof document !== "undefined") ? document.createElement(tag) : null;
        if (node && text != null) node.textContent = String(text);
        return node;
    }

    function close() {
        if (typeof document === "undefined") return;
        const ov = document.getElementById(MODAL_ID);
        if (ov) ov.classList.remove("open");
    }

    function ensureModal() {
        if (typeof document === "undefined") return null;
        let ov = document.getElementById(MODAL_ID);
        if (ov) return ov;
        ov = el("div");
        ov.id = MODAL_ID;
        ov.className = "modal-overlay";
        ov.setAttribute("role", "dialog");
        ov.setAttribute("aria-modal", "true");
        ov.setAttribute("aria-labelledby", TITLE_ID);
        const card = el("div");
        card.className = "modal-card";
        const head = el("div");
        head.className = "modal-head";
        const title = el("span", "✦ Studio");
        title.id = TITLE_ID;
        const closeBtn = el("button", "✕");
        closeBtn.type = "button";
        closeBtn.className = "task-mini-sel";
        closeBtn.id = "dfStudioLauncherClose";
        closeBtn.setAttribute("aria-label", "Close");
        head.appendChild(title);
        head.appendChild(closeBtn);
        const body = el("div");
        body.id = BODY_ID;
        card.appendChild(head);
        card.appendChild(body);
        ov.appendChild(card);
        document.body.appendChild(ov);
        closeBtn.onclick = close;
        ov.addEventListener("click", function (event) {
            if (event && event.target === ov) close();
        });
        return ov;
    }

    function openCard(title, buildBody) {
        const ov = ensureModal();
        if (!ov) return;
        const titleEl = document.getElementById(TITLE_ID);
        if (titleEl) titleEl.textContent = title;
        const bodyEl = document.getElementById(BODY_ID);
        bodyEl.textContent = "";
        if (typeof buildBody === "function") buildBody(bodyEl);
        ov.classList.add("open");
    }

    function notify(message) {
        if (typeof window !== "undefined" && typeof window.dfSafeNotify === "function") {
            window.dfSafeNotify(message);
        } else if (typeof console !== "undefined" && console.info) {
            console.info("[StudioLauncher]", message);
        }
    }

    function toastUnavailable(name) {
        notify(name + " is unavailable in this build.");
    }

    function tryOpen(fnName, subTab) {
        const fn = typeof window !== "undefined" ? window[fnName] : undefined;
        if (typeof fn !== "function") return false;
        try {
            if (subTab === undefined) fn(); else fn(subTab);
            return true;
        } catch (e) {
            if (typeof window !== "undefined" && typeof window.__dfRecordError === "function") {
                window.__dfRecordError("studioLauncher." + fnName, e);
            }
            return false;
        }
    }

    function cfgSessions() {
        if (typeof cfg !== "undefined" && cfg && Array.isArray(cfg.sessionHistory)) {
            return cfg.sessionHistory;
        }
        return [];
    }

    function engine(name) {
        if (typeof window === "undefined") return null;
        return window[name] || null;
    }

    function row(label, value) {
        const rowNode = el("div");
        rowNode.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;";
        const labelSpan = el("span", label);
        labelSpan.style.cssText = "font-size:0.8rem;color:var(--text-muted);font-weight:700;";
        const valueSpan = el("strong", value);
        valueSpan.style.cssText = "font-size:0.9rem;";
        rowNode.appendChild(labelSpan);
        rowNode.appendChild(valueSpan);
        return rowNode;
    }

    function para(text) {
        const p = el("p", text);
        p.style.cssText = "font-size:0.8rem;color:var(--text-muted);margin:0 0 10px 0;";
        return p;
    }

    const LAUNCHERS = {

        // 1. Sanctuary Garden & Starlight → Pillar 9 Botanical Zen Garden Studio
        sanctuary: function () {
            if (tryOpen("dfOpenBotanicalZenGardenStudio")) return;
            toastUnavailable("Zen Botanical Sanctuary");
        },

        // 2. AMOLED Theme Studio → in-place modal using the theme engine
        theme: function () {
            const studio = engine("dfAmoledThemeStudio");
            const currentId = studio && studio.currentTheme ? studio.currentTheme.id : "emerald_obsidian";
            openCard("🎨 AMOLED Theme Studio", function (bodyEl) {
                bodyEl.appendChild(para("True-black AMOLED surfaces with melatonin-friendly warm tones and zero battery bleed."));
                const themes = [
                    { id: "emerald_obsidian", label: "Emerald Obsidian", hint: "Deep green accent · 9.8% lit pixels", apply: "dfApplyEmeraldObsidianTheme" },
                    { id: "amber_night", label: "Amber Night Scholar", hint: "Warm amber accent · zero blue light", apply: "dfApplyAmberNightScholarTheme" },
                    { id: "sapphire_space", label: "Sapphire Deep Space", hint: "Cobalt accent · 11.2% lit pixels", apply: "dfApplySapphireDeepSpaceTheme" },
                    { id: "monochrome_paper", label: "Pure Monochrome Paper", hint: "Zero-chroma mono · 7.4% lit pixels", apply: "dfApplyPureMonochromePaperTheme" }
                ];
                themes.forEach(function (t) {
                    const btn = el("button", t.label + (t.id === currentId ? " ✓" : ""));
                    btn.type = "button";
                    btn.className = "mbtn-sec";
                    btn.setAttribute("data-theme", t.id);
                    btn.setAttribute("aria-pressed", String(t.id === currentId));
                    btn.style.cssText = "display:flex;flex-direction:column;align-items:flex-start;gap:4px;width:100%;margin-bottom:8px;" +
                        (t.id === currentId ? "border:1.5px solid #2563eb;" : "border:1px solid #e2e8f0;");
                    const hint = el("small", t.hint);
                    hint.style.cssText = "font-size:0.7rem;color:var(--text-muted);";
                    btn.appendChild(hint);
                    btn.addEventListener("click", function () {
                        if (studio && typeof studio[t.apply] === "function") studio[t.apply]();
                        else if (studio && typeof studio.dfPersistSelectedThemeConfig === "function") studio.dfPersistSelectedThemeConfig();
                        close();
                        notify("Theme applied");
                    });
                    bodyEl.appendChild(btn);
                });
                const autoBtn = el("button", "🕘 Auto (Day/Night)");
                autoBtn.type = "button";
                autoBtn.className = "mbtn-pri";
                autoBtn.style.cssText = "width:100%;margin-top:4px;";
                autoBtn.addEventListener("click", function () {
                    if (studio && typeof studio.dfAutoSwitchThemeByTimeOfDay === "function") {
                        studio.dfAutoSwitchThemeByTimeOfDay(new Date().getHours());
                    }
                    close();
                    notify("Theme synchronized with time of day");
                });
                bodyEl.appendChild(autoBtn);
            });
        },

        // 3. Study Wrapped & Stats → compiled from real recorded sessions
        wrapped: function () {
            const wrapped = engine("dfStudyWrappedStory");
            const sessions = cfgSessions();
            openCard("📊 Study Wrapped", function (bodyEl) {
                bodyEl.appendChild(para("Your week in focus: hours, top subject and peak chronotype window — computed from recorded sessions."));
                const out = el("div");
                out.id = "dfWrappedResult";
                out.style.cssText = "font-size:0.82rem;margin-bottom:10px;";
                const btn = el("button", "✦ Generate Wrapped");
                btn.type = "button";
                btn.className = "mbtn-pri";
                btn.id = "dfWrappedCompileBtn";
                btn.addEventListener("click", function () {
                    if (!wrapped || typeof wrapped.dfCompileWeeklyStudyWrappedData !== "function") {
                        out.textContent = "Wrapped engine is unavailable in this build.";
                        return;
                    }
                    try {
                        const data = wrapped.dfCompileWeeklyStudyWrappedData(sessions.map(function (s) {
                            return {
                                durationMinutes: Number(s.minutes) || Number(s.durationMinutes) || 0,
                                subject: String(s.subject || s.domain || "Study"),
                                timestamp: s.date || s.timestamp || ""
                            };
                        }), []);
                        const badge = el("div", "Total focus: " + data.totalFocusHours + "h · Top subject: " + data.topSubject + " · Peak hour: " + String(data.peakChronotypeHour).padStart(2, "0") + ":00");
                        badge.style.cssText = "background:var(--emerald-soft);border-radius:12px;padding:10px 12px;color:var(--emerald);font-weight:800;";
                        out.textContent = "";
                        out.appendChild(badge);
                    } catch (e) {
                        out.textContent = "Wrapped could not be generated. Record some focus sessions first.";
                    }
                });
                bodyEl.appendChild(out);
                bodyEl.appendChild(btn);
            });
        },

        // 4. Local Serverless Pods → Pillar 8 Study Pod Studio
        pods: function () {
            if (tryOpen("dfOpenStudyPodStudio")) return;
            toastUnavailable("Local Serverless Pods");
        },

        // 5. Exam-Eve Rescue Protocol → activation modal
        rescue: function () {
            const rescue = engine("dfExamEveRescueProtocol");
            openCard("🛡️ Exam-Eve Rescue", function (bodyEl) {
                bodyEl.appendChild(para("Strict exam-eve mode: muted non-critical metrics, rapid-fire sprints and 11 PM sleep guard."));
                const label = el("label", "Exam subject");
                label.setAttribute("for", "dfRescueSubject");
                label.style.cssText = "display:block;font-size:0.76rem;font-weight:800;margin-bottom:6px;";
                const input = el("input");
                input.className = "modal-inp";
                input.id = "dfRescueSubject";
                input.placeholder = "e.g. Integration by Parts";
                input.setAttribute("autocomplete", "off");
                const status = el("div");
                status.id = "dfRescueStatus";
                status.style.cssText = "font-size:0.78rem;margin-top:8px;";
                const activate = el("button", "🛡️ Activate Exam-Eve Rescue");
                activate.type = "button";
                activate.className = "mbtn-pri";
                activate.id = "dfRescueActivateBtn";
                activate.addEventListener("click", function () {
                    if (!rescue || typeof rescue.dfActivateExamEveFocusProtocol !== "function") {
                        status.textContent = "Rescue engine is unavailable in this build.";
                        return;
                    }
                    const subject = input.value || "Comprehensive Exam";
                    try {
                        rescue.dfActivateExamEveFocusProtocol(subject);
                        status.textContent = "";
                        const ok = el("span", "Exam-Eve Rescue active for \"" + subject + "\".");
                        ok.style.cssText = "color:var(--emerald);font-weight:800;";
                        status.appendChild(ok);
                    } catch (e) {
                        status.textContent = "Could not activate rescue protocol.";
                    }
                });
                bodyEl.appendChild(label);
                bodyEl.appendChild(input);
                bodyEl.appendChild(activate);
                bodyEl.appendChild(status);
                if (!rescue || typeof rescue.dfActivateExamEveFocusProtocol !== "function") {
                    status.textContent = "Rescue engine is unavailable in this build.";
                }
            });
        },

        // 6. Personal Best & Ghost Pacer → live PB stats modal
        leaderboard: function () {
            const pb = engine("dfPersonalBestLeaderboard");
            openCard("🏆 Personal Bests", function (bodyEl) {
                bodyEl.appendChild(para("Personal records — beat yesterday, then beat last week."));
                if (pb && pb.records) {
                    const r = pb.records;
                    bodyEl.appendChild(row("Best day (minutes)", String((r.bestDailyMinutes || {}).value || 0) + " min"));
                    bodyEl.appendChild(row("Best week (hours)", String((r.bestWeeklyHours || {}).value || 0) + " h"));
                    bodyEl.appendChild(row("Longest unbroken session", String((r.longestUnbrokenSessionMinutes || {}).value || 0) + " min"));
                    bodyEl.appendChild(row("Highest flashcard streak", String((r.highestFlashcardStreak || {}).value || 0) + " cards"));
                    if (r.awardedBadges && r.awardedBadges.length) {
                        bodyEl.appendChild(row("Badges earned", String(r.awardedBadges.length)));
                    }
                } else {
                    const empty = el("div", "No personal records yet. Complete focus sessions to set them.");
                    empty.style.cssText = "font-size:0.8rem;color:var(--text-muted);margin-bottom:10px;";
                    bodyEl.appendChild(empty);
                }
                const todayMins = (typeof cfg !== "undefined" && cfg && cfg.todayMins) || 0;
                const btn = el("button", "✓ Log today: " + String(todayMins) + " min");
                btn.type = "button";
                btn.className = "mbtn-pri";
                btn.addEventListener("click", function () {
                    if (!pb || typeof pb.dfTrackPersonalBestDailyMinutes !== "function") {
                        close();
                        notify("Personal bests engine is unavailable in this build.");
                        return;
                    }
                    const minutes = Number(todayMins);
                    try {
                        const result = pb.dfTrackPersonalBestDailyMinutes(minutes);
                        close();
                        notify(result && result.isNewPersonalRecord ? "New personal best! 🎉" : "Today logged: " + minutes + " min");
                    } catch (e) {
                        close();
                        notify("Could not log today.");
                    }
                });
                bodyEl.appendChild(btn);
            });
        },

        // 7. Focus Commitment Contracts → draft modal
        contracts: function () {
            const contracts = engine("dfFocusCommitmentContracts");
            const active = contracts && contracts.activeContract;
            openCard("📜 Focus Commitments", function (bodyEl) {
                bodyEl.appendChild(para("Cryptographic-style focus commitment: weekly target hours and a 7-day streak contract."));
                if (active && active.status === "active") {
                    const badge = el("div", "Active: " + active.weeklyHoursTarget + "h/week · " + active.subject);
                    badge.style.cssText = "background:var(--emerald-soft);color:var(--emerald);border-radius:12px;padding:10px 12px;font-size:0.78rem;font-weight:800;margin-bottom:10px;";
                    bodyEl.appendChild(badge);
                }
                const subjLabel = el("label", "Subject");
                subjLabel.setAttribute("for", "dfContractSubject");
                subjLabel.style.cssText = "display:block;font-size:0.76rem;font-weight:800;margin-bottom:6px;";
                const subjInput = el("input");
                subjInput.className = "modal-inp";
                subjInput.id = "dfContractSubject";
                subjInput.placeholder = "e.g. Comprehensive STEM Mastery";
                subjInput.setAttribute("autocomplete", "off");
                const hoursLabel = el("label", "Weekly target hours");
                hoursLabel.setAttribute("for", "dfContractHours");
                hoursLabel.style.cssText = "display:block;font-size:0.76rem;font-weight:800;margin:6px 0;";
                const hoursInput = el("input");
                hoursInput.className = "modal-inp";
                hoursInput.id = "dfContractHours";
                hoursInput.type = "number";
                hoursInput.min = "1";
                hoursInput.max = "80";
                hoursInput.value = "20";
                const btn = el("button", "📜 Draft Commitment");
                btn.type = "button";
                btn.className = "mbtn-pri";
                btn.addEventListener("click", function () {
                    if (!contracts || typeof contracts.dfDraftPersonalFocusCommitment !== "function") {
                        notify("Commitments engine is unavailable in this build.");
                        return;
                    }
                    const subject = subjInput.value || "General Studies";
                    const hours = parseInt(hoursInput.value, 10) || 20;
                    try {
                        contracts.dfDraftPersonalFocusCommitment(hours, subject);
                        close();
                        notify("Commitment drafted: " + hours + "h/week");
                    } catch (e) {
                        close();
                        notify("Could not draft commitment.");
                    }
                });
                bodyEl.appendChild(subjLabel);
                bodyEl.appendChild(subjInput);
                bodyEl.appendChild(hoursLabel);
                bodyEl.appendChild(hoursInput);
                bodyEl.appendChild(btn);
            });
        },

        // 8. Global Languages Engine → open the built-in language picker
        i18n: function () {
            if (typeof window !== "undefined" && typeof window.openLanguageModal === "function") {
                window.openLanguageModal();
                return;
            }
            toastUnavailable("Global Languages");
        },

        // 9. Universal Accessibility Studio → accessibility controls modal
        accessibility: function () {
            const a11y = engine("dfUniversalAccessibilityStudio");
            const current = a11y && a11y.fontScaleRatio ? a11y.fontScaleRatio : 1.0;
            const setScale = function (ratio) {
                if (a11y && typeof a11y.dfScaleDynamicTypographyUpTo200Pct === "function") {
                    try { a11y.dfScaleDynamicTypographyUpTo200Pct(ratio); } catch (e) { /* engine unavailable */ }
                }
                notify("Typography scale: " + Math.round(ratio * 100) + "%");
            };
            openCard("♿ Universal Accessibility", function (bodyEl) {
                bodyEl.appendChild(para("WCAG AAA contrast, colorblind-safe palettes and dynamic typography up to 200%."));
                const fontRow = el("div");
                fontRow.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;";
                const fontButtons = [
                    { label: "A−", run: function () { setScale(Math.max(0.8, current - 0.2)); } },
                    { label: "100%", run: function () { setScale(1.0); } },
                    { label: "A+", run: function () { setScale(Math.min(2.0, current + 0.2)); } },
                    { label: "200%", run: function () { setScale(2.0); } }
                ];
                fontButtons.forEach(function (b) {
                    const btn = el("button", b.label);
                    btn.type = "button";
                    btn.className = "delta-chip";
                    btn.addEventListener("click", b.run);
                    fontRow.appendChild(btn);
                });
                bodyEl.appendChild(fontRow);
                const paletteRow = el("div");
                paletteRow.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;";
                const paletteButtons = [
                    { label: "Deuteranopia 🛡️", run: function () {
                        if (a11y && typeof a11y.dfApplyDeuteranopiaSafePalette === "function") {
                            try { a11y.dfApplyDeuteranopiaSafePalette(); } catch (e) { /* engine unavailable */ }
                        }
                        notify("Deuteranopia-safe palette applied");
                    } },
                    { label: "Protanopia 🛡️", run: function () {
                        if (a11y && typeof a11y.dfApplyProtanopiaAndTritanopiaSafe === "function") {
                            try { a11y.dfApplyProtanopiaAndTritanopiaSafe("protanopia"); } catch (e) { /* engine unavailable */ }
                        }
                        notify("Protanopia-safe palette applied");
                    } }
                ];
                paletteButtons.forEach(function (b) {
                    const btn = el("button", b.label);
                    btn.type = "button";
                    btn.className = "mbtn-sec";
                    btn.style.cssText = "flex:1 1 45%;";
                    btn.addEventListener("click", b.run);
                    paletteRow.appendChild(btn);
                });
                bodyEl.appendChild(paletteRow);
            });
        },

        // 10. 120Hz Performance Engine → Pillar 10 High-Performance Studio
        performance: function () {
            if (tryOpen("dfOpenHighPerformanceStudio")) return;
            toastUnavailable("120Hz Performance Engine");
        }
    };

    function open(studioId) {
        const id = String(studioId || "").toLowerCase().trim();
        const launcher = LAUNCHERS[id];
        if (!launcher) {
            notify("Unknown studio: " + id);
            return false;
        }
        try {
            launcher();
            return true;
        } catch (e) {
            if (typeof window !== "undefined" && typeof window.__dfRecordError === "function") {
                window.__dfRecordError("studioLauncher.open." + id, e);
            }
            notify("Studio could not be opened.");
            return false;
        }
    }

    // Close on Escape
    if (typeof document !== "undefined") {
        document.addEventListener("keydown", function (event) {
            if (event && event.key === "Escape") {
                const ov = document.getElementById(MODAL_ID);
                if (ov && ov.classList.contains("open")) close();
            }
        });
    }

    const StudioLauncher = Object.freeze({ open: open, LAUNCHERS: Object.freeze(LAUNCHERS), close: close });

    // =====================================================================
    // SECTION 2: ORIGINAL STUDIO NAVIGATOR DRAWER (unchanged behavior,
    // launchStudio now bridged through StudioLauncher)
    // =====================================================================

    const studiosList = [
        { id: "sanctuary",    name: "المحمية التفاعلية",     nameEn: "Interactive Sanctuary",   desc: "Sanctuary Garden & Starlight",      icon: "🌌" },
        { id: "theme",        name: "استوديو الثيمات AMOLED", nameEn: "AMOLED Theme Studio",     desc: "True Black & Sunset Auto",          icon: "🎨" },
        { id: "wrapped",      name: "قصة المذاكرة السنوية",  nameEn: "Annual Study Wrapped",    desc: "Study Wrapped & Stats",             icon: "📊" },
        { id: "pods",         name: "غرف المذاكرة المحلية",  nameEn: "Local Study Pods",        desc: "Local Serverless Pods",             icon: "👥" },
        { id: "rescue",       name: "بروتوكول ليلة الامتحان", nameEn: "Exam-Eve Rescue",         desc: "Exam-Eve Rescue & Sleep Cutoff",    icon: "🛡️" },
        { id: "leaderboard",  name: "لوحة الأرقام القياسية", nameEn: "Records Leaderboard",     desc: "Personal Best & Ghost Pacer",       icon: "🏆" },
        { id: "contracts",    name: "عقود الالتزام بالتركيز", nameEn: "Focus Contracts",         desc: "Cryptographic Commitment",          icon: "📜" },
        { id: "i18n",         name: "محرك اللغات العالمي",   nameEn: "World Language Engine",   desc: "10 Languages Safe i18n",            icon: "🌐" },
        { id: "accessibility",name: "إمكانية الوصول الشاملة", nameEn: "Universal Accessibility", desc: "TalkBack AAA & Colorblind",         icon: "♿" },
        { id: "performance",  name: "محرك الأداء 120Hz",     nameEn: "120Hz Performance Engine",desc: "WebWorkers & 8.3ms Frames",         icon: "⚡" }
    ];
    // Arabic studio names only for Arabic UI; every other language gets English.
    // Computed lazily at render time so requiring this module in Node is safe.
    function studioIsAr() {
        return typeof document !== "undefined" &&
            (document.documentElement.lang || "en").toLowerCase().indexOf("ar") === 0;
    }

    const StudioNavigatorDrawer = {
        isOpen: false,

        init: function () {
            if (typeof document === "undefined") return;
            this.injectFloatingTrigger();
            this.injectDrawerSheet();
            console.log("[StudioNavigator] Initialized with 10 consolidated studios.");
        },

        injectFloatingTrigger: function () {
            if (document.getElementById("zenStudioTriggerPill")) return;

            const pill = document.createElement("button");
            pill.id = "zenStudioTriggerPill";
            pill.className = "interactive-action";
            pill.setAttribute("aria-label", (document.documentElement.lang || "").toLowerCase().indexOf("ar") === 0 ? "فتح لوحة الاستوديوهات والأدوات" : "Open studios and tools panel");
            pill.style.position = "fixed";
            // Docked to the bottom-right corner above the bottom nav capsule: never covers the FAB (left) or the centred nav tabs.
            // Use calibrator CSS variable --df-studios-pill-bottom (single owner: SovereignInsetsCalibrator).
            // MainActivity pads the parent FrameLayout; --df-webview-padding-bottom is pinned to 0px by the calibrator.
            // The calibrator computes: dock gap (12) + capsuleHeight + pillHeight(48) + gap(8) = capsuleHeight + 68.
            pill.style.bottom = "var(--df-studios-pill-bottom, 268px)";
            pill.style.right = "12px";
            pill.style.left = "auto";
            pill.style.transform = "none";
            // High contrast on AMOLED/dark content; WCAG-large text, 48px tap target.
            // TASK #806 Fix 1 forces light-mode buttons to #1e293b with !important, which would
            // make this dark pill's label unreadable — declare white with !important so it wins.
            pill.style.setProperty("color", "#ffffff", "important");
            pill.style.width = "auto";
            // Reserve space for FAB (left:24px + width:54px + 12px gap = 90px from left)
            // so Studios pill never overlaps the FAB on narrow screens.
            pill.style.maxWidth = "min(320px, calc(100vw - 102px))";
            pill.style.minHeight = "48px";
            pill.style.background = "rgba(17, 24, 39, 0.97)";
            pill.style.backdropFilter = "blur(12px)";
            pill.style.border = "2px solid #22c55e";
            pill.style.borderRadius = "999px";
            pill.style.padding = "12px 16px";
            pill.style.fontSize = "0.92rem";
            pill.style.fontWeight = "800";
            pill.style.letterSpacing = "0.3px";
            pill.style.textShadow = "0 1px 2px rgba(0,0,0,0.8)";
            pill.style.cursor = "pointer";
            pill.style.zIndex = "150";
            pill.style.display = "flex";
            pill.style.alignItems = "center";
            pill.style.justifyContent = "center";
            pill.style.overflow = "hidden";
            pill.style.textOverflow = "ellipsis";
            pill.style.whiteSpace = "nowrap";
            pill.style.touchAction = "manipulation";
            pill.style.webkitTapHighlightColor = "transparent";
            pill.style.gap = "8px";
            pill.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.6)";

            pill.innerHTML = '<span id="zenStudioTriggerLabel">' + ((document.documentElement.lang || "").toLowerCase().indexOf("ar") === 0 ? "✨ الاستوديوهات" : "✨ Studios") + '</span> <span style="opacity: 0.5; font-size: 0.75rem;">(10)</span>';

            pill.onclick = () => {
                this.toggleDrawer();
            };

            document.body.appendChild(pill);
        },

        injectDrawerSheet: function () {
            if (document.getElementById("zenStudioDrawerOverlay")) return;

            const overlay = document.createElement("div");
            overlay.id = "zenStudioDrawerOverlay";
            overlay.style.position = "fixed";
            overlay.style.top = "0";
            overlay.style.left = "0";
            overlay.style.width = "100vw";
            overlay.style.height = "100vh";
            overlay.style.background = "rgba(0, 0, 0, 0.75)";
            overlay.style.backdropFilter = "blur(10px)";
            overlay.style.zIndex = "9500";
            overlay.style.display = "none";
            overlay.style.opacity = "0";
            overlay.style.transition = "opacity 0.25s ease";

            overlay.onclick = (e) => {
                if (e.target === overlay) this.closeDrawer();
            };

            const sheet = document.createElement("div");
            sheet.id = "zenStudioDrawerSheet";
            sheet.style.position = "absolute";
            sheet.style.bottom = "0";
            sheet.style.left = "0";
            sheet.style.width = "100%";
            sheet.style.maxHeight = "80vh";
            sheet.style.background = "#050505";
            sheet.style.borderTop = "1px solid rgba(255, 255, 255, 0.12)";
            sheet.style.borderTopLeftRadius = "24px";
            sheet.style.borderTopRightRadius = "24px";
            sheet.style.padding = "24px 20px 40px";
            sheet.style.overflowY = "auto";
            sheet.style.color = "#fff";

            let itemsHtml = "";
            studiosList.forEach(s => {
                const label = studioIsAr() ? s.name : s.nameEn;
                itemsHtml += '<div class="studio-card interactive-action" data-studio="' + s.id + '" style="display: flex; align-items: center; gap: 14px; background: #121212; border: 1px solid #222; border-radius: 14px; padding: 14px 16px; margin-bottom: 10px; cursor: pointer;"><span style="font-size: 1.6rem;">' + s.icon + '</span><div style="flex: 1;"><div style="font-weight: 600; font-size: 0.98rem;">' + label + '</div><div style="font-size: 0.8rem; color: #888;">' + s.desc + '</div></div><span style="color: #555; font-size: 1.1rem;">›</span></div>';
            });

            const drawerTitle = studioIsAr() ? "✨ استوديوهات DEEP FOCUS" : "✨ DEEP FOCUS Studios";
            sheet.innerHTML = '<div style="width: 40px; height: 4px; background: #333; border-radius: 2px; margin: 0 auto 18px;"></div><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;"><h3 style="margin: 0; font-size: 1.2rem;">' + drawerTitle + '</h3><button id="zenCloseDrawerBtn" style="background: transparent; border: none; color: #888; font-size: 1.2rem; cursor: pointer;">✕</button></div><div>' + itemsHtml + '</div>';

            overlay.appendChild(sheet);
            document.body.appendChild(overlay);

            document.getElementById("zenCloseDrawerBtn").onclick = () => {
                this.closeDrawer();
            };

            // Card click handlers
            const cards = sheet.querySelectorAll(".studio-card");
            cards.forEach(c => {
                c.onclick = () => {
                    const sid = c.getAttribute("data-studio");
                    this.launchStudio(sid);
                };
            });
        },

        toggleDrawer: function () {
            if (this.isOpen) this.closeDrawer();
            else this.openDrawer();
        },

        openDrawer: function() {
            if (window.UniversalI18nHotSwap && window.UniversalI18nHotSwap.activeDictionary) { window.UniversalI18nHotSwap.sweepDom(window.UniversalI18nHotSwap.activeDictionary); }
            const overlay = document.getElementById("zenStudioDrawerOverlay");
            if (!overlay) return;
            overlay.style.display = "block";
            setTimeout(() => { overlay.style.opacity = "1"; }, 10);
            this.isOpen = true;
            if (typeof navigator !== "undefined" && navigator.vibrate) try { ((navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) ? navigator.vibrate(20) : false); } catch (e) {}
        },

        closeDrawer: function () {
            const overlay = document.getElementById("zenStudioDrawerOverlay");
            if (!overlay) return;
            overlay.style.opacity = "0";
            setTimeout(() => { overlay.style.display = "none"; }, 250);
            this.isOpen = false;
        },

        launchStudio: function (studioId) {
            console.log("[StudioNavigator] Launching studio:", studioId);
            this.closeDrawer();
            if (typeof navigator !== "undefined" && navigator.vibrate) try { ((navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) ? navigator.vibrate(25) : false); } catch (e) {}

            const id = String(studioId || '');
            // Preferred path: the Studio Launcher bridges all 10 studios to real engines/UI.
            if (typeof window !== "undefined" && window.StudioLauncher && typeof window.StudioLauncher.open === 'function') {
                window.StudioLauncher.open(id);
                return;
            }
            // Legacy fallback: look for a `<studio>StudioModal` / `<studio>Modal` element.
            const targetModal = (typeof document !== "undefined") ? (document.getElementById(id + "StudioModal") || document.getElementById(id + "Modal")) : null;
            if (targetModal) {
                targetModal.style.display = "flex";
            } else if (typeof window !== "undefined" && window.dfSafeNotify) {
                window.dfSafeNotify(id);
            } else if (typeof console !== "undefined" && console.info) {
                console.info("[StudioNavigator] Activated:", id);
            }
        }
    };

    return { StudioNavigatorDrawer: StudioNavigatorDrawer, StudioLauncher: StudioLauncher };
}));
