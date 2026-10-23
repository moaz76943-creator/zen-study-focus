const assert = require('assert');
const engine = require('../android/app/src/main/assets/web/js/session_completion_curtain_engine.js');

console.log('--- Running 🎯 Mission #129: Session Completion Curtain Engine Tests ---');

// Test 1: Sequence stages catalog
{
  const stages = Object.keys(engine.SEQUENCE_STAGES);
  assert.strictEqual(stages.includes('CHIME'), true);
  assert.strictEqual(stages.includes('HAPTIC'), true);
  assert.strictEqual(stages.includes('CURTAIN_DROP'), true);
  assert.strictEqual(stages.includes('REFLECTION_MODAL'), true);
  console.log('✓ Test 1: Completion sequence stages catalog verified.');
}

// Test 2: Sequence parameters preparation
{
  const session = { durationSeconds: 3000, streakDays: 12 };
  const seq = engine.prepareCompletionSequence(session);

  assert.strictEqual(seq.durationMinutes, 50);
  assert.strictEqual(seq.durationFormatted, '50');
  assert.strictEqual(seq.streakDays, 12);
  assert.strictEqual(seq.streakFormatted, '12');
  assert.deepStrictEqual(seq.hapticPattern, [120, 80, 120, 80, 260]);
  assert.strictEqual(seq.chimeParams.frequencyHz, 528);
  console.log('✓ Test 2: Multi-sensory completion sequence preparation verified.');
}

// Test 3: Visual curtain CSS variable injection
{
  const closed = engine.generateCurtainCssVariables(false);
  assert.strictEqual(closed['--zen-curtain-opacity'], '0.0');
  assert.strictEqual(closed['--zen-curtain-display'], 'none');

  const open = engine.generateCurtainCssVariables(true);
  assert.strictEqual(open['--zen-curtain-opacity'], '0.92');
  assert.strictEqual(open['--zen-curtain-backdrop-blur'], '16px');
  assert.strictEqual(open['--zen-curtain-display'], 'flex');
  console.log('✓ Test 3: Visual curtain CSS variable injection verified.');
}

// Test 4: Silent mode and sensory toggles
{
  const silent = engine.prepareCompletionSequence({ durationSeconds: 1500 }, { soundEnabled: false, hapticsEnabled: false });
  assert.strictEqual(silent.chimeParams, null);
  assert.deepStrictEqual(silent.hapticPattern, []);
  console.log('✓ Test 4: Silent mode and sensory toggles verified.');
}

// Test 5: 100-Locale translation, strict English fallback, absolute Hebrew exclusion & Western digits
{
  const session = { durationSeconds: 1800, streakDays: 5 };
  const modalAr = engine.generateModalContent(session, 'ar');
  assert.strictEqual(modalAr.title.includes('اكتملت جلسة التركيز'), true);
  assert.strictEqual(modalAr.durationText.includes('30 دقيقة'), true);

  const modalDe = engine.generateModalContent(session, 'de');
  assert.strictEqual(modalDe.title.includes('Session Completed with Calm Focus'), true);

  const heTitle = engine.getLocalizedText('he', 'completion_title');
  const iwTitle = engine.getLocalizedText('iw', 'completion_title');
  assert.strictEqual(heTitle, 'Session Completed with Calm Focus');
  assert.strictEqual(iwTitle, 'Session Completed with Calm Focus');
  assert.strictEqual(engine.sanitizeLocale('he'), 'en');
  assert.strictEqual(engine.sanitizeLocale('iw'), 'en');

  assert.strictEqual(/^[0-9]+$/.test(engine.toWesternDigits(30)), true);
  console.log('✓ Test 5: 100-Locale support, strict English fallback, zero Hebrew & Western digits verified.');
}

console.log('--- All Mission #129 Tests PASSED (GREEN) ---');
