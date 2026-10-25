const assert = require('assert');
const engine = require('../android/app/src/main/assets/web/js/desk_stretch_sync_engine.js');

console.log('--- Running 🎯 Mission #117: Desk Stretch Audio-Haptic Sync Tests ---');

// Test 1: Catalogs & phases
{
  const exercises = engine.getExercises();
  assert.strictEqual(exercises.length, 5);
  assert.strictEqual(exercises.some(e => e.id === 'NECK_SIDE_TILT'), true);
  assert.strictEqual(exercises.some(e => e.id === 'SHOULDER_ROLLS'), true);

  const phases = Object.keys(engine.PHASES);
  assert.strictEqual(phases.includes('PREPARE'), true);
  assert.strictEqual(phases.includes('STRETCH'), true);
  assert.strictEqual(phases.includes('HOLD'), true);
  assert.strictEqual(phases.includes('RELEASE'), true);
  assert.strictEqual(phases.includes('SWITCH_SIDE'), true);
  assert.strictEqual(phases.includes('COMPLETE'), true);
  console.log('✓ Test 1: Mobility exercises catalog & stretch phases verified.');
}

// Test 2: Sensory cues per phase
{
  const cueStretch = engine.getPhaseCue('STRETCH');
  assert.deepStrictEqual(cueStretch.vibrationPattern, [80, 60, 80]);
  assert.strictEqual(cueStretch.chimeFrequencyHz, 528);

  const cueHold = engine.getPhaseCue('HOLD');
  assert.deepStrictEqual(cueHold.vibrationPattern, [30]);
  assert.strictEqual(cueHold.chimeFrequencyHz, 330);
  console.log('✓ Test 2: Phase-specific haptic pulse patterns and chime frequencies verified.');
}

// Test 3: Unilateral vs Bilateral exercise timelines
{
  const neck = engine.buildExerciseTimeline('NECK_SIDE_TILT', 20);
  assert.strictEqual(neck.isBilateral, true);
  assert.strictEqual(neck.timeline.some(s => s.phase === 'SWITCH_SIDE'), true);
  assert.strictEqual(neck.totalDurationSec, 56);
  assert.strictEqual(neck.totalDurationFormatted, '56s');

  const shoulders = engine.buildExerciseTimeline('SHOULDER_ROLLS', 15);
  assert.strictEqual(shoulders.isBilateral, false);
  assert.strictEqual(shoulders.timeline.some(s => s.phase === 'SWITCH_SIDE'), false);
  assert.strictEqual(shoulders.totalDurationSec, 23);
  console.log('✓ Test 3: Routine timeline builder and bilateral symmetry verified.');
}

// Test 4: Mute and silent mode handling
{
  const silentCue = engine.getPhaseCue('RELEASE', { hapticsEnabled: false, soundEnabled: false });
  assert.deepStrictEqual(silentCue.vibrationPattern, []);
  assert.strictEqual(silentCue.chimeFrequencyHz, null);

  const hapticsOnly = engine.getPhaseCue('COMPLETE', { soundEnabled: false });
  assert.strictEqual(hapticsOnly.chimeFrequencyHz, null);
  assert.deepStrictEqual(hapticsOnly.vibrationPattern, [120, 80, 120, 80, 240]);
  console.log('✓ Test 4: Silent mode and individual sensory toggles verified.');
}

// Test 5: 100-Locale translation, strict English fallback & zero Hebrew
{
  const arTitle = engine.getLocalizedText('ar', 'exercise_neck');
  assert.strictEqual(arTitle.includes('إمالة الرقبة'), true);

  const daTitle = engine.getLocalizedText('da', 'exercise_neck');
  assert.strictEqual(daTitle.includes('Gentle Neck Side Tilt'), true);

  const heTitle = engine.getLocalizedText('he', 'exercise_neck');
  const iwTitle = engine.getLocalizedText('iw', 'exercise_neck');
  assert.strictEqual(heTitle.includes('Gentle Neck Side Tilt'), true);
  assert.strictEqual(iwTitle.includes('Gentle Neck Side Tilt'), true);
  assert.strictEqual(engine.sanitizeLocale('he'), 'en');
  assert.strictEqual(engine.sanitizeLocale('iw'), 'en');

  assert.strictEqual(/^[0-9]+s$/.test(engine.buildExerciseTimeline('WRIST_RELEASE').totalDurationFormatted), true);
  console.log('✓ Test 5: 100-Locale support, strict English fallback, zero Hebrew & Western digits verified.');
}

console.log('--- All Mission #117 Tests PASSED (GREEN) ---');
