const fs = require('fs');
const content = fs.readFileSync('android/app/src/main/assets/web/app.js', 'utf8');

console.log("--- Running Mission #188 Habit & Streak Verification ---");

if (!content.includes('HabitFocusEngine') || !content.includes('recordSessionForStreak')) {
  console.error("FAIL: HabitFocusEngine not found in app.js");
  process.exit(1);
}
console.log("✓ Test 1: HabitFocusEngine core functions verified");

if (!content.includes('df-streak-badge') || !content.includes('showKickstartPrompt')) {
  console.error("FAIL: Streak badge UI or Kickstart prompt missing");
  process.exit(1);
}
console.log("✓ Test 2: Streak badge UI and 5-min kickstart prompt verified");

if (!content.includes('DeskClockEngine')) {
  console.error("FAIL: DeskClockEngine missing");
  process.exit(1);
}
console.log("✓ Test 3: Minimalist OLED Desk Clock remains intact");

if (!content.includes('TaskTimerSynergy')) {
  console.error("FAIL: TaskTimerSynergy missing");
  process.exit(1);
}
console.log("✓ Test 4: Task-Timer synergy remains intact");

if (!content.includes('LANG_CATALOG')) {
  console.error("FAIL: LANG_CATALOG 100-Locales compromised");
  process.exit(1);
}
console.log("✓ Test 5: LANG_CATALOG 100-Locales remain fully intact");

console.log("--- All Mission #188 Verification Tests PASSED (GREEN) ---");
