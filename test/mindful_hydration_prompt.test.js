const assert = require('assert');
const engine = require('../android/app/src/main/assets/web/js/mindful_hydration_prompt_engine.js');

console.log('--- Running 🎯 Mission #104: Mindful Hydration & Ergonomic Prompt Tests ---');

// Test 1: Default config and validation bounds
{
  const defaults = engine.getDefaultConfig();
  assert.strictEqual(defaults.enabled, true);
  assert.strictEqual(defaults.intervalMinutes, 45);
  assert.strictEqual(defaults.promptAmountMl, 250);
  assert.strictEqual(defaults.dailyTargetMl, 2000);
  assert.strictEqual(defaults.preferredUnit, 'ml');

  const clamped = engine.validateConfig({
    intervalMinutes: 5,
    promptAmountMl: 2000,
    dailyTargetMl: 100
  });
  assert.strictEqual(clamped.intervalMinutes, 45);
  assert.strictEqual(clamped.promptAmountMl, 250);
  assert.strictEqual(clamped.dailyTargetMl, 2000);

  const customValid = engine.validateConfig({
    intervalMinutes: 60,
    promptAmountMl: 300,
    dailyTargetMl: 2500,
    preferredUnit: 'fl_oz'
  });
  assert.strictEqual(customValid.intervalMinutes, 60);
  assert.strictEqual(customValid.promptAmountMl, 300);
  assert.strictEqual(customValid.dailyTargetMl, 2500);
  assert.strictEqual(customValid.preferredUnit, 'fl_oz');
  console.log('✓ Test 1: Configuration, boundary clamps, and validation verified.');
}

// Test 2: Triggering logic based on elapsed session time
{
  const config = { intervalMinutes: 45, enabled: true };
  assert.strictEqual(engine.shouldTriggerPrompt(30 * 60, 0, config), false);
  assert.strictEqual(engine.shouldTriggerPrompt(45 * 60, 0, config), true);
  assert.strictEqual(engine.shouldTriggerPrompt(50 * 60, 45 * 60, config), false);
  assert.strictEqual(engine.shouldTriggerPrompt(90 * 60, 45 * 60, config), true);
  assert.strictEqual(engine.shouldTriggerPrompt(90 * 60, 0, { intervalMinutes: 45, enabled: false }), false);
  console.log('✓ Test 2: In-session timer trigger calculation verified.');
}

// Test 3: Daily intake logging and target progress
{
  let state = engine.logIntake(null, 250, Date.parse('2026-10-23T10:00:00Z'));
  assert.strictEqual(state.totalMl, 250);
  assert.strictEqual(state.logs.length, 1);

  state = engine.logIntake(state, 500, Date.parse('2026-10-23T12:00:00Z'));
  assert.strictEqual(state.totalMl, 750);
  assert.strictEqual(state.logs.length, 2);

  const progress = engine.getDailyProgress(state, { dailyTargetMl: 2000 });
  assert.strictEqual(progress.totalMl, 750);
  assert.strictEqual(progress.targetMl, 2000);
  assert.strictEqual(progress.percentage, 38);
  assert.strictEqual(progress.remainingMl, 1250);
  assert.strictEqual(progress.isTargetReached, false);
  assert.strictEqual(/^[0-9]+%$/.test(progress.percentageFormatted), true);

  const completeState = engine.logIntake(state, 1500, Date.parse('2026-10-23T16:00:00Z'));
  const completeProgress = engine.getDailyProgress(completeState, { dailyTargetMl: 2000 });
  assert.strictEqual(completeProgress.totalMl, 2250);
  assert.strictEqual(completeProgress.isTargetReached, true);
  assert.strictEqual(completeProgress.percentage, 100);
  console.log('✓ Test 3: Daily water intake logging, accumulation & progress verified.');
}

// Test 4: Unit conversion with strict Western digits
{
  const convMl = engine.convertVolume(500, 'ml');
  assert.strictEqual(convMl.value, 500);
  assert.strictEqual(convMl.formatted, '500');
  assert.strictEqual(/^[0-9]+$/.test(convMl.formatted), true);

  const convOz = engine.convertVolume(500, 'fl_oz');
  assert.strictEqual(convOz.formatted, '16.9');
  assert.strictEqual(/^[0-9]+(\.[0-9]+)?$/.test(convOz.formatted), true);
  console.log('✓ Test 4: Fluid volume conversion & strict Western digits formatting verified.');
}

// Test 5: 100-Locale translation, strict English fallback, zero Hebrew
{
  const promptAr = engine.generatePromptContent('ar', { promptAmountMl: 250 });
  assert.strictEqual(promptAr.title.includes('شرب الماء'), true);
  assert.strictEqual(promptAr.westernAmount, '250');

  const promptEn = engine.generatePromptContent('en', { promptAmountMl: 250 });
  assert.strictEqual(promptEn.title.includes('Mindful Hydration'), true);

  const promptJa = engine.generatePromptContent('ja', { promptAmountMl: 250 });
  assert.strictEqual(promptJa.title, promptEn.title);
  assert.strictEqual(promptJa.body, promptEn.body);

  const promptHe = engine.generatePromptContent('he', { promptAmountMl: 250 });
  const promptIw = engine.generatePromptContent('iw', { promptAmountMl: 250 });
  assert.strictEqual(promptHe.title, promptEn.title);
  assert.strictEqual(promptIw.title, promptEn.title);
  assert.strictEqual(engine.sanitizeLocale('he'), 'en');
  assert.strictEqual(engine.sanitizeLocale('iw'), 'en');

  console.log('✓ Test 5: 100-Locale support, strict English fallback & zero Hebrew verified.');
}

console.log('--- All Mission #104 Tests PASSED (GREEN) ---');
