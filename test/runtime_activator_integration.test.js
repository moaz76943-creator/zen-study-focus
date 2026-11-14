const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync('android/app/src/main/assets/web/index.html', 'utf8');
const activatorJs = fs.readFileSync('android/app/src/main/assets/web/js/deep_focus_runtime_activator.js', 'utf8');

console.log("--- Running Mission #176 UI Integration Verification ---");

// Test 1: تحقق من وجود السكربت في index.html
if (!indexHtml.includes('js/deep_focus_runtime_activator.js')) {
  console.error("FAIL: Activator script not found in index.html");
  process.exit(1);
}
console.log("✓ Test 1: Runtime Activator is linked in index.html");

// Test 2: the 100-language catalog is owned by i18n/languages.json (the activator no longer holds locale lists)
const languages = JSON.parse(fs.readFileSync('i18n/languages.json', 'utf8'));
const langList = languages.languages || languages;
const codes = langList.map(l => l.code);
if (codes.length !== 100 || new Set(codes).size !== 100 || !codes.includes('sw') || !codes.includes('ur')) {
  console.error("FAIL: 100-language registry is not exactly 100 unique codes incl. sw and ur");
  process.exit(1);
}
console.log("✓ Test 2: Full 100-Locale registry present (i18n/languages.json)");

// Test 3: Hebrew exclusion in the registry and the activator
if (codes.some(c => /^(he|iw)(-|$)/i.test(c)) || activatorJs.includes('"he"') || activatorJs.includes('"iw"')) {
  console.error("FAIL: Hebrew locale found");
  process.exit(1);
}
console.log("✓ Test 3: Absolute Hebrew exclusion verified");

// Test 4: the digit guard converts Arabic-Indic and Persian digits (executed, not just text-matched)
const vm = require('vm');
const dateEl = { textContent: '٢٠٢٦-۱۰-٢٥' };
const sandbox = {
  window: {}, setTimeout: (f) => f(),
  document: {
    addEventListener() {},
    querySelectorAll: (sel) => (sel === '.date-display' ? [dateEl] : [])
  }
};
sandbox.window.requestAnimationFrame = (f) => f();
// Capture the listeners the guard registers, then fire DOMContentLoaded as the browser would.
let hooks = {};
sandbox.document.addEventListener = (n, f) => { hooks[n] = f; };
vm.runInNewContext(activatorJs, sandbox);
hooks.DOMContentLoaded && hooks.DOMContentLoaded();
if (dateEl.textContent !== '2026-10-25') {
  console.error("FAIL: Western digits converter did not normalise date display: " + dateEl.textContent);
  process.exit(1);
}
console.log("✓ Test 4: Western digits 0123456789 converter verified (executed)");

// Test 5: policy — no synthesized audio in the activator (natural CC0 .ogg only)
if (/NatureSoundSynth|createBiquadFilter|createOscillator|AudioContext/.test(activatorJs)) {
  console.error("FAIL: activator must not synthesize audio");
  process.exit(1);
}
console.log("✓ Test 5: No synthesized audio in the activator (CC0 recordings only)");

console.log("--- All Mission #176 Integration Tests PASSED (GREEN) ---");
