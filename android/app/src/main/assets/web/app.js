if (typeof window !== "undefined" && window.DF22Preflight && !window.DF22Preflight.allowApp(localStorage, document)) {
  throw new Error("Deep Focus startup suspended to protect v21 user data");
}
/* ========================================================
   0. STRICT WESTERN DIGITS ENFORCER (0123456789 ONLY)
   ======================================================== */
function toWest(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[٠-٩]/g, d => d.charCodeAt(0) - 1632)
    .replace(/[۰-۹]/g, d => d.charCodeAt(0) - 1776);
}

// Generated durations only; user-authored titles and bodies never pass through this formatter.
function formatDurationUnit(value, unit, lang = cfg.lang) {
  const n = Number(value);
  if (!Number.isFinite(n) || !['minute','second'].includes(unit)) return '';
  try {
    return toWest(new Intl.NumberFormat(lang, {
      style:'unit', unit, unitDisplay:'long', numberingSystem:'latn', maximumFractionDigits:2
    }).format(n));
  } catch (_) {
    const units = {
      en:['minute','minutes','second','seconds'], ar:['دقيقة','دقائق','ثانية','ثوانٍ'],
      es:['minuto','minutos','segundo','segundos'], zh:['分钟','分钟','秒','秒'],
      hi:['मिनट','मिनट','सेकंड','सेकंड'], fr:['minute','minutes','seconde','secondes'],
      de:['Minute','Minuten','Sekunde','Sekunden'], ru:['минута','минут','секунда','секунд'],
      pt:['minuto','minutos','segundo','segundos'], ja:['分','分','秒','秒'],
      id:['menit','menit','detik','detik'], tr:['dakika','dakika','saniye','saniye'],
      ko:['분','분','초','초'], vi:['phút','phút','giây','giây'],
      it:['minuto','minuti','secondo','secondi'], bn:['মিনিট','মিনিট','সেকেন্ড','সেকেন্ড'],
      ur:['منٹ','منٹ','سیکنڈ','سیکنڈ'], fa:['دقیقه','دقیقه','ثانیه','ثانیه'],
      pl:['minuta','minut','sekunda','sekund'], nl:['minuut','minuten','seconde','seconden']
    };
    const code = String(lang).split('-')[0], words = units[code] || units.en;
    const offset = unit === 'minute' ? 0 : 2;
    let label = words[offset + (Math.abs(n) === 1 ? 0 : 1)];
    if (code === 'ar') label = n === 2 ? (unit === 'minute' ? 'دقيقتان' : 'ثانيتان')
      : n >= 3 && n <= 10 ? words[offset+1] : words[offset];
    return toWest(String(n)) + ' ' + label;
  }
}

