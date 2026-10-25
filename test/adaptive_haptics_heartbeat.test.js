const assert = require('assert');
const engine = require('../android/app/src/main/assets/web/js/adaptive_haptics_heartbeat_engine.js');

console.log('--- Running 🎯 Mission #112: Adaptive Haptics & Heartbeat Pulse Tests ---');

// Test 1: Rhythm presets catalog
{
  const presets = engine.RHYTHM_PRESETS;
  assert.strictEqual(presets.CALM_HEARTBEAT.bpm, 60);
  assert.strictEqual(presets.FLOW_METRONOME.bpm, 50);
  assert.strictEqual(presets.TACTILE_DOUBLE_TAP.bpm, 75);
  assert.strictEqual(presets.CALM_HEARTBEAT.pattern.length, 4);
  console.log('✓ Test 1: Tactile rhythm presets & BPM parameters verified.');
}

// Test 2: Sequence generation and cycle repeat
{
  const seq = engine.generateRhythmSequence('CALM_HEARTBEAT', { repeatCycles: 3 });
  assert.strictEqual(seq.length, 12);
  assert.strictEqual(seq[0], 60);
  assert.strictEqual(seq[1], 90);
  assert.strictEqual(seq[2], 45);
  assert.strictEqual(seq[3], 800);
  console.log('✓ Test 2: Multi-cycle tactile pulse sequence construction verified.');
}

// Test 3: Power saver battery adaptation
{
  const normal = engine.generateRhythmSequence('CALM_HEARTBEAT', { repeatCycles: 4 }, false);
  const lowBat = engine.generateRhythmSequence('CALM_HEARTBEAT', { repeatCycles: 4 }, true);

  assert.strictEqual(lowBat[0], 30);
  assert.strictEqual(lowBat[2], 23);
  assert.strictEqual(lowBat.length, 8);
  assert.strictEqual(normal.length, 16);
  console.log('✓ Test 3: Power saver adaptive scaling and battery protection verified.');
}

// Test 4: Milestone countdown alert patterns
{
  assert.deepStrictEqual(engine.getMilestoneAlertPattern(10), [80, 100, 80]);
  assert.deepStrictEqual(engine.getMilestoneAlertPattern(5), [100, 120, 100]);
  assert.deepStrictEqual(engine.getMilestoneAlertPattern(1), [120, 80, 120, 80, 120]);
  assert.deepStrictEqual(engine.getMilestoneAlertPattern(0), [150, 100, 150, 100, 250]);
  assert.deepStrictEqual(engine.getMilestoneAlertPattern(15), []);
  console.log('✓ Test 4: Dynamic countdown milestone escalation patterns verified.');
}

// Test 5: 100-Locale translation, strict English fallback, absolute Hebrew exclusion & Western digits
{
  const arDesc = engine.getLocalizedText('ar', 'rhythm_calm_heartbeat');
  assert.strictEqual(arDesc.includes('نبض القلب الهادئ'), true);

  const ptDesc = engine.getLocalizedText('pt', 'rhythm_calm_heartbeat');
  assert.strictEqual(ptDesc.includes('Calm Heartbeat Rhythm'), true);

  const heDesc = engine.getLocalizedText('he', 'rhythm_calm_heartbeat');
  const iwDesc = engine.getLocalizedText('iw', 'rhythm_calm_heartbeat');
  assert.strictEqual(heDesc.includes('Calm Heartbeat Rhythm'), true);
  assert.strictEqual(iwDesc.includes('Calm Heartbeat Rhythm'), true);
  assert.strictEqual(engine.sanitizeLocale('he'), 'en');
  assert.strictEqual(engine.sanitizeLocale('iw'), 'en');

  assert.strictEqual(/^[0-9]+$/.test(engine.toWesternDigits(60)), true);
  console.log('✓ Test 5: 100-Locale support, strict English fallback, zero Hebrew & Western digits verified.');
}

console.log('--- All Mission #112 Tests PASSED (GREEN) ---');
