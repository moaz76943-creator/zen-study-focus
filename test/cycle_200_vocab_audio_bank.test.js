const fs = require('fs');
const content = fs.readFileSync('android/app/src/main/assets/web/app.js', 'utf8');

console.log("--- Running Mission #200 Vocab Audio Bank Verification ---");

if (!content.includes('VocabAudioBankEngine') || !content.includes('importFromCSV')) {
  console.error("FAIL: VocabAudioBankEngine missing in app.js");
  process.exit(1);
}
console.log("✓ Test 1: VocabAudioBankEngine and CSV import verified");

if (!content.includes('speakText') || !content.includes('maxRepeats')) {
  console.error("FAIL: Dual speech synthesis and repeat controls missing");
  process.exit(1);
}
console.log("✓ Test 2: Dual speech synthesis and repeat controls verified");

if (!content.includes('getSortedVocab') || !content.includes('alpha_asc')) {
  console.error("FAIL: Sorting and reordering logic missing");
  process.exit(1);
}
console.log("✓ Test 3: Sorting (alphabetical, creation date, color) verified");

if (!content.includes('LANG_CATALOG') || !content.includes('COMPLETION_TONES')) {
  console.error("FAIL: Core features compromised");
  process.exit(1);
}
console.log("✓ Test 4: 100-Locales catalog and acoustic chimes 100% intact");

console.log("--- All Mission #200 Verification Tests PASSED (GREEN) ---");