// Only explicitly marked numeric inputs are normalized. User notes/tasks are immutable text.
document.addEventListener('input', (e) => {
  const field=e.target;
  if (!field || field.tagName !== 'INPUT' || !field.hasAttribute('data-df-numeric-input')) return;
  if (window.DeepFocusAsciiNumeralsV21) window.DeepFocusAsciiNumeralsV21.normalizeNumericInput(field);
  else { const normalized=toWest(field.value); if(field.value!==normalized) field.value=normalized; }
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
  // Legacy single-family write: verify BOTH durable packet copies before acknowledging success.
  // New multi-family Notes/Tasks edits still use DF22Integration's atomic journal.
  const raw = JSON.stringify(obj);
  if (typeof raw !== 'string') throw new Error('STORAGE_VALUE_NOT_SERIALIZABLE');
  const packet = JSON.stringify({payload:raw, sig:computeHash(raw), ts:Date.now()});
  const mirrorKey = key + '_mirror';
  const beforePrimary = localStorage.getItem(key);
  const beforeMirror = localStorage.getItem(mirrorKey);
  try {
    localStorage.setItem(key, packet);
    localStorage.setItem(mirrorKey, packet);
    if (localStorage.getItem(key) !== packet || localStorage.getItem(mirrorKey) !== packet)
      throw new Error('STORAGE_WRITE_NOT_VERIFIED');
    // Prevent later legacy cfg/task/note writes from leaving an older receipt.
    // Auxiliary active-timer keys remain outside this six-slot transaction.
    if (['zen_fortress_cfg_v21','zen_fortress_tasks_v21','zen_fortress_notes_v21'].includes(key) &&
        (typeof window !== 'undefined' && window.ZenNative && (!window.DF22Preflight || !window.DF22Preflight.nativeAcknowledge(localStorage))))
      throw new Error('NATIVE_DURABLE_ACK_FAILED');
    return true;
  } catch (writeError) {
    // A failed mirror write must never leave an unverified new primary as the preferred copy.
    const rollbackErrors = [];
    for (const [name, previous] of [[key, beforePrimary], [mirrorKey, beforeMirror]]) {
      try {
        if (previous === null) localStorage.removeItem(name);
        else localStorage.setItem(name, previous);
        if (localStorage.getItem(name) !== previous) rollbackErrors.push(name);
      } catch (rollbackError) { rollbackErrors.push(name); }
    }
    if (rollbackErrors.length)
      throw new Error('STORAGE_WRITE_FAILED_ROLLBACK_UNVERIFIED:' + rollbackErrors.join(','));
    throw writeError;
  }
}

function loadFortressData(key, defaultObj) {
  const tryRead = k => {
    try {
      const item = localStorage.getItem(k);
      if (!item) return {valid:false};
      const packet = JSON.parse(item);
      if (!packet || typeof packet.payload !== 'string'
          || computeHash(packet.payload) !== packet.sig) return {valid:false};
      return {valid:true, value:JSON.parse(packet.payload)};
    } catch (e) {
      // A corrupt primary must not prevent recovery from its healthy mirror.
      return {valid:false};
    }
  };
  const primary = tryRead(key);
  if (primary.valid) return primary.value;
  const mirror = tryRead(key + '_mirror');
  return mirror.valid ? mirror.value : defaultObj;
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
    pillCloud: 'Manual Backup', pillSound: 'Test Sound', pillShare: 'Share App', pillSecure: 'Local Data',
    domStudy: 'Study', domSport: 'Workout', domRead: 'Reading', domWork: 'Deep Work',
    sportSetsTitle: '🏋️ Workout Sets & Rest', readTrackerTitle: '📖 Reading Session Progress',
    navTimer: 'Timer', navTasks: 'Tasks', navCalendar: 'Calendar', navNotes: 'Notes', navSounds: 'Nature', navAnalytics: 'Analytics',
    totalFocusToday: 'Total Active Minutes Today', minsUnit: 'mins', daysUnit: 'days', waterWord: 'Water',
    orbDump: 'Quick Note', orbCloud: 'Backup Export', orbDesk: 'Desk Clock',
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
    pillCloud: 'نسخة يدوية', pillSound: 'تجربة المنبه', pillShare: 'مشاركة التطبيق', pillSecure: 'بيانات محلية',
    domStudy: 'دراسة', domSport: 'رياضة', domRead: 'قراءة', domWork: 'عمل عميق',
    sportSetsTitle: '🏋️ جولات التمرين والراحة', readTrackerTitle: '📖 متتبع جلسة القراءة',
    navTimer: 'المؤقت', navTasks: 'المهام', navCalendar: 'التقويم', navNotes: 'الملاحظات', navSounds: 'الطبيعة', navAnalytics: 'التحليلات',
    totalFocusToday: 'إجمالي الدقائق النشطة اليوم', minsUnit: 'دقيقة', daysUnit: 'أيام', waterWord: 'الماء',
    orbDump: 'ملاحظة سريعة', orbCloud: 'تصدير نسخة', orbDesk: 'ساعة مكتب',
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
    pillCloud: 'Copia manual', pillSound: 'Probar Sonido', pillShare: 'Compartir', pillSecure: 'Datos locales',
    domStudy: 'Estudio', domSport: 'Deporte', domRead: 'Lectura', domWork: 'Trabajo',
    sportSetsTitle: '🏋️ Series y Descanso', readTrackerTitle: '📖 Progreso de Lectura',
    navTimer: 'Reloj', navTasks: 'Tareas', navCalendar: 'Agenda', navNotes: 'Notas', navSounds: 'Natura', navAnalytics: 'Análisis',
    totalFocusToday: 'Minutos Activos Hoy', minsUnit: 'min', daysUnit: 'días', waterWord: 'Agua',
    orbDump: 'Nota Rápida', orbCloud: 'Exportar copia', orbDesk: 'Reloj Mesa',
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

const EXTRA_NATIVE_LOCALE = {
  zh: 'zh-CN', pt: 'pt-BR', ur: 'ur-PK', bn: 'bn-BD',
  fa: 'fa-IR', hi: 'hi-IN', id: 'id-ID', ja: 'ja-JP', ko: 'ko-KR'
};
const EXTRA_SOUND_IDS = Object.keys(DICT.en.sounds);
OTHER_LANGS.forEach(item => {
  const keys = window.ZEN_LOCALE_FIELD_KEYS || [];
  const row = window.ZEN_LOCALE_ROWS && window.ZEN_LOCALE_ROWS[item.c];
  const extra = window.ZEN_LOCALE_EXTRAS && window.ZEN_LOCALE_EXTRAS[item.c];
  if (!row || row.length !== keys.length || !extra ||
      extra.sounds.length !== EXTRA_SOUND_IDS.length ||
      extra.tasks.length !== 4 || extra.notes.length !== 3) {
    console.error('Incomplete localization pack', item.c);
    // Do not crash the user's existing data if assets are unexpectedly missing.
    DICT[item.c] = DICT.en;
    return;
  }
  const text = Object.fromEntries(keys.map((k, i) => [k, row[i]]));
  const locale = EXTRA_NATIVE_LOCALE[item.c] || item.c;
  const weekdays = Array.from({length: 7}, (_, d) => {
    const date = new Date(Date.UTC(2023, 0, 1 + d, 12));
    return new Intl.DateTimeFormat(locale, {weekday:'short', calendar:'gregory', timeZone:'UTC'}).format(date);
  });
  const months = Array.from({length: 12}, (_, m) => {
    const date = new Date(Date.UTC(2023, m, 1, 12));
    return new Intl.DateTimeFormat(locale, {month:'long', calendar:'gregory', timeZone:'UTC'}).format(date);
  });
  DICT[item.c] = {
    ...text,
    title: item.t, sub: item.s,
    navTimer: item.nav[0], navTasks: item.nav[1], navCalendar: item.nav[2],
    navNotes: item.nav[3], navSounds: item.nav[4], navAnalytics: item.nav[5],
    domStudy: item.dom[0], domSport: item.dom[1],
    domRead: item.dom[2], domWork: item.dom[3],
    modeFocus: '25m', modeShort: '5m', modeLong: '15m',
    weekdays, months,
    sounds: Object.fromEntries(EXTRA_SOUND_IDS.map((key,i) => [key, extra.sounds[i]])),
    sampleTasks: extra.tasks,
    sampleNotes: extra.notes.map(([t,b]) => ({t,b}))
  };
});

function localDateISO(date = new Date()) {
  return [
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}
// Display-only additions to the existing canonical dictionaries; never persisted.
Object.entries({"en": "No reviewed recordings are available in this category yet.", "ar": "لا توجد تسجيلات مكتملة المراجعة في هذه الفئة حاليًا.", "es": "Todavía no hay grabaciones revisadas en esta categoría.", "zh": "此分类暂无审核完成的录音。", "hi": "इस श्रेणी में अभी कोई समीक्षा की गई रिकॉर्डिंग उपलब्ध नहीं है।", "fr": "Aucun enregistrement validé dans cette catégorie pour le moment.", "de": "In dieser Kategorie sind noch keine geprüften Aufnahmen verfügbar.", "ru": "В этой категории пока нет проверенных записей.", "pt": "Ainda não há gravações revisadas nesta categoria.", "ja": "このカテゴリには審査済みの録音がまだありません。", "id": "Belum ada rekaman yang telah ditinjau dalam kategori ini.", "tr": "Bu kategoride henüz incelemesi tamamlanmış kayıt yok.", "ko": "이 카테고리에는 아직 검토가 완료된 녹음이 없습니다.", "vi": "Danh mục này chưa có bản ghi âm đã được kiểm duyệt.", "it": "Non ci sono ancora registrazioni verificate in questa categoria.", "bn": "এই বিভাগে এখনো পর্যালোচিত কোনো রেকর্ডিং নেই।", "ur": "اس زمرے میں ابھی جانچ شدہ ریکارڈنگ دستیاب نہیں ہے۔", "fa": "هنوز ضبط بررسی‌شده‌ای در این دسته موجود نیست.", "pl": "W tej kategorii nie ma jeszcze sprawdzonych nagrań.", "nl": "In deze categorie zijn nog geen gecontroleerde opnamen beschikbaar."}).forEach(([locale,text]) => { DICT[locale].natureNoApproved = text; });

// Shared save-failure text in the existing interface dictionaries; never persisted.
Object.entries({
  "en": "Could not save changes. Try again.",
  "ar": "تعذّر حفظ التغييرات. حاول مجددًا.",
  "es": "No se pudieron guardar los cambios. Inténtalo de nuevo.",
  "zh": "无法保存更改，请重试。",
  "hi": "बदलाव सहेजे नहीं जा सके। फिर कोशिश करें।",
  "fr": "Impossible d’enregistrer les modifications. Réessayez.",
  "de": "Die Änderungen konnten nicht gespeichert werden. Bitte erneut versuchen.",
  "ru": "Не удалось сохранить изменения. Повторите попытку.",
  "pt": "Não foi possível salvar as alterações. Tente novamente.",
  "ja": "変更を保存できませんでした。もう一度お試しください。",
  "id": "Perubahan tidak dapat disimpan. Coba lagi.",
  "tr": "Değişiklikler kaydedilemedi. Yeniden deneyin.",
  "ko": "변경 사항을 저장하지 못했습니다. 다시 시도해 주세요.",
  "vi": "Không thể lưu thay đổi. Vui lòng thử lại.",
  "it": "Impossibile salvare le modifiche. Riprova.",
  "bn": "পরিবর্তনগুলি সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।",
  "ur": "تبدیلیاں محفوظ نہیں ہو سکیں۔ دوبارہ کوشش کریں۔",
  "fa": "ذخیرهٔ تغییرات ممکن نشد. دوباره تلاش کنید.",
  "pl": "Nie udało się zapisać zmian. Spróbuj ponownie.",
  "nl": "De wijzigingen konden niet worden opgeslagen. Probeer het opnieuw."
}).forEach(([locale,text]) => { DICT[locale].saveFailed = text; });

let todayISO = localDateISO();
function escapeHtmlText(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

let cfg = loadFortressData('zen_fortress_cfg_v21', {
  lang: 'en', domain: 'study', focusMin: 25, shortMin: 5, longMin: 15,
  todayMins: 0, sessions: 0, streak: 0, water: 0, sets: 0, pagesRead: 0
});

function acceptedFocusHistory(history) {
  const analytics = window.DeepFocusAnalyticsRecovery;
  // Missing optional analytics cannot turn unvalidated records into focus minutes.
  return analytics && typeof analytics.normalizeSessions === 'function'
    ? analytics.normalizeSessions(history).sessions : null;
}

function computeActualStreak(history, now = new Date()) {
  const accepted = acceptedFocusHistory(history);
  if (!accepted) return Number.isSafeInteger(cfg.streak) && cfg.streak >= 0 ? cfg.streak : 0;
  const days = new Set(
    accepted
      .filter(e => e && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && Number(e.minutes) > 0)
      .map(e => e.date)
  );
  const day = new Date(now);
  day.setHours(12, 0, 0, 0);
  if (!days.has(localDateISO(day))) day.setDate(day.getDate() - 1);
  let count = 0;
  while (count < 10000 && days.has(localDateISO(day))) {
    count += 1;
    day.setDate(day.getDate() - 1);
  }
  return count;
}

function syncDailyRollover() {
  const current = localDateISO();
  const entries = acceptedFocusHistory(cfg.sessionHistory);
  // An unavailable optional analytics module must never erase cached values.
  if (entries) {
    const next = JSON.parse(JSON.stringify(cfg));
    if (next.metricsDate && next.metricsDate !== current) {
      next.todayMins = entries
        .filter(e => e && e.date === current && Number.isFinite(Number(e.minutes)))
        .reduce((total, e) => total + Math.max(0, Number(e.minutes)), 0);
      next.water = 0;
      next.sets = 0;
      next.pagesRead = 0;
      next.quickFocusRemainderSec = 0;
    }
    next.metricsDate = current;
    next.streak = computeActualStreak(next.sessionHistory);
    if (JSON.stringify(next) !== JSON.stringify(cfg)) {
      try {
        if (window.DF22Integration) {
          const before = window.DF22Integration.getSnapshot();
          if (window.DF22Integration.write(before, {...before,cfg:next}) !== true)
            throw new Error('ROLLOVER_SAVE_NOT_VERIFIED');
        } else {
          if (saveFortressData('zen_fortress_cfg_v21', next) !== true)
            throw new Error('ROLLOVER_SAVE_NOT_VERIFIED');
          cfg = next;
        }
      } catch (_) {
        showToast(L().saveFailed);
        return false;
      }
    }
  }
  // Date controls advance only after the daily snapshot has been acknowledged.
  if (todayISO !== current) {
    const previousDate = todayISO;
    todayISO = current;
    const taskDateInput = document.getElementById('inpTaskDate');
    if (taskDateInput && taskDateInput.value === previousDate) taskDateInput.value = current;
    if (typeof selectedCalDate !== 'undefined' && selectedCalDate === previousDate) {
      selectedCalDate = current;
      calYear = new Date().getFullYear();
      calMonth = new Date().getMonth();
    }
  }
  return true;
}

function L() {
  return DICT[cfg.lang] || DICT.en;
}

const CONFIRMATION_TEXT = {
  "en": [
    "Delete this task? This cannot be undone.",
    "Delete this note? This cannot be undone.",
    "Restore this backup? Current tasks, notes and progress will be replaced. Export them first."
  ],
  "ar": [
    "حذف هذه المهمة؟ لا يمكن التراجع عن الحذف.",
    "حذف هذه الملاحظة؟ لا يمكن التراجع عن الحذف.",
    "استعادة النسخة الاحتياطية ستستبدل مهامك وملاحظاتك وتقدمك الحالي. احفظ نسخة منه أولًا. هل تريد المتابعة؟"
  ],
  "es": [
    "¿Eliminar esta tarea? No se puede deshacer.",
    "¿Eliminar esta nota? No se puede deshacer.",
    "¿Restaurar esta copia? Reemplazará las tareas, notas y el progreso actuales. Guarda una copia primero."
  ],
  "fr": [
    "Supprimer cette tâche ? Cette action est irréversible.",
    "Supprimer cette note ? Cette action est irréversible.",
    "Restaurer cette sauvegarde ? Vos tâches, notes et progrès actuels seront remplacés. Exportez-les d’abord."
  ],
  "de": [
    "Diese Aufgabe löschen? Das kann nicht rückgängig gemacht werden.",
    "Diese Notiz löschen? Das kann nicht rückgängig gemacht werden.",
    "Sicherung wiederherstellen? Aufgaben, Notizen und Fortschritt werden überschrieben. Vorher bitte sichern."
  ],
  "zh": [
    "删除此任务？此操作无法撤销。",
    "删除此笔记？此操作无法撤销。",
    "恢复备份将替换当前任务、笔记和进度。请先导出当前数据。是否继续？"
  ],
  "hi": [
    "यह कार्य मिटाएँ? इसे वापस नहीं लाया जा सकता।",
    "यह नोट मिटाएँ? इसे वापस नहीं लाया जा सकता।",
    "बैकअप बहाल करने से मौजूदा कार्य, नोट और प्रगति बदल जाएँगे। पहले इन्हें निर्यात करें।"
  ],
  "ru": [
    "Удалить задачу? Это действие нельзя отменить.",
    "Удалить заметку? Это действие нельзя отменить.",
    "Восстановление копии заменит текущие задачи, заметки и прогресс. Сначала сохраните их."
  ],
  "pt": [
    "Excluir esta tarefa? Não é possível desfazer.",
    "Excluir esta nota? Não é possível desfazer.",
    "Restaurar o backup substituirá tarefas, notas e progresso atuais. Exporte-os antes."
  ],
  "ja": [
    "このタスクを削除しますか？元に戻せません。",
    "このノートを削除しますか？元に戻せません。",
    "バックアップを復元すると現在のタスク・ノート・進捗が置き換わります。先に保存してください。"
  ],
  "id": [
    "Hapus tugas ini? Tindakan ini tidak dapat dibatalkan.",
    "Hapus catatan ini? Tindakan ini tidak dapat dibatalkan.",
    "Pemulihan cadangan akan mengganti tugas, catatan, dan kemajuan saat ini. Ekspor terlebih dahulu."
  ],
  "tr": [
    "Bu görev silinsin mi? İşlem geri alınamaz.",
    "Bu not silinsin mi? İşlem geri alınamaz.",
    "Yedek geri yüklenirse mevcut görevler, notlar ve ilerleme değişir. Önce dışa aktarın."
  ],
  "ko": [
    "이 작업을 삭제할까요? 되돌릴 수 없습니다.",
    "이 노트를 삭제할까요? 되돌릴 수 없습니다.",
    "백업을 복원하면 현재 작업, 노트와 진행 상황이 바뀝니다. 먼저 내보내세요."
  ],
  "vi": [
    "Xóa nhiệm vụ này? Không thể hoàn tác.",
    "Xóa ghi chú này? Không thể hoàn tác.",
    "Khôi phục bản sao lưu sẽ thay thế nhiệm vụ, ghi chú và tiến độ hiện tại. Hãy xuất dữ liệu trước."
  ],
  "it": [
    "Eliminare questa attività? Non si può annullare.",
    "Eliminare questa nota? Non si può annullare.",
    "Il ripristino sostituirà attività, note e progressi attuali. Esportali prima."
  ],
  "bn": [
    "এই কাজটি মুছবেন? পরে ফিরিয়ে আনা যাবে না।",
    "এই নোটটি মুছবেন? পরে ফিরিয়ে আনা যাবে না।",
    "ব্যাকআপ ফিরিয়ে আনলে বর্তমান কাজ, নোট ও অগ্রগতি বদলে যাবে। আগে সেগুলো রপ্তানি করুন।"
  ],
  "ur": [
    "یہ کام حذف کریں؟ اسے واپس نہیں لایا جا سکتا۔",
    "یہ نوٹ حذف کریں؟ اسے واپس نہیں لایا جا سکتا۔",
    "بیک اپ بحال کرنے سے موجودہ کام، نوٹس اور پیش رفت بدل جائیں گے۔ پہلے انہیں محفوظ کریں۔"
  ],
  "fa": [
    "این کار حذف شود؟ بازگرداندن آن ممکن نیست.",
    "این یادداشت حذف شود؟ بازگرداندن آن ممکن نیست.",
    "بازیابی نسخه پشتیبان، کارها و یادداشت‌ها و پیشرفت فعلی را جایگزین می‌کند. نخست از آن‌ها خروجی بگیرید."
  ],
  "pl": [
    "Usunąć to zadanie? Nie można tego cofnąć.",
    "Usunąć tę notatkę? Nie można tego cofnąć.",
    "Przywrócenie kopii zastąpi obecne zadania, notatki i postępy. Najpierw je wyeksportuj."
  ],
  "nl": [
    "Deze taak verwijderen? Dit kan niet ongedaan worden gemaakt.",
    "Deze notitie verwijderen? Dit kan niet ongedaan worden gemaakt.",
    "Het herstellen van de back-up vervangt taken, notities en voortgang. Exporteer ze eerst."
  ]
};
function confirmSensitiveAction(kind) {
  const copy = CONFIRMATION_TEXT[cfg.lang] || CONFIRMATION_TEXT.en;
  const index = {task:0, note:1, restore:2}[kind];
  if (!Number.isInteger(index)) return false;
  return window.confirm(copy[index]);
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
  const previousLang = cfg.lang;
  cfg.lang = meta.code;
  try {
    if (saveFortressData('zen_fortress_cfg_v21', cfg) !== true)
      throw new Error('LANGUAGE_SAVE_NOT_VERIFIED');
  } catch (_) {
    cfg.lang = previousLang;
    showToast(previousLang === 'ar'
      ? 'تعذر حفظ اللغة. حاول مرة أخرى.'
      : 'Could not save the language. Try again.');
    return false;
  }
  const d = L();

  const root = document.getElementById('htmlRoot');
  root.setAttribute('lang', meta.code);
  root.setAttribute('dir', meta.dir);

  document.getElementById('currentLangIso').textContent = meta.iso;
  document.getElementById('currentLangLabel').textContent = `${meta.enName} • ${meta.nativeName}`;
  document.getElementById('hdrMainTitle').textContent = 'Deep Focus';
  document.getElementById('hdrSubTitle').textContent = d.sub;
  const tn = document.getElementById('navTrainingText');
  if (tn) tn.textContent = typeof quickText === 'function' ? quickText('trainingTitle') : d.modeFocus;
  if (typeof refreshTimerSettings === 'function') refreshTimerSettings();

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    if (d[k]) el.textContent = toWest(d[k]);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const k = el.getAttribute('data-i18n-placeholder');
    if (d[k]) el.setAttribute('placeholder', toWest(d[k]));
  });

  // Existing edited starter records are user data, not replaceable samples.
  tasksList.forEach((t, idx) => {
    if (!t.isStarter || !d.sampleTasks[idx]) return;
    const unchangedSample = Object.values(DICT).some(lang => lang.sampleTasks?.[idx] === t.title);
    if (unchangedSample) t.title = d.sampleTasks[idx];
  });
  notesList.forEach((n, idx) => {
    if (!n.isStarter || !d.sampleNotes[idx]) return;
    const unchangedSample = Object.values(DICT).some(lang =>
      lang.sampleNotes?.[idx]?.t === n.title && lang.sampleNotes?.[idx]?.b === n.body);
    if (unchangedSample) {
      n.title = d.sampleNotes[idx].t;
      n.body = d.sampleNotes[idx].b;
    }
  });

  renderAnalyticsBars();

  syncHeaderMetrics();
  updateTimerDisplay();
  renderTasksList();
  renderCalendar();
  renderNotesStack();
  renderSoundsStudio();
  updateSyllabusCalc();
  closeModal('langModal');
  quickL10n();
  if (window.DF22Integration?.refreshLocale) window.DF22Integration.refreshLocale();
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

function validateImportedBackup(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.v !== 21) return null;
  if (!raw.cfg || typeof raw.cfg !== 'object' || Array.isArray(raw.cfg)) return null;
  if (!Array.isArray(raw.tasksList) || !Array.isArray(raw.notesList)) return null;
  if (raw.tasksList.length > 10000 || raw.notesList.length > 10000) return null;
  const safeRecordId = id => typeof id === 'number' && Number.isSafeInteger(id) && id >= 0;
  const okTask = x => x && typeof x === 'object' && !Array.isArray(x)
    && safeRecordId(x.id)
    && typeof x.title === 'string' && x.title.length <= 20000
    && typeof x.done === 'boolean';
  const okNote = x => x && typeof x === 'object' && !Array.isArray(x)
    && safeRecordId(x.id)
    && typeof x.title === 'string' && x.title.length <= 20000
    && typeof x.body === 'string' && x.body.length <= 500000;
  if (!raw.tasksList.every(okTask) || !raw.notesList.every(okNote)) return null;
  // New imports must be unambiguous; historical records are never renumbered on read.
  if ([raw.tasksList, raw.notesList].some(rows => new Set(rows.map(row => row.id)).size !== rows.length)) return null;
  const candidateCfg = {...cfg, ...raw.cfg};
  if (!LANG_CATALOG.some(l => l.code === candidateCfg.lang)) candidateCfg.lang = 'en';
  for (const key of ['todayMins', 'sessions', 'streak', 'water']) {
    const n = Number(candidateCfg[key]);
    if (!Number.isFinite(n) || n < 0 || n > 100000000) return null;
    candidateCfg[key] = n;
  }
  if (candidateCfg.sessionHistory !== undefined
      && (!Array.isArray(candidateCfg.sessionHistory) || candidateCfg.sessionHistory.length > 100000)) return null;
  return {cfg: candidateCfg, tasksList: raw.tasksList, notesList: raw.notesList};
}

function verifyAndRestoreBackupCode(codeStr) {
  try {
    const clean = String(codeStr || '').trim();
    if (clean.length > 14000000 || !clean) throw new Error('Invalid backup size');
    const rawB64 = clean.startsWith('ZEN21::') ? clean.slice(7).trim() : clean;
    const decoded = JSON.parse(decodeURIComponent(escape(atob(rawB64))));
    if (!decoded || typeof decoded.bundle !== 'string' || !decoded.sig
        || computeHash(decoded.bundle) !== decoded.sig) throw new Error('Integrity check failed');
    const verified = validateImportedBackup(JSON.parse(decoded.bundle));
    if (!verified) throw new Error('Invalid backup schema');
    // Validation must complete before writes. Never replace a user's work silently.
    if (!confirmSensitiveAction('restore')) return false;
    // Build and verify every storage packet before replacing any saved record.
    // If a write fails (e.g. storage quota), roll back all six original keys.
    if (window.DF22Integration) {
      // The live app shares the same crash-recoverable transaction as Notes/Tasks.
      const before = window.DF22Integration.getSnapshot();
      if (window.DF22Integration.write(before, verified) !== true) throw new Error('RESTORE_NOT_VERIFIED');
    } else {
      const imports = [
        ['zen_fortress_cfg_v21', verified.cfg],
        ['zen_fortress_tasks_v21', verified.tasksList],
        ['zen_fortress_notes_v21', verified.notesList]
      ];
      const updates = [];
      for (const [key, value] of imports) {
        const payload = JSON.stringify(value);
        updates.push([key, JSON.stringify({payload, sig:computeHash(payload), ts:Date.now()})]);
      }
      const previous = new Map();
      for (const [key] of updates) {
        previous.set(key, localStorage.getItem(key));
        previous.set(key + '_mirror', localStorage.getItem(key + '_mirror'));
      }
      try {
        for (const [key, packet] of updates) {
          localStorage.setItem(key, packet);
          localStorage.setItem(key + '_mirror', packet);
        }
        for (const [key, packet] of updates) {
          if (localStorage.getItem(key) !== packet || localStorage.getItem(key + '_mirror') !== packet) {
            throw new Error('Storage verification failed');
          }
        }
        if (typeof window !== 'undefined' && window.ZenNative && (!window.DF22Preflight || !window.DF22Preflight.nativeAcknowledge(localStorage)))
          throw new Error('NATIVE_DURABLE_ACK_FAILED');
      } catch (storageError) {
        for (const [key, oldValue] of previous) {
          try {
            if (oldValue === null) localStorage.removeItem(key);
            else localStorage.setItem(key, oldValue);
          } catch (rollbackError) {
            console.error('Backup rollback failed:', key, rollbackError);
          }
        }
        throw storageError;
      }
      cfg = verified.cfg;
      tasksList = verified.tasksList;
      notesList = verified.notesList;
    }
    syncDailyRollover();
    applyLanguage(cfg.lang);
    closeModal('cloudBackupModal');
    showToast('✓ Backup restored');
    return true;
  } catch (e) {
    showToast('⚠️ Backup invalid — original data left unchanged');
    return false;
  }
}

function openCloudBackupModal() {
  document.getElementById('inpRestorePayload').value = '';
  document.getElementById('cloudBackupModal').classList.add('open');
}

async function copyTextConfirmed(text, successMessage) {
  if (copyTextConfirmed.pending) return false;
  copyTextConfirmed.pending = true;
  try {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function')
      throw new Error('CLIPBOARD_UNAVAILABLE');
    await navigator.clipboard.writeText(text);
    showToast(successMessage || (cfg.lang === 'ar' ? 'تم النسخ إلى الحافظة' : 'Copied to clipboard'));
    return true;
  } catch (_) {
    showToast(cfg.lang === 'ar' ? 'تعذّر النسخ. لم يتم تأكيد النسخ إلى الحافظة.' : 'Could not copy. Clipboard copy was not confirmed.');
    return false;
  } finally { copyTextConfirmed.pending = false; }
}

function syncToGoogleCloudNow() {
  const code = generateEncryptedBackupCode();
  if (window.ZenNative && window.ZenNative.syncBackupToGoogleEmailOrDrive) {
    window.ZenNative.syncBackupToGoogleEmailOrDrive(code);
  } else return copyTextConfirmed(code, cfg.lang === 'ar'
    ? 'نُسخت النسخة الاحتياطية. احفظها بسرية؛ فهي غير مشفّرة.'
    : 'Backup copied — save privately; NOT encrypted');
}

function downloadEncryptedBackupFile() {
  const code = generateEncryptedBackupCode();
  if (window.ZenNative && window.ZenNative.exportBackupToFile) {
    try {
      window.ZenNative.exportBackupToFile(code);
      return; // Android reports success only after the user actually saves the file.
    } catch (error) {
      showToast('⚠️ Could not open Save As; use Share Backup');
      return;
    }
  }
  // Browser-only fallback; Android WebView should use ACTION_CREATE_DOCUMENT.
  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `deep-focus-backup-${todayISO}.zenbackup`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  showToast("💾 Backup exported — NOT encrypted");
}

function restoreFromEncryptedCode() {
  const val = document.getElementById('inpRestorePayload').value;
  if (!val) return showToast("⚠️ Paste backup code first");
  verifyAndRestoreBackupCode(val);
}

function restoreFromFileInput(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) return showToast('⚠️ Backup file is too large');
  const reader = new FileReader();
  reader.onload = (e) => verifyAndRestoreBackupCode(e.target.result);
  reader.readAsText(file);
}

function shareAppWithFriends() {
  const msg = toWest(`🌿 Deep Focus — My Progress Today: ${cfg.todayMins} active mins (${cfg.sessions} sessions completed, 🔥 ${cfg.streak} days streak)!`);
  if (window.ZenNative && window.ZenNative.shareAppInvite) {
    window.ZenNative.shareAppInvite(msg);
  } else return copyTextConfirmed(msg);
}

/* ========================================================
   4. GUARANTEED COMPLETION CHIME & BACKGROUND ALARM
   ======================================================== */
// The native background notification is a separate Android QA gate; avoid a second synthetic JS alarm.
function playRichCompletionChime(_titleText, _skipNative=false, completedId=null, phase='focus') {
  const alerts=window.DFRecoveryCompletion;
  if (!alerts) return;
  if (completedId !== null && completedId !== undefined) {
    void alerts.complete({sessionId:completedId,phase:phase==='custom'?'custom':phase==='short'?'short':phase==='long'?'long':'focus'});
  } else {
    void alerts.preview();
  }
}
function testCompletionSoundChime() {
  const alerts=window.DFRecoveryCompletion;
  if (alerts) { void alerts.preview(); }
  else showToast('Completion alerts unavailable');
}

/* ========================================================
   5. MULTI-DOMAIN & TIMER ENGINE
   ======================================================== */
const DOMAIN_FOCUS_MINUTES = Object.freeze({study: 25, sport: 30, read: 20, work: 50});
function getDomainFocusMinutes(domain = cfg.domain) {
  const chosen = cfg.domainFocusMinutes && cfg.domainFocusMinutes[domain];
  return Number.isInteger(chosen) && chosen >= 1 && chosen <= 240
    ? chosen : (DOMAIN_FOCUS_MINUTES[domain] || 25);
}

function renderDomainState() {
  const dom = ['study', 'sport', 'read', 'work'].includes(cfg.domain) ? cfg.domain : 'study';
  for (const key of ['study', 'sport', 'read', 'work']) {
    const card = document.getElementById('domBtn-' + key);
    if (!card) continue;
    const selected = key === dom;
    card.classList.toggle('active', selected);
    card.setAttribute('aria-pressed', String(selected));
    const duration = card.querySelector('.domain-duration');
    if (duration) duration.textContent = toWest(getDomainFocusMinutes(key) + ':00');
  }
  document.getElementById('modeFocusBtn').textContent = formatDurationUnit(getDomainFocusMinutes(dom), 'minute');
  document.getElementById('sportContextBar').classList.toggle('visible', dom === 'sport');
  document.getElementById('readContextBar').classList.toggle('visible', dom === 'read');
}

function switchActivityDomain(dom, el) {
  if (!['study', 'sport', 'read', 'work'].includes(dom) || cfg.domain === dom) return false;
  // A tap on another activity must not silently erase an in-progress focus session.
  const replacingQuickTraining = !!quickTraining?.active;
  if (replacingQuickTraining) {
    if (!window.confirm(quickText('replacePrompt'))) return false;
  } else if (timerRunning || (timerSessionId !== null && timerLeft < timerTotal)) {
    if (!window.confirm(quickText('replacePrompt'))) return false;
  }
  // A native durable ACK can fail after WebView writes: do not change the active
  // domain or cancel a real focus session until the new cfg is acknowledged.
  const nextCfg = {...cfg,domain:dom};
  try {
    if (saveFortressData('zen_fortress_cfg_v21', nextCfg) !== true)
      throw new Error('DOMAIN_SAVE_NOT_ACKNOWLEDGED');
  } catch (_) {
    showToast(cfg.lang === 'ar'
      ? 'تعذر حفظ النشاط. حاول مرة أخرى.'
      : 'Could not save activity. Try again.');
    return false;
  }
  cfg.domain = dom;
  if (replacingQuickTraining) {
    quickTraining = null;
    if (timerRunning) toggleTimerPlay();
    renderQuickTraining();
  }
  renderDomainState();

  const d = L();
  const labels = {
    study: ['📚', d.domStudy], sport: ['🏋️', d.domSport],
    read: ['📖', d.domRead], work: ['💻', d.domWork]
  };
  const [icon, title] = labels[dom];
  const minutes = getDomainFocusMinutes(dom);
  selectTimerMode(minutes, 'focus', document.getElementById('modeFocusBtn'));
  showToast(`${icon} ${title} (${formatDurationUnit(minutes,'minute')})`);
  return true;
}

/* Home timer shortcuts share the existing engine, never reset an active session silently. */
function selectHomeQuickSession(minutes) {
  if (![10, 25, 50].includes(minutes)) return false;
  if (!quickTraining?.active && currentTimerModeKey === 'focus' &&
      timerTotal === minutes * 60) return true;
  if (!quickTraining?.active && (timerRunning || (timerSessionId !== null && timerLeft < timerTotal))) {
    if (!window.confirm(quickText('replacePrompt'))) return false;
  }
  // The selector owns training cancellation, save acknowledgment and UI publication.
  return selectTimerMode(minutes, 'focus', document.getElementById('modeFocusBtn'));
}

function logWorkoutSet() {
  const before = cfg.sets;
  const count = Number(before);
  cfg.sets = ((Number.isSafeInteger(count) && count >= 0 ? count : 0) % 12) + 1;
  try {
    if (saveFortressData('zen_fortress_cfg_v21', cfg) !== true)
      throw new Error('ACTIVITY_SAVE_NOT_VERIFIED');
  } catch (_) {
    cfg.sets = before;
    showToast(cfg.lang === 'ar'
      ? 'تعذر حفظ مجموعة التدريب. حاول مرة أخرى.'
      : 'Could not save the workout set. Try again.');
    return false;
  }
  syncHeaderMetrics();
  showToast(toWest(`💪 ${L().domSport}: ${cfg.sets}/4`));
  return true;
}

function startQuickSportRest(secs) {
  // A quick sport break must not silently replace an active focus or training session.
  if ((quickTraining?.active || timerRunning || timerSessionId || timerActiveMs > 0) &&
      !window.confirm(quickText('replacePrompt'))) return false;
  if (quickTraining?.active) {
    quickTraining = null;
    renderQuickTraining();
  }
  if (timerRunning) toggleTimerPlay();
  currentTimerModeKey = 'short';
  timerTotal = secs; timerLeft = secs;
  timerSessionId = null;
  focusSessionTaskId = null;
  timerActiveMs = 0;
  timerResumeMs = null;
  storeTimerSession();
  updateTimerDisplay(); toggleTimerPlay();
  showToast(`⏱️ ${quickText('restPhase')} ${formatDurationUnit(secs,'second')}`);
  return true;
}

function addReadPages(p) {
  if (!Number.isSafeInteger(p) || p <= 0) return false;
  const before = cfg.pagesRead;
  const existing = Number(before);
  const current = Number.isSafeInteger(existing) && existing >= 0 ? existing : 0;
  const next = current + p;
  if (!Number.isSafeInteger(next)) return false;
  cfg.pagesRead = next;
  try {
    if (saveFortressData('zen_fortress_cfg_v21', cfg) !== true)
      throw new Error('ACTIVITY_SAVE_NOT_VERIFIED');
  } catch (_) {
    cfg.pagesRead = before;
    showToast(cfg.lang === 'ar'
      ? 'تعذر حفظ صفحات القراءة. حاول مرة أخرى.'
      : 'Could not save reading progress. Try again.');
    return false;
  }
  syncHeaderMetrics();
  showToast(toWest(`📖 ${L().domRead}: +${p}`));
  return true;
}

const TAB_GRADS = {
  'sec-timer': 'linear-gradient(125deg,#ffffff 0%,#f0faff 75%,#f7f7ff 100%)',
  'sec-tasks': 'linear-gradient(125deg,#ffffff 0%,#f7f5ff 70%,#edfaff 100%)',
  'sec-calendar': 'linear-gradient(125deg,#ffffff 0%,#f1f9ff 75%,#f6f5ff 100%)',
  'sec-notes': 'linear-gradient(125deg,#ffffff 0%,#f1fffb 70%,#f4f7ff 100%)',
  'sec-sounds': 'linear-gradient(125deg,#ffffff 0%,#effdff 75%,#eff7ff 100%)',
  'sec-analytics': 'linear-gradient(125deg,#ffffff 0%,#f6f5ff 70%,#f1faff 100%)'
};


function openQuickTrainingFromNav(btn) {
  switchTab('sec-timer', btn);
  const details = document.getElementById('quickTrainingDetails');
  if (details) details.open = true;
  setTimeout(() => {
    const card = document.getElementById('quickTrainingCard');
    if (card) card.scrollIntoView({behavior:'smooth', block:'center'});
  }, 120);
}

function switchTab(secId, btn) {
  syncDailyRollover();
  document.body.classList.toggle('timer-home', secId === 'sec-timer');
  document.querySelectorAll('.screen-section').forEach(s => s.classList.remove('active'));
  document.getElementById(secId).classList.add('active');
  if (btn) {
    document.querySelectorAll('.bnav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  if (TAB_GRADS[secId]) document.getElementById('heroHeader').style.setProperty('--page-ambient', TAB_GRADS[secId]);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (window.DF22Integration?.onTab) window.DF22Integration.onTab(secId);
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
  const chooser = document.querySelector?.('dialog[open]');
  if (chooser) { chooser.close(); return true; }
  if (document.getElementById('deskClockOverlay').classList.contains('active')) { toggleDeskClock(false); return true; }
  const openM = document.querySelectorAll('.modal-overlay.open');
  if (openM.length > 0) {
    const top = openM[openM.length - 1];
    if (top.id === 'noteModal' && typeof nsCloseEditor === 'function') {
      // The native Back event is consumed even when the user keeps unsaved edits.
      nsCloseEditor();
    } else top.classList.remove('open');
    return true;
  }
  const timerTab = document.getElementById('sec-timer');
  if (timerTab && !timerTab.classList.contains('active')) {
    switchTab('sec-timer', document.getElementById('navTimer'));
    return true;
  }
  return false;
};

if (typeof document.addEventListener === 'function') document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && window.handleAndroidBack()) event.preventDefault();
});

