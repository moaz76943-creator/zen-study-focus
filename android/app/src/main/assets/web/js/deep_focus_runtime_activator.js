/**
 * DEEP FOCUS — Studio Audio Player & Native Bridge (Mission #182)
 * Plays genuine offline studio MP3 loops with live volume controls.
 */
(function() {
  'use strict';

  function toWesternDigits(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[٠-٩]/g, d => d.charCodeAt(0) - 1632)
              .replace(/[۰-۹]/g, d => d.charCodeAt(0) - 1776);
  }

  function sanitizeDigits() {
    document.querySelectorAll('input[type="date"], input[type="text"], textarea, .date-display').forEach(el => {
      if (el.value && /[٠-٩۰-۹]/.test(el.value)) el.value = toWesternDigits(el.value);
      if (el.textContent && /[٠-٩۰-۹]/.test(el.textContent)) el.textContent = toWesternDigits(el.textContent);
    });
  }

  // خريطة أسماء الملفات الصوتية الحقيقية التي قمنا بتنزيلها
  const AUDIO_MAP = {
    'ocean waves': 'audio/ocean_waves.mp3',
    'soft forest rain': 'audio/soft_forest_rain.mp3',
    'campfire woods': 'audio/campfire_woods.mp3',
    'pine breeze': 'audio/pine_breeze.mp3',
    'distant thunder': 'audio/distant_thunder.mp3',
    'rustling leaves': 'audio/rustling_leaves.mp3',
    'night crickets': 'audio/night_crickets.mp3',
    'deep earth rumble': 'audio/deep_earth_rumble.mp3',
    'rain on window': 'audio/soft_forest_rain.mp3',
    'mountain stream': 'audio/ocean_waves.mp3',
    'lush waterfall': 'audio/ocean_waves.mp3',
    'highland wind': 'audio/pine_breeze.mp3'
  };

  const activeAudioPlayers = {};

  function hookRealAudioCards() {
    const cards = document.querySelectorAll('.sound-card, [class*="nature" i] [class*="card" i]');
    cards.forEach(card => {
      const nameEl = card.querySelector('h3, .font-bold, div:first-child');
      const rawName = (nameEl ? nameEl.textContent : card.textContent).trim().toLowerCase();
      
      let matchedFile = null;
      for (const [key, path] of Object.entries(AUDIO_MAP)) {
        if (rawName.includes(key)) {
          matchedFile = path;
          break;
        }
      }
      if (!matchedFile) return;

      const toggle = card.querySelector('input[type="checkbox"], button, [role="switch"]');
      const slider = card.querySelector('input[type="range"]');

      if (toggle && !toggle.dataset.studioBound) {
        toggle.dataset.studioBound = "true";

        if (!activeAudioPlayers[matchedFile]) {
          const a = new Audio(matchedFile);
          a.loop = true;
          a.preload = 'none';
          activeAudioPlayers[matchedFile] = a;
        }

        toggle.addEventListener('click', () => {
          const player = activeAudioPlayers[matchedFile];
          if (player.paused) {
            player.volume = slider ? parseFloat(slider.value) / 100 : 0.7;
            player.play().catch(e => console.log('Audio playback waiting for tap'));
            card.classList.add('playing');
          } else {
            player.pause();
            card.classList.remove('playing');
          }
        });

        if (slider) {
          slider.addEventListener('input', (e) => {
            const player = activeAudioPlayers[matchedFile];
            if (player) player.volume = parseFloat(e.target.value) / 100;
          });
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    sanitizeDigits();
    hookRealAudioCards();
  });
  document.addEventListener('input', sanitizeDigits, true);
  document.addEventListener('change', sanitizeDigits, true);
})();
