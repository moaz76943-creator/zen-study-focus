// Android 15 (Edge-to-Edge) insets + floating-layer dock contract.
// Regression gate for the Xiaomi Android 15 / 3-button nav bar class of bugs:
//  - content must never render under the status bar / display cutout / nav bar;
//  - the native parent FrameLayout padding is the SINGLE owner of the insets;
//  - CSS env(safe-area-inset-*) / --df-* variables must never re-add bars;
//  - floating layers (capsule, FAB, Studios pill, scratch trigger) dock above
//    the capsule via the calibrator variables, never a hardcoded bottom offset;
//  - no floating dock layer may outrank the modal overlay z-index class.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const java = fs.readFileSync(
  path.join(root, 'android/app/src/main/java/com/zenstudy/focus/MainActivity.java'), 'utf8');
const html = fs.readFileSync(
  path.join(root, 'android/app/src/main/assets/web/index.html'), 'utf8');
const calibrator = fs.readFileSync(
  path.join(root, 'android/app/src/main/assets/web/modules/sovereign_insets_calibrator.js'), 'utf8');
const touchRestorer = fs.readFileSync(
  path.join(root, 'android/app/src/main/assets/web/touch_restorer.css'), 'utf8');
const appJs = fs.readFileSync(
  path.join(root, 'android/app/src/main/assets/web/app.js'), 'utf8');

// ---- Native (MainActivity.java) ----
assert.ok(java.includes('WindowCompat.setDecorFitsSystemWindows(getWindow(), false)'),
  'edge-to-edge: decor must not fit system windows');
assert.ok(java.includes('Type.statusBars()'),
  'statusBars() insets must be consumed');
assert.ok(java.includes('Type.displayCutout()'),
  'display cutout insets must be consumed');
assert.ok(java.includes('Type.navigationBars()'),
  'navigationBars() insets must be consumed (3-button nav bar)');
assert.ok(java.includes('Type.mandatorySystemGestures()'),
  'mandatorySystemGestures() insets must be consumed (gesture handle on Xiaomi)');
assert.ok(java.includes('Type.ime()'),
  'IME insets must be consumed (keyboard)');
// The insets listener must return CONSUMED to prevent insets from propagating
// to the WebView (which would cause safe-area-inset-* double padding and
// content overlap on Xiaomi Android 15). The parent FrameLayout padding is
// the single owner of insets.
assert.ok(java.includes('WindowInsetsCompat.CONSUMED'),
  'insets listener must return CONSUMED to prevent WebView from receiving insets');