let timerTotal = cfg.focusMin * 60;
let timerLeft = timerTotal;
let timerRunning = false;
let timerInterval = null;
let timerTargetTime = null;
let currentTimerModeKey = 'focus';
let customSessionLabel = '';
let timerSessionId = null;
let focusSessionTaskId = null;
let timerActiveMs = 0;
let timerResumeMs = null;
function accumulateActiveTime() {
  if (timerResumeMs === null) return;
  const now = Date.now();
  const through = Number.isFinite(timerTargetTime) ? Math.min(now, timerTargetTime) : now;
  timerActiveMs += Math.max(0, through - timerResumeMs);
  timerResumeMs = null;
}
const TIMER_STORAGE_KEY = 'zen_fortress_active_timer_v21';
function storeTimerSession() {
  return saveFortressData(TIMER_STORAGE_KEY, {
    total: timerTotal, left: timerLeft, running: timerRunning,
    endAt: timerRunning ? timerTargetTime : null,
    mode: currentTimerModeKey, label: customSessionLabel,
    sessionId: timerSessionId,
    taskId: focusSessionTaskId,
    activeMs: timerActiveMs, resumedAt: timerRunning ? timerResumeMs : null,
    training: quickTraining && quickTraining.active ? {...quickTraining} : null
  });
}
function creditCompletedSession() {
  if (currentTimerModeKey !== 'focus' && currentTimerModeKey !== 'custom') return true;
  if (!timerSessionId) return true;
  const ids = Array.isArray(cfg.completedTimerIds) ? cfg.completedTimerIds : [];
  if (ids.includes(timerSessionId) ||
      (Array.isArray(cfg.sessionHistory) && cfg.sessionHistory.some(s => s && s.id === timerSessionId))) return true;
  const nextCfg = JSON.parse(JSON.stringify(cfg));
  // Short intervals such as 20/10 must not credit a whole minute for 20 seconds.
  // Accumulate real seconds across work rounds; legacy timer accounting is preserved.
  let earned;
  if (quickTraining?.active) {
    const accumulated = Math.max(0, Number(nextCfg.quickFocusRemainderSec) || 0)
      + Math.max(0, Math.round(timerActiveMs / 1000));
    earned = Math.floor(accumulated / 60);
    nextCfg.quickFocusRemainderSec = accumulated % 60;
  } else {
    earned = Math.max(0, Math.floor((timerActiveMs + 500) / 60000));
  }
  nextCfg.todayMins = Number(nextCfg.todayMins || 0) + earned;
  nextCfg.sessions = Number(nextCfg.sessions || 0) + 1;
  nextCfg.metricsDate = localDateISO();
  nextCfg.completedTimerIds = [...ids, timerSessionId].slice(-300);
  if (!Array.isArray(nextCfg.sessionHistory)) nextCfg.sessionHistory = [];
  const credited = {id: timerSessionId, date: localDateISO(), minutes: earned,
    domain: nextCfg.domain || 'study',mode:'focus',completed:true};
  if (Number.isSafeInteger(focusSessionTaskId) && focusSessionTaskId >= 0 &&
      typeof tasksList !== 'undefined' && tasksList.some(t => t.id === focusSessionTaskId && !t.isStarter))
    credited.taskId = focusSessionTaskId;
  nextCfg.sessionHistory.push(credited);
  if (!quickTraining?.active) {
    const rounds = Number.isInteger(nextCfg.roundsPerCycle) && nextCfg.roundsPerCycle >= 1 && nextCfg.roundsPerCycle <= 12 ? nextCfg.roundsPerCycle : 4;
    const past = Number.isInteger(nextCfg.focusCycleCount) && nextCfg.focusCycleCount >= 0 && nextCfg.focusCycleCount < rounds ? nextCfg.focusCycleCount : 0;
    nextCfg.focusCycleCount = (past + 1) % rounds;
  }
  nextCfg.streak = computeActualStreak(nextCfg.sessionHistory);
  try {
    if (window.DF22Integration) {
      const before = window.DF22Integration.getSnapshot();
      if (window.DF22Integration.write(before, {...before,cfg:nextCfg}) !== true)
        throw new Error('SESSION_SAVE_NOT_VERIFIED');
    } else {
      if (saveFortressData('zen_fortress_cfg_v21', nextCfg) !== true)
        throw new Error('SESSION_SAVE_NOT_VERIFIED');
      cfg = nextCfg;
    }
  } catch (_) {
    showToast(cfg.lang === 'ar'
      ? 'تعذّر حفظ الجلسة. أبقِ التطبيق مفتوحًا واضغط التشغيل لإعادة المحاولة.'
      : 'Could not save this session. Keep the app open and press Play to retry.');
    return false;
  }
  syncHeaderMetrics();
  if (window.DF22Integration?.onSessionRecorded) window.DF22Integration.onSessionRecorded();
  try { document.dispatchEvent(new CustomEvent('deep-focus:session-recorded',{detail:{schemaVersion:1,...credited}})); } catch (e) {}
  return true;
}
function finalizeTimerSession(shouldChime) {
  const completedAlertId=timerSessionId, completedAlertPhase=currentTimerModeKey;
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  accumulateActiveTime();
  timerRunning = false;
  timerLeft = 0;
  if (creditCompletedSession() !== true) {
    // Keep the completed ID/elapsed time and existing durable timer snapshot.
    // No training advance, alert, or success event until retry commits the credit.
    updateTimerDisplay();
    document.getElementById('mainPlayBtn').innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
    return false;
  }
  if(quickTraining?.active) {
    advanceQuickTrainingStep();
    if(shouldChime) playRichCompletionChime(document.getElementById('timerModeCaption').textContent,true,completedAlertId,completedAlertPhase);
    // The next interval or a fresh focus timer was already selected.
    return;
  }
  storeTimerSession();
  updateTimerDisplay();
  document.getElementById('mainPlayBtn').innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  if (shouldChime) playRichCompletionChime(document.getElementById('timerModeCaption').textContent, true,completedAlertId,completedAlertPhase);
  // Only real completed focus sessions advance the break cycle.
  if (['focus','custom'].includes(currentTimerModeKey)) {
    const longRest = cfg.focusCycleCount === 0;
    const mode = longRest ? 'long' : 'short';
    selectTimerMode(longRest ? cfg.longMin : cfg.shortMin, mode,
      document.getElementById(longRest ? 'modeLongBtn' : 'modeShortBtn'));
  } else {
    selectTimerMode(getDomainFocusMinutes(), 'focus', document.getElementById('modeFocusBtn'));
  }
}
function runTimerTick() {
  // An already queued callback must not complete a paused, reset or finished session.
  if (!timerRunning) return;
  timerLeft = Math.max(0, Math.ceil((timerTargetTime - Date.now()) / 1000));
  if (timerLeft <= 0) return finalizeTimerSession(true);
  updateTimerDisplay();
}
function restoreTimerSession() {
  const snap = loadFortressData(TIMER_STORAGE_KEY, null);
  if (!snap || typeof snap !== 'object' || !Number.isFinite(snap.total) || !Number.isFinite(snap.left)) return;
  if (snap.total < 1 || snap.total > 86400 || snap.left < 0 || snap.left > 86400) return;
  timerTotal = snap.total;
  timerLeft = snap.left;
  currentTimerModeKey = ['focus','short','long','custom'].includes(snap.mode) ? snap.mode : 'focus';
  customSessionLabel = typeof snap.label === 'string' ? snap.label.slice(0, 100) : '';
  timerSessionId = typeof snap.sessionId === 'string' ? snap.sessionId : null;
  focusSessionTaskId = Number.isSafeInteger(snap.taskId) && snap.taskId >= 0 ? snap.taskId : null;
  quickTraining = validQuickSnapshot(snap.training);
  timerActiveMs = Number.isFinite(snap.activeMs) && snap.activeMs >= 0 && snap.activeMs <= 86400000
    ? snap.activeMs : Math.max(0, (timerTotal - timerLeft) * 1000);
  timerResumeMs = snap.running
    ? (Number.isFinite(snap.resumedAt) ? snap.resumedAt : Date.now() - Math.max(0, (timerTotal - timerLeft) * 1000))
    : null;
  if (snap.running && Number.isFinite(snap.endAt)) {
    timerTargetTime = snap.endAt;
    timerLeft = Math.max(0, Math.ceil((timerTargetTime - Date.now()) / 1000));
    if (timerLeft === 0) {
      // Native foreground timer has already emitted the expiry notification.
      finalizeTimerSession(false);
      return;
    }
    timerRunning = true;
    document.getElementById('mainPlayBtn').innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    timerInterval = setInterval(runTimerTick, 500);
  }
  updateTimerDisplay();
}
const ringCircumference = 2 * Math.PI * 105;

