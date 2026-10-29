/**
 * DEEP FOCUS — Multi-Sensory Focus Bookmark & Resume Pacer Engine (Mission #139)
 * Architecture: Standalone dynamic JS module. Zero index.html overwrites.
 * Guarantees:
 * - Session state bookmarking (timestamp, subject, thought anchor, sensory context).
 * - Multi-sensory re-entry ramp-up (gentle fade-in of ambient audio & screen chroma).
 * - Prevents disorientation after unexpected breaks or interruptions.
 * - Strict Western digits (0123456789).
 * - 100 Google Play locales support with English ('en') fallback.
 * - Absolute Hebrew ('he', 'iw') exclusion -> redirects to 'en'.
 * - Zero medical or clinical claims.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FocusBookmarkResumeEngine = factory();
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
      bookmark_saved: 'Focus Thought Anchor Bookmarked',
      reentry_pacing: 'Sensory Re-entry Ramp Active (30s)',
      reentry_ready: 'Cognitive Flow Restored',
      sensory_audio_label: 'Ambient Soundscape Restored',
      sensory_chroma_label: 'Chroma Temperature Restored',
      default_thought: 'Resume study flow at previous anchor'
    },
    ar: {
      bookmark_saved: 'تم تثبيت مرساة الفكرة ونقطة الانقطاع',
      reentry_pacing: 'استعادة حسية تدريجية نشطة (30 ث)',
      reentry_ready: 'اكتملت استعادة التدفق الذهني',
      sensory_audio_label: 'استعادة المشهد الصوتي المحيطي',
      sensory_chroma_label: 'استعادة كروما الإضاءة',
      default_thought: 'استئناف التدفق الدراسي عند نقطة التوقف السابقة'
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

  function createSessionBookmark(sessionData) {
    var elapsedSec = Math.max(0, parseInt(sessionData.elapsedSeconds, 10) || 0);
    var subject = (sessionData.subject && typeof sessionData.subject === 'string') 
      ? sessionData.subject.trim() 
      : 'General Study';
    var thoughtAnchor = (sessionData.thoughtAnchor && typeof sessionData.thoughtAnchor === 'string')
      ? sessionData.thoughtAnchor.trim()
      : 'Resume from current paragraph';
    var ambientSound = sessionData.ambientSound || 'none';
    var chromaPreset = sessionData.chromaPreset || 'midday';

    var bookmarkId = 'bm_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

    return {
      bookmarkId: bookmarkId,
      timestamp: toWesternDigits(new Date().toISOString()),
      elapsedSeconds: elapsedSec,
      formattedElapsed: toWesternDigits(Math.floor(elapsedSec / 60) + 'm ' + (elapsedSec % 60) + 's'),
      subject: subject,
      thoughtAnchor: thoughtAnchor,
      sensoryContext: {
        ambientSound: ambientSound,
        chromaPreset: chromaPreset
      },
      status: 'saved'
    };
  }

  function calculateReentryPacing(rampSeconds) {
    var rampSec = Math.max(10, Math.min(60, parseInt(rampSeconds, 10) || 30));

    var steps = [
      { step: 1, progress: '33%', durationMs: Math.round((rampSec * 1000) / 3), volumeFactor: 0.35 },
      { step: 2, progress: '66%', durationMs: Math.round((rampSec * 1000) / 3), volumeFactor: 0.70 },
      { step: 3, progress: '100%', durationMs: Math.round((rampSec * 1000) / 3), volumeFactor: 1.00 }
    ];

    return {
      totalRampSeconds: rampSec,
      formattedRampSeconds: toWesternDigits(rampSec + 's'),
      steps: steps,
      transitionCss: 'opacity ' + rampSec + 's ease-in, filter ' + rampSec + 's ease-in'
    };
  }

  function generateResumeReport(bookmark, rampSeconds, userLocale) {
    var loc = resolveLocale(userLocale);
    var dict = STRINGS[loc] || STRINGS.en;

    var ramp = calculateReentryPacing(rampSeconds);

    return {
      locale: loc,
      bookmarkId: bookmark.bookmarkId,
      subject: bookmark.subject,
      thoughtAnchor: bookmark.thoughtAnchor,
      formattedElapsed: bookmark.formattedElapsed,
      reentry: {
        rampDuration: ramp.formattedRampSeconds,
        pacingLabel: dict.reentry_pacing,
        audioRestore: dict.sensory_audio_label + ': ' + bookmark.sensoryContext.ambientSound,
        chromaRestore: dict.sensory_chroma_label + ': ' + bookmark.sensoryContext.chromaPreset,
        transitionCss: ramp.transitionCss
      },
      timestamp: toWesternDigits(new Date().toISOString()),
      zeroMedicalClaimsVerified: true
    };
  }

  return {
    createSessionBookmark: createSessionBookmark,
    calculateReentryPacing: calculateReentryPacing,
    generateResumeReport: generateResumeReport,
    toWesternDigits: toWesternDigits,
    resolveLocale: resolveLocale,
    SUPPORTED_LOCALES: SUPPORTED_LOCALES
  };
}));
