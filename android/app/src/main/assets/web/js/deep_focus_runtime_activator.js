/**
 * DEEP FOCUS — Pure Native Audio & 100-Locales Runtime Bridge (Mission #179)
 * Seamlessly manages CC0 offline audio loops with independent volume sliders.
 */
(function() {
  'use strict';

  // 1. تحويل قسري للأرقام الغربية
  function toWesternDigits(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[٠-٩]/g, d => d.charCodeAt(0) - 1632)
              .replace(/[۰-۹]/g, d => d.charCodeAt(0) - 1776);
  }

  function sanitizeDigits() {
    document.querySelectorAll('input[type="date"], input[type="text"], textarea').forEach(el => {
      if (el.value && /[٠-٩۰-۹]/.test(el.value)) {
        el.value = toWesternDigits(el.value);
      }
    });
  }

  // 2. مشغل أصوات الطبيعة النقي بحلقات دائرية ناعمة (HTML5 Audio Loops)
  const soundTracks = {};

  function initNatureAudio() {
    // ربط بطاقات الأصوات في شاشة Nature
    const soundCards = document.querySelectorAll('.sound-card, [data-sound]');
    soundCards.forEach(card => {
      const soundKey = card.dataset.sound || card.querySelector('h3, .font-bold')?.textContent.trim().toLowerCase().replace(/\s+/g, '_');
      if (!soundKey) return;

      const toggle = card.querySelector('input[type="checkbox"], button, [role="switch"]');
      const slider = card.querySelector('input[type="range"]');

      if (toggle && !toggle.dataset.audioBound) {
        toggle.dataset.audioBound = "true";
        
        // تجهيز عنصر الصوت المحلي
        if (!soundTracks[soundKey]) {
          const audio = new Audio();
          audio.src = `audio/${soundKey}.mp3`;
          audio.loop = true;
          audio.preload = 'none';
          soundTracks[soundKey] = audio;
        }

        toggle.addEventListener('change', (e) => {
          const audio = soundTracks[soundKey];
          if (e.target.checked) {
            audio.volume = slider ? parseFloat(slider.value) / 100 : 0.7;
            audio.play().catch(err => console.log(`Audio waiting for user gesture: ${soundKey}`));
          } else {
            audio.pause();
          }
        });

        if (slider) {
          slider.addEventListener('input', (e) => {
            const audio = soundTracks[soundKey];
            if (audio) {
              audio.volume = parseFloat(e.target.value) / 100;
            }
          });
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    sanitizeDigits();
    initNatureAudio();
  });

  document.addEventListener('input', sanitizeDigits, true);
  console.log("[DEEP FOCUS] Pure CC0 Nature Audio pipeline armed.");
})();
