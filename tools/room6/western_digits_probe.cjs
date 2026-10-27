'use strict';

// Read-only evidence helper. System labels are checked, never normalized. User
// strings stay byte-for-byte intact, including their own numeral conventions.
const numerals = require('../../android/app/src/main/assets/web/js/numeral_invariant_guard.js');
const calendar = require('../../android/app/src/main/assets/web/js/calendar_timezone_guard.js');
const SCHEMA_VERSION = 1;

function inspectLabels(input) {
  const labels = Array.isArray(input) ? input : [];
  const results = labels.map(label => {
    const text = label && label.text;
    const origin = label && label.origin;
    const kind = label && label.kind;
    if (origin === 'user' && typeof text === 'string') {
      return { origin, kind, text, status: 'PRESERVED', nonWesternDigits: [] };
    }
    if (origin !== 'system' || typeof text !== 'string' || !/\p{Decimal_Number}/u.test(text)) {
      return { origin, kind, text, status: 'NOT_TESTED', nonWesternDigits: [] };
    }
    const nonWesternDigits = Array.from(text).filter(char => /\p{Decimal_Number}/u.test(char) && !/[0-9]/.test(char));
    return { origin, kind, text, status: nonWesternDigits.length ? 'FAIL' : 'PASS', nonWesternDigits };
  });
  const status = results.some(label => label.status === 'FAIL') ? 'FAIL'
    : !results.length || results.some(label => label.status === 'NOT_TESTED') ? 'NOT_TESTED' : 'PASS';
  return {
    schemaVersion: SCHEMA_VERSION, status, labels: results,
    notTested: ['Android rendering, RTL visual layout and live WebView labels NOT_TESTED by this source probe']
  };
}

function probeSystemFormatters() {
  const labels = [0, 59, 60, 3599, 3600].map(seconds => ({
    origin: 'system', kind: 'timer', text: numerals.formatTimerDisplay(seconds)
  }));
  for (const [date, delta] of [['2024-02-28', 1], ['2025-02-27', 1], ['2025-12-31', 1]]) {
    labels.push({ origin: 'system', kind: 'date', text: calendar.addDaysSafe(date, delta) });
  }
  return inspectLabels(labels);
}

module.exports = { SCHEMA_VERSION, inspectLabels, probeSystemFormatters };
