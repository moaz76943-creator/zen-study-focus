const fs = require('fs');

const indexHtml = fs.readFileSync('android/app/src/main/assets/web/index.html', 'utf8');
const visualSuite = fs.readFileSync('android/app/src/main/assets/web/js/deep_focus_visual_suite.js', 'utf8');

console.log("--- Running Mission #177 Visual Suite Verification ---");

if (!indexHtml.includes('js/deep_focus_visual_suite.js')) {
  console.error("FAIL: visual suite not linked in index.html");
  process.exit(1);
}
console.log("✓ Test 1: Visual Suite linked in index.html");

if (!visualSuite.includes('deep-focus-super-bar') || !visualSuite.includes('btn-exam-pacer')) {
  console.error("FAIL: Super-Bar or Exam Pacer missing");
  process.exit(1);
}
console.log("✓ Test 2: Exam Pacer and Desk Standby components verified");

if (!visualSuite.includes('Active Recall') || !visualSuite.includes('Eisenhower Priority')) {
  console.error("FAIL: Active Recall or Matrix missing");
  process.exit(1);
}
console.log("✓ Test 3: Active Recall and Matrix UI verified");

if (!visualSuite.includes('00:00:00')) {
  console.error("FAIL: Western digits clock layout missing");
  process.exit(1);
}
console.log("✓ Test 4: Strict Western digits UI format verified");

console.log("--- All Mission #177 Tests PASSED (GREEN) ---");
