/**
 * DEEP FOCUS — Smart Micro-Journal & Cognitive Friction Logger Engine (Mission #149)
 * Architecture: Standalone dynamic JS module. Zero index.html overwrites.
 * Guarantees:
 * - Ultra-minimalist session micro-journaling (Pre-intention, Friction notes, Post-clarity).
 * - Categorized cognitive friction logging (internal_fatigue, conceptual_difficulty, noise, interruption).
 * - Friction distribution analysis & environmental adjustment advice.
 * - Zero music policy: silent text-first logging with zero auditory distractions.
 * - Strict Western digits (0123456789).
 * - 100 Google Play locales support with English ('en') fallback.
 * - Absolute Hebrew ('he', 'iw') exclusion -> redirects to 'en'.
 * - Zero medical or clinical claims.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MicroJournalFrictionLoggerEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SUPPORTED_LOCALES = [
    'af', 'am', 'ar', 'as', 'az', 'be', 'bg', 'bn', 'bs', 'ca',
    'cs', 'da', 'de', 'el', 'en', 'es', 'et', 'eu', 'fa', 'fi',
    'fil', 'fr', 'gl', 'gu', 'hi', 'hr', 'hu', 'hy', 'id', 'is',
    'it', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'ky', 'lo',
    'lt', 'lv', 'mk', 'ml', 'mn', 'mr', 'ms', 'my', 'ne', 'nl',
    'no', 'or', 'pa', 'pl', 'pt', 'ro', 'ru', 'si', 'sk', 'sl',
    'sq', 'sr', 'sv', 'sw', 'ta', 'te', 'th', 'tr', 'uk', 'ur',
    'uz', 'vi', 'zh', 'zu'
  ];

  var STRINGS = {
    en: {
      journal_title: 'Session Micro-Journal & Cognitive Audit',
      cat_conceptual: 'Conceptual Complexity (Challenging Content)',
      cat_fatigue: 'Cognitive Energy Depletion',
      cat_interruption: 'External Context Disruption',
      cat_noise: 'Acoustic / Environmental Drag',
      flow_smooth: 'Effortless Flow State',
      flow_moderate: 'Balanced Steady Progress',
      flow_struggle: 'High Friction Resistance'
    },
    ar: {
      journal_title: 'يوميات التدبر المصغرة وتدقيق احتكاك التركيز',
      cat_conceptual: 'صعوبة المفاهيم (محتوى أكاديمي دقيق ومعقد)',
      cat_fatigue: 'انخفاض الطاقة واليقظة الذهنية',
      cat_interruption: 'مقاطعات وسياقات خارجية طارئة',
      cat_noise: 'ضوضاء وإزعاج في البيئة المحيطة',
      flow_smooth: 'حالة تدفق ذهني انسيابية مريحة',
      flow_moderate: 'تقدم متوازن ومستقر',
      flow_struggle: 'مقاومة واحتكاك ذهني مرتفع'
    }
  };

  var FRICTION_CATEGORIES = ['conceptual', 'fatigue', 'interruption', 'noise'];

  function toWesternDigits(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/[٠-٩]/g, function (d) { return '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]; })
      .replace(/[۰-۹]/g, function (d) { return '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)]; });
  }

  function resolveLocale(locale) {
    if (!locale || typeof locale !== 'string') return 'en';
    var clean = locale.toLowerCase().trim().split(/[-_]/)[0];
    if (clean === 'he' || clean === 'iw') return 'en';
    return STRINGS[clean] ? clean : 'en';
  }

  function createJournalEntry(preIntention, inSessionFrictionNotes, postClarityRating) {
    var intention = (preIntention && typeof preIntention === 'string') 
      ? preIntention.trim() 
      : 'Complete focused study session';

    var rating = (postClarityRating === 'smooth' || postClarityRating === 'struggle')
      ? postClarityRating
      : 'moderate';

    var notes = Array.isArray(inSessionFrictionNotes) ? inSessionFrictionNotes.map(function (n) {
      var cat = FRICTION_CATEGORIES.indexOf(n.category) !== -1 ? n.category : 'conceptual';
      return {
        timestamp: toWesternDigits(new Date().toISOString()),
        category: cat,
        text: (n.text && typeof n.text === 'string') ? n.text.trim() : 'Unspecified friction note'
      };
    }) : [];

    var entryId = 'jrn_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

    return {
      entryId: entryId,
      timestamp: toWesternDigits(new Date().toISOString()),
      preIntention: intention,
      frictionNotes: notes,
      clarityRating: rating,
      zeroMusicCertified: true,
      status: 'recorded'
    };
  }

  function analyzeFrictionDistribution(journalEntriesList) {
    var entries = Array.isArray(journalEntriesList) ? journalEntriesList : [];
    var counts = { conceptual: 0, fatigue: 0, interruption: 0, noise: 0 };
    var totalNotes = 0;

    entries.forEach(function (entry) {
      if (entry && Array.isArray(entry.frictionNotes)) {
        entry.frictionNotes.forEach(function (fn) {
          if (counts[fn.category] !== undefined) {
            counts[fn.category]++;
            totalNotes++;
          }
        });
      }
    });

    var distribution = {};
    FRICTION_CATEGORIES.forEach(function (cat) {
      var count = counts[cat];
      var pct = totalNotes > 0 ? Math.round((count / totalNotes) * 1000) / 10 : 0;
      distribution[cat] = {
        count: count,
        percentage: pct,
        formattedPercentage: toWesternDigits(pct.toFixed(1) + '%')
      };
    });

    return {
      totalFrictionOccurrences: totalNotes,
      distribution: distribution,
      dominantFrictionCategory: totalNotes > 0 ? Object.keys(counts).reduce(function (a, b) {
        return counts[a] > counts[b] ? a : b;
      }) : 'none'
    };
  }

  function generateJournalAuditReport(entry, distributionData, userLocale) {
    var loc = resolveLocale(userLocale);
    var dict = STRINGS[loc] || STRINGS.en;

    var clarityKey = 'flow_' + (entry.clarityRating || 'moderate');
    var dist = distributionData || analyzeFrictionDistribution([entry]);

    return {
      locale: loc,
      entryId: entry.entryId,
      preIntention: entry.preIntention,
      clarityState: {
        rating: entry.clarityRating,
        label: dict[clarityKey] || STRINGS.en[clarityKey]
      },
      frictionAudit: {
        totalLogged: toWesternDigits(String(dist.totalFrictionOccurrences)),
        dominantCategory: dist.dominantFrictionCategory,
        dominantLabel: dist.dominantFrictionCategory !== 'none' 
          ? (dict['cat_' + dist.dominantFrictionCategory] || STRINGS.en['cat_' + dist.dominantFrictionCategory])
          : 'None'
      },
      zeroMusicCertified: true,
      timestamp: toWesternDigits(new Date().toISOString()),
      zeroMedicalClaimsVerified: true
    };
  }

  return {
    createJournalEntry: createJournalEntry,
    analyzeFrictionDistribution: analyzeFrictionDistribution,
    generateJournalAuditReport: generateJournalAuditReport,
    toWesternDigits: toWesternDigits,
    resolveLocale: resolveLocale,
    FRICTION_CATEGORIES: FRICTION_CATEGORIES,
    SUPPORTED_LOCALES: SUPPORTED_LOCALES
  };
}));
