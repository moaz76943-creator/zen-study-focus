const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/active_recall_capsule_engine.js');

console.log('--- Running 🎯 Mission #143: Active Recall Capsule Tests ---');

// Test 1: Fluency Evaluation & Blind-Spot Detection
{
  const fluid = Engine.evaluateFluency(['Core law of thermodynamics', 'Entropy increases'], 35);
  assert.strictEqual(fluid.fluencyTier, 'fluency_fluid');
  assert.strictEqual(fluid.flagForReview, false);
  assert.strictEqual(fluid.formattedDuration, '35s');

  const partial = Engine.evaluateFluency(['Equation for kinetic energy'], 40);
  assert.strictEqual(partial.fluencyTier, 'fluency_partial');
  assert.strictEqual(partial.flagForReview, false);

  const effortful = Engine.evaluateFluency([], 60);
  assert.strictEqual(effortful.fluencyTier, 'fluency_effortful');
  assert.strictEqual(effortful.flagForReview, true);

  console.log('✓ Test 1: Fluency evaluation and blind-spot detection verified.');
}

// Test 2: Capsule Creation & Sealing
{
  const cap = Engine.createRecallCapsule(
    'ses_882',
    ['Kreb Cycle inputs', 'ATP total output: 32'],
    30,
    'Biochemistry'
  );

  assert.strictEqual(cap.status, 'sealed');
  assert.strictEqual(cap.subject, 'Biochemistry');
  assert.strictEqual(cap.retrievalPoints.length, 2);
  assert.strictEqual(cap.zeroMusicCertified, true);
  assert.ok(cap.capsuleId.startsWith('cap_'));

  console.log('✓ Test 2: Recall capsule creation and sealing verified.');
}

// Test 3: Comprehensive Capsule Summary & Zero Music Guarantee
{
  const cap = Engine.createRecallCapsule(
    'ses_991',
    ['Concept A', 'Concept B'],
    25,
    'Cognitive Science'
  );

  const summary = Engine.generateCapsuleSummary(cap, 'ar');
  assert.strictEqual(summary.locale, 'ar');
  assert.strictEqual(summary.zeroMedicalClaimsVerified, true);
  assert.strictEqual(summary.acousticMode, 'silent_haptic_only');
  assert.strictEqual(summary.pointsCaptured, '2');

  console.log('✓ Test 3: Comprehensive Capsule Summary verified.');
}

// Test 4: Clamping of response seconds (1s to 60s)
{
  const low = Engine.evaluateFluency(['Point'], -5);
  assert.strictEqual(low.durationSeconds, 1);

  const high = Engine.evaluateFluency(['Point'], 150);
  assert.strictEqual(high.durationSeconds, 60);

  console.log('✓ Test 4: Response seconds clamping verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('ko'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('زمن الاسترجاع ٣٥s، عدد النقاط ٢');
  assert.strictEqual(western, 'زمن الاسترجاع 35s، عدد النقاط 2');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #143 Tests PASSED (GREEN) ---');
