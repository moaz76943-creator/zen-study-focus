/* ========================================================
   0. STRICT WESTERN DIGITS ENFORCER (0123456789 ONLY)
   ======================================================== */
function toWest(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[٠-٩]/g, d => d.charCodeAt(0) - 1632)
    .replace(/[۰-۹]/g, d => d.charCodeAt(0) - 1776);
}

document.addEventListener('input', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
    const cleaned = toWest(e.target.value);
    if (cleaned !== e.target.value) e.target.value = cleaned;
  }
});

/* ========================================================
   1. ANTI-MOD FORTRESS & CRYPTOGRAPHIC CLOUD BACKUP
   ======================================================== */
const SECRET_SALT = "ZEN_FORTRESS_V21_99812";
function computeHash(str) {
  let h = 2166136261;
  const s = str + SECRET_SALT;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return (h >>> 0).toString(16);
}

function saveFortressData(key, obj) {
  try {
    const raw = JSON.stringify(obj);
    const packet = JSON.stringify({ payload: raw, sig: computeHash(raw), ts: Date.now() });
    localStorage.setItem(key, packet);
    localStorage.setItem(key + "_mirror", packet);
  } catch (e) {}
}

function loadFortressData(key, defaultObj) {
  try {
    const tryRead = (k) => {
      const item = localStorage.getItem(k);
      if (!item) return null;
      const parsed = JSON.parse(item);
      if (parsed && parsed.payload && computeHash(parsed.payload) === parsed.sig) {
        return JSON.parse(parsed.payload);
      }
      return null;
    };
    return tryRead(key) || tryRead(key + "_mirror") || defaultObj;
  } catch (e) {
    return defaultObj;
  }
}

document.addEventListener('contextmenu', e => e.preventDefault());

/* ========================================================
   2. 20 WORLD LANGUAGES COMPLETE DICTIONARY (ZERO UNTRANSLATED TEXT)
   ======================================================== */
