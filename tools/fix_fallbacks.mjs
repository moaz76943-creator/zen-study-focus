#!/usr/bin/env node
// Fix [key] fallback markers in i18n/packs/*.json
// Replace [key] with key (strip literal brackets for placeholder-formatted entries)
// Also apply COMMON_TRANSLATIONS where available
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.resolve('.');
const PACKS_DIR = path.join(REPO, 'i18n/packs');
const SRC = JSON.parse(fs.readFileSync(path.join(REPO, 'i18n/source_en.json'), 'utf8'));

const COMMON_TRANSLATIONS = {
  '📥 TXT': { ar: '📥 نص', fa: '📥 متن', ps: '📥 متون', ur: '📥 متن', es: '📥 TXT', fr: '📥 TXT', de: '📥 TXT', pt: '📥 TXT', it: '📥 TXT', nl: '📥 TXT', pl: '📥 TXT', ru: '📥 TXT', ja: '📥 テキスト', ko: '📥 텍스트', zh: '📥 文本', hi: '📥 पाठ', th: '📥 ข้อความ', vi: '📥 TXT', tr: '📥 METİN', id: '📥 TEKS' },
  min: { ar: 'دقيقة', fa: 'دقیقه', ps: 'دقيقة', ur: 'منٹ', es: 'min', fr: 'min', de: 'Min', pt: 'min', it: 'min', nl: 'min', pl: 'min', ru: 'мин', ja: '分', ko: '분', zh: '分', hi: 'मिनट', th: 'นาที', vi: 'phút', tr: 'dk', id: 'menit' },
  Status: { ar: 'الحالة', fa: 'وضعیت', ps: 'وضعیت', ur: 'حالت', es: 'Estado', fr: 'Statut', de: 'Status', pt: 'Status', it: 'Stato', nl: 'Status', pl: 'Status', ru: 'Статус', ja: 'ステータス', ko: '상태', zh: '状态', hi: 'स्थिति', th: 'สถานะ', vi: 'Trạng thái', tr: 'Durum', id: 'Status' },
  '{0} WPM': { ar: '{0} كلمة/دقيقة', fa: '{0} کلمه/دقیقه', ps: '{0} کلمه/دقیقه', ur: '{0} لفظ/منٹ', es: '{0} WPM', fr: '{0} WPM', de: '{0} WPM', pt: '{0} WPM', it: '{0} WPM', nl: '{0} WPM', pl: '{0} WPM', ru: '{0} WPM', ja: '{0} WPM', ko: '{0} WPM', zh: '{0} WPM', hi: '{0} WPM', th: '{0} WPM', vi: '{0} WPM', tr: '{0} WPM', id: '{0} WPM' },
  Timer: { ar: 'المؤقت', fa: 'تایمر', ps: 'مؤقت', ur: 'تایмер', es: 'Temporizador', fr: 'Minuteur', de: 'Timer', pt: 'Temporizador', it: 'Timer', nl: 'Timer', pl: 'Timer', ru: 'Таймер', ja: 'タイマー', ko: '타이머', zh: '计时器', hi: 'टाइमर', th: 'ตัวจับเวลา', vi: 'Bộ đếm giờ', tr: 'Zamanlayıcı', id: 'Timer' },
  '{0} Hz AMOLED': null, // keep as-is (technical term)
};

let total_fixed = 0;
let total_changed = 0;

for (const f of fs.readdirSync(PACKS_DIR).filter((x) => x.endsWith('.json'))) {
  const code = f.replace(/\.json$/, '');
  const packPath = path.join(PACKS_DIR, f);
  const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  let changed = false;
  
  for (const [k, v] of Object.entries(pack.t)) {
    if (typeof v !== 'string') continue;
    
    // Fix 1: Strip literal [ ] brackets from placeholder-formatted entries
    // e.g., [{0}Hz AMOLED] -> {0}Hz AMOLED  or  [Filters] -> Filters
    if (v.startsWith('[') && v.endsWith(']')) {
      const inner = v.slice(1, -1);
      // If inner looks like a placeholder pattern {N} or text, strip brackets
      if (inner !== v) {
        // Check if the content inside brackets is meaningful (not just a key)
        // Strip brackets - treat as keeping the inner text
        pack.t[k] = inner;
        changed = true;
        total_fixed++;
        // console.log(`  ${code}: ${k!r} -> ${v!r} stripped to ${inner!r}`);
      }
    }
    
    // Fix 2: Apply COMMON_TRANSLATIONS if available
    if (COMMON_TRANSLATIONS[k] && COMMON_TRANSLATIONS[k][code]) {
      if (pack.t[k] !== COMMON_TRANSLATIONS[k][code]) {
        pack.t[k] = COMMON_TRANSLATIONS[k][code];
        changed = true;
        total_changed++;
      }
    }
  }
  
  if (changed) {
    fs.writeFileSync(packPath, JSON.stringify(pack, null, 2) + '\n');
    // console.log(`Fixed: ${code}`);
  }
}

console.log(`Fixed ${total_fixed} fallback markers, ${total_changed} common translations`);
console.log('Done. Re-run node tools/run_tests.mjs to verify.');