const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/streak_resilience_recovery_engine.js');

console.log('--- Running 🎯 Mission #136: Streak Resilience & Recovery Tests ---');

// Test 1: Streak evaluation & Grace Shield protection
{
  const active = Engine.evaluateStreakState(15, 1, 1);
  assert.strictEqual(active.status, 'status_active');
  assert.strictEqual(active.effectiveStreak, 15);
  assert.strictEqual(active.isShieldApplied, false);

  const protectedStreak = Engine.evaluateStreakState(20, 2, 1);
  assert.strictEqual(protectedStreak.status, 'status_grace_protected');
  assert.strictEqual(protectedStreak.effectiveStreak, 20);
  assert.strictEqual(protectedStreak.isShieldApplied, true);
  assert.strictEqual(protectedStreak.remainingShields, 0);

  const recovery = Engine.evaluateStreakState(20, 3, 0);
  assert.strictEqual(recovery.status, 'status_recovery_mode');
  assert.strictEqual(recovery.effectiveStreak, 14);

  const fresh = Engine.evaluateStreakState(30, 7, 0);
  assert.strictEqual(fresh.status, 'status_fresh_start');
  assert.strictEqual(fresh.effectiveStreak, 0);

  console.log('✓ Test 1: Streak evaluation & Grace Shield protection verified.');
}

// Test 2: Paced recovery micro-session ramp plan
{
  const activePlan = Engine.generatePacedRecoveryPlan('status_active', 50);
  assert.strictEqual(activePlan.recommendedSessionMinutes, 50);
  assert.strictEqual(activePlan.rampTier, 'ramp_full_label');

  const recoveryPlan = Engine.generatePacedRecoveryPlan('status_recovery_mode', 50);
  assert.strictEqual(recoveryPlan.recommendedSessionMinutes, 15);
  assert.strictEqual(recoveryPlan.rampTier, 'ramp_micro_label');
  assert.strictEqual(recoveryPlan.sessionsRequiredToSeal, 2);

  const freshPlan = Engine.generatePacedRecoveryPlan('status_fresh_start', 45);
  assert.strictEqual(freshPlan.recommendedSessionMinutes, 15);

  console.log('✓ Test 2: Paced recovery micro-session ramp plan verified.');
}

// Test 3: 14-day Resilience consistency score
{
  const res = Engine.calculateResilienceScore(11);
  assert.strictEqual(res.activeDaysInWindow, 11);
  assert.strictEqual(res.resilienceScore, 78.6);
  assert.strictEqual(res.formattedScore, '78.6%');

  const zeroRes = Engine.calculateResilienceScore(0);
  assert.strictEqual(zeroRes.resilienceScore, 0.0);
  assert.strictEqual(zeroRes.formattedScore, '0.0%');

  console.log('✓ Test 3: Resilience score calculation verified.');
}

// Test 4: Comprehensive recovery report & zero medical claims
{
  const report = Engine.generateRecoveryReport({
    currentStreakDays: 18,
    daysSinceLastStudy: 2,
    availableGraceShields: 1,
    standardTargetMinutes: 45,
    activeDaysInLast14: 10
  }, 'ar');

  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);
  assert.strictEqual(report.streak.shieldProtected, true);
  assert.strictEqual(report.streak.effectiveDays, 18);
  assert.ok(report.resilience.formattedScore.includes('%'));
  assert.ok(report.plan.formattedMinutes.includes('m'));

  console.log('✓ Test 4: Comprehensive recovery report & zero medical claims verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('es'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('سلسلة ١٨ يوم، بنسبة ٧٨.٦%');
  assert.strictEqual(western, 'سلسلة 18 يوم، بنسبة 78.6%');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #136 Tests PASSED (GREEN) ---');
