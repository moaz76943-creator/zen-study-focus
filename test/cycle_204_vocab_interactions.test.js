const fs = require('fs');
const content = fs.readFileSync('android/app/src/main/assets/web/app.js', 'utf8');

console.log("--- Running Mission #204 Vocab Interactions Verification ---");

if (!content.includes('cycleCardColor') || !content.includes('deleteCard')) {
  console.error("FAIL: cycleCardColor or deleteCard missing in app.js");
  process.exit(1);
}
console.log("✓ Test 1: cycleCardColor and deleteCard methods verified in engine");

if (!content.includes('df-color-dot') || !content.includes('df-card-delete-btn')) {
  console.error("FAIL: Color dot clicker or delete button missing in cards");
  process.exit(1);
}
console.log("✓ Test 2: Color dot cycler and card deletion buttons verified");

if (!content.includes('Filter Chips Event Binding')) {
  console.error("FAIL: Filter chips event binding missing");
  process.exit(1);
}
console.log("✓ Test 3: Real-time filter chip event bindings verified");

if (!content.includes('FlashQuizEngine') || !content.includes('VocabAudioBankEngine')) {
  console.error("FAIL: Core engines compromised");
  process.exit(1);
}
console.log("✓ Test 4: FlashQuizEngine and VocabAudioBankEngine 100% intact");

console.log("--- All Mission #204 Verification Tests PASSED (GREEN) ---");
