/**
 * DEEP FOCUS — UI Touch Engine & Interactive Button Restorer (Task #631)
 */
(function() {
  'use strict';

  // Fix SVG Mindmap broken HTML entities (&amp;quot; -> ")
  function sanitizeMindMapSvgNodes() {
    const textNodes = document.querySelectorAll('svg text, svg tspan');
    textNodes.forEach(node => {
      if (node.textContent && (node.textContent.includes('&amp;') || node.textContent.includes('&quot;'))) {
        node.textContent = node.textContent
          .replace(/&amp;quot;/g, '"')
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');
      }
    });
  }

  // Active RSVP Interactive Controller
  let rsvpInterval = null;
  let rsvpWordIndex = 0;
  const sampleWords = [
    "Sovereign", "focus", "requires", "disciplined", "temporal", "segmentation.",
    "Eliminate", "distractions", "and", "anchor", "every", "lexical", "unit", "optically.",
    "Mastery", "converges", "through", "consistent", "deliberate", "spaced", "repetition."
  ];

  function updateRsvpDisplay(word) {
    const display = document.querySelector('#rsvpDisplayWord, .rsvp-display-word, [data-rsvp-word]');
    if (display) {
      const orpIdx = Math.max(0, Math.floor((word.length - 1) / 3));
      const before = word.substring(0, orpIdx);
      const orpChar = word.charAt(orpIdx);
      const after = word.substring(orpIdx + 1);
      display.innerHTML = `${before}<span style="color:#2563EB;font-weight:800;text-decoration:underline;">${orpChar}</span>${after}`;
    }
  }

  function bindRsvpButtons() {
    // Start / Pause
    const startBtn = document.querySelector('#btnStartRsvp, button[data-action="start-rsvp"]');
    if (startBtn) {
      startBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (rsvpInterval) {
          clearInterval(rsvpInterval);
          rsvpInterval = null;
          startBtn.textContent = '▶ Start RSVP';
        } else {
          startBtn.textContent = '⏸ Pause RSVP';
          rsvpInterval = setInterval(() => {
            rsvpWordIndex = (rsvpWordIndex + 1) % sampleWords.length;
            updateRsvpDisplay(sampleWords[rsvpWordIndex]);
          }, 150);
        }
      });
    }

    // Step forward (+1 word)
    const nextBtn = document.querySelector('#btnNextWord, button[data-action="next-word"]');
    if (nextBtn) {
      nextBtn.addEventListener('click', function(e) {
        e.preventDefault();
        rsvpWordIndex = (rsvpWordIndex + 1) % sampleWords.length;
        updateRsvpDisplay(sampleWords[rsvpWordIndex]);
      });
    }

    // Step backward (-1 word)
    const prevBtn = document.querySelector('#btnPrevWord, button[data-action="prev-word"]');
    if (prevBtn) {
      prevBtn.addEventListener('click', function(e) {
        e.preventDefault();
        rsvpWordIndex = (rsvpWordIndex - 1 + sampleWords.length) % sampleWords.length;
        updateRsvpDisplay(sampleWords[rsvpWordIndex]);
      });
    }
  }

  // Global click barrier clearer and audio feedback tap
  document.addEventListener('DOMContentLoaded', () => {
    sanitizeMindMapSvgNodes();
    bindRsvpButtons();
    setTimeout(sanitizeMindMapSvgNodes, 800);
  });

  window.addEventListener('load', () => {
    sanitizeMindMapSvgNodes();
  });
})();

/* ==============================================================================
 * Comprehensive RSVP & Visual Guide Controller Bindings (Task #633)
 * ============================================================================== */
(function() {
  'use strict';

  function initFullRsvpController() {
    if (typeof FocalStreamEngine !== 'function') return;

    const rsvp = new FocalStreamEngine();
    window.activeRsvpEngine = rsvp;

    const displayEl = document.querySelector('.rsvp-display-word, #rsvpDisplayWord, [data-rsvp-word]');
    const wpmSlider = document.querySelector('#rsvpWpmSlider, input[type="range"][min="100"]');
    const wpmBadge = document.querySelector('.wpm-badge, #rsvpWpmBadge');

    function updateWordUI(info) {
      if (displayEl && info) {
        const word = info.word || '';
        const orp = info.orpIndex || 0;
        const b = word.substring(0, orp);
        const o = word.charAt(orp);
        const a = word.substring(orp + 1);
        displayEl.innerHTML = `${b}<span style="color:#2563EB;font-weight:800;text-decoration:underline;">${o}</span>${a}`;
      }
    }

    // Connect Speed Presets (200, 350, 500, 750, 1000)
    const presetButtons = document.querySelectorAll('button');
    presetButtons.forEach(btn => {
      const text = btn.textContent.trim();
      if (['200', '350', '500', '750', '1000'].includes(text)) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const target = parseInt(text, 10);
          rsvp.setWpm(target);
          if (wpmSlider) wpmSlider.value = target;
          if (wpmBadge) wpmBadge.textContent = target + ' WPM';
          btn.style.transform = 'scale(0.92)';
          setTimeout(() => { btn.style.transform = ''; }, 120);
        });
      }
    });

    // Connect Visual Guide Ruler buttons
    const prevLineBtn = document.querySelector('button[data-action="prev-line"]');
    const nextLineBtn = document.querySelector('button[data-action="next-line"]');
    const autoRulerBtn = document.querySelector('button[data-action="auto-ruler"]');

    if (prevLineBtn) prevLineBtn.addEventListener('click', () => rsvp.prevLine());
    if (nextLineBtn) nextLineBtn.addEventListener('click', () => rsvp.nextLine());
    if (autoRulerBtn) {
      autoRulerBtn.addEventListener('click', () => {
        const active = rsvp.toggleAutoRuler();
        autoRulerBtn.style.background = active ? '#2563EB' : '';
        autoRulerBtn.style.color = active ? '#FFFFFF' : '';
      });
    }

    // Connect Cloze Option Buttons with instant visual feedback
    const clozeBtns = document.querySelectorAll('button');
    clozeBtns.forEach(btn => {
      const t = btn.textContent.trim().toLowerCase();
      if (['eliminates', 'regression', 'peripheral'].includes(t)) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          if (t === 'eliminates') {
            btn.style.background = '#059669';
            btn.style.color = '#FFFFFF';
            btn.textContent = '✓ ' + btn.textContent;
          } else {
            btn.style.background = '#DC2626';
            btn.style.color = '#FFFFFF';
            btn.textContent = '✗ ' + btn.textContent;
          }
          setTimeout(() => {
            btn.style.background = '';
            btn.style.color = '';
            btn.textContent = t;
          }, 1500);
        });
      }
    });

    // Initial Display
    updateWordUI(rsvp.getCurrentWordInfo());
  }

  window.addEventListener('load', initFullRsvpController);
})();
