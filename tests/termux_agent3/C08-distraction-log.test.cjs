'use strict';

const test = require('node:test');
const assert = require('node:assert');

const Engine = require('../../android/app/src/main/assets/web/js/distraction_log_engine.js');

test('C08: an over-capacity buffer is reduced to the maximum on the next record', () => {
  const oversized = [];
  for (let i = 0; i < 25; i++) {
    oversized.push({ id: 'dist_old_' + i, text: 'تشتت ' + i, elapsedSeconds: i, timestamp: 1000 + i });
  }
  const before = JSON.stringify(oversized);

  const result = Engine.recordDistraction(oversized, 'ملاحظة جديدة', 500);

  assert.strictEqual(result.length, Engine.MAX_BUFFER_ITEMS);
  assert.strictEqual(result[result.length - 1].text, 'ملاحظة جديدة');
  assert.strictEqual(result[0].text, 'تشتت 6');

  assert.strictEqual(oversized.length, 25);
  assert.strictEqual(JSON.stringify(oversized), before);
});