function syncHeaderMetrics() {
  const d = L();
  document.getElementById('hdrFocusMins').textContent = toWest(cfg.todayMins);
  document.getElementById('hdrStreakBadge').textContent = toWest(`↑ 🔥 ${cfg.streak} ${d.daysUnit}`);
  document.getElementById('orbWaterTxt').textContent = toWest(`${d.waterWord} ${cfg.water}/8`);
  document.getElementById('sportSetCounterTxt').textContent = toWest(`🏋️ ${d.domSport} ${cfg.sets || 0}/4 • 12×`);
  document.getElementById('readPagesCounterTxt').textContent = toWest(`📖 ${d.domRead} ${cfg.pagesRead || 0}`);
  document.getElementById('kpiTotalMins').textContent = toWest(cfg.todayMins || 0);
  document.getElementById('kpiTotalSessions').textContent = toWest(cfg.sessions);
  const plant = cfg.sessions >= 25 ? '🌸' : cfg.sessions >= 18 ? '🌳' : cfg.sessions >= 10 ? '🌿' : '🌱';
  document.getElementById('ringPlantEmoji').textContent = plant;
  renderAnalyticsBars();
  renderTodayPlan();
  if (typeof renderDailyGoals === 'function') renderDailyGoals();
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

  const domainText = {study:d.domStudy, sport:d.domSport, read:d.domRead, work:d.domWork};
  const captions = {
    focus: (domainText[cfg.domain] || d.domStudy) + ' ' + formatDurationUnit(Math.round(timerTotal / 60),'minute'),
    short: timerTotal < 60 ? quickText('restPhase') + ' ' + formatDurationUnit(timerTotal,'second') : d.modeShort,
    long: d.modeLong,
    custom: customSessionLabel || d.modeCustom
  };
  document.getElementById('timerModeCaption').textContent = toWest(captions[currentTimerModeKey] || d.modeFocus);
  if (currentTimerModeKey === 'focus' && !quickTraining?.active) {
    document.getElementById('modeFocusBtn').textContent = formatDurationUnit(Math.round(timerTotal / 60),'minute');
  }
  for (const duration of [10, 25, 50]) {
    const shortcut = document.getElementById('homeQuick' + duration);
    if (shortcut) {
      shortcut.setAttribute('aria-pressed', String(
        currentTimerModeKey === 'focus' && timerTotal === duration * 60
      ));
    }
  }
  const restShortcut = document.getElementById('sportRest45');
  if (restShortcut) restShortcut.textContent = quickText('restPhase') + ' ' + formatDurationUnit(45,'second');
  const setShortcut = document.getElementById('sportLogSet');
  if (setShortcut) setShortcut.textContent = quickText('round') + ' +1';
  updateFocusStatus();
}

