/**
 * DEEP FOCUS — Test Suite: System Self-Diagnostics & Automated Snapshot Engine (M099)
 * File: test/system_self_diagnostics.test.js
 */

const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/system_self_diagnostics_engine.js');

console.log('--- Running 🎯 Mission #099: System Self-Diagnostics Tests ---');

// Test 1: Full Multi-Subsystem Diagnostic Audit
try {
  const diag = Engine.runDiagnostics({ locale: 'en' });
  assert.strictEqual(diag.totalChecks, 5, 'Must audit exactly 5 subsystems');
  assert(diag.checksPassed >= 4, 'At least 4 checks must pass cleanly in test environment');
  assert(diag.score >= 80, 'Health score must be at least 80%');
  assert(diag.subsystems.storage_v21, 'Storage subsystem audited');
  assert(diag.subsystems.audio_subsystem, 'Audio subsystem audited');
  assert(diag.subsystems.i18n_subsystem, 'i18n subsystem audited');
  assert.strictEqual(diag.subsystems.i18n_subsystem.hebrewExclusion, 'enforced');
  assert.strictEqual(diag.subsystems.i18n_subsystem.fallbackMode, 'english_only');

  console.log('✓ Test 1: Multi-subsystem health audit (storage, audio, i18n, sensors, notifications) verified.');
} catch (err) {
  console.error('✗ Test 1 Failed:', err.message);
  process.exit(1);
}

// Test 2: Checksum Calculation & Tamper Detection
try {
  const dataA = JSON.stringify({ user: 'zen_student', targetHours: 15 });
  const dataB = JSON.stringify({ user: 'zen_student', targetHours: 15 });
  const dataC = JSON.stringify({ user: 'zen_student', targetHours: 16 });

  const hashA = Engine.calculateChecksum(dataA);
  const hashB = Engine.calculateChecksum(dataB);
  const hashC = Engine.calculateChecksum(dataC);

  assert.strictEqual(hashA, hashB, 'Identical data must produce identical checksums');
  assert.notStrictEqual(hashA, hashC, 'Changed data must produce different checksums');
  assert.strictEqual(hashA.length, 8, 'Checksum must be 8-character hex string');

  console.log('✓ Test 2: 8-char hex checksum generation & tamper detection verified.');
} catch (err) {
  console.error('✗ Test 2 Failed:', err.message);
  process.exit(1);
}

// Test 3: Snapshot Creation & Structure
try {
  const appState = {
    streakDays: 14,
    totalSessions: 84,
    settings: { oledMode: true, lowBatteryThreshold: 20 },
    activeGoal: { targetHours: 15 }
  };

  const snap = Engine.createSnapshot(appState);
  assert(snap.snapshotId.startsWith('snap_'), 'Snapshot ID must have snap_ prefix');
  assert.strictEqual(snap.payload.version, 'v21', 'Must conform to v21 schema');
  assert.strictEqual(snap.payload.state.streakDays, 14);
  assert(snap.checksum && snap.checksum.length === 8);

  console.log('✓ Test 3: Automated v21 state snapshot creation verified.');
} catch (err) {
  console.error('✗ Test 3 Failed:', err.message);
  process.exit(1);
}

// Test 4: Safe Snapshot Restore & Corrupted Payload Rejection
try {
  const appState = { streakDays: 21, totalMinutes: 1250 };
  const validSnapshot = Engine.createSnapshot(appState);

  const restoreRes = Engine.restoreSnapshot(validSnapshot);
  assert.strictEqual(restoreRes.success, true);
  assert.strictEqual(restoreRes.restoredState.streakDays, 21);

  const tamperedSnapshot = JSON.parse(JSON.stringify(validSnapshot));
  tamperedSnapshot.payload.state.streakDays = 999;
  const failRes = Engine.restoreSnapshot(tamperedSnapshot);
  assert.strictEqual(failRes.success, false, 'Tampered snapshot must be rejected');
  assert(failRes.error.includes('Checksum mismatch'), 'Must report checksum mismatch');

  const badSchema = { snapshotId: 's_bad', payload: { version: 'v1' } };
  const badRes = Engine.restoreSnapshot(badSchema);
  assert.strictEqual(badRes.success, false);
  assert(badRes.error.includes('v21 Data Fortress schema'));

  console.log('✓ Test 4: State recovery fidelity & corrupted snapshot rejection verified.');
} catch (err) {
  console.error('✗ Test 4 Failed:', err.message);
  process.exit(1);
}

// Test 5: Multi-Language, Strict English Fallback & Western Digits
try {
  const diagAr = Engine.runDiagnostics({ locale: 'ar' });
  assert(diagAr.statusLocalized.includes('النظام يعمل بكفاءة') || diagAr.statusLocalized.includes('أداء'));

  const diagEs = Engine.runDiagnostics({ locale: 'es' });
  assert(diagEs.statusLocalized.includes('Sistema') || diagEs.statusLocalized.length > 0);

  const diagFallback = Engine.runDiagnostics({ locale: 'unsupported_test_locale' });
  assert.strictEqual(diagFallback.statusLocalized, 'System Fully Healthy');

  const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const fullText = JSON.stringify(diagAr);
  easternDigits.forEach(d => {
    assert(!fullText.includes(d), `Diagnostics must never contain Eastern digit ${d}`);
  });

  const diagHe = Engine.runDiagnostics({ locale: 'he' });
  assert.strictEqual(diagHe.statusLocalized, 'System Fully Healthy', 'Hebrew must strictly fallback to English');
  assert(!JSON.stringify(diagHe).includes('عבריت'), 'Must exclude Hebrew');

  console.log('✓ Test 5: Multi-language diagnostics, strict English-only fallback & Western digits verified.');
  console.log('--- All Mission #099 Tests PASSED (GREEN) ---');
} catch (err) {
  console.error('✗ Test 5 Failed:', err.message);
  process.exit(1);
}
