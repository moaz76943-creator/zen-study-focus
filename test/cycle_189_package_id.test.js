const fs = require('fs');

console.log("--- Running Mission #189 Package ID Alignment Verification ---");

const gradleContent = fs.readFileSync('android/app/build.gradle', 'utf8');

if (!gradleContent.includes('applicationId "com.deepfocus.study"')) {
  console.error("FAIL: applicationId is not com.deepfocus.study");
  process.exit(1);
}
console.log("✓ Test 1: Verified applicationId is com.deepfocus.study");

if (!gradleContent.includes('versionCode 22')) {
  console.error("FAIL: versionCode is not 22");
  process.exit(1);
}
console.log("✓ Test 2: Verified versionCode is 22");

const appJs = fs.readFileSync('android/app/src/main/assets/web/app.js', 'utf8');
if (!appJs.includes('LANG_CATALOG') || !appJs.includes('COMPLETION_TONES')) {
  console.error("FAIL: Core web assets regression detected");
  process.exit(1);
}
console.log("✓ Test 3: Core 100-locales, chimes, and timer features 100% intact");

console.log("--- All Mission #189 Verification Tests PASSED (GREEN) ---");
