/**
 * DEEP FOCUS — Test Suite: Weekly Study Goals & Target Hours Engine (M096)
 * File: test/weekly_study_goals.test.js
 */

const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/weekly_study_goals_engine.js');

console.log('--- Running 🎯 Mission #096: Weekly Study Goals Tests (Timezone-Safe) ---');

// Test 1: Week Bounds & Filtering
try {
  const bounds = Engine.getWeekBounds('2026-10-22');
  assert(bounds.startDateStr <= '2026-10-22', 'Start date must precede or match ref date');
  assert(bounds.endDateStr >= '2026-10-22', 'End date must follow or match ref date');
  assert.strictEqual(bounds.startDateStr, '2026-10-19', 'Monday must be 2026-10-19');
  assert.strictEqual(bounds.endDateStr, '2026-10-25', 'Sunday must be 2026-10-25');

  console.log('✓ Test 1: ISO Week bounds calculation & calendar boundaries verified.');
} catch (err) {
  console.error('✗ Test 1 Failed:', err.message);
  process.exit(1);
}

// Test 2: Goal Evaluation & Pacing Analytics
try {
  const mockSessions = [
    { date: '2026-10-19', duration_minutes: 60, tag: 'Calculus' },
    { date: '2026-10-20', duration_minutes: 90, tag: 'Calculus' },
    { date: '2026-10-21', duration_minutes: 90, tag: 'Physics' },
    { date: '2026-10-22', duration_minutes: 60, tag: 'Literature' },
    { date: '2026-10-15', duration_minutes: 120, tag: 'OldWeek' }
  ];

  const goalConfig = {
    targetHours: 10,
    subjectGoals: {
      Calculus: 4,
      Physics: 3
    }
  };

  const result = Engine.evaluateWeeklyGoal(mockSessions, goalConfig, { referenceDate: '2026-10-22' });
  assert.strictEqual(result.completedMinutes, 300);
  assert.strictEqual(result.completedHours, 5.0);
  assert.strictEqual(result.targetMinutes, 600);
  assert.strictEqual(result.progressPercent, 50);
  assert.strictEqual(result.remainingMinutes, 300);
  assert(result.remainingDays >= 1);
  assert(result.dailyRunRateNeededMins > 0);

  console.log('✓ Test 2: Weekly goal progress, remaining hours & run rate pacing verified.');
} catch (err) {
  console.error('✗ Test 2 Failed:', err.message);
  process.exit(1);
}

// Test 3: Subject Goal Breakdown
try {
  const mockSessions = [
    { date: '2026-10-20', duration_minutes: 120, tag: 'Math' },
    { date: '2026-10-21', duration_minutes: 60, tag: 'Physics' }
  ];

  const goalConfig = {
    targetHours: 5,
    subjectGoals: {
      Math: 2,
      Physics: 2
    }
  };

  const result = Engine.evaluateWeeklyGoal(mockSessions, goalConfig, { referenceDate: '2026-10-22' });
  assert(result.subjectBreakdown.Math, 'Math breakdown must exist');
  assert.strictEqual(result.subjectBreakdown.Math.actualMinutes, 120);
  assert.strictEqual(result.subjectBreakdown.Math.percent, 100);
  assert.strictEqual(result.subjectBreakdown.Physics.actualMinutes, 60);
  assert.strictEqual(result.subjectBreakdown.Physics.percent, 50);

  console.log('✓ Test 3: Per-subject target hours & milestone breakdown verified.');
} catch (err) {
  console.error('✗ Test 3 Failed:', err.message);
  process.exit(1);
}

// Test 4: Procedural SVG Progress Gauge Card
try {
  const progressMock = {
    completedHours: 7.5,
    targetHours: 15.0,
    progressPercent: 50,
    paceStatus: 'on_track',
    remainingMinutes: 450,
    dailyRunRateNeededMins: 112
  };

  const svg = Engine.renderWeeklyGoalProgressSVG(progressMock, { width: 420, height: 260, locale: 'en' });
  assert(typeof svg === 'string', 'Render must return SVG string');
  assert(svg.startsWith('<svg') && svg.endsWith('</svg>'), 'Valid SVG markup');
  assert(svg.includes('7.5'), 'Must contain completed hours 7.5');
  assert(svg.includes('15 hrs'), 'Must contain target hours 15');
  assert(svg.includes('50%'), 'Must contain 50%');
  assert(svg.includes('On Track'), 'Must display On Track pace badge');
  assert(!svg.includes('data:image/'), 'No raster bitmaps');
  assert(!svg.includes('<image'), 'No external image elements');

  console.log('✓ Test 4: Procedural royalty-free vector SVG weekly gauge verified.');
} catch (err) {
  console.error('✗ Test 4 Failed:', err.message);
  process.exit(1);
}

// Test 5: Multi-Language, Strict English Fallback & Hebrew Exclusion
try {
  const progressMock = {
    completedHours: 10,
    targetHours: 15,
    progressPercent: 67,
    paceStatus: 'ahead',
    remainingMinutes: 300,
    dailyRunRateNeededMins: 75
  };

  const svgAr = Engine.renderWeeklyGoalProgressSVG(progressMock, { locale: 'ar' });
  assert(svgAr.includes('هدف المذاكرة الأسبوعي'), 'Must display Arabic title');
  assert(svgAr.includes('متقدم عن الخطة'), 'Must display Arabic Ahead badge');

  const svgEs = Engine.renderWeeklyGoalProgressSVG(progressMock, { locale: 'es' });
  assert(svgEs.includes('META DE ESTUDIO SEMANAL'), 'Must display Spanish title');

  const svgFallback = Engine.renderWeeklyGoalProgressSVG(progressMock, { locale: 'unsupported_lang' });
  assert(svgFallback.includes('WEEKLY STUDY GOAL'), 'Must strictly fallback to English title');
  assert(svgFallback.includes('Ahead of Schedule'), 'Must strictly fallback to English pace label');

  const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  easternDigits.forEach(d => {
    assert(!svgAr.includes(d), `SVG must not contain Eastern digit ${d}`);
  });

  const svgHe = Engine.renderWeeklyGoalProgressSVG(progressMock, { locale: 'he' });
  assert(svgHe.includes('WEEKLY STUDY GOAL'), 'Hebrew must strictly fallback to English');
  assert(!svgHe.includes('עבריت'), 'Must exclude Hebrew');

  console.log('✓ Test 5: Multi-language, strict English-only fallback & Western digits verified.');
  console.log('--- All Mission #096 Tests PASSED (GREEN) ---');
} catch (err) {
  console.error('✗ Test 5 Failed:', err.message);
  process.exit(1);
}
