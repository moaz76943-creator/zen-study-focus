const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/cloudless_backup_archive_engine.js');

console.log('--- Running 🎯 Mission #154: Dual-Vault Cloudless Backup Tests ---');

// Test 1: Packaging of Dual-Vault Archive (.dfvault)
{
  const publicData = { totalSessions: 42, streakDays: 14, curriculum: 'Astrophysics' };
  const fortressData = 'ENCRYPTED_AES_CIPHER_PAYLOAD_ABC_123';

  const pkg = Engine.packageDualVaultArchive(publicData, fortressData);
  assert.strictEqual(pkg.status, 'sealed');
  assert.strictEqual(pkg.manifest.archiveVersion, '2.4-dual-vault');
  assert.strictEqual(pkg.manifest.zeroNetworkRequired, true);
  assert.ok(pkg.fileName.endsWith('.dfvault'));
  assert.ok(pkg.manifest.totalBytes > 50);

  console.log('✓ Test 1: Dual-Vault archive packaging verified.');
}

// Test 2: Unpacking and Checksum Integrity Verification
{
  const publicData = { subject: 'Quantum Field Theory' };
  const fortressData = 'ENCRYPTED_PRIVATE_NOTES';

  const pkg = Engine.packageDualVaultArchive(publicData, fortressData);
  const unpacked = Engine.unpackAndVerifyArchive(pkg.archiveBundle);

  assert.strictEqual(unpacked.success, true);
  assert.strictEqual(unpacked.statusKey, 'archive_restored');
  assert.strictEqual(unpacked.publicData.subject, 'Quantum Field Theory');
  assert.strictEqual(unpacked.fortressPayload, 'ENCRYPTED_PRIVATE_NOTES');

  console.log('✓ Test 2: Unpacking & checksum integrity verification verified.');
}

// Test 3: Tamper Detection on Corrupted Archive
{
  const pkg = Engine.packageDualVaultArchive({ test: 1 }, 'CIPHER');
  const parsed = JSON.parse(pkg.archiveBundle);
  parsed.fortressPartition = Buffer.from('TAMPERED_CONTENT').toString('base64');
  const corruptedBundle = JSON.stringify(parsed);

  const corruptedCheck = Engine.unpackAndVerifyArchive(corruptedBundle);
  assert.strictEqual(corruptedCheck.success, false);
  assert.strictEqual(corruptedCheck.statusKey, 'tamper_detected');

  console.log('✓ Test 3: Tamper detection on corrupted archive verified.');
}

// Test 4: Comprehensive Backup Report & Zero Music Guarantee
{
  const pkg = Engine.packageDualVaultArchive({ version: 1 }, 'DATA');
  const report = Engine.generateBackupReport(pkg, 'ar');

  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.security.zeroCloudRequired, true);
  assert.strictEqual(report.security.zeroMusicPolicyVerified, true);
  assert.strictEqual(report.security.zeroMedicalClaimsVerified, true);
  assert.ok(report.manifest.sizeBytes.includes('bytes'));

  console.log('✓ Test 4: Comprehensive backup report verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('sv'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('حجم الأرشيف ١٤٥٠ bytes وبصمة ٨٧٦٥٤٣');
  assert.strictEqual(western, 'حجم الأرشيف 1450 bytes وبصمة 876543');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #154 Tests PASSED (GREEN) ---');
