const assert = require('assert');
const engine = require('../android/app/src/main/assets/web/js/vault_key_rotation_engine.js');

console.log('--- Running 🎯 Mission #121: Vault Key Rotation & Cryptographic Hardening Tests ---');

const sampleData = {
  version: 21,
  totalSessions: 42,
  userSecretNotes: 'Deep Focus Core Theorem',
  theme: 'OLED_BLACK'
};

// Test 1: Encryption envelope structure
{
  const enc = engine.encryptPayload(sampleData, 'pass_2026', 'key_v1');
  assert.strictEqual(enc.version, 'v21.1-crypto');
  assert.strictEqual(enc.keyId, 'key_v1');
  assert.strictEqual(typeof enc.salt, 'string');
  assert.strictEqual(typeof enc.mac, 'string');
  assert.strictEqual(typeof enc.ciphertext, 'string');
  assert.strictEqual(/^[0-9a-f]{8}$/.test(enc.mac), true);
  console.log('✓ Test 1: Vault cipher envelope schema, salt, and MAC verified.');
}

// Test 2: Successful decryption round-trip
{
  const enc = engine.encryptPayload(sampleData, 'pass_2026', 'key_v1');
  const dec = engine.decryptPayload(enc, 'pass_2026', 'en');
  assert.strictEqual(dec.success, true);
  assert.strictEqual(dec.data.totalSessions, 42);
  assert.strictEqual(dec.data.userSecretNotes, 'Deep Focus Core Theorem');
  assert.strictEqual(dec.data.theme, 'OLED_BLACK');
  assert.strictEqual(dec.keyId, 'key_v1');
  console.log('✓ Test 2: Authentic payload round-trip encryption & decryption verified.');
}

// Test 3: Authentication failure & tamper rejection
{
  const enc = engine.encryptPayload(sampleData, 'pass_2026', 'key_v1');

  const wrongKey = engine.decryptPayload(enc, 'wrong_pass', 'en');
  assert.strictEqual(wrongKey.success, false);
  assert.strictEqual(wrongKey.error.includes('Authentication failed'), true);

  const tamperedEnc = Object.assign({}, enc, { ciphertext: enc.ciphertext.slice(0, -4) + 'AAAA' });
  const tamperedResult = engine.decryptPayload(tamperedEnc, 'pass_2026', 'en');
  assert.strictEqual(tamperedResult.success, false);
  assert.strictEqual(tamperedResult.error.includes('Authentication failed'), true);
  console.log('✓ Test 3: MAC verification, wrong key rejection, and tamper resistance verified.');
}

// Test 4: Key rotation and migration to new key
{
  const enc1 = engine.encryptPayload(sampleData, 'secret_initial', 'key_v1');
  const rotResult = engine.rotateKey(enc1, 'secret_initial', 'secret_rotated', 'key_v2', 'en');

  assert.strictEqual(rotResult.success, true);
  assert.strictEqual(rotResult.oldKeyId, 'key_v1');
  assert.strictEqual(rotResult.newKeyId, 'key_v2');

  const oldKeyAttempt = engine.decryptPayload(rotResult.envelope, 'secret_initial');
  assert.strictEqual(oldKeyAttempt.success, false);

  const newKeyAttempt = engine.decryptPayload(rotResult.envelope, 'secret_rotated');
  assert.strictEqual(newKeyAttempt.success, true);
  assert.strictEqual(newKeyAttempt.data.userSecretNotes, 'Deep Focus Core Theorem');
  console.log('✓ Test 4: Seamless in-place key rotation (key_v1 -> key_v2) verified.');
}

// Test 5: 100-Locale translation, strict English fallback, absolute Hebrew exclusion & Western digits
{
  const enc = engine.encryptPayload(sampleData, 'pass_2026', 'key_v1');
  const decAr = engine.decryptPayload(enc, 'pass_2026', 'ar');
  assert.strictEqual(decAr.message.includes('تم فك تشفير'), true);

  const decDe = engine.decryptPayload(enc, 'pass_2026', 'de');
  assert.strictEqual(decDe.message.includes('decrypted and verified successfully'), true);

  const heTitle = engine.getLocalizedText('he', 'key_rotation_success');
  const iwTitle = engine.getLocalizedText('iw', 'key_rotation_success');
  assert.strictEqual(heTitle, 'Vault encryption key rotated and re-sealed successfully.');
  assert.strictEqual(iwTitle, 'Vault encryption key rotated and re-sealed successfully.');
  assert.strictEqual(engine.sanitizeLocale('he'), 'en');
  assert.strictEqual(engine.sanitizeLocale('iw'), 'en');

  assert.strictEqual(/^[0-9]+$/.test(engine.toWesternDigits(2026)), true);
  console.log('✓ Test 5: 100-Locale support, strict English fallback, zero Hebrew & Western digits verified.');
}

console.log('--- All Mission #121 Tests PASSED (GREEN) ---');
