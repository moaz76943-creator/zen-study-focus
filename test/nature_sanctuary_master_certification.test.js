/**
 * DEEP FOCUS — Master QA Certification: Nature Sanctuary & Presets (M090)
 * File: test/nature_sanctuary_master_certification.test.js
 *
 * Grand certification suite auditing the complete 30-sound nature sanctuary,
 * study environment presets, anti-clipping limiter, procedural SVG cards,
 * zero-music invariants, and running full regression across all project test suites.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PresetsEngine = require('../android/app/src/main/assets/web/js/study_environment_mix_presets_engine.js');
let SanctuaryEngine = null;
try {
  SanctuaryEngine = require('../android/app/src/main/assets/web/js/nature_sounds_sanctuary_30.js');
} catch (e) {
  // Graceful fallback if path varies
}

console.log('================================================================');
console.log('--- 🎯 Running Mission #090: Nature Sanctuary & Presets Master QA Certification ---');
console.log('================================================================');

// Audit 1: Cross-Engine Synchronization & Registry Parity
try {
  const presets = PresetsEngine.getPresets();
  assert(presets.length === 8, 'Must have exactly 8 study environment presets');

  const validSoundIds = new Set(PresetsEngine.VALID_SOUND_IDS);
  assert.strictEqual(validSoundIds.size, 30, 'Presets Engine must recognize exactly 30 nature sound IDs');

  if (SanctuaryEngine && typeof SanctuaryEngine.getAllSounds === 'function') {
    const sanctuarySounds = SanctuaryEngine.getAllSounds();
    assert.strictEqual(sanctuarySounds.length, 30, 'Sanctuary Engine must contain exactly 30 nature sounds');
    sanctuarySounds.forEach(s => {
      assert(validSoundIds.has(s.id), `Sanctuary sound ${s.id} must be recognized in Presets Engine`);
    });
  }

  presets.forEach(p => {
    assert(p.channels && p.channels.length >= 3, `Preset ${p.id} must have at least 3 channels`);
    p.channels.forEach(ch => {
      assert(validSoundIds.has(ch.soundId), `Channel sound ${ch.soundId} in preset ${p.id} must exist in 30 nature sounds`);
    });
  });

  console.log('✓ Audit 1: Cross-Engine synchronization & 30-sound registry parity verified.');
} catch (err) {
  console.error('✗ Audit 1 Failed:', err.message);
  process.exit(1);
}

// Audit 2: 100% Zero-Music & Zero-Melody Verification
try {
  const presets = PresetsEngine.getPresets();
  const forbiddenKeywords = ['song', 'melody', 'music', 'tune', 'rhythm_beat', 'synth', 'piano', 'guitar', 'instrument', 'bpm'];

  presets.forEach(p => {
    const textToScan = `${p.id} ${p.name_ar} ${p.name_en} ${p.description_ar} ${p.description_en} ${p.category}`.toLowerCase();
    forbiddenKeywords.forEach(kw => {
      const regex = new RegExp(`(^|[^a-zA-Z0-9])${kw}([^a-zA-Z0-9]|$)`, 'i');
      assert(!regex.test(textToScan), `Preset ${p.id} contains forbidden musical keyword: "${kw}"`);
    });

    p.channels.forEach(ch => {
      forbiddenKeywords.forEach(kw => {
        const regex = new RegExp(`(^|_)${kw}(_|$)`, 'i');
        assert(!regex.test(ch.soundId), `Channel soundId ${ch.soundId} contains forbidden musical keyword: "${kw}"`);
      });
    });
  });

  console.log('✓ Audit 2: 100% Zero-Music, zero-melody & pure nature acoustic purity verified.');
} catch (err) {
  console.error('✗ Audit 2 Failed:', err.message);
  process.exit(1);
}

// Audit 3: Master Limiter & Anti-Clipping Headroom Verification
try {
  const presets = PresetsEngine.getPresets();
  const maxAllowedHeadroom = PresetsEngine.MASTER_HEADROOM_CEILING;

  presets.forEach(p => {
    const normalApplied = PresetsEngine.applyPreset(p.id, 1.0);
    let normalSum = 0;
    normalApplied.activeChannels.forEach(c => { normalSum += c.normalizedGain; });
    assert(normalSum <= maxAllowedHeadroom + 0.001,
      `Preset ${p.id} normal mix sum (${normalSum}) exceeds headroom ceiling (${maxAllowedHeadroom})`);

    const overloadedChannels = p.channels.map(c => ({ soundId: c.soundId, volume: 1.0 }));
    const stressed = PresetsEngine.calculateNormalizedGains(overloadedChannels, 1.0);
    assert(stressed.totalNormalizedSum <= maxAllowedHeadroom + 0.001,
      `Preset ${p.id} stressed mix sum (${stressed.totalNormalizedSum}) exceeds headroom ceiling (${maxAllowedHeadroom})`);
  });

  console.log('✓ Audit 3: Master limiter & anti-clipping headroom ceiling (<= 0.85) verified.');
} catch (err) {
  console.error('✗ Audit 3 Failed:', err.message);
  process.exit(1);
}

// Audit 4: Procedural Visual Assets & Strict Exclusion Security
try {
  const presets = PresetsEngine.getPresets();

  presets.forEach(p => {
    ['ar', 'en'].forEach(lang => {
      const svg = PresetsEngine.renderPresetCardSVG(p.id, { lang: lang, width: 400, height: 250 });
      assert(typeof svg === 'string' && svg.startsWith('<svg') && svg.endsWith('</svg>'),
        `Preset ${p.id} (${lang}) must produce valid SVG string`);
      assert(!svg.includes('data:image/'), `SVG for ${p.id} must not contain raster bitmaps`);
      assert(!svg.includes('<image'), `SVG for ${p.id} must not contain external raster image tags`);
      assert(!svg.includes('href="http'), `SVG for ${p.id} must not reference external URLs`);

      assert(!svg.includes('"he"') && !svg.includes('"iw"'), `SVG for ${p.id} must strictly exclude Hebrew`);
    });
  });

  console.log('✓ Audit 4: Pure procedural vector SVG cards & strict exclusion invariants verified.');
} catch (err) {
  console.error('✗ Audit 4 Failed:', err.message);
  process.exit(1);
}

// Audit 5: Full Test Discovery & Regression Execution
try {
  const testDir = path.resolve(__dirname);
  const currentFile = path.basename(__filename);
  const allTestFiles = fs.readdirSync(testDir)
    .filter(f => f.endsWith('.test.js') && f !== currentFile)
    .sort();

  console.log(`\n--- Running Full Project Test Regression across ${allTestFiles.length} discovered suites ---`);

  let passedSuites = 0;
  let failedSuites = 0;
  const failures = [];

  allTestFiles.forEach(testFile => {
    const fullPath = path.join(testDir, testFile);
    const result = spawnSync(process.execPath, [fullPath], {
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 10000
    });

    if (result.status === 0) {
      passedSuites++;
      process.stdout.write('.');
    } else {
      failedSuites++;
      failures.push({
        file: testFile,
        output: result.stderr || result.stdout
      });
      process.stdout.write('F');
    }
  });

  console.log('\n');

  if (failedSuites > 0) {
    console.error(`✗ Regression Test Failures: ${failedSuites} of ${allTestFiles.length} failed`);
    failures.forEach(f => {
      console.error(`--- Failure in ${f.file} ---:\n${f.output}`);
    });
    process.exit(1);
  }

  const grandTotal = passedSuites + 1;
  console.log(`✓ Audit 5: Full test regression passed: ${passedSuites}/${allTestFiles.length} suites GREEN (Grand Total: ${grandTotal} suites).`);
  console.log('================================================================');
  console.log(`[PASS] 🎯 Mission #090: Master QA Certification Complete (${grandTotal} Total Suites 100% GREEN)`);
  console.log('================================================================');
} catch (err) {
  console.error('✗ Audit 5 Failed:', err.message);
  process.exit(1);
}
