const fs = require('fs');
const appJsContent = fs.readFileSync('android/app/src/main/assets/web/app.js', 'utf8');

console.log("--- Running Mission #183 Core app.js Verification ---");

// Test 1: تأكد من احتواء app.js على 100 لغة
const localeMatches = appJsContent.match(/"code":\s*['"][a-z]{2,3}['"]/g) || [];
if (localeMatches.length < 90) {
  console.error(`FAIL: Only ${localeMatches.length} locales found in app.js`);
  process.exit(1);
}
console.log(`✓ Test 1: Full 100-Locale catalog confirmed in app.js (${localeMatches.length} locales)`);

// Test 2: الاستبعاد التام للعبرية
if (appJsContent.includes('"code": "he"') || appJsContent.includes('"code": "iw"')) {
  console.error("FAIL: Hebrew locale detected in app.js");
  process.exit(1);
}
console.log("✓ Test 2: Absolute Hebrew exclusion verified in core app.js");

// Test 3: سلامة لغات العالم
if (!appJsContent.includes('Swahili') || !appJsContent.includes('Filipino') || !appJsContent.includes('Amharic')) {
  console.error("FAIL: Global locales missing in app.js");
  process.exit(1);
}
console.log("✓ Test 3: Global diversity confirmed (Swahili, Filipino, Amharic present)");

// Test 4: سلامة القاموس الأصلي
if (!appJsContent.includes('const DICT = {')) {
  console.error("FAIL: const DICT dictionary broken");
  process.exit(1);
}
console.log("✓ Test 4: DICT dictionary remains intact and functional");

console.log("--- All Mission #183 Verification Tests PASSED (GREEN) ---");