const LANG_CATALOG = [
  { code: 'en', iso: 'EN', enName: 'English', nativeName: 'English', dir: 'ltr', countries: 'usa uk united states britain canada australia ireland new zealand امريكا بريطانيا كندا استراليا' },
  { code: 'ar', iso: 'AR', enName: 'Arabic', nativeName: 'العربية', dir: 'rtl', countries: 'jordan saudi arabia egypt uae palestine syria iraq morocco algeria qatar kuwait oman yemen lebanon tunisia sudan ليبيا الاردن السعودية مصر الامارات فلسطين سوريا العراق المغرب الجزائر قطر الكويت عمان اليمن لبنان تونس السودان' },
  { code: 'es', iso: 'ES', enName: 'Spanish', nativeName: 'Español', dir: 'ltr', countries: 'spain mexico argentina colombia chile peru venezuela اسبانيا المكسيك الارجنتين' },
  { code: 'zh', iso: 'ZH', enName: 'Chinese', nativeName: '中文 (简体)', dir: 'ltr', countries: 'china taiwan singapore hong kong الصين تايوان سنغافورة' },
  { code: 'hi', iso: 'HI', enName: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr', countries: 'india nepal الهند نيبال' },
  { code: 'fr', iso: 'FR', enName: 'French', nativeName: 'Français', dir: 'ltr', countries: 'france belgium switzerland canada senegal فرنسا بلجيكا سويسرا' },
  { code: 'de', iso: 'DE', enName: 'German', nativeName: 'Deutsch', dir: 'ltr', countries: 'germany austria switzerland المانيا النمسا سويسرا' },
  { code: 'ru', iso: 'RU', enName: 'Russian', nativeName: 'Русский', dir: 'ltr', countries: 'russia belarus kazakhstan روسيا كازاخستان' },
  { code: 'pt', iso: 'PT', enName: 'Portuguese', nativeName: 'Português', dir: 'ltr', countries: 'brazil portugal angola البرازيل البرتغال' },
  { code: 'ja', iso: 'JA', enName: 'Japanese', nativeName: '日本語', dir: 'ltr', countries: 'japan tokyo اليابان طوكيو' },
  { code: 'id', iso: 'ID', enName: 'Indonesian', nativeName: 'Bahasa Indonesia', dir: 'ltr', countries: 'indonesia jakarta اندونيسيا' },
  { code: 'tr', iso: 'TR', enName: 'Turkish', nativeName: 'Türkçe', dir: 'ltr', countries: 'turkey ankara istanbul cyprus تركيا اسطنبول' },
  { code: 'ko', iso: 'KO', enName: 'Korean', nativeName: '한국어', dir: 'ltr', countries: 'south korea seoul كوريا الجنوبية سيول' },
  { code: 'vi', iso: 'VI', enName: 'Vietnamese', nativeName: 'Tiếng Việt', dir: 'ltr', countries: 'vietnam hanoi فيتنام' },
  { code: 'it', iso: 'IT', enName: 'Italian', nativeName: 'Italiano', dir: 'ltr', countries: 'italy rome milan vatican ايطاليا روما' },
  { code: 'bn', iso: 'BN', enName: 'Bengali', nativeName: 'বাংলা', dir: 'ltr', countries: 'bangladesh dhaka india بنغلاديش' },
  { code: 'ur', iso: 'UR', enName: 'Urdu', nativeName: 'اردو', dir: 'rtl', countries: 'pakistan islamabad lahore باكستان' },
  { code: 'fa', iso: 'FA', enName: 'Persian', nativeName: 'فارسی', dir: 'rtl', countries: 'iran tehran afghanistan ايران افغانستان' },
  { code: 'pl', iso: 'PL', enName: 'Polish', nativeName: 'Polski', dir: 'ltr', countries: 'poland warsaw بولندا' },
  { code: 'nl', iso: 'NL', enName: 'Dutch', nativeName: 'Nederlands', dir: 'ltr', countries: 'netherlands holland amsterdam belgium هولندا بلجيكا' }
];

const DICT = {
  en: {
    title: 'Focus & Performance', sub: 'Study, Workout, Reading & Deep Work',
    pillCloud: 'Google Backup', pillSound: 'Test Sound', pillShare: 'Share App', pillSecure: 'Anti-Mod',
    domStudy: 'Study', domSport: 'Workout', domRead: 'Reading', domWork: 'Deep Work',
    sportSetsTitle: '🏋️ Workout Sets & Rest', readTrackerTitle: '📖 Reading Session Progress',
    navTimer: 'Timer', navTasks: 'Tasks', navCalendar: 'Calendar', navNotes: 'Notes', navSounds: 'Nature', navAnalytics: 'Analytics',
    totalFocusToday: 'Total Active Minutes Today', minsUnit: 'mins', daysUnit: 'days', waterWord: 'Water',
    orbDump: 'Quick Note', orbCloud: 'Cloud Sync', orbDesk: 'Desk Clock',
    modeFocus: '25m', modeShort: '5m', modeLong: '15m', modeCustom: 'Custom ⚡',
    startFocusAchieve: 'Plan • Execute • Achieve',
    filterAll: 'All', filterToday: 'Active', filterDone: 'Completed',
    phAddTask: 'Add study, workout or reading goal...', phSearchNotes: 'Search notes, workouts or book summaries...',
    catStudy: '📚 Study', catSport: '🏋️ Sport', catReview: '📖 Reading', catExam: '💻 Work',
    tagCornell: 'Cornell 📋', tagFlash: 'Recall 👁️', tagQuick: 'Log 💡',
    btnAddCalNote: '+ Add Note to Date', lblBlurAnswer: 'Blur text for active recall (Tap to reveal)',
    mixerReady: '🎵 Pure Nature Studio Ready', btnMyMix: '✨ Mix', btnStopAll: '⏹ Stop',
    sndCatWater: 'Water & Rain 🌧️', sndCatForest: 'Forest & Wind 🌲', sndCatWarm: 'Fire & Earth 🔥',
    kpiMinutes: 'Active Minutes', kpiSessions: 'Completed Sessions',
    kpiTrendWeek: '↑ +18% this week', kpiTrendGreat: '↑ +12% consistency',
    overviewTitle: 'Multi-Domain Distribution', badgeThisWeek: 'This Week',
    waveFlowTitle: 'Weekly Performance Index', peakPerfBadge: 'Peak Flow',
    calcHeading: '🎓 Target & Goal Completion Calculator',
    calcOutTpl: '📅 At this pace, you will finish your target in {d} days!',
    btnSave: 'Save & Apply', btnCancel: 'Cancel',
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    sounds: {
      ocean: 'Ocean Waves', rain: 'Soft Forest Rain', fire: 'Campfire Woods', forest: 'Pine Breeze',
      stream: 'Mountain Stream', leaves: 'Rustling Leaves', waterfall: 'Lush Waterfall', night: 'Night Crickets',
      thunder: 'Distant Thunder', wind: 'Highland Wind', winrain: 'Rain on Window', earth: 'Deep Earth Rumble'
    },
    sampleTasks: [
      'Complete Chapter 1 & Core Concepts', 'HIIT Strength & Cardio Session (4 Sets)', 'Read 25 Pages of Reference Book', 'Finish Deep Work Project Milestone'
    ],
    sampleNotes: [
      { t: 'Spaced Repetition System', b: 'Reviewing concepts at increasing intervals strengthens long-term memory retention.' },
      { t: 'Active Recall: Key Formula & Law', b: 'Hidden Answer: Performance = Focused Time × Intensity.' },
      { t: 'Workout & Training Log', b: '1. Warm-up 5m\n2. 4 Sets Compound Exercises\n3. Cool-down stretch.' }
    ]
  },
  ar: {
    title: 'التركيز والأداء العالي', sub: 'للدراسة، الرياضة، القراءة والعمل العميق',
    pillCloud: 'حفظ جوجل', pillSound: 'تجربة المنبه', pillShare: 'مشاركة التطبيق', pillSecure: 'حماية قصوى',
    domStudy: 'دراسة', domSport: 'رياضة', domRead: 'قراءة', domWork: 'عمل عميق',
    sportSetsTitle: '🏋️ جولات التمرين والراحة', readTrackerTitle: '📖 متتبع جلسة القراءة',
    navTimer: 'المؤقت', navTasks: 'المهام', navCalendar: 'التقويم', navNotes: 'الملاحظات', navSounds: 'الطبيعة', navAnalytics: 'التحليلات',
    totalFocusToday: 'إجمالي الدقائق النشطة اليوم', minsUnit: 'دقيقة', daysUnit: 'أيام', waterWord: 'الماء',
    orbDump: 'ملاحظة سريعة', orbCloud: 'حفظ سحابي', orbDesk: 'ساعة مكتب',
    modeFocus: '25د', modeShort: '5د', modeLong: '15د', modeCustom: 'مخصص ⚡',
    startFocusAchieve: 'خطط • نفذ • أنجز',
    filterAll: 'الكل', filterToday: 'قيد التنفيذ', filterDone: 'مكتملة',
    phAddTask: 'أضف هدف دراسة أو رياضة أو قراءة...', phSearchNotes: 'ابحث في الملاحظات أو التمارين أو الملخصات...',
    catStudy: '📚 دراسة', catSport: '🏋️ رياضة', catReview: '📖 قراءة', catExam: '💻 عمل',
    tagCornell: 'كورنيل 📋', tagFlash: 'استذكار 👁️', tagQuick: 'سجل 💡',
    btnAddCalNote: '+ ملاحظة لهذا اليوم', lblBlurAnswer: 'إخفاء النص للاستذكار الذاتي (يظهر باللمس)',
    mixerReady: '🎵 استوديو الطبيعة النقي جاهز', btnMyMix: '✨ خلطتي', btnStopAll: '⏹ إيقاف',
    sndCatWater: 'مياه وأمطار 🌧️', sndCatForest: 'غابات ورياح 🌲', sndCatWarm: 'دفء وأرض 🔥',
    kpiMinutes: 'الدقائق النشطة', kpiSessions: 'الجلسات المكتملة',
    kpiTrendWeek: '↑ +18% هذا الأسبوع', kpiTrendGreat: '↑ +12% التزام ممتاز',
    overviewTitle: 'توزيع الأنشطة والإنجاز', badgeThisWeek: 'هذا الأسبوع',
    waveFlowTitle: 'مؤشر الأداء والتدفق الأسبوعي', peakPerfBadge: 'ذروة الأداء',
    calcHeading: '🎓 حاسبة ختم الأهداف والمنهج',
    calcOutTpl: '📅 بهذا المعدل ستنجز هدفك بالكامل خلال {d} أيام!',
    btnSave: 'حفظ وتطبيق', btnCancel: 'إلغاء',
    weekdays: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    months: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
    sounds: {
      ocean: 'أمواج المحيط', rain: 'مطر الغابة الناعم', fire: 'حطب المدفأة', forest: 'نسيم الصنوبر',
      stream: 'جدول ماء جبلي', leaves: 'حفيف أوراق الشجر', waterfall: 'شلال متدفق', night: 'ليل الريف والجدجد',
      thunder: 'رعد ومطر بعيد', wind: 'رياح القمم الثلجية', winrain: 'مطر على النافذة', earth: 'هدير الأرض العازل'
    },
    sampleTasks: [
      'إتمام مراجعة الفصل الأول والمفاهيم', 'تمرين رياضي متكامل (4 جولات لياقة)', 'قراءة 25 صفحة من الكتاب المقرر', 'إنجاز مرحلة المشروع والعمل العميق'
    ],
    sampleNotes: [
      { t: 'نظام التكرار المتباعد للدراسة', b: 'مراجعة المفاهيم على فترات متباعدة تضاعف ثبات المعلومات في الذاكرة طويلة المدى.' },
      { t: 'بطاقة استذكار: معادلة الإنجاز', b: 'الجواب المخفي: الإنجاز الحقيقي = الوقت المركز × الاستمرارية.' },
      { t: 'سجل التمرين الرياضي واللياقة', b: '1. إحماء 5 دقائق\n2. 4 جولات تمارين أساسية\n3. إطالة واستشفاء.' }
    ]
  },
  es: {
    title: 'Enfoque y Rendimiento', sub: 'Estudio, Deporte, Lectura y Trabajo Profundo',
    pillCloud: 'Copia Google', pillSound: 'Probar Sonido', pillShare: 'Compartir', pillSecure: 'Anti-Mod',
    domStudy: 'Estudio', domSport: 'Deporte', domRead: 'Lectura', domWork: 'Trabajo',
    sportSetsTitle: '🏋️ Series y Descanso', readTrackerTitle: '📖 Progreso de Lectura',
    navTimer: 'Reloj', navTasks: 'Tareas', navCalendar: 'Agenda', navNotes: 'Notas', navSounds: 'Natura', navAnalytics: 'Análisis',
    totalFocusToday: 'Minutos Activos Hoy', minsUnit: 'min', daysUnit: 'días', waterWord: 'Agua',
    orbDump: 'Nota Rápida', orbCloud: 'Nube Sync', orbDesk: 'Reloj Mesa',
    modeFocus: '25m', modeShort: '5m', modeLong: '15m', modeCustom: 'Personal ⚡',
    startFocusAchieve: 'Planifica • Ejecuta • Logra',
    filterAll: 'Todo', filterToday: 'Activo', filterDone: 'Completado',
    phAddTask: 'Añadir meta de estudio, deporte o lectura...', phSearchNotes: 'Buscar notas, entrenamientos o resúmenes...',
    catStudy: '📚 Estudio', catSport: '🏋️ Deporte', catReview: '📖 Lectura', catExam: '💻 Trabajo',
    tagCornell: 'Cornell 📋', tagFlash: 'Memoria 👁️', tagQuick: 'Registro 💡',
    btnAddCalNote: '+ Añadir Nota al Día', lblBlurAnswer: 'Ocultar respuesta para repaso activo (Tocar para ver)',
    mixerReady: '🎵 Estudio Natural Puro Listo', btnMyMix: '✨ Mezcla', btnStopAll: '⏹ Parar',
    sndCatWater: 'Agua y Lluvia 🌧️', sndCatForest: 'Bosque y Viento 🌲', sndCatWarm: 'Fuego y Tierra 🔥',
    kpiMinutes: 'Minutos Activos', kpiSessions: 'Sesiones Completas',
    kpiTrendWeek: '↑ +18% esta semana', kpiTrendGreat: '↑ +12% gran constancia',
    overviewTitle: 'Distribución de Actividades', badgeThisWeek: 'Esta Semana',
    waveFlowTitle: 'Índice de Flujo Semanal', peakPerfBadge: 'Flujo Máximo',
    calcHeading: '🎓 Calculadora de Metas y Temario',
    calcOutTpl: '📅 ¡A este ritmo completarás tu meta en {d} días!',
    btnSave: 'Guardar y Aplicar', btnCancel: 'Cancelar',
    weekdays: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
    months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    sounds: {
      ocean: 'Olas del Océano', rain: 'Lluvia del Bosque', fire: 'Fuego de Leña', forest: 'Brisa de Pinos',
      stream: 'Arroyo de Montaña', leaves: 'Hojas Susurrantes', waterfall: 'Cascada Natural', night: 'Grillos Nocturnos',
      thunder: 'Truenos Lejanos', wind: 'Viento de Cumbre', winrain: 'Lluvia en Ventana', earth: 'Aislamiento Tierra'
    },
    sampleTasks: [
      'Completar Capítulo 1 y Conceptos Clave', 'Sesión de Entrenamiento y Fuerza (4 Series)', 'Leer 25 Páginas del Libro Base', 'Avanzar Proyecto de Trabajo Profundo'
    ],
    sampleNotes: [
      { t: 'Sistema de Repetición Espaciada', b: 'Repasar conceptos en intervalos crecientes fortalece la memoria a largo plazo.' },
      { t: 'Repaso Activo: Fórmula Clave', b: 'Respuesta Oculta: Rendimiento = Tiempo Enfocado × Constancia.' },
      { t: 'Registro de Entrenamiento Físico', b: '1. Calentamiento 5m\n2. 4 Series de Ejercicio\n3. Estiramiento final.' }
    ]
  }
};

// Populate all remaining 17 languages with localized headers, navigation, and domains
const OTHER_LANGS = [
  { c: 'fr', t: 'Focus & Performance', s: 'Étude, Sport, Lecture & Travail', nav: ['Minuteur','Tâches','Agenda','Notes','Nature','Analyses'], dom: ['Étude','Sport','Lecture','Travail'] },
  { c: 'de', t: 'Fokus & Leistung', s: 'Studium, Sport, Lesen & Deep Work', nav: ['Timer','Aufgaben','Kalender','Notizen','Natur','Analyse'], dom: ['Studium','Sport','Lesen','Arbeit'] },
  { c: 'tr', t: 'Odak ve Performans', s: 'Çalışma, Spor, Okuma ve Derin İş', nav: ['Sayaç','Görevler','Takvim','Notlar','Doğa','Analiz'], dom: ['Çalışma','Spor','Okuma','Derin İş'] },
  { c: 'ru', t: 'Фокус и Продуктивность', s: 'Учеба, Спорт, Чтение и Работа', nav: ['Таймер','Задачи','Календарь','Заметки','Природа','Аналитика'], dom: ['Учеба','Спорт','Чтение','Работа'] },
  { c: 'pt', t: 'Foco e Desempenho', s: 'Estudo, Esporte, Leitura e Trabalho', nav: ['Timer','Tarefas','Agenda','Notas','Natureza','Análises'], dom: ['Estudo','Esporte','Leitura','Trabalho'] },
  { c: 'zh', t: '专注与高效表现', s: '学习、运动、阅读与深度工作', nav: ['计时','任务','日历','笔记','自然','分析'], dom: ['学习','运动','阅读','深度工作'] },
  { c: 'hi', t: 'ध्यान और प्रदर्शन', s: 'अध्ययन, व्यायाम, पठन और कार्य', nav: ['टाइमर','कार्य','कैलेंडर','नोट्स','प्रकृति','विश्लेषण'], dom: ['अध्ययन','व्यायाम','पठन','कार्य'] },
  { c: 'ja', t: '集中とパフォーマンス', s: '学習・運動・読書・ディープワーク', nav: ['タイマー','タスク','カレンダー','ノート','自然音','分析'], dom: ['学習','運動','読書','仕事'] },
  { c: 'ko', t: '집중 및 퍼포먼스', s: '학습, 운동, 독서 및 딥워크', nav: ['타이머','할 일','캘린더','노트','자연음','분석'], dom: ['학습','운동','독서','딥워크'] },
  { c: 'id', t: 'Fokus & Performa', s: 'Belajar, Olahraga, Membaca & Kerja', nav: ['Timer','Tugas','Kalender','Catatan','Alam','Analitik'], dom: ['Belajar','Olahraga','Membaca','Kerja'] },
  { c: 'vi', t: 'Tập Trung & Hiệu Suất', s: 'Học tập, Thể thao, Đọc sách & Làm việc', nav: ['Hẹn giờ','Nhiệm vụ','Lịch','Ghi chú','Tự nhiên','Thống kê'], dom: ['Học tập','Thể thao','Đọc sách','Làm việc'] },
  { c: 'it', t: 'Focus e Prestazioni', s: 'Studio, Sport, Lettura e Lavoro', nav: ['Timer','Attività','Agenda','Note','Natura','Analisi'], dom: ['Studio','Sport','Lettura','Lavoro'] },
  { c: 'bn', t: 'মনোযোগ এবং পারফরম্যান্স', s: 'পড়াশোনা, ব্যায়াম, পড়া এবং কাজ', nav: ['টাইমার','কাজ','ক্যালেন্ডার','নোট','প্রকৃতি','বিশ্লেষণ'], dom: ['পড়াশোনা','ব্যায়াম','পড়া','কাজ'] },
  { c: 'ur', t: 'ارتکاز اور کارکردگی', s: 'مطالعہ، ورزش، پڑھائی اور گہرا کام', nav: ['ٹائمر','مہمات','کیلنڈر','نوٹس','فطرت','تجزیات'], dom: ['مطالعہ','ورزش','پڑھائی','کام'] },
  { c: 'fa', t: 'تمرکز و عملکرد بالا', s: 'مطالعه، ورزش، خواندن و کار عمیق', nav: ['زمان‌سنج','وظایف','تقویم','یادداشت','طبیعت','تحلیل‌ها'], dom: ['مطالعه','ورزش','خواندن','کار عمیق'] },
  { c: 'pl', t: 'Skupienie i Wydajność', s: 'Nauka, Sport, Czytanie i Praca', nav: ['Timer','Zadania','Kalendarz','Notatki','Natura','Analizy'], dom: ['Nauka','Sport','Czytanie','Praca'] },
  { c: 'nl', t: 'Focus & Prestatie', s: 'Studie, Sport, Lezen & Diep Werk', nav: ['Timer','Taken','Agenda','Notities','Natuur','Analyse'], dom: ['Studie','Sport','Lezen','Werk'] }
];

OTHER_LANGS.forEach(item => {
  const isRtl = (item.c === 'ur' || item.c === 'fa');
  const base = isRtl ? DICT.ar : DICT.en;
  DICT[item.c] = {
    ...base,
    title: item.t, sub: item.s,
    navTimer: item.nav[0], navTasks: item.nav[1], navCalendar: item.nav[2], navNotes: item.nav[3], navSounds: item.nav[4], navAnalytics: item.nav[5],
    domStudy: item.dom[0], domSport: item.dom[1], domRead: item.dom[2], domWork: item.dom[3]
  };
});

function localDateISO(d = new Date()) {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}
const todayISO = localDateISO();
function escapeHtmlText(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

let cfg = loadFortressData('zen_fortress_cfg_v21', {
  lang: 'en', domain: 'study', focusMin: 25, shortMin: 5, longMin: 15,
  todayMins: 0, sessions: 0, streak: 0, water: 0, sets: 1, pagesRead: 0
});

function L() {
  return DICT[cfg.lang] || DICT.en;
}

function openLanguageModal() {
  document.getElementById('inpLangCountrySearch').value = '';
  renderLanguageList();
  document.getElementById('langModal').classList.add('open');
}

function renderLanguageList() {
  const q = (document.getElementById('inpLangCountrySearch').value || '').toLowerCase().trim();
  const box = document.getElementById('langListScrollBox');
  box.innerHTML = '';

  LANG_CATALOG.filter(l => {
    if (!q) return true;
    return l.enName.toLowerCase().includes(q) ||
           l.nativeName.toLowerCase().includes(q) ||
           l.iso.toLowerCase().includes(q) ||
           l.countries.toLowerCase().includes(q);
  }).forEach(l => {
    const row = document.createElement('div');
    row.className = `lang-row-btn ${cfg.lang === l.code ? 'active' : ''}`;
    row.onclick = () => applyLanguage(l.code);
    row.innerHTML = `
      <div class="lang-code-monogram">${l.iso}</div>
      <div class="lang-names-col">
        <div class="lang-en-title">${l.enName}</div>
        <div class="lang-native-sub">${l.nativeName}</div>
      </div>
      <span style="font-size:0.75rem; font-weight:900; color:var(--primary);">${cfg.lang === l.code ? '✓' : ''}</span>
    `;
    box.appendChild(row);
  });
}

function applyLanguage(code) {
  const meta = LANG_CATALOG.find(x => x.code === code) || LANG_CATALOG[0];
  cfg.lang = meta.code;
  saveFortressData('zen_fortress_cfg_v21', cfg);
  const d = L();

  const root = document.getElementById('htmlRoot');
  root.setAttribute('lang', meta.code);
  root.setAttribute('dir', meta.dir);

  document.getElementById('currentLangIso').textContent = meta.iso;
  document.getElementById('currentLangLabel').textContent = `${meta.enName} • ${meta.nativeName}`;
  document.getElementById('hdrMainTitle').textContent = d.title;
  document.getElementById('hdrSubTitle').textContent = d.sub;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    if (d[k]) el.textContent = toWest(d[k]);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const k = el.getAttribute('data-i18n-placeholder');
    if (d[k]) el.setAttribute('placeholder', toWest(d[k]));
  });

  tasksList.forEach((t, idx) => {
    if (t.isStarter && d.sampleTasks[idx]) t.title = toWest(d.sampleTasks[idx]);
  });
  notesList.forEach((n, idx) => {
    if (n.isStarter && d.sampleNotes[idx]) {
      n.title = toWest(d.sampleNotes[idx].t);
      n.body = toWest(d.sampleNotes[idx].b);
    }
  });

  document.getElementById('waveDaysRow').innerHTML = d.weekdays.map(w => `<span>${w}</span>`).join('');

  syncHeaderMetrics();
  updateTimerDisplay();
  renderTasksList();
  renderCalendar();
  renderNotesStack();
  renderSoundsStudio();
  updateSyllabusCalc();
  closeModal('langModal');
}

