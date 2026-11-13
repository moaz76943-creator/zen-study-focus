/**
 * DEEP FOCUS — Universal Authentic i18n Hot-Swap Engine (v619.0.0)
 * Translates:
 *   1. All [data-i18n] elements & placeholders
 *   2. Any untagged DOM text nodes matching known English/Romanian/Arabic UI strings
 *   3. Calendar Month + Year headers & Weekday headers via Intl.DateTimeFormat(code + '-u-nu-latn')
 *   4. Enforces Western Arabic numerals (0123456789) across all inputs and labels.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.UniversalI18nHotSwap = factory();
  }
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var STORAGE_KEY_LANG = "zen_selected_language_v1";
  var EXCLUDED_CODES = new Set(["he", "iw", "syc", "ber", "zgh"]);
  var LOADED_LOCALES = {};
  var PHRASE_TO_KEY = {
    "sky & thunder ⚡": "ui_sound_tab_earth_thunder",
    "sky & thunder": "ui_sound_tab_earth_thunder",
    "الترتيب": "ui_sort_label",
    "sort": "ui_sort_label",
    "your progress": "ui_your_progress",
    "view all": "ui_view_all",
    "view all ↗": "ui_view_all",
    "start training": "ui_start_training",
    "pure nature studio ready": "ui_pure_nature_ready",
    "pure nature\nstudio ready": "ui_pure_nature_ready",
    "syllabus": "ui_syllabus",
    "quick session": "ui_quick_session",
    "studio suite": "ui_studio_suite",
    "stem & exam studio": "ui_stem_studio",
    "pure svg stem & strict exam simulator": "ui_stem_sub",
    "quick training": "ui_quick_training",
    "custom work-and-rest intervals": "ui_custom_intervals",
    "rest (mm:ss)": "ui_rest_mmss",
    "work (mm:ss)": "ui_work_mmss",
    "sets": "ui_sets",
    "skip final rest": "ui_skip_final_rest",
    "exercise sequence": "ui_exercise_seq",
    "e.g. stretches or deep reading": "ui_ex_placeholder",
    "add +": "ui_add_plus",
    "today's plan": "ui_todays_plan",
    "120 fps engine": "ui_fps_120",
    "fps engine 120": "ui_fps_120",
    "verified sessions / 7 days": "ui_verified_7d",
    "recorded minutes / 7 days": "ui_recorded_7d",
    "phaddtask": "phAddTask",
    "add study, workout or reading goal": "phAddTask",
    "add study, workout or reading goal...": "phAddTask",
    "phcustommins": "phCustomMins",
    "minutes (1-240)": "phCustomMins",
    "phcustomtitle": "phCustomTitle",
    "session name (study, gym, reading, work)": "phCustomTitle",
    "session name (study, gym, reading, work)...": "phCustomTitle",
    "phsearchnotes": "phSearchNotes",
    "search notes": "phSearchNotes",
    "search notes...": "phSearchNotes",
    "phnotetitle": "phNoteTitle",
    "title or question": "phNoteTitle",
    "phnotebody": "phNoteBody",
    "phquickdump": "phNoteBody",
    "write here": "phNoteBody",
    "write here...": "phNoteBody",
    "exerciseplaceholder": "phAddTask",
    "langsearchplaceholder": "langSearchPlaceholder",
    "search language or country (e.g. jordan, spain, usa, مصر)": "langSearchPlaceholder",
    "phrestorepayload": "phRestorePayload",
    "paste your backup code here (contains readable data)": "phRestorePayload",
    "paste your backup code here (contains readable data)...": "phRestorePayload",
    "best daily minutes": "dyn_best_daily_minutes",
    "consistency grade": "dyn_consistency_grade",
    "deep focus 25m": "dyn_deep_focus_25m",
    "delegate / batch": "dyn_delegate_batch",
    "eliminate / defer": "dyn_eliminate_defer",
    "fsrs drill": "dyn_fsrs_drill",
    "fluency speed": "dyn_fluency_speed",
    "problem / effect": "dyn_problem_effect",
    "recall streak": "dyn_recall_streak",
    "recalled facts": "dyn_recalled_facts",
    "start session": "dyn_start_session",
    "urgent & important": "dyn_urgent_important",
    "words recalled": "dyn_words_recalled",
    "yes": "dyn_yes",
    "zero-music": "dyn_zero_music",
    "local data": "ui_local_data",
    "🔒 local data": "ui_local_data",
    "manual backup": "ui_manual_backup",
    "☁️ manual backup": "ui_manual_backup",
    "test sound": "ui_test_sound",
    "🔔 test sound": "ui_test_sound",
    "focus space": "ui_focus_space",
    "✦ focus space": "ui_focus_space",
    "ready to focus": "ui_ready_to_focus",
    "custom": "ui_custom",
    "custom ⚡": "ui_custom",
    "study 25m": "ui_study_25m",
    "plan • execute • achieve": "ui_plan_exec_achieve",
    "plan · execute · achieve": "ui_plan_exec_achieve",
    "120 fps engine": "ui_120fps_engine",
    "⚡ 120 fps engine": "ui_120fps_engine",
    "zen sanctuary & 365 heatmap": "ui_zen_sanctuary_heatmap",
    "zen sanctuary & 365 heatmap ↗": "ui_zen_sanctuary_heatmap",
    "active minutes": "ui_active_minutes",
    "completed sessions": "ui_completed_sessions",
    "0 recorded minutes / 7 days": "ui_recorded_min_7d",
    "0 verified sessions / 7 days": "ui_verified_sess_7d",
    "multi-domain distribution": "ui_multi_domain_dist",
    "this week": "ui_this_week",
    "study": "study",
    "📚 study": "study",
    "workout": "sport",
    "sport": "sport",
    "🏋️ sport": "sport",
    "reading": "read",
    "📖 reading": "read",
    "deep work": "work",
    "weekly performance index": "ui_weekly_perf_index",
    "nature sound controls": "ui_nature_sound_controls",
    "3d spatial & 40hz": "ui_3d_spatial",
    "🎧 3d spatial & 40hz": "ui_3d_spatial",
    "mix": "ui_mix",
    "✨ mix": "ui_mix",
    "stop": "ui_stop",
    "⏹ stop": "ui_stop",
    "all (12)": "ui_all_sounds",
    "all (6)": "ui_all_sounds",
    "water & rain": "soundRain",
    "forest & wind": "soundForest",
    "fire & earth": "soundWaves",
    "completion sound": "ui_completion_sound",
    "choose a sound": "ui_choose_sound",
    "zen bell": "ui_zen_bell",
    "tibetan bowl": "ui_tibetan_bowl",
    "crystal bell": "ui_crystal_bell",
    "preview": "ui_preview",
    "structured notes": "ui_structured_notes",
    "active recall": "flashcardTitle",
    "reading summary": "ui_reading_summary",
    "search notes": "shieldPlaceholder",
    "+ add note to date": "ui_add_note_date",
    "add note to date": "ui_add_note_date",
    "all": "ui_all",
    "active": "ui_active",
    "completed": "completed",
    "syllabus": "ui_syllabus",
    "🗺️ syllabus": "ui_syllabus",
    "sun": "sun",
    "mon": "mon",
    "tue": "tue",
    "wed": "wed",
    "thu": "thu",
    "fri": "fri",
    "sat": "sat"
  };

  function toWesternDigits(str) {
    if (typeof str !== "string") return str;
    return str
      .replace(/[٠-٩]/g, function (d) { return String("٠١٢٣٤٥٦٧٨٩".indexOf(d)); })
      .replace(/[۰-۹]/g, function (d) { return String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)); });
  }

  var UniversalI18nHotSwap = {
    currentLang: "ar",
    activeDictionary: {},

    init: function () {
      if (typeof document === "undefined") return;
      var saved = null;
      try { saved = localStorage.getItem(STORAGE_KEY_LANG); } catch (e) {}
      // The app's own language (cfg.lang -> window.DF_CURRENT_LOCALE) is the single source of
      // truth; this engine used to default to Arabic and overwrite an English/French UI.
      var appLang = (typeof window !== "undefined" && window.DF_CURRENT_LOCALE) || null;
      var initial = (appLang && this.isLanguageAllowed(appLang)) ? appLang
        : ((saved && this.isLanguageAllowed(saved)) ? saved : "ar");
      this.applyLanguage(initial);
    },

    getCurrentLocale: function () {
      return this.currentLang || "ar";
    },

    isLanguageAllowed: function (code) {
      if (!code || typeof code !== "string") return false;
      var c = code.toLowerCase().split("-")[0].split("_")[0];
      return !EXCLUDED_CODES.has(c) && !c.startsWith("iso");
    },

    loadLocale: function (code, callback) {
      var self = this;
      var cleanCode = String(code || "ar").toLowerCase().split("-")[0].split("_")[0];
      if (!this.isLanguageAllowed(cleanCode)) cleanCode = "ar";

      if (LOADED_LOCALES[cleanCode]) {
        this.activeDictionary = LOADED_LOCALES[cleanCode];
        if (callback) callback(LOADED_LOCALES[cleanCode]);
        return;
      }

      if (typeof window !== "undefined" && window.SovereignLocaleResolver && typeof window.SovereignLocaleResolver.getLocale === "function") {
        window.SovereignLocaleResolver.getLocale(cleanCode).then(function (dict) {
          if (dict) {
            LOADED_LOCALES[cleanCode] = dict;
            self.activeDictionary = dict;
            if (callback) callback(dict);
          } else {
            self._xhrLoad(cleanCode, callback);
          }
        }).catch(function () {
          self._xhrLoad(cleanCode, callback);
        });
        return;
      }
      this._xhrLoad(cleanCode, callback);
    },

    _xhrLoad: function (cleanCode, callback) {
      var self = this;
      if (typeof XMLHttpRequest === "undefined") return;
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "locales/" + cleanCode + ".json", true);
      xhr.onload = function () {
        if (xhr.status === 200 || xhr.status === 0) {
          try {
            var parsed = JSON.parse(xhr.responseText);
            LOADED_LOCALES[cleanCode] = parsed;
            self.activeDictionary = parsed;
            if (callback) callback(parsed);
            return;
          } catch (e) {}
        }
      };
      xhr.send();
    },

    setLanguage: function (code) { return this.applyLanguage(code); },

    applyLanguage: function (code) {
      var self = this;
      var cleanCode = String(code || "ar").toLowerCase().split("-")[0].split("_")[0];
      if (!this.isLanguageAllowed(cleanCode)) return;

      this.currentLang = cleanCode;
      try { localStorage.setItem(STORAGE_KEY_LANG, cleanCode); } catch (e) {}

      this.loadLocale(cleanCode, function (dict) {
        if (typeof document === "undefined") return;
        var dir = dict.dir || "ltr";
        document.documentElement.setAttribute("dir", dir);
        document.documentElement.setAttribute("lang", cleanCode + "-u-nu-latn");
        if (document.body) {
          document.body.setAttribute("dir", dir);
        }
        if (window.SovereignBidiEngine && typeof window.SovereignBidiEngine.setDirection === "function") {
          window.SovereignBidiEngine.setDirection(cleanCode);
        }
        self.sweepDom(dict);
      });
    },

    sweepDom: function (dict) {
      if (typeof document === "undefined") return;
      dict = dict || this.activeDictionary || {};
      var lang = this.currentLang || "ar";

      // 1. Tag any untagged element whose text matches PHRASE_TO_KEY
      var allEls = document.querySelectorAll("button, span, div, h1, h2, h3, h4, p, label, a, th, td, option");
      for (var i = 0; i < allEls.length; i++) {
        var el = allEls[i];
        if (el.children.length === 0 && !el.hasAttribute("data-i18n")) {
          var rawTxt = (el.textContent || "").trim().toLowerCase();
          if (PHRASE_TO_KEY[rawTxt]) {
            el.setAttribute("data-i18n", PHRASE_TO_KEY[rawTxt]);
          }
        }
      }


      // 3. Translate [placeholder], [title], and [aria-label] attributes cleanly
      var attrTargets = document.querySelectorAll("[placeholder], [title], [aria-label]");
      for (var a = 0; a < attrTargets.length; a++) {
        var elA = attrTargets[a];
        ["placeholder", "title", "aria-label"].forEach(function (attrName) {
          if (!elA.hasAttribute(attrName)) return;
          var origAttr = "data-orig-" + attrName;
          if (!elA.hasAttribute(origAttr)) {
            elA.setAttribute(origAttr, elA.getAttribute(attrName) || "");
          }
          var origVal = (elA.getAttribute(origAttr) || "").trim();
          var lookup = origVal.toLowerCase().replace(/\.\.\.$/, "").trim();
          var key = PHRASE_TO_KEY[origVal.toLowerCase()] || PHRASE_TO_KEY[lookup];
          if (key && dict[key]) {
            elA.setAttribute(attrName, dict[key]);
          } else if (lang === "en" && origVal) {
            elA.setAttribute(attrName, origVal);
          }
        });
      }


      // 4. Task #815: Enforce Western digits (0-9) & fix Local Data contrast + dynamic stats labels
      var allButtons815 = document.querySelectorAll("button, .pill, .chip, a");
      for (var b = 0; b < allButtons815.length; b++) {
        var btn815 = allButtons815[b];
        var bt = (btn815.textContent || "").trim();
        if (bt.indexOf("بيانات محلية") !== -1 || bt.toLowerCase().indexOf("local data") !== -1) {
          btn815.style.setProperty("color", "#0F172A", "important");
          btn815.style.setProperty("background", "#F1F5F9", "important");
          btn815.style.setProperty("border", "1px solid #CBD5E1", "important");
        }
      }
      var statNodes815 = document.querySelectorAll("div, span, p, small");
      for (var s = 0; s < statNodes815.length; s++) {
        var sn = statNodes815[s];
        if (sn.children.length === 0 && sn.textContent) {
          var st = sn.textContent.trim();
          var stl = st.toLowerCase();
          if (stl.indexOf("verified sessions / 7 days") !== -1 && dict.ui_verified_7d) {
            sn.textContent = st.replace(/verified sessions \/ 7 days/i, dict.ui_verified_7d);
          } else if (stl.indexOf("recorded minutes / 7 days") !== -1 && dict.ui_recorded_7d) {
            sn.textContent = st.replace(/recorded minutes \/ 7 days/i, dict.ui_recorded_7d);
          }
          sn.textContent = sn.textContent.replace(/[٠-٩]/g, function (d) { return String("٠١٢٣٤٥٦٧٨٩".indexOf(d)); });
        }
      }


      // Task #820: Guarantee 🔒 Local Data button contrast on every tab
      var lockBtns = document.querySelectorAll("button, .pill, .chip, a");
      for (var lb = 0; lb < lockBtns.length; lb++) {
        var b820 = lockBtns[lb];
        if ((b820.textContent || "").indexOf("🔒") !== -1) {
          b820.style.setProperty("color", "#0F172A", "important");
          b820.style.setProperty("background", "#F1F5F9", "important");
          b820.style.setProperty("border", "1px solid #CBD5E1", "important");
          b820.style.setProperty("opacity", "1", "important");
        }
      }


      // Task #834: Force Western digits in native <input type="date"> even on Arabic Android OS
      var dInputs = document.querySelectorAll('input[type="date"]');
      for (var di = 0; di < dInputs.length; di++) {
        dInputs[di].setAttribute("lang", "en");
      }


      // Task #833: Force Western digits (0123456789) on all visible text & inputs + 🔒 span color
      var eDigits = /[\u0660-\u0669\u06F0-\u06F9]/g;
      var toWest = function (s) {
        return String(s).replace(eDigits, function (c) {
          var code = c.charCodeAt(0);
          return String(code >= 0x06F0 ? code - 0x06F0 : code - 0x0660);
        });
      };
      var w833 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      var n833;
      while ((n833 = w833.nextNode())) {
        if (n833.nodeValue && eDigits.test(n833.nodeValue)) {
          n833.nodeValue = toWest(n833.nodeValue);
        }
      }
      var lockSpans = document.querySelectorAll('[data-i18n="ui_local_data"], [data-i18n="ui_local_data"] *');
      for (var ls = 0; ls < lockSpans.length; ls++) {
        lockSpans[ls].style.setProperty("color", "#0F172A", "important");
        lockSpans[ls].style.setProperty("opacity", "1", "important");
      }


      // Task #835: Western digits + <input type="date" lang="en"> + 🔒 span contrast
      var eDigits835 = /[\u0660-\u0669\u06F0-\u06F9]/g;
      var toWest835 = function (s) {
        return String(s).replace(eDigits835, function (c) {
          var code = c.charCodeAt(0);
          return String(code >= 0x06F0 ? code - 0x06F0 : code - 0x0660);
        });
      };
      var w835 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      var n835;
      while ((n835 = w835.nextNode())) {
        if (n835.nodeValue && eDigits835.test(n835.nodeValue)) {
          n835.nodeValue = toWest835(n835.nodeValue);
        }
      }
      var dIn835 = document.querySelectorAll('input[type="date"]');
      for (var di = 0; di < dIn835.length; di++) {
        dIn835[di].setAttribute("lang", "en");
      }
      var lockSp835 = document.querySelectorAll('[data-i18n="ui_local_data"], [data-i18n="ui_local_data"] *');
      for (var ls = 0; ls < lockSp835.length; ls++) {
        lockSp835[ls].style.setProperty("color", "#0F172A", "important");
        lockSp835[ls].style.setProperty("opacity", "1", "important");
      }

      // 2. Translate all [data-i18n] elements
      var tagged = document.querySelectorAll("[data-i18n]");
      for (var j = 0; j < tagged.length; j++) {
        var node = tagged[j];
        var key = node.getAttribute("data-i18n");
        // A container with child elements (icon/title/duration) must not be flattened to text.
        if (node.children && node.children.length > 0 && node.tagName !== "INPUT" && node.tagName !== "TEXTAREA") continue;
        if (key && dict[key]) {
          var val = toWesternDigits(dict[key]);
          if (node.tagName === "INPUT" || node.tagName === "TEXTAREA") {
            node.placeholder = val;
          } else {
            node.textContent = val;
          }
        }
      }

      // 3. Translate input placeholders
      var inputs = document.querySelectorAll("input[placeholder], textarea[placeholder]");
      for (var k = 0; k < inputs.length; k++) {
        var inp = inputs[k];
        var ph = (inp.getAttribute("placeholder") || "").trim().toLowerCase();
        if (ph.indexOf("search") !== -1 || ph.indexOf("add study") !== -1 || ph.indexOf("note") !== -1) {
          if (dict.shieldPlaceholder) inp.setAttribute("placeholder", toWesternDigits(dict.shieldPlaceholder));
        }
      }

      // 4. Localize Calendar Month + Year Header (e.g., "November 2026") using Intl.DateTimeFormat
      var monthRegex = /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i;
      var monthNamesEn = ["january","february","march","april","may","june","july","august","september","october","november","december"];
      for (var m = 0; m < allEls.length; m++) {
        var mel = allEls[m];
        if (mel.children.length === 0) {
          var mtxt = (mel.textContent || "").trim();
          var mm = mtxt.match(monthRegex);
          if (mm) {
            var mIdx = monthNamesEn.indexOf(mm[1].toLowerCase());
            var yr = parseInt(mm[2], 10);
            if (mIdx !== -1 && typeof Intl !== "undefined" && Intl.DateTimeFormat) {
              try {
                var dtf = new Intl.DateTimeFormat(lang + "-u-nu-latn", { month: "long", year: "numeric" });
                mel.textContent = toWesternDigits(dtf.format(new Date(yr, mIdx, 1)));
                mel.setAttribute("data-cal-year", String(yr));
                mel.setAttribute("data-cal-month", String(mIdx));
              } catch (e) {}
            }
          } else if (mel.hasAttribute("data-cal-year") && mel.hasAttribute("data-cal-month")) {
            var cy = parseInt(mel.getAttribute("data-cal-year"), 10);
            var cm = parseInt(mel.getAttribute("data-cal-month"), 10);
            if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
              try {
                var dtf2 = new Intl.DateTimeFormat(lang + "-u-nu-latn", { month: "long", year: "numeric" });
                mel.textContent = toWesternDigits(dtf2.format(new Date(cy, cm, 1)));
              } catch (e) {}
            }
          }
          // Sanitize any Eastern digits inside text nodes
          if (/[٠-٩۰-۹]/.test(mel.textContent)) {
            mel.textContent = toWesternDigits(mel.textContent);
          }
        }
      }

      
      // Filter any language dropdown/list items so only installed authentic languages appear
      var ALLOWED_54 = new Set(["ar","en","ro","it","pt","nl","pl","uk","fr","es","de","tr","ru","zh","ja","ko","hi","bn","ur","fa","id","vi","th","el","cs","hu","sv","bg","sr","hr","bs","sk","da","fi","no","sq","sw","az","uz","kk","tl","ms","ca","eu","gl","af","is","et","lv","lt","ta","te","mr","gu","pa","am","ha","yo","so","ku","ps","hy","ka","eo","la"]);
      var langOptions = document.querySelectorAll("option[value], [data-lang], [data-locale]");
      for (var lIdx = 0; lIdx < langOptions.length; lIdx++) {
        var lo = langOptions[lIdx];
        var lval = (lo.getAttribute("data-lang") || lo.getAttribute("data-locale") || lo.getAttribute("value") || "").toLowerCase().split("-")[0].split("_")[0];
        if (lval && (lval.startsWith("iso") || (lval.length <= 3 && !ALLOWED_54.has(lval) && (lo.tagName === "OPTION" || lo.hasAttribute("data-lang") || lo.hasAttribute("data-locale"))))) {
          lo.style.display = "none";
        }
      }

      // 5. Force Western digits on all date/number inputs
      var dateInputs = document.querySelectorAll("input, select, option");
      for (var dIdx = 0; dIdx < dateInputs.length; dIdx++) {
        var di = dateInputs[dIdx];
        di.setAttribute("lang", "en-GB");
        if (di.value && /[٠-٩۰-۹]/.test(di.value)) {
          di.value = toWesternDigits(di.value);
        }
      }
    }
  };

  return UniversalI18nHotSwap;
}));
