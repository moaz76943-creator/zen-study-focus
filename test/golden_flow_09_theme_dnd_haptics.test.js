const assert = require('assert');
const ThemeEngine = require('../android/app/src/main/assets/web/js/visual_theme_contrast_engine.js');
const DndCoordinator = require('../android/app/src/main/assets/web/js/focus_dnd_coordinator.js');
const Haptics = require('../android/app/src/main/assets/web/js/gentle_haptic_coordinator.js');

console.log("--- Running 🎯 Golden Flow 09: Theme Switch -> Focus Shield -> Haptics ---");

// Step 1: Apply OLED Dark theme for evening study
const themeTokens = ThemeEngine.getThemeTokens("oled_dark");
assert.strictEqual(themeTokens.isDark, true);
assert.strictEqual(themeTokens.bg, "#000000");

const cssVars = ThemeEngine.generateCssVariables("oled_dark");
assert.ok(cssVars.includes("--zen-bg: #000000;"));

// Step 2: Session starts -> Activate Focus Shield
let shieldState = DndCoordinator.transitionShieldState(DndCoordinator.SHIELD_STATES.IDLE, 'START');
assert.strictEqual(shieldState, DndCoordinator.SHIELD_STATES.SHIELDED_ACTIVE);

// Step 3: In-session alerts suppressed except break reminders
const alertEval = DndCoordinator.evaluateAlertPermission("popup_notification", { isSessionActive: true });
assert.strictEqual(alertEval.allowed, false);
assert.strictEqual(alertEval.reason, "FOCUS_SHIELD_ACTIVE");

// Step 4: Trigger tactile soft tap on timer button
let hapticExecuted = false;
const mockNav = {
  vibrate: function () {
    hapticExecuted = true;
    return true;
  }
};
const hapticRes = Haptics.triggerHaptic("soft_tap", { navigatorObj: mockNav, intensity: 0.8 });
assert.strictEqual(hapticRes.executed, true);
assert.strictEqual(hapticExecuted, true);

// Step 5: Session completes -> Shield restores
shieldState = DndCoordinator.transitionShieldState(shieldState, 'COMPLETE');
assert.strictEqual(shieldState, DndCoordinator.SHIELD_STATES.RESTORED);

console.log("✓ Golden Flow 09: Sensory Harmony & Touch Flow PASSED (GREEN)");
