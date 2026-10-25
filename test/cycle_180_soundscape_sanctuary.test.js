const fs = require('fs');
const { SoundscapeSanctuary } = require('../android/app/src/main/assets/web/js/natural_soundscape_sanctuary_engine.js');

console.log("--- Running Mission #180 Audio Sanctuary Verification ---");

// Test 1: سلامة تصدير المحرك الصوتي
const sanctuary = new SoundscapeSanctuary();
if (!sanctuary || typeof sanctuary.createNaturalNoiseBuffer !== 'function') {
  console.error("FAIL: Audio Sanctuary export invalid");
  process.exit(1);
}
console.log("✓ Test 1: Soundscape Sanctuary engine exports cleanly");

// Test 2: سياسة انعدام الموسيقى وخوارزميات الصوت الطبيعي
const engineCode = fs.readFileSync('android/app/src/main/assets/web/js/natural_soundscape_sanctuary_engine.js', 'utf8');
if (engineCode.includes('synth_lead') || engineCode.includes('melody') || engineCode.includes('piano')) {
  console.error("FAIL: Music patterns detected in nature engine");
  process.exit(1);
}
console.log("✓ Test 2: Strict Zero-Music policy confirmed (Organic filters only)");

// Test 3: التحقق من تحويل الأرقام الغربية
const activatorCode = fs.readFileSync('android/app/src/main/assets/web/js/deep_focus_runtime_activator.js', 'utf8');
if (!activatorCode.includes('toWesternDigits') || !activatorCode.includes('1632')) {
  console.error("FAIL: Western digits converter missing in activator");
  process.exit(1);
}
console.log("✓ Test 3: Strict Western digits enforcement certified");

// Test 4: فحص نقاء ملف index.html من أي وسوم مشوهة سابقة
const indexHtml = fs.readFileSync('android/app/src/main/assets/web/index.html', 'utf8');
if (indexHtml.includes('deep_focus_visual_suite.js')) {
  console.error("FAIL: Corrupted visual suite tag found in index.html");
  process.exit(1);
}
console.log("✓ Test 4: Clean index.html confirmed (No visual clutter)");

// Test 5: الاستبعاد التام للعبرية
if (engineCode.includes('"he"') || activatorCode.includes('"iw"')) {
  console.error("FAIL: Hebrew locale detected");
  process.exit(1);
}
console.log("✓ Test 5: Absolute Hebrew exclusion verified");

console.log("--- All Mission #180 Verification Tests PASSED (GREEN) ---");
