// --- Test Harmonizer Tool ---
const fs = require('fs');

function checkHarmonizedVersion() {
  const g = 'android/app/build.gradle';
  if (!fs.existsSync(g)) return { ok: false };
  const bg = fs.readFileSync(g, 'utf8');
  const hasV300 = bg.includes('versionCode 30000');
  return { ok: hasV300, targetCode: 30000 };
}

const status = checkHarmonizedVersion();
console.log('Harmonized version status:', status.ok);
