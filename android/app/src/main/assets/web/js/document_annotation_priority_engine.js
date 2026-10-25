/**
 * DEEP FOCUS — Color-Coded Document Annotation & Priority Matrix Engine
 * Cycle: CYCLE-131 (Mission #131)
 * Architecture: v21 Data Fortress Safe, Academic Highlight Tints & Reading Pacing Matrix
 * Strict Rules:
 *  - 100-Locale Support with Strict English-Only Fallback
 *  - Absolute Hebrew Exclusion (he, iw -> en)
 *  - Strict Western Digits 0123456789
 *  - Zero Medical / Clinical Claims (Study Organization Only)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DocumentAnnotationPriorityEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const HIGHLIGHT_TINTS = {
    AMBER_INSIGHT: { id: 'AMBER_INSIGHT', hex: '#f59e0b', labelKey: 'tint_amber' },
    EMERALD_EVIDENCE: { id: 'EMERALD_EVIDENCE', hex: '#10b981', labelKey: 'tint_emerald' },
    SAPPHIRE_DEFINITION: { id: 'SAPPHIRE_DEFINITION', hex: '#3b82f6', labelKey: 'tint_sapphire' },
    CRIMSON_CRITIQUE: { id: 'CRIMSON_CRITIQUE', hex: '#ef4444', labelKey: 'tint_crimson' },
    VIOLET_SYNTHESIS: { id: 'VIOLET_SYNTHESIS', hex: '#8b5cf6', labelKey: 'tint_violet' }
  };

  const PRIORITY_QUADRANTS = {
    Q1_ESSENTIAL: { id: 'Q1_ESSENTIAL', rank: 1, labelKey: 'priority_q1' },
    Q2_FOUNDATIONAL: { id: 'Q2_FOUNDATIONAL', rank: 2, labelKey: 'priority_q2' },
    Q3_PRAGMATIC: { id: 'Q3_PRAGMATIC', rank: 3, labelKey: 'priority_q3' },
    Q4_EXPLORATORY: { id: 'Q4_EXPLORATORY', rank: 4, labelKey: 'priority_q4' }
  };

  const I18N_STRINGS = {
    en: {
      tint_amber: "Amber (Core Insights & Main Theses)",
      tint_emerald: "Emerald (Evidence, Proofs & Data)",
      tint_sapphire: "Sapphire (Definitions & Key Terms)",
      tint_crimson: "Crimson (Critiques, Questions & Counter-claims)",
      tint_violet: "Violet (Personal Syntheses & Analogies)",
      priority_q1: "Quadrant 1: Essential & Urgent",
      priority_q2: "Quadrant 2: Deep & Foundational",
      priority_q3: "Quadrant 3: Pragmatic Reference",
      priority_q4: "Quadrant 4: Exploratory & Optional"
    },
    ar: {
      tint_amber: "عنبري (الأفكار الجوهرية والأطروحة الأساسية)",
      tint_emerald: "زمردي (الأدلة والبراهين والبيانات)",
      tint_sapphire: "ياقوتي (التعريفات والمصطلحات المفتاحية)",
      tint_crimson: "قرمزي (الاعتراضات والأسئلة والردود)",
      tint_violet: "بنفسجي (الربط المنهجي والاستنباط الذاتي)",
      priority_q1: "المربع 1: أولوية عاجلة وأساسية",
      priority_q2: "المربع 2: مدارسة تأسيسية عميقة",
      priority_q3: "المربع 3: مراجع استدلال سريعة",
      priority_q4: "المربع 4: مطالعة حرة واستكشافية"
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
    if (typeof num === 'number') {
      return decimals > 0 ? num.toFixed(decimals) : Math.round(num).toString();
    }
    if (typeof num === 'string') {
      return num
        .replace(/[٠۰]/g, '0')
        .replace(/[١۱]/g, '1')
        .replace(/[٢۲]/g, '2')
        .replace(/[٣۳]/g, '3')
        .replace(/[٤۴]/g, '4')
        .replace(/[٥۵]/g, '5')
        .replace(/[٦۶]/g, '6')
        .replace(/[٧۷]/g, '7')
        .replace(/[٨۸]/g, '8')
        .replace(/[٩۹]/g, '9');
    }
    return '0';
  }

  function getLocalizedText(locale, key) {
    const clean = sanitizeLocale(locale);
    const dict = (clean === 'ar') ? I18N_STRINGS.ar : I18N_STRINGS.en;
    return dict[key] || I18N_STRINGS.en[key] || '';
  }

  function createAnnotation(docId, pageNumber, tintKey, quoteText, userNote = '') {
    const validTint = HIGHLIGHT_TINTS[tintKey] ? tintKey : 'AMBER_INSIGHT';
    const page = Math.max(1, parseInt(pageNumber, 10) || 1);
    const text = String(quoteText || '').trim();
    const note = String(userNote || '').trim();

    return {
      id: `ann_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      docId: String(docId || 'default_doc'),
      pageNumber: page,
      pageFormatted: toWesternDigits(page),
      tint: validTint,
      hexColor: HIGHLIGHT_TINTS[validTint].hex,
      quoteText: text,
      userNote: note,
      createdAt: Date.now()
    };
  }

  function summarizeAnnotations(annotationsList = []) {
    const list = Array.isArray(annotationsList) ? annotationsList : [];
    const counts = {
      AMBER_INSIGHT: 0,
      EMERALD_EVIDENCE: 0,
      SAPPHIRE_DEFINITION: 0,
      CRIMSON_CRITIQUE: 0,
      VIOLET_SYNTHESIS: 0
    };

    let totalWords = 0;
    list.forEach(a => {
      if (a && a.tint && counts[a.tint] !== undefined) {
        counts[a.tint]++;
      }
      if (a && a.quoteText) {
        totalWords += a.quoteText.split(/\s+/).filter(Boolean).length;
      }
    });

    return {
      totalAnnotations: list.length,
      totalFormatted: toWesternDigits(list.length),
      totalWords,
      totalWordsFormatted: toWesternDigits(totalWords),
      counts
    };
  }

  return {
    HIGHLIGHT_TINTS,
    PRIORITY_QUADRANTS,
    createAnnotation,
    summarizeAnnotations,
    sanitizeLocale,
    toWesternDigits,
    getLocalizedText
  };
}));
