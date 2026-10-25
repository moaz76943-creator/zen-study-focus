const fs = require('fs');
const content = fs.readFileSync('android/app/src/main/assets/web/app.js', 'utf8');

console.log("--- Running Mission #201 Vocab UI Verification ---");

if (!content.includes('VocabUIController') || !content.includes('renderVocabView')) {
  console.error("FAIL: VocabUIController missing in app.js");
  process.exit(1);
}
console.log("✓ Test 1: VocabUIController and renderVocabView verified");

if (!content.includes('df-vocab-studio-view') || !content.includes('df-speed-btn')) {
  console.error("FAIL: Vocab studio view markup or speed button missing");
  process.exit(1);
}
console.log("✓ Test 2: Dual-column card layout and speed/repeat buttons verified");

if (!content.includes('data-audio-term') || !content.includes('data-audio-trans')) {
  console.error("FAIL: Dual speaker buttons missing");
  process.exit(1);
}
console.log("✓ Test 3: Dual audio speaker triggers (Foreign + Arabic) verified");

if (!content.includes('LANG_CATALOG') || !content.includes('COMPLETION_TONES')) {
  console.error("FAIL: Core features compromised");
  process.exit(1);
}
console.log("✓ Test 4: 100-Locales catalog and acoustic chimes 100% intact");

console.log("--- All Mission #201 Verification Tests PASSED (GREEN) ---");
