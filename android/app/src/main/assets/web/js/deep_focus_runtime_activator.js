/**
 * DEEP FOCUS — Master Runtime Bridge (Mission #180)
 * Seamlessly connects NaturalSoundscapeSanctuary to existing Nature UI cards.
 * Enforces strict Western digits (0123456789) and zero Hebrew inclusion.
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
      if (el.value && /[٠-٩۰-۹]/.test(el.value)) {
        el.value = toWesternDigits(el.value);
      }
      if (el.textContent && /[٠-٩۰-۹]/.test(el.textContent)) {
        el.textContent = toWesternDigits(el.textContent);
      }
    });
  }

  function hookNatureSounds() {
    const cards = document.querySelectorAll('.sound-card, [class*="nature" i] [class*="card" i]');
    cards.forEach(card => {
      const nameEl = card.querySelector('h3, .font-bold, div:first-child');
      const soundName = (nameEl ? nameEl.textContent : card.textContent).trim().toLowerCase();
      const toggle = card.querySelector('input[type="checkbox"], button, [role="switch"]');
      const slider = card.querySelector('input[type="range"]');

      if (toggle && !toggle.dataset.hqAudioBound) {
        toggle.dataset.hqAudioBound = "true";
        toggle.addEventListener('click', () => {
          if (!window.NaturalSoundscapeSanctuary) return;
          const s = window.NaturalSoundscapeSanctuary;
          if (s.activeTracks[soundName]) {
            s.stop(soundName);
            card.classList.remove('active-playing');
          } else {
            const vol = slider ? parseFloat(slider.value) / 100 : 0.7;
            s.play(soundName, vol);
            card.classList.add('active-playing');
          }
        });

        if (slider) {
          slider.addEventListener('input', (e) => {
            if (window.NaturalSoundscapeSanctuary) {
              window.NaturalSoundscapeSanctuary.setVolume(soundName, parseFloat(e.target.value) / 100);
            }
          });
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    sanitizeDigits();
    hookNatureSounds();
  });
  document.addEventListener('input', sanitizeDigits, true);
  document.addEventListener('change', sanitizeDigits, true);
})();
