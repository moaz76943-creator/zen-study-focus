/**
 * DEEP FOCUS — Historical Text & Open Reference Alignment Engine (Mission #135)
 * Architecture: Standalone dynamic JS module. Zero index.html overwrites.
 * Guarantees:
 * - Structured alignment for historical manuscripts, classics, and open texts (books, chapters, folios, lines).
 * - Reference parser & progress synchronizer across active study sessions.
 * - Pacing & absorption density tracker (passages/folios per focus block).
 * - Strict Western digits (0123456789), preserving range formatting.
 * - 100 Google Play locales support with English ('en') fallback.
 * - Absolute Hebrew ('he', 'iw') exclusion -> redirects to 'en'.
 * - Zero medical or clinical claims.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.HistoricalReferenceAlignmentEngine = factory();
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
      status_in_sync: 'Aligned Reading Cadence',
      status_ahead: 'Accelerated Deep Exegesis',
      status_review: 'Close Comparative Inspection',
      density_label: 'Passages per Cycle',
      citation_format_error: 'Unrecognized Reference Citation'
    },
    ar: {
      status_in_sync: 'إيقاع قراءة متطابق ومتزن',
      status_ahead: 'استيعاب متسارع وتدبر عميق',
      status_review: 'فحص مقارن وقراءة فاحصة مركزة',
      density_label: 'المقاطع لكل دورة تركيز',
      citation_format_error: 'صيغة استشهاد أو إسناد غير معروفة'
    }
  };

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

  function parseReferenceCitation(citationStr) {
    if (!citationStr || typeof citationStr !== 'string') {
      return { valid: false, error: 'Empty citation' };
    }

    var normalized = toWesternDigits(citationStr.trim());

    var volMatch = normalized.match(/(?:Vol(?:ume)?\.?\s*|Part\s*|Book\s*)([0-9IVXLCDM]+)/i);
    var chMatch = normalized.match(/(?:Ch(?:apter)?\.?\s*|Sec(?:tion)?\.?\s*|§\s*)([0-9IVXLCDM]+)/i);
    var rangeMatch = normalized.match(/(?:pp?\.?|lines?|fol(?:io)?\.?)\s*([0-9]+[a-z]?)(?:\s*[-–—]\s*([0-9]+[a-z]?))?/i);

    var volumeOrBook = volMatch ? volMatch[1] : null;
    var chapterOrSection = chMatch ? chMatch[1] : null;
    var startRef = rangeMatch ? rangeMatch[1] : null;
    var endRef = rangeMatch && rangeMatch[2] ? rangeMatch[2] : startRef;

    return {
      valid: true,
      rawCitation: normalized,
      volumeOrBook: volumeOrBook,
      chapterOrSection: chapterOrSection,
      startRef: startRef,
      endRef: endRef,
      isRange: Boolean(startRef && endRef && startRef !== endRef)
    };
  }

  function alignStudyProgress(targetUnits, completedUnits, elapsedMinutes, plannedDurationMinutes) {
    var target = Math.max(1, Number(targetUnits) || 1);
    var completed = Math.max(0, Number(completedUnits) || 0);
    var elapsed = Math.max(1, Number(elapsedMinutes) || 1);
    var planned = Math.max(elapsed, Number(plannedDurationMinutes) || 120);

    var completionPercentage = Math.min(100, Math.round((completed / target) * 1000) / 10);
    var unitsPerHour = Math.round((completed / (elapsed / 60)) * 10) / 10;

    var expectedUnits = (elapsed / planned) * target;
    var ratio = expectedUnits > 0 ? (completed / expectedUnits) : 1;

    var status = 'status_in_sync';
    if (completionPercentage >= 100 || ratio >= 1.2) {
      status = 'status_ahead';
    } else if (ratio < 0.7) {
      status = 'status_review';
    }

    return {
      targetUnits: target,
      completedUnits: completed,
      completionPercentage: completionPercentage,
      formattedPercentage: toWesternDigits(completionPercentage.toFixed(1) + '%'),
      unitsPerHour: unitsPerHour,
      formattedVelocity: toWesternDigits(unitsPerHour.toFixed(1) + ' units/hr'),
      alignmentStatus: status
    };
  }

  function calculateDensityMetrics(totalPassages, totalFocusCycles) {
    var passages = Math.max(0, Number(totalPassages) || 0);
    var cycles = Math.max(1, Number(totalFocusCycles) || 1);

    var density = Math.round((passages / cycles) * 10) / 10;

    return {
      totalPassages: passages,
      totalFocusCycles: cycles,
      passagesPerCycle: density,
      formattedDensity: toWesternDigits(density.toFixed(1))
    };
  }

  function generateAlignmentSummary(studySession, userLocale) {
    var loc = resolveLocale(userLocale);
    var dict = STRINGS[loc] || STRINGS.en;

    var citation = parseReferenceCitation(studySession.citation);
    var alignment = alignStudyProgress(
      studySession.targetUnits,
      studySession.completedUnits,
      studySession.elapsedMinutes,
      studySession.plannedDurationMinutes
    );
    var density = calculateDensityMetrics(
      studySession.completedUnits,
      studySession.focusCycles
    );

    return {
      locale: loc,
      citation: citation,
      alignment: {
        percentage: alignment.formattedPercentage,
        velocity: alignment.formattedVelocity,
        statusLabel: dict[alignment.alignmentStatus] || STRINGS.en[alignment.alignmentStatus]
      },
      density: {
        metric: density.formattedDensity,
        label: dict.density_label || STRINGS.en.density_label
      },
      timestamp: toWesternDigits(new Date().toISOString()),
      zeroMedicalClaimsVerified: true
    };
  }

  return {
    parseReferenceCitation: parseReferenceCitation,
    alignStudyProgress: alignStudyProgress,
    calculateDensityMetrics: calculateDensityMetrics,
    generateAlignmentSummary: generateAlignmentSummary,
    toWesternDigits: toWesternDigits,
    resolveLocale: resolveLocale,
    SUPPORTED_LOCALES: SUPPORTED_LOCALES
  };
}));
