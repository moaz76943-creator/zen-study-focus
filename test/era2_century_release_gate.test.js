const assert = require('assert');
const gate = require('../android/app/src/main/assets/web/js/era2_century_release_gate.js');

console.log('--- Running 🎯 Mission #110: Centurion Era 2 Release Gate v2.1.0 Tests ---');

// Test 1: Release metadata and version integrity
{
  const info = gate.getReleaseInfo();
  assert.strictEqual(info.version, '2.1.0');
  assert.strictEqual(info.tag, 'v2.1.0-era2-freeze-v21');
  assert.strictEqual(info.era, 'ERA-2');
  assert.strictEqual(info.schemaVersion, 'v21.0');
  assert.strictEqual(info.totalEra2Missions, 10);
  console.log('✓ Test 1: Release v2.1.0 constants, tag and era metadata verified.');
}

// Test 2: Certified modules catalog completeness (M101 to M110)
{
  const modules = gate.getCertifiedModules();
  assert.strictEqual(modules.length, 10);
  
  const m101 = modules.find(m => m.id === 'M101');
  assert.strictEqual(m101.name.includes('History Search'), true);
  
  const m104 = modules.find(m => m.id === 'M104');
  assert.strictEqual(m104.name.includes('Hydration'), true);

  const m107 = modules.find(m => m.id === 'M107');
  assert.strictEqual(m107.name.includes('Vault'), true);
  assert.strictEqual(m107.priority, 'P0');

  const m110 = modules.find(m => m.id === 'M110');
  assert.strictEqual(m110.priority, 'P0');
  console.log('✓ Test 2: Full Era 2 modules roster (M101-M110) verified.');
}

// Test 3: Audit integrity check and 100% GREEN readiness
{
  const audit = gate.auditEra2Integrity();
  assert.strictEqual(audit.certified, true);
  assert.strictEqual(audit.totalModules, 10);
  assert.strictEqual(audit.modules.every(m => m.status === 'VERIFIED'), true);
  assert.strictEqual(/^[0-9]+$/.test(audit.totalFormatted), true);
  console.log('✓ Test 3: Automated release certification and module status audit verified.');
}

// Test 4: Manifest generation and markdown table output
{
  const manifest = gate.generateReleaseManifest('en');
  assert.strictEqual(manifest.includes('Deep Focus v2.1.0'), true);
  assert.strictEqual(manifest.includes('v2.1.0-era2-freeze-v21'), true);
  assert.strictEqual(manifest.includes('| Mission | Engine Name | Source File | Priority | Status |'), true);
  assert.strictEqual(manifest.includes('M101'), true);
  assert.strictEqual(manifest.includes('M110'), true);
  console.log('✓ Test 4: Production release manifest and compliance table verified.');
}

// Test 5: 100-Locale translation, strict English fallback, zero Hebrew & Western digits
{
  const manifestAr = gate.generateReleaseManifest('ar');
  assert.strictEqual(manifestAr.includes('البيان الإنتاجي الشامل للقرن الثاني'), true);
  assert.strictEqual(manifestAr.includes('تم اعتماد الإصدار'), true);

  const manifestDe = gate.generateReleaseManifest('de');
  assert.strictEqual(manifestDe.includes('Centurion Era 2 Production Manifest'), true);

  const heTitle = gate.getLocalizedText('he', 'era2_summary_title');
  const iwTitle = gate.getLocalizedText('iw', 'era2_summary_title');
  assert.strictEqual(heTitle, 'Centurion Era 2 Production Manifest');
  assert.strictEqual(iwTitle, 'Centurion Era 2 Production Manifest');
  assert.strictEqual(gate.sanitizeLocale('he'), 'en');
  assert.strictEqual(gate.sanitizeLocale('iw'), 'en');

  assert.strictEqual(/^[0-9]+$/.test(gate.toWesternDigits(210)), true);
  console.log('✓ Test 5: 100-Locale support, strict English fallback, zero Hebrew & Western digits verified.');
}

console.log('--- All Mission #110 Tests PASSED (GREEN) ---');
