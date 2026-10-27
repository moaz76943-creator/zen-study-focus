const VERSION = 1;

const VERDICTS = Object.freeze({
  VERIFIED: 'verified',
  TRANSLATED: 'translated',
  REVIEW_REQUIRED: 'review_required',
  MACHINE_DRAFT: 'machine_draft',
  UNSPECIFIED: 'unspecified',
  IDENTICAL: 'identical',
  FALLBACK: 'fallback',
  INVALID: 'invalid'
});

const DEFAULT_VERIFIED_STATUSES = Object.freeze(['VERIFIED']);
const DEFAULT_FALLBACK_STATUSES = Object.freeze(['FALLBACK', 'MISSING']);

const VERDICT_KEYS = Object.freeze([
  'verified',
  'translated',
  'review_required',
  'machine_draft',
  'unspecified',
  'identical',
  'fallback',
  'invalid'
]);

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeStatus(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function normalizeStatusSet(values, label) {
  if (!Array.isArray(values)) throw new TypeError(label + ' must be an array of status strings');
  const result = new Set();
  for (const value of values) {
    if (typeof value !== 'string') throw new TypeError(label + ' must contain only strings');
    const status = normalizeStatus(value);
    if (status) result.add(status);
  }
  return result;
}

function joinKey(prefix, key) {
  return prefix ? prefix + '.' + key : key;
}

function collectDictionary(value, prefix, output) {
  for (const key of Object.keys(value)) {
    const child = value[key];
    const path = joinKey(prefix, key);
    if (isPlainObject(child)) collectDictionary(child, path, output);
    else output.push({ key: path, value: child });
  }
}

export function flattenDictionary(dictionary) {
  if (!isPlainObject(dictionary)) throw new TypeError('dictionary must be a plain object');
  const output = [];
  collectDictionary(dictionary, '', output);
  output.sort((left, right) => left.key < right.key ? -1 : left.key > right.key ? 1 : 0);
  return output;
}

function flattenBaseline(dictionary) {
  const output = new Map();
  const visit = (value, prefix) => {
    for (const key of Object.keys(value).sort()) {
      const child = value[key];
      const path = joinKey(prefix, key);
      if (isPlainObject(child)) visit(child, path);
      else if (typeof child !== 'string') throw new TypeError('baseline value must be a string at ' + path);
      else output.set(path, child);
    }
  };
  visit(dictionary, '');
  return output;
}

function looksLikeEntry(value) {
  return isPlainObject(value) &&
    (hasOwn(value, 'text') || hasOwn(value, 'value') || value.fallback === true);
}

function collectLocaleEntries(dictionary) {
  const output = new Map();
  const visit = (value, prefix) => {
    for (const key of Object.keys(value).sort()) {
      const child = value[key];
      const path = joinKey(prefix, key);
      if (looksLikeEntry(child)) output.set(path, child);
      else if (isPlainObject(child)) visit(child, path);
      else output.set(path, child);
    }
  };
  visit(dictionary, '');
  return output;
}

function unpackLocale(value) {
  if (!isPlainObject(value)) throw new TypeError('each locale must be a plain object');
  const wrapped = hasOwn(value, 'sections') || hasOwn(value, 'entries');
  const dictionary = wrapped
    ? (hasOwn(value, 'sections') ? value.sections : value.entries)
    : value;
  if (!isPlainObject(dictionary)) throw new TypeError('locale sections/entries must be a plain object');
  let status = '';
  if (hasOwn(value, 'status') && value.status != null) {
    if (typeof value.status !== 'string') throw new TypeError('locale status must be a string');
    status = normalizeStatus(value.status);
  }
  return { status, dictionary };
}

function readEntry(raw, packStatus) {
  if (typeof raw === 'string') {
    return { text: raw, status: packStatus, explicitFallback: false };
  }
  if (!isPlainObject(raw)) return { invalid: 'invalid_entry' };
  let status = packStatus;
  if (hasOwn(raw, 'status') && raw.status != null) {
    if (typeof raw.status !== 'string') return { invalid: 'invalid_status' };
    status = normalizeStatus(raw.status);
  }
  if (raw.fallback === true) return { text: null, status, explicitFallback: true };
  let text;
  if (hasOwn(raw, 'text')) text = raw.text;
  else if (hasOwn(raw, 'value')) text = raw.value;
  else return { invalid: 'missing_text' };
  if (typeof text !== 'string') return { invalid: 'non_string_text' };
  return { text, status, explicitFallback: false };
}

function classifyEntry(raw, baselineValue, options) {
  if (raw === undefined) {
    return { verdict: VERDICTS.FALLBACK, reason: 'missing_key', status: '', text: undefined };
  }
  const entry = readEntry(raw, options.packStatus);
  if (entry.invalid) {
    return { verdict: VERDICTS.INVALID, reason: entry.invalid, status: '', text: undefined };
  }
  if (entry.explicitFallback || options.fallbackStatuses.has(entry.status)) {
    return { verdict: VERDICTS.FALLBACK, reason: 'explicit_fallback', status: entry.status, text: entry.text };
  }
  if (entry.text.trim() === '') {
    return { verdict: VERDICTS.FALLBACK, reason: 'empty_value', status: entry.status, text: entry.text };
  }
  if (entry.text.trim() === baselineValue.trim()) {
    return { verdict: VERDICTS.IDENTICAL, reason: 'identical_to_baseline', status: entry.status, text: entry.text };
  }
  if (options.verifiedStatuses.has(entry.status)) {
    return { verdict: VERDICTS.VERIFIED, reason: 'verified_contextual', status: entry.status, text: entry.text };
  }
  if (entry.status === 'REVIEW_REQUIRED') {
    return { verdict: VERDICTS.REVIEW_REQUIRED, reason: 'review_required', status: entry.status, text: entry.text };
  }
  if (entry.status === 'MACHINE_DRAFT') {
    return { verdict: VERDICTS.MACHINE_DRAFT, reason: 'machine_draft', status: entry.status, text: entry.text };
  }
  if (entry.status === 'TRANSLATED') {
    return { verdict: VERDICTS.TRANSLATED, reason: 'translated_unverified', status: entry.status, text: entry.text };
  }
  return {
    verdict: VERDICTS.UNSPECIFIED,
    reason: entry.status ? 'unrecognized_status' : 'status_missing',
    status: entry.status,
    text: entry.text
  };
}

function emptyCounts() {
  return {
    verified: 0,
    translated: 0,
    review_required: 0,
    machine_draft: 0,
    unspecified: 0,
    identical: 0,
    fallback: 0,
    invalid: 0,
    total: 0
  };
}

function emptyKeys() {
  const value = {};
  for (const key of VERDICT_KEYS) value[key] = [];
  return value;
}

export function buildLocaleGapReport(options = {}) {
  if (!isPlainObject(options)) throw new TypeError('options must be a plain object');
  const baseline = options.baseline;
  const locales = options.locales;
  if (!isPlainObject(baseline)) throw new TypeError('baseline must be a plain object');
  if (!isPlainObject(locales)) throw new TypeError('locales must be a plain object');

  const fallbackLocale = options.fallbackLocale === undefined ? 'en' : options.fallbackLocale;
  if (typeof fallbackLocale !== 'string' || !fallbackLocale.trim()) {
    throw new TypeError('fallbackLocale must be a non-empty string');
  }
  const includeValues = options.includeValues === true;
  const verifiedStatuses = normalizeStatusSet(
    options.verifiedStatuses === undefined ? DEFAULT_VERIFIED_STATUSES : options.verifiedStatuses,
    'verifiedStatuses'
  );
  const fallbackStatuses = normalizeStatusSet(
    options.fallbackStatuses === undefined ? DEFAULT_FALLBACK_STATUSES : options.fallbackStatuses,
    'fallbackStatuses'
  );

  const baselineMap = flattenBaseline(baseline);
  const baselineKeys = Array.from(baselineMap.keys()).sort();
  const localeReports = Object.keys(locales).sort().map((code) => {
    const unpacked = unpackLocale(locales[code]);
    const entries = collectLocaleEntries(unpacked.dictionary);
    const counts = emptyCounts();
    const keys = emptyKeys();
    const gaps = [];

    for (const key of baselineKeys) {
      const baselineValue = baselineMap.get(key);
      const classified = classifyEntry(
        entries.has(key) ? entries.get(key) : undefined,
        baselineValue,
        { packStatus: unpacked.status, verifiedStatuses, fallbackStatuses }
      );
      counts[classified.verdict] += 1;
      keys[classified.verdict].push(key);
      if (classified.verdict !== VERDICTS.VERIFIED) {
        const gap = {
          key,
          verdict: classified.verdict,
          reason: classified.reason,
          status: classified.status
        };
        if (includeValues) {
          gap.baselineValue = baselineValue;
          gap.localeValue = classified.text;
        }
        gaps.push(gap);
      }
    }

    counts.total = baselineKeys.length;
    const total = baselineKeys.length;
    const ratio = (count) => total === 0 ? 0 : count / total;
    return {
      code,
      status: unpacked.status,
      counts,
      coverage: {
        verified: ratio(counts.verified),
        explicit: ratio(total - counts.fallback - counts.invalid),
        fallback: ratio(counts.fallback)
      },
      keys,
      gaps
    };
  });

  const report = {
    version: VERSION,
    fallbackLocale,
    baselineKeyCount: baselineKeys.length,
    locales: localeReports
  };
  report.summary = summarizeLocaleGapReport(report);
  return report;
}

export function summarizeLocaleGapReport(report) {
  if (!isPlainObject(report) || !Array.isArray(report.locales)) {
    throw new TypeError('report must contain a locales array');
  }
  const totals = emptyCounts();
  for (const locale of report.locales) {
    if (!isPlainObject(locale) || !isPlainObject(locale.counts)) {
      throw new TypeError('each locale report must contain counts');
    }
    for (const key of VERDICT_KEYS) totals[key] += Number(locale.counts[key]) || 0;
  }
  totals.locales = report.locales.length;
  totals.baselineKeys = Number(report.baselineKeyCount) || 0;
  return {
    version: VERSION,
    fallbackLocale: report.fallbackLocale,
    baselineKeyCount: Number(report.baselineKeyCount) || 0,
    locales: report.locales.map((locale) => ({
      code: locale.code,
      status: locale.status,
      counts: { ...locale.counts },
      coverage: { ...locale.coverage }
    })),
    totals
  };
}

const api = Object.freeze({
  VERSION,
  VERDICTS,
  DEFAULT_VERIFIED_STATUSES,
  DEFAULT_FALLBACK_STATUSES,
  flattenDictionary,
  buildLocaleGapReport,
  summarizeLocaleGapReport
});

export default api;
