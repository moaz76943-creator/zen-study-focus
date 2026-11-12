/**
 * DEEP FOCUS — SovereignAdaptiveSRS (v618.0.0)
 * On-device Adaptive Spaced Repetition (SRS) Engine.
 * Extends SuperMemo SM-2 with cognitive stamina adaptation and forgetting curve urgency ranking.
 * 100% Sovereign Offline, Zero PII, Western Arabic numerals (0123456789).
 */
(function (global) {
  'use strict';

  var SovereignAdaptiveSRS = {
    version: '618.0.0',
    defaults: {
      minEaseFactor: 1.30,
      maxEaseFactor: 2.80,
      defaultEaseFactor: 2.50,
      targetRetentionRate: 0.90,
      dayInMilliseconds: 86400000
    },

    calculateNextReview: function (card, grade, options) {
      card = card || {};
      options = options || {};
      grade = Math.max(0, Math.min(5, Math.round(Number(grade) || 0)));
      var rep = Math.max(0, card.repetition || 0);
      var prevInterval = Math.max(1, card.interval || 1);
      var ef = Number(card.easeFactor) || this.defaults.defaultEaseFactor;
      var lapses = Math.max(0, card.lapses || 0);

      var targetRetention = Math.max(0.70, Math.min(0.98, options.targetRetention || this.defaults.targetRetentionRate));
      var retentionFactor = Math.log(targetRetention) / Math.log(0.90);
      var stamina = typeof options.stamina === 'number' ? Math.max(10, Math.min(100, options.stamina)) : 100;
      var pacingFactor = stamina < 40 ? 0.85 : 1.0;

      var efDelta = 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02);
      var newEf = parseFloat(Math.max(this.defaults.minEaseFactor, Math.min(this.defaults.maxEaseFactor, ef + efDelta)).toFixed(4));

      var nextInterval = 1;
      var nextRepetition = 0;

      if (grade < 3) {
        nextRepetition = 0;
        nextInterval = 1;
        lapses += 1;
      } else {
        if (rep === 0) {
          nextInterval = 1;
        } else if (rep === 1) {
          nextInterval = Math.max(2, Math.round(6 * retentionFactor * pacingFactor));
        } else {
          nextInterval = Math.max(prevInterval + 1, Math.round(prevInterval * newEf * retentionFactor * pacingFactor));
        }
        nextRepetition = rep + 1;
      }

      return {
        repetition: nextRepetition,
        interval: nextInterval,
        easeFactor: newEf,
        lapses: lapses,
        nextReview: Date.now() + (nextInterval * this.defaults.dayInMilliseconds)
      };
    },

    prioritizeQueue: function (cards, currentTime) {
      if (!Array.isArray(cards) || cards.length === 0) return [];
      currentTime = currentTime || Date.now();
      var dayMs = this.defaults.dayInMilliseconds;

      var evaluated = cards.map(function (c) {
        var nextRev = c.nextReview || currentTime;
        var interval = Math.max(1, c.interval || 1);
        var lapses = Math.max(0, c.lapses || 0);
        var daysOverdue = Math.max(0, (currentTime - nextRev) / dayMs);
        var retentionEstimate = Math.exp(-daysOverdue / interval);
        var urgencyScore = (1.0 - retentionEstimate) + (lapses * 0.15) + (daysOverdue * 0.05);

        return {
          card: c,
          daysOverdue: parseFloat(daysOverdue.toFixed(2)),
          retentionEstimate: parseFloat(retentionEstimate.toFixed(3)),
          urgencyScore: parseFloat(urgencyScore.toFixed(4)),
          isDue: currentTime >= nextRev
        };
      });

      evaluated.sort(function (a, b) { return b.urgencyScore - a.urgencyScore; });
      return evaluated;
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SovereignAdaptiveSRS;
  }
  global.SovereignAdaptiveSRS = SovereignAdaptiveSRS;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
