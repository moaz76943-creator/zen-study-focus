const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/offline_vault_crypto_engine.js');

console.log('--- Running 🎯 Mission #151: Offline Cryptographic Vault Tests ---');

// Test 1: Cryptographic Salt Generation (16 bytes = 32 hex chars)
{
  const salt = Engine.generateCryptographicSalt(16);
  assert.strictEqual(typeof salt, 'string');
  assert.strictEqual(salt.length, 32);
  assert.ok(/^[0-9a-f]+$/.test(salt));

  console.log('✓ Test 1: Cryptographic salt generation verified.');
}

// Test 2: Mobile Key Derivation Pacing Calibration (~200ms budget)
{
  const pacing = Engine.calibrateDerivationPacing(100);
  assert.strictEqual(pacing.targetTimeMs, 200);
  assert.strictEqual(pacing.formattedTime, '200ms');
  assert.strictEqual(pacing.algorithm, 'PBKDF2-HMAC-SHA256');
  assert.strictEqual(pacing.keyLengthBits, 256);
  assert.ok(pacing.iterations >= 50000);

  console.log('✓ Test 2: Mobile key derivation pacing budget calibrated.');
}

// Test 3: Vault Envelope Creation & Integrity Verification
{
  const originalData = { studySession: 'General Relativity', minutes: 45 };
  const env = Engine.createVaultEnvelope(originalData);

  assert.strictEqual(env.version, 'v21-fortress-aes256');
  assert.strictEqual(env.algorithm, 'AES-GCM-256');
  assert.strictEqual(env.status, 'sealed');
  assert.strictEqual(env.zeroMusicCertified, true);

  const verified = Engine.verifyVaultIntegrity(env);
  assert.strictEqual(verified.valid, true);
  assert.strictEqual(verified.statusKey, 'integrity_valid');
  assert.ok(verified.unlockedPayload.includes('General Relativity'));

  const tamperedEnv = Object.assign({}, env, { cipherPayload: Buffer.from('Hacked Data').toString('base64') });
  const tamperedVerify = Engine.verifyVaultIntegrity(tamperedEnv);
  assert.strictEqual(tamperedVerify.valid, false);
  assert.strictEqual(tamperedVerify.statusKey, 'integrity_tampered');

  console.log('✓ Test 3: Vault envelope sealing & tamper detection verified.');
}

// Test 4: Comprehensive Vault Audit Report & Zero Medical Claims
{
  const env = Engine.createVaultEnvelope('Organic Chemistry Notes');
  const report = Engine.generateVaultAuditReport(env, 'ar');

  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.vaultEnvelope.integrityPassed, true);
  assert.strictEqual(report.zeroMusicCertified, true);
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);
  assert.ok(report.statusLabel.includes('تشفير') || report.statusLabel.includes('التحقق'));

  console.log('✓ Test 4: Comprehensive vault audit report verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('vi'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('زمن الاشتقاق ٢٠٠ms بعدد ١٠٠٠٠٠ دورة');
  assert.strictEqual(western, 'زمن الاشتقاق 200ms بعدد 100000 دورة');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #151 Tests PASSED (GREEN) ---');