function selectTimerModeFromUser(mins, modeKey, btn, label = customSessionLabel) {
  if ((timerRunning || timerSessionId || timerActiveMs > 0) &&
      !window.confirm(quickText('replacePrompt'))) return false;
  return selectTimerMode(mins, modeKey, btn, label);
}
function selectTimerMode(mins, modeKey, btn, label = customSessionLabel) {
  const replacingQuickTraining = quickTraining?.active && !quickInternalChange;
  if (replacingQuickTraining && !window.confirm(quickText('replacePrompt'))) return false;
  const before = {timerRunning, timerTargetTime, currentTimerModeKey, timerTotal,
    timerLeft, timerSessionId, focusSessionTaskId, timerActiveMs, timerResumeMs,
    customSessionLabel, quickTraining};
  // Mode, label and training replacement belong to the same saved transition.
  // Do not commit a separate Pause or publish UI/native changes before it saves.
  try {
    if (replacingQuickTraining) quickTraining = null;
    timerRunning = false;
    timerTargetTime = null;
    currentTimerModeKey = modeKey;
    timerTotal = mins * 60;
    timerLeft = timerTotal;
    timerSessionId = null;
    focusSessionTaskId = null;
    timerActiveMs = 0;
    timerResumeMs = null;
    customSessionLabel = label;
    if (storeTimerSession() !== true) throw new Error('TIMER_SAVE_NOT_ACKNOWLEDGED');
  } catch (error) {
    ({timerRunning, timerTargetTime, currentTimerModeKey, timerTotal,
      timerLeft, timerSessionId, focusSessionTaskId, timerActiveMs, timerResumeMs,
      customSessionLabel, quickTraining} = before);
    showToast(L().saveFailed);
    throw error;
  }
  if (before.timerRunning) {
    clearInterval(timerInterval);
    timerInterval = null;
    if (window.ZenNative && window.ZenNative.stopBackgroundService) {
      try { window.ZenNative.stopBackgroundService(); } catch(e){}
    }
    document.getElementById('mainPlayBtn').innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  }
  if (replacingQuickTraining) renderQuickTraining();
  if (btn) {
    btn.parentElement.querySelectorAll('.seg-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  updateTimerDisplay();
  return true;
}

function openCustomTimerModal() { document.getElementById('customTimerModal').classList.add('open'); }
function setCustomPresetValues(m) { document.getElementById('inpCustomMins').value = toWest(m); }
function applyCustomTimerNow() {
  const mins = Math.max(1, Math.min(240, parseInt(toWest(document.getElementById('inpCustomMins').value)) || 45));
  const title = document.getElementById('inpCustomTitle').value.trim();
  const nextLabel = title ? `${title} (${mins}m)` : `${L().modeCustom} (${mins}m)`;
  // Do not mutate label, close the form, or lose the user's input on Cancel.
  if (!selectTimerModeFromUser(mins, 'custom', document.getElementById('modeCustomBtn'), nextLabel)) return false;
  closeModal('customTimerModal');
  updateTimerDisplay();
  showToast(`⚡ ${customSessionLabel}`);
  return true;
}

function changeTimerDelta(deltaMins) {
  const before = {timerLeft, timerTotal, timerTargetTime};
  try {
    timerLeft = Math.max(10, timerLeft + deltaMins * 60);
    if (timerLeft > timerTotal) timerTotal = timerLeft;
    if (timerRunning) timerTargetTime = Date.now() + (timerLeft * 1000);
    if (storeTimerSession() !== true) throw new Error('TIMER_SAVE_NOT_ACKNOWLEDGED');
  } catch (error) {
    ({timerLeft, timerTotal, timerTargetTime} = before);
    showToast(L().saveFailed);
    throw error;
  }
  if (timerRunning) {
    startNativeTimerForCurrentSession(timerLeft, document.getElementById('timerModeCaption').textContent);
  }
  updateTimerDisplay();
}

// Native service uses exactly the same existing session identity and phase as v21.
// Retain the old two-argument bridge when an installed Android host is older.
function startNativeTimerForCurrentSession(seconds, title) {
  const bridge = window.ZenNative;
  if (!bridge) return;
  try {
    if (typeof bridge.startBackgroundSession === 'function' && timerSessionId) {
      bridge.startBackgroundSession(seconds, title, timerSessionId, currentTimerModeKey);
    } else if (typeof bridge.startBackgroundService === 'function') {
      bridge.startBackgroundService(seconds, title);
    }
  } catch (_) {
    // The WebView timer remains active; Android foreground-service refusal is
    // an explicit platform limitation, not a fabricated completion.
  }
}

function toggleTimerPlay() {
  if (!timerRunning && timerSessionId && timerLeft === 0) return finalizeTimerSession(false);
  const btn = document.getElementById('mainPlayBtn');
  const activeTitle = document.getElementById('timerModeCaption').textContent;
  const before = {timerRunning, timerLeft, timerTargetTime, timerSessionId,
    focusSessionTaskId, timerActiveMs, timerResumeMs};

  // Stage the transition synchronously. Do not change scheduled work, native
  // service or the button until both timer snapshot copies are verified.
  try {
    if (timerRunning) {
      timerLeft = Math.max(0, Math.ceil((timerTargetTime - Date.now()) / 1000));
      accumulateActiveTime();
      timerRunning = false;
    } else {
      if (!timerSessionId) {
        timerSessionId = String(Date.now()) + '-' + String(Math.round(Math.random()*1e9));
        const linked = typeof focusWorkflowGetLinkedTask === 'function' ? focusWorkflowGetLinkedTask() : null;
        focusSessionTaskId = quickTraining?.active && Number.isSafeInteger(quickTraining.taskId)
          ? quickTraining.taskId : (linked?.id ?? null);
      }
      timerRunning = true;
      timerResumeMs = Date.now();
      timerTargetTime = timerResumeMs + (timerLeft * 1000);
    }
    if (storeTimerSession() !== true) throw new Error('TIMER_SAVE_NOT_ACKNOWLEDGED');
  } catch (error) {
    ({timerRunning, timerLeft, timerTargetTime, timerSessionId,
      focusSessionTaskId, timerActiveMs, timerResumeMs} = before);
    showToast(L().saveFailed);
    // Preserve the existing failure contract: internal mode/training callers
    // must abort rather than continue replacing a session after a failed pause.
    throw error;
  }

  if (before.timerRunning) {
    clearInterval(timerInterval);
    timerInterval = null;
    if (window.ZenNative && window.ZenNative.stopBackgroundService) {
      try { window.ZenNative.stopBackgroundService(); } catch(e){}
    }
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  } else {
    try {
      if (!chimeCtx) chimeCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (chimeCtx.state === 'suspended') chimeCtx.resume();
    } catch(e){}
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    startNativeTimerForCurrentSession(timerLeft, activeTitle);
    timerInterval = setInterval(runTimerTick, 500);
  }
}

function resetTimerNow() {
  if(quickTraining?.active) {
    cancelQuickTraining();
    return;
  }
  // Reset discards an unfinished focus session: cancellation must be harmless.
  if ((timerRunning || timerSessionId || timerActiveMs > 0) &&
      !window.confirm(quickText('replacePrompt'))) return false;
  const before = {timerRunning, timerLeft, timerSessionId,
    focusSessionTaskId, timerActiveMs, timerResumeMs};
  // Persist Reset as one transition; a separate Pause would commit partial success.
  try {
    timerRunning = false;
    timerLeft = timerTotal;
    timerSessionId = null;
    focusSessionTaskId = null;
    timerActiveMs = 0;
    timerResumeMs = null;
    if (storeTimerSession() !== true) throw new Error('TIMER_SAVE_NOT_ACKNOWLEDGED');
  } catch (error) {
    ({timerRunning, timerLeft, timerSessionId,
      focusSessionTaskId, timerActiveMs, timerResumeMs} = before);
    showToast(L().saveFailed);
    throw error;
  }
  if (before.timerRunning) {
    clearInterval(timerInterval);
    timerInterval = null;
    if (window.ZenNative && window.ZenNative.stopBackgroundService) {
      try { window.ZenNative.stopBackgroundService(); } catch(e){}
    }
    document.getElementById('mainPlayBtn').innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  }
  updateTimerDisplay();
  return true;
}
function skipTimerPhase() {
  if(quickTraining?.active) { skipQuickTrainingStep(); return; }
  // Selecting the next phase uses the same confirmation as the mode buttons.
  return selectTimerModeFromUser(cfg.shortMin, 'short', document.getElementById('modeShortBtn'));
}
function addWaterCup() {
  const nextWater = (cfg.water + 1) % 9;
  try {
    if (saveFortressData('zen_fortress_cfg_v21', {...cfg, water:nextWater}) !== true)
      throw new Error('WATER_SAVE_NOT_ACKNOWLEDGED');
  } catch (_) {
    showToast(L().saveFailed);
    return false;
  }
  cfg.water = nextWater;
  syncHeaderMetrics();
  return true;
}
function toggleDeskClock(show) {
  document.getElementById('deskClockOverlay').classList.toggle('active', show);
  if (window.ZenNative && window.ZenNative.setDeskClockWake) {
    try { window.ZenNative.setDeskClockWake(Boolean(show)); } catch (e) {}
  }
}

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
    const id = Number(t.id);
    if (!Number.isSafeInteger(id) || id < 0) return;
    const safeIcon = escapeHtmlText(t.icon || '🎯');
    const safeTheme = ['tp-blue','tp-amber','tp-emerald','tp-rose'].includes(t.theme) ? t.theme : 'tp-blue';
    const card = document.createElement('div');
    card.className = `showcase-task-card ${t.done ? 'done' : ''}`;
    card.innerHTML = `
      <div class="showcase-task-top">
        <div class="task-check-sq" onclick="toggleTaskDone(${id})">✓</div>
        <div class="task-center-info" onclick="focusOnTask(${id})">
          <div class="task-main-name">${escapeHtmlText(t.title)}</div>
          <div class="task-time-sub">
            <span>📅 ${escapeHtmlText(toWest(t.date || todayISO))}</span>
            <span style="color:var(--primary); font-weight:700;">• ${escapeHtmlText(toWest(getCatLabel(t.catKey)))}</span>
          </div>
        </div>
        <div class="task-pastel-icon ${safeTheme}" onclick="deleteTaskItem(${id})">${safeIcon}</div>
      </div>
    `;
    box.appendChild(card);
  });
  renderTodayPlan();
}

