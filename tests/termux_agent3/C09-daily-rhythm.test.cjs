'use strict';

const test = require('node:test');
const assert = require('node:assert');

const Engine = require('../../android/app/src/main/assets/web/js/daily_focus_rhythm_engine.js');

test('C09: a non-finite hour falls back to a Western 00:00 label instead of NaN', () => {
  for (const hour of [Infinity, -Infinity]) {
    const formatted = Engine.formatHourWestern(hour);

    assert.strictEqual(formatted, '\u200E00:00', `hour ${hour} must fall back to 00:00`);
    assert.match(
      formatted.slice(1),
      /^[0-9]{2}:00$/,
      'hour label must contain Western 0-9 digits only'
    );
  }

  assert.strictEqual(Engine.formatHourWestern(9), '\u200E09:00');
  assert.strictEqual(Engine.formatHourWestern(23), '\u200E23:00');
  assert.strictEqual(Engine.formatHourWestern(24), '\u200E00:00');
  assert.strictEqual(Engine.formatHourWestern(-1), '\u200E23:00');
});
