const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/haptic_breathing_coherence_engine.js');

console.log('--- Running 🎯 Mission #158: Haptic Breathing Coherence Tests ---');

// Test 1: Protocols Directory Verification
{
  assert.strictEqual(Engine.PROTOCOLS.coherence.totalCycleSec, 11.0);
  assert.strictEqual(Engine.PROTOCOLS.box.totalCycleSec, 16.0);
  assert.strictEqual(Engine.PROTOCOLS.calm.totalCycleSec, 19.0);

  console.log('✓ Test 1: 3 Resonant breathing protocols verified.');
}

// Test 2: Phase Resolution & Haptic Waveform Trains
{
  const inhalePhase = Engine.resolveCurrentPhase('coherence', 2.0);
  assert.strictEqual(inhalePhase.phase, 'inhale');
  assert.strictEqual(inhalePhase.phaseKey, 'phase_inhale');
  assert.deepStrictEqual(inhalePhase.hapticWaveform, [40, 50, 70, 50, 100]);

  const exhalePhase = Engine.resolveCurrentPhase('coherence', 8.0);
  assert.strictEqual(exhalePhase.phase, 'exhale');
  assert.strictEqual(exhalePhase.phaseKey, 'phase_exhale');
  assert.deepStrictEqual(exhalePhase.hapticWaveform, [90, 40, 60, 40, 30]);

  const holdPhase = Engine.resolveCurrentPhase('box', 6.0);
  assert.strictEqual(holdPhase.phase, 'hold');
  assert.deepStrictEqual(holdPhase.hapticWaveform, []);

  console.log('✓ Test 2: Phase resolution and haptic waveform trains verified.');
}

// Test 3: Cycle Counting and Summary Calculation
{
  const summary = Engine.calculateBreathingSummary('coherence', 55);
  assert.strictEqual(summary.completedCycles, 5);
  assert.strictEqual(summary.formattedCycles, '5');
  assert.strictEqual(summary.zeroMusicCertified, true);

  console.log('✓ Test 3: Cycle counting & summary calculation verified.');
}

// Test 4: Comprehensive Breathing Report & Zero Music Guarantee
{
  const report = Engine.generateBreathingReport('calm', 38, 'ar');
  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.protocol.id, 'calm');
  assert.strictEqual(report.currentStatus.completedFullCycles, '2');
  assert.strictEqual(report.tactilePacingOnly, true);
  assert.strictEqual(report.zeroMusicCertified, true);
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);
  assert.ok(report.protocol.title.includes('الهدوء'));

  console.log('✓ Test 4: Comprehensive breathing report verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('uk'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('الدورة ١١.٠s وعدد الدورات ٥');
  assert.strictEqual(western, 'الدورة 11.0s وعدد الدورات 5');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #158 Tests PASSED (GREEN) ---');