// Publish legacy edits only after durable acknowledgment. The production integration
// uses the existing six-slot v21 recovery journal; standalone legacy hosts retain
// verified primary/mirror writes without claiming cross-family atomicity.
function commitLegacyRecords(field, records) {
  try {
    if (window.DF22Integration) {
      const before = window.DF22Integration.getSnapshot();
      const after = JSON.parse(JSON.stringify(before));
      after[field] = records;
      if (window.DF22Integration.write(before, after) !== true) throw new Error('SAVE_NOT_VERIFIED');
    } else {
      const key = field === 'tasksList' ? 'zen_fortress_tasks_v21' : 'zen_fortress_notes_v21';
      if (saveFortressData(key, records) !== true) throw new Error('SAVE_NOT_VERIFIED');
      if (field === 'tasksList') tasksList = records;
      else notesList = records;
    }
    return true;
  } catch (_) {
    showToast(cfg.lang === 'ar' ? 'تعذر الحفظ. احتفظ بتعديلاتك وحاول مجددًا.' : 'Could not save. Keep your changes and try again.');
    return false;
  }
}

function legacyRecordIsUnique(records, id) {
  const count = records.filter(record => record.id === id).length;
  if (count > 1) showToast(cfg.lang === 'ar'
    ? 'تعذر التعديل: توجد سجلات بالمعرف نفسه. احتفظ بنسخة احتياطية وراجع البيانات.'
    : 'Cannot edit ambiguous record IDs. Keep a backup and review your data.');
  return count === 1;
}

