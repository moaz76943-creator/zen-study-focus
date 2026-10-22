/**
 * DEEP FOCUS — Smart Focus Templates Engine v21
 * Provides 1-tap structured focus setups while safeguarding running sessions.
 */
(function(global) {

    const BUILTIN_TEMPLATES = [
        {
            id: "template_deep_work",
            titleKey: "TEMPLATE_DEEP_WORK",
            defaultTitle: "Deep Work",
            workMinutes: 50,
            breakMinutes: 10,
            activityType: "deep_work",
            recommendedSound: "gentle_rain_cc0"
        },
        {
            id: "template_pomodoro_classic",
            titleKey: "TEMPLATE_POMODORO",
            defaultTitle: "Classic Pomodoro",
            workMinutes: 25,
            breakMinutes: 5,
            activityType: "study",
            recommendedSound: "bell"
        },
        {
            id: "template_quick_sprint",
            titleKey: "TEMPLATE_SPRINT",
            defaultTitle: "Quick Sprint",
            workMinutes: 15,
            breakMinutes: 3,
            activityType: "review",
            recommendedSound: "water_drop"
        },
        {
            id: "template_extended_study",
            titleKey: "TEMPLATE_EXTENDED",
            defaultTitle: "Extended Study",
            workMinutes: 90,
            breakMinutes: 15,
            activityType: "research",
            recommendedSound: "wood_chime"
        }
    ];

    function getTemplatesList() {
        return BUILTIN_TEMPLATES.map(t => ({ ...t }));
    }

    function applyTemplateToTimer(templateId, currentTimerState, forceOverride = false) {
        const template = BUILTIN_TEMPLATES.find(t => t.id === templateId);
        if (!template) {
            return { success: false, reason: "TEMPLATE_NOT_FOUND" };
        }

        // Active Session Guard: Never overwrite a running session without explicit override
        if (currentTimerState && currentTimerState.status === "RUNNING" && !forceOverride) {
            return {
                success: false,
                reason: "ACTIVE_SESSION_PROTECTED",
                message: "Timer is currently active. User confirmation required to switch template."
            };
        }

        const newSessionConfig = {
            sessionId: `sess_tpl_${Date.now()}`,
            templateId: template.id,
            durationMinutes: template.workMinutes,
            remainingSeconds: template.workMinutes * 60,
            breakMinutes: template.breakMinutes,
            activityType: template.activityType,
            soundChoice: template.recommendedSound,
            status: "READY"
        };

        return {
            success: true,
            status: "TEMPLATE_APPLIED",
            config: newSessionConfig
        };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            getTemplatesList,
            applyTemplateToTimer,
            BUILTIN_TEMPLATES
        };
    } else {
        global.ZenTemplates = {
            getTemplatesList,
            applyTemplateToTimer,
            BUILTIN_TEMPLATES
        };
    }
})(typeof window !== 'undefined' ? window : globalThis);
