const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/pomodoro_flowtime_toggle_engine.js');

console.log('--- Running 🎯 Mission #138: Dual-Paced Pomodoro & Flowtime Tests ---');

// Test 1: Flowtime Proportional Break Calculation
{
  const b1 = Engine.calculateFlowtimeBreak(18);
  assert.strictEqual(b1.breakMinutes, 3);
  assert.strictEqual(b1.formattedBreak, '3m');
  assert.strictEqual(b1.tierKey, 'break_short');

  const b2 = Engine.calculateFlowtimeBreak(45);
  assert.strictEqual(b2.breakMinutes, 5);
  assert.strictEqual(b2.formattedBreak, '5m');

  const b3 = Engine.calculateFlowtimeBreak(75);
  assert.strictEqual(b3.breakMinutes, 10);
  assert.strictEqual(b3.formattedBreak, '10m');

  const b4 = Engine.calculateFlowtimeBreak(120);
  assert.strictEqual(b4.breakMinutes, 15);
  assert.strictEqual(b4.formattedBreak, '15m');
  assert.strictEqual(b4.tierKey, 'break_extended');

  console.log('✓ Test 1: Flowtime proportional break calculation verified.');
}

// Test 2: Mode Toggle from Pomodoro to Flowtime
{
  const switchedToFlow = Engine.toggleMode('pomodoro', 600, 25);
  assert.strictEqual(switchedToFlow.mode, 'flowtime');
  assert.strictEqual(switchedToFlow.direction, 'up');
  assert.strictEqual(switchedToFlow.accumulatedSeconds, 600);
  assert.strictEqual(switchedToFlow.suggestedBreak.breakMinutes, 3);

  console.log('✓ Test 2: Mode toggle from Pomodoro to Flowtime verified.');
}

// Test 3: Mode Toggle from Flowtime to Pomodoro
{
  const switchedToPomo = Engine.toggleMode('flowtime', 900, 25);
  assert.strictEqual(switchedToPomo.mode, 'pomodoro');
  assert.strictEqual(switchedToPomo.direction, 'down');
  assert.strictEqual(switchedToPomo.accumulatedSeconds, 900);
  assert.strictEqual(switchedToPomo.remainingSeconds, 600);

  console.log('✓ Test 3: Mode toggle from Flowtime to Pomodoro verified.');
}

// Test 4: Comprehensive Toggle Report & Zero Medical Claims
{
  const report = Engine.generateToggleReport({
    mode: 'flowtime',
    elapsedSeconds: 2700,
    targetMinutes: 45
  }, 'ar');

  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);
  assert.strictEqual(report.mode, 'flowtime');
  assert.strictEqual(report.recommendedBreak.minutes, 5);
  assert.ok(report.elapsedTime.formattedMinutes.includes('m'));

  console.log('✓ Test 4: Comprehensive Toggle Report & Zero medical claims verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('pt'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('المدة المنقضية ٤٥.٠m، الاستراحة ٥m');
  assert.strictEqual(western, 'المدة المنقضية 45.0m، الاستراحة 5m');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #138 Tests PASSED (GREEN) ---');
