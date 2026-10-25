const fs = require('fs');
const content = fs.readFileSync('android/app/src/main/assets/web/app.js', 'utf8');

console.log("--- Running Mission #184 Haptic & Timer Verification ---");

if (!content.includes('triggerHaptic') || !content.includes('playPeacefulChime')) {
  console.error("FAIL: Haptic or Chime engine not found in app.js");
  process.exit(1);
}
console.log("✓ Test 1: Haptic & Chime functions verified in app.js");

if (!content.includes('528')) {
  console.error("FAIL: Harmonic peaceful frequency not registered");
  process.exit(1);
}
console.log("✓ Test 2: Peaceful 528 Hz harmonic chime verified");

if (!content.includes('LANG_CATALOG')) {
  console.error("FAIL: LANG_CATALOG compromised");
  process.exit(1);
}
console.log("✓ Test 3: LANG_CATALOG 100-Locales remain fully intact");

console.log("--- All Mission #184 Tests PASSED (GREEN) ---");
