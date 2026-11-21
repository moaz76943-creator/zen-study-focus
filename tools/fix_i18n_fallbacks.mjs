#!/usr/bin/env node
// Fix English fallback values and Hebrew script leaks in locale packs.
// Corrected version.

import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve('.');
const dir = path.join(repo, 'i18n/packs');

const COMMON_TRANSLATIONS = {
  '📥 TXT': {
    ar: '📥 نص', fa: '📥 متن', ps: '📥 متون', ur: '📥 متن',
    es: '📥 TXT', fr: '📥 TXT', de: '📥 TXT', pt: '📥 TXT',
    it: '📥 TXT', nl: '📥 TXT', pl: '📥 TXT', ru: '📥 TXT',
    ja: '📥 テキスト', ko: '📥 텍스트', zh: '📥 文本', hi: '📥 पाठ',
    th: '📥 ข้อความ', vi: '📥 TXT', tr: '📥 METİN', id: '📥 TEKS',
  },
  min: {
    ar: 'دقيقة', fa: 'دقیقه', ps: 'دقيقة', ur: 'منٹ',
    es: 'min', fr: 'min', de: 'Min', pt: 'min', it: 'min', nl: 'min',
    pl: 'min', ru: 'мин', ja: '分', ko: '분', zh: '分', hi: 'मिनट',
    th: 'นาที', vi: 'phút', tr: 'dk', id: 'menit',
  },
  Status: {
    ar: 'الحالة', fa: 'وضعیت', ps: 'وضعیت', ur: 'حالت',
    es: 'Estado', fr: 'Statut', de: 'Status', pt: 'Status', it: 'Stato',
    nl: 'Status', pl: 'Status', ru: 'Статус', ja: 'ステータス',
    ko: '상태', zh: '状态', hi: 'स्थिति', th: 'สถานะ', vi: 'Trạng thái',
    tr: 'Durum', id: 'Status',
  },
  'November {0}': {
    ar: 'نوفمبر {0}', fa: 'نوامبر {0}', ps: 'نومبر {0}', ur: 'نومبر {0}',
    es: 'noviembre {0}', fr: 'novembre {0}', de: 'November {0}', pt: 'novembro {0}',
    it: 'novembre {0}', nl: 'november {0}', pl: 'listopad {0}', ru: 'ноябрь {0}',
    ja: '11月 {0}', ko: '11월 {0}', zh: '11月 {0}', hi: 'नवंबर {0}',
    th: 'พฤศจิกายน {0}', vi: 'tháng 11 {0}', tr: 'Kasım {0}', id: 'November {0}',
  },
  '{0} WPM': {
    ar: '{0} كلمة/دقيقة', fa: '{0} کلمه/دقیقه', ps: '{0} کلمه/دقیقه', ur: '{0} لفظ/منٹ',
    es: '{0} WPM', fr: '{0} WPM', de: '{0} WPM', pt: '{0} WPM', it: '{0} WPM',
    nl: '{0} WPM', pl: '{0} WPM', ru: '{0} WPM', ja: '{0} WPM', ko: '{0} WPM',
    zh: '{0} WPM', hi: '{0} WPM', th: '{0} WPM', vi: '{0} WPM', tr: '{0} WPM', id: '{0} WPM',
  },
  Timer: {
    ar: 'المؤقت', fa: 'تایمر', ps: 'مؤقت', ur: 'تایمر',
    es: 'Temporizador', fr: 'Minuteur', de: 'Timer', pt: 'Temporizador', it: 'Timer',
    nl: 'Timer', pl: 'Timer', ru: 'Таймер', ja: 'タイマー', ko: '타이머',
    zh: '计时器', hi: 'टाइमर', th: 'ตัวจับเวลา', vi: 'Bộ đếm giờ',
    tr: 'Zamanlayıcı', id: 'Timer',
  },
  Original: {
    ar: 'الأصلي', fa: 'اصلی', ps: 'اصلی', ur: 'اصل',
    es: 'Original', fr: 'Original', de: 'Original', pt: 'Original', it: 'Originale',
    nl: 'Origineel', pl: 'Oryginał', ru: 'Оригинал', ja: 'オリジナル',
    ko: '원본', zh: '原始', hi: 'मूल', th: 'ต้นฉบับ', vi: 'Gốc',
    tr: 'Orijinal', id: 'Asli',
  },
  Total: {
    ar: 'الإجمالي', fa: 'مجموع', ps: 'کل', ur: 'کل',
    es: 'Total', fr: 'Total', de: 'Gesamt', pt: 'Total', it: 'Totale',
    nl: 'Totaal', pl: 'Razem', ru: 'Итого', ja: '合計', ko: '합계',
    zh: '总计', hi: 'कुल', th: 'รวม', vi: 'Tổng', tr: 'Toplam', id: 'Total',
  },
  Start: {
    ar: 'ابدأ', fa: 'شروع', ps: 'پاي kې', ur: 'شروع کریں',
    es: 'Iniciar', fr: 'Démarrer', de: 'Start', pt: 'Iniciar', it: 'Avvia',
    nl: 'Start', pl: 'Start', ru: 'Пуск', ja: '開始', ko: '시작',
    zh: '开始', hi: 'प्रारंभ करें', th: 'เริ่ม', vi: 'Bắt đầu',
    tr: 'Başlat', id: 'Mulai',
  },
  Flashcards: {
    ar: 'البطاقات التعليمية', fa: 'بستة کارت', ps: 'ګور کارتونه', ur: 'فلیش کارڈز',
    es: 'Tarjetas', fr: 'Cartes mémoire', de: 'Karteikarten', pt: 'Flashcards', it: 'Flashcard',
    nl: 'Flashcards', pl: 'Fiszki', ru: 'Карточки', ja: 'フラッシュカード',
    ko: '플래시카드', zh: '闪卡', hi: 'फ्लैशकार्ड', th: 'การ์ดคำศัพท์',
    vi: 'Thẻ ghi nhớ', tr: 'Bellek kartları', id: 'Kartu flash',
  },
  Sport: {
    ar: 'رياضة', fa: 'ورزش', ps: 'ورځی', ur: 'کھیل',
    es: 'Deporte', fr: 'Sport', de: 'Sport', pt: 'Esporte', it: 'Sport',
    nl: 'Sport', pl: 'Sport', ru: 'Спорт', ja: 'スポーツ', ko: '운동',
    zh: '运动', hi: 'खेल', th: 'กีฬา', vi: 'Thể thao',
    tr: 'Spor', id: 'Olahraga',
  },
  'Zen Study Suite': {
    ar: 'مجموعة zen للدراسة', fa: 'گروه zen مطالعه', ps: 'zen کورس', ur: 'zen میساویس suite',
    es: 'Zen Study Suite', fr: 'Zen Study Suite', de: 'Zen Study Suite',
    pt: 'Zen Study Suite', it: 'Zen Study Suite', nl: 'Zen Study Suite',
    pl: 'Zen Study Suite', ru: 'Zen Study Suite', ja: 'Zen Study Suite',
    ko: 'Zen Study Suite', zh: 'Zen Study Suite', hi: 'Zen Study Suite',
    th: 'Zen Study Suite', vi: 'Zen Study Suite', tr: 'Zen Study Suite', id: 'Zen Study Suite',
  },
  'Zen Sanctuary': {
    ar: 'ملاذ الهدوء', fa: 'مأوى zen', ps: 'zen پناهگاه', ur: 'zen پناہ گاہ',
    es: 'Zen Sanctuary', fr: 'Zen Sanctuary', de: 'Zen Sanctuary',
    pt: 'Zen Sanctuary', it: 'Zen Sanctuary', nl: 'Zen Sanctuary',
    pl: 'Zen Sanctuary', ru: 'Zen Sanctuary', ja: 'Zen Sanctuary',
    ko: 'Zen Sanctuary', zh: 'Zen Sanctuary', hi: 'Zen Sanctuary',
    th: 'Zen Sanctuary', vi: 'Zen Sanctuary', tr: 'Zen Sanctuary', id: 'Zen Sanctuary',
  },
  Filter: {
    ar: 'تصفية', fa: 'فیلتر', ps: 'فیلتر', ur: 'فلٹر',
    es: 'Filtrar', fr: 'Filtrer', de: 'Filtern', pt: 'Filtrar', it: 'Filtro',
    nl: 'Filteren', pl: 'Filtruj', ru: 'Фильтр', ja: 'フィルター',
    ko: '필터', zh: '筛选', hi: 'फ़िल्टर करें', th: 'กรอง', vi: 'Lọc',
    tr: 'Filtrele', id: 'Filter',
  },
  Filters: {
    ar: 'عوامل التصفية', fa: 'فیلترها', ps: 'فیلترونه', ur: 'فلٹرز',
    es: 'Filtros', fr: 'Filtres', de: 'Filter', pt: 'Filtros', it: 'Filtri',
    nl: 'Filters', pl: 'Filtry', ru: 'Фильтры', ja: 'フィルター',
    ko: '필터', zh: '筛选器', hi: 'फ़िल्टร', th: 'ตัวกรอง', vi: 'Bộ lọc',
    tr: 'Filtreler', id: 'Filter',
  },
  'Daily Goals': {
    ar: 'الأهداف اليومية', fa: 'اهداف روزانه', ps: 'روانې اې Sew', ur: 'روزانہ اہداف',
    es: 'Objetivos diarios', fr: 'Objectifs quotidiens', de: 'Tagesziele', pt: 'Metas diárias', it: 'Obiettivi giornalieri',
    nl: 'Dagelijkse doelen', pl: 'Cele dzienne', ru: 'Ежедневные цели', ja: 'デイリー目標',
    ko: '일일 목표', zh: '每日目标', hi: 'दैनिक लक्ष्य', th: 'เป้าหมายรายวัน',
    vi: 'Mục tiêu hàng ngày', tr: 'Günlük Hedefler', id: 'Target harian',
  },
  'Daily goal': {
    ar: 'الهدف اليومي', fa: 'هدف روزانه', ps: 'روانې Sew', ur: 'روزانہ مقصد',
    es: 'Objetivo diario', fr: 'Objectif quotidien', de: 'Tagesziel', pt: 'Meta diária', it: 'Obiettivo giornaliero',
    nl: 'Dagelijks doel', pl: 'Cel dzienny', ru: 'Ежедневная цель', ja: 'デイリー目標',
    ko: '일일 목표', zh: '每日目标', hi: 'दैनिक लक्ष्य', th: 'เป้าหมายรายวัน',
    vi: 'Mục tiêu hàng ngày', tr: 'Günlük Hedef', id: 'Target harian',
  },
  'Tags (comma separated)': {
    ar: 'الوسوم (مفصولة بفواصل)', fa: 'برچسب‌ها (با ویرگول جدا شوند)', ps: 'ټیګې (کوما کله)', ur: 'ٹیگز (کوما سے الگ)',
    es: 'Etiquetas (separadas por comas)', fr: 'Étiquettes (séparées par des virgules)', de: 'Tags (durch Komma getrennt)', pt: 'Etiquetas (separadas por vírgula)', it: 'Tag (separati da virgola)',
    nl: 'Tags (gescheiden door komma)', pl: 'Tagi (oddzielone przecinkami)', ru: 'Теги (разделенные запятой)', ja: 'タグ (コンマ区切り)',
    ko: '태그 (쉼표로 구분)', zh: '标签 (逗号分隔)', hi: 'टैग (विराम से अलग)', th: 'แท็ก (คั่นด้วยเครื่องหมายจุลภาค)', vi: 'Thẻ (phân tách bằng dấu phẩy)',
    tr: 'Etiketler (virgülle ayrılmış)', id: 'Tag (dipisah koma)',
  },
  'Tags (comma-separated)': {
    ar: 'الوسوم (مفصولة بفواصل)', fa: 'برچسب‌ها (با ویرگول جدا شدند)', ps: 'ټیګې (کوما کله)', ur: 'ٹیگز (کوما سے الگ)',
    es: 'Etiquetas (separadas por comas)', fr: 'Étiquettes (séparées par des virgules)', de: 'Tags (durch Komma getrennt)', pt: 'Etiquetas (separadas por vírgula)', it: 'Tag (separati da virgola)',
    nl: 'Tags (gescheiden door komma)', pl: 'Tagi (oddzielone przecinkami)', ru: 'Теги (разделенные запятой)', ja: 'タグ (コンマ区切り)',
    ko: '태그 (쉼표로 구분)', zh: '标签（逗号分隔）', hi: 'टैग (विराम से अलग)', th: 'แท็ก (คั่นด้วยเครื่องหมายจุลภาค)', vi: 'Thẻ (phân tách bằng dấu phẩy)',
    tr: 'Etiketler (virgülle ayrılmış)', id: 'Tag (dipisah koma)',
  },
  'Structured Notes': {
    ar: 'ملاحظات منظمة', fa: 'یادداشت‌های منظم', ps: 'ویکتې منظمې', ur: 'منظم نوٹس',
    es: 'Notas estructuradas', fr: 'Notes structurées', de: 'Strukturierte Notizen', pt: 'Notas estruturadas', it: 'Note strutturate',
    nl: 'Gestructureerde notities', pl: 'Strukturalne notatki', ru: 'Структурированные заметки', ja: '構造化されたノート',
    ko: '구조화된 노트', zh: '结构化笔记', hi: 'संरचित नोट्स', th: 'บันทึกที่มีโครงสร้าง', vi: 'Ghi chú có cấu trúc',
    tr: 'Yapılandırılmış Notlar', id: 'Catatan terstruktur',
  },
  'Structured notes': {
    ar: 'ملاحظات منظمة', fa: 'یادداشت‌های منظم', ps: 'ویکتې منظمې', ur: 'منظم نوٹس',
    es: 'Notas estructuradas', fr: 'Notes structurées', de: 'Strukturierte Notizen', pt: 'Notas estruturadas', it: 'Note strutturate',
    nl: 'Gestructureerde notities', pl: 'Strukturalne notatki', ru: 'Структурированные заметки', ja: '構造化されたノート',
    ko: '구조화된 노트', zh: '结构化笔记', hi: 'संरचित नोट्स', th: 'บันทึกที่มีโครงสร้าง', vi: 'Ghi chú có cấu trúc',
    tr: 'Yapılandırılmış Notlar', id: 'Catatan terstruktur',
  },
  'This Week': {
    ar: 'هذا الأسبوع', fa: 'این هفته', ps: 'د اې Wochen', ur: 'اس ہفتے',
    es: 'Esta semana', fr: 'Cette semaine', de: 'Diese Woche', pt: 'Esta semana', it: 'Questa settimana',
    nl: 'Deze week', pl: 'Ten tydzień', ru: 'Эта неделя', ja: '今週',
    ko: '이번 주', zh: '这周', hi: 'इस सप्ताह', th: 'สัปดาห์นี้', vi: 'Tuần này',
    tr: 'Bu hafta', id: 'Minggu ini',
  },
  'This week': {
    ar: 'هذا الأسبوع', fa: 'این هفته', ps: 'د اې Wochen', ur: 'اس ہفتے',
    es: 'Esta semana', fr: 'Cette semaine', de: 'Diese Woche', pt: 'Esta semana', it: 'Questa settimana',
    nl: 'Deze week', pl: 'Ten tydzień', ru: 'Эта неделя', ja: '今週',
    ko: '이번 주', zh: '这周', hi: 'इस सप्ताह', th: 'สัปดาห์นี้', vi: 'Tuần này',
    tr: 'Bu hafta', id: 'Minggu ini',
  },
  mins: {
    ar: 'دقائق', fa: 'دقیقه', ps: 'دقيقه', ur: 'منٹ',
    es: 'min', fr: 'min', de: 'Min', pt: 'min', it: 'min', nl: 'min',
    pl: 'min', ru: 'мин', ja: '分', ko: '분', zh: '分', hi: 'मिनट',
    th: 'นาที', vi: 'phút', tr: 'dk', id: 'menit',
  },
  minutes: {
    ar: 'دقائق', fa: 'دقیقه', ps: 'دقیقه', ur: 'منٹ',
    es: 'minutos', fr: 'minutes', de: 'Minuten', pt: 'minutos', it: 'minuti',
    nl: 'minuten', pl: 'minuty', ru: 'минуты', ja: '分', ko: '분',
    zh: '分钟', hi: 'मिनट', th: 'นาที', vi: 'phút', tr: 'dakika', id: 'menit',
  },
};

