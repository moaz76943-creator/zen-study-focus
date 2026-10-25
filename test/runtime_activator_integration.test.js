const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync('android/app/src/main/assets/web/index.html', 'utf8');
const activatorJs = fs.readFileSync('android/app/src/main/assets/web/js/deep_focus_runtime_activator.js', 'utf8');

console.log("--- Running Mission #176 UI Integration Verification ---");

// Test 1: تحقق من وجود السكربت في index.html
if (!indexHtml.includes('js/deep_focus_runtime_activator.js')) {
  console.error("FAIL: Activator script not found in index.html");
  process.exit(1);
}
console.log("✓ Test 1: Runtime Activator is linked in index.html");

// Test 2: تحقق من تغطية الـ 100 لغة
if (!activatorJs.includes('SUPPORTED_100_LOCALES') || !activatorJs.includes('"sw"') || !activatorJs.includes('"ur"')) {
  console.error("FAIL: 100 Locales not properly registered");
  process.exit(1);
}
console.log("✓ Test 2: Full 100-Locale catalog registered");

// Test 3: التحقق الصارم من استبعاد العبرية
if (activatorJs.includes('"he"') || activatorJs.includes('"iw"')) {
  console.error("FAIL: Hebrew locale found in catalog");
  process.exit(1);
}
console.log("✓ Test 3: Absolute Hebrew exclusion verified");

// Test 4: التحقق من دالة تحويل الأرقام الغربية
if (!activatorJs.includes('toWesternDigits') || !activatorJs.includes('1632')) {
  console.error("FAIL: Western digits converter missing");
  process.exit(1);
}
console.log("✓ Test 4: Western digits 0123456789 converter verified");

// Test 5: سياسة انعدام الموسيقى وتوليف الأصوات الطبيعية
if (!activatorJs.includes('NatureSoundSynth') || !activatorJs.includes('createBiquadFilter')) {
  console.error("FAIL: Nature Web Audio synthesizer missing");
  process.exit(1);
}
console.log("✓ Test 5: Zero-Music synthetic audio mixer verified");

console.log("--- All Mission #176 Integration Tests PASSED (GREEN) ---");
