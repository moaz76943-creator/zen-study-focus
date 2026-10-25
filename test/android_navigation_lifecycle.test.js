const assert = require('assert');
const {
    handleAndroidBackPress,
    handleImeResize,
    HOME_DESTINATION
} = require('../android/app/src/main/assets/web/js/android_navigation_lifecycle_guard.js');

console.log("--- Running 🎯 Mission #015: Android Lifecycle & Navigation Tests ---");

// Test 1: Layer 1 - Dismiss Modal when back is pressed
let modalClosed = false;
const navState = { currentDestination: "notes" };
const uiStateWithModal = { hasOpenModal: true, activeModalId: "note_editor_modal" };
const callbacks = {
    onCloseModal: (id) => { modalClosed = true; }
};

const resLayer1 = handleAndroidBackPress(navState, uiStateWithModal, callbacks);
assert.strictEqual(resLayer1.action, "MODAL_DISMISSED");
assert.strictEqual(resLayer1.preventedExit, true);
assert.strictEqual(modalClosed, true, "Active modal must be closed on Back press.");
console.log("✔ Test 1: Layer 1 Back press dismisses open modal and prevents app exit.");

// Test 2: Layer 2 - Return to Timer Home when in secondary tab
let navigatedHome = false;
const uiStateNoModal = { hasOpenModal: false };
const navCallbacks = {
    onNavigateToHome: (target) => { navigatedHome = true; }
};

const resLayer2 = handleAndroidBackPress(navState, uiStateNoModal, navCallbacks);
assert.strictEqual(resLayer2.action, "NAVIGATED_TO_HOME_TIMER");
assert.strictEqual(resLayer2.preventedExit, true);
assert.strictEqual(resLayer2.activeDestination, HOME_DESTINATION);
assert.strictEqual(navigatedHome, true);
console.log("✔ Test 2: Layer 2 Back press navigates from secondary tab to Timer Home.");

// Test 3: Layer 3 - Allow System Exit when already on Home Timer
let exitAllowed = false;
const homeNavState = { currentDestination: "timer" };
const exitCallbacks = {
    onAllowExit: () => { exitAllowed = true; }
};

const resLayer3 = handleAndroidBackPress(homeNavState, uiStateNoModal, exitCallbacks);
assert.strictEqual(resLayer3.action, "ALLOW_SYSTEM_EXIT");
assert.strictEqual(resLayer3.preventedExit, false);
assert.strictEqual(exitAllowed, true);
console.log("✔ Test 3: Layer 3 Back press cleanly allows system exit from Home.");

// Test 4: IME Keyboard Resize Protection
const prevHeight = 800;
const collapsedHeight = 450; // Keyboard occupies 350px
const imeReport = handleImeResize(collapsedHeight, prevHeight, { activeFieldId: "note_body" });

assert.strictEqual(imeReport.keyboardVisible, true);
assert.strictEqual(imeReport.preventFullDomRebuild, true);
assert.strictEqual(imeReport.maintainScrollPosition, true);
console.log("✔ Test 4: IME resize handled smoothly without tearing down editor DOM.");

console.log("--- All Mission #015 Android Lifecycle Tests PASSED (GREEN) ---");
