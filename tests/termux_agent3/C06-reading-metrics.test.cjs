'use strict';

const test = require('node:test');
const assert = require('node:assert');

const engine = require('../../android/app/src/main/assets/web/js/reading_speed_absorption_engine.js');

test('calculateReadingMetrics keeps pace/time finite and Western for a non-finite duration', () => {
  const result = engine.calculateReadingMetrics(1, 10, Infinity);

  assert.ok(
    Number.isFinite(result.durationMinutes),
    `durationMinutes must be finite, got ${result.durationMinutes}`
  );
  assert.ok(
    Number.isFinite(result.paceMinutesPerPage),
    `paceMinutesPerPage must be finite, got ${result.paceMinutesPerPage}`
  );
  assert.ok(Number.isFinite(result.wpm), `wpm must be finite, got ${result.wpm}`);

  assert.strictEqual(result.durationMinutes, 1);
  assert.strictEqual(result.durationFormatted, '1.0');
  assert.strictEqual(result.paceMinutesPerPage, 0.1);
  assert.strictEqual(result.paceFormatted, '0.10');
  assert.strictEqual(result.wpm, 2500);
  assert.strictEqual(result.wpmFormatted, '2500');
  assert.match(result.paceFormatted, /^[0-9]+(\.[0-9]+)?$/);
  assert.match(result.durationFormatted, /^[0-9]+(\.[0-9]+)?$/);

  const valid = engine.calculateReadingMetrics(1, 10, 20);
  assert.strictEqual(valid.pagesRead, 10);
  assert.strictEqual(valid.paceMinutesPerPage, 2);
  assert.strictEqual(valid.paceFormatted, '2.00');
  assert.strictEqual(valid.wpm, 125);
  assert.strictEqual(valid.durationFormatted, '20.0');
});