function fallbackFor(code, key) {
  const map = COMMON_TRANSLATIONS[key];
  if (map && map[code]) return map[code];
  // Known English terms that stay the same across languages
  if (key === '📥 TXT' || key === 'Original' || key === 'Total' || key === 'min' ||
      key === 'Status' || key === 'Timer' || key === '{0} WPM' || key === 'Edit' ||
      key === 'Filter' || key === 'Start' || key === 'Sport' || key === 'November {0}') {
    return key;
  }
  return `[${key}]`;
}

const HEBREW_CHARS = /[\u0590-\u05FF\u0750-\u077F\uFB1E-\uFE0F]/;
const ARABIC_CHARS = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;

// Hebrew-only ranges (exclude Arabic overlap)
const IS_HEBREW = /[\u0590-\u05FF\uFB1D-\uFB4F\u07C0-\u07FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

let fallbacks_fixed = 0;
let hebrew_fixed = 0;
let packs_changed = 0;

for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const code = f.replace(/\.json$/, '');
  const packPath = path.join(dir, f);
  const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  const t = pack.t;
  let changed = false;

  // Fix Hebrew script leaks
  for (const [k, v] of Object.entries(t)) {
    const hasHebrew = [...v].some((ch) => /[\u0590-\u05FF\uFB1D-\uFB4F]/.test(ch));
    if (hasHebrew) {
      const repl = fallbackFor(code, k);
      if (repl !== v) {
        t[k] = repl;
        changed = true;
        hebrew_fixed++;
      }
    }
  }

  // Fix English fallbacks (translation == source key)
  for (const [k, v] of Object.entries(t)) {
    if (v === k) {
      const repl = fallbackFor(code, k);
      if (repl !== k) {
        t[k] = repl;
        changed = true;
        fallbacks_fixed++;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(packPath, JSON.stringify(pack, null, 2) + '\n');
    packs_changed++;
  }
}

console.log(`Packs changed: ${packs_changed}`);
console.log(`English fallbacks fixed: ${fallbacks_fixed}`);
console.log(`Hebrew fixes: ${hebrew_fixed}`);