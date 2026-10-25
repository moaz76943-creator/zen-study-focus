const assert = require('assert');
const SleepEngine = require('../android/app/src/main/assets/web/js/sleep_timer_auto_fade_engine.js');

console.log("--- Running 🎯 Mission #086: Sleep Timer & Auto-Fade Engine Tests ---");

// Test 1: Sleep timer initialization with duration and volume
{
  const timer = SleepEngine.startSleepTimer(30, 0.8);
  assert.strictEqual(timer.active, true);
  assert.strictEqual(timer.initialMinutes, 30);
  assert.strictEqual(timer.totalSeconds, 1800);
  assert.strictEqual(timer.remainingSeconds, 1800);
  assert.strictEqual(timer.isFadingOut, false);
  console.log("✓ Test 1: Sleep timer initialization verified.");
}

// Test 2: Full volume maintained outside fade-out window (> 120s)
{
  const timer = SleepEngine.startSleepTimer(10, 0.8);
  const vol = SleepEngine.computeSleepVolume(timer);
  assert.strictEqual(vol, 0.8, "Volume must stay full while remaining > 120s");
  console.log("✓ Test 2: Full volume maintenance outside fade window verified.");
}

// Test 3: Gentle 2-minute fade-out volume curve calculation
{
  let timer = SleepEngine.startSleepTimer(5, 0.8); // 300s
  // Fast forward to 60 seconds remaining (halfway into 120s fade-out window)
  timer.remainingSeconds = 60;
  
  const fadedVol = SleepEngine.computeSleepVolume(timer);
  assert.strictEqual(fadedVol, 0.4, "60s remaining in 120s window must scale volume by 50% (0.8 * 0.5 = 0.4)");

  // Fast forward to 12 seconds remaining (10% volume)
  timer.remainingSeconds = 12;
  const quietVol = SleepEngine.computeSleepVolume(timer);
  assert.strictEqual(quietVol, 0.08);
  console.log("✓ Test 3: Smooth 2-minute fade-out volume decay verified.");
}

// Test 4: Timer completion suspends audio cleanly at 0 seconds
{
  let timer = SleepEngine.startSleepTimer(5, 0.8);
  timer = SleepEngine.tickSleepTimer(timer, 300); // elapse all 300 seconds

  assert.strictEqual(timer.remainingSeconds, 0);
  assert.strictEqual(timer.isCompleted, true);
  assert.strictEqual(timer.active, false);
  assert.strictEqual(SleepEngine.computeSleepVolume(timer), 0.0);
  console.log("✓ Test 4: Timer completion and zero-volume suspension verified.");
}

// Test 5: Extend sleep timer by +15 minutes without resetting active playback
{
  let timer = SleepEngine.startSleepTimer(10, 0.8);
  timer.remainingSeconds = 30; // In fade out
  assert.strictEqual(timer.remainingSeconds <= 120, true);

  const extended = SleepEngine.extendSleepTimer(timer);
  assert.strictEqual(extended.remainingSeconds, 30 + (15 * 60), "Remaining must increase by 900s");
  assert.strictEqual(extended.isFadingOut, false, "Must exit fade-out mode upon extension");
  assert.strictEqual(SleepEngine.computeSleepVolume(extended), 0.8, "Volume must restore to full");
  console.log("✓ Test 5: +15 minutes extension & volume restoration verified.");
}

console.log("--- All Mission #086 Tests PASSED (GREEN) ---");
