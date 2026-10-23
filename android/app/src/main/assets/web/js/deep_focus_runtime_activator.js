/**
 * DEEP FOCUS — Grand UI Runtime Activator (Mission #176)
 * Injects 100 Locales, Western Digits enforcement, and Web Audio synthesizers into live WebView DOM.
 */
(function() {
  'use strict';

  // 1. مرشح الأرقام الغربية الصارم
  function toWesternDigits(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[٠-٩]/g, d => d.charCodeAt(0) - 1632)
              .replace(/[۰-۹]/g, d => d.charCodeAt(0) - 1776);
  }

  function enforceWesternDigitsInDOM() {
    // تعقيم حقول الإدخال والتواريخ
    document.querySelectorAll('input, textarea, .date-display, [data-date]').forEach(el => {
      if (el.value && /[٠-٩۰-۹]/.test(el.value)) {
        el.value = toWesternDigits(el.value);
      }
      if (el.textContent && /[٠-٩۰-۹]/.test(el.textContent)) {
        el.textContent = toWesternDigits(el.textContent);
      }
    });
  }

  // 2. قائمة الـ 100 لغة المعتمدة لـ Google Play (استبعاد تام للعبرية he/iw)
  const SUPPORTED_100_LOCALES = [
    { code: "ar", name: "Arabic", native: "العربية" },
    { code: "en", name: "English", native: "English" },
    { code: "es", name: "Spanish", native: "Español" },
    { code: "zh", name: "Chinese (Simplified)", native: "中文 (简体)" },
    { code: "hi", name: "Hindi", native: "हिन्दी" },
    { code: "fr", name: "French", native: "Français" },
    { code: "de", name: "German", native: "Deutsch" },
    { code: "ja", name: "Japanese", native: "日本語" },
    { code: "ko", name: "Korean", native: "한국어" },
    { code: "pt", name: "Portuguese", native: "Português" },
    { code: "ru", name: "Russian", native: "Русский" },
    { code: "tr", name: "Turkish", native: "Türkçe" },
    { code: "it", name: "Italian", native: "Italiano" },
    { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
    { code: "id", name: "Indonesian", native: "Bahasa Indonesia" },
    { code: "ms", name: "Malay", native: "Bahasa Melayu" },
    { code: "bn", name: "Bengali", native: "বাংলা" },
    { code: "ur", name: "Urdu", native: "اردو" },
    { code: "fa", name: "Persian", native: "فارسی" },
    { code: "pl", name: "Polish", native: "Polski" },
    { code: "nl", name: "Dutch", native: "Nederlands" },
    { code: "th", name: "Thai", native: "ไทย" },
    { code: "sv", name: "Swedish", native: "Svenska" },
    { code: "el", name: "Greek", native: "Ελληνικά" },
    { code: "cs", name: "Czech", native: "Čeština" },
    { code: "ro", name: "Romanian", native: "Română" },
    { code: "hu", name: "Hungarian", native: "Magyar" },
    { code: "da", name: "Danish", native: "Dansk" },
    { code: "fi", name: "Finnish", native: "Suomi" },
    { code: "no", name: "Norwegian", native: "Norsk" },
    { code: "sk", name: "Slovak", native: "Slovenčina" },
    { code: "uk", name: "Ukrainian", native: "Українська" },
    { code: "bg", name: "Bulgarian", native: "Български" },
    { code: "hr", name: "Croatian", native: "Hrvatski" },
    { code: "sr", name: "Serbian", native: "Српски" },
    { code: "sl", name: "Slovenian", native: "Slovenščina" },
    { code: "lt", name: "Lithuanian", native: "Lietuvių" },
    { code: "lv", name: "Latvian", native: "Latviešu" },
    { code: "et", name: "Estonian", native: "Eesti" },
    { code: "sw", name: "Swahili", native: "Kiswahili" },
    { code: "fil", name: "Filipino", native: "Filipino" },
    { code: "ta", name: "Tamil", native: "தமிழ்" },
    { code: "te", name: "Telugu", native: "తెలుగు" },
    { code: "mr", name: "Marathi", native: "मराठी" },
    { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
    { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
    { code: "ml", name: "Malayalam", native: "മലയാളം" },
    { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
    { code: "am", name: "Amharic", native: "አማርኛ" },
    { code: "az", name: "Azerbaijani", native: "Azərbaycan" },
    { code: "uz", name: "Uzbek", native: "Oʻzbek" },
    { code: "kk", name: "Kazakh", native: "Қазақ" },
    { code: "ka", name: "Georgian", native: "ქართული" },
    { code: "hy", name: "Armenian", native: "Հայերեն" },
    { code: "ne", name: "Nepali", native: "नेपाली" },
    { code: "si", name: "Sinhala", native: "සිංහල" },
    { code: "my", name: "Burmese", native: "မြန်မာ" },
    { code: "km", name: "Khmer", native: "ខ្មែរ" },
    { code: "lo", name: "Lao", native: "ລາວ" },
    { code: "mn", name: "Mongolian", native: "Монгол" },
    { code: "af", name: "Afrikaans", native: "Afrikaans" },
    { code: "sq", name: "Albanian", native: "Shqip" },
    { code: "eu", name: "Basque", native: "Euskara" },
    { code: "ca", name: "Catalan", native: "Català" },
    { code: "gl", name: "Galician", native: "Galego" },
    { code: "is", name: "Icelandic", native: "Íslenska" },
    { code: "ga", name: "Irish", native: "Gaeilge" },
    { code: "mk", name: "Macedonian", native: "Македонски" },
    { code: "mt", name: "Maltese", native: "Malti" },
    { code: "cy", name: "Welsh", native: "Cymraeg" },
    { code: "be", name: "Belarusian", native: "Беларуская" },
    { code: "bs", name: "Bosnian", native: "Bosanski" },
    { code: "ky", name: "Kyrgyz", native: "Кыргызча" },
    { code: "tg", name: "Tajik", native: "Тоҷикӣ" },
    { code: "tk", name: "Turkmen", native: "Türkmen" },
    { code: "ps", name: "Pashto", native: "پښتو" },
    { code: "ku", name: "Kurdish", native: "Kurdî" },
    { code: "so", name: "Somali", native: "Soomaali" },
    { code: "ha", name: "Hausa", native: "Hausa" },
    { code: "yo", name: "Yoruba", native: "Yorùbá" },
    { code: "ig", name: "Igbo", native: "Igbo" },
    { code: "zu", name: "Zulu", native: "isiZulu" },
    { code: "xh", name: "Xhosa", native: "isiXhosa" },
    { code: "sn", name: "Shona", native: "chiShona" },
    { code: "st", name: "Southern Sotho", native: "Sesotho" },
    { code: "tn", name: "Tswana", native: "Setswana" },
    { code: "rw", name: "Kinyarwanda", native: "Kinyarwanda" },
    { code: "mg", name: "Malagasy", native: "Malagasy" },
    { code: "ny", name: "Chichewa", native: "ChiCheŵa" },
    { code: "eo", name: "Esperanto", native: "Esperanto" },
    { code: "la", name: "Latin", native: "Latina" },
    { code: "gd", name: "Scottish Gaelic", native: "Gàidhlig" },
    { code: "yi", name: "Yiddish", native: "ייִדיש" },
    { code: "co", name: "Corsican", native: "Corsu" },
    { code: "fy", name: "Western Frisian", native: "Frysk" },
    { code: "haw", name: "Hawaiian", native: "ʻŌlelo Hawaiʻi" },
    { code: "hmn", name: "Hmong", native: "Hmoob" },
    { code: "sm", name: "Samoan", native: "Gagana faʻa Sāmoa" },
    { code: "su", name: "Sundanese", native: "Basa Sunda" },
    { code: "jw", name: "Javanese", native: "Basa Jawa" }
  ];

  function inject100LocalesModal() {
    const searchInput = document.querySelector('input[placeholder*="language" i], input[placeholder*="country" i]');
    const listContainer = document.querySelector('.language-list, #languageList, [class*="language" i] ul, [class*="languages" i]');
    
    if (!listContainer && !searchInput) return;

    function renderList(query = '') {
      const q = query.toLowerCase().trim();
      const filtered = SUPPORTED_100_LOCALES.filter(l => 
        l.name.toLowerCase().includes(q) || 
        l.native.toLowerCase().includes(q) || 
        l.code.toLowerCase().includes(q)
      );

      const target = listContainer || searchInput.closest('div').querySelector('.space-y-2, div:has(> div)');
      if (!target) return;

      target.innerHTML = '';
      filtered.forEach(lang => {
        const item = document.createElement('div');
        item.className = "flex items-center justify-between p-3.5 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50 active:scale-[0.99] transition-all cursor-pointer mb-2";
        item.innerHTML = `
          <div class="flex items-center gap-3">
            <span class="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs tracking-wider uppercase border border-blue-100/60">${lang.code}</span>
            <div>
              <div class="font-bold text-slate-900 text-sm">${lang.name}</div>
              <div class="text-xs text-slate-500 font-medium">${lang.native}</div>
            </div>
          </div>
        `;
        item.onclick = () => {
          localStorage.setItem('deep_focus_locale', lang.code);
          if (window.UniversalI18nBridge) window.UniversalI18nBridge.setLocale(lang.code);
          document.querySelectorAll('.modal, [class*="modal"]').forEach(m => m.classList.add('hidden'));
          enforceWesternDigitsInDOM();
        };
        target.appendChild(item);
      });
    }

    if (searchInput && !searchInput.dataset.bound100) {
      searchInput.dataset.bound100 = "true";
      searchInput.addEventListener('input', (e) => renderList(e.target.value));
      renderList();
    }
  }

  // 3. محرك التوليف الصوتي الطبيعي (Web Audio Synthesizer)
  class NatureSoundSynth {
    constructor() {
      this.ctx = null;
      this.activeNodes = {};
    }
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }
    toggleSound(type, volume = 0.5) {
      this.init();
      if (!this.ctx) return;
      if (this.activeNodes[type]) {
        this.stopSound(type);
        return false;
      }
      // توليد ضوضاء بيضاء/وردية نقية للمطر والرياح والأمواج والشلال
      const bufferSize = 2 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02; // Pink-like noise
        lastOut = output[i];
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      if (type.includes('rain')) {
        filter.type = 'lowpass';
        filter.frequency.value = 800;
      } else if (type.includes('wave') || type.includes('ocean')) {
        filter.type = 'bandpass';
        filter.frequency.value = 400;
      } else {
        filter.type = 'lowpass';
        filter.frequency.value = 500;
      }

      const gain = this.ctx.createGain();
      gain.gain.value = volume;

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start();
      this.activeNodes[type] = { source: whiteNoise, gain: gain };
      return true;
    }
    stopSound(type) {
      if (this.activeNodes[type]) {
        try {
          this.activeNodes[type].source.stop();
          this.activeNodes[type].source.disconnect();
        } catch(e) {}
        delete this.activeNodes[type];
      }
    }
  }

  const synth = new NatureSoundSynth();
  window.DeepFocusNatureSynth = synth;

  function bindNatureSounds() {
    document.querySelectorAll('.sound-card, [class*="nature" i] [class*="card" i]').forEach(card => {
      const title = card.textContent.toLowerCase();
      const toggle = card.querySelector('input[type="checkbox"], button, [role="switch"]');
      if (toggle && !toggle.dataset.synthBound) {
        toggle.dataset.synthBound = "true";
        toggle.addEventListener('click', () => {
          synth.init();
          synth.toggleSound(title);
        });
      }
    });
  }

  // تشغيل المراقب عند تحميل الصفحة وتغير الـ DOM
  function init() {
    enforceWesternDigitsInDOM();
    inject100LocalesModal();
    bindNatureSounds();

    const observer = new MutationObserver(() => {
      enforceWesternDigitsInDOM();
      inject100LocalesModal();
      bindNatureSounds();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    console.log("[DEEP FOCUS] Runtime Activator v3.0.1 successfully engaged.");
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
