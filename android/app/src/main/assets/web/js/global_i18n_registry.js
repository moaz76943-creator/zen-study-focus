/**
 * DEEP FOCUS — Global 100-Locale i18n Registry & Exclusion Guard
 * Mission #064: 100 Google Play supported locales, strict Hebrew exclusion,
 * per-key cascading fallback (Locale -> en -> ar), and modular dictionary extensibility.
 */
(function (global) {
  'use strict';

  // Strictly excluded locales (Hebrew codes)
  var EXCLUDED_LOCALES = ['he', 'iw'];

  // Master baseline English dictionary
  var MASTER_EN = {
    app_name: "Deep Focus",
    nav_timer: "Timer",
    nav_tasks: "Tasks",
    nav_notes: "Notes",
    nav_calendar: "Calendar",
    nav_analytics: "Analytics",
    nav_settings: "Settings",
    nav_audio: "Nature Audio",
    timer_start: "Start Focus",
    timer_pause: "Pause",
    timer_resume: "Resume",
    timer_reset: "Reset",
    today_focus: "Today's Focus",
    priority_high: "High Priority"
  };

  // Master baseline Arabic dictionary
  var MASTER_AR = {
    app_name: "التركيز العميق",
    nav_timer: "المؤقت",
    nav_tasks: "المهام",
    nav_notes: "الملاحظات",
    nav_calendar: "التقويم",
    nav_analytics: "التحليلات",
    nav_settings: "الإعدادات",
    nav_audio: "أصوات الطبيعة",
    timer_start: "بدء التركيز",
    timer_pause: "إيقاف مؤقت",
    timer_resume: "استئناف",
    timer_reset: "إعادة ضبط",
    today_focus: "تركيز اليوم",
    priority_high: "أولوية عالية"
  };

  // 100 Official Google Play Locales Registry (Excluding Hebrew)
  var SUPPORTED_LOCALES = [
    { code: "ar", name: "العربية", isRtl: true },
    { code: "en", name: "English", isRtl: false },
    { code: "es", name: "Español", isRtl: false },
    { code: "fr", name: "Français", isRtl: false },
    { code: "de", name: "Deutsch", isRtl: false },
    { code: "it", name: "Italiano", isRtl: false },
    { code: "pt", name: "Português", isRtl: false },
    { code: "ru", name: "Русский", isRtl: false },
    { code: "zh", name: "中文 (简体)", isRtl: false },
    { code: "ja", name: "日本語", isRtl: false },
    { code: "ko", name: "한국어", isRtl: false },
    { code: "tr", name: "Türkçe", isRtl: false },
    { code: "fa", name: "فارسی", isRtl: true },
    { code: "ur", name: "اردو", isRtl: true },
    { code: "hi", name: "हिन्दी", isRtl: false },
    { code: "id", name: "Bahasa Indonesia", isRtl: false },
    { code: "ms", name: "Bahasa Melayu", isRtl: false },
    { code: "bn", name: "বাংলা", isRtl: false },
    { code: "pl", name: "Polski", isRtl: false },
    { code: "sv", name: "Svenska", isRtl: false },
    { code: "nl", name: "Nederlands", isRtl: false },
    { code: "el", name: "Ελληνικά", isRtl: false },
    { code: "cs", name: "Čeština", isRtl: false },
    { code: "da", name: "Dansk", isRtl: false },
    { code: "fi", name: "Suomi", isRtl: false },
    { code: "no", name: "Norsk", isRtl: false },
    { code: "hu", name: "Magyar", isRtl: false },
    { code: "ro", name: "Română", isRtl: false },
    { code: "uk", name: "Українська", isRtl: false },
    { code: "vi", name: "Tiếng Việt", isRtl: false },
    { code: "th", name: "ไทย", isRtl: false },
    { code: "sw", name: "Kiswahili", isRtl: false },
    { code: "af", name: "Afrikaans", isRtl: false },
    { code: "am", name: "አማርኛ", isRtl: false },
    { code: "az", name: "Azərbaycan", isRtl: false },
    { code: "bg", name: "Български", isRtl: false },
    { code: "ca", name: "Català", isRtl: false },
    { code: "hr", name: "Hrvatski", isRtl: false },
    { code: "et", name: "Eesti", isRtl: false },
    { code: "fil", name: "Filipino", isRtl: false },
    { code: "ka", name: "ქართული", isRtl: false },
    { code: "gu", name: "ગુજરાતી", isRtl: false },
    { code: "is", name: "Íslenska", isRtl: false },
    { code: "kn", name: "ಕನ್ನಡ", isRtl: false },
    { code: "kk", name: "Қазақ тілі", isRtl: false },
    { code: "km", name: "ខ្មែរ", isRtl: false },
    { code: "lo", name: "ລາວ", isRtl: false },
    { code: "lv", name: "Latviešu", isRtl: false },
    { code: "lt", name: "Lietuvių", isRtl: false },
    { code: "mk", name: "Македонски", isRtl: false },
    { code: "ml", name: "മലയാളം", isRtl: false },
    { code: "mr", name: "मराठी", isRtl: false },
    { code: "mn", name: "Монгол", isRtl: false },
    { code: "my", name: "မြန်မာ", isRtl: false },
    { code: "ne", name: "नेपाली", isRtl: false },
    { code: "pa", name: "ਪੰਜਾਬੀ", isRtl: false },
    { code: "si", name: "සිංහල", isRtl: false },
    { code: "sk", name: "Slovenčina", isRtl: false },
    { code: "sl", name: "Slovenščina", isRtl: false },
    { code: "ta", name: "தமிழ்", isRtl: false },
    { code: "te", name: "తెలుగు", isRtl: false },
    { code: "uz", name: "O‘zbek", isRtl: false },
    { code: "zu", name: "isiZulu", isRtl: false },
    { code: "eu", name: "Euskara", isRtl: false },
    { code: "gl", name: "Galego", isRtl: false },
    { code: "hy", name: "Հայերեն", isRtl: false },
    { code: "sq", name: "Shqip", isRtl: false },
    { code: "bs", name: "Bosanski", isRtl: false },
    { code: "sr", name: "Српски", isRtl: false },
    { code: "be", name: "Беларуская", isRtl: false },
    { code: "cy", name: "Cymraeg", isRtl: false },
    { code: "ga", name: "Gaeilge", isRtl: false },
    { code: "gd", name: "Gàidhlig", isRtl: false },
    { code: "lb", name: "Lëtzebuergesch", isRtl: false },
    { code: "mt", name: "Malti", isRtl: false },
    { code: "so", name: "Soomaali", isRtl: false },
    { code: "yo", name: "Yorùbá", isRtl: false },
    { code: "ig", name: "Igbo", isRtl: false },
    { code: "ha", name: "Hausa", isRtl: false },
    { code: "xh", name: "isiXhosa", isRtl: false },
    { code: "st", name: "Sesotho", isRtl: false },
    { code: "tn", name: "Setswana", isRtl: false },
    { code: "sn", name: "chiShona", isRtl: false },
    { code: "rw", name: "Kinyarwanda", isRtl: false },
    { code: "mg", name: "Malagasy", isRtl: false },
    { code: "kmr", name: "Kurdî (Kurmancî)", isRtl: false },
    { code: "ckb", name: "کوردی (سۆرانی)", isRtl: true },
    { code: "ps", name: "پښتو", isRtl: true },
    { code: "sd", name: "سنڌي", isRtl: true },
    { code: "ug", name: "ئۇيغۇرچە", isRtl: true },
    { code: "tg", name: "Тоҷикӣ", isRtl: false },
    { code: "ky", name: "Кыргызча", isRtl: false },
    { code: "tk", name: "Türkmençe", isRtl: false },
    { code: "tt", name: "Татарча", isRtl: false },
    { code: "ba", name: "Башҡортса", isRtl: false },
    { code: "cv", name: "Чӑвашла", isRtl: false },
    { code: "ceb", name: "Cebuano", isRtl: false },
    { code: "jv", name: "Basa Jawa", isRtl: false },
    { code: "su", name: "Basa Sunda", isRtl: false },
    { code: "eo", name: "Esperanto", isRtl: false }
  ];

  // Dynamic custom locale translation dictionaries store
  var DICTIONARIES = {
    en: MASTER_EN,
    ar: MASTER_AR
  };

  /**
   * Checks if a locale code is strictly prohibited (Hebrew).
   */
  function isExcludedLocale(localeCode) {
    if (!localeCode || typeof localeCode !== 'string') return false;
    var norm = localeCode.toLowerCase().trim().split('-')[0].split('_')[0];
    return EXCLUDED_LOCALES.indexOf(norm) !== -1;
  }

  /**
   * Registers a translation pack for a locale defensively.
   */
  function registerDictionary(localeCode, translations) {
    if (!localeCode || typeof localeCode !== 'string') return false;
    if (isExcludedLocale(localeCode)) {
      return false; // Strictly refuse Hebrew
    }
    var norm = localeCode.toLowerCase().trim().split('-')[0].split('_')[0];
    DICTIONARIES[norm] = Object.assign({}, translations || {});
    return true;
  }

  /**
   * Retrieves translated string with zero-crash cascading fallback.
   * Cascade chain: Requested Locale -> en -> ar -> raw key.
   */
  function translate(localeCode, key) {
    if (!key || typeof key !== 'string') return '';

    // Safety: If Hebrew requested, redirect immediately to English
    var target = (localeCode && !isExcludedLocale(localeCode))
      ? String(localeCode).toLowerCase().trim().split('-')[0].split('_')[0]
      : 'en';

    // 1. Check requested locale dictionary
    if (DICTIONARIES[target] && DICTIONARIES[target][key]) {
      return DICTIONARIES[target][key];
    }

    // 2. Fallback to English
    if (MASTER_EN[key]) {
      return MASTER_EN[key];
    }

    // 3. Fallback to Arabic
    if (MASTER_AR[key]) {
      return MASTER_AR[key];
    }

    // 4. Fallback to raw key
    return key;
  }

  /**
   * Resolves locale metadata (direction RTL/LTR, native name).
   */
  function getLocaleMetadata(localeCode) {
    if (isExcludedLocale(localeCode)) {
      return Object.assign({}, SUPPORTED_LOCALES[1]); // Return English fallback
    }
    var norm = String(localeCode || 'en').toLowerCase().trim().split('-')[0].split('_')[0];
    for (var i = 0; i < SUPPORTED_LOCALES.length; i++) {
      if (SUPPORTED_LOCALES[i].code === norm) {
        return Object.assign({}, SUPPORTED_LOCALES[i]);
      }
    }
    return Object.assign({}, SUPPORTED_LOCALES[1]); // Default English
  }

  var engine = {
    EXCLUDED_LOCALES: EXCLUDED_LOCALES,
    SUPPORTED_LOCALES: SUPPORTED_LOCALES,
    isExcludedLocale: isExcludedLocale,
    registerDictionary: registerDictionary,
    translate: translate,
    getLocaleMetadata: getLocaleMetadata
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.GlobalI18nRegistry = engine;
  }
})(typeof window !== 'undefined' ? window : this);
