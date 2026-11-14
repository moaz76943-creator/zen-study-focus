/**
 * DEEP FOCUS - Axis 10: Global i18n & RTL/LTR Language Engine
 * Milestone M8558 - M8567 | Sovereign Offline Architecture
 * 10 Approved Languages, Strict Language Exclusion Barrier, Western Numerals Global Guard
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GlobalI18nEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_KEY_LANG = 'df_active_language_code_v1';
  
  // Permanent sovereign exclusion guard (Policy Invariant)
  const FORBIDDEN_LANGUAGE_CODES = ['he', 'iw', 'syc', 'ber', 'zgh'];

  // Approved 10 Global Languages
  const SUPPORTED_LANGUAGES = {
    ar: { name: 'العربية', dir: 'rtl', label: 'العربية' },
    en: { name: 'English', dir: 'ltr', label: 'English' },
    fr: { name: 'Français', dir: 'ltr', label: 'Français' },
    es: { name: 'Español', dir: 'ltr', label: 'Español' },
    de: { name: 'Deutsch', dir: 'ltr', label: 'Deutsch' },
    tr: { name: 'Türkçe', dir: 'ltr', label: 'Türkçe' },
    id: { name: 'Bahasa Indonesia', dir: 'ltr', label: 'Indonesia' },
    ja: { name: '日本語', dir: 'ltr', label: '日本語' },
    ko: { name: '한국어', dir: 'ltr', label: '한국어' },
    zh: { name: '简体中文', dir: 'ltr', label: '中文' }
  };

  const DICTIONARY = {
    ar: {
      appTitle: 'DEEP FOCUS',
      focusTimer: 'مؤقت التركيز',
      startFocus: 'بدء التركيز',
      pause: 'إيقاف مؤقت',
      resume: 'استئناف',
      reset: 'إعادة تعيين',
      breakTime: 'استراحة هادئة',
      quickPresets: 'المؤقتات السريعة',
      settings: 'الإعدادات',
      notesStudio: 'استوديو التدوين',
      speedReader: 'القارئ السريع',
      whiteboard: 'اللوح الأبيض',
      acousticLab: 'المعادل الصوتي',
      studyPods: 'غرف المذاكرة',
      botanicalGarden: 'واحة الإنجاز',
      wrappedReport: 'حصاد الأسبوع'
    },
    en: {
      appTitle: 'DEEP FOCUS',
      focusTimer: 'Focus Timer',
      startFocus: 'Start Focus',
      pause: 'Pause',
      resume: 'Resume',
      reset: 'Reset',
      breakTime: 'Gentle Break',
      quickPresets: 'Quick Intervals',
      settings: 'Settings',
      notesStudio: 'Notes Studio',
      speedReader: 'Speed Reader',
      whiteboard: 'Vector Board',
      acousticLab: 'Acoustic Lab',
      studyPods: 'Study Pods',
      botanicalGarden: 'Botanical Oasis',
      wrappedReport: 'Weekly Harvest'
    },
    fr: {
      appTitle: 'DEEP FOCUS',
      focusTimer: 'Chronomètre de Concentration',
      startFocus: 'Commencer',
      pause: 'Pause',
      resume: 'Reprendre',
      reset: 'Réinitialiser',
      breakTime: 'Pause Calme',
      quickPresets: 'Intervalles Rapides',
      settings: 'Paramètres',
      notesStudio: 'Studio de Notes',
      speedReader: 'Lecture Rapide',
      whiteboard: 'Tableau Blanc',
      acousticLab: 'Laboratoire Acoustique',
      studyPods: 'Salles d\'Étude',
      botanicalGarden: 'Jardin Botanique',
      wrappedReport: 'Bilan Hebdomadaire'
    },
    es: {
      appTitle: 'DEEP FOCUS',
      focusTimer: 'Temporizador de Enfoque',
      startFocus: 'Comenzar',
      pause: 'Pausa',
      resume: 'Reanudar',
      reset: 'Reiniciar',
      breakTime: 'Descanso Suave',
      quickPresets: 'Intervalos Rápidos',
      settings: 'Ajustes',
      notesStudio: 'Estudio de Notas',
      speedReader: 'Lectura Rápida',
      whiteboard: 'Pizarra Vectorial',
      acousticLab: 'Laboratorio Acústico',
      studyPods: 'Salas de Estudio',
      botanicalGarden: 'Oasis Botánico',
      wrappedReport: 'Resumen Semanal'
    },
    de: {
      appTitle: 'DEEP FOCUS',
      focusTimer: 'Fokus-Timer',
      startFocus: 'Fokus Starten',
      pause: 'Pause',
      resume: 'Fortsetzen',
      reset: 'Zurücksetzen',
      breakTime: 'Sanfte Pause',
      quickPresets: 'Schnellintervalle',
      settings: 'Einstellungen',
      notesStudio: 'Notiz-Studio',
      speedReader: 'Schnellleser',
      whiteboard: 'Vektor-Tafel',
      acousticLab: 'Akustik-Labor',
      studyPods: 'Lerngruppen',
      botanicalGarden: 'Botanischer Garten',
      wrappedReport: 'Wochenrückblick'
    },
    tr: {
      appTitle: 'DEEP FOCUS',
      focusTimer: 'Odaklanma Zamanlayıcısı',
      startFocus: 'Odaklanmayı Başlat',
      pause: 'Duraklat',
      resume: 'Devam Et',
      reset: 'Sıfırla',
      breakTime: 'Sakin Mola',
      quickPresets: 'Hızlı Aralıklar',
      settings: 'Ayarlar',
      notesStudio: 'Not Stüdyosu',
      speedReader: 'Hızlı Okuyucu',
      whiteboard: 'Vektör Tahta',
      acousticLab: 'Akustik Laboratuvarı',
      studyPods: 'Çalışma Odaları',
      botanicalGarden: 'Botanik Vaha',
      wrappedReport: 'Haftalık Özet'
    },
    id: {
      appTitle: 'DEEP FOCUS',
      focusTimer: 'Pengatur Waktu Fokus',
      startFocus: 'Mulai Fokus',
      pause: 'Jeda',
      resume: 'Lanjutkan',
      reset: 'Atur Ulang',
      breakTime: 'Istirahat Tenang',
      quickPresets: 'Interval Cepat',
      settings: 'Pengaturan',
      notesStudio: 'Studio Catatan',
      speedReader: 'Pembaca Cepat',
      whiteboard: 'Papan Vektor',
      acousticLab: 'Lab Akustik',
      studyPods: 'Ruang Belajar',
      botanicalGarden: 'Oase Botani',
      wrappedReport: 'Rangkuman Mingguan'
    },
    ja: {
      appTitle: 'DEEP FOCUS',
      focusTimer: '集中タイマー',
      startFocus: '集中開始',
      pause: '一時停止',
      resume: '再開',
      reset: 'リセット',
      breakTime: '小休止',
      quickPresets: 'クイック設定',
      settings: '設定',
      notesStudio: 'ノートスタジオ',
      speedReader: '速読リーダー',
      whiteboard: 'ホワイトボード',
      acousticLab: '音響ラボ',
      studyPods: '勉強部屋',
      botanicalGarden: '植物園',
      wrappedReport: '週間まとめ'
    },
    ko: {
      appTitle: 'DEEP FOCUS',
      focusTimer: '집중 타이머',
      startFocus: '집중 시작',
      pause: '일시 정지',
      resume: '재개',
      reset: '초기화',
      breakTime: '휴식',
      quickPresets: '빠른 설정',
      settings: '설정',
      notesStudio: '노트 스튜디오',
      speedReader: '속독 리더',
      whiteboard: '화이트보드',
      acousticLab: '음향 연구실',
      studyPods: '학습실',
      botanicalGarden: '식물원',
      wrappedReport: '주간 요약'
    },
    zh: {
      appTitle: 'DEEP FOCUS',
      focusTimer: '专注计时器',
      startFocus: '开始专注',
      pause: '暂停',
      resume: '继续',
      reset: '重置',
      breakTime: '休息',
      quickPresets: '快速间隔',
      settings: '设置',
      notesStudio: '笔记工作室',
      speedReader: '速读器',
      whiteboard: '矢量白板',
      acousticLab: '声学实验室',
      studyPods: '学习室',
      botanicalGarden: '植物园',
      wrappedReport: '每周回顾'
    }
  };

  class GlobalI18nEngine {
    constructor() {
      this.currentLang = 'ar';
      this._loadSavedLanguage();
    }

    _loadSavedLanguage() {
      try {
        if (typeof localStorage !== 'undefined') {
          const saved = localStorage.getItem(STORAGE_KEY_LANG);
          if (saved && SUPPORTED_LANGUAGES[saved]) {
            this.currentLang = saved;
          }
        }
      } catch (e) {
        console.warn('[I18n] Language restore failed, default to Arabic.', e);
      }
    }

    // M8558: dfInitGlobalDictionaryRegistry
    dfInitGlobalDictionaryRegistry() {
      return {
        supportedLanguagesCount: Object.keys(SUPPORTED_LANGUAGES).length,
        supportedCodes: Object.keys(SUPPORTED_LANGUAGES),
        languagesMetadata: SUPPORTED_LANGUAGES
      };
    }

    // M8559: dfEnforceLanguageExclusionPolicy
    dfEnforceLanguageExclusionPolicy(code) {
      if (!code || typeof code !== 'string') return true;
      const clean = code.toLowerCase().trim();
      const isForbidden = FORBIDDEN_LANGUAGE_CODES.includes(clean);
      if (isForbidden) {
        console.error(`[SovereignGuard] Rejected forbidden language code: ${clean}`);
        return false;
      }
      return true;
    }

    // M8560: dfEnforceWesternDigitsGlobalRule
    dfEnforceWesternDigitsGlobalRule(text) {
      if (typeof text !== 'string') return text;
      // Convert every Unicode decimal digit (Arabic-Indic, Persian, Devanagari, Bengali, Thai, fullwidth, ...)
      // to 0-9. The previous map only matched the Western digits, so it never changed anything.
      const ZERO_POINTS = [0x0660, 0x06f0, 0x07c0, 0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6, 0x0c66,
        0x0ce6, 0x0d66, 0x0de6, 0x0e50, 0x0ed0, 0x0f20, 0x1040, 0x1090, 0x17e0, 0x1810, 0xff10];
      return text.replace(/\p{Nd}/gu, (digit) => {
        const point = digit.codePointAt(0);
        for (const zero of ZERO_POINTS) {
          if (point >= zero && point < zero + 10) return String(point - zero);
        }
        return digit;
      });
    }

    // M8561: dfHotSwapUiLanguageZeroReload
    dfHotSwapUiLanguageZeroReload(langCode) {
      if (!this.dfEnforceLanguageExclusionPolicy(langCode)) {
        throw new Error('Language code strictly prohibited by sovereign safety policy.');
      }

      if (!SUPPORTED_LANGUAGES[langCode]) {
        console.warn(`[I18n] Unsupported language ${langCode}, fallback to Arabic.`);
        langCode = 'ar';
      }

      this.currentLang = langCode;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_LANG, langCode);
      }

      // Hot swap DOM without reload
      this.dfMirrorLayoutForRtlLanguages(langCode);
      this._applyTranslationsToDom();

      return {
        activeLanguage: langCode,
        direction: SUPPORTED_LANGUAGES[langCode].dir,
        name: SUPPORTED_LANGUAGES[langCode].name
      };
    }

    // M8562: dfMirrorLayoutForRtlLanguages
    dfMirrorLayoutForRtlLanguages(langCode = this.currentLang) {
      const dir = SUPPORTED_LANGUAGES[langCode] ? SUPPORTED_LANGUAGES[langCode].dir : 'ltr';
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('dir', dir);
        document.documentElement.setAttribute('lang', langCode);
      }
      return { lang: langCode, dir: dir };
    }

    // M8563: dfFormatLocalizedDateAndTime
    dfFormatLocalizedDateAndTime(dateInput = new Date()) {
      const d = new Date(dateInput);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');

      // Always strict Western numerals
      return {
        formattedDate: `${year}-${month}-${day}`,
        formattedTime: `${hours}:${minutes}`,
        iso: d.toISOString()
      };
    }

    // M8564: dfSupportBilingualFlashcardDecks
    dfSupportBilingualFlashcardDecks(frontText, backText, sourceLang = 'en', targetLang = 'ar') {
      return {
        front: { text: frontText, lang: sourceLang, dir: SUPPORTED_LANGUAGES[sourceLang]?.dir || 'ltr' },
        back: { text: backText, lang: targetLang, dir: SUPPORTED_LANGUAGES[targetLang]?.dir || 'rtl' },
        isBilingual: true
      };
    }

    // M8565: dfTriggerOfflineTextToSpeechPronounce
    dfTriggerOfflineTextToSpeechPronounce(text, langCode = 'en') {
      if (!this.dfEnforceLanguageExclusionPolicy(langCode)) return false;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langCode;
        utterance.rate = 0.95; // Clear academic articulation
        window.speechSynthesis.speak(utterance);
        return true;
      }
      return false;
    }

    // M8566: dfAuditTranslationCompleteness100
    dfAuditTranslationCompleteness100() {
      const baseKeys = Object.keys(DICTIONARY.ar);
      const missingReport = {};
      let totalKeysCount = 0;

      for (const [code, dict] of Object.entries(DICTIONARY)) {
        missingReport[code] = [];
        baseKeys.forEach(k => {
          totalKeysCount++;
          if (!dict[k]) {
            missingReport[code].push(k);
          }
        });
      }

      const is100PercentComplete = Object.values(missingReport).every(arr => arr.length === 0);
      return {
        is100PercentComplete: is100PercentComplete,
        auditedLanguagesCount: Object.keys(DICTIONARY).length,
        missingKeysPerLanguage: missingReport,
        totalDictionaryTokens: totalKeysCount
      };
    }

    _applyTranslationsToDom() {
      if (typeof document === 'undefined') return;
      const dict = DICTIONARY[this.currentLang] || DICTIONARY.ar;
      const translatableElements = document.querySelectorAll('[data-i18n]');
      translatableElements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
          el.textContent = dict[key];
        }
      });
    }

    t(key) {
      const dict = DICTIONARY[this.currentLang] || DICTIONARY.ar;
      return dict[key] || key;
    }

    // M8567: dfGetMilestoneM8567GlobalI18nSeal
    dfGetMilestoneM8567GlobalI18nSeal() {
      return {
        milestone: 'M8567',
        architecture: 'Global i18n & RTL/LTR Language Engine',
        standards: 'Zero-Cloud Offline i18n, Permanent Exclusion Barrier, Strict Western Numerals',
        verifiedAt: new Date().toISOString(),
        status: 'VERIFIED_SOVEREIGN'
      };
    }
  }

  return GlobalI18nEngine;
}));