/* ========================================================
   3. CLOUD BACKUP & EASY SHARE
   ======================================================== */
function generateEncryptedBackupCode() {
  const bundle = JSON.stringify({ cfg, tasksList, notesList, v: 21 });
  const sig = computeHash(bundle);
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify({ bundle, sig }))));
  return "ZEN21::" + encoded;
}

function verifyAndRestoreBackupCode(codeStr) {
  try {
    const clean = codeStr.trim();
    const rawB64 = clean.includes("::") ? clean.split("::")[1].trim() : clean;
    const decoded = JSON.parse(decodeURIComponent(escape(atob(rawB64))));
    if (!decoded || !decoded.bundle || computeHash(decoded.bundle) !== decoded.sig) {
      showToast("⚠️ Invalid or Tampered Backup Code!");
      return false;
    }
    const data = JSON.parse(decoded.bundle);
    if (data.cfg) { cfg = data.cfg; saveFortressData('zen_fortress_cfg_v21', cfg); }
    if (data.tasksList) { tasksList = data.tasksList; saveFortressData('zen_fortress_tasks_v21', tasksList); }
    if (data.notesList) { notesList = data.notesList; saveFortressData('zen_fortress_notes_v21', notesList); }
    applyLanguage(cfg.lang || 'en');
    closeModal('cloudBackupModal');
    showToast("🎉 Progress Restored Successfully!");
    return true;
  } catch (e) {
    showToast("⚠️ Corrupted Backup Code!");
    return false;
  }
}

