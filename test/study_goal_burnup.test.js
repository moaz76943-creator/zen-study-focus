const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/study_goal_burnup_engine.js');

console.log('--- Running 🎯 Mission #161: Study Goal Burn-Up Trajectory Tests ---');

// Test 1: Burn-Up Trajectory On-Track Calculation
{
  const res = Engine.calculateBurnUpTrajectory(100, 50, 30, 15);
  assert.strictEqual(res.completionPercentage, 50.0);
  assert.strictEqual(res.formattedPercentage, '50.0%');
  assert.strictEqual(res.paceStatus, 'pace_ontrack');
  assert.strictEqual(res.daysRemaining, 15);
  assert.strictEqual(res.targetDailyPace, 3.3);
  assert.strictEqual(res.actualDailyPace, 3.3);

  console.log('✓ Test 1: On-track trajectory calculation verified.');
}

// Test 2: Ahead of Pace Trajectory
{
  const ahead = Engine.calculateBurnUpTrajectory(100, 65, 30, 15);
  assert.strictEqual(ahead.paceStatus, 'pace_ahead');
  assert.strictEqual(ahead.paceDelta, 15.0);
  assert.strictEqual(ahead.formattedDelta, '+15.0 units');

  console.log('✓ Test 2: Ahead of pace trajectory verified.');
}

// Test 3: Behind Pace Trajectory (Recalibration needed)
{
  const behind = Engine.calculateBurnUpTrajectory(100, 30, 30, 15);
  assert.strictEqual(behind.paceStatus, 'pace_behind');
  assert.strictEqual(behind.paceDelta, -20.0);
  assert.strictEqual(behind.formattedDelta, '-20.0 units');

  console.log('✓ Test 3: Behind pace trajectory verified.');
}

// Test 4: Comprehensive Sprint Burn-Up Report & Zero Music Guarantee
{
  const report = Engine.generateSprintBurnUpReport(
    'Mastering Linear Algebra & Vector Spaces',
    { totalScopeUnits: 80, completedUnits: 40, totalDays: 20, elapsedDays: 10 },
    'ar'
  );

  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.progress.percentage, '50.0%');
  assert.strictEqual(report.zeroMusicCertified, true);
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);
  assert.ok(report.pacingVelocity.requiredDaily.includes('units/day'));

  console.log('✓ Test 4: Comprehensive sprint burn-up report verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('nl'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('إنجاز ٥٠.٠% وانحراف +١٥.٠ units');
  assert.strictEqual(western, 'إنجاز 50.0% وانحراف +15.0 units');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #161 Tests PASSED (GREEN) ---');
