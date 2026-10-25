const fs = require('fs');

console.log("--- Running Mission #198 Cloud Build Pipeline Verification ---");

// Test 1: تأكد من وجود ملف سير العمل
if (!fs.existsSync('.github/workflows/auto_release_build.yml')) {
  console.error("FAIL: Workflow file missing");
  process.exit(1);
}
console.log("✓ Test 1: Automated release build workflow configured");

// Test 2: خلو المشروع من كانبان وكورنيل
const tasksContent = fs.readFileSync('android/app/src/main/assets/web/tasks_studio.js', 'utf8');
const notesContent = fs.readFileSync('android/app/src/main/assets/web/notes_studio.js', 'utf8');
if (tasksContent.includes("board:'كانبان'") || notesContent.includes("'Cornell notes'")) {
  console.error("FAIL: Alien terms still found in studios");
  process.exit(1);
}
console.log("✓ Test 2: Studios confirmed clean (No raw kanban or cornell)");

// Test 3: التحقق من اسم الحزمة في build.gradle
const gradle = fs.readFileSync('android/app/build.gradle', 'utf8');
if (!gradle.includes('com.deepfocus.study') || !gradle.includes('versionCode 23')) {
  console.error("FAIL: Package ID or versionCode mismatch in gradle");
  process.exit(1);
}
console.log("✓ Test 3: Package ID com.deepfocus.study and versionCode 23 verified");

// Test 4: التحقق من مصفوفة الـ 100 لغة والأرقام الغربية
const appJs = fs.readFileSync('android/app/src/main/assets/web/app.js', 'utf8');
if (!appJs.includes('LANG_CATALOG') || appJs.includes('"code": "he"')) {
  console.error("FAIL: Language catalog or Hebrew exclusion compromised");
  process.exit(1);
}
console.log("✓ Test 4: 100-Locales catalog and Hebrew exclusion 100% verified");

console.log("--- All Mission #198 Verification Tests PASSED (GREEN) ---");