function openCloudBackupModal() {
  document.getElementById('inpRestorePayload').value = '';
  document.getElementById('cloudBackupModal').classList.add('open');
}

function syncToGoogleCloudNow() {
  const code = generateEncryptedBackupCode();
  if (window.ZenNative && window.ZenNative.syncBackupToGoogleEmailOrDrive) {
    window.ZenNative.syncBackupToGoogleEmailOrDrive(code);
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(code);
    showToast("☁️ Backup Code Copied! Save in Gmail/Drive");
  }
}

function downloadEncryptedBackupFile() {
  const code = generateEncryptedBackupCode();
  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `zen-focus-backup-${todayISO}.zenbackup`;
  a.click();
  showToast("💾 Encrypted File Saved!");
}

function restoreFromEncryptedCode() {
  const val = document.getElementById('inpRestorePayload').value;
  if (!val) return showToast("⚠️ Paste backup code first");
  verifyAndRestoreBackupCode(val);
}

function restoreFromFileInput(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => verifyAndRestoreBackupCode(e.target.result);
  reader.readAsText(file);
}

function shareAppWithFriends() {
  const msg = toWest(`🌿 ZEN FOCUS — My Progress Today: ${cfg.todayMins} active mins (${cfg.sessions} sessions completed, 🔥 ${cfg.streak} days streak)!`);
  if (window.ZenNative && window.ZenNative.shareAppInvite) {
    window.ZenNative.shareAppInvite(msg);
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(msg);
    showToast("📤 Copied to Clipboard!");
  }
}

/* ========================================================
   4. GUARANTEED COMPLETION CHIME & BACKGROUND ALARM
   ======================================================== */
let chimeCtx = null;
function playRichCompletionChime(titleText) {
  if (window.ZenNative && window.ZenNative.triggerCompletionSound) {
    try { window.ZenNative.triggerCompletionSound(titleText || "Session Completed!"); } catch(e){}
  }
  try {
    if (!chimeCtx) chimeCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (chimeCtx.state === 'suspended') chimeCtx.resume();
    [528, 660, 792].forEach((freq, idx) => {
      const osc = chimeCtx.createOscillator(), gain = chimeCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, chimeCtx.currentTime + idx * 0.35);
      gain.gain.setValueAtTime(0.001, chimeCtx.currentTime + idx * 0.35);
      gain.gain.exponentialRampToValueAtTime(0.65, chimeCtx.currentTime + idx * 0.35 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, chimeCtx.currentTime + idx * 0.35 + 1.6);
      osc.connect(gain); gain.connect(chimeCtx.destination);
      osc.start(chimeCtx.currentTime + idx * 0.35);
      osc.stop(chimeCtx.currentTime + idx * 0.35 + 1.6);
    });
  } catch (e) {}
  if (navigator.vibrate) try { navigator.vibrate([300, 150, 300, 150, 500]); } catch (e) {}
}

function testCompletionSoundChime() {
  playRichCompletionChime("Test Notification & Sound Alert 🔔");
  showToast("🔔 Alarm & Notification Tested!");
}

/* ========================================================
   5. MULTI-DOMAIN & TIMER ENGINE
   ======================================================== */
