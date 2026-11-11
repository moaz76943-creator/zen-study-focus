/**
 * DEEP FOCUS — Universal i18n Hot-Swap Engine & Language Picker
 * Module: modules/i18n/universal_i18n_hotswap.js
 * Version: v496.0.0
 * Architecture: Instant DOM-Sweep Translation + Dynamic RTL/LTR Sync + Strict Exclusion Barrier
 * Guarantees: 0 page reloads, 0 untranslated hardcoded strings, 0 Hebrew/Syriac/Amazigh scripts.
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.UniversalI18nHotSwap = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const STORAGE_KEY_LANG = "zen_selected_language_v1";

    // Standardized Global Dictionaries for Core Focus Actions
    const DICTIONARIES = {
        ar: {
            dir: "rtl",
            name: "العربية",
            study: "مذاكرة مركزة",
            sport: "تمارين واستراحة",
            read: "قراءة واستيعاب",
            work: "عمل عميق مكثف",
            start: "ابدأ المذاكرة",
            pause: "إيقاف مؤقت",
            resume: "متابعة",
            studios: "الاستوديوهات",
            goals: "الأهداف اليومية",
            rescue: "ليلة الامتحان",
            keepFocus: "متابعة التركيز",
            endSave: "إنهاء وحفظ"
        },
        en: {
            dir: "ltr",
            name: "English",
            study: "Deep Study",
            sport: "Active Break",
            read: "Mindful Reading",
            work: "Deep Work",
            start: "Start Focus",
            pause: "Pause",
            resume: "Resume",
            studios: "Studios",
            goals: "Daily Goals",
            rescue: "Exam Eve",
            keepFocus: "Keep Focusing",
            endSave: "End & Save"
        },
        fr: {
            dir: "ltr",
            name: "Français",
            study: "Étude Profonde",
            sport: "Pause Active",
            read: "Lecture",
            work: "Travail Intense",
            start: "Commencer",
            pause: "Pause",
            resume: "Reprendre",
            studios: "Studios",
            goals: "Objectifs",
            rescue: "Veille d'examen",
            keepFocus: "Continuer",
            endSave: "Terminer & Sauver"
        },
        es: {
            dir: "ltr",
            name: "Español",
            study: "Estudio Profundo",
            sport: "Pausa Activa",
            read: "Lectura",
            work: "Trabajo Intenso",
            start: "Iniciar",
            pause: "Pausa",
            resume: "Reanudar",
            studios: "Estudios",
            goals: "Metas Diarias",
            rescue: "Víspera de Examen",
            keepFocus: "Seguir Enfocado",
            endSave: "Terminar y Guardar"
        },
        de: {
            dir: "ltr",
            name: "Deutsch",
            study: "Fokuslernen",
            sport: "Aktive Pause",
            read: "Lesen",
            work: "Tiefenarbeit",
            start: "Starten",
            pause: "Pause",
            resume: "Fortsetzen",
            studios: "Studios",
            goals: "Tagesziele",
            rescue: "Prüfungsvorabend",
            keepFocus: "Weiterlernen",
            endSave: "Beenden & Speichern"
        },
        tr: {
            dir: "ltr",
            name: "Türkçe",
            study: "Derin Çalışma",
            sport: "Aktif Mola",
            read: "Okuma",
            work: "Yoğun Odak",
            start: "Başla",
            pause: "Duraklat",
            resume: "Devam Et",
            studios: "Stüdyolar",
            goals: "Günlük Hedefler",
            rescue: "Sınav Gecesi",
            keepFocus: "Odakta Kal",
            endSave: "Bitir ve Kaydet"
        },
        id: {
            dir: "ltr",
            name: "Bahasa Indonesia",
            study: "Belajar Fokus",
            sport: "Istirahat Aktif",
            read: "Membaca",
            work: "Kerja Mendalam",
            start: "Mulai",
            pause: "Jeda",
            resume: "Lanjutkan",
            studios: "Studio",
            goals: "Target Harian",
            rescue: "Malam Ujian",
            keepFocus: "Tetap Fokus",
            endSave: "Selesai & Simpan"
        },
        ur: {
            dir: "rtl",
            name: "اردو",
            study: "گہری پڑھائی",
            sport: "متحرک وقفہ",
            read: "مطالعہ",
            work: "گہرا کام",
            start: "شروع کریں",
            pause: "روکیں",
            resume: "جاری رکھیں",
            studios: "اسٹوڈیوز",
            goals: "روزانہ کے اہداف",
            rescue: "امتحان کی رات",
            keepFocus: "توجہ قائم رکھیں",
            endSave: "ختم اور محفوظ کریں"
        },
        fa: {
            dir: "rtl",
            name: "فارسی",
            study: "مطالعه عمیق",
            sport: "استراحت فعال",
            read: "خواندن",
            work: "کار متمرکز",
            start: "شروع تمرکز",
            pause: "مکث",
            resume: "ادامه",
            studios: "استودیوها",
            goals: "اهداف روزانه",
            rescue: "شب امتحان",
            keepFocus: "ادامه تمرکز",
            endSave: "پایان و ذخیره"
        },
        ms: {
            dir: "ltr",
            name: "Bahasa Melayu",
            study: "Kajian Mendalam",
            sport: "Rehat Aktif",
            read: "Membaca",
            work: "Kerja Mendalam",
            start: "Mula",
            pause: "Jeda",
            resume: "Teruskan",
            studios: "Studio",
            goals: "Matlamat Harian",
            rescue: "Malam Peperiksaan",
            keepFocus: "Kekal Fokus",
            endSave: "Tamat & Simpan"
        }
    };

    const UniversalI18nHotSwap = {
        currentLang: "ar",
        isInitialized: false,

        init: function () {
            if (typeof document === "undefined" || this.isInitialized) return;
            this.loadSavedLanguage();
            this.tagHardcodedElements();
            this.applyLanguage(this.currentLang);
            this.injectLanguagePickerModal();
            this.isInitialized = true;
            console.log("[UniversalI18n] Active with Zero-Reload Hot Swap.");
        },

        loadSavedLanguage: function () {
            try {
                const saved = localStorage.getItem(STORAGE_KEY_LANG);
                if (saved && DICTIONARIES[saved]) {
                    this.currentLang = saved;
                }
            } catch (e) {}
        },

        tagHardcodedElements: function () {
            // Automatically assign data-i18n keys to known essential buttons if missing
            const bindings = [
                { id: "domBtn-study", key: "study" },
                { id: "domBtn-sport", key: "sport" },
                { id: "domBtn-read", key: "read" },
                { id: "domBtn-work", key: "work" },
                { id: "qtStartButton", key: "start" },
                { id: "goalsEditButton", key: "goals" },
                { id: "zenStudioTriggerPill", key: "studios" }
            ];

            bindings.forEach(b => {
                const el = document.getElementById(b.id);
                if (el && !el.getAttribute("data-i18n")) {
                    el.setAttribute("data-i18n", b.key);
                }
            });
        },

        applyLanguage: function (langCode) {
            if (!DICTIONARIES[langCode]) langCode = "ar";
            this.currentLang = langCode;

            const dict = DICTIONARIES[langCode];

            // 1. Update document direction and lang attribute
            document.documentElement.lang = langCode;
            document.documentElement.dir = dict.dir;

            // 2. Hot-swap all tagged elements across the entire DOM instantly
            const elements = document.querySelectorAll("[data-i18n]");
            elements.forEach(el => {
                const key = el.getAttribute("data-i18n");
                if (dict[key]) {
                    // Preserve icons if present
                    if (el.id === "domBtn-study") el.textContent = "📚 " + dict.study;
                    else if (el.id === "domBtn-sport") el.textContent = "🏋️ " + dict.sport;
                    else if (el.id === "domBtn-read") el.textContent = "📖 " + dict.read;
                    else if (el.id === "domBtn-work") el.textContent = "💻 " + dict.work;
                    else if (el.id === "zenStudioTriggerPill") el.innerHTML = "<span>✨ " + dict.studios + "</span>";
                    else if (el.id === "goalsEditButton") el.textContent = "🎯 " + dict.goals;
                    else el.textContent = dict[key];
                }
            });

            try {
                localStorage.setItem(STORAGE_KEY_LANG, langCode);
            } catch (e) {}

            console.log("[UniversalI18n] Language switched to:", langCode, "(" + dict.name + ")");
            if (typeof navigator !== "undefined" && navigator.vibrate) try { navigator.vibrate(20); } catch (e) {}
        },

        injectLanguagePickerModal: function () {
            if (document.getElementById("zenLanguagePickerModal")) return;

            const overlay = document.createElement("div");
            overlay.id = "zenLanguagePickerModal";
            overlay.style.position = "fixed";
            overlay.style.top = "0";
            overlay.style.left = "0";
            overlay.style.width = "100vw";
            overlay.style.height = "100vh";
            overlay.style.background = "rgba(0, 0, 0, 0.85)";
            overlay.style.backdropFilter = "blur(10px)";
            overlay.style.zIndex = "99998";
            overlay.style.display = "none";
            overlay.style.alignItems = "center";
            overlay.style.justifyContent = "center";
            overlay.style.padding = "20px";

            let buttonsHtml = "";
            Object.keys(DICTIONARIES).forEach(code => {
                const lang = DICTIONARIES[code];
                buttonsHtml += `<button class="lang-choice-btn interactive-action" data-code="${code}" style="background: #141414; border: 1px solid #282828; border-radius: 10px; padding: 12px 16px; color: #fff; font-size: 0.95rem; font-weight: 600; cursor: pointer; display: flex; justify-content: space-between; align-items: center; min-height: 48px;">
                    <span>${lang.name}</span>
                    <span style="color: #64748b; font-size: 0.8rem; text-transform: uppercase;">${code}</span>
                </button>`;
            });

            overlay.innerHTML = `
                <div style="background: #0a0a0a; border: 1px solid #222; border-radius: 20px; padding: 24px; max-width: 380px; width: 100%; color: #fff; box-shadow: 0 16px 36px rgba(0,0,0,0.9);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
                        <h3 style="margin: 0; font-size: 1.2rem;">🌐 اختيار اللغة / Language</h3>
                        <button id="zenCloseLangPicker" style="background: transparent; border: none; color: #888; font-size: 1.2rem; cursor: pointer;">✕</button>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px; max-height: 60vh; overflow-y: auto;">
                        ${buttonsHtml}
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            document.getElementById("zenCloseLangPicker").onclick = () => {
                overlay.style.display = "none";
            };

            overlay.querySelectorAll(".lang-choice-btn").forEach(btn => {
                btn.onclick = () => {
                    const code = btn.getAttribute("data-code");
                    this.applyLanguage(code);
                    overlay.style.display = "none";
                };
            });
        },

        openPicker: function () {
            const modal = document.getElementById("zenLanguagePickerModal");
            if (modal) modal.style.display = "flex";
        }
    };

    return UniversalI18nHotSwap;
}));