assert.ok(!/setInsets\(WindowInsetsCompat\.Type\.systemBars\(\)/.test(java),
  'systemBars() combined mask must NOT be zeroed in Builder (causes double-counting on Xiaomi)');
// Padding goes to the parent inset FrameLayout, never to the WebView itself
// (WebView does not lay web content out inside its own padding).
assert.ok(java.includes('ViewCompat.setOnApplyWindowInsetsListener(insetFrame'),
  'insets listener must be installed on the parent insetFrame');
assert.ok(/v\.setPadding\(/.test(java), 'insetFrame must receive setPadding()');
assert.ok(!/webView\.setPadding\(/.test(java),
  'padding must NOT be applied to the WebView (clips content without moving fixed layers)');
assert.ok(java.includes('Math.max(navBottom, ime.bottom)'),
  'padding bottom must cover max(nav bar, IME)');
assert.ok(java.includes('isGestureNav ? 32 : 100'),
  'minimum nav-bar fallback (32dp gesture, 100dp 3-button for Xiaomi HyperOS) must be present');
// Xiaomi 3-button absolute floor increased to 500dp for Android 15 HyperOS
assert.ok(java.includes('absoluteMinNavDp = 500'),
  'Xiaomi 3-button absolute floor must be 500dp');
assert.ok(java.includes('minStatusBarDp = 100'),
  'status bar minimum floor must be 100dp for large fonts/notches/dynamic island');
console.log('✔ MainActivity consumes status bar, cutout, 3-button nav bar, gesture handle and IME; parent padding owns the inset; CONSUMED returned to prevent WebView double-padding.');

// ---- CSS calibrator (single owner = native padding; variables pinned to 0) ----
for (const v of ['--df-safe-top', '--df-safe-bottom', '--df-safe-left', '--df-safe-right', '--df-webview-padding-bottom']) {
  assert.ok(
    calibrator.includes(`setProperty('${v}', '0px'`) || calibrator.includes(`setProperty("${v}", "0px"`),
    v + ' must be pinned to 0px by the calibrator (native padding is the single owner)');
}
assert.ok(calibrator.includes("--df-bottom-nav-clearance"),
  'calibrator must publish the bottom-nav clearance reserve');
// Calibrator must enforce 350px minimum clearance (HTML fallback) and updated Xiaomi floor detection
assert.ok(calibrator.includes('minSafeClearance = 350') || calibrator.includes('Math.max(floatingLayerClearance, imeClearance, 350)'),
  'calibrator must enforce 350px minimum clearance floor');
assert.ok(calibrator.includes('paddingBottom <= 520'),
  'calibrator Xiaomi floor detection range must cover up to 520dp');
console.log('✔ Calibrator pins safe-area variables to 0px and publishes the dock clearance reserve.');

// ---- index.html dock formulas ----
// .app-shell must never declare a containing-block creator — not the top-level rule, not the
// pillar7 !important rule, not the tall-aspect media query. Scan every occurrence.
{
  const shellBlocks = [];
  let idx = 0;
  while ((idx = html.indexOf('.app-shell', idx)) !== -1) {
    const close = html.indexOf('}', idx);
    shellBlocks.push(html.slice(idx, close));
    idx = close;
  }
  for (const block of shellBlocks) {
    // Only inspect actual rule bodies (selector-ish start, excludes prose/comments mentioning the class poorly).
    if (!/^\s*\.app-shell\s*[,{]/.test(block)) continue;
    for (const bad of ['transform:', 'filter:', 'backdrop-filter:', 'perspective:', 'will-change:']) {
      assert.ok(!block.includes(bad), '.app-shell rule must not declare ' + bad + ' — got: ' + block.slice(0, 120));
    }
  }
}
// Body must reserve clearance above the native inset edge using --df-inflow-bottom
// (which resolves to --df-bottom-nav-clearance since --df-webview-padding-bottom is 0px).
// The pillar7 rule (later, !important) and the weak rule up top must both stay on the same formula.
const bodyReserve = /padding-bottom:\s*var\(--df-inflow-bottom,\s*350px\)/g;
assert.ok((html.match(bodyReserve) || []).length >= 2,
  'body must reserve --df-inflow-bottom above the native inset edge (all body rules)');
console.log('✔ index.html body reserves clearance via calibrated variables.');

// Studios pill fallback updated to 294px (clearance 350 - 56).
// FAB fallback updated to 356px (studiosPillBottom 294 + FABHeight 54 + gap 8).
// Scratchpad trigger fallback at 325px (midway between Studios pill 294px and FAB 356px).
// These remain correct because the calibrator computes positions relative to the
// bottom-nav clearance (body padding reserve), so floating layers dock at the
// clearance boundary and content never overlaps. The clearance (350px minimum)
// is for in-flow body padding only.
assert.ok(html.includes('--df-studios-pill-bottom: 294px'),
  'Studios pill fallback must be 294px (clearance - 56)');
assert.ok(html.includes('--df-scratchpad-bottom: 325px'),
  'Scratchpad trigger fallback must be 325px (midway between Studios pill and FAB)');
assert.ok(html.includes('--df-fab-bottom: 356px'),
  'FAB fallback must be 356px (studiosPillBottom + FABHeight + gap)');

// ---- touch_restorer.css: no fixed bar parked at bottom: 0 ----
const barBlock = touchRestorer.slice(touchRestorer.indexOf('.bottom-nav-bar {'));
assert.ok(barBlock.includes('bottom: var(--df-dock-bottom, 12px)'),
  '.bottom-nav-bar must dock above the 3-button nav bar via calibrator variables');
assert.ok(!/bottom:\s*0;/.test(barBlock), '.bottom-nav-bar must not use bottom: 0');
console.log('✔ touch_restorer.css .bottom-nav-bar docks above the nav bar.');

// ---- app.js dynamic layers: scratchpad trigger must dock via calibrator variables, below modals ----
const scratch = appJs.slice(appJs.indexOf("'df-float-scratch-btn'"), appJs.indexOf('const self = this;', appJs.indexOf("'df-float-scratch-btn'")));
assert.ok(scratch.includes("'fixed'"), 'scratchpad trigger must be position:fixed');
assert.ok(scratch.includes('var(--df-scratchpad-bottom'),
  'scratchpad trigger must dock via calibrated inset variables, never bottom: 24px');
assert.ok(!/bottom\s*=\s*'24px'/.test(scratch), 'scratchpad trigger must not hardcode bottom: 24px');
assert.ok(scratch.includes("zIndex = '150'"),
  'scratchpad trigger must sit at the 150 dock layer (below modal overlays, at/below the Studios pill)');
assert.ok(!scratch.includes("zIndex = '999'"),
  'scratchpad trigger must not outrank modals/drawer overlays');
console.log('✔ app.js floating scratchpad trigger docks above the capsule and below modals.');

console.log('--- Android 15 Insets & Dock Guard PASSED ---');