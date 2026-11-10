import fs from 'fs';
import path from 'path';

const STORE_DIR = path.resolve('store_metadata');
const FORBIDDEN_CODES = ['he', 'iw', 'syc', 'ber', 'zgh'];
const EASTERN_ARABIC_NUMERALS = /[٠١٢٣٤٥٦٧٨٩]/;

if (!fs.existsSync(STORE_DIR)) {
  console.error('❌ مجلد store_metadata غير موجود!');
  process.exit(1);
}

const locales = fs.readdirSync(STORE_DIR).filter(f => fs.statSync(path.join(STORE_DIR, f)).isDirectory());

console.log(`🔍 جاري فحص ${locales.length} لغة في متجر Google Play...\n`);

let passed = 0;
let errors = 0;

for (const loc of locales) {
  if (FORBIDDEN_CODES.includes(loc.toLowerCase())) {
    console.error(`❌ خطأ: اللغة المحظورة [${loc}] موجودة في المجلد!`);
    errors++;
    continue;
  }

  const titlePath = path.join(STORE_DIR, loc, 'title.txt');
  const shortPath = path.join(STORE_DIR, loc, 'short_description.txt');
  const fullPath = path.join(STORE_DIR, loc, 'full_description.txt');

  if (!fs.existsSync(titlePath) || !fs.existsSync(shortPath) || !fs.existsSync(fullPath)) {
    console.error(`❌ خطأ [${loc}]: نقص في ملفات البيانات الأساسية.`);
    errors++;
    continue;
  }

  const title = fs.readFileSync(titlePath, 'utf8').trim();
  const shortDesc = fs.readFileSync(shortPath, 'utf8').trim();
  const fullDesc = fs.readFileSync(fullPath, 'utf8').trim();

  const titleLen = [...title].length;
  const shortLen = [...shortDesc].length;
  const fullLen = [...fullDesc].length;

  let locValid = true;

  if (titleLen > 30) {
    console.warn(`⚠️ [${loc}] العنوان طويل (${titleLen}/30 حرفاً)`);
    locValid = false;
  }
  if (shortLen > 80) {
    console.warn(`⚠️ [${loc}] الوصف القصير طويل (${shortLen}/80 حرفاً)`);
    locValid = false;
  }
  if (fullLen > 4000) {
    console.warn(`⚠️ [${loc}] الوصف الكامل طويل (${fullLen}/4000 حرفاً)`);
    locValid = false;
  }
  if (EASTERN_ARABIC_NUMERALS.test(title + shortDesc + fullDesc)) {
    console.warn(`⚠️ [${loc}] وُجدت أرقام مشرقية، المطلوب حصراً الأرقام الغربية 0-9`);
    locValid = false;
  }

  if (locValid) {
    passed++;
  } else {
    errors++;
  }
}

console.log('--------------------------------------------------');
console.log(`📊 النتيجة النهائية:`);
console.log(`✅ اللغات السليمة والمطابقة تماماً: ${passed} / ${locales.length}`);
if (errors === 0) {
  console.log(`🎉 نجاح تام 100%! كافة اللغات مطابقة لمعايير Google Play الصارمة.`);
} else {
  console.log(`⚠️ عدد التنبيهات التي تحتاج مراجعة: ${errors}`);
}
