const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/system_sanity_monitor_engine.js');

console.log('--- Running 🎯 Mission #174: System Sanity & Memory Safety Tests ---');

// Test 1: Storage Quota Audit & Warning Threshold (80%)
{
  const healthy = Engine.auditStorageUsage(20971520, 104857600);
  assert.strictEqual(healthy.usagePercentage, 20.0);
  assert.strictEqual(healthy.formattedUsage, '20.0%');
  assert.strictEqual(healthy.isHealthy, true);
  assert.strictEqual(healthy.statusKey, 'storage_healthy');

  const warning = Engine.auditStorageUsage(89128960, 104857600);
  assert.strictEqual(warning.isHealthy, false);
  assert.strictEqual(warning.statusKey, 'sanity_warning');

  console.log('✓ Test 1: Storage quota audit & warning threshold verified.');
}

// Test 2: DOM Hierarchy Node Count Audit
{
  const lean = Engine.auditDomHierarchy(350);
  assert.strictEqual(lean.isHealthy, true);
  assert.strictEqual(lean.statusKey, 'dom_healthy');

  const bloated = Engine.auditDomHierarchy(2500);
  assert.strictEqual(bloated.isHealthy, false);
  assert.strictEqual(bloated.statusKey, 'sanity_warning');

  console.log('✓ Test 2: DOM hierarchy node count audit verified.');
}

// Test 3: Garbage Collection Cache Pruning (Stale > 7 Days)
{
  const now = Date.now();
  const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

  const mockCaches = [
    { id: 'recent_1', timestamp: now - 1000 },
    { id: 'stale_1', timestamp: now - TEN_DAYS_MS },
    { id: 'stale_2', timestamp: now - (TEN_DAYS_MS * 2) }
  ];

  const gc = Engine.performGarbageCollection(mockCaches);
  assert.strictEqual(gc.totalEvaluated, 3);
  assert.strictEqual(gc.prunedStaleEntries, 2);
  assert.strictEqual(gc.remainingEntries, 1);
  assert.strictEqual(gc.formattedPruned, '2');

  console.log('✓ Test 3: Garbage collection cache pruning verified.');
}

// Test 4: Comprehensive Sanity Audit Report & Zero Music Guarantee
{
  const report = Engine.generateSanityAuditReport(1000000, 10000000, 450, 'ar');
  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.overallStatus, 'healthy');
  assert.strictEqual(report.zeroMusicCertified, true);
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);
  assert.ok(report.statusLabel.includes('سليمة'));

  console.log('✓ Test 4: Comprehensive sanity audit report verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('fi'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('استهلاك الذاكرة ٢٠.٠% وعدد العناصر ٣٥٠');
  assert.strictEqual(western, 'استهلاك الذاكرة 20.0% وعدد العناصر 350');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #174 Tests PASSED (GREEN) ---');
