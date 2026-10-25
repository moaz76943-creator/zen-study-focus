/**
 * DEEP FOCUS — Gentle Break Suggestions Engine v21
 * Delivers non-intrusive, grounded micro-recovery cues during breaks.
 * Strictly avoids pseudoscientific medical claims (Section 38 of Directive).
 */
(function(global) {

    const BREAK_SUGGESTIONS = [
        {
            id: "cue_eye_relief",
            type: "SHORT",
            text_en: "Rest your eyes: Look at something 20 feet away for 20 seconds.",
            text_ar: "أرح عينيك: انظر إلى مسافة بعيدة لمدة 20 ثانية لتخفيف الإجهاد."
        },
        {
            id: "cue_hydrate",
            type: "SHORT",
            text_en: "Take a sip of water and hydrate your body.",
            text_ar: "تناول رشفة ماء منعشة لترطيب جسمك ونقاء ذهنك."
        },
        {
            id: "cue_posture",
            type: "SHORT",
            text_en: "Roll your shoulders back and relax your jaw.",
            text_ar: "حرك كتفيك للوراء برفق وأرح عضلات رقبتك وفكك."
        },
        {
            id: "cue_breathing",
            type: "SHORT",
            text_en: "Take 3 deep, gentle breaths in through the nose and out slowly.",
            text_ar: "خذ 3 أنفاس عميقة وهادئة من الأنف وأخرجها ببطء."
        },
        {
            id: "cue_step_away",
            type: "LONG",
            text_en: "Step away from screens: Walk around or stretch your legs.",
            text_ar: "ابتعد عن الشاشات تماماً: قم بجولة مشي خفيفة أو تمدد."
        },
        {
            id: "cue_fresh_air",
            type: "LONG",
            text_en: "Open a window for fresh air or gaze outside.",
            text_ar: "افتح النافذة لتجديد هواء الغرفة أو تأمل الأفق بهدوء."
        }
    ];

    function getBreakSuggestion(breakMinutes, locale = "ar", seedIndex = null) {
        const isLongBreak = (Number(breakMinutes) || 5) >= 10;
        const targetType = isLongBreak ? "LONG" : "SHORT";
        
        const candidateCues = BREAK_SUGGESTIONS.filter(c => c.type === targetType);
        if (candidateCues.length === 0) return null;

        const idx = (seedIndex !== null && typeof seedIndex === 'number') 
            ? Math.abs(seedIndex) % candidateCues.length 
            : Math.floor(Math.random() * candidateCues.length);

        const chosen = candidateCues[idx];
        const isArabic = (locale || "ar").toLowerCase() === "ar";

        return {
            id: chosen.id,
            type: chosen.type,
            text: isArabic ? chosen.text_ar : chosen.text_en,
            nonIntrusive: true // Displayed subtly in break banner, never as a blocking modal
        };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            getBreakSuggestion,
            BREAK_SUGGESTIONS
        };
    } else {
        global.ZenGentleBreaks = {
            getBreakSuggestion,
            BREAK_SUGGESTIONS
        };
    }
})(typeof window !== 'undefined' ? window : globalThis);
