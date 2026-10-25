const fs = require('fs');

const indexHtml = fs.readFileSync('android/app/src/main/assets/web/index.html', 'utf8');

console.log("--- Running Mission #178 Sanitization Verification ---");

// Test 1: تأكد من إزالة السكربت المشوه تماماً
if (indexHtml.includes('deep_focus_visual_suite.js')) {
  console.error("FAIL: visual suite tag still exists in index.html");
  process.exit(1);
}
console.log("✓ Test 1: Corrupted visual suite completely purged");

// Test 2: تأكد من وجود كود الـ CSS القسري للأرقام الغربية
if (!indexHtml.includes('western-digits-enforcement-style') || !indexHtml.includes('lining-nums')) {
  console.error("FAIL: Western digits CSS style missing");
  process.exit(1);
}
console.log("✓ Test 2: Native Western digits CSS rule active");

// Test 3: التحقق من عدم وجود ملف السكربت على القرص
if (fs.existsSync('android/app/src/main/assets/web/js/deep_focus_visual_suite.js')) {
  console.error("FAIL: visual suite file still present on disk");
  process.exit(1);
}
console.log("✓ Test 3: Residual JS file deleted");

console.log("--- All Mission #178 Tests PASSED (GREEN) ---");