function toggleTaskDone(id) {
  if (!legacyRecordIsUnique(tasksList, id)) return;
  const records = tasksList.map(x => x.id === id ? {...x, done:!x.done} : x);
  if (!commitLegacyRecords('tasksList', records)) return;
  renderTasksList(); renderCalendar();
}

function focusOnTask(id) {
  const t = tasksList.find(x => x.id === id);
  if (t && !t.isStarter) {
    if (typeof focusWorkflowLinkTask === 'function' && !focusWorkflowLinkTask(t.id)) {
      showToast('⚠️ Finish the current training before changing linked tasks');
      return;
    }
    document.getElementById('timerLinkedTask').textContent = `🎯 ${t.title}`;
    switchTab('sec-timer', document.getElementById('navTimer'));
  }
}

let lastAllocatedRecordId = 0;
function nextRecordId() {
  const existing = new Set(
    [...tasksList, ...notesList]
      .map(x => Number(x.id))
      .filter(Number.isSafeInteger)
  );
  let id = Math.max(Date.now(), lastAllocatedRecordId + 1);
  while (existing.has(id)) id++;
  lastAllocatedRecordId = id;
  return id;
}

function createNewTask() {
  const inp = document.getElementById('inpNewTask');
  const val = inp.value.trim();
  if (!val) return;
  const catKey = document.getElementById('selTaskCat').value;
  const dateVal = toWest(document.getElementById('inpTaskDate').value || '');
  const themes = { study: 'tp-blue', exam: 'tp-amber', review: 'tp-rose', sport: 'tp-emerald' };
  const icons = { study: '📚', exam: '💻', review: '📖', sport: '🏋️' };
  const record = {
    id: nextRecordId(), isStarter: false, title: val, time: '25m', date: dateVal,
    catKey: catKey, icon: icons[catKey] || '📚', theme: themes[catKey] || 'tp-blue', done: false
  };
  if (!commitLegacyRecords('tasksList', [record, ...tasksList])) return;
  inp.value = '';
  renderTasksList(); renderCalendar(); showToast('✓');
}

function deleteTaskItem(id) {
  if (!legacyRecordIsUnique(tasksList, id)) return;
  if (!confirmSensitiveAction('task')) return;
  if (!commitLegacyRecords('tasksList', tasksList.filter(x => x.id !== id))) return;
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

    const cell = document.createElement('button');
    cell.type = 'button';
    cell.setAttribute('aria-label',iso);
    cell.setAttribute('aria-pressed',String(iso === selectedCalDate));
    if(iso === todayISO) cell.setAttribute('aria-current','date');
    cell.setAttribute('data-date',iso);
    cell.className = `cal-day-cell ${iso === todayISO ? 'today' : ''} ${iso === selectedCalDate ? 'selected' : ''}`;
    cell.onclick = () => {
      selectedCalDate = iso; renderCalendar();
      document.querySelector?.('[data-date="' + iso + '"]')?.focus();
    };
    cell.innerHTML = `
      <span dir="ltr">${toWest(day)}</span>
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
    item.innerHTML = `<span>${t.done ? '✅' : '📋'} ${escapeHtmlText(t.title)}</span><span style="color:var(--text-muted); font-size:0.7rem;">${toWest(getCatLabel(t.catKey))}</span>`;
    box.appendChild(item);
  });

  dayNotes.forEach(n => {
    const item = document.createElement('div');
    item.style.cssText = 'padding:10px 12px; border-radius:14px; background:#fffbeb; border-right:4px solid #f59e0b; font-size:0.8rem;';
    item.innerHTML = `<div style="font-weight:900;">📝 ${escapeHtmlText(n.title)}</div><div style="color:var(--text-muted); font-size:0.74rem; margin-top:3px;">${escapeHtmlText(n.body)}</div>`;
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
    const id = Number(n.id);
    if (!Number.isSafeInteger(id) || id < 0) return;
    const card = document.createElement('div');
    card.className = `learning-rich-card ${n.theme}`;
    card.innerHTML = `
      <div class="lcard-head">
        <div class="lcard-title"><span>✨</span> <span>${escapeHtmlText(n.title)}</span></div>
        <div style="display:flex; gap:8px;">
          <span style="cursor:pointer;" onclick="pinNoteToTodayCalendar(${id})">📅</span>
          <span style="cursor:pointer;" onclick="toggleNoteBlur(${id})">👁️</span>
          <span style="cursor:pointer; color:var(--rose);" onclick="deleteNoteCard(${id})">✕</span>
        </div>
      </div>
      <div class="lcard-body ${n.blur ? 'blurred-secret' : ''}" onclick="this.classList.toggle('blurred-secret')">${escapeHtmlText(n.body)}</div>
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
  const t = document.getElementById('inpNoteTitle').value.trim();
  const b = document.getElementById('inpNoteBody').value.trim();
  if (!t && !b) return;
  const catKey = document.getElementById('selNoteCat').value;
  const calDate = toWest(document.getElementById('inpNoteCalDate').value || todayISO);
  const blur = document.getElementById('chkNoteBlur').checked;
  const record = {
    id: nextRecordId(), isStarter: false, title: t || L().navNotes, body: b,
    catKey: catKey, calDate: calDate, blur: blur, theme: blur ? 'theme-emerald' : 'theme-violet'
  };
  if (!commitLegacyRecords('notesList', [record, ...notesList])) return;
  renderNotesStack(); renderCalendar(); closeModal('noteModal'); showToast('✓');
}

function pinNoteToTodayCalendar(id) {
  if (!legacyRecordIsUnique(notesList, id)) return;
  const n = notesList.find(x => x.id === id);
  if (n && commitLegacyRecords('notesList', notesList.map(x => x.id === id ? {...x, calDate:selectedCalDate} : x))) { renderNotesStack(); renderCalendar(); showToast(`📅 ${selectedCalDate}`); }
}

function toggleNoteBlur(id) {
  if (!legacyRecordIsUnique(notesList, id)) return;
  const n = notesList.find(x => x.id === id);
  if (n && commitLegacyRecords('notesList', notesList.map(x => x.id === id ? {...x, blur:!x.blur} : x))) renderNotesStack();
}

function deleteNoteCard(id) {
  if (!legacyRecordIsUnique(notesList, id)) return;
  if (!confirmSensitiveAction('note')) return;
  if (!commitLegacyRecords('notesList', notesList.filter(x => x.id !== id))) return;
  renderNotesStack(); renderCalendar();
}

function exportAllNotes() {
  const txt = notesList.map(n => `[${n.title} - ${toWest(n.calDate)}]\n${n.body}`).join('\n\n---\n\n');
  return copyTextConfirmed(txt);
}

function openBrainDumpModal() {
  document.getElementById('inpQuickDump').value = '';
  document.getElementById('brainDumpModal').classList.add('open');
}

function saveQuickDump(toTasks) {
  const val = document.getElementById('inpQuickDump').value.trim();
  if (!val) return;
  if (toTasks) {
    if (!commitLegacyRecords('tasksList', [{ id: nextRecordId(), isStarter: false, title: val, time: '25m', date: todayISO, catKey: 'study', icon: '🎯', theme: 'tp-amber', done: false }, ...tasksList])) return;
    renderTasksList();
  } else {
    if (!commitLegacyRecords('notesList', [{ id: nextRecordId(), isStarter: false, title: '💭', body: val, catKey: 'quick', calDate: todayISO, blur: false, theme: 'theme-violet' }, ...notesList])) return;
    renderNotesStack();
  }
  renderCalendar(); closeModal('brainDumpModal'); showToast('✓');
}

/* ========================================================
   7. 12 PURE NATURE SOUNDS WITH PHOTOS & VOLUME SLIDERS
   ======================================================== */
const SOUNDS_DATA = [
  { id: 'ocean', cat: 'water', cls: 'sbg-ocean', vol: 0.7, src: 'sounds/ocean.ogg' },
  { id: 'rain', cat: 'water', cls: 'sbg-rain', vol: 0.65, src: 'sounds/rain.ogg' },
  { id: 'fire', cat: 'warm', cls: 'sbg-fire', vol: 0.75, src: 'sounds/fire.ogg' },
  { id: 'forest', cat: 'forest', cls: 'sbg-forest', vol: 0.65, src: 'sounds/forest.ogg' },
  { id: 'stream', cat: 'water', cls: 'sbg-stream', vol: 0.7, src: 'sounds/stream.ogg' },
  { id: 'leaves', cat: 'forest', cls: 'sbg-leaves', vol: 0.6, src: 'sounds/leaves.ogg' },
  { id: 'waterfall', cat: 'water', cls: 'sbg-waterfall', vol: 0.65, src: 'sounds/waterfall.ogg' },
  { id: 'night', cat: 'forest', cls: 'sbg-night', vol: 0.55, src: 'sounds/night.ogg' },
  { id: 'thunder', cat: 'water', cls: 'sbg-thunder', vol: 0.6, src: 'sounds/thunder.ogg' },
  { id: 'wind', cat: 'forest', cls: 'sbg-wind', vol: 0.55, src: 'sounds/wind.ogg' },
  { id: 'winrain', cat: 'water', cls: 'sbg-winrain', vol: 0.65, src: 'sounds/winrain.ogg' },
  { id: 'earth', cat: 'warm', cls: 'sbg-earth', vol: 0.5, src: 'sounds/earth.ogg' }
];

let soundCat = 'all';
const activePlayers = {};
// A stale media error or delayed play promise may never restart a stopped tile.
const soundGeneration = Object.create(null);
// Only these two files currently have individual CC0 provenance references in the v21 ledger.
// Other catalogue items remain registered for recovery but unavailable until per-file rights and device listening are proven.
const NATURE_APPROVED_FOR_PLAYBACK = new Set(['forest','wind']);
const NATURE_VOLUME_LABELS = Object.freeze({
  "en": "Volume",
  "ar": "مستوى الصوت",
  "es": "Volumen",
  "zh": "音量",
  "hi": "आवाज़ की तीव्रता",
  "fr": "Volume",
  "de": "Lautstärke",
  "ru": "Громкость",
  "pt": "Volume",
  "ja": "音量",
  "id": "Volume",
  "tr": "Ses düzeyi",
  "ko": "음량",
  "vi": "Âm lượng",
  "it": "Volume",
  "bn": "শব্দের মাত্রা",
  "ur": "آواز کی سطح",
  "fa": "میزان صدا",
  "pl": "Głośność",
  "nl": "Volume"
});

function applyNatureMixVolumes() {
  const channels = SOUNDS_DATA.filter(sound => activePlayers[sound.id]);
  const total = channels.reduce((sum,sound) => sum + sound.vol,0);
  // Conservative headroom even if channel peaks align; retain each requested level.
  const gain = total > 0.85 ? 0.85 / total : 1;
  channels.forEach(sound => activePlayers[sound.id].setVol(sound.vol * gain));
}

