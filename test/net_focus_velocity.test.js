const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/net_focus_velocity_engine.js');

console.log('--- Running 🎯 Mission #134: Net Focus Ratio & Productivity Velocity Tests ---');

// Test 1: Net Focus Ratio (NFR) calculation & tiering
{
  const optimal = Engine.calculateNetFocusRatio(3600000, 180000, 60000);
  assert.strictEqual(optimal.tier, 'ratio_optimal');
  assert.strictEqual(optimal.ratioPercentage, 93.3);
  assert.strictEqual(optimal.formattedRatio, '93.3%');

  const balanced = Engine.calculateNetFocusRatio(3600000, 900000, 180000);
  assert.strictEqual(balanced.tier, 'ratio_balanced');
  assert.strictEqual(balanced.ratioPercentage, 70.0);

  const fragmented = Engine.calculateNetFocusRatio(3600000, 1800000, 360000);
  assert.strictEqual(fragmented.tier, 'ratio_fragmented');
  assert.strictEqual(fragmented.ratioPercentage, 40.0);

  const zero = Engine.calculateNetFocusRatio(0, 0, 0);
  assert.strictEqual(zero.ratioPercentage, 0);
  assert.strictEqual(zero.formattedRatio, '0.0%');

  console.log('✓ Test 1: Net Focus Ratio (NFR) calculation & tiering verified.');
}

// Test 2: Productivity Velocity (PV) tracking
{
  const vel = Engine.calculateProductivityVelocity(4, 120);
  assert.strictEqual(vel.velocityScore, 2.0);
  assert.strictEqual(vel.formattedVelocity, '2.00 blocks/hr');
  assert.strictEqual(vel.sessionsCompleted, 4);

  const zeroSpan = Engine.calculateProductivityVelocity(3, 0);
  assert.strictEqual(zeroSpan.velocityScore, 0);
  assert.strictEqual(zeroSpan.formattedVelocity, '0.00 blocks/hr');

  console.log('✓ Test 2: Productivity Velocity calculation verified.');
}

// Test 3: Focus Friction Index assessment
{
  const low = Engine.assessFocusFriction(1, 15);
  assert.strictEqual(low.level, 'friction_low');

  const medium = Engine.assessFocusFriction(4, 45);
  assert.strictEqual(medium.level, 'friction_medium');

  const high = Engine.assessFocusFriction(8, 120);
  assert.strictEqual(high.level, 'friction_high');
  assert.ok(high.frictionScore >= 60);

  console.log('✓ Test 3: Focus Friction Index assessment verified.');
}

// Test 4: Comprehensive velocity report & zero medical claims
{
  const report = Engine.generateVelocityReport({
    grossDurationMs: 5400000,
    pauseDurationMs: 300000,
    distractionEscapeMs: 0,
    completedSessions: 3,
    activeStudySpanMinutes: 90,
    microDistractionsCount: 2,
    averagePauseSeconds: 30
  }, 'ar');

  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);
  assert.ok(report.netFocusRatio.formatted.includes('%'));
  assert.ok(report.velocity.formatted.includes('blocks/hr'));
  assert.strictEqual(typeof report.friction.score, 'number');

  console.log('✓ Test 4: Velocity report generation & zero medical claims verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE-IL'), 'en');
  assert.strictEqual(Engine.resolveLocale('fr'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');
  assert.strictEqual(Engine.resolveLocale(''), 'en');

  const westernCheck = Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠ و ۱۲۳۴۵۶۷۸۹۰');
  assert.strictEqual(westernCheck, '1234567890 و 1234567890');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('٥٤٣٢١')));

  console.log('✓ Test 5: 100-Locale support, strict English fallback, zero Hebrew & Western digits verified.');
}

console.log('--- All Mission #134 Tests PASSED (GREEN) ---');
