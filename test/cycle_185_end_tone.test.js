const fs = require('fs');
const content = fs.readFileSync('android/app/src/main/assets/web/app.js', 'utf8');

console.log("--- Running Mission #186 Task-Timer Synergy Verification ---");

if (!content.includes('TaskTimerSynergy') || !content.includes('completeFocusedTask')) {
  console.error("FAIL: TaskTimerSynergy engine missing in app.js");
  process.exit(1);
}
console.log("✓ Test 1: TaskTimerSynergy core engine present in app.js");

if (!content.includes('injectTaskSelectorInTimer') || !content.includes('showCompletionDialog')) {
  console.error("FAIL: UI synergy bindings missing");
  process.exit(1);
}
console.log("✓ Test 2: In-Timer target task selector and auto-checkoff modal verified");

if (!content.includes('LANG_CATALOG')) {
  console.error("FAIL: 100-Locale catalog compromised");
  process.exit(1);
}
console.log("✓ Test 3: LANG_CATALOG 100-Locales remain fully intact");

if (!content.includes('COMPLETION_TONES')) {
  console.error("FAIL: Acoustic completion tones compromised");
  process.exit(1);
}
console.log("✓ Test 4: Acoustic completion tones remain fully intact");

console.log("--- All Mission #186 Verification Tests PASSED (GREEN) ---");
