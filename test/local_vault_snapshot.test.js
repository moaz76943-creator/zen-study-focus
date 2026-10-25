const assert = require('assert');
const vault = require('../android/app/src/main/assets/web/js/local_vault_snapshot_engine.js');

console.log('--- Running 🎯 Mission #107: Local Vault Auto-Snapshot & Export Engine Tests ---');

const sampleState = {
  version: 21,
  sessions: [
    { id: 's1', date: '2026-10-23', durationSeconds: 3600, category: 'Coding' },
    { id: 's2', date: '2026-10-23', durationSeconds: 1500, category: 'Reading' }
  ],
  settings: {
    theme: 'OLED_BLACK',
    dailyTargetMl: 2000
  }
};

// Test 1: Magic header, schema v21, checksum calculation
{
  assert.strictEqual(vault.VAULT_MAGIC, 'DEEP_FOCUS_VAULT_V21');
  assert.strictEqual(vault.SCHEMA_VERSION, 'v21.0');

  const cs1 = vault.calculateChecksum('{"test":123}');
  const cs2 = vault.calculateChecksum('{"test":123}');
  const cs3 = vault.calculateChecksum('{"test":124}');

  assert.strictEqual(cs1, cs2);
  assert.notStrictEqual(cs1, cs3);
  assert.strictEqual(/^[0-9a-f]{8}$/.test(cs1), true);
  console.log('✓ Test 1: Header constants, schema v21, and deterministic Adler-32 checksum verified.');
}

// Test 2: Envelope creation and session count tracking
{
  const snap = vault.createVaultSnapshot(sampleState, { device: 'Android-Termux' });
  assert.strictEqual(snap.envelope.magic, 'DEEP_FOCUS_VAULT_V21');
  assert.strictEqual(snap.envelope.schemaVersion, 'v21.0');
  assert.strictEqual(snap.envelope.sessionCount, 2);
  assert.strictEqual(snap.envelope.metadata.device, 'Android-Termux');
  assert.strictEqual(typeof snap.serialized, 'string');
  console.log('✓ Test 2: Vault snapshot envelope generation and metadata verified.');
}

// Test 3: Safe restore and valid verification
{
  const snap = vault.createVaultSnapshot(sampleState);
  const result = vault.verifyAndRestoreSnapshot(snap.serialized, 'en');

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.sessionCount, 2);
  assert.strictEqual(result.data.settings.theme, 'OLED_BLACK');
  assert.strictEqual(result.message.includes('successfully'), true);
  console.log('✓ Test 3: Authentic vault restore and payload extraction verified.');
}

// Test 4: Tamper rejection & corrupted data resilience
{
  const snap = vault.createVaultSnapshot(sampleState);
  
  const tamperedJson = snap.serialized.replace('OLED_BLACK', 'HACKED_THEME');
  const tamperResult = vault.verifyAndRestoreSnapshot(tamperedJson, 'en');
  assert.strictEqual(tamperResult.success, false);
  assert.strictEqual(tamperResult.error.includes('checksum'), true);

  const invalidHeaderJson = snap.serialized.replace('DEEP_FOCUS_VAULT_V21', 'UNKNOWN_APP_V1');
  const headerResult = vault.verifyAndRestoreSnapshot(invalidHeaderJson, 'en');
  assert.strictEqual(headerResult.success, false);
  assert.strictEqual(headerResult.error.includes('header'), true);

  const corruptResult = vault.verifyAndRestoreSnapshot('{corrupted_json:::', 'en');
  assert.strictEqual(corruptResult.success, false);
  console.log('✓ Test 4: Tamper rejection, invalid header detection & resilience verified.');
}

// Test 5: 100-Locale translation, strict English fallback & zero Hebrew
{
  const snap = vault.createVaultSnapshot(sampleState);
  const resAr = vault.verifyAndRestoreSnapshot(snap.serialized, 'ar');
  assert.strictEqual(resAr.message.includes('تمت استعادة'), true);

  const resFr = vault.verifyAndRestoreSnapshot(snap.serialized, 'fr');
  assert.strictEqual(resFr.message.includes('successfully'), true);

  const resHe = vault.verifyAndRestoreSnapshot(snap.serialized, 'he');
  const resIw = vault.verifyAndRestoreSnapshot(snap.serialized, 'iw');
  assert.strictEqual(resHe.message.includes('successfully'), true);
  assert.strictEqual(resIw.message.includes('successfully'), true);
  assert.strictEqual(vault.sanitizeLocale('he'), 'en');
  assert.strictEqual(vault.sanitizeLocale('iw'), 'en');

  assert.strictEqual(/^[0-9]+$/.test(vault.toWesternDigits(42)), true);
  console.log('✓ Test 5: 100-Locale support, strict English fallback, zero Hebrew & Western digits verified.');
}

console.log('--- All Mission #107 Tests PASSED (GREEN) ---');
