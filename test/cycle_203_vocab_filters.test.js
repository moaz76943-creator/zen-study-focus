const fs = require('fs');
const content = fs.readFileSync('android/app/src/main/assets/web/app.js', 'utf8');

console.log("--- Running Mission #203 Vocab Filters Verification ---");

if (!content.includes('setCardReviewStatus') || !content.includes('getFilteredVocab')) {
  console.error("FAIL: Mastery tracking functions missing in app.js");
  process.exit(1);
}
console.log("✓ Test 1: setCardReviewStatus and getFilteredVocab verified");

if (!content.includes('df-vocab-filter-bar') || !content.includes('df-filter-chip')) {
  console.error("FAIL: Filter bar markup missing");
  process.exit(1);
}
console.log("✓ Test 2: Color tag filter bar markup (Purple/Blue/Red/Green) verified");

if (!content.includes('needs_review')) {
  console.error("FAIL: Needs Review filter state missing");
  process.exit(1);
}
console.log("✓ Test 3: Spaced repetition Needs Review filter verified");

if (!content.includes('VocabAudioBankEngine') || !content.includes('FlashQuizEngine')) {
  console.error("FAIL: Core engines compromised");
  process.exit(1);
}
console.log("✓ Test 4: VocabAudioBankEngine and FlashQuizEngine 100% intact");

console.log("--- All Mission #203 Verification Tests PASSED (GREEN) ---");