function natureUiText(key) {
  const lang = typeof cfg !== 'undefined' ? cfg.lang : 'en';
  const messages = typeof DeepFocusNatureLibraryV2 !== 'undefined' ? DeepFocusNatureLibraryV2.messages : null;
  const fallback = {play:'Play',stop:'Stop',blocked:'Recording awaiting source and audio review.',unavailable:'Unable to play this recording.'};
  return (messages && messages[lang] && messages[lang][key]) || (messages && messages.en[key]) || fallback[key];
}

function stopSoundTile(id) {
  soundGeneration[id] = (soundGeneration[id] || 0) + 1;
  const player = activePlayers[id];
  if (player) {
    delete activePlayers[id];
    try { player.pause(); } catch (e) {}
    applyNatureMixVolumes();
  }
}

function toggleSoundTile(id) {
  const s=SOUNDS_DATA.find(x=>x.id===id);
  if(!s)return;
  if(!NATURE_APPROVED_FOR_PLAYBACK.has(id)) {
    showToast(natureUiText('blocked'));
    return;
  }
  const sName=L().sounds[id]||id;
  if(activePlayers[id]){
    stopSoundTile(id);showToast('⏹ '+sName);renderSoundsStudio();return;
  }
  const token=(soundGeneration[id]||0)+1;soundGeneration[id]=token;
  const audio=new Audio();audio.loop=s.id!=='thunder';audio.preload='auto';audio.volume=0;audio.src=s.src;
  const player={pause(){audio.onerror=null;audio.onended=null;audio.pause();audio.removeAttribute('src');audio.load();},setVol(v){audio.volume=v;}};
  activePlayers[id]=player;
  applyNatureMixVolumes();
  audio.onended=()=>{
    if(soundGeneration[id]===token&&activePlayers[id]===player){stopSoundTile(id);renderSoundsStudio();}
  };
  const failure=()=>{
    if(soundGeneration[id] !== token||activePlayers[id]!==player)return;
    stopSoundTile(id);renderSoundsStudio();showToast(natureUiText('unavailable'));
  };
  audio.onerror=failure;
  try{
    const result=audio.play();
    if(result&&typeof result.then==='function')result.then(()=>{
      if(soundGeneration[id]===token&&activePlayers[id]===player)showToast('🔊 '+sName);
    }).catch(failure);
  }catch(_){failure();}
  renderSoundsStudio();
}

function setTileVolume(id, val) {
  const v = Number(val);
  if (!Number.isFinite(v)) return;
  const clamped = Math.max(0, Math.min(1, v));
  const s = SOUNDS_DATA.find(x => x.id === id);
  if (s) s.vol = clamped;
  applyNatureMixVolumes();
}

function playPresetRelaxMix() {
  stopAllAudio();
  toggleSoundTile('forest');
  toggleSoundTile('wind');
}
function stopAllAudio() {
  SOUNDS_DATA.forEach(s => stopSoundTile(s.id));
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
  const focused = document.activeElement;
  const focusedSound = focused && focused.getAttribute && focused.getAttribute('data-sound-toggle');
  box.innerHTML = '';
  const d = L();

  const available = SOUNDS_DATA.filter(s => NATURE_APPROVED_FOR_PLAYBACK.has(s.id));
  document.querySelectorAll('[data-sound-category]').forEach(button => {
    const category = button.getAttribute('data-sound-category');
    const key = {all:'filterAll',water:'sndCatWater',forest:'sndCatForest',warm:'sndCatWarm'}[category];
    const count = available.filter(s => category === 'all' || s.cat === category).length;
    const label = document.createElement('span');label.textContent = d[key];
    const number = document.createElement('bdi');number.dir = 'ltr';number.textContent = '(' + count + ')';
    button.replaceChildren(label,document.createTextNode(' '),number);
  });
  const visible = available.filter(s => soundCat === 'all' || s.cat === soundCat);
  if (!visible.length) {
    const empty = document.createElement('p');
    empty.className = 'nature-empty-state';empty.setAttribute('role','status');
    empty.textContent = d.natureNoApproved;box.appendChild(empty);
  }
  visible.forEach(s => {
    const isOn = !!activePlayers[s.id];
    const sName = d.sounds[s.id] || s.id;
    const volumeLabel = NATURE_VOLUME_LABELS[cfg.lang] || NATURE_VOLUME_LABELS.en;
    const tile = document.createElement('div');
    tile.className = `sound-Rich-tile ${s.cls} ${isOn ? 'playing' : ''}`;
    tile.innerHTML = `
      <button type="button" class="stile-top stile-toggle" data-sound-toggle="${s.id}" aria-pressed="${isOn}" aria-label="${escapeHtmlText(natureUiText(isOn ? 'stop' : 'play') + ': ' + sName)}" onclick="toggleSoundTile('${s.id}')">
        <span class="stile-play-btn" aria-hidden="true">${isOn ? '⏹' : '▶'}</span>
        <span class="stile-switch" aria-hidden="true"><span class="stile-knob"></span></span>
      </button>
      <div>
        <div class="stile-name">${escapeHtmlText(toWest(sName))}</div>
        <div class="stile-volume-label"><span>🔉 ${escapeHtmlText(volumeLabel)}</span><bdi dir="ltr" class="stile-volume-pct">${Math.round(s.vol*100)}%</bdi></div>
        <input type="range" class="stile-vol" min="0" max="1" step="0.05" value="${s.vol}" aria-label="${escapeHtmlText(volumeLabel + ': ' + sName)}" onclick="event.stopPropagation()" oninput="setTileVolume('${s.id}', this.value);this.parentElement.querySelector('.stile-volume-pct').textContent=Math.round(Number(this.value)*100)+'%'">
      </div>
    `;
    box.appendChild(tile);
  });
  // Acquisition overview only. Playback remains governed by the existing licensing gate.
  if (typeof DeepFocusNatureLibraryV2 !== 'undefined') {
    DeepFocusNatureLibraryV2.render(soundCat, cfg.lang, d.sounds, NATURE_APPROVED_FOR_PLAYBACK);
  }
  if (focusedSound) {
    const button = [...box.querySelectorAll('[data-sound-toggle]')].find(node => node.getAttribute('data-sound-toggle') === focusedSound);
    if (button) button.focus({preventScroll:true});
  }
}

/* ========================================================
   8. ANALYTICS & GOAL CALCULATOR (100% WESTERN DIGITS)
   ======================================================== */
function renderAnalyticsBars() {
  const hist = acceptedFocusHistory(cfg.sessionHistory) || [];
  const recent = Array.from({length: 7}, (_, i) => {
    const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() - (6-i));
    const key = localDateISO(date);
    return { key, weekday: date.getDay(), minutes: 0 };
  });
  const domains = {study: 0, sport: 0, read: 0, work: 0};
  for (const entry of hist) {
    if (!entry || typeof entry.date !== 'string') continue;
    const minute = Number(entry.minutes);
    if (!Number.isFinite(minute) || minute < 0 || minute > 1440) continue;
    const day = recent.find(d => d.key === entry.date);
    if (!day) continue;
    day.minutes += minute;
    const domain = entry.domain === 'exam' ? 'work' : entry.domain === 'review' ? 'read' : entry.domain;
    if (Object.prototype.hasOwnProperty.call(domains, domain)) domains[domain] += minute;
  }
  const total = recent.reduce((a, b) => a + b.minutes, 0);
  const all = Object.values(domains).reduce((a,b) => a+b, 0);
  const colors = {study:'#3b82f6', sport:'#10b981', read:'#8b5cf6', work:'#f59e0b'};
  let accumulated = 0;
  const sections = [];
  for (const k of Object.keys(domains)) {
    const percent = all ? domains[k]/all*100 : 0;
    const el = document.getElementById('share-' + k);
    if (el) el.textContent = all ? Math.round(percent) + '%' : '—';
    if (percent) {
      sections.push(colors[k] + ' ' + accumulated.toFixed(2) + '% ' + (accumulated+percent).toFixed(2) + '%');
      accumulated += percent;
    }
  }
  const donut = document.getElementById('activityDonut');
  if (donut) donut.style.background = sections.length ? 'conic-gradient(' + sections.join(',') + ')' : '#f1f5f9';
  const donutText = document.getElementById('activityDonutText');
  if (donutText) donutText.textContent = all ? Math.round(domains.study/all*100)+'%' : '—';
  const trend = document.getElementById('kpiWeeklyTrend');
  if (trend) trend.textContent = total + ' recorded minutes / 7 days';
  const sessionsTrend = document.getElementById('kpiSessionTrend');
  if (sessionsTrend) sessionsTrend.textContent = hist.filter(h => recent.some(d => d.key === h.date)).length + ' verified sessions / 7 days';
  const minsLabel = document.getElementById('waveRecordedMinutes');
  if (minsLabel) minsLabel.textContent = String(total);
  const barBox = document.getElementById('anMiniBarsBox');
  if (barBox) {
    barBox.textContent = '';
    const maxMinutes = Math.max(1, ...recent.map(d => d.minutes));
    recent.forEach((d,i) => {
      const col = document.createElement('div');
      col.className = 'mbar-col';
      const bar = document.createElement('div');
      bar.className = 'mbar-fill' + (d.minutes === maxMinutes && d.minutes > 0 ? ' peak' : '');
      bar.style.height = (d.minutes > 0 ? Math.max(3, Math.round(d.minutes/maxMinutes*75)) : 2) + 'px';
      bar.title = d.key + ': ' + d.minutes + ' min';
      col.appendChild(bar);
      barBox.appendChild(col);
    });
  }
  const max = Math.max(1, ...recent.map(d=>d.minutes));
  const points = recent.map((d,i) => [i*(320/6), 95-(d.minutes/max)*75]);
  const dline = points.map((p,i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const line = document.getElementById('waveLine'), area = document.getElementById('waveArea'), peak = document.getElementById('wavePeak');
  if (line) line.setAttribute('d',dline);
  if (area) area.setAttribute('d',dline + ' L320 95 L0 95 Z');
  if (peak) {
    const i = recent.findIndex(d => d.minutes === Math.max(...recent.map(x=>x.minutes)));
    peak.setAttribute('cx',points[i][0]); peak.setAttribute('cy',points[i][1]);
    peak.style.visibility = total ? 'visible' : 'hidden';
  }
  const d = L();
  const daysRow = document.getElementById('waveDaysRow');
  if (daysRow) daysRow.textContent = '';
  if (daysRow) recent.forEach(day => {
    const label = document.createElement('span');
    label.textContent = d.weekdays[day.weekday] || String(day.weekday);
    daysRow.appendChild(label);
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

if (typeof window.addEventListener === 'function') {
  window.addEventListener('pagehide', () => {
    Object.keys(activePlayers).forEach(stopSoundTile);
  });
}

/* Boot Init */
syncDailyRollover();
renderAnalyticsBars();
applyLanguage(cfg.lang || 'en');
renderDomainState();
restoreTimerSession();
document.body.classList.add('timer-home');
document.getElementById('heroHeader').style.setProperty('--page-ambient', TAB_GRADS['sec-timer']);
initQuickTraining();
renderTodayPlan();