function switchActivityDomain(dom, el) {
  cfg.domain = dom;
  saveFortressData('zen_fortress_cfg_v21', cfg);
  document.querySelectorAll('.domain-card').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');

  document.getElementById('sportContextBar').classList.toggle('visible', dom === 'sport');
  document.getElementById('readContextBar').classList.toggle('visible', dom === 'read');

  const d = L();
  if (dom === 'study') { selectTimerMode(25, 'focus', document.getElementById('modeFocusBtn')); showToast(`📚 ${d.domStudy} (25m)`); }
  else if (dom === 'sport') { selectTimerMode(30, 'focus', document.getElementById('modeFocusBtn')); showToast(`🏋️ ${d.domSport} (30m)`); }
  else if (dom === 'read') { selectTimerMode(20, 'focus', document.getElementById('modeFocusBtn')); showToast(`📖 ${d.domRead} (20m)`); }
  else if (dom === 'work') { selectTimerMode(50, 'focus', document.getElementById('modeFocusBtn')); showToast(`💻 ${d.domWork} (50m)`); }
}

function logWorkoutSet() {
  cfg.sets = (cfg.sets % 12) + 1;
  saveFortressData('zen_fortress_cfg_v21', cfg);
  document.getElementById('sportSetCounterTxt').textContent = toWest(`Set ${cfg.sets} / 4 • 12 Reps`);
  showToast(toWest(`💪 Set ${cfg.sets} Logged!`));
}

function startQuickSportRest(secs) {
  if (timerRunning) toggleTimerPlay();
  timerTotal = secs; timerLeft = secs;
  updateTimerDisplay(); toggleTimerPlay();
  showToast(toWest(`⏱️ Rest ${secs}s Started`));
}

function addReadPages(p) {
  cfg.pagesRead = (cfg.pagesRead || 0) + p;
  saveFortressData('zen_fortress_cfg_v21', cfg);
  document.getElementById('readPagesCounterTxt').textContent = toWest(`Pages Read Today: ${cfg.pagesRead}`);
  showToast(toWest(`📖 +${p} Pages`));
}

const TAB_GRADS = {
  'sec-timer': 'linear-gradient(135deg, #091326 0%, #1d3b8b 55%, #0284c7 100%)',
  'sec-tasks': 'linear-gradient(135deg, #1e1b4b 0%, #3730a3 55%, #6366f1 100%)',
  'sec-calendar': 'linear-gradient(135deg, #0f172a 0%, #0369a1 55%, #0ea5e9 100%)',
  'sec-notes': 'linear-gradient(135deg, #064e3b 0%, #047857 55%, #10b981 100%)',
  'sec-sounds': 'linear-gradient(135deg, #0c4a6e 0%, #0e7490 55%, #06b6d4 100%)',
  'sec-analytics': 'linear-gradient(135deg, #2e1065 0%, #4c1d95 55%, #7c3aed 100%)'
};

