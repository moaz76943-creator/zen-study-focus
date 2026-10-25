const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/exam_readiness_simulator_engine.js');

console.log('--- Running 🎯 Mission #165: Exam Readiness Simulator Tests ---');

// Test 1: High Readiness Scenario
{
  const high = Engine.calculateExamReadiness(90, 85, 1.1);
  assert.strictEqual(high.tierKey, 'readiness_high');
  assert.ok(high.readinessScore >= 80.0);
  assert.strictEqual(high.formattedReadiness, high.readinessScore.toFixed(1) + '%');

  console.log('✓ Test 1: High readiness tier calculation verified.');
}

// Test 2: Moderate Readiness Scenario
{
  const mod = Engine.calculateExamReadiness(60, 60, 1.0);
  assert.strictEqual(mod.tierKey, 'readiness_moderate');

  console.log('✓ Test 2: Moderate readiness tier calculation verified.');
}

// Test 3: At-Risk Readiness Scenario
{
  const risk = Engine.calculateExamReadiness(30, 40, 0.5);
  assert.strictEqual(risk.tierKey, 'readiness_at_risk');
  assert.ok(risk.readinessScore < 55.0);

  console.log('✓ Test 3: At-risk readiness tier calculation verified.');
}

// Test 4: Comprehensive Readiness Report Generation & Zero Music Guarantee
{
  const report = Engine.generateReadinessReport('Electromagnetism & Optics', 85, 80, 1.0, 'ar');
  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.examSubject, 'Electromagnetism & Optics');
  assert.strictEqual(report.zeroMusicCertified, true);
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);
  assert.ok(report.readiness.score.includes('%'));
  assert.ok(report.readiness.tierLabel.includes('جاهزية'));

  console.log('✓ Test 4: Comprehensive readiness report verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('ko'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('جاهزية ٨٢.٥% وتغطية ٨٥.٠%');
  assert.strictEqual(western, 'جاهزية 82.5% وتغطية 85.0%');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #165 Tests PASSED (GREEN) ---');
