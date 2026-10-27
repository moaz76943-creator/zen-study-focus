'use strict';

/**
 * Focus Lab opt-in offline UI label catalogue.
 *
 * Only locales with real, human-reviewed label packs are published here:
 * English (en) and Arabic (ar). Every other locale falls back honestly to a
 * reviewed catalogue; no fabricated "99 translations" are produced.
 *
 * - Pure resolver only: no network, no storage, no side effects at import.
 * - Arabic results are flagged `rtl: true`; system-generated values keep
 *   Western (Latin) digits even in RTL locales.
 */

const DEFAULT_LOCALE = 'en';

const DIRECTION = {
  en: 'ltr',
  ar: 'rtl'
};

const LABELS = {
  en: {
    'focus_lab.title': 'Focus Lab',
    'focus_lab.studyPlans': 'Study plans',
    'focus_lab.reading': 'Reading',
    'focus_lab.weeklyIntentions': 'Weekly intentions',
    'focus_lab.sports': 'Sports',
    'focus_lab.projects': 'Projects',
    'focus_lab.start': 'Start',
    'focus_lab.stop': 'Stop',
    'focus_lab.reset': 'Reset',
    'focus_lab.sessionLength': 'Session length',
    'focus_lab.minutes': 'min',
    'focus_lab.completed': 'Completed',
    'focus_lab.today': 'Today',
    'focus_lab.streak': 'Streak',
    'focus_lab.offlineNotice': 'Offline mode: all data stays on this device'
  },
  ar: {
    'focus_lab.title': 'مختبر التركيز',
    'focus_lab.studyPlans': 'خطط الدراسة',
    'focus_lab.reading': 'القراءة',
    'focus_lab.weeklyIntentions': 'نوايا الأسبوع',
    'focus_lab.sports': 'الرياضة',
    'focus_lab.projects': 'المشاريع',
    'focus_lab.start': 'ابدأ',
    'focus_lab.stop': 'إيقاف',
    'focus_lab.reset': 'تصفير',
    'focus_lab.sessionLength': 'مدة الجلسة',
    'focus_lab.minutes': 'دقيقة',
    'focus_lab.completed': 'مكتمل',
    'focus_lab.today': 'اليوم',
    'focus_lab.streak': 'سلسلة متتابعة',
    'focus_lab.offlineNotice': 'وضع دون اتصال: تبقى البيانات على هذا الجهاز'
  }
};

/** BCP-47 language sub-tags with a directly reviewed pack (2-letter base). */
const REVIEWED_LANGUAGES = Object.keys(LABELS).sort();

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normaliseLocale(locale) {
  if (typeof locale !== 'string') return null;
  const trimmed = locale.trim();
  if (!trimmed) return null;
  return trimmed.replace(/_/g, '-');
}

/**
 * Classify a locale against the reviewed catalogue.
 * Returns one of:
 *  - { kind: 'supported', ... }  reviewed language (exact or regional variant)
 *    with `match: 'exact'|'language'`, e.g. 'en', 'en-GB', 'ar', 'ar-EG'
 *  - { kind: 'fallback', locale: 'fr', resolved: 'en' } no reviewed pack
 */
function classifyLocale(rawLocale) {
  const locale = normaliseLocale(rawLocale) || DEFAULT_LOCALE;
  const lower = locale.toLowerCase();
  const split = lower.indexOf('-');
  const base = split === -1 ? lower : lower.slice(0, split);

  if (isPlainObject(LABELS[base]) && REVIEWED_LANGUAGES.indexOf(base) !== -1) {
    return {
      kind: 'supported',
      match: (split === -1) ? 'exact' : 'language',
      locale: locale,
      resolved: base,
      direction: DIRECTION[base],
      reviewed: true
    };
  }

  return {
    kind: 'fallback',
    locale: locale,
    resolved: DEFAULT_LOCALE,
    direction: DIRECTION[DEFAULT_LOCALE],
    reviewed: false,
    reason: 'no reviewed label pack for this locale'
  };
}

function isDirectionRtl(resolved) {
  return DIRECTION[resolved] === 'rtl';
}

/**
 * Pure label resolver. Never throws, never invents translations.
 * @returns {{ key, value, locale, resolved, direction, rtl, source }}
 *   source = 'catalogue' when the reviewed pack had the key,
 *   source = 'fallback' (English) otherwise, or 'missing' if even English
 *   has never reviewed that key.
 */
function resolveLabel(key, rawLocale) {
  const classification = classifyLocale(rawLocale);
  const resolved = classification.resolved;
  const pack = LABELS[resolved];
  let value = null;
  let source;

  if (Object.prototype.hasOwnProperty.call(LABELS[DEFAULT_LOCALE], key)) {
    value = LABELS[DEFAULT_LOCALE][key];
  }

  if (isPlainObject(pack) && Object.prototype.hasOwnProperty.call(pack, key)) {
    value = pack[key];
    source = classification.kind === 'supported' ? 'catalogue' : 'fallback';
  } else if (value !== null) {
    source = 'fallback';
  } else {
    source = 'missing';
  }

  return {
    key: key,
    value: value,
    locale: normaliseLocale(rawLocale) || DEFAULT_LOCALE,
    resolved: resolved,
    direction: classification.direction,
    rtl: isDirectionRtl(resolved),
    digits: 'western',
    source: source
  };
}

/**
 * Western digits are deliberately retained for system-generated values,
 * including in RTL contexts, so timers and metrics stay machine-readable.
 * Contextual Arabic-Indic digit substitution is out of scope by design.
 */
function formatSystemValue(value, rawLocale) {
  const classification = classifyLocale(rawLocale);
  const text = String(value);
  if (/^[\d.,:%+\-/\s]*$/.test(text)) return text;
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  return text.replace(/\d/g, function (digit) {
    return digits[Number(digit, 10)];
  });
}

/**
 * Opt-in DOM application. Mirrors resolved labels into `node.textContent`
 * only (untrusted innerHTML is never used) and documents direction.
 * Returns the number of nodes updated.
 */
function applyLabels(root, rawLocale) {
  if (!isPlainObject(root) || typeof root.querySelectorAll !== 'function') {
    return 0;
  }
  const nodes = root.querySelectorAll('[data-focus-lab-label]');
  let updated = 0;
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    const key = node.getAttribute('data-focus-lab-label');
    if (typeof key !== 'string' || key.length === 0) continue;
    const resolved = resolveLabel(key, rawLocale);
    if (resolved.value === null) continue;
    node.textContent = resolved.value;
    if (typeof node.setAttribute === 'function') {
      node.setAttribute('dir', resolved.direction);
    }
    updated += 1;
  }
  return updated;
}

function listKeys(localeName) {
  const locale = normalizeCatalogue(localeName);
  return isPlainObject(LABELS[locale]) ? Object.keys(LABELS[locale]).sort() : [];
}

function normalizeCatalogue(localeName) {
  if (isPlainObject(LABELS[localeName]) && REVIEWED_LANGUAGES.indexOf(localeName) !== -1) {
    return localeName;
  }
  return DEFAULT_LOCALE;
}

const api = {
  DEFAULT_LOCALE: DEFAULT_LOCALE,
  REVIEWED_LANGUAGES: REVIEWED_LANGUAGES,
  LABELS: LABELS,
  DIRECTION: DIRECTION,
  classifyLocale: classifyLocale,
  resolveLabel: resolveLabel,
  formatSystemValue: formatSystemValue,
  applyLabels: applyLabels,
  listKeys: listKeys
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
} else if (typeof window !== 'undefined') {
  window.FocusLabI18n = api;
}
