/**
 * DEEP FOCUS — SovereignCognitivePacing (v613.0.0)
 * Non-medical on-device study rhythm analyzer and cognitive load pacing engine.
 * Computes study stamina, break deficit, and optimal intermission intervals.
 * 100% Sovereign Offline, Zero PII, Western Arabic numerals (0123456789).
 */
(function (global) {
  'use strict';

  var SovereignCognitivePacing = {
    version: '613.0.0',

    /**
     * Configuration parameters for mathematical pacing model
     */
    config: {
      standardBlockMinutes: 25,
      extendedBlockMinutes: 50,
      maxContinuousMinutes: 90,
      shortBreakMinutes: 5,
      restorativeBreakMinutes: 15,
      deepRestBreakMinutes: 30
    },

    /**
     * Evaluates current study session pacing and rhythm metrics.
     * Non-medical calculation based solely on duration and elapsed intervals.
     * @param {object} session
     *   - elapsedMinutes: number
     *   - lastBreakMinutesAgo: number
     *   - flashcardErrorSpikes: number (optional, e.g. consecutive failed cards)
     *   - completedBlocks: number
     * @returns {object} Pacing metrics and intermission recommendations
     */
    computePacingMetrics: function (session) {
      session = session || {};
      var elapsed = Math.max(0, session.elapsedMinutes || 0);
      var lastBreakAgo = typeof session.lastBreakMinutesAgo === 'number'
        ? Math.max(0, session.lastBreakMinutesAgo)
        : elapsed;
      var errorSpikes = Math.max(0, session.flashcardErrorSpikes || 0);
      var completedBlocks = Math.max(0, session.completedBlocks || 0);

      // Focus Density: Decreases progressively after 50 minutes without a break
      var continuousFatigueRatio = Math.min(1.0, lastBreakAgo / this.config.maxContinuousMinutes);
      var errorPenalty = Math.min(0.3, errorSpikes * 0.06);

      // Study Stamina: 100 base, reduced by long continuous study and errors
      var rawStamina = 100 - (continuousFatigueRatio * 60) - (errorPenalty * 100);
      var studyStamina = Math.max(10, Math.min(100, Math.round(rawStamina)));

      // Break Deficit: Number of minutes studied beyond the recommended 50-minute threshold
      var breakDeficit = Math.max(0, Math.round(lastBreakAgo - this.config.extendedBlockMinutes));

      // Recommended Intermission
      var recommendedIntermission = this.config.shortBreakMinutes;
      var statusLevel = 'optimal'; // 'optimal' | 'moderate_load' | 'break_recommended' | 'break_essential'

      if (lastBreakAgo >= this.config.maxContinuousMinutes || completedBlocks >= 4) {
        recommendedIntermission = this.config.deepRestBreakMinutes;
        statusLevel = 'break_essential';
      } else if (lastBreakAgo >= this.config.extendedBlockMinutes || completedBlocks >= 2) {
        recommendedIntermission = this.config.restorativeBreakMinutes;
        statusLevel = 'break_recommended';
      } else if (lastBreakAgo >= this.config.standardBlockMinutes) {
        recommendedIntermission = this.config.shortBreakMinutes;
        statusLevel = 'moderate_load';
      }

      var adviceKey = 'keep_going';
      if (statusLevel === 'break_essential') {
        adviceKey = 'take_long_break';
      } else if (statusLevel === 'break_recommended') {
        adviceKey = 'take_restorative_break';
      } else if (statusLevel === 'moderate_load') {
        adviceKey = 'short_pause_ready';
      }

      return {
        studyStamina: studyStamina,
        breakDeficit: breakDeficit,
        continuousMinutes: lastBreakAgo,
        totalElapsedMinutes: elapsed,
        recommendedIntermission: recommendedIntermission,
        statusLevel: statusLevel,
        adviceKey: adviceKey,
        shouldPromptBreak: lastBreakAgo >= this.config.extendedBlockMinutes
      };
    },

    /**
     * Determines optimal next session length in minutes (25, 45, or 60)
     * based on historical session completion consistency.
     * @param {Array<object>} history Array of past sessions { durationMinutes, completed }
     * @returns {number} Recommended session minutes
     */
    suggestOptimalSessionLength: function (history) {
      if (!Array.isArray(history) || history.length === 0) {
        return this.config.standardBlockMinutes; // default 25
      }

      var recent = history.slice(-5);
      var completedCount = 0;
      var totalDuration = 0;

      for (var i = 0; i < recent.length; i++) {
        if (recent[i].completed) completedCount++;
        totalDuration += (recent[i].durationMinutes || 0);
      }

      var avgDuration = totalDuration / recent.length;
      var completionRate = completedCount / recent.length;

      // If completing >80% reliably and average is >40m, suggest 50m block
      if (completionRate >= 0.8 && avgDuration >= 40) {
        return this.config.extendedBlockMinutes; // 50 mins
      }
      return this.config.standardBlockMinutes; // 25 mins
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SovereignCognitivePacing;
  }
  global.SovereignCognitivePacing = SovereignCognitivePacing;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
