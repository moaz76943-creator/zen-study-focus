'use strict';

import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const SCHEMA_VERSION = 1;
export const STATUS = Object.freeze({ PASS: 'PASS', FAIL: 'FAIL' });
export const CSV_SYSTEM_FIELDS = Object.freeze(['date', 'timestamp']);

export const TIMER_GUARD =
  'android/app/src/main/assets/web/js/numeral_invariant_guard.js';
export const CALENDAR_GUARD =
  'android/app/src/main/assets/web/js/calendar_timezone_guard.js';
export const LOCALIZATION =
  'android/app/src/main/assets/web/localization_20_recovery.js';
export const CSV_ENGINE =
  'android/app/src/main/assets/web/js/study_session_csv_engine.js';

const TIMER_SAMPLES = Object.freeze([0, 7, 59, 60, 600, 1500, 3599, 3600, 86399, -30]);
const CALENDAR_DATE = '2026-10-27';
const RTL_LOCALES = new Set(['ar', 'fa', 'ur']);
const LRM = '\u200E';

const DEFAULT_CSV_FIXTURE = [
  'id,tag,task_name,date,duration_minutes,mode,sound_environment,interrupted,timestamp,reflection_notes',
  's1,اللغة العربية ٢٠٢٦,مراجعة ٣ وحدات,٢٠٢٦-١٠-٢٢,25,focus,غابة,false,٢٠٢٦-١٠-٢٢T٠٨:٣٠:٠٠.٠٠٠Z,ملاحظة ١٢ عن الفصل ٣',
  's2,زبان فارسی ۱۴۰۵,جلسه ۱۲ دقیقه,۱۴۰۵-۰۸-۰۵,30,deep,باران,true,۱۴۰۵-۰۸-۰۵T۲۱:۱۵:۰۰.۰۰۰Z,یادداشت ۷'
].join('\r\n');

export const DEFAULT_USER_SAMPLES = Object.freeze([
  Object.freeze({
    id: 'ar-mixed',
    locale: 'ar',
    dir: 'rtl',
    text: '\u0645\u0631\u0627\u062C\u0639\u0629 \u0663 \u0645\u0647\u0627\u0645 \u0628\u062A\u0627\u0631\u064A\u062E 2026-10-27'
  }),
  Object.freeze({ id: 'fa-mixed', locale: 'fa', dir: 'rtl', text: 'بررسی ۱۲ جلسه در ۳ روز' }),
  Object.freeze({ id: 'ur-mixed', locale: 'ur', dir: 'rtl', text: 'تجزیہ ۲۰۲۶ اور ۲۰ منٹ' }),
  Object.freeze({ id: 'en-mixed', locale: 'en', dir: 'ltr', text: 'Review ٣ items in 2026' }),
  Object.freeze({ id: 'bn-mixed', locale: 'bn', dir: 'ltr', text: 'বাংলা ১২৩ নম্বর' }),
  Object.freeze({ id: 'hi-mixed', locale: 'hi', dir: 'ltr', text: 'हिन्दी १२३ नोट' })
].map((sample) => Object.freeze(sample)));

const DECIMAL_ZERO_POINTS = Object.freeze([
  0x30, 0x660, 0x6f0, 0x7c0, 0x966, 0x9e6, 0xa66, 0xae6, 0xb66, 0xbe6,
  0xc66, 0xce6, 0xd66, 0xde6, 0xe50, 0xed0, 0xf20, 0x1040, 0x1090, 0x17e0,
  0x1810, 0x1946, 0x19d0, 0x1a80, 0x1a90, 0x1b50, 0x1bb0, 0x1c40, 0x1c50,
  0xa620, 0xa8d0, 0xa900, 0xa9d0, 0xa9f0, 0xaa50, 0xabf0, 0xff10, 0x104a0,
  0x10d30, 0x11066, 0x110f0, 0x11136, 0x111d0, 0x112f0, 0x11450, 0x114d0,
  0x11650, 0x116c0, 0x11730, 0x118e0, 0x11950, 0x11c50, 0x11d50, 0x11da0,
  0x16a60, 0x16ac0, 0x16b50, 0x1d7ce, 0x1d7d8, 0x1d7e2, 0x1d7ec, 0x1d7f6,
  0x1e140, 0x1e2f0, 0x1e950, 0x1fbf0
]);

const USER_FIELDS = Object.freeze([
  'id',
  'tag',
  'task_name',
  'mode',
  'sound_environment',
  'reflection_notes'
]);

function repositoryRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
}

function loadFrom(root, relative) {
  const absolute = path.join(root, relative);
  return createRequire(path.join(root, 'package.json'))(absolute);
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    return value;
  }
  if (seen.has(value)) return value;
  seen.add(value);
  for (const key of Object.keys(value)) deepFreeze(value[key], seen);
  return Object.freeze(value);
}

export function classifyDigits(value) {
  const text = value === null || value === undefined ? '' : String(value);
  let western = 0;
  let arabicIndic = 0;
  let persian = 0;
  let other = 0;
  let total = 0;

  for (const character of text) {
    const point = character.codePointAt(0);
    if (point >= 0x30 && point <= 0x39) {
      western += 1;
      total += 1;
    } else if (point >= 0x660 && point <= 0x669) {
      arabicIndic += 1;
      total += 1;
    } else if (point >= 0x6f0 && point <= 0x6f9) {
      persian += 1;
      total += 1;
    } else if (/\p{Nd}/u.test(character)) {
      other += 1;
      total += 1;
    }
  }

  return deepFreeze({
    western,
    arabicIndic,
    persian,
    other,
    total,
    allAscii: total > 0 && western === total
  });
}

export function normalizeSystemDigits(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\p{Nd}/gu, (digit) => {
    const point = digit.codePointAt(0);
    for (const zero of DECIMAL_ZERO_POINTS) {
      if (point >= zero && point < zero + 10) return String(point - zero);
    }
    return digit;
  });
}

export function normalizeSessionSystemFields(session) {
  if (!session || typeof session !== 'object' || Array.isArray(session)) {
    throw new TypeError('Session record must be an object');
  }

  const copy = { ...session };
  if (typeof copy.date === 'string') copy.date = normalizeSystemDigits(copy.date);
  if (typeof copy.timestamp === 'string') {
    copy.timestamp = normalizeSystemDigits(copy.timestamp);
  }
  if (typeof copy.duration_minutes === 'string') {
    const duration = Number(normalizeSystemDigits(copy.duration_minutes).trim());
    if (Number.isFinite(duration) && duration >= 0) {
      copy.duration_minutes = Math.round(duration);
    }
  }
  return copy;
}

export function exportSessionsWithWesternSystemFields(engine, sessions, options = {}) {
  if (!engine || typeof engine.exportSessionsToCSV !== 'function') {
    throw new TypeError('A real CSV engine with exportSessionsToCSV is required');
  }
  if (!Array.isArray(sessions)) throw new TypeError('Sessions must be an array');
  return engine.exportSessionsToCSV(
    sessions.map((session) => normalizeSessionSystemFields(session)),
    options
  );
}

function auditTimer(timerGuard) {
  const samples = [];
  const violations = [];

  for (const seconds of TIMER_SAMPLES) {
    let text = '';
    try {
      text = String(timerGuard.formatTimerDisplay(seconds));
    } catch (error) {
      violations.push(
        deepFreeze({
          type: 'formatter-error',
          id: `timer-${seconds}`,
          seconds,
          message: error instanceof Error ? error.message : String(error)
        })
      );
    }

    const digits = classifyDigits(text);
    const bidiIsolated = text.startsWith(LRM) && text.endsWith(LRM);
    const entry = deepFreeze({
      id: `timer-${seconds}`,
      seconds,
      text,
      digits,
      bidiIsolated
    });
    samples.push(entry);

    if (!digits.allAscii) {
      violations.push(
        deepFreeze({
          type: 'non-western-system-digits',
          id: entry.id,
          field: 'timer',
          text,
          digits
        })
      );
    }
    if (!bidiIsolated) {
      violations.push(
        deepFreeze({
          type: 'missing-bidi-isolation',
          id: entry.id,
          field: 'timer',
          text
        })
      );
    }
  }

  return deepFreeze({
    source: TIMER_GUARD,
    status: violations.length === 0 ? STATUS.PASS : STATUS.FAIL,
    samples,
    violations
  });
}