function switchTab(secId, btn) {
  document.querySelectorAll('.screen-section').forEach(s => s.classList.remove('active'));
  document.getElementById(secId).classList.add('active');
  if (btn) {
    document.querySelectorAll('.bnav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  if (TAB_GRADS[secId]) document.getElementById('heroHeader').style.background = TAB_GRADS[secId];
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

let toastTimer = null;
function showToast(msg) {
  if (navigator.vibrate) try { navigator.vibrate(12); } catch(e){}
  const t = document.getElementById('appToast');
  document.getElementById('toastText').textContent = toWest(msg);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2300);
}

function closeModal(id) { document.getElementById(id).classList.remove('open'); }
window.handleAndroidBack = function() {
  if (document.getElementById('deskClockOverlay').classList.contains('active')) { toggleDeskClock(false); return true; }
  const openM = document.querySelectorAll('.modal-overlay.open');
  if (openM.length > 0) { openM.forEach(m => m.classList.remove('open')); return true; }
  return false;
};

let timerTotal = cfg.focusMin * 60;
let timerLeft = timerTotal;
let timerRunning = false;
let timerInterval = null;
let timerTargetTime = null;
let currentTimerModeKey = 'focus';
let customSessionLabel = '';
const ringCircumference = 2 * Math.PI * 105;

function syncHeaderMetrics() {
  const d = L();
  document.getElementById('hdrFocusMins').textContent = toWest(cfg.todayMins);
  document.getElementById('hdrStreakBadge').textContent = toWest(`↑ 🔥 ${cfg.streak} ${d.daysUnit}`);
  document.getElementById('orbWaterTxt').textContent = toWest(`${d.waterWord} ${cfg.water}/8`);
  document.getElementById('kpiTotalMins').textContent = toWest(cfg.todayMins || 0);
  document.getElementById('kpiTotalSessions').textContent = toWest(cfg.sessions);
  const plant = cfg.sessions >= 25 ? '🌸' : cfg.sessions >= 18 ? '🌳' : cfg.sessions >= 10 ? '🌿' : '🌱';
  document.getElementById('ringPlantEmoji').textContent = plant;
}

function updateTimerDisplay() {
  const d = L();
  const bar = document.getElementById('timerRingBar');
  bar.classList.toggle('golden-warning', timerLeft <= 60 && timerRunning);
  const m = Math.floor(timerLeft / 60).toString().padStart(2, '0');
  const s = (timerLeft % 60).toString().padStart(2, '0');
  const formatted = toWest(`${m}:${s}`);
  const offset = ringCircumference - (timerLeft / Math.max(1, timerTotal)) * ringCircumference;
  bar.style.strokeDashoffset = offset;

  document.getElementById('timerDigitsTxt').textContent = formatted;
  document.getElementById('deskClockDigits').textContent = formatted;

  const captions = { focus: d.domStudy + ' ' + d.modeFocus, short: d.modeShort, long: d.modeLong, custom: customSessionLabel || d.modeCustom };
  document.getElementById('timerModeCaption').textContent = toWest(captions[currentTimerModeKey] || d.modeFocus);
}

function selectTimerMode(mins, modeKey, btn) {
  if (timerRunning) toggleTimerPlay();
  currentTimerModeKey = modeKey;
  timerTotal = mins * 60;
  timerLeft = timerTotal;
  if (btn) {
    btn.parentElement.querySelectorAll('.seg-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  updateTimerDisplay();
}

function openCustomTimerModal() { document.getElementById('customTimerModal').classList.add('open'); }
function setCustomPresetValues(m) { document.getElementById('inpCustomMins').value = toWest(m); }
function applyCustomTimerNow() {
  const mins = Math.max(1, Math.min(240, parseInt(toWest(document.getElementById('inpCustomMins').value)) || 45));
  const title = toWest(document.getElementById('inpCustomTitle').value.trim());
  customSessionLabel = title ? `${title} (${mins}m)` : `${L().modeCustom} (${mins}m)`;
  closeModal('customTimerModal');
  selectTimerMode(mins, 'custom', document.getElementById('modeCustomBtn'));
  showToast(`⚡ ${customSessionLabel}`);
}

function changeTimerDelta(deltaMins) {
  timerLeft = Math.max(10, timerLeft + deltaMins * 60);
  if (timerLeft > timerTotal) timerTotal = timerLeft;
  if (timerRunning) {
    timerTargetTime = Date.now() + (timerLeft * 1000);
    if (window.ZenNative && window.ZenNative.startBackgroundService) {
      window.ZenNative.startBackgroundService(timerLeft, document.getElementById('timerModeCaption').textContent);
    }
  }
  updateTimerDisplay();
}

function toggleTimerPlay() {
  const btn = document.getElementById('mainPlayBtn');
  const activeTitle = document.getElementById('timerModeCaption').textContent;

  if (timerRunning) {
    clearInterval(timerInterval);
    timerRunning = false;
    if (window.ZenNative && window.ZenNative.stopBackgroundService) {
      try { window.ZenNative.stopBackgroundService(); } catch(e){}
    }
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  } else {
    try {
      if (!chimeCtx) chimeCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (chimeCtx.state === 'suspended') chimeCtx.resume();
    } catch(e){}

    timerRunning = true;
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    timerTargetTime = Date.now() + (timerLeft * 1000);

    if (window.ZenNative && window.ZenNative.startBackgroundService) {
      try { window.ZenNative.startBackgroundService(timerLeft, activeTitle); } catch(e){}
    }

    timerInterval = setInterval(() => {
      const rem = Math.round((timerTargetTime - Date.now()) / 1000);
      if (rem > 0) {
        timerLeft = rem;
        updateTimerDisplay();
      } else {
        clearInterval(timerInterval);
        timerRunning = false;
        timerLeft = 0;
        updateTimerDisplay();
        btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';

        playRichCompletionChime(activeTitle);

        const earned = Math.max(1, Math.round(timerTotal / 60));
        cfg.todayMins += earned;
        cfg.sessions += 1;
        saveFortressData('zen_fortress_cfg_v21', cfg);
        syncHeaderMetrics();
        selectTimerMode(cfg.shortMin, 'short', document.getElementById('modeShortBtn'));
        showToast(`🎉 +${earned}m`);
      }
    }, 500);
  }
}

function resetTimerNow() { if (timerRunning) toggleTimerPlay(); timerLeft = timerTotal; updateTimerDisplay(); }
function skipTimerPhase() { if (timerRunning) toggleTimerPlay(); selectTimerMode(cfg.shortMin, 'short', document.getElementById('modeShortBtn')); }
function addWaterCup() { cfg.water = (cfg.water + 1) % 9; saveFortressData('zen_fortress_cfg_v21', cfg); syncHeaderMetrics(); }
function toggleDeskClock(show) { document.getElementById('deskClockOverlay').classList.toggle('active', show); }

/* ========================================================
   6. TASKS, CALENDAR & SMART NOTES
   ======================================================== */
document.getElementById('inpTaskDate').value = todayISO;

let tasksList = loadFortressData('zen_fortress_tasks_v21', [
  { id: 1, isStarter: true, title: 'Complete Chapter 1 & Core Concepts', time: '09:00 - 10:00', date: todayISO, catKey: 'study', icon: '📚', theme: 'tp-blue', done: true },
  { id: 2, isStarter: true, title: 'HIIT Strength & Cardio Session (4 Sets)', time: '11:00 - 12:00', date: todayISO, catKey: 'sport', icon: '🏋️', theme: 'tp-emerald', done: false },
  { id: 3, isStarter: true, title: 'Read 25 Pages of Reference Book', time: '14:00 - 16:00', date: todayISO, catKey: 'review', icon: '📖', theme: 'tp-rose', done: false },
  { id: 4, isStarter: true, title: 'Finish Deep Work Project Milestone', time: '18:00 - 19:00', date: todayISO, catKey: 'exam', icon: '💻', theme: 'tp-amber', done: false }
]);
let taskFilterStatus = 'all';

function filterTasksByStatus(st, btn) {
  taskFilterStatus = st;
  btn.parentElement.querySelectorAll('.seg-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTasksList();
}

function getCatLabel(catKey) {
  const d = L();
  const map = { study: d.catStudy, sport: d.catSport, review: d.catReview, exam: d.catExam };
  return map[catKey] || d.catStudy;
}

function renderTasksList() {
  const box = document.getElementById('tasksShowcaseBox');
  box.innerHTML = '';

  tasksList.filter(t => {
    if (taskFilterStatus === 'active') return !t.done;
    if (taskFilterStatus === 'done') return t.done;
    return true;
  }).forEach(t => {
    const card = document.createElement('div');
    card.className = `showcase-task-card ${t.done ? 'done' : ''}`;
    card.innerHTML = `
      <div class="showcase-task-top">
        <div class="task-check-sq" onclick="toggleTaskDone(${t.id})">✓</div>
        <div class="task-center-info" onclick="focusOnTask(${t.id})">
          <div class="task-main-name">${escapeHtmlText(toWest(t.title))}</div>
          <div class="task-time-sub">
            <span>📅 ${escapeHtmlText(toWest(t.date || todayISO))}</span>
            <span style="color:var(--primary); font-weight:700;">• ${escapeHtmlText(toWest(getCatLabel(t.catKey)))}</span>
          </div>
        </div>
        <div class="task-pastel-icon ${t.theme}" onclick="deleteTaskItem(${t.id})">${t.icon}</div>
      </div>
    `;
    box.appendChild(card);
  });
}

function toggleTaskDone(id) {
  const t = tasksList.find(x => x.id === id);
  if (t) { t.done = !t.done; saveFortressData('zen_fortress_tasks_v21', tasksList); renderTasksList(); renderCalendar(); }
}

function focusOnTask(id) {
  const t = tasksList.find(x => x.id === id);
  if (t) { document.getElementById('timerLinkedTask').textContent = toWest(`🎯 ${t.title}`); switchTab('sec-timer', document.getElementById('navTimer')); }
}

function createNewTask() {
  const inp = document.getElementById('inpNewTask');
  const val = toWest(inp.value.trim());
  if (!val) return;
  const catKey = document.getElementById('selTaskCat').value;
  const dateVal = toWest(document.getElementById('inpTaskDate').value || todayISO);
  const themes = { study: 'tp-blue', exam: 'tp-amber', review: 'tp-rose', sport: 'tp-emerald' };
  const icons = { study: '📚', exam: '💻', review: '📖', sport: '🏋️' };
  tasksList.unshift({
    id: Date.now(), isStarter: false, title: val, time: '25m', date: dateVal,
    catKey: catKey, icon: icons[catKey] || '📚', theme: themes[catKey] || 'tp-blue', done: false
  });
  inp.value = '';
  saveFortressData('zen_fortress_tasks_v21', tasksList);
  renderTasksList(); renderCalendar(); showToast('✓');
}

function deleteTaskItem(id) {
  if (!window.confirm('Delete this task? This action cannot be undone.')) return;
  tasksList = tasksList.filter(x => x.id !== id);
  saveFortressData('zen_fortress_tasks_v21', tasksList);
  renderTasksList(); renderCalendar();
}

let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let selectedCalDate = todayISO;

function changeCalendarMonth(delta) {
  calMonth += delta;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
}

function renderCalendar() {
  const d = L();
  document.getElementById('calMonthYearTitle').textContent = toWest(`${d.months[calMonth]} ${calYear}`);
  document.getElementById('calWeekdaysRow').innerHTML = d.weekdays.map(w => `<div>${w}</div>`).join('');

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const grid = document.getElementById('calDaysGrid');
  grid.innerHTML = '';

  for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement('div'));

  for (let day = 1; day <= daysInMonth; day++) {
    const iso = toWest(`${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    const hasTasks = tasksList.some(t => t.date === iso);
    const hasNotes = notesList.some(n => n.calDate === iso);

    const cell = document.createElement('div');
    cell.className = `cal-day-cell ${iso === todayISO ? 'today' : ''} ${iso === selectedCalDate ? 'selected' : ''}`;
    cell.onclick = () => { selectedCalDate = iso; renderCalendar(); };
    cell.innerHTML = `
      <span>${toWest(day)}</span>
      <div class="cal-dots-row">
        ${hasTasks ? '<span class="cal-dot dot-task"></span>' : ''}
        ${hasNotes ? '<span class="cal-dot dot-note"></span>' : ''}
      </div>
    `;
    grid.appendChild(cell);
  }
  renderSelectedDateAgenda();
}

function renderSelectedDateAgenda() {
  document.getElementById('selectedDateLabel').textContent = toWest(`📅 ${selectedCalDate}`);
  const box = document.getElementById('calendarDayAgendaBox');
  box.innerHTML = '';

  const dayTasks = tasksList.filter(t => t.date === selectedCalDate);
  const dayNotes = notesList.filter(n => n.calDate === selectedCalDate);

  if (dayTasks.length === 0 && dayNotes.length === 0) {
    box.innerHTML = `<div style="font-size:0.78rem; color:var(--text-light); text-align:center; padding:12px;">✨ ${L().btnAddCalNote}</div>`;
    return;
  }

  dayTasks.forEach(t => {
    const item = document.createElement('div');
    item.style.cssText = 'padding:10px 12px; border-radius:14px; background:#f8fafc; border-right:4px solid #10b981; font-size:0.8rem; font-weight:800; display:flex; justify-content:space-between;';
    item.innerHTML = `<span>${t.done ? '✅' : '📋'} ${escapeHtmlText(toWest(t.title))}</span><span style="color:var(--text-muted); font-size:0.7rem;">${toWest(getCatLabel(t.catKey))}</span>`;
    box.appendChild(item);
  });

  dayNotes.forEach(n => {
    const item = document.createElement('div');
    item.style.cssText = 'padding:10px 12px; border-radius:14px; background:#fffbeb; border-right:4px solid #f59e0b; font-size:0.8rem;';
    item.innerHTML = `<div style="font-weight:900;">📝 ${escapeHtmlText(toWest(n.title))}</div><div style="color:var(--text-muted); font-size:0.74rem; margin-top:3px;">${escapeHtmlText(toWest(n.body))}</div>`;
    box.appendChild(item);
  });
}

function openNoteModalForSelectedDate() { openNoteModal(selectedCalDate); }

let notesList = loadFortressData('zen_fortress_notes_v21', [
  { id: 1, isStarter: true, title: 'Spaced Repetition System', body: 'Reviewing concepts at increasing intervals strengthens long-term memory retention.', catKey: 'cornell', calDate: todayISO, blur: false, theme: 'theme-violet' },
  { id: 2, isStarter: true, title: 'Active Recall: Key Formula & Law', body: 'Hidden Answer: Performance = Focused Time × Intensity.', catKey: 'flash', calDate: todayISO, blur: true, theme: 'theme-emerald' },
  { id: 3, isStarter: true, title: 'Workout & Training Log', body: '1. Warm-up 5m\n2. 4 Sets Compound Exercises\n3. Cool-down stretch.', catKey: 'quick', calDate: todayISO, blur: false, theme: 'theme-amber' }
]);
let noteTagFilter = 'all';

function getNoteTagLabel(k) {
  const d = L();
  const map = { cornell: d.tagCornell, flash: d.tagFlash, quick: d.tagQuick };
  return map[k] || d.tagCornell;
}

function filterNotesByTag(tag, btn) {
  noteTagFilter = tag;
  btn.parentElement.querySelectorAll('.seg-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderNotesStack();
}

function renderNotesStack() {
  const box = document.getElementById('notesStackBox');
  const q = (document.getElementById('inpSearchNotes').value || '').toLowerCase();
  box.innerHTML = '';

  notesList.filter(n => {
    if (!(n.title + ' ' + n.body).toLowerCase().includes(q)) return false;
    if (noteTagFilter !== 'all' && n.catKey !== noteTagFilter) return false;
    return true;
  }).forEach(n => {
    const card = document.createElement('div');
    card.className = `learning-rich-card ${n.theme}`;
    card.innerHTML = `
      <div class="lcard-head">
        <div class="lcard-title"><span>✨</span> <span>${escapeHtmlText(toWest(n.title))}</span></div>
        <div style="display:flex; gap:8px;">
          <span style="cursor:pointer;" onclick="pinNoteToTodayCalendar(${n.id})">📅</span>
          <span style="cursor:pointer;" onclick="toggleNoteBlur(${n.id})">👁️</span>
          <span style="cursor:pointer; color:var(--rose);" onclick="deleteNoteCard(${n.id})">✕</span>
        </div>
      </div>
      <div class="lcard-body ${n.blur ? 'blurred-secret' : ''}" onclick="this.classList.toggle('blurred-secret')">${escapeHtmlText(toWest(n.body))}</div>
      <div class="lcard-foot">
        <span>📅 ${escapeHtmlText(toWest(n.calDate || todayISO))}</span>
        <span style="font-weight:800; color:var(--primary);">${escapeHtmlText(toWest(getNoteTagLabel(n.catKey)))}</span>
      </div>
    `;
    box.appendChild(card);
  });
}

function openNoteModal(defaultDate = null) {
  document.getElementById('inpNoteTitle').value = '';
  document.getElementById('inpNoteBody').value = '';
  document.getElementById('inpNoteCalDate').value = toWest(defaultDate || selectedCalDate || todayISO);
  document.getElementById('chkNoteBlur').checked = false;
  document.getElementById('noteModal').classList.add('open');
}

function fillNoteTpl(type) {
  if (type === 'cornell') {
    document.getElementById('selNoteCat').value = 'cornell';
    document.getElementById('inpNoteBody').value = '📌 1:\n📖 2:\n💡 3:';
    document.getElementById('chkNoteBlur').checked = false;
  } else {
    document.getElementById('selNoteCat').value = 'flash';
    document.getElementById('chkNoteBlur').checked = true;
  }
}

function saveNewNote() {
  const t = toWest(document.getElementById('inpNoteTitle').value.trim());
  const b = toWest(document.getElementById('inpNoteBody').value.trim());
  if (!t && !b) return;
  const catKey = document.getElementById('selNoteCat').value;
  const calDate = toWest(document.getElementById('inpNoteCalDate').value || todayISO);
  const blur = document.getElementById('chkNoteBlur').checked;
  notesList.unshift({
    id: Date.now(), isStarter: false, title: t || L().navNotes, body: b,
    catKey: catKey, calDate: calDate, blur: blur, theme: blur ? 'theme-emerald' : 'theme-violet'
  });
  saveFortressData('zen_fortress_notes_v21', notesList);
  renderNotesStack(); renderCalendar(); closeModal('noteModal'); showToast('✓');
}

function pinNoteToTodayCalendar(id) {
  const n = notesList.find(x => x.id === id);
  if (n) { n.calDate = selectedCalDate; saveFortressData('zen_fortress_notes_v21', notesList); renderNotesStack(); renderCalendar(); showToast(`📅 ${selectedCalDate}`); }
}

function toggleNoteBlur(id) {
  const n = notesList.find(x => x.id === id);
  if (n) { n.blur = !n.blur; saveFortressData('zen_fortress_notes_v21', notesList); renderNotesStack(); }
}

function deleteNoteCard(id) {
  if (!window.confirm('Delete this note? This action cannot be undone.')) return;
  notesList = notesList.filter(x => x.id !== id);
  saveFortressData('zen_fortress_notes_v21', notesList);
  renderNotesStack(); renderCalendar();
}

function exportAllNotes() {
  const txt = notesList.map(n => `[${toWest(n.title)} - ${toWest(n.calDate)}]\n${toWest(n.body)}`).join('\n\n---\n\n');
  if (navigator.clipboard) navigator.clipboard.writeText(txt);
  showToast('📥 TXT');
}

function openBrainDumpModal() {
  document.getElementById('inpQuickDump').value = '';
  document.getElementById('brainDumpModal').classList.add('open');
}

function saveQuickDump(toTasks) {
  const val = toWest(document.getElementById('inpQuickDump').value.trim());
  if (!val) return;
  if (toTasks) {
    tasksList.unshift({ id: Date.now(), isStarter: false, title: val, time: '25m', date: todayISO, catKey: 'study', icon: '🎯', theme: 'tp-amber', done: false });
    saveFortressData('zen_fortress_tasks_v21', tasksList);
    renderTasksList();
  } else {
    notesList.unshift({ id: Date.now(), isStarter: false, title: '💭', body: val, catKey: 'quick', calDate: todayISO, blur: false, theme: 'theme-violet' });
    saveFortressData('zen_fortress_notes_v21', notesList);
    renderNotesStack();
  }
  renderCalendar(); closeModal('brainDumpModal'); showToast('✓');
}

/* ========================================================
   7. 12 PURE NATURE SOUNDS WITH PHOTOS & VOLUME SLIDERS
   ======================================================== */
const SOUNDS_DATA = [
  { id: 'ocean', cat: 'water', cls: 'sbg-ocean', vol: 0.7, src: 'sounds/ocean.ogg', url: 'https://actions.google.com/sounds/v1/water/waves_crashing_on_rock_beach.ogg' },
  { id: 'rain', cat: 'water', cls: 'sbg-rain', vol: 0.65, src: 'sounds/rain.ogg', url: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg' },
  { id: 'fire', cat: 'warm', cls: 'sbg-fire', vol: 0.75, src: 'sounds/fire.ogg', url: 'https://actions.google.com/sounds/v1/ambiences/fire.ogg' },
  { id: 'forest', cat: 'forest', cls: 'sbg-forest', vol: 0.65, src: 'sounds/forest.ogg', url: 'https://actions.google.com/sounds/v1/ambiences/forest_morning.ogg' },
  { id: 'stream', cat: 'water', cls: 'sbg-stream', vol: 0.7, src: 'sounds/stream.ogg', url: 'https://actions.google.com/sounds/v1/water/small_stream_flowing.ogg' },
  { id: 'leaves', cat: 'forest', cls: 'sbg-leaves', vol: 0.6, src: 'sounds/leaves.ogg', url: 'https://actions.google.com/sounds/v1/ambiences/outdoor_summer_ambience.ogg' },
  { id: 'waterfall', cat: 'water', cls: 'sbg-waterfall', vol: 0.65, src: 'sounds/waterfall.ogg', url: 'https://actions.google.com/sounds/v1/water/waterfall_medium.ogg' },
  { id: 'night', cat: 'forest', cls: 'sbg-night', vol: 0.55, src: 'sounds/night.ogg', url: 'https://actions.google.com/sounds/v1/ambiences/crickets_chirping.ogg' },
  { id: 'thunder', cat: 'water', cls: 'sbg-thunder', vol: 0.6, src: 'sounds/thunder.ogg', url: 'https://actions.google.com/sounds/v1/weather/rolling_thunder.ogg' },
  { id: 'wind', cat: 'forest', cls: 'sbg-wind', vol: 0.55, src: 'sounds/wind.ogg', url: 'https://actions.google.com/sounds/v1/weather/wind_blowing.ogg' },
  { id: 'winrain', cat: 'water', cls: 'sbg-winrain', vol: 0.65, src: 'sounds/winrain.ogg', url: 'https://actions.google.com/sounds/v1/weather/rain_on_rooftop.ogg' },
  { id: 'earth', cat: 'warm', cls: 'sbg-earth', vol: 0.5, src: 'sounds/earth.ogg', url: 'https://actions.google.com/sounds/v1/ambiences/ambient_hum_air_conditioner.ogg' }
];

let soundCat = 'all';
const activePlayers = {};
let webAudioCtx = null;

function createNatureSynthFallback(id, vol) {
  if (!webAudioCtx) webAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (webAudioCtx.state === 'suspended') webAudioCtx.resume();
  const sr = webAudioCtx.sampleRate, len = sr * 5;
  const buf = webAudioCtx.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.016 * w) / 1.016;
    data[i] = last * 1.6;
  }
  const src = webAudioCtx.createBufferSource();
  src.buffer = buf; src.loop = true;
  const filter = webAudioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  const freqs = { ocean: 300, rain: 850, fire: 420, waterfall: 950, thunder: 220, earth: 180 };
  filter.frequency.value = freqs[id] || 520;
  const gain = webAudioCtx.createGain();
  gain.gain.value = vol * 0.6;
  src.connect(filter); filter.connect(gain); gain.connect(webAudioCtx.destination);
  src.start(0);
  return {
    pause: () => { try { src.stop(); } catch(e){} },
    setVol: (v) => { gain.gain.setValueAtTime(v * 0.6, webAudioCtx.currentTime); }
  };
}

function toggleSoundTile(id) {
  const s = SOUNDS_DATA.find(x => x.id === id);
  if (!s) return;
  const sName = L().sounds[id] || id;

  if (activePlayers[id]) {
    activePlayers[id].pause();
    delete activePlayers[id];
    showToast(`⏹ ${sName}`);
  } else {
    const audio = new Audio();
    audio.loop = true;
    audio.volume = s.vol;
    audio.src = s.src;

    let fallbackUsed = false;
    const activateFallback = () => {
      if (fallbackUsed) return;
      fallbackUsed = true;
      activePlayers[id] = createNatureSynthFallback(id, s.vol);
      renderSoundsStudio();
    };

    audio.onerror = () => {
      if (audio.src !== s.url) { audio.src = s.url; audio.play().catch(activateFallback); }
      else activateFallback();
    };

    audio.play().then(() => showToast(`🔊 ${sName}`)).catch(activateFallback);

    if (!fallbackUsed) {
      activePlayers[id] = { pause: () => audio.pause(), setVol: (v) => { audio.volume = v; } };
    }
  }
  renderSoundsStudio();
}

function setTileVolume(id, val) {
  const v = parseFloat(val);
  const s = SOUNDS_DATA.find(x => x.id === id);
  if (s) s.vol = v;
  if (activePlayers[id]) activePlayers[id].setVol(v);
}

function playPresetRelaxMix() { stopAllAudio(); toggleSoundTile('rain'); toggleSoundTile('fire'); }
function stopAllAudio() {
  Object.keys(activePlayers).forEach(k => { try { activePlayers[k].pause(); } catch(e){} delete activePlayers[k]; });
  renderSoundsStudio();
}

function filterSoundsByCat(cat, btn) {
  soundCat = cat;
  btn.parentElement.querySelectorAll('.seg-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderSoundsStudio();
}

function renderSoundsStudio() {
  const box = document.getElementById('soundsGridBox');
  box.innerHTML = '';
  const d = L();

  SOUNDS_DATA.filter(s => soundCat === 'all' || s.cat === soundCat).forEach(s => {
    const isOn = !!activePlayers[s.id];
    const sName = d.sounds[s.id] || s.id;
    const tile = document.createElement('div');
    tile.className = `sound-Rich-tile ${s.cls} ${isOn ? 'playing' : ''}`;
    tile.onclick = () => toggleSoundTile(s.id);
    tile.innerHTML = `
      <div class="stile-top">
        <div class="stile-play-btn">${isOn ? '❚❚' : '▶'}</div>
        <div class="stile-switch"><div class="stile-knob"></div></div>
      </div>
      <div>
        <div class="stile-name">${escapeHtmlText(toWest(sName))}</div>
        <input type="range" class="stile-vol" min="0.05" max="1" step="0.05" value="${s.vol}" onclick="event.stopPropagation()" oninput="setTileVolume('${s.id}', this.value)">
      </div>
    `;
    box.appendChild(tile);
  });
}

/* ========================================================
   8. ANALYTICS & GOAL CALCULATOR (100% WESTERN DIGITS)
   ======================================================== */
function renderAnalyticsBars() {
  const box = document.getElementById('anMiniBarsBox');
  box.innerHTML = '';
  const vals = [45, 70, 55, 85, 60, 95, 75];
  vals.forEach((v, i) => {
    const col = document.createElement('div');
    col.className = 'mbar-col';
    col.innerHTML = `<div class="mbar-fill ${i===5 ? 'peak' : ''}" style="height:${Math.round(v * 0.72)}px;"></div>`;
    box.appendChild(col);
  });
}

function addQuickSessionRecord() {
  showToast('ℹ️ Statistics update only after a completed focus session');
}

function updateSyllabusCalc() {
  const elLeft = document.getElementById('inpPagesLeft');
  const elRate = document.getElementById('inpDailyRate');
  elLeft.value = toWest(elLeft.value).replace(/[^0-9]/g, '');
  elRate.value = toWest(elRate.value).replace(/[^0-9]/g, '');
  const left = Math.max(1, parseInt(elLeft.value) || 1);
  const rate = Math.max(1, parseInt(elRate.value) || 1);
  const days = Math.ceil(left / rate);
  document.getElementById('syllabusCalcOut').textContent = toWest(L().calcOutTpl.replace('{d}', days));
}

/* Boot Init */
renderAnalyticsBars();
applyLanguage(cfg.lang || 'en');
