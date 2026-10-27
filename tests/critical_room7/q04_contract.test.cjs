'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const MODULE = '../../tools/critical_room7/rtl_western_digit_probe.mjs';
const SOURCE = path.join(__dirname, MODULE);

const TIMER_GUARD =
  'android/app/src/main/assets/web/js/numeral_invariant_guard.js';
const CALENDAR_GUARD =
  'android/app/src/main/assets/web/js/calendar_timezone_guard.js';
const LOCALIZATION =
  'android/app/src/main/assets/web/localization_20_recovery.js';
const CSV_ENGINE =
  'android/app/src/main/assets/web/js/study_session_csv_engine.js';

const RTL_LOCALES = new Set(['ar', 'fa', 'ur']);
const NON_WESTERN_DIGITS = /[\u0660-\u0669\u06F0-\u06F9\u0900-\u096F\u09E6-\u09EF]/;

function load() {
  return import(MODULE);
}

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

test('Q04 probe reads the real v21 guards and stays read-only/offline', async () => {
  const { SCHEMA_VERSION, STATUS, CSV_SYSTEM_FIELDS } = await load();

  assert.equal(SCHEMA_VERSION, 1);
  assert.deepEqual(Object.values(STATUS).sort(), ['FAIL', 'PASS']);
  assert.deepEqual([...CSV_SYSTEM_FIELDS].sort(), ['date', 'timestamp']);

  const source = fs.readFileSync(SOURCE, 'utf8');
  assert.match(source, /'use strict'|"use strict"/);
  assert.doesNotMatch(source, /https?:\/\//);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\bchild_process\b/);
  assert.doesNotMatch(source, /\bwriteFile|\bappendFile|\bunlink|\brmSync/);
  assert.doesNotMatch(source, /\binnerHTML\b|\bouterHTML\b/);

  const files = [TIMER_GUARD, CALENDAR_GUARD, LOCALIZATION, CSV_ENGINE];
  const before = files.map((relative) => {
    const absolute = path.join(ROOT, relative);
    return {
      text: fs.readFileSync(absolute, 'utf8'),
      mtimeMs: fs.statSync(absolute).mtimeMs
    };
  });

  const report = await (await load()).buildWesternDigitsReport();

  assert.equal(report.releaseApproved, false);
  assert.equal(report.androidPass, false);
  assert.equal(report.timer.source, TIMER_GUARD);
  assert.equal(report.calendar.source, CALENDAR_GUARD);
  assert.equal(report.csv.source, CSV_ENGINE);
  assert.equal(report.calendar.localizationSource, LOCALIZATION);

  files.forEach((relative, index) => {
    const absolute = path.join(ROOT, relative);
    assert.equal(fs.readFileSync(absolute, 'utf8'), before[index].text);
    assert.equal(fs.statSync(absolute).mtimeMs, before[index].mtimeMs);
  });
});

test('Q04 timer fixtures use Western 0-9 and explicit LTR isolation', async () => {
  const { buildWesternDigitsReport } = await load();
  const report = buildWesternDigitsReport();
  const expected = new Map([
    [0, '00:00'],
    [7, '00:07'],
    [59, '00:59'],
    [60, '01:00'],
    [600, '10:00'],
    [1500, '25:00'],
    [3599, '59:59'],
    [3600, '01:00:00'],
    [86399, '23:59:59'],
    [-30, '00:00']
  ]);

  assert.equal(report.timer.status, 'PASS');
  assert.deepEqual(report.timer.violations, []);
  assert.equal(report.timer.samples.length, expected.size);

  for (const sample of report.timer.samples) {
    assert.equal(sample.text.replace(/\u200E/g, ''), expected.get(sample.seconds));
    assert.equal(sample.bidiIsolated, true, sample.id);
    assert.equal(sample.digits.allAscii, true, sample.id);
    assert.equal(sample.digits.arabicIndic, 0, sample.id);
    assert.equal(sample.digits.persian, 0, sample.id);
    assert.equal(sample.digits.other, 0, sample.id);
    assert.ok(sample.digits.western > 0, sample.id);
    assert.doesNotMatch(sample.text, NON_WESTERN_DIGITS, sample.id);
  }
});

test('Q04 calendar labels stay Western across 20 locales with contextual RTL', async () => {
  const { buildWesternDigitsReport } = await load();
  const report = buildWesternDigitsReport();

  assert.equal(report.calendar.status, 'PASS');
  assert.deepEqual(report.calendar.violations, []);
  assert.equal(report.calendar.locales.length, 20);
  assert.deepEqual(
    [...new Set(report.calendar.locales.map((item) => item.locale))].length,
    20
  );

  for (const entry of report.calendar.locales) {
    assert.ok(entry.label.length > 0, entry.locale);
    assert.equal(entry.dir, RTL_LOCALES.has(entry.locale) ? 'rtl' : 'ltr', entry.locale);
    assert.equal(entry.expectedDir, entry.dir, entry.locale);
    assert.equal(entry.digits.allAscii, true, entry.locale);
    assert.equal(entry.digits.arabicIndic, 0, entry.locale);
    assert.equal(entry.digits.persian, 0, entry.locale);
    assert.equal(entry.digits.other, 0, entry.locale);
    assert.ok(entry.digits.western > 0, entry.locale);
    assert.doesNotMatch(entry.label, NON_WESTERN_DIGITS, entry.locale);
  }

  assert.equal(report.calendar.arithmetic.status, 'PASS');
  assert.deepEqual(
    report.calendar.arithmetic.samples.map((sample) => [sample.id, sample.text]),
    [
      ['month-clamp', '2026-02-28'],
      ['year-rollover', '2027-01-01'],
      ['leap-clamp', '2028-02-29']
    ]
  );
  for (const sample of report.calendar.arithmetic.samples) {
    assert.equal(sample.digits.allAscii, true, sample.id);
  }
});

test('Q04 reproduces the real CSV system-date leak from the v21 CSV engine', async () => {
  const { buildWesternDigitsReport } = await load();
  const report = buildWesternDigitsReport();
  const raw = report.csv.raw;

  assert.equal(raw.status, 'FAIL');
  assert.ok(raw.violations.length >= 4);
  assert.ok(raw.violations.some((item) => item.field === 'date'));
  assert.ok(raw.violations.some((item) => item.field === 'timestamp'));
  assert.ok(raw.violations.some((item) => item.digits.arabicIndic > 0));
  assert.ok(raw.violations.some((item) => item.digits.persian > 0));
  assert.equal(raw.userFieldsPreserved, true);
  assert.equal(report.csv.sourceDefect.status, 'CONFIRMED');
  assert.equal(report.csv.sourceDefect.remediated, true);
  assert.equal(report.csv.sourceDefect.file, CSV_ENGINE);
  assert.equal(report.csv.sourceDefect.systemFields.join(','), 'date,timestamp');
});

test('Q04 fixed CSV export normalizes only system fields and preserves authored text', async () => {
  const { buildWesternDigitsReport, exportSessionsWithWesternSystemFields } = await load();
  const {
    importSessionsFromCSV
  } = require(path.join(ROOT, CSV_ENGINE));
  const report = buildWesternDigitsReport();
  const fixed = report.csv.fixed;

  assert.equal(fixed.status, 'PASS');
  assert.deepEqual(fixed.violations, []);
  assert.equal(fixed.systemFields.every((item) => item.digits.allAscii), true);
  assert.equal(fixed.systemFields.every((item) => item.digits.other === 0), true);
  assert.deepEqual(
    fixed.systemFields
      .filter((item) => item.field === 'date')
      .map((item) => item.text),
    ['2026-10-22', '1405-08-05']
  );
  assert.match(fixed.csv, /2026-10-22T08:30:00\.000Z/);
  assert.ok(fixed.csv.includes('مراجعة ٣ وحدات'));
  assert.ok(fixed.csv.includes('جلسه ۱۲ دقیقه'));
  assert.ok(fixed.csv.includes('ملاحظة ١٢ عن الفصل ٣'));
  assert.equal(fixed.userFieldsPreserved, true);

  const parsed = importSessionsFromCSV(report.csv.fixtureCsv);
  assert.equal(parsed.success, true);
  assert.equal(parsed.sessions.length, 2);

  const again = exportSessionsWithWesternSystemFields(
    require(path.join(ROOT, CSV_ENGINE)),
    parsed.sessions,
    { includeBOM: false, lang: 'ar' }
  );
  assert.equal(again, fixed.csv);
  assert.ok(again.includes('مراجعة ٣ وحدات'));
  assert.ok(again.includes('جلسه ۱۲ دقیقه'));
  assert.ok(again.includes('ملاحظة ١٢ عن الفصل ٣'));
});

test('Q04 user-authored digit sequences are never routed through normalization', async () => {
  const { buildWesternDigitsReport, DEFAULT_USER_SAMPLES } = await load();
  const samples = [
    ...DEFAULT_USER_SAMPLES,
    { id: 'bidi-authored', locale: 'ar', dir: 'rtl', text: '\u200Fمراجعة ٢٠٢٦\u200F' }
  ];
  const report = buildWesternDigitsReport({ samples });

  assert.equal(report.userAuthored.length, samples.length);
  for (const sample of samples) {
    const entry = report.userAuthored.find((item) => item.id === sample.id);
    assert.ok(entry, sample.id);
    assert.equal(entry.input, sample.text, sample.id);
    assert.equal(entry.output, sample.text, sample.id);
    assert.equal(entry.unchanged, true, sample.id);
    assert.equal(entry.dir, sample.dir, sample.id);
  }

  const arabic = report.userAuthored.find((item) => item.id === 'ar-mixed');
  const persian = report.userAuthored.find((item) => item.id === 'fa-mixed');
  const bidi = report.userAuthored.find((item) => item.id === 'bidi-authored');
  assert.ok(arabic.digits.arabicIndic > 0);
  assert.ok(persian.digits.persian > 0);
  assert.ok(bidi.output.startsWith('\u200F') && bidi.output.endsWith('\u200F'));
  assert.equal(report.summary.changedUserSamples, 0);
  assert.equal(report.status, 'PASS');
});

test('Q04 a broken timer formatter fails closed instead of reporting PASS', async () => {
  const { buildWesternDigitsReport } = await load();
  const report = buildWesternDigitsReport({
    timerGuard: {
      formatTimerDisplay: () => '\u200E٢٥:٠٠\u200E'
    }
  });

  assert.equal(report.status, 'FAIL');
  assert.equal(report.timer.status, 'FAIL');
  assert.ok(
    report.timer.violations.some(
      (item) => item.type === 'non-western-system-digits' && item.id === 'timer-1500'
    )
  );
  assert.equal(report.csv.fixed.status, 'PASS');
  assert.equal(report.calendar.status, 'PASS');
});

test('Q04 report data is deeply frozen for safe inspection', async () => {
  const { buildWesternDigitsReport } = await load();
  const report = buildWesternDigitsReport();

  assert.equal(Object.isFrozen(report), true);
  assert.equal(Object.isFrozen(report.summary), true);
  assert.equal(Object.isFrozen(report.timer), true);
  assert.equal(Object.isFrozen(report.timer.samples), true);
  assert.equal(Object.isFrozen(report.timer.samples[0]), true);
  assert.equal(Object.isFrozen(report.timer.samples[0].digits), true);
  assert.equal(Object.isFrozen(report.calendar), true);
  assert.equal(Object.isFrozen(report.calendar.locales), true);
  assert.equal(Object.isFrozen(report.calendar.locales[0]), true);
  assert.equal(Object.isFrozen(report.calendar.arithmetic), true);
  assert.equal(Object.isFrozen(report.csv), true);
  assert.equal(Object.isFrozen(report.csv.raw), true);
  assert.equal(Object.isFrozen(report.csv.raw.violations), true);
  assert.equal(Object.isFrozen(report.csv.fixed), true);
  assert.equal(Object.isFrozen(report.csv.fixed.systemFields), true);
  assert.equal(Object.isFrozen(report.csv.sourceDefect), true);
  assert.equal(Object.isFrozen(report.userAuthored), true);
  assert.equal(Object.isFrozen(report.userAuthored[0]), true);
  assert.equal(Object.isFrozen(report.violations), true);
});
