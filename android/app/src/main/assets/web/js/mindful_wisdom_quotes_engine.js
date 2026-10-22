/**
 * DEEP FOCUS — Mindful Focus Wisdom & Stoic Quotes Engine
 * Mission #080: Curated non-clinical philosophical focus wisdom,
 * stage-based dispatch (Start, Break, Complete), and user opt-out control.
 */
(function (global) {
  'use strict';

  var QUOTES_COLLECTION = [
    // 1. Start Session Quotes
    {
      id: "quote_start_01",
      category: "start_session",
      textAr: "رحلة الإتقان تبدأ بخطوة هادئة واحدة.",
      textEn: "A journey of mastery begins with a single quiet step.",
      author: "Lao Tzu"
    },
    {
      id: "quote_start_02",
      category: "start_session",
      textAr: "لا تركز على الجبل بأكمله، ركز على الخطوة التي أمامك الآن.",
      textEn: "Do not gaze at the whole mountain; focus only on the step before you.",
      author: "Stoic Wisdom"
    },
    {
      id: "quote_start_03",
      category: "start_session",
      textAr: "الهدوء ليس غياب الفوضى من حولك، بل ثباتك في وسطها.",
      textEn: "Calmness is not the absence of chaos, but your inner stillness within it.",
      author: "Marcus Aurelius"
    },
    // 2. During Break Quotes
    {
      id: "quote_break_01",
      category: "during_break",
      textAr: "الاستراحة ليست إهداراً للوقت، بل شحذٌ لنصل الانتباه.",
      textEn: "Rest is not lost time; it sharpens the edge of your attention.",
      author: "Zen Maxim"
    },
    {
      id: "quote_break_02",
      category: "during_break",
      textAr: "أرح عينيك وتنفس بعمق؛ فالسكون يجدد طاقة العقل.",
      textEn: "Rest your eyes and breathe deeply; stillness renews the intellect.",
      author: "Mindful Study"
    },
    // 3. Completion Quotes
    {
      id: "quote_comp_01",
      category: "completion",
      textAr: "الإتقان ليس صدفة عابرة، بل عادة تتراكم في صمت.",
      textEn: "Mastery is not an accident, but a habit accumulated in silence.",
      author: "Aristotle"
    },
    {
      id: "quote_comp_02",
      category: "completion",
      textAr: "كل دقيقة ركزت فيها اليوم هي بذرة نجاح لغدك.",
      textEn: "Every minute of dedicated focus today is a seed for tomorrow.",
      author: "Focus Maxim"
    }
  ];

  /**
   * Retrieves a quote matching context category with fallback.
   * @param {string} category - 'start_session' | 'during_break' | 'completion'
   * @param {Object} options - { enabled: boolean, index: number, isRtl: boolean }
   * @returns {Object|null} Quote object or null if disabled.
   */
  function getMindfulQuote(category, options) {
    options = options || {};
    if (options.enabled === false) {
      return null;
    }

    var targetCat = String(category || 'start_session').toLowerCase();
    var filtered = QUOTES_COLLECTION.filter(function (q) {
      return q.category === targetCat;
    });

    if (filtered.length === 0) {
      filtered = QUOTES_COLLECTION;
    }

    var idx = typeof options.index === 'number' && options.index >= 0
      ? (options.index % filtered.length)
      : 0;

    var selected = filtered[idx];
    var isRtl = options.isRtl !== false;

    return {
      id: selected.id,
      category: selected.category,
      text: isRtl ? selected.textAr : selected.textEn,
      author: selected.author,
      raw: selected
    };
  }

  /**
   * Audits that quotes strictly contain zero medical or therapeutic claims.
   */
  function auditQuotesMedicalSafety() {
    var clinicalBannedTerms = [
      "cure", "treat", "therapy", "clinical", "disease", "adhd",
      "depression", "anxiety", "doctor", "علاج", "مرض", "طبيب", "اكتئاب"
    ];

    var violations = [];
    for (var i = 0; i < QUOTES_COLLECTION.length; i++) {
      var q = QUOTES_COLLECTION[i];
      var combined = (q.textAr + " " + q.textEn).toLowerCase();

      for (var b = 0; b < clinicalBannedTerms.length; b++) {
        var term = clinicalBannedTerms[b];
        if (combined.indexOf(term) !== -1) {
          violations.push({ id: q.id, term: term });
        }
      }
    }

    return {
      totalQuotes: QUOTES_COLLECTION.length,
      zeroMedicalClaimsVerified: violations.length === 0,
      violationsCount: violations.length
    };
  }

  var engine = {
    QUOTES_COLLECTION: QUOTES_COLLECTION,
    getMindfulQuote: getMindfulQuote,
    auditQuotesMedicalSafety: auditQuotesMedicalSafety
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.MindfulWisdomQuotesEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
