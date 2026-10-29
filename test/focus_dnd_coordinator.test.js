const assert = require('assert');
const Coordinator = require('../android/app/src/main/assets/web/js/focus_dnd_coordinator.js');

console.log("--- Running 🎯 Mission #042: Focus DND Coordinator Tests ---");

// Test 1: In-session active shield blocks non-essential alerts
{
  const activeCtx = {
    isSessionActive: true,
    systemRingerMode: Coordinator.RINGER_MODES.NORMAL,
    isMuted: false
  };

  const genericAlert = Coordinator.evaluateAlertPermission("popup_notification", activeCtx);
  assert.strictEqual(genericAlert.allowed, false);
  assert.strictEqual(genericAlert.reason, "FOCUS_SHIELD_ACTIVE");

  const breakAlert = Coordinator.evaluateAlertPermission("break_reminder", activeCtx);
  assert.strictEqual(breakAlert.allowed, true, "Break reminder exception must be honored");
  console.log("✓ Test 1: Focus Shield blocks in-session alerts with break exception.");
}

// Test 2: System silent/vibrate mode blocks sound chimes regardless of app volume
{
  const silentCtx = {
    isSessionActive: false,
    systemRingerMode: Coordinator.RINGER_MODES.SILENT,
    isMuted: false
  };
  const silentRes = Coordinator.evaluateAlertPermission("session_completion", silentCtx);
  assert.strictEqual(silentRes.allowed, false);
  assert.strictEqual(silentRes.reason, "OS_RINGER_SILENT");

  const vibrateCtx = {
    isSessionActive: false,
    systemRingerMode: Coordinator.RINGER_MODES.VIBRATE,
    isMuted: false
  };
  const vibrateRes = Coordinator.evaluateAlertPermission("session_completion", vibrateCtx);
  assert.strictEqual(vibrateRes.allowed, false);
  assert.strictEqual(vibrateRes.reason, "OS_RINGER_VIBRATE_ONLY");
  console.log("✓ Test 2: Android OS Silent and Vibrate ringer modes strictly respected.");
}

// Test 3: Session completion gracefully permits chime under normal ringer
{
  const normalCtx = {
    isSessionActive: false,
    systemRingerMode: Coordinator.RINGER_MODES.NORMAL,
    isMuted: false
  };
  const res = Coordinator.evaluateAlertPermission("session_completion", normalCtx);
  assert.strictEqual(res.allowed, true);
  assert.strictEqual(res.reason, "COMPLETION_ALERT_PERMITTED");
  console.log("✓ Test 3: Completion alert permitted gracefully under normal ringer.");
}

// Test 4: Shield state transitions (START -> ACTIVE -> COMPLETE -> RESTORED)
{
  let state = Coordinator.transitionShieldState(Coordinator.SHIELD_STATES.IDLE, 'START');
  assert.strictEqual(state, Coordinator.SHIELD_STATES.SHIELDED_ACTIVE);

  state = Coordinator.transitionShieldState(state, 'COMPLETE');
  assert.strictEqual(state, Coordinator.SHIELD_STATES.RESTORED);
  console.log("✓ Test 4: Shield state machine lifecycle verified.");
}

console.log("--- All Mission #042 Focus DND Tests PASSED (GREEN) ---");
