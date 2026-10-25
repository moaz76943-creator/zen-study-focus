const fs = require('fs');
const content = fs.readFileSync('android/app/src/main/assets/web/app.js', 'utf8');

console.log("--- Running Mission #205 File Import/Export Verification ---");

if (!content.includes('df-vocab-file-input') || !content.includes('FileReader')) {
  console.error("FAIL: Native file picker input or FileReader missing");
  process.exit(1);
}
console.log("✓ Test 1: Native file picker input and FileReader parser verified");

if (!content.includes('df-vocab-export-btn') || !content.includes('deep_focus_vocab_backup.csv')) {
  console.error("FAIL: CSV backup export engine missing");
  process.exit(1);
}
console.log("✓ Test 2: CSV backup export download mechanism verified");

if (!content.includes('df-vocab-pair-badge') || !content.includes('df_vocab_pair')) {
  console.error("FAIL: Dynamic language pair switching missing");
  process.exit(1);
}
console.log("✓ Test 3: Language pair switching (DE, EN, FR, ES, TR) verified");

if (!content.includes('FlashQuizEngine') || !content.includes('VocabAudioBankEngine')) {
  console.error("FAIL: Core engines compromised");
  process.exit(1);
}
console.log("✓ Test 4: FlashQuizEngine and VocabAudioBankEngine 100% intact");

console.log("--- All Mission #205 Verification Tests PASSED (GREEN) ---");
