const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/curriculum_syllabus_tracker_engine.js');

console.log('--- Running 🎯 Mission #146: Curriculum Mastery Tracker Tests ---');

// Test 1: Mastery Metrics & Pacing Calculation
{
  const onSchedule = Engine.calculateMasteryMetrics(20, 10, 15, 1.0);
  assert.strictEqual(onSchedule.percentage, 50.0);
  assert.strictEqual(onSchedule.formattedPercentage, '50.0%');
  assert.strictEqual(onSchedule.statusTier, 'status_on_schedule');
  assert.strictEqual(onSchedule.daysNeeded, 10);
  assert.strictEqual(onSchedule.formattedDaysNeeded, '10 days');

  const behind = Engine.calculateMasteryMetrics(20, 10, 5, 1.0);
  assert.strictEqual(behind.statusTier, 'status_behind');

  const mastered = Engine.calculateMasteryMetrics(20, 20, 10, 1.0);
  assert.strictEqual(mastered.percentage, 100.0);
  assert.strictEqual(mastered.statusTier, 'status_mastered');

  console.log('✓ Test 1: Mastery metrics & pacing tiers verified.');
}

// Test 2: Course Creation & Module Mapping
{
  const course = Engine.createCurriculumCourse(
    'Quantum Mechanics',
    [
      { title: 'Wave-Particle Duality', completed: true },
      { title: 'Schrödinger Equation', completed: true },
      { title: 'Quantum Tunneling', completed: false },
      { title: 'Spin & Angular Momentum', completed: false }
    ],
    14
  );

  assert.strictEqual(course.title, 'Quantum Mechanics');
  assert.strictEqual(course.modules.length, 4);
  assert.strictEqual(course.metrics.completedModules, 2);
  assert.strictEqual(course.metrics.percentage, 50.0);
  assert.strictEqual(course.zeroMusicCertified, true);

  console.log('✓ Test 2: Course creation and module mapping verified.');
}

// Test 3: Comprehensive Syllabus Report Generation
{
  const report = Engine.generateSyllabusReport({
    title: 'Advanced Macroeconomics',
    totalModules: 15,
    completedModules: 9,
    remainingDays: 20
  }, 1.0, 'ar');

  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.progress.completed, '9');
  assert.strictEqual(report.progress.total, '15');
  assert.strictEqual(report.progress.percentage, '60.0%');
  assert.strictEqual(report.zeroMusicCertified, true);
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);

  console.log('✓ Test 3: Comprehensive syllabus report verified.');
}

// Test 4: Boundary Handling on Empty Inputs
{
  const empty = Engine.calculateMasteryMetrics(0, 0, 0, 0);
  assert.strictEqual(empty.totalModules, 1);
  assert.strictEqual(empty.percentage, 0.0);
  assert.strictEqual(empty.formattedPercentage, '0.0%');

  console.log('✓ Test 4: Boundary handling on empty inputs verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('sv'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('إنجاز ٥٠.٠% وتبقى ١٠ days');
  assert.strictEqual(western, 'إنجاز 50.0% وتبقى 10 days');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #146 Tests PASSED (GREEN) ---');
