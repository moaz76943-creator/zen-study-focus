'use strict';

const test = require('node:test');
const assert = require('node:assert');

const engine = require('../../android/app/src/main/assets/web/js/exam_countdown_binder.js');

test('C07: a missing or invalid deadline is not reported as today', () => {
  const referenceDate = '2026-10-26';
  const invalidTargets = [undefined, '', 'not-a-date'];

  for (const targetDateStr of invalidTargets) {
    const result = engine.evaluateExamCountdown(
      { title: 'اختبار', targetDateStr: targetDateStr },
      referenceDate
    );

    assert.strictEqual(
      result.isToday,
      false,
      `missing/invalid deadline ${JSON.stringify(targetDateStr)} must not be today`
    );
    assert.strictEqual(
      result.isPassed,
      false,
      `missing/invalid deadline ${JSON.stringify(targetDateStr)} must not be passed`
    );
    assert.doesNotMatch(
      result.badgeTextEn,
      /today/i,
      `missing/invalid deadline ${JSON.stringify(targetDateStr)} must not show the today badge`
    );
  }
});

test('C07: valid civil-day math is preserved across year and DST boundaries', () => {
  assert.strictEqual(engine.calculateDaysRemaining('2027-01-01', '2026-12-31'), 1);
  assert.strictEqual(engine.calculateDaysRemaining('2026-11-02', '2026-10-31'), 2);

  const future = engine.evaluateExamCountdown(
    { title: 'اختبار', targetDateStr: '2027-01-01' },
    '2026-12-31'
  );
  assert.strictEqual(future.daysRemaining, 1);
  assert.strictEqual(future.isToday, false);

  const expired = engine.evaluateExamCountdown(
    { title: 'اختبار', targetDateStr: '2026-10-24' },
    '2026-10-26'
  );
  assert.strictEqual(expired.daysRemaining, -2);
  assert.strictEqual(expired.isPassed, true);
  assert.strictEqual(expired.isToday, false);
});
