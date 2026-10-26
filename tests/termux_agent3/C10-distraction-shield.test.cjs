'use strict';

const test = require('node:test');
const assert = require('node:assert');
const Engine = require('../../android/app/src/main/assets/web/js/distraction_shield_guardian_engine.js');

test('zero-encounter report exposes numeric zero counts, never "undefined"', () => {
  const report = Engine.generateShieldStatusReport('Focus', 1, 0, 0, 'en');

  assert.strictEqual(report.impulseMastery.score, '100.0%');
  assert.strictEqual(report.impulseMastery.resistedUrges, '0');
  assert.strictEqual(report.impulseMastery.exitsLogged, '0');
  assert.ok(!JSON.stringify(report).includes('undefined'));
});
