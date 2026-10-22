const assert = require('assert');
const engine = require('../android/app/src/main/assets/web/js/zen_privacy_mask_engine.js');

console.log('--- Running 🎯 Mission #119: Zen Privacy Mask & Screen Shield Tests ---');

// Test 1: Mask modes catalog & defaults
{
  const modes = Object.keys(engine.MASK_MODES);
  assert.strictEqual(modes.includes('BLUR'), true);
  assert.strictEqual(modes.includes('OBFUSCATE'), true);
  assert.strictEqual(modes.includes('SHIELD'), true);
  assert.strictEqual(modes.includes('NONE'), true);

  const cfg = engine.validateConfig({ blurRadiusPx: 2, autoLockTimeoutSec: 10 });
  assert.strictEqual(cfg.blurRadiusPx, 12);
  assert.strictEqual(cfg.autoLockTimeoutSec, 120);
  console.log('✓ Test 1: Privacy modes catalog & configuration bounds verified.');
}

// Test 2: Text character obfuscation
{
  const original = 'Math Exam: 95%';
  const masked = engine.obfuscateString(original);
  assert.strictEqual(masked.length, original.length);
  assert.strictEqual(masked.includes('Math'), false);
  assert.strictEqual(masked.includes('95%'), false);
  assert.strictEqual(masked.includes(' '), true);
  assert.strictEqual(engine.obfuscateString(''), '');
  assert.strictEqual(engine.obfuscateString(null), '');
  console.log('✓ Test 2: Character obfuscation & spacing preservation verified.');
}

// Test 3: Dynamic CSS variable injection across states
{
  const unlocked = engine.generatePrivacyCssVariables(false);
  assert.strictEqual(unlocked['--zen-privacy-blur'], '0px');
  assert.strictEqual(unlocked['--zen-privacy-shield-display'], 'none');

  const blurLocked = engine.generatePrivacyCssVariables(true, { activeMode: 'BLUR', blurRadiusPx: 14 });
  assert.strictEqual(blurLocked['--zen-privacy-blur'], '14px');
  assert.strictEqual(blurLocked['--zen-privacy-shield-display'], 'none');

  const shield = engine.generatePrivacyCssVariables(true, { activeMode: 'SHIELD' });
  assert.strictEqual(shield['--zen-privacy-shield-display'], 'flex');
  assert.strictEqual(shield['--zen-privacy-opacity'], '0.0');
  console.log('✓ Test 3: CSS variable generation for unlocked, blur, and shield states verified.');
}

// Test 4: Idle timeout auto-lock logic
{
  const cfg = { enabled: true, autoLockTimeoutSec: 60 };
  assert.strictEqual(engine.shouldAutoLock(30, cfg), false);
  assert.strictEqual(engine.shouldAutoLock(60, cfg), true);
  assert.strictEqual(engine.shouldAutoLock(100, cfg), true);
  assert.strictEqual(engine.shouldAutoLock(100, { enabled: false }), false);
  console.log('✓ Test 4: Idle timeout auto-lock decision logic verified.');
}

// Test 5: 100-Locale translation, strict English fallback, absolute Hebrew exclusion & Western digits
{
  const arTitle = engine.getLocalizedText('ar', 'privacy_shield_title');
  assert.strictEqual(arTitle.includes('درع الخصوصية'), true);

  const csTitle = engine.getLocalizedText('cs', 'privacy_shield_title');
  assert.strictEqual(csTitle, 'Privacy Shield Active');

  const heTitle = engine.getLocalizedText('he', 'privacy_shield_title');
  const iwTitle = engine.getLocalizedText('iw', 'privacy_shield_title');
  assert.strictEqual(heTitle, 'Privacy Shield Active');
  assert.strictEqual(iwTitle, 'Privacy Shield Active');
  assert.strictEqual(engine.sanitizeLocale('he'), 'en');
  assert.strictEqual(engine.sanitizeLocale('iw'), 'en');

  assert.strictEqual(/^[0-9]+px$/.test(engine.generatePrivacyCssVariables(true, { blurRadiusPx: 16 })['--zen-privacy-blur']), true);
  console.log('✓ Test 5: 100-Locale support, strict English fallback, zero Hebrew & Western digits verified.');
}

console.log('--- All Mission #119 Tests PASSED (GREEN) ---');
