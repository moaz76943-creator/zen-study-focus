/**
 * DEEP FOCUS — Test Suite: Zen Color Palette & Custom Theme Styler Engine (M103)
 * File: test/zen_theme_styler.test.js
 */

const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/zen_theme_styler_engine.js');

console.log('--- Running 🎯 Mission #103: Zen Theme Styler Tests ---');

// Test 1: Curated Themes Catalog Verification
try {
  const themes = Engine.getThemes('en');
  assert.strictEqual(themes.length, 6, 'Must provide exactly 6 curated Zen themes');

  const requiredIds = [
    'oled_pitch_black',
    'warm_sepia_eink',
    'forest_pine_zen',
    'midnight_navy',
    'nordic_frost',
    'solarized_dark'
  ];

  requiredIds.forEach(id => {
    const t = Engine.getThemeById(id, 'en');
    assert(t, `Theme ${id} must exist`);
    assert(t.colors.bg && t.colors.textPrimary && t.colors.accent, `Theme ${id} must define core colors`);
    assert(typeof t.minContrastRatio === 'number', `Theme ${id} must specify contrast ratio`);
  });

  console.log('✓ Test 1: 6 curated Zen themes catalog & color tokens verified.');
} catch (err) {
  console.error('✗ Test 1 Failed:', err.message);
  process.exit(1);
}

// Test 2: Contrast Ratio Calculation & WCAG Compliance
try {
  const maxRatio = Engine.calculateContrastRatio('#000000', '#FFFFFF');
  assert.strictEqual(maxRatio, 21.0, 'Pure black and white must have 21.0:1 ratio');

  const themes = Engine.getThemes('en');
  themes.forEach(t => {
    const calculated = Engine.calculateContrastRatio(t.colors.bg, t.colors.textPrimary);
    assert(calculated >= 4.5, `Theme ${t.id} contrast (${calculated}:1) must meet WCAG AA (4.5:1)`);
  });

  const oledRatio = Engine.calculateContrastRatio(themes[0].colors.bg, themes[0].colors.textPrimary);
  const sepiaRatio = Engine.calculateContrastRatio(themes[1].colors.bg, themes[1].colors.textPrimary);
  assert(oledRatio >= 7.0, 'OLED must meet AAA');
  assert(sepiaRatio >= 7.0, 'Sepia must meet AAA');

  console.log('✓ Test 2: WCAG AA (>= 4.5:1) and AAA (>= 7.0:1) contrast compliance verified.');
} catch (err) {
  console.error('✗ Test 2 Failed:', err.message);
  process.exit(1);
}

// Test 3: CSS Variable Block Generation
try {
  const css = Engine.generateThemeCSS('oled_pitch_black');
  assert(typeof css === 'string');
  assert(css.includes(':root {'), 'Must declare root block');
  assert(css.includes('--df-bg: #000000;'), 'Must inject background color');
  assert(css.includes('--df-accent: #10B981;'), 'Must inject emerald accent');
  assert(css.includes('--df-theme-id: "oled_pitch_black";'), 'Must inject theme ID');

  console.log('✓ Test 3: Dynamic CSS variable block generation verified.');
} catch (err) {
  console.error('✗ Test 3 Failed:', err.message);
  process.exit(1);
}

// Test 4: Custom User Palette Creation & Validation
try {
  const custom = Engine.createCustomTheme({
    bg: '#111827',
    textPrimary: '#F9FAFB',
    accent: '#3B82F6'
  }, 'My Custom Blue');

  assert.strictEqual(custom.id, 'custom_user_theme');
  assert.strictEqual(custom.name, 'My Custom Blue');
  assert(custom.contrastRatio >= 4.5, 'Must calculate custom contrast ratio');
  assert.strictEqual(custom.wcagCompliance.aa, true);

  const fallbackCustom = Engine.createCustomTheme({ bg: 'not-a-color', textPrimary: 'invalid' });
  assert.strictEqual(fallbackCustom.colors.bg, '#000000', 'Must fallback to black');
  assert.strictEqual(fallbackCustom.colors.textPrimary, '#FFFFFF', 'Must fallback to white');

  console.log('✓ Test 4: Custom user palette creation, hex validation & contrast ratio verified.');
} catch (err) {
  console.error('✗ Test 4 Failed:', err.message);
  process.exit(1);
}

// Test 5: Multi-Language, Strict English Fallback & Hebrew Exclusion
try {
  const Bridge = require('../android/app/src/main/assets/web/js/universal_i18n_bridge.js');

  const oledAr = Engine.getThemeById('oled_pitch_black', 'ar');
  assert(oledAr.name.includes('أسود فاحم') || oledAr.name.includes('OLED'));

  const oledEs = Engine.getThemeById('oled_pitch_black', 'es');
  assert.strictEqual(oledEs.name, 'Negro Puro OLED');

  const oledFallback = Engine.getThemeById('oled_pitch_black', 'unsupported_test_locale');
  assert.strictEqual(oledFallback.name, 'OLED Pitch Black');

  const oledHe = Engine.getThemeById('oled_pitch_black', 'he');
  assert.strictEqual(oledHe.name, 'OLED Pitch Black', 'Hebrew must strictly fallback to English');
  assert(!JSON.stringify(oledHe).includes('עבריت'), 'Must exclude Hebrew');

  const ratio = Engine.calculateContrastRatio('#000000', '#FFFFFF');
  const ratioStr = ratio + ':1';
  const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  easternDigits.forEach(d => {
    assert(!ratioStr.includes(d), `Ratio string must never contain Eastern digit ${d}`);
  });

  console.log('✓ Test 5: Multi-language theme names, strict English fallback & Western digits verified.');
  console.log('--- All Mission #103 Tests PASSED (GREEN) ---');
} catch (err) {
  console.error('✗ Test 5 Failed:', err.message);
  process.exit(1);
}
