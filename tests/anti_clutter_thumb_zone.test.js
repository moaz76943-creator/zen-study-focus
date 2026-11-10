const assert = require('assert');
const AntiClutterThumbZone = require('../android/app/src/main/assets/web/modules/ergonomics/anti_clutter_thumb_zone.js');

console.log('🧪 Starting AntiClutterThumbZone (Axis 10: M8583) Unit Tests...');

const studio = new AntiClutterThumbZone();

// Test 1: One-Handed Thumb Zone Mode Toggle
const t1 = studio.dfSupportOneHandedThumbZoneMode(true);
assert.strictEqual(t1.thumbZoneActive, true);
assert.strictEqual(studio.isThumbZoneEnabled, true);
console.log('  ✓ dfSupportOneHandedThumbZoneMode verified.');

// Test 2: Button Density Enforcement
const validDensity = studio.dfEnforceMaxButtonDensityPerView(['btnStart', 'btnPause', 'chip25']);
assert.strictEqual(validDensity.passesAntiClutterRule, true);
assert.strictEqual(validDensity.visibleButtonsCount, 3);

const clutteredDensity = studio.dfEnforceMaxButtonDensityPerView(['b1', 'b2', 'b3', 'b4', 'b5', 'b6']);
assert.strictEqual(clutteredDensity.passesAntiClutterRule, false);
console.log('  ✓ dfEnforceMaxButtonDensityPerView verified.');

// Test 3: Minimalist Studio Switcher Deployment
const pill = studio.dfDeployMinimalistStudioSwitcherSheet();
assert.strictEqual(pill.deployed, true);
assert.ok(pill.cssRules.includes('df-floating-pill'));
console.log('  ✓ dfDeployMinimalistStudioSwitcherSheet verified.');

// Test 4: Zen Flow Auto-Hide
const zenStart = studio.dfTriggerZenFlowFadeOutOnStart();
assert.strictEqual(zenStart.sessionRunning, true);
assert.strictEqual(zenStart.zenModeActive, true);
console.log('  ✓ dfTriggerZenFlowFadeOutOnStart verified.');

// Test 5: Restore Controls on Pause
const restore = studio.dfRestoreControlsOnTimerPauseOrComplete();
assert.strictEqual(restore.sessionRunning, false);
assert.strictEqual(restore.controlsRestored, true);
console.log('  ✓ dfRestoreControlsOnTimerPauseOrComplete verified.');

// Test 6: Visual Clutter Score Calculation
const pristine = studio.dfCalculateVisualClutterScore(12, 3);
assert.strictEqual(pristine.clutterScore, 100);
assert.strictEqual(pristine.assessment, 'Peak Zen Simplicity');

const cluttered = studio.dfCalculateVisualClutterScore(40, 8);
assert.ok(cluttered.clutterScore < 80);
console.log('  ✓ dfCalculateVisualClutterScore verified.');

// Test 7: Thumb Reachability Audit
const reach = studio.dfAuditThumbReachability(800);
assert.strictEqual(reach.screenHeight, 800);
assert.strictEqual(reach.naturalThumbZoneMaxY, 336);
console.log('  ✓ dfAuditThumbReachability verified.');

// Test 8: Milestone Seal M8583
const seal = studio.dfGetMilestoneM8583AntiClutterSeal();
assert.strictEqual(seal.milestone, 'M8583');
assert.strictEqual(seal.status, 'VERIFIED_SOVEREIGN');
console.log('  ✓ dfGetMilestoneM8583AntiClutterSeal verified.');

console.log('🎉 All 8 AntiClutterThumbZone tests passed with 100% assertions!');
