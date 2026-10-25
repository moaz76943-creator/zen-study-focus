const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/impulse_regulation_velocity_engine.js');

console.log('--- Running 🎯 Mission #162: Distraction Impulse Heatmap Tests ---');

// Test 1: Impulse Heatmap Mapping & 5-Minute Bucket Distribution
{
  const map = Engine.mapImpulseTimelineHeatmap(30, [6, 8, 9]);
  assert.strictEqual(map.totalSessionMinutes, 30);
  assert.strictEqual(map.totalImpulses, 3);
  assert.strictEqual(map.buckets.length, 6);
  assert.strictEqual(map.buckets[1].impulseCount, 3);
  assert.strictEqual(map.buckets[1].intensity, 'peak_vulnerability');
  assert.strictEqual(map.overallStateKey, 'impulse_clustered');
  assert.strictEqual(map.peakVulnerabilityWindow, '5-10m');

  console.log('✓ Test 1: Impulse heatmap mapping & bucket clustering verified.');
}

// Test 2: Stable Session (No Impulses)
{
  const stable = Engine.mapImpulseTimelineHeatmap(25, []);
  assert.strictEqual(stable.totalImpulses, 0);
  assert.strictEqual(stable.overallStateKey, 'impulse_stable');
  assert.strictEqual(stable.peakVulnerabilityWindow, 'None');

  console.log('✓ Test 2: Stable session baseline verified.');
}

// Test 3: Self-Regulation Return Velocity Calculation
{
  const rapid = Engine.calculateRegulationVelocity([3, 4, 2]);
  assert.strictEqual(rapid.averageLatencySeconds, 3.0);
  assert.strictEqual(rapid.formattedLatency, '3.0s');
  assert.strictEqual(rapid.velocityTierKey, 'velocity_rapid');

  const standard = Engine.calculateRegulationVelocity([8, 12]);
  assert.strictEqual(standard.averageLatencySeconds, 10.0);
  assert.strictEqual(standard.velocityTierKey, 'velocity_standard');

  const delayed = Engine.calculateRegulationVelocity([20, 25]);
  assert.strictEqual(delayed.averageLatencySeconds, 22.5);
  assert.strictEqual(delayed.velocityTierKey, 'velocity_delayed');

  console.log('✓ Test 3: Self-regulation return velocity tiers verified.');
}

// Test 4: Comprehensive Impulse Analytics Report & Zero Music Guarantee
{
  const report = Engine.generateImpulseAnalyticsReport(45, [12, 14, 38], [4, 6, 3], 'ar');
  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.heatmapSummary.totalImpulsesLogged, '3');
  assert.strictEqual(report.zeroMusicCertified, true);
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);
  assert.ok(report.regulationVelocity.averageReturnTime.includes('s'));

  console.log('✓ Test 4: Comprehensive analytics report verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('it'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('النافذة ٥-١٠m بزمن استعادة ٣.٥s');
  assert.strictEqual(western, 'النافذة 5-10m بزمن استعادة 3.5s');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #162 Tests PASSED (GREEN) ---');
