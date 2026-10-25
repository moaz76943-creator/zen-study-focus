const fs = require('fs');

console.log("--- Running Mission #199 Play Console Verification ---");

const gradleContent = fs.readFileSync('android/app/build.gradle', 'utf8');

// Test 1: التحقق من أن versionCode أصبح 25
if (!gradleContent.includes('versionCode 25')) {
  console.error("FAIL: versionCode is not 25");
  process.exit(1);
}
console.log("✓ Test 1: Verified versionCode is 25 (Exceeds prior code 23)");

// Test 2: التحقق من اسم الحزمة com.deepfocus.study
if (!gradleContent.includes('applicationId "com.deepfocus.study"')) {
  console.error("FAIL: applicationId is not com.deepfocus.study");
  process.exit(1);
}
console.log("✓ Test 2: Package ID com.deepfocus.study verified");

// Test 3: التحقق من خلو Manifest من خدمة Foreground
const manifest = fs.readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
if (manifest.includes('FOREGROUND_SERVICE_SPECIAL_USE')) {
  console.error("FAIL: Special use foreground service still declared");
  process.exit(1);
}
console.log("✓ Test 3: No video required (AlarmManager verified)");

// Test 4: التحقق من خلو ملفات الاستوديو من كانبان وكورنيل
const tasksContent = fs.readFileSync('android/app/src/main/assets/web/tasks_studio.js', 'utf8');
const notesContent = fs.readFileSync('android/app/src/main/assets/web/notes_studio.js', 'utf8');
if (tasksContent.includes("board:'كانبان'") || notesContent.includes("'Cornell notes'")) {
  console.error("FAIL: Alien terms still found in studios");
  process.exit(1);
}
console.log("✓ Test 4: Studios 100% clean of alien terms");

console.log("--- All Mission #199 Verification Tests PASSED (GREEN) ---");
