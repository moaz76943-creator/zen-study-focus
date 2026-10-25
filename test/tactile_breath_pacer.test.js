/**
 * DEEP FOCUS — Test Suite: Tactile Breath Pacer Engine (M091)
 * File: test/tactile_breath_pacer.test.js
 */

const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/tactile_breath_pacer_engine.js');

console.log('--- Running 🎯 Mission #091: Tactile Breath Pacer Tests ---');

// Test 1: Verify 4 breathing patterns
try {
  const patterns = Engine.getPatterns();
  assert.strictEqual(patterns.length, 4, 'Must provide exactly 4 patterns');

  const requiredIds = ['box_breathing', 'calming_4_7_8', 'resonant_coherence', 'refresh_energizer'];
  requiredIds.forEach(id => {
    const p = patterns.find(item => item.id === id);
    assert(p, `Pattern ${id} must exist`);
    assert(p.name_ar && p.name_ar.length > 0, `Pattern ${id} must have Arabic name`);
    assert(p.name_en && p.name_en.length > 0, `Pattern ${id} must have English name`);
    assert(Array.isArray(p.phases) && p.phases.length >= 2, `Pattern ${id} must have at least 2 phases`);
  });

  const box = Engine.getPatternById('box_breathing');
  assert.strictEqual(box.cycle_duration_sec, 16, 'Box breathing cycle must be 16 seconds');

  const calming = Engine.getPatternById('calming_4_7_8');
  assert.strictEqual(calming.cycle_duration_sec, 19, '4-7-8 cycle must be 19 seconds');

  console.log('✓ Test 1: 4 non-medical breathing patterns & timing accuracy verified.');
} catch (err) {
  console.error('✗ Test 1 Failed:', err.message);
  process.exit(1);
}

// Test 2: Full Session Lifecycle & Transitions
try {
  const session = Engine.createPacerSession('box_breathing', 2, { hapticStrength: 'medium' });
  assert.strictEqual(session.patternId, 'box_breathing');
  assert.strictEqual(session.targetCycles, 2);
  assert.strictEqual(session.totalSessionSec, 32);
  assert.strictEqual(session.status, 'idle');

  session.status = 'running';

  Engine.stepSession(session, 4);
  assert.strictEqual(session.currentPhaseIndex, 1, 'Should advance to phase 1 (hold_in)');
  assert(session.lastHapticEvent !== null, 'Haptic event should be emitted on phase transition');
  assert.strictEqual(session.lastHapticEvent.phase, 'hold_in');

  Engine.stepSession(session, 12);
  assert.strictEqual(session.currentCycle, 2, 'Should advance to cycle 2');
  assert.strictEqual(session.currentPhaseIndex, 0, 'Phase should reset to 0 (inhale)');

  Engine.stepSession(session, 16);
  assert.strictEqual(session.status, 'completed', 'Session should complete after 2 full cycles');
  assert.strictEqual(session.sessionElapsedSec, 32, 'Total elapsed should equal target');

  console.log('✓ Test 2: Session lifecycle, phase transitions, and completion verified.');
} catch (err) {
  console.error('✗ Test 2 Failed:', err.message);
  process.exit(1);
}

// Test 3: Haptic Scaling and Safe Fallback
try {
  const baseHaptic = [20, 60, 20];
  const subtle = Engine.scaleHaptic(baseHaptic, 'subtle');
  const medium = Engine.scaleHaptic(baseHaptic, 'medium');
  const firm = Engine.scaleHaptic(baseHaptic, 'firm');
  const off = Engine.scaleHaptic(baseHaptic, 'off');

  assert.deepStrictEqual(subtle, [10, 30, 10], 'Subtle haptic should scale to 50%');
  assert.deepStrictEqual(medium, [20, 60, 20], 'Medium haptic should be 100%');
  assert.deepStrictEqual(firm, [30, 90, 30], 'Firm haptic should scale to 150%');
  assert.deepStrictEqual(off, [], 'Off haptic should return empty array');

  const result = Engine.triggerHaptic([30]);
  assert.strictEqual(result, false, 'Should safely return false without crashing in Node');

  console.log('✓ Test 3: Haptic scaling levels & safe silent fallback verified.');
} catch (err) {
  console.error('✗ Test 3 Failed:', err.message);
  process.exit(1);
}

// Test 4: Strictly Non-Medical & Hebrew Exclusion Audit
try {
  const patterns = Engine.getPatterns();
  const medicalWords = ['cure', 'treat', 'therapy', 'illness', 'disease', 'anxiety_disorder', 'medication', 'علاج', 'مرض', 'دواء'];

  patterns.forEach(p => {
    const text = `${p.id} ${p.name_ar} ${p.name_en} ${p.description_ar} ${p.description_en}`.toLowerCase();
    medicalWords.forEach(w => {
      assert(!text.includes(w), `Pattern ${p.id} must not contain medical claim term: "${w}"`);
    });

    assert(!text.includes('עבריت') && !text.includes('hebrew'), 'Must exclude Hebrew');
  });

  console.log('✓ Test 4: Strictly non-medical focus pacer & Hebrew exclusion invariants verified.');
} catch (err) {
  console.error('✗ Test 4 Failed:', err.message);
  process.exit(1);
}

// Test 5: Procedural SVG Visual Pacer Rendering
try {
  const session = Engine.createPacerSession('calming_4_7_8', 4);
  session.status = 'running';

  const svgAr = Engine.renderBreathPacerSVG(session, { lang: 'ar', width: 360, height: 360 });
  assert(typeof svgAr === 'string', 'SVG must be string');
  assert(svgAr.startsWith('<svg') && svgAr.endsWith('</svg>'), 'Valid SVG markup');
  assert(svgAr.includes('شهيق هادئ'), 'Must include Arabic phase label');
  assert(svgAr.includes('دورة 1 من 4'), 'Must include Arabic cycle counter');
  assert(svgAr.includes('4s'), 'Must display Western digits seconds counter');
  assert(!svgAr.includes('data:image/'), 'No raster bitmaps');
  assert(!svgAr.includes('<image'), 'No external image elements');

  const svgEn = Engine.renderBreathPacerSVG(session, { lang: 'en', width: 360, height: 360 });
  assert(svgEn.includes('Inhale Quietly'), 'Must include English phase label');
  assert(svgEn.includes('Cycle 1 of 4'), 'Must include English cycle counter');

  console.log('✓ Test 5: Procedural royalty-free vector SVG pacer & Western digits verified.');
  console.log('--- All Mission #091 Tests PASSED (GREEN) ---');
} catch (err) {
  console.error('✗ Test 5 Failed:', err.message);
  process.exit(1);
}