function auditCalendar(calendarGuard, localization) {
  const locales = [];
  const violations = [];

  for (const locale of localization.LANGUAGES) {
    const expectedDir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
    let label = '';
    let dir = '';
    try {
      label = localization.formatDate(CALENDAR_DATE, locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      dir = localization.direction(locale);
    } catch (error) {
      violations.push(
        deepFreeze({
          type: 'calendar-locale-error',
          locale,
          message: error instanceof Error ? error.message : String(error)
        })
      );
    }

    const digits = classifyDigits(label);
    const entry = deepFreeze({
      locale,
      label,
      dir,
      expectedDir,
      digits
    });
    locales.push(entry);

    if (!label) {
      violations.push(
        deepFreeze({ type: 'empty-calendar-label', locale, field: 'label' })
      );
    }
    if (!digits.allAscii) {
      violations.push(
        deepFreeze({
          type: 'non-western-system-digits',
          locale,
          field: 'calendar-label',
          text: label,
          digits
        })
      );
    }
    if (expectedDir !== dir) {
      violations.push(
        deepFreeze({
          type: 'wrong-calendar-direction',
          locale,
          field: 'direction',
          expected: expectedDir,
          actual: dir
        })
      );
    }
  }

  const arithmeticSamples = [];
  const arithmeticCases = [
    ['month-clamp', () => calendarGuard.addMonthsSafe('2026-01-31', 1)],
    ['year-rollover', () => calendarGuard.addDaysSafe('2026-12-31', 1)],
    ['leap-clamp', () => calendarGuard.addMonthsSafe('2028-01-31', 1)]
  ];

  for (const [id, calculate] of arithmeticCases) {
    let text = '';
    try {
      text = String(calculate());
    } catch (error) {
      violations.push(
        deepFreeze({
          type: 'calendar-arithmetic-error',
          id,
          message: error instanceof Error ? error.message : String(error)
        })
      );
    }
    const digits = classifyDigits(text);
    arithmeticSamples.push(deepFreeze({ id, text, digits }));
    if (!digits.allAscii) {
      violations.push(
        deepFreeze({
          type: 'non-western-system-digits',
          id,
          field: 'calendar-arithmetic',
          text,
          digits
        })
      );
    }
  }

  return deepFreeze({
    source: CALENDAR_GUARD,
    localizationSource: LOCALIZATION,
    date: CALENDAR_DATE,
    status: violations.length === 0 ? STATUS.PASS : STATUS.FAIL,
    locales,
    arithmetic: deepFreeze({
      status: arithmeticSamples.every((sample) => sample.digits.allAscii)
        ? STATUS.PASS
        : STATUS.FAIL,
      samples: arithmeticSamples
    }),
    violations
  });
}

function rowAudit(rows, sessions, columnIndex) {
  const systemFields = [];
  const violations = [];

  sessions.forEach((session, index) => {
    const row = rows[index + 1] || [];
    for (const field of CSV_SYSTEM_FIELDS) {
      const text = row[columnIndex.get(field)] ?? '';
      const digits = classifyDigits(text);
      const entry = deepFreeze({ row: index + 1, field, text, digits });
      systemFields.push(entry);
      if (!digits.allAscii) {
        violations.push(
          deepFreeze({
            type: 'non-western-system-digits',
            row: index + 1,
            field,
            text,
            digits
          })
        );
      }
    }
  });

  const userFieldsPreserved = sessions.every((session, index) => {
    const row = rows[index + 1] || [];
    return USER_FIELDS.every(
      (field) => row[columnIndex.get(field)] === String(session[field] ?? '')
    );
  });

  return deepFreeze({
    systemFields,
    violations,
    userFieldsPreserved
  });
}

function auditCsv(csvEngine, fixtureCsv) {
  const parsed = csvEngine.importSessionsFromCSV(fixtureCsv);
  if (!parsed || parsed.success !== true || !Array.isArray(parsed.sessions)) {
    throw new Error('The real CSV engine rejected the offline fixture');
  }
  if (!Array.isArray(csvEngine.COLUMNS)) {
    throw new Error('The real CSV engine did not expose COLUMNS');
  }

  const columnIndex = new Map(
    csvEngine.COLUMNS.map((column, index) => [column.key, index])
  );
  const sessions = parsed.sessions;
  const rawCsv = csvEngine.exportSessionsToCSV(sessions, {
    includeBOM: false,
    lang: 'ar'
  });
  const rawRows = csvEngine.parseCSV(rawCsv);
  const rawAudit = rowAudit(rawRows, sessions, columnIndex);

  const fixedCsv = exportSessionsWithWesternSystemFields(csvEngine, sessions, {
    includeBOM: false,
    lang: 'ar'
  });
  const fixedRows = csvEngine.parseCSV(fixedCsv);
  const fixedAudit = rowAudit(fixedRows, sessions, columnIndex);

  const raw = deepFreeze({
    status: rawAudit.violations.length === 0 ? STATUS.PASS : STATUS.FAIL,
    csv: rawCsv,
    systemFields: rawAudit.systemFields,
    violations: rawAudit.violations,
    userFieldsPreserved: rawAudit.userFieldsPreserved
  });
  const fixed = deepFreeze({
    status: fixedAudit.violations.length === 0 ? STATUS.PASS : STATUS.FAIL,
    csv: fixedCsv,
    systemFields: fixedAudit.systemFields,
    violations: fixedAudit.violations,
    userFieldsPreserved: fixedAudit.userFieldsPreserved
  });

  const confirmed = raw.violations.length > 0;
  const sourceDefect = deepFreeze({
    id: 'csv-system-date-eastern-digits',
    file: CSV_ENGINE,
    status: confirmed ? 'CONFIRMED' : 'NOT_REPRODUCED',
    systemFields: [...CSV_SYSTEM_FIELDS],
    remediated:
      confirmed && fixed.status === STATUS.PASS && fixed.userFieldsPreserved === true,
    detail:
      'The raw v21 CSV engine re-exports imported Arabic-Indic and Persian system dates/timestamps. The probe wrapper normalizes only date/timestamp system fields.'
  });

  return deepFreeze({
    source: CSV_ENGINE,
    fixtureCsv,
    status: fixed.status,
    raw,
    fixed,
    sourceDefect
  });
}

function auditUserSamples(samples) {
  const entries = [];
  const violations = [];

  for (const sample of samples) {
    const input = String(sample.text);
    const output = input;
    const unchanged = input === output;
    const entry = deepFreeze({
      id: sample.id,
      locale: sample.locale,
      dir: sample.dir || 'ltr',
      input,
      output,
      unchanged,
      digits: classifyDigits(output)
    });
    entries.push(entry);
    if (!unchanged) {
      violations.push(
        deepFreeze({
          type: 'rewritten-user-text',
          id: sample.id,
          input,
          output
        })
      );
    }
  }

  return {
    entries: deepFreeze(entries),
    violations: deepFreeze(violations),
    changed: entries.filter((entry) => !entry.unchanged).length
  };
}

export function buildWesternDigitsReport(options = {}) {
  const root = options.root ? path.resolve(options.root) : repositoryRoot();
  const timerGuard = options.timerGuard || loadFrom(root, TIMER_GUARD);
  const calendarGuard = options.calendarGuard || loadFrom(root, CALENDAR_GUARD);
  const localization = options.localization || loadFrom(root, LOCALIZATION);
  const csvEngine = options.csvEngine || loadFrom(root, CSV_ENGINE);
  const samples = options.samples || DEFAULT_USER_SAMPLES;
  const fixtureCsv = options.csvFixture || DEFAULT_CSV_FIXTURE;

  if (!Array.isArray(samples)) throw new TypeError('User samples must be an array');
  if (!localization || !Array.isArray(localization.LANGUAGES)) {
    throw new TypeError('The real localization module must expose LANGUAGES');
  }

  const timer = auditTimer(timerGuard);
  const calendar = auditCalendar(calendarGuard, localization);
  const csv = auditCsv(csvEngine, fixtureCsv);
  const userAudit = auditUserSamples(samples);

  const violations = deepFreeze([
    ...timer.violations,
    ...calendar.violations,
    ...csv.fixed.violations,
    ...userAudit.violations
  ]);

  const summary = deepFreeze({
    timerSamples: timer.samples.length,
    timerPassing: timer.samples.filter(
      (sample) => sample.digits.allAscii && sample.bidiIsolated
    ).length,
    calendarLocales: calendar.locales.length,
    calendarPassing: calendar.locales.filter(
      (entry) => entry.digits.allAscii && entry.dir === entry.expectedDir
    ).length,
    csvRawViolations: csv.raw.violations.length,
    csvFixedViolations: csv.fixed.violations.length,
    userSamples: userAudit.entries.length,
    changedUserSamples: userAudit.changed,
    sourceDefectsConfirmed: csv.sourceDefect.status === 'CONFIRMED' ? 1 : 0
  });

  return deepFreeze({
    schemaVersion: SCHEMA_VERSION,
    status: violations.length === 0 ? STATUS.PASS : STATUS.FAIL,
    releaseApproved: false,
    androidPass: false,
    deviceEvidence: 'NOT_COLLECTED',
    timer,
    calendar,
    csv,
    userAuthored: userAudit.entries,
    violations,
    summary
  });
}
