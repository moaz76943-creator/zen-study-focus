/**
 * DEEP FOCUS — Active Recall Flashcard & Self-Quiz Engine
 * Cycle: CYCLE-113 (Mission #113)
 * Architecture: v21 Data Fortress Safe, Spaced Repetition (SM-2 Hybrid) & Study Break Quizzing
 * Strict Rules:
 *  - 100-Locale Support with Strict English-Only Fallback
 *  - Absolute Hebrew Exclusion (he, iw -> en)
 *  - Strict Western Digits 0123456789
 *  - 100% Offline (Local Flashcard Storage)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ActiveRecallFlashcardEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const RATINGS = {
    AGAIN: 0,
    HARD: 1,
    GOOD: 2,
    EASY: 3
  };

  const DEFAULTS = {
    initialEaseFactor: 2.5,
    minEaseFactor: 1.3,
    maxEaseFactor: 2.5,
    initialIntervalDays: 1
  };

  const I18N_STRINGS = {
    en: {
      rating_again: "Again (Reset)",
      rating_hard: "Hard (Shorter)",
      rating_good: "Good (Optimal)",
      rating_easy: "Easy (Extended)",
      deck_stats_mastery: "Mastery Rate",
      due_cards_notice: "{count} cards due for active recall review."
    },
    ar: {
      rating_again: "إعادة (استرجاع متعثر)",
      rating_hard: "صعب (فترة أقصر)",
      rating_good: "جيد (توقيت مثالي)",
      rating_easy: "سهل (فترة ممتدة)",
      deck_stats_mastery: "نسبة الإتقان",
      due_cards_notice: "{count} بطاقة جاهزة للمراجعة والاسترجاع النشط."
    }
  };

  function sanitizeLocale(locale) {
    if (!locale || typeof locale !== 'string') return 'en';
    const clean = locale.toLowerCase().trim().split(/[-_]/)[0];
    if (clean === 'he' || clean === 'iw') {
      return 'en';
    }
    return clean;
  }

  function toWesternDigits(num, decimals = 0) {
    const val = Number(num);
    if (isNaN(val)) return '0';
    return decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString();
  }

  function getLocalizedText(locale, key) {
    const clean = sanitizeLocale(locale);
    const dict = (clean === 'ar') ? I18N_STRINGS.ar : I18N_STRINGS.en;
    return dict[key] || I18N_STRINGS.en[key] || '';
  }

  function formatDateOnly(dateObj) {
    const d = (dateObj instanceof Date) ? dateObj : new Date(dateObj || Date.now());
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function createCard(deckId, prompt, answer, notes = '') {
    const now = new Date();
    return {
      id: `card_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      deckId: deckId || 'default',
      prompt: String(prompt || '').trim(),
      answer: String(answer || '').trim(),
      notes: String(notes || '').trim(),
      repetitions: 0,
      intervalDays: 0,
      easeFactor: DEFAULTS.initialEaseFactor,
      lastReviewed: null,
      nextReviewDate: formatDateOnly(now),
      createdAt: now.getTime()
    };
  }

  function reviewCard(cardInput, rating, reviewTimestampMs) {
    const card = Object.assign({}, cardInput);
    const now = reviewTimestampMs ? new Date(reviewTimestampMs) : new Date();
    const q = parseInt(rating, 10);
    const validRating = (q >= 0 && q <= 3) ? q : RATINGS.GOOD;

    let repetitions = card.repetitions || 0;
    let interval = card.intervalDays || 0;
    let ease = card.easeFactor || DEFAULTS.initialEaseFactor;

    if (validRating === RATINGS.AGAIN) {
      repetitions = 0;
      interval = 1;
    } else {
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = (validRating === RATINGS.HARD) ? 2 : 4;
      } else {
        const factor = (validRating === RATINGS.HARD) ? (ease * 0.8) : (validRating === RATINGS.EASY ? (ease * 1.3) : ease);
        interval = Math.max(interval + 1, Math.round(interval * factor));
      }
      repetitions += 1;
    }

    if (validRating === RATINGS.EASY) {
      ease = Math.min(DEFAULTS.maxEaseFactor, ease + 0.15);
    } else if (validRating === RATINGS.HARD || validRating === RATINGS.AGAIN) {
      ease = Math.max(DEFAULTS.minEaseFactor, ease - 0.20);
    }

    const nextDate = new Date(now.getTime() + (interval * 24 * 60 * 60 * 1000));

    card.repetitions = repetitions;
    card.intervalDays = interval;
    card.easeFactor = Number(ease.toFixed(2));
    card.lastReviewed = now.getTime();
    card.nextReviewDate = formatDateOnly(nextDate);

    return card;
  }

  function getDueCards(cardsList = [], currentDateStr = null) {
    const todayStr = currentDateStr || formatDateOnly(new Date());
    const list = Array.isArray(cardsList) ? cardsList : [];
    return list.filter(c => {
      if (!c || !c.nextReviewDate) return false;
      return c.nextReviewDate <= todayStr;
    });
  }

  function getDeckStatistics(cardsList = [], currentDateStr = null) {
    const list = Array.isArray(cardsList) ? cardsList : [];
    const totalCards = list.length;
    const dueCards = getDueCards(list, currentDateStr).length;

    const masteredCards = list.filter(c => c && c.repetitions >= 3 && c.intervalDays >= 7).length;
    const masteryRate = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

    return {
      totalCards,
      dueCards,
      masteredCards,
      masteryRate,
      totalFormatted: toWesternDigits(totalCards),
      dueFormatted: toWesternDigits(dueCards),
      masteryFormatted: `${toWesternDigits(masteryRate)}%`
    };
  }

  return {
    RATINGS,
    DEFAULTS,
    createCard,
    reviewCard,
    getDueCards,
    getDeckStatistics,
    formatDateOnly,
    sanitizeLocale,
    toWesternDigits,
    getLocalizedText
  };
}));
