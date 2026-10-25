const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/vault_state_hydration_engine.js');

console.log('--- Running 🎯 Mission #172: Vault State Hydration Tests ---');

// Test 1: Pristine Fallback State Creation
{
  const pristine = Engine.getPristineFallbackState();
  assert.strictEqual(pristine.schemaVersion, 'v21-fortress');
  assert.strictEqual(pristine.totalDurationSeconds, 1500);
  assert.strictEqual(pristine.remainingSeconds, 1500);
  assert.strictEqual(pristine.isRunning, false);

  console.log('✓ Test 1: Pristine fallback state verified.');
}

// Test 2: Wall-Clock Background Drift Reconciliation (Active Running Session)
{
  const savedState = {
    mode: 'focus',
    isRunning: true,
    totalDurationSeconds: 1500,
    remainingSeconds: 1200,
    lastSavedTimestamp: 1000000,
    taskAnchor: 'Calculus III'
  };

  const reconciled = Engine.reconcileBackgroundDrift(savedState, 1300000);
  assert.strictEqual(reconciled.driftSecondsCompensated, 300);
  assert.strictEqual(reconciled.remainingSeconds, 900);
  assert.strictEqual(reconciled.isRunning, true);
  assert.strictEqual(reconciled.sessionFinishedInBackground, false);

  console.log('✓ Test 2: Background drift reconciliation verified.');
}

// Test 3: Session Expiry During Background Suspension
{
  const savedState = {
    mode: 'focus',
    isRunning: true,
    totalDurationSeconds: 1500,
    remainingSeconds: 200,
    lastSavedTimestamp: 1000000
  };

  const finished = Engine.reconcileBackgroundDrift(savedState, 1500000);
  assert.strictEqual(finished.remainingSeconds, 0);
  assert.strictEqual(finished.isRunning, false);
  assert.strictEqual(finished.sessionFinishedInBackground, true);

  console.log('✓ Test 3: Background session expiry handled safely.');
}

// Test 4: Corrupt Cache Rollback and Recovery
{
  const corruptJson = '{ broken json !!';
  const hydrated = Engine.hydrateVaultState(corruptJson, Date.now());

  assert.strictEqual(hydrated.success, true);
  assert.strictEqual(hydrated.statusKey, 'rollback_applied');
  assert.strictEqual(hydrated.state.corruptedRollbackApplied, true);
  assert.strictEqual(hydrated.state.totalDurationSeconds, 1500);

  console.log('✓ Test 4: Corrupt cache rollback and recovery verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('no'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('تعويض فارق ٣٠٠s والمتبقي ١٥m');
  assert.strictEqual(western, 'تعويض فارق 300s والمتبقي 15m');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #172 Tests PASSED (GREEN) ---');
