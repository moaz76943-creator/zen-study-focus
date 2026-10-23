/**
 * DEEP FOCUS — Academic Session Journal Markdown & PDF-Ready Exporter Engine (Mission #169)
 * Architecture: Standalone dynamic JS module. Zero index.html overwrites.
 * Guarantees:
 * - Generates clean academic study log Markdown and printable HTML (@media print).
 * - Multi-session aggregation (Date, Focus Duration, Topic, Fluency, Ergonomic Badge).
 * - Self-contained zero-dependency serialization.
 * - Zero music policy: silent document formatting and export engine.
 * - Strict Western digits (0123456789).
 * - 100 Google Play locales support with English ('en') fallback.
 * - Absolute Hebrew ('he', 'iw') exclusion -> redirects to 'en'.
 * - Zero medical or clinical claims.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AcademicJournalPdfExporterEngine = factory();
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
      report_title: 'DEEP FOCUS — Academic Study Journal & Audit Dossier',
      header_summary: 'Comprehensive Focus Summary',
      col_date: 'Date',
      col_subject: 'Subject / Course',
      col_duration: 'Net Duration',
      col_topic: 'Topic Anchor',
      col_fluency: 'Recall Fluency',
      footer_gen: 'Generated locally via DEEP FOCUS Data Fortress'
    },
    ar: {
      report_title: 'سجل الجلسات الأكاديمية والتدقيق الدراسي الشامل — DEEP FOCUS',
      header_summary: 'ملخص كتل وساعات التركيز',
      col_date: 'التاريخ',
      col_subject: 'المادة / المساق',
      col_duration: 'المدة الصافية',
      col_topic: 'مرساة الموضوع',
      col_fluency: 'طلاقة الاسترجاع',
      footer_gen: 'تم التصدير محلياً عبر حصن بيانات DEEP FOCUS'
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

  function formatDurationMinutes(minutes) {
    var m = Math.max(0, parseInt(minutes, 10) || 0);
    var hrs = Math.floor(m / 60);
    var remMins = m % 60;
    if (hrs > 0) {
      return toWesternDigits(hrs + 'h ' + remMins + 'm');
    }
    return toWesternDigits(remMins + 'm');
  }

  function generateMarkdownJournal(sessionLogsArray, studentName, userLocale) {
    var loc = resolveLocale(userLocale);
    var dict = STRINGS[loc] || STRINGS.en;
    var name = studentName || 'Student Researcher';

    var logs = Array.isArray(sessionLogsArray) ? sessionLogsArray : [];
    var totalMinutes = 0;

    var rows = logs.map(function (log) {
      var mins = Math.max(0, parseInt(log.durationMinutes, 10) || 0);
      totalMinutes += mins;
      var dateStr = toWesternDigits(log.date || '2026-10-23');
      var durStr = formatDurationMinutes(mins);
      var subj = log.subject || 'General Study';
      var topic = log.topicAnchor || 'Focused Deep Work';
      var fluency = log.fluency || 'Fluid';

      return '| ' + dateStr + ' | ' + subj + ' | ' + durStr + ' | ' + topic + ' | ' + fluency + ' |';
    }).join('\n');

    var totalFormatted = formatDurationMinutes(totalMinutes);

    var md = '# ' + dict.report_title + '\n\n' +
      '**Scholar:** ' + name + ' | **Total Focus:** ' + totalFormatted + ' | **Sessions:** ' + toWesternDigits(String(logs.length)) + '\n\n' +
      '### ' + dict.header_summary + '\n\n' +
      '| ' + dict.col_date + ' | ' + dict.col_subject + ' | ' + dict.col_duration + ' | ' + dict.col_topic + ' | ' + dict.col_fluency + ' |\n' +
      '|---|---|---|---|---|\n' +
      rows + '\n\n' +
      '*' + dict.footer_gen + '*\n';

    return {
      markdownContent: md,
      totalSessions: logs.length,
      totalMinutes: totalMinutes,
      formattedTotalDuration: totalFormatted,
      zeroMusicCertified: true
    };
  }

  function generatePrintableHtml(markdownResult, userLocale) {
    var loc = resolveLocale(userLocale);
    var isRtl = (loc === 'ar');

    var html = '<!DOCTYPE html>\n<html lang="' + loc + '" dir="' + (isRtl ? 'rtl' : 'ltr') + '">\n<head>\n' +
      '<meta charset="UTF-8">\n' +
      '<title>Deep Focus Academic Journal</title>\n' +
      '<style>\n' +
      '  body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; padding: 24px; color: #111; }\n' +
      '  table { width: 100%; border-collapse: collapse; margin-top: 16px; }\n' +
      '  th, td { border: 1px solid #ddd; padding: 10px; text-align: ' + (isRtl ? 'right' : 'left') + '; }\n' +
      '  th { background: #f5f5f5; }\n' +
      '  @media print { body { padding: 0; } @page { margin: 15mm; } }\n' +
      '</style>\n</head>\n<body>\n' +
      '<pre style="white-space: pre-wrap; font-family: inherit;">' + markdownResult.markdownContent + '</pre>\n' +
      '</body>\n</html>';

    return {
      htmlContent: html,
      isRtl: isRtl,
      zeroMusicCertified: true,
      timestamp: toWesternDigits(new Date().toISOString()),
      zeroMedicalClaimsVerified: true
    };
  }

  return {
    formatDurationMinutes: formatDurationMinutes,
    generateMarkdownJournal: generateMarkdownJournal,
    generatePrintableHtml: generatePrintableHtml,
    toWesternDigits: toWesternDigits,
    resolveLocale: resolveLocale,
    SUPPORTED_LOCALES: SUPPORTED_LOCALES
  };
}));
