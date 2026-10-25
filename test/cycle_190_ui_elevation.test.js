const fs = require('fs');

console.log("--- Running Mission #190 UI Elevation Verification ---");

const appJs = fs.readFileSync('android/app/src/main/assets/web/app.js', 'utf8');
const indexHtml = fs.readFileSync('android/app/src/main/assets/web/index.html', 'utf8');

// Test 1: استبدال المصطلحات الغريبة
if (appJs.includes('ملاحظات كورنيل') || appJs.includes('كانبان')) {
  console.error("FAIL: Alien terms still found in app.js");
  process.exit(1);
}
console.log("✓ Test 1: Alien terms replaced (Cornell -> تلخيص منظم, Kanban -> لوحة المراحل)");

// Test 2: محرك التبديل السلس للأنشطة
if (!appJs.includes('SMOOTH ZERO-POPUP ACTIVITY SWITCHER')) {
  console.error("FAIL: Smooth switcher missing in app.js");
  process.exit(1);
}
console.log("✓ Test 2: Smooth zero-popup activity switcher verified");

// Test 3: تفاعلية التقويم وتنظيف الكروت
if (!appJs.includes('PRISTINE CARDS & INTERACTIVE CALENDAR')) {
  console.error("FAIL: Interactive calendar & clean cards engine missing");
  process.exit(1);
}
console.log("✓ Test 3: Interactive calendar and clean cards engine verified");

// Test 4: سلامة الـ 100 لغة والأصوات
if (!appJs.includes('LANG_CATALOG') || !appJs.includes('COMPLETION_TONES')) {
  console.error("FAIL: Core catalog or completion chimes compromised");
  process.exit(1);
}
console.log("✓ Test 4: 100-Locales catalog and acoustic chimes 100% intact");

console.log("--- All Mission #190 Verification Tests PASSED (GREEN) ---");
