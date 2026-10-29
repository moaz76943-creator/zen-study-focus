const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/focus_bookmark_resume_engine.js');

console.log('--- Running 🎯 Mission #139: Multi-Sensory Focus Bookmark Tests ---');

// Test 1: Session Bookmark Creation & Anchor Capture
{
  const bm = Engine.createSessionBookmark({
    elapsedSeconds: 1540,
    subject: 'Astrophysics',
    thoughtAnchor: 'Deriving orbital velocity equation',
    ambientSound: 'rain_sanctuary',
    chromaPreset: 'night'
  });

  assert.strictEqual(bm.status, 'saved');
  assert.strictEqual(bm.subject, 'Astrophysics');
  assert.strictEqual(bm.thoughtAnchor, 'Deriving orbital velocity equation');
  assert.strictEqual(bm.formattedElapsed, '25m 40s');
  assert.strictEqual(bm.sensoryContext.ambientSound, 'rain_sanctuary');
  assert.strictEqual(bm.sensoryContext.chromaPreset, 'night');
  assert.ok(bm.bookmarkId.startsWith('bm_'));

  console.log('✓ Test 1: Session Bookmark creation & anchor capture verified.');
}

// Test 2: Multi-sensory re-entry ramp-up calculation
{
  const ramp30 = Engine.calculateReentryPacing(30);
  assert.strictEqual(ramp30.totalRampSeconds, 30);
  assert.strictEqual(ramp30.formattedRampSeconds, '30s');
  assert.strictEqual(ramp30.steps.length, 3);
  assert.strictEqual(ramp30.steps[2].volumeFactor, 1.0);
  assert.ok(ramp30.transitionCss.includes('30s'));

  const rampClampLow = Engine.calculateReentryPacing(5);
  assert.strictEqual(rampClampLow.totalRampSeconds, 10);

  const rampClampHigh = Engine.calculateReentryPacing(120);
  assert.strictEqual(rampClampHigh.totalRampSeconds, 60);

  console.log('✓ Test 2: Re-entry ramp-up calculations and clamping verified.');
}

// Test 3: Fallback handling on empty inputs
{
  const emptyBm = Engine.createSessionBookmark({});
  assert.strictEqual(emptyBm.subject, 'General Study');
  assert.strictEqual(emptyBm.thoughtAnchor, 'Resume from current paragraph');
  assert.strictEqual(emptyBm.formattedElapsed, '0m 0s');
  assert.strictEqual(emptyBm.sensoryContext.ambientSound, 'none');

  console.log('✓ Test 3: Fallback handling on empty inputs verified.');
}

// Test 4: Comprehensive Resume Report & Zero Medical Claims
{
  const bm = Engine.createSessionBookmark({
    elapsedSeconds: 1800,
    subject: 'Organic Chemistry',
    thoughtAnchor: 'Step 3 of synthesis pathway',
    ambientSound: 'binaural_alpha',
    chromaPreset: 'dusk'
  });

  const report = Engine.generateResumeReport(bm, 30, 'ar');
  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);
  assert.strictEqual(report.reentry.rampDuration, '30s');
  assert.ok(report.reentry.audioRestore.includes('binaural_alpha'));
  assert.ok(report.reentry.chromaRestore.includes('dusk'));

  console.log('✓ Test 4: Comprehensive Resume Report & Zero medical claims verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('ja'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('المدة المنقضية ٢٥m ٤٠s، زمن العودة ٣٠s');
  assert.strictEqual(western, 'المدة المنقضية 25m 40s، زمن العودة 30s');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #139 Tests PASSED (GREEN) ---');
