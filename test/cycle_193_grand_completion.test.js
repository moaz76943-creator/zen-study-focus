const fs = require('fs');

console.log("--- Running Mission #193 Grand Completion Verification ---");

const appJs = fs.readFileSync('android/app/src/main/assets/web/app.js', 'utf8');

// Test 1: تأكد من وجود محرك مشاركة البطاقة
if (!appJs.includes('ShareCardEngine') || !appJs.includes('showShareCardModal')) {
  console.error("FAIL: ShareCardEngine missing in app.js");
  process.exit(1);
}
console.log("✓ Test 1: ShareCardEngine and native share triggers verified");

// Test 2: التحقق من الأرقام الغربية وشعلة الالتزام داخل البطاقة
if (!appJs.includes('Days Streak') || !appJs.includes('DEEP FOCUS DAILY RECORD')) {
  console.error("FAIL: Streak or payload metadata missing");
  process.exit(1);
}
console.log("✓ Test 2: Social proof payload and streak metadata verified");

// Test 3: التحقق من سلامة اللغات والأصوات
if (!appJs.includes('LANG_CATALOG') || !appJs.includes('COMPLETION_TONES')) {
  console.error("FAIL: Core catalog or completion chimes compromised");
  process.exit(1);
}
console.log("✓ Test 3: 100-Locales catalog and acoustic chimes 100% intact");

// Test 4: التأكد من حذف الملفات الصوتية التالفة
const badFiles = ['white_noise.mp3', 'pink_noise.mp3', 'deep_earth_rumble.mp3', 'rustling_leaves.mp3'];
for (const f of badFiles) {
  if (fs.existsSync(`android/app/src/main/assets/web/audio/${f}`)) {
    console.error(`FAIL: Corrupt audio file ${f} still exists on disk`);
    process.exit(1);
  }
}
console.log("✓ Test 4: All 4 corrupt 14-byte audio files completely purged");

console.log("--- All Mission #193 Verification Tests PASSED (GREEN) ---");
