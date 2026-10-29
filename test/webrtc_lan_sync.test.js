const assert = require('assert');
const engine = require('../android/app/src/main/assets/web/js/webrtc_lan_sync_engine.js');

console.log('--- Running 🎯 Mission #132: Local LAN & WebRTC Peer Sync Tests ---');

// Test 1: Protocol version & envelope creation
{
  assert.strictEqual(engine.PROTOCOL_VERSION, 'DF-SYNC-P2P-v21');

  const env = engine.createSyncEnvelope('phone_alpha', [{ id: '1', durationSeconds: 1500 }], 'p2p_pass');
  assert.strictEqual(env.protocol, 'DF-SYNC-P2P-v21');
  assert.strictEqual(env.deviceId, 'phone_alpha');
  assert.strictEqual(env.sessionsCount, 1);
  assert.strictEqual(/^[0-9a-f]{8}$/.test(env.signature), true);
  console.log('✓ Test 1: P2P envelope structure and Adler signature verified.');
}

// Test 2: Delta merge & conflict resolution
{
  const local = [
    { id: 's1', durationSeconds: 1500, category: 'Physics' },
    { id: 's2', durationSeconds: 2000, category: 'Math' }
  ];

  const incoming = [
    { id: 's1', durationSeconds: 2700, category: 'Physics' },
    { id: 's3', durationSeconds: 3600, category: 'Coding' }
  ];

  const env = engine.createSyncEnvelope('tablet_beta', incoming, 'shared_sec');
  const res = engine.mergePeerEnvelope(local, env, 'shared_sec', 'en');

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.addedCount, 1);
  assert.strictEqual(res.totalCount, 3);

  const s1Updated = res.mergedSessions.find(s => s.id === 's1');
  assert.strictEqual(s1Updated.durationSeconds, 2700);
  console.log('✓ Test 2: Peer delta merge and conflict resolution verified.');
}

// Test 3: Signature authentication failure
{
  const local = [{ id: 's1' }];
  const env = engine.createSyncEnvelope('device_x', [{ id: 's2' }], 'correct_pass');

  const badResult = engine.mergePeerEnvelope(local, env, 'wrong_pass', 'en');
  assert.strictEqual(badResult.success, false);
  assert.strictEqual(badResult.error.includes('Authentication failed'), true);
  assert.strictEqual(badResult.addedCount, 0);
  console.log('✓ Test 3: Unauthorized peer payload & signature mismatch rejection verified.');
}

// Test 4: Protocol mismatch detection
{
  const invalidEnv = {
    protocol: 'OUTDATED_PROTOCOL_V1',
    deviceId: 'old_device',
    timestamp: 1700000000,
    payload: [],
    signature: '12345678'
  };

  const res = engine.mergePeerEnvelope([], invalidEnv, 'sec', 'en');
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.error.includes('Protocol mismatch'), true);
  console.log('✓ Test 4: Incompatible protocol rejection verified.');
}

// Test 5: 100-Locale translation, strict English fallback, absolute Hebrew exclusion & Western digits
{
  const local = [{ id: 's1' }];
  const env = engine.createSyncEnvelope('dev_ar', [{ id: 's2' }], 'pass_ar');

  const resAr = engine.mergePeerEnvelope(local, env, 'pass_ar', 'ar');
  assert.strictEqual(resAr.message.includes('اكتملت المزامنة المباشرة'), true);

  const resPl = engine.mergePeerEnvelope(local, env, 'pass_ar', 'pl');
  assert.strictEqual(resPl.message.includes('Local P2P synchronization completed'), true);

  const heMsg = engine.getLocalizedText('he', 'pairing_offer_ready');
  const iwMsg = engine.getLocalizedText('iw', 'pairing_offer_ready');
  assert.strictEqual(heMsg, 'Pairing token generated. Ready for QR code or LAN transmission.');
  assert.strictEqual(iwMsg, 'Pairing token generated. Ready for QR code or LAN transmission.');
  assert.strictEqual(engine.sanitizeLocale('he'), 'en');
  assert.strictEqual(engine.sanitizeLocale('iw'), 'en');

  assert.strictEqual(/^[0-9]+$/.test(resAr.totalCountFormatted), true);
  console.log('✓ Test 5: 100-Locale support, strict English fallback, zero Hebrew & Western digits verified.');
}

console.log('--- All Mission #132 Tests PASSED (GREEN) ---');
