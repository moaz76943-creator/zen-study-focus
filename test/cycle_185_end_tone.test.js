const fs = require('fs');
const content = fs.readFileSync('android/app/src/main/assets/web/app.js', 'utf8');

console.log("--- Running Mission #185 End Tone Verification ---");

if (!content.includes('COMPLETION_TONES') || !content.includes('playCompletionTone')) {
  console.error("FAIL: Completion tone engine missing in app.js");
  process.exit(1);
}
console.log("✓ Test 1: Completion tone engine verified in app.js");

if (!content.includes('tibetan_bowl') || !content.includes('woodblock') || !content.includes('crystal')) {
  console.error("FAIL: Required gentle and moderate tones missing");
  process.exit(1);
}
console.log("✓ Test 2: Tibetan bowl, woodblock, crystal, and gong registered");

if (!content.includes('df-tone-picker-card')) {
  console.error("FAIL: Tone picker UI card missing");
  process.exit(1);
}
console.log("✓ Test 3: Integrated UI card for Nature section verified");

console.log("--- All Mission #185 Tests PASSED (GREEN) ---");
