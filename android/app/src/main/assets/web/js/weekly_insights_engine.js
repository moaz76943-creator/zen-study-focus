/**
 * DEEP FOCUS — Weekly Focus Insights & Trend Engine v21
 * Delivers grounded week-over-week comparative metrics and peak productivity analysis.
 * Strictly adheres to Western digits (0-9) and truthful user data (Section 14 & 38).
 */
(function(global) {

    function generateWeeklyInsights(currentWeekSessions, previousWeekSessions, locale = "ar") {
        const sumMinutes = (sessions) => {
            if (!Array.isArray(sessions)) return 0;
            return sessions.reduce((acc, s) => acc + (Number(s.durationMinutes) || 0), 0);
        };

        const currentTotal = sumMinutes(currentWeekSessions);
        const previousTotal = sumMinutes(previousWeekSessions);

        // 1. Calculate Week-over-Week Delta Safely (Prevent Division by Zero)
        let deltaPercentage = 0;
        let trend = "SAME";

        if (previousTotal === 0) {
            deltaPercentage = currentTotal > 0 ? 100 : 0;
            trend = currentTotal > 0 ? "UP" : "SAME";
        } else {
            const diff = currentTotal - previousTotal;
            deltaPercentage = Math.round((diff / previousTotal) * 100);
            if (deltaPercentage > 0) trend = "UP";
            else if (deltaPercentage < 0) trend = "DOWN";
            else trend = "SAME";
        }

        // 2. Discover Peak Productivity Day in Current Week
        const dayBuckets = {};
        const activityBuckets = {};

        if (Array.isArray(currentWeekSessions)) {
            currentWeekSessions.forEach(s => {
                const day = s.dateStr || "Unknown";
                const mins = Number(s.durationMinutes) || 0;
                dayBuckets[day] = (dayBuckets[day] || 0) + mins;

                const act = s.activityType || "focus";
                activityBuckets[act] = (activityBuckets[act] || 0) + mins;
            });
        }

        let peakDay = null;
        let peakDayMinutes = 0;
        for (const [day, mins] of Object.entries(dayBuckets)) {
            if (mins > peakDayMinutes) {
                peakDayMinutes = mins;
                peakDay = day;
            }
        }

        // 3. Discover Top Activity
        let topActivity = null;
        let topActivityMinutes = 0;
        for (const [act, mins] of Object.entries(activityBuckets)) {
            if (mins > topActivityMinutes) {
                topActivityMinutes = mins;
                topActivity = act;
            }
        }

        // 4. Grounded Calm Summary Text
        const isAr = (locale || "ar").toLowerCase() === "ar";
        let summaryText = "";

        if (isAr) {
            if (trend === "UP") {
                summaryText = `أنجزت ${currentTotal} دقيقة هذا الأسبوع بزيادة +${deltaPercentage}% عن الأسبوع السابق.`;
            } else if (trend === "DOWN") {
                summaryText = `أنجزت ${currentTotal} دقيقة هذا الأسبوع (تغير ${deltaPercentage}%). استراحة هادئة تجدد نشاطك.`;
            } else {
                summaryText = `حافظت على وتيرة مستقرة بإجمالي ${currentTotal} دقيقة هذا الأسبوع.`;
            }
            if (peakDay) {
                summaryText += ` وكان أكثر أيامك تركيزاً يوم ${peakDay} بمعدل ${peakDayMinutes} دقيقة.`;
            }
        } else {
            if (trend === "UP") {
                summaryText = `You completed ${currentTotal} mins this week, up +${deltaPercentage}% from last week.`;
            } else if (trend === "DOWN") {
                summaryText = `You completed ${currentTotal} mins this week (${deltaPercentage}% change). A gentle rest recharges focus.`;
            } else {
                summaryText = `You maintained a steady pace of ${currentTotal} mins this week.`;
            }
            if (peakDay) {
                summaryText += ` Peak day was ${peakDay} with ${peakDayMinutes} mins.`;
            }
        }

        return {
            currentWeekTotalMinutes: currentTotal,
            previousWeekTotalMinutes: previousTotal,
            trend,
            deltaPercentage,
            peakDay,
            peakDayMinutes,
            topActivity,
            summaryText
        };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { generateWeeklyInsights };
    } else {
        global.ZenWeeklyInsights = { generateWeeklyInsights };
    }
})(typeof window !== 'undefined' ? window : globalThis);
