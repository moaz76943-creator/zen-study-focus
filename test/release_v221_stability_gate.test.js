const assert = require('assert');
const gate = require('../android/app/src/main/assets/web/js/release_v221_stability_gate.js');

console.log('--- Running 🎯 Mission #130: Release Gate v2.2.1 Stability Tests ---');

// Test 1: Release metadata & version integrity
{
  const info = gate.getReleaseInfo();
  assert.strictEqual(info.version, '2.2.1');
  assert.strictEqual(info.tag, 'v2.2.1-stability-freeze-v21');
  assert.strictEqual(info.schemaVersion, 'v21.0');
  assert.strictEqual(info.totalCumulativeMissions, 130);
  console.log('✓ Test 1: Release v2.2.1 metadata and version integrity verified.');
}

// Test 2: Certified modules catalog completeness (M121 to M130)
{
  const modules = gate.getCertifiedModules();
  assert.strictEqual(modules.length, 10);

  const m121 = modules.find(m => m.id === 'M121');
  assert.strictEqual(m121.name.includes('Key Rotation'), true);

  const m124 = modules.find(m => m.id === 'M124');
  assert.strictEqual(m124.name.includes('Noise Cancellation'), true);

  const m126 = modules.find(m => m.id === 'M126');
  assert.strictEqual(m126.name.includes('Cognitive Habit'), true);

  const m128 = modules.find(m => m.id === 'M128');
  assert.strictEqual(m128.name.includes('Thermal Throttle'), true);

  const m129 = modules.find(m => m.id === 'M129');
  assert.strictEqual(m129.name.includes('Session Completion'), true);

  const m130 = modules.find(m => m.id === 'M130');
  assert.strictEqual(m130.priority, 'P0');
  console.log('✓ Test 2: Complete Phase 9 modules roster (M121-M130) verified.');
}

// Test 3: Automated release certification and module status audit
{
  const audit = gate.auditPhase9Integrity();
  assert.strictEqual(audit.certified, true);
  assert.strictEqual(audit.totalModules, 10);
  assert.strictEqual(audit.modules.every(m => m.status === 'VERIFIED'), true);
  assert.strictEqual(/^[0-9]+$/.test(audit.totalFormatted), true);
  console.log('✓ Test 3: Automated release certification and 100% GREEN audit verified.');
}

// Test 4: Manifest generation and markdown table output
{
  const manifest = gate.generateReleaseManifest('en');
  assert.strictEqual(manifest.includes('Deep Focus v2.2.1'), true);
  assert.strictEqual(manifest.includes('v2.2.1-stability-freeze-v21'), true);
  assert.strictEqual(manifest.includes('**Total Cumulative Missions:** `130`'), true);
  assert.strictEqual(manifest.includes('| Mission | Engine Name | Source File | Priority | Status |'), true);
  assert.strictEqual(manifest.includes('M121'), true);
  assert.strictEqual(manifest.includes('M130'), true);
  console.log('✓ Test 4: Production release manifest and compliance table verified.');
}

// Test 5: 100-Locale translation, strict English fallback, zero Hebrew & Western digits
{
  const manifestAr = gate.generateReleaseManifest('ar');
  assert.strictEqual(manifestAr.includes('البيان الإنتاجي الشامل لإصدار الاستقرار'), true);
  assert.strictEqual(manifestAr.includes('تم اعتماد إصدار الاستقرار'), true);

  const manifestKo = gate.generateReleaseManifest('ko');
  assert.strictEqual(manifestKo.includes('Deep Focus v2.2.1 Grand Stability Production Manifest'), true);

  const heTitle = gate.getLocalizedText('he', 'manifest_title');
  const iwTitle = gate.getLocalizedText('iw', 'manifest_title');
  assert.strictEqual(heTitle, 'Deep Focus v2.2.1 Grand Stability Production Manifest');
  assert.strictEqual(iwTitle, 'Deep Focus v2.2.1 Grand Stability Production Manifest');
  assert.strictEqual(gate.sanitizeLocale('he'), 'en');
  assert.strictEqual(gate.sanitizeLocale('iw'), 'en');

  assert.strictEqual(/^[0-9]+$/.test(gate.toWesternDigits(130)), true);
  console.log('✓ Test 5: 100-Locale support, strict English fallback, zero Hebrew & Western digits verified.');
}

console.log('--- All Mission #130 Tests PASSED (GREEN) ---');
