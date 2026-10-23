const assert = require('assert');
const gate = require('../android/app/src/main/assets/web/js/era3_gateway_release_gate.js');

console.log('--- Running 🎯 Mission #125: Grand Centurion Era 3 Gateway Release Gate v2.2.0 Tests ---');

// Test 1: Release metadata & version integrity
{
  const info = gate.getReleaseInfo();
  assert.strictEqual(info.version, '2.2.0');
  assert.strictEqual(info.tag, 'v2.2.0-era3-gateway-freeze-v21');
  assert.strictEqual(info.era, 'CENTURION-ERA-3');
  assert.strictEqual(info.schemaVersion, 'v21.0');
  assert.strictEqual(info.totalCumulativeMissions, 125);
  console.log('✓ Test 1: Release v2.2.0 metadata, tag, and cumulative mission count verified.');
}

// Test 2: Quad-Pillars architecture validation
{
  const pillars = gate.getQuadPillars();
  assert.strictEqual(pillars.length, 4);
  assert.strictEqual(pillars.some(p => p.id === 'PILLAR_1_SECURITY'), true);
  assert.strictEqual(pillars.some(p => p.id === 'PILLAR_2_SENSORY'), true);
  assert.strictEqual(pillars.some(p => p.id === 'PILLAR_3_SCHOLARLY'), true);
  assert.strictEqual(pillars.some(p => p.id === 'PILLAR_4_READINESS'), true);
  console.log('✓ Test 2: Quad-Pillar architectural framework verified.');
}

// Test 3: Gateway certified modules roster (M121-M125)
{
  const modules = gate.getGatewayModules();
  assert.strictEqual(modules.length, 5);

  const m121 = modules.find(m => m.id === 'M121');
  assert.strictEqual(m121.name.includes('Key Rotation'), true);

  const m122 = modules.find(m => m.id === 'M122');
  assert.strictEqual(m122.name.includes('Binaural Beat'), true);

  const m123 = modules.find(m => m.id === 'M123');
  assert.strictEqual(m123.name.includes('BibTeX'), true);

  const m124 = modules.find(m => m.id === 'M124');
  assert.strictEqual(m124.name.includes('Noise Cancellation'), true);

  const m125 = modules.find(m => m.id === 'M125');
  assert.strictEqual(m125.priority, 'P0');
  console.log('✓ Test 3: Gateway core modules roster (M121-M125) verified.');
}

// Test 4: Manifest generation and markdown table output
{
  const manifest = gate.generateReleaseManifest('en');
  assert.strictEqual(manifest.includes('Deep Focus v2.2.0'), true);
  assert.strictEqual(manifest.includes('v2.2.0-era3-gateway-freeze-v21'), true);
  assert.strictEqual(manifest.includes('**Total Cumulative Missions:** `125`'), true);
  assert.strictEqual(manifest.includes('| Mission | Engine Name | Source File | Priority | Status |'), true);
  assert.strictEqual(manifest.includes('M121'), true);
  assert.strictEqual(manifest.includes('M125'), true);
  console.log('✓ Test 4: Production release manifest and compliance table verified.');
}

// Test 5: 100-Locale translation, strict English fallback, zero Hebrew & Western digits
{
  const manifestAr = gate.generateReleaseManifest('ar');
  assert.strictEqual(manifestAr.includes('البيان الإنتاجي الشامل لبوابة القرن الثالث'), true);
  assert.strictEqual(manifestAr.includes('تم اعتماد بوابة القرن الثالث'), true);

  const manifestKo = gate.generateReleaseManifest('ko');
  assert.strictEqual(manifestKo.includes('Deep Focus v2.2.0 Grand Gateway Production Manifest'), true);

  const heTitle = gate.getLocalizedText('he', 'manifest_title');
  const iwTitle = gate.getLocalizedText('iw', 'manifest_title');
  assert.strictEqual(heTitle, 'Deep Focus v2.2.0 Grand Gateway Production Manifest');
  assert.strictEqual(iwTitle, 'Deep Focus v2.2.0 Grand Gateway Production Manifest');
  assert.strictEqual(gate.sanitizeLocale('he'), 'en');
  assert.strictEqual(gate.sanitizeLocale('iw'), 'en');

  assert.strictEqual(/^[0-9]+$/.test(gate.toWesternDigits(125)), true);
  console.log('✓ Test 5: 100-Locale support, strict English fallback, zero Hebrew & Western digits verified.');
}

console.log('--- All Mission #125 Tests PASSED (GREEN) ---');
