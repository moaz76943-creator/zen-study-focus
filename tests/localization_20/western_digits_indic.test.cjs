'use strict';
/* Scoped 07-03 RED/GREEN regression: generated display numerals only. */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const locale = require('../../android/app/src/main/assets/web/localization_20_recovery.js');

test('generated UI digits use Western 0-9 for Hindi, Bengali, Arabic and Persian input', () => {
  const cases = [
    '०१२३४५६७८९', // Devanagari
    '০১২৩৪৫৬৭৮৯', // Bengali
    '٠١٢٣٤٥٦٧٨٩', // Arabic-Indic
    '۰۱۲۳۴۵۶۷۸۹'  // Extended Arabic-Indic
  ];
  for (const value of cases) {
    assert.equal(locale.westernDigits(value), '0123456789', value);
  }
  assert.equal(locale.westernDigits('2026 10:25'), '2026 10:25');
});

test('Indic numerals in user-authored notes are not converted by locale apply', () => {
  const original = 'मेरी नोट १२३ / আমার নোট ১২৩';
  const authored = {
    textContent: original,
    getAttribute: () => 'analyticsTitle',
    closest: () => ({tagName:'SECTION'}),
    setAttribute: () => {throw Error('user content modified');}
  };
  const root = {
    querySelectorAll: () => [authored]
  };
  assert.equal(locale.apply(root, 'bn'), 0);
  assert.equal(authored.textContent, original);
});

test('number and date formatters still select Latin digits for Hindi and Bengali', () => {
  for (const language of ['hi', 'bn', 'ar', 'fa', 'ur']) {
    assert.doesNotMatch(locale.formatNumber(1234567890, language), /[\u0660-\u0669\u06f0-\u06f9\u0966-\u096f\u09e6-\u09ef]/u);
    assert.doesNotMatch(locale.formatDate(new Date('2026-10-20T12:00:00Z'), language, {day:'numeric', month:'numeric', year:'numeric', timeZone:'UTC'}), /[\u0660-\u0669\u06f0-\u06f9\u0966-\u096f\u09e6-\u09ef]/u);
  }
});
