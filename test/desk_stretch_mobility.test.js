/**
 * DEEP FOCUS — Test Suite: Desk Stretch & Micro-Break Mobility Engine (M097)
 * File: test/desk_stretch_mobility.test.js
 */

const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/desk_stretch_mobility_engine.js');

console.log('--- Running 🎯 Mission #097: Desk Stretch & Micro-Break Mobility Tests ---');

// Test 1: Exercise Catalog & Pre-Assembled Routines
try {
  const exercises = Engine.getExercises('en');
  assert.strictEqual(exercises.length, 6, 'Must provide exactly 6 ergonomic desk exercises');

  const routines = Engine.getRoutines('en');
  assert.strictEqual(routines.length, 3, 'Must provide 3 pre-assembled routines');

  const quick = Engine.getRoutineById('quick_2min_desk_reset', 'en');
  assert.strictEqual(quick.total_duration_sec, 90);
  assert.strictEqual(quick.exercises.length, 3);

  const full = Engine.getRoutineById('full_5min_posture_reboot', 'en');
  assert.strictEqual(full.total_duration_sec, 240);
  assert.strictEqual(full.exercises.length, 5);

  console.log('✓ Test 1: Exercise catalog (6 stretches) & 3 pre-assembled routines verified.');
} catch (err) {
  console.error('✗ Test 1 Failed:', err.message);
  process.exit(1);
}

// Test 2: Routine Lifecycle & Step Transitions
try {
  const session = Engine.createRoutineSession('quick_2min_desk_reset', { locale: 'en' });
  assert.strictEqual(session.status, 'idle');
  assert.strictEqual(session.currentExerciseIndex, 0);
  assert.strictEqual(session.totalDurationSec, 90);

  session.status = 'running';

  Engine.stepRoutineSession(session, 30);
  assert.strictEqual(session.currentExerciseIndex, 1, 'Should advance to exercise index 1');
  assert(session.lastTransitionEvent !== null, 'Transition event must be emitted');
  assert.strictEqual(session.lastTransitionEvent.exerciseId, 'wrist_forearm_refresh');

  Engine.stepRoutineSession(session, 30);
  assert.strictEqual(session.currentExerciseIndex, 2, 'Should advance to exercise index 2');

  Engine.stepRoutineSession(session, 30);
  assert.strictEqual(session.status, 'completed', 'Routine session must be completed');
  assert.strictEqual(session.sessionElapsedSec, 90, 'Total elapsed should equal 90s');

  console.log('✓ Test 2: Routine session lifecycle, step transitions & completion verified.');
} catch (err) {
  console.error('✗ Test 2 Failed:', err.message);
  process.exit(1);
}

// Test 3: Procedural Pure SVG Guide Card
try {
  const ex = Engine.getExerciseById('neck_shoulder_release', 'en');
  const svg = Engine.renderStretchGuideSVG(ex, { locale: 'en', width: 420, height: 260 });

  assert(typeof svg === 'string', 'Render must return SVG string');
  assert(svg.startsWith('<svg') && svg.endsWith('</svg>'), 'Valid SVG markup');
  assert(svg.includes('Neck &amp; Shoulder Release') || svg.includes('Neck & Shoulder Release'), 'Must display exercise title');
  assert(svg.includes('30s'), 'Must display duration 30s');
  assert(svg.includes('DESK MOBILITY'), 'Must display mobility badge');
  assert(!svg.includes('data:image/'), 'No raster bitmaps');
  assert(!svg.includes('<image'), 'No external image elements');

  console.log('✓ Test 3: Procedural royalty-free vector SVG stretch card verified.');
} catch (err) {
  console.error('✗ Test 3 Failed:', err.message);
  process.exit(1);
}

// Test 4: Multi-Language & Strict English Fallback
try {
  const exAr = Engine.getExerciseById('neck_shoulder_release', 'ar');
  assert.strictEqual(exAr.name, 'إرخاء الرقبة والأكتاف');
  const svgAr = Engine.renderStretchGuideSVG(exAr, { locale: 'ar' });
  assert(svgAr.includes('إرخاء الرقبة والأكتاف'), 'Arabic title must be rendered in SVG');

  const exEs = Engine.getExerciseById('neck_shoulder_release', 'es');
  assert.strictEqual(exEs.name, 'Liberación de Cuello y Hombros');

  const exFallback = Engine.getExerciseById('neck_shoulder_release', 'unsupported_lang');
  assert.strictEqual(exFallback.name, 'Neck & Shoulder Release', 'Must fallback to English');

  console.log('✓ Test 4: Multi-language exercise titles & strict English fallback verified.');
} catch (err) {
  console.error('✗ Test 4 Failed:', err.message);
  process.exit(1);
}

// Test 5: Strictly Non-Medical, Western Digits & Hebrew Exclusion
try {
  const exercises = Engine.getExercises('en');
  const medicalTerms = ['cure', 'treat', 'therapy', 'illness', 'disease', 'physical therapy', 'علاج', 'مرض', 'دواء'];

  exercises.forEach(ex => {
    const text = `${ex.id} ${ex.name} ${ex.description}`.toLowerCase();
    medicalTerms.forEach(term => {
      assert(!text.includes(term), `Exercise ${ex.id} must not contain medical term "${term}"`);
    });
  });

  const exAr = Engine.getExerciseById('neck_shoulder_release', 'ar');
  const svgAr = Engine.renderStretchGuideSVG(exAr, { locale: 'ar' });
  const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  easternDigits.forEach(d => {
    assert(!svgAr.includes(d), `SVG card must never contain Eastern digit ${d}`);
  });

  const exHe = Engine.getExerciseById('neck_shoulder_release', 'he');
  assert.strictEqual(exHe.name, 'Neck & Shoulder Release', 'Hebrew must strictly fallback to English');
  assert(!JSON.stringify(exHe).includes('عבריت'), 'Must exclude Hebrew');

  console.log('✓ Test 5: Strictly non-medical, Western digits (0123456789) & Hebrew exclusion verified.');
  console.log('--- All Mission #097 Tests PASSED (GREEN) ---');
} catch (err) {
  console.error('✗ Test 5 Failed:', err.message);
  process.exit(1);
}
