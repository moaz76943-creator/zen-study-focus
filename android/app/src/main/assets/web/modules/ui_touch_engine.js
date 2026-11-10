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

/* ==============================================================================
 * Comprehensive STEM Symbols & Typesetter Controller Bindings (Task #634)
 * ============================================================================== */
(function() {
  'use strict';

  function initFullStemController() {
    if (typeof StemStudio !== 'function') return;

    const stem = new StemStudio();
    window.activeStemStudio = stem;

    const formulaInput = document.querySelector('#stemFormulaInput, input[value*="E = m"], input[placeholder*="formula"]');
    const previewContainer = document.querySelector('#stemFormulaPreview, .stem-formula-preview, [data-stem-preview]');
    const presetSelect = document.querySelector('#stemPresetSelect, select');
    const clozeBtn = document.querySelector('button[data-action="create-cloze"], button');

    function refreshPreview() {
      if (formulaInput && previewContainer) {
        previewContainer.innerHTML = stem.renderFormulaSvg(formulaInput.value);
      }
    }

    // 1. Connect all 24 Math & Greek Symbol Buttons
    const SYMBOLS = ['π', 'θ', 'α', 'β', 'λ', 'Δ', 'Σ', 'Ω', '√', '½', '±', '×', '÷', '·', '≠', '≤', '≥', '≈', '∞', '∫', '∑', '∂', '→', '⇌'];
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(btn => {
      const text = btn.textContent.trim();
      if (SYMBOLS.includes(text)) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          if (formulaInput) {
            stem.insertSymbolAtCursor(formulaInput, text);
            refreshPreview();
            btn.style.transform = 'scale(0.88)';
            btn.style.background = '#2563EB';
            btn.style.color = '#FFFFFF';
            setTimeout(() => {
              btn.style.transform = '';
              btn.style.background = '';
              btn.style.color = '';
            }, 140);
          }
        });
      }
    });

    // 2. Connect Formula Presets Dropdown
    if (presetSelect) {
      presetSelect.addEventListener('change', () => {
        const val = presetSelect.value;
        const preset = stem.loadPreset(val) || stem.loadPreset('mass_energy');
        if (formulaInput && preset) {
          formulaInput.value = preset.formula;
          refreshPreview();
        }
      });
    }

    // 3. Connect Live Typing Input
    if (formulaInput) {
      formulaInput.addEventListener('input', () => refreshPreview());
    }

    // 4. Connect Create Cloze Card button with tactile toast
    allButtons.forEach(btn => {
      if (btn.textContent.includes('Create Cloze Card')) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const card = stem.createClozeCard();
          if (card) {
            const originalText = btn.textContent;
            btn.textContent = '✓ Cloze Card Created!';
            btn.style.background = '#059669';
            btn.style.color = '#FFFFFF';
            setTimeout(() => {
              btn.textContent = originalText;
              btn.style.background = '';
              btn.style.color = '';
            }, 1800);
          }
        });
      }
    });

    // Initial render
    refreshPreview();
  }

  window.addEventListener('load', initFullStemController);
})();

/* ==============================================================================
 * Comprehensive Whiteboard & Diagram Occlusion Bindings (Task #635)
 * ============================================================================== */
(function() {
  'use strict';

  function initWhiteboardController() {
    if (typeof WhiteboardStudio !== 'function') return;

    const canvas = document.querySelector('#whiteboardCanvas, canvas');
    if (!canvas) return;

    // Set real display dimensions to eliminate coordinate distortion
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : 400;
    canvas.height = 340;

    const studio = new WhiteboardStudio(canvas);
    window.activeWhiteboardStudio = studio;
    studio.redraw();

    // 1. Tool Buttons (Pen, Highlighter, Eraser, Shape Snap)
    const toolBtns = document.querySelectorAll('button');
    toolBtns.forEach(btn => {
      const text = btn.textContent.toLowerCase().trim();
      if (text.includes('pen')) {
        btn.addEventListener('click', () => { studio.setTool('pen'); highlightActive(btn, toolBtns); });
      } else if (text.includes('highlighter')) {
        btn.addEventListener('click', () => { studio.setTool('highlighter'); highlightActive(btn, toolBtns); });
      } else if (text.includes('eraser')) {
        btn.addEventListener('click', () => { studio.setTool('eraser'); highlightActive(btn, toolBtns); });
      } else if (text.includes('shape snap') || text.includes('shapesnap')) {
        btn.addEventListener('click', () => { studio.setTool('shapesnap'); highlightActive(btn, toolBtns); });
      } else if (text.includes('undo')) {
        btn.addEventListener('click', () => studio.undo());
      } else if (text.includes('clear')) {
        btn.addEventListener('click', () => studio.clear());
      }
    });

    function highlightActive(activeBtn, all) {
      all.forEach(b => b.style.outline = '');
      activeBtn.style.outline = '2px solid #2563EB';
    }

    // 2. Palette Color Buttons
    const colorSwatches = document.querySelectorAll('[data-color], .color-swatch');
    colorSwatches.forEach(swatch => {
      const col = swatch.getAttribute('data-color') || swatch.style.backgroundColor;
      if (col) {
        swatch.addEventListener('click', () => {
          studio.setColor(col);
          colorSwatches.forEach(s => s.style.transform = '');
          swatch.style.transform = 'scale(1.2)';
        });
      }
    });

    // 3. Grid Selector Dropdown
    const gridSelect = document.querySelector('#whiteboardGridSelect, select');
    if (gridSelect) {
      gridSelect.addEventListener('change', () => {
        const val = gridSelect.value.toLowerCase();
        if (val.includes('dot')) studio.setGrid('dots');
        else if (val.includes('line')) studio.setGrid('lines');
        else if (val.includes('blank')) studio.setGrid('blank');
      });
    }
  }

  window.addEventListener('load', initWhiteboardController);
})();
