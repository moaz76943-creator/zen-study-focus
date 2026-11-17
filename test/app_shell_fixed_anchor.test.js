// Regression gate: position:fixed docked layers (bottom nav capsule, Studios pill,
// FAB) must stay anchored to the VIEWPORT so they never drift to page bottom or
// cover the last card. A transform/filter/perspective/backdrop-filter (or
// will-change: transform) on an ancestor such as .app-shell would make it the
// containing block for fixed descendants (CSS Transforms spec), re-anchoring
// them to the page and re-creating the Xiaomi Android 15 overlap defects.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../android/app/src/main/assets/web/index.html');
assert.ok(fs.existsSync(htmlPath), 'index.html must exist');
const html = fs.readFileSync(htmlPath, 'utf8');

function ruleBlock(selector) {
  const i = html.indexOf(selector);
  assert.ok(i >= 0, selector + ' must exist');
  const open = html.indexOf('{', i);
  const close = html.indexOf('}', open);
  return html.slice(open, close);
}

const shell = ruleBlock('.app-shell {');
for (const bad of ['transform:', 'filter:', 'backdrop-filter:', 'perspective:', 'will-change: transform']) {
  assert.ok(!shell.includes(bad), '.app-shell must not declare ' + bad + ' (it would trap fixed children at page bottom)');
}
console.log('✔ .app-shell is free of containing-block creators (transform/filter/perspective).');

// The dock formulas must reference the calibrator-pinned variables, never raw hardcoded
// safe-area values that would double-count the native parent padding.
assert.ok(html.includes('bottom: calc(var(--df-webview-padding-bottom, 56px) + var(--df-dock-gap, 12px))'),
  'bottom-nav-capsule must dock via --df-webview-padding-bottom + --df-dock-gap');
assert.ok(html.includes('var(--df-capsule-height, 70px) + 8px'),
  'Studios pill must dock above the capsule via --df-capsule-height');
console.log('✔ Dock formulas use the calibrated single-owner inset variables.');

// Body must reserve enough bottom clearance for the capsule (gap + ~70px capsule + card gap).
assert.ok(/padding-bottom:\s*calc\(var\(--df-webview-padding-bottom, 56px\) \+ var\(--df-bottom-nav-clearance, 86px\)\)/.test(html),
  'body must reserve --df-bottom-nav-clearance above the native inset edge');
console.log('✔ Body bottom clearance reserves capsule + FAB zone above the safe content edge.');

console.log('--- App Shell Fixed-Anchor Guard PASSED ---');
