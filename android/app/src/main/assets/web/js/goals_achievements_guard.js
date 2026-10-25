/**
 * DEEP FOCUS — Goals & Real Streaks Persistence Guard v21
 * Enforces:
 * 1. Zero Phantom Progress: Advances progress ONLY on verified storage persistence.
 * 2. Immutable on Theme/Locale Change: Language/Theme reload never resets streaks or badges.
 * 3. Real Streak Verification: Strict civil calendar date transitions.
 */
(function(global) {
    const STORAGE_KEY_GOALS = "zen_fortress_goals_progress_v21";

    function updateGoalOnConfirmedSession(currentGoalProgress, sessionRecord, saveConfirmed) {
        if (!saveConfirmed) {
            return {
                updated: false,
                reason: "STORAGE_NOT_CONFIRMED_PHANTOM_PROGRESS_BLOCKED",
                progress: currentGoalProgress
            };
        }

        if (!sessionRecord || !sessionRecord.durationMinutes) {
            return { updated: false, reason: "INVALID_SESSION_RECORD", progress: currentGoalProgress };
        }

        const progress = {
            todayMinutes: Number(currentGoalProgress.todayMinutes || 0) + Number(sessionRecord.durationMinutes),
            dailyTargetMinutes: Number(currentGoalProgress.dailyTargetMinutes || 25),
            currentStreak: Number(currentGoalProgress.currentStreak || 0),
            longestStreak: Number(currentGoalProgress.longestStreak || 0),
            lastActiveDate: currentGoalProgress.lastActiveDate || null,
            achievements: { ...(currentGoalProgress.achievements || {}) }
        };

        // Streak Transition Check
        const sessionDate = sessionRecord.dateStr; // "YYYY-MM-DD"
        if (progress.todayMinutes >= progress.dailyTargetMinutes) {
            if (progress.lastActiveDate !== sessionDate) {
                if (progress.lastActiveDate) {
                    // Calculate civil days difference
                    const dLast = new Date(progress.lastActiveDate + "T00:00:00Z");
                    const dCurrent = new Date(sessionDate + "T00:00:00Z");
                    const diffDays = Math.round((dCurrent - dLast) / (86400000));

                    if (diffDays === 1) {
                        progress.currentStreak += 1;
                    } else if (diffDays > 1) {
                        progress.currentStreak = 1; // Reset active streak if a day was skipped
                    }
                } else {
                    progress.currentStreak = 1;
                }

                progress.lastActiveDate = sessionDate;
                if (progress.currentStreak > progress.longestStreak) {
                    progress.longestStreak = progress.currentStreak;
                }
            }
        }

        // Idempotent Achievement Unlocking
        if (progress.currentStreak >= 7 && !progress.achievements["streak_7_days"]) {
            progress.achievements["streak_7_days"] = {
                unlockedAt: Date.now(),
                title: "7-Day Focus Master"
            };
        }

        return {
            updated: true,
            status: "PROGRESS_RECORDED",
            progress
        };
    }

    // Safety check: Re-applying theme or locale MUST NOT mutate goal records
    function onLocaleOrThemeChange(existingProgress) {
        // Deep clone to guarantee immutability
        return JSON.parse(JSON.stringify(existingProgress));
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            updateGoalOnConfirmedSession,
            onLocaleOrThemeChange,
            STORAGE_KEY_GOALS
        };
    } else {
        global.ZenGoalsGuard = {
            updateGoalOnConfirmedSession,
            onLocaleOrThemeChange,
            STORAGE_KEY_GOALS
        };
    }
})(typeof window !== 'undefined' ? window : globalThis);
