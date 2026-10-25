/**
 * DEEP FOCUS — BibTeX & Zotero Academic Exporter Engine
 * Cycle: CYCLE-123 (Mission #123)
 * Architecture: v21 Data Fortress Safe, Academic Citation Formatter & CSL-JSON Bridge
 * Strict Rules:
 *  - 100-Locale Support with Strict English-Only Fallback
 *  - Absolute Hebrew Exclusion (he, iw -> en)
 *  - Strict Western Digits 0123456789
 *  - 100% Offline (Local Reference Generator)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AcademicBibtexExporterEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ENTRY_TYPES = ['article', 'book', 'inproceedings', 'misc'];

  const I18N_STRINGS = {
    en: {
      export_success: "Academic reference exported successfully.",
      study_note_prefix: "Deep Focus Study Session",
      duration_label: "Duration",
      completed_on_label: "Completed on",
      citekey_generated: "Citekey generated: {key}"
    },
    ar: {
      export_success: "تم تصدير المرجع الأكاديمي بنجاح.",
      study_note_prefix: "جلسة مدارسة ديب فوكس",
      duration_label: "المدة",
      completed_on_label: "تاريخ الإنجاز",
      citekey_generated: "مفتاح الاقتباس: {key}"
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

  function generateCitekey(author = 'Author', year = 2026, title = 'Study') {
    const authorClean = String(author)
      .split(/[,;\s]+/)[0]
      .replace(/[^a-zA-Z0-9]/g, '') || 'Author';

    const yearClean = toWesternDigits(year).slice(-4) || '2026';

    const titleWord = String(title)
      .split(/\s+/)
      .map(w => w.replace(/[^a-zA-Z0-9]/g, ''))
      .find(w => w.length > 2) || 'Study';

    return `${authorClean}${yearClean}${titleWord.charAt(0).toUpperCase() + titleWord.slice(1)}`;
  }

  function formatBibtex(entryInput, sessionLink = null, locale = 'en') {
    const e = entryInput || {};
    const type = ENTRY_TYPES.includes(e.type) ? e.type : 'article';
    const citekey = e.citekey || generateCitekey(e.author, e.year, e.title);

    let noteContent = e.note || '';
    if (sessionLink) {
      const dur = sessionLink.durationMinutes ? toWesternDigits(sessionLink.durationMinutes) : '45';
      const date = sessionLink.date || '2026-10-23';
      const t = (k) => getLocalizedText(locale, k);
      const sessionNote = `${t('study_note_prefix')}: ${t('duration_label')} ${dur} min, ${t('completed_on_label')} ${date}.`;
      noteContent = noteContent ? `${noteContent} | ${sessionNote}` : sessionNote;
    }

    let bib = `@${type}{${citekey},\n`;
    if (e.title) bib += `  title = {${e.title}},\n`;
    if (e.author) bib += `  author = {${e.author}},\n`;
    if (e.year) bib += `  year = {${toWesternDigits(e.year)}},\n`;
    if (e.journal) bib += `  journal = {${e.journal}},\n`;
    if (e.booktitle) bib += `  booktitle = {${e.booktitle}},\n`;
    if (e.publisher) bib += `  publisher = {${e.publisher}},\n`;
    if (e.volume) bib += `  volume = {${toWesternDigits(e.volume)}},\n`;
    if (e.pages) bib += `  pages = {${toWesternDigits(e.pages)}},\n`;
    if (e.doi) bib += `  doi = {${e.doi}},\n`;
    if (noteContent) bib += `  note = {${noteContent}},\n`;

    bib = bib.replace(/,\n$/, '\n');
    bib += `}\n`;

    return {
      citekey,
      bibtex: bib,
      type
    };
  }

  function exportToCslJson(entryInput, sessionLink = null) {
    const e = entryInput || {};
    const citekey = e.citekey || generateCitekey(e.author, e.year, e.title);

    let type = 'article-journal';
    if (e.type === 'book') type = 'book';
    if (e.type === 'inproceedings') type = 'paper-conference';

    const csl = {
      id: citekey,
      type,
      title: e.title || '',
      author: [{ literal: e.author || '' }],
      issued: {
        'date-parts': [[parseInt(toWesternDigits(e.year || 2026), 10)]]
      }
    };

    if (e.journal) csl['container-title'] = e.journal;
    if (e.volume) csl.volume = toWesternDigits(e.volume);
    if (e.pages) csl.page = toWesternDigits(e.pages);
    if (e.doi) csl.DOI = e.doi;

    if (sessionLink) {
      csl.custom = {
        deepFocusDurationMinutes: sessionLink.durationMinutes ? parseInt(toWesternDigits(sessionLink.durationMinutes), 10) : 45,
        sessionDate: sessionLink.date || '2026-10-23'
      };
    }

    return csl;
  }

  return {
    ENTRY_TYPES,
    generateCitekey,
    formatBibtex,
    exportToCslJson,
    sanitizeLocale,
    toWesternDigits,
    getLocalizedText
  };
}));
