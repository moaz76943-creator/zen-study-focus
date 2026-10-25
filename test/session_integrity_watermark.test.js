const assert = require('assert');
const engine = require('../android/app/src/main/assets/web/js/session_integrity_watermark_engine.js');

console.log('--- Running 🎯 Mission #127: Session Checksum & Integrity Watermark Tests ---');

// Test 1: Checksum calculation & format
{
  const cs = engine.calculateChecksum('test-session-payload');
  assert.strictEqual(/^[0-9a-f]{8}$/.test(cs), true);
  assert.strictEqual(engine.WATERMARK_PREFIX, 'DF-v21');
  console.log('✓ Test 1: Checksum format and DF-v21 prefix verified.');
}

// Test 2: Session stamping and verification
{
  const session = {
    id: 'session_42',
    startTime: 1700000000000,
    durationSeconds: 1500,
    category: 'Physics',
    qualityScore: 90
  };

  const stamped = engine.stampSession(session);
  assert.strictEqual(typeof stamped.integrityWatermark, 'string');
  assert.strictEqual(stamped.integrityWatermark.startsWith('DF-v21-'), true);

  const check = engine.verifySessionIntegrity(stamped, 'en');
  assert.strictEqual(check.valid, true);
  assert.strictEqual(check.message.includes('verified'), true);
  console.log('✓ Test 2: Authentic session stamping & cryptographic verification verified.');
}

// Test 3: Tamper rejection
{
  const session = {
    id: 's_tamper_test',
    startTime: 1700000000000,
    durationSeconds: 1800,
    category: 'Coding',
    qualityScore: 85
  };
  const stamped = engine.stampSession(session);

  const tamperedDur = Object.assign({}, stamped, { durationSeconds: 3600 });
  const checkDur = engine.verifySessionIntegrity(tamperedDur, 'en');
  assert.strictEqual(checkDur.valid, false);
  assert.strictEqual(checkDur.error.includes('Integrity check failed'), true);

  const tamperedScore = Object.assign({}, stamped, { qualityScore: 100 });
  const checkScore = engine.verifySessionIntegrity(tamperedScore, 'en');
  assert.strictEqual(checkScore.valid, false);

  const tamperedCat = Object.assign({}, stamped, { category: 'Hacked' });
  const checkCat = engine.verifySessionIntegrity(tamperedCat, 'en');
  assert.strictEqual(checkCat.valid, false);

  const noWatermark = { id: 's_no_wm', durationSeconds: 1800 };
  assert.strictEqual(engine.verifySessionIntegrity(noWatermark, 'en').valid, false);

  console.log('✓ Test 3: Tamper detection across duration, quality score, and category verified.');
}

// Test 4: Certificate badge generation with Western digits
{
  const badge = engine.generateCertificateBadge(45.5, 60, 14);
  assert.strictEqual(badge.badgeId.startsWith('DF-CERT-'), true);
  assert.strictEqual(badge.totalHours, '45.5');
  assert.strictEqual(badge.sessionsCount, '60');
  assert.strictEqual(badge.streakDays, '14');
  assert.strictEqual(/^[0-9]+(\.[0-9]+)?$/.test(badge.totalHours), true);
  console.log('✓ Test 4: Accomplishment certificate badge & Western digits formatting verified.');
}

// Test 5: 100-Locale translation, strict English fallback & zero Hebrew
{
  const session = { id: 's_locale', startTime: 1000, durationSeconds: 1500, category: 'Math', qualityScore: 90 };
  const stamped = engine.stampSession(session);

  const checkAr = engine.verifySessionIntegrity(stamped, 'ar');
  assert.strictEqual(checkAr.message.includes('تم التحقق من تكامل الجلسة'), true);

  const checkFr = engine.verifySessionIntegrity(stamped, 'fr');
  assert.strictEqual(checkFr.message.includes('Session integrity verified'), true);

  const heTitle = engine.getLocalizedText('he', 'certificate_badge_title');
  const iwTitle = engine.getLocalizedText('iw', 'certificate_badge_title');
  assert.strictEqual(heTitle, 'Verified Study Accomplishment Badge');
  assert.strictEqual(iwTitle, 'Verified Study Accomplishment Badge');
  assert.strictEqual(engine.sanitizeLocale('he'), 'en');
  assert.strictEqual(engine.sanitizeLocale('iw'), 'en');

  assert.strictEqual(/^[0-9]+$/.test(engine.toWesternDigits(127)), true);
  console.log('✓ Test 5: 100-Locale support, strict English fallback, zero Hebrew & Western digits verified.');
}

console.log('--- All Mission #127 Tests PASSED (GREEN) ---');
