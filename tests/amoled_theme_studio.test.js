const assert = require('assert');
const AmoledThemeStudio = require('../android/app/src/main/assets/web/modules/theme/amoled_theme_studio.js');

console.log('🧪 Starting AmoledThemeStudio (Axis 9: M8538-M8547) Unit Tests...');

const studio = new AmoledThemeStudio();

// Test 1: Emerald Obsidian Theme
const t1 = studio.dfApplyEmeraldObsidianTheme();
assert.strictEqual(t1.success, true);
assert.strictEqual(studio.currentTheme.bg, '#000000');
assert.strictEqual(studio.currentTheme.accent, '#10b981');
console.log('  ✓ dfApplyEmeraldObsidianTheme verified.');

// Test 2: Amber Night Scholar Theme
const t2 = studio.dfApplyAmberNightScholarTheme();
assert.strictEqual(t2.success, true);
assert.strictEqual(studio.currentTheme.zeroBlueLight, true);
assert.strictEqual(studio.currentTheme.accent, '#f59e0b');
console.log('  ✓ dfApplyAmberNightScholarTheme verified.');

// Test 3: Sapphire Deep Space Theme
const t3 = studio.dfApplySapphireDeepSpaceTheme();
assert.strictEqual(t3.success, true);
assert.strictEqual(studio.currentTheme.accent, '#38bdf8');
console.log('  ✓ dfApplySapphireDeepSpaceTheme verified.');

// Test 4: Pure Monochrome Paper Theme
const t4 = studio.dfApplyPureMonochromePaperTheme();
assert.strictEqual(t4.success, true);
assert.strictEqual(studio.currentTheme.text, '#ffffff');
console.log('  ✓ dfApplyPureMonochromePaperTheme verified.');

// Test 5: Verify Zero Lit Pixels (AMOLED Efficiency Audit)
const audit = studio.dfVerifyZeroLitBackgroundPixels();
assert.strictEqual(audit.isTrueBlackBackground, true);
assert.ok(audit.unlitPixelPercent >= 85.0);
assert.strictEqual(audit.passesAmoledAudit, true);
console.log('  ✓ dfVerifyZeroLitBackgroundPixels verified.');

// Test 6: Auto Switch by Time of Day
const nightSwitch = studio.dfAutoSwitchThemeByTimeOfDay(22); // 10 PM
assert.strictEqual(nightSwitch.circadianMode, 'NightWarmth');
assert.strictEqual(studio.currentTheme.id, 'amber_night');

const daySwitch = studio.dfAutoSwitchThemeByTimeOfDay(10); // 10 AM
assert.strictEqual(daySwitch.circadianMode, 'DayVigor');
assert.strictEqual(studio.currentTheme.id, 'emerald_obsidian');
console.log('  ✓ dfAutoSwitchThemeByTimeOfDay verified.');

// Test 7: Accent Color Luminance Slider
const lum = studio.dfCustomizeAccentColorLuminance(40);
assert.strictEqual(lum.luminancePercent, 40);
assert.strictEqual(studio.accentLuminancePercent, 40);
console.log('  ✓ dfCustomizeAccentColorLuminance verified.');

// Test 8: Minimalist Zen Typography
const zen = studio.dfApplyMinimalistZenTypography(true);
assert.strictEqual(zen.zenTypographyActive, true);
assert.strictEqual(zen.lineHeightRatio, 1.68);
console.log('  ✓ dfApplyMinimalistZenTypography verified.');

// Test 9: Config Persistence
const persist = studio.dfPersistSelectedThemeConfig();
assert.strictEqual(persist.persisted, true);
console.log('  ✓ dfPersistSelectedThemeConfig verified.');

// Test 10: Milestone Seal M8547
const seal = studio.dfGetMilestoneM8547ThemeStudioSeal();
assert.strictEqual(seal.milestone, 'M8547');
assert.strictEqual(seal.status, 'VERIFIED_SOVEREIGN');
console.log('  ✓ dfGetMilestoneM8547ThemeStudioSeal verified.');

console.log('🎉 All 10 AmoledThemeStudio tests passed with 100% assertions!');
