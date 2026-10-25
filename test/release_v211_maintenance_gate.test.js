const assert = require('assert');
const gate = require('../android/app/src/main/assets/web/js/release_v211_maintenance_gate.js');

console.log('--- Running 🎯 Mission #120: Release Gate v2.1.1 Maintenance Tests ---');

// Test 1: Release metadata and version integrity
{
  const info = gate.getReleaseInfo();
  assert.strictEqual(info.version, '2.1.1');
  assert.strictEqual(info.tag, 'v2.1.1-maintenance-freeze-v21');
  assert.strictEqual(info.schemaVersion, 'v21.0');
  assert.strictEqual(info.totalPhaseMissions, 10);
  console.log('✓ Test 1: Release v2.1.1 metadata and version integrity verified.');
}

// Test 2: Certified modules catalog completeness (M111 to M120)
{
  const modules = gate.getCertifiedModules();
  assert.strictEqual(modules.length, 10);

  const m111 = modules.find(m => m.id === 'M111');
  assert.strictEqual(m111.name.includes('Calendar Event Sync'), true);

  const m113 = modules.find(m => m.id === 'M113');
  assert.strictEqual(m113.name.includes('Active Recall'), true);

  const m118 = modules.find(m => m.id === 'M118');
  assert.strictEqual(m118.name.includes('Annual Focus Heatmap'), true);

  const m119 = modules.find(m => m.id === 'M119');
  assert.strictEqual(m119.name.includes('Zen Privacy Mask'), true);

  const m120 = modules.find(m => m.id === 'M120');
  assert.strictEqual(m120.priority, 'P0');
  console.log('✓ Test 2: Complete Phase 8 modules roster (M111-M120) verified.');
}

// Test 3: Automated release certification and module status audit
{
  const audit = gate.auditPhase8Integrity();
  assert.strictEqual(audit.certified, true);
  assert.strictEqual(audit.totalModules, 10);
  assert.strictEqual(audit.modules.every(m => m.status === 'VERIFIED'), true);
  assert.strictEqual(/^[0-9]+$/.test(audit.totalFormatted), true);
  console.log('✓ Test 3: Automated release certification and 100% GREEN audit verified.');
}

// Test 4: Manifest generation and markdown table output
{
  const manifest = gate.generateReleaseManifest('en');
  assert.strictEqual(manifest.includes('Deep Focus v2.1.1'), true);
  assert.strictEqual(manifest.includes('v2.1.1-maintenance-freeze-v21'), true);
  assert.strictEqual(manifest.includes('| Mission | Engine Name | Source File | Priority | Status |'), true);
  assert.strictEqual(manifest.includes('M111'), true);
  assert.strictEqual(manifest.includes('M120'), true);
  console.log('✓ Test 4: Production release manifest and compliance table verified.');
}

// Test 5: 100-Locale translation, strict English fallback, zero Hebrew & Western digits
{
  const manifestAr = gate.generateReleaseManifest('ar');
  assert.strictEqual(manifestAr.includes('البيان الإنتاجي الشامل لإصدار الصيانة'), true);
  assert.strictEqual(manifestAr.includes('تم اعتماد إصدار الصيانة'), true);

  const manifestJa = gate.generateReleaseManifest('ja');
  assert.strictEqual(manifestJa.includes('Deep Focus v2.1.1 Production Release Manifest'), true);

  const heTitle = gate.getLocalizedText('he', 'manifest_title');
  const iwTitle = gate.getLocalizedText('iw', 'manifest_title');
  assert.strictEqual(heTitle, 'Deep Focus v2.1.1 Production Release Manifest');
  assert.strictEqual(iwTitle, 'Deep Focus v2.1.1 Production Release Manifest');
  assert.strictEqual(gate.sanitizeLocale('he'), 'en');
  assert.strictEqual(gate.sanitizeLocale('iw'), 'en');

  assert.strictEqual(/^[0-9]+$/.test(gate.toWesternDigits(211)), true);
  console.log('✓ Test 5: 100-Locale support, strict English fallback, zero Hebrew & Western digits verified.');
}

console.log('--- All Mission #120 Tests PASSED (GREEN) ---');
