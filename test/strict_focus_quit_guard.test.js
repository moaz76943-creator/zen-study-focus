const assert = require('assert');
const Guard = require('../android/app/src/main/assets/web/js/strict_focus_quit_guard.js');

console.log("--- Running 🎯 Mission #081: Strict Focus Quit Guard Tests ---");

// Test 1: Immediate exit permitted when session is idle or disabled
{
  const idleRes = Guard.evaluateAbandonmentRequest({ isSessionActive: false, config: { enabled: true } });
  assert.strictEqual(idleRes.permitted, true);
  assert.strictEqual(idleRes.requiresHoldCooldown, false);

  const disabledRes = Guard.evaluateAbandonmentRequest({ isSessionActive: true, config: { enabled: false } });
  assert.strictEqual(disabledRes.permitted, true);
  console.log("✓ Test 1: Immediate exit permitted when idle or disabled verified.");
}

// Test 2: Active session intercepts exit and demands 5s continuous hold
{
  const interceptRes = Guard.evaluateAbandonmentRequest({
    isSessionActive: true,
    config: { enabled: true },
    elapsedHoldMs: 1200, // Only 1.2s held
    isRtl: true
  });
  assert.strictEqual(interceptRes.permitted, false);
  assert.strictEqual(interceptRes.requiresHoldCooldown, true);
  assert.strictEqual(interceptRes.remainingSeconds, 4);
  assert.ok(interceptRes.promptText.includes("هل ترغب حقاً في مقاطعة تركيزك"));
  console.log("✓ Test 2: 5-second mindful cooldown hold requirement verified.");
}

// Test 3: Full 5-second hold grants abandonment permission
{
  const permitRes = Guard.evaluateAbandonmentRequest({
    isSessionActive: true,
    config: { enabled: true, logInterruptionOnQuit: true },
    elapsedHoldMs: 5000 // Full 5s
  });
  assert.strictEqual(permitRes.permitted, true);
  assert.strictEqual(permitRes.reason, "COOLDOWN_HOLD_COMPLETED");
  assert.strictEqual(permitRes.interruptionLogged, true);
  console.log("✓ Test 3: Full 5s hold grants exit permission verified.");
}

// Test 4: Discipline ratio calculation
{
  assert.strictEqual(Guard.calculateDisciplineRatio(9, 1), 90);
  assert.strictEqual(Guard.calculateDisciplineRatio(0, 0), 100);
  assert.strictEqual(Guard.calculateDisciplineRatio(5, 5), 50);
  console.log("✓ Test 4: Student discipline ratio formula verified.");
}

// Test 5: Bilingual prompt strings contracts
{
  const enRes = Guard.evaluateAbandonmentRequest({
    isSessionActive: true,
    config: { enabled: true },
    elapsedHoldMs: 0,
    isRtl: false
  });
  assert.ok(enRes.promptText.includes("Do you truly wish to break your focus"));
  assert.ok(enRes.holdInstruction.includes("Hold for"));
  console.log("✓ Test 5: Bilingual prompt strings contracts verified.");
}

console.log("--- All Mission #081 Tests PASSED (GREEN) ---");
