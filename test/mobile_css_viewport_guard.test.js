const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log("--- Running Mission 003: Mobile CSS Viewport Guard Test ---");

const cssPath = path.join(__dirname, '../android/app/src/main/assets/web/css/mobile_responsive_guard.css');
assert.ok(fs.existsSync(cssPath), "Responsive CSS file must exist.");
const cssContent = fs.readFileSync(cssPath, 'utf8');

// Test 1: Fluid Typography Clamp Presence
assert.ok(
    cssContent.includes("clamp(2.4rem, 11vw, 4.8rem)"),
    "Timer display must use clamp() fluid typography to prevent overflow on 320px."
);
console.log("✔ Test 1: Fluid clamp() typography verified for timer digits.");

// Test 2: Multi-row wrap for duration presets
assert.ok(
    cssContent.includes("flex-wrap: wrap") && cssContent.includes("min-height: 44px"),
    "Duration presets must support wrapping and 44px accessible touch targets."
);
console.log("✔ Test 2: Accessible wrapping touch targets verified for duration buttons.");

// Test 3: Safe Area Inset Support (calibrator variables, not env())
// Native parent padding owns system-bar insets; calibrator pins --df-safe-* to 0px.
// Do NOT use env(safe-area-inset-*) — it re-adds bars and causes double-counting on Xiaomi Android 15.
assert.ok(
    cssContent.includes("var(--df-safe-bottom") || cssContent.includes("var(--df-inflow-bottom"),
    "Bottom navigation must use calibrator variables for safe area clearance (not env())."
);
console.log("✔ Test 3: Android safe-area clearance via calibrator variables verified.");

// Test 4: Small screen max-width 360px breakpoint
assert.ok(
    cssContent.includes("@media screen and (max-width: 360px)"),
    "Must include dedicated small-screen media query."
);
console.log("✔ Test 4: 360px breakpoint protection verified.");

console.log("--- All Mission 003 CSS Tests PASSED (GREEN) ---");
