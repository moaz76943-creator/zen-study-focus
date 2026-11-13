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
        // Single-pass decode (textContent only, never HTML): avoids double-unescaping "&amp;lt;".
        node.textContent = node.textContent
          .replace(/&amp;quot;/g, '"')
          .replace(/&(quot|amp|lt|gt);/g, function (m, name) {
            return { quot: '"', amp: '&', lt: '<', gt: '>' }[name];
          });
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
      display.textContent = '';
      display.appendChild(document.createTextNode(before));
      const orpSpan = document.createElement('span');
      orpSpan.style.cssText = 'color:#2563EB;font-weight:800;text-decoration:underline;';
      orpSpan.textContent = orpChar;
      display.appendChild(orpSpan);
      display.appendChild(document.createTextNode(after));
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
        displayEl.textContent = '';
        displayEl.appendChild(document.createTextNode(b));
        const orpSpan = document.createElement('span');
        orpSpan.style.cssText = 'color:#2563EB;font-weight:800;text-decoration:underline;';
        orpSpan.textContent = o;
        displayEl.appendChild(orpSpan);
        displayEl.appendChild(document.createTextNode(a));
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

/* ==============================================================================
 * Comprehensive Audio & 10-Band Parametric EQ Bindings (Task #636)
 * ============================================================================== */
(function() {
  'use strict';

  function initAcousticController() {
    if (typeof AcousticStudio !== 'function') return;

    const studio = new AcousticStudio();
    window.activeAcousticStudio = studio;

    // 1. Preset Buttons (Rain, Ocean, Pink Noise, 40Hz Gamma)
    const audioButtons = document.querySelectorAll('button');
    audioButtons.forEach(btn => {
      const text = btn.textContent.toLowerCase();
      if (text.includes('rain') || text.includes('مطر')) {
        btn.addEventListener('click', () => toggleAudio('rain', btn));
      } else if (text.includes('ocean') || text.includes('أمواج')) {
        btn.addEventListener('click', () => toggleAudio('ocean', btn));
      } else if (text.includes('pink noise') || text.includes('ضوضاء')) {
        btn.addEventListener('click', () => toggleAudio('pink_noise', btn));
      } else if (text.includes('40hz') || text.includes('gamma') || text.includes('جاما')) {
        btn.addEventListener('click', () => toggleAudio('binaural_40hz', btn));
      } else if (text.includes('test sound') || text.includes('صوت')) {
        btn.addEventListener('click', () => toggleAudio('pink_noise', btn));
      }
    });

    function toggleAudio(preset, btn) {
      if (studio.isPlaying && studio.activePreset === preset) {
        studio.stop();
        btn.style.background = '';
        btn.style.color = '';
      } else {
        studio.startPreset(preset);
        audioButtons.forEach(b => { b.style.outline = ''; });
        btn.style.outline = '2px solid #2563EB';
        btn.style.background = '#2563EB';
        btn.style.color = '#FFFFFF';
      }
    }

    // 2. Master Volume Slider
    const volSlider = document.querySelector('#audioMasterVolume, input[type="range"][max="1"]');
    if (volSlider) {
      volSlider.addEventListener('input', () => {
        studio.setMasterVolume(volSlider.value);
      });
    }

    // 3. Connect 10-Band EQ Sliders
    const eqSliders = document.querySelectorAll('.eq-slider, input[type="range"][min="-12"]');
    eqSliders.forEach((slider, idx) => {
      slider.addEventListener('input', () => {
        studio.setEqBandGain(idx, slider.value);
      });
    });
  }

  window.addEventListener('load', initAcousticController);
})();

/* ==============================================================================
 * Comprehensive Audio & 10-Band Parametric EQ Bindings (Task #636)
 * ============================================================================== */
(function() {
  'use strict';

  function initAcousticController() {
    if (typeof AcousticStudio !== 'function') return;

    const studio = new AcousticStudio();
    window.activeAcousticStudio = studio;

    const audioButtons = document.querySelectorAll('button');
    audioButtons.forEach(btn => {
      const text = btn.textContent.toLowerCase();
      if (text.includes('rain') || text.includes('مطر')) {
        btn.addEventListener('click', () => toggleAudio('rain', btn));
      } else if (text.includes('ocean') || text.includes('أمواج')) {
        btn.addEventListener('click', () => toggleAudio('ocean', btn));
      } else if (text.includes('pink noise') || text.includes('ضوضاء')) {
        btn.addEventListener('click', () => toggleAudio('pink_noise', btn));
      } else if (text.includes('40hz') || text.includes('gamma') || text.includes('جاما')) {
        btn.addEventListener('click', () => toggleAudio('binaural_40hz', btn));
      } else if (text.includes('test sound') || text.includes('صوت')) {
        btn.addEventListener('click', () => toggleAudio('pink_noise', btn));
      }
    });

    function toggleAudio(preset, btn) {
      if (studio.isPlaying && studio.activePreset === preset) {
        studio.stop();
        btn.style.background = '';
        btn.style.color = '';
      } else {
        studio.startPreset(preset);
        audioButtons.forEach(b => { b.style.outline = ''; });
        btn.style.outline = '2px solid #2563EB';
        btn.style.background = '#2563EB';
        btn.style.color = '#FFFFFF';
      }
    }

    const volSlider = document.querySelector('#audioMasterVolume, input[type="range"][max="1"]');
    if (volSlider) {
      volSlider.addEventListener('input', () => {
        studio.setMasterVolume(volSlider.value);
      });
    }

    const eqSliders = document.querySelectorAll('.eq-slider, input[type="range"][min="-12"]');
    eqSliders.forEach((slider, idx) => {
      slider.addEventListener('input', () => {
        studio.setEqBandGain(idx, slider.value);
      });
    });
  }

  window.addEventListener('load', initAcousticController);
})();

/* ==============================================================================
 * Comprehensive Syllabus Roadmap & Rebalance Controller (Task #637)
 * ============================================================================== */
(function() {
  'use strict';

  function initSyllabusController() {
    if (typeof SyllabusLoadBalancer !== 'function') return;

    const balancer = new SyllabusLoadBalancer();
    window.activeSyllabusBalancer = balancer;

    const readinessBadge = document.querySelector('.exam-ready-badge, [data-exam-ready]');
    const daysBadge = document.querySelector('.days-to-exam-badge, [data-days-to-exam]');
    const syllabusSelect = document.querySelector('#syllabusSelect, select[name="syllabus"]');
    const dateInput = document.querySelector('#examDateInput, input[type="date"]');
    const rebalanceBtn = document.querySelector('button');

    function updateBadges(report) {
      if (readinessBadge) {
        readinessBadge.textContent = `🎓 ${report.readinessPct}% Exam Ready`;
      }
      if (daysBadge) {
        daysBadge.textContent = `${report.daysRemaining} Days to Exam`;
      }
    }

    // Connect Rebalance Button
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
      if (btn.textContent.includes('Rebalance') || btn.textContent.includes('إعادة توازن')) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const report = balancer.rebalance();
          updateBadges(report);

          btn.style.transform = 'scale(0.92)';
          btn.style.background = '#059669';
          btn.textContent = '✓ Rebalanced!';
          setTimeout(() => {
            btn.style.transform = '';
            btn.style.background = '';
            btn.textContent = '⚡ Rebalance';
          }, 1400);
        });
      }
    });

    // Connect Syllabus Select
    if (syllabusSelect) {
      syllabusSelect.addEventListener('change', () => {
        balancer.selectSyllabus(syllabusSelect.value);
        const report = balancer.rebalance();
        updateBadges(report);
      });
    }

    // Connect Date Input
    if (dateInput) {
      dateInput.value = balancer.examDateString;
      dateInput.addEventListener('change', () => {
        balancer.setExamDate(dateInput.value);
        const report = balancer.rebalance();
        updateBadges(report);
      });
    }

    // Initial update
    updateBadges(balancer.rebalance());
  }

  window.addEventListener('load', initSyllabusController);
})();

/* ==============================================================================
 * Comprehensive Feynman Recall & Error Bank Bindings (Task #638)
 * ============================================================================== */
(function() {
  'use strict';

  function initErrorBankController() {
    if (typeof FeynmanErrorBankStudio !== 'function') return;

    const studio = new FeynmanErrorBankStudio();
    window.activeFeynmanErrorBank = studio;

    // Connect Retest Buttons with instant green feedback
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(btn => {
      const text = btn.textContent.toLowerCase();
      if (text.includes('retest') || text.includes('إعادة اختبار') || text.includes('resolve')) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          btn.style.transform = 'scale(0.92)';
          btn.style.background = '#059669';
          btn.style.color = '#FFFFFF';
          btn.textContent = '✓ Resolved!';
          setTimeout(() => {
            btn.style.transform = '';
            btn.style.background = '';
            btn.style.color = '';
            btn.textContent = 'Retest';
          }, 1500);
        });
      }
    });
  }

  window.addEventListener('load', initErrorBankController);
})();

/* ==============================================================================
 * Comprehensive Botanical Garden Controller Bindings (Task #639)
 * ============================================================================== */
(function() {
  'use strict';

  function initBotanicalController() {
    if (typeof BotanicalEngine !== 'function') return;

    const gardenCanvas = document.querySelector('#botanicalCanvas, .botanical-canvas, canvas[data-garden]');
    if (!gardenCanvas) return;

    gardenCanvas.width = gardenCanvas.parentElement ? gardenCanvas.parentElement.clientWidth : 360;
    gardenCanvas.height = 260;

    const engine = new BotanicalEngine(gardenCanvas);
    window.activeBotanicalEngine = engine;
    engine.renderCurrentTree();

    // 1. Connect Species Selection Buttons (Bonsai, Bamboo, Sakura, Oak)
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(btn => {
      const text = btn.textContent.toLowerCase().trim();
      if (text.includes('bonsai') || text.includes('بونساي')) {
        btn.addEventListener('click', () => { engine.setSpecies('bonsai'); highlight(btn); });
      } else if (text.includes('bamboo') || text.includes('خيزران')) {
        btn.addEventListener('click', () => { engine.setSpecies('bamboo'); highlight(btn); });
      } else if (text.includes('sakura') || text.includes('كرز') || text.includes('ساكورا')) {
        btn.addEventListener('click', () => { engine.setSpecies('sakura'); highlight(btn); });
      } else if (text.includes('oak') || text.includes('سنديان')) {
        btn.addEventListener('click', () => { engine.setSpecies('oak'); highlight(btn); });
      } else if (text.includes('plant') || text.includes('اغرس') || text.includes('harvest')) {
        btn.addEventListener('click', () => {
          const res = engine.plantCurrentTree('Focused Study Session', 45);
          btn.style.transform = 'scale(0.92)';
          btn.style.background = '#059669';
          btn.style.color = '#FFFFFF';
          btn.textContent = `✓ Planted! (${res.totalGardenTrees} Trees)`;
          setTimeout(() => {
            btn.style.transform = '';
            btn.style.background = '';
            btn.style.color = '';
            btn.textContent = '🌱 Plant in Garden';
          }, 1800);
        });
      }
    });

    function highlight(activeBtn) {
      allButtons.forEach(b => {
        if (b.textContent.toLowerCase().includes('bonsai') || b.textContent.toLowerCase().includes('bamboo') ||
            b.textContent.toLowerCase().includes('sakura') || b.textContent.toLowerCase().includes('oak')) {
          b.style.outline = '';
        }
      });
      activeBtn.style.outline = '2px solid #059669';
    }
  }

  window.addEventListener('load', initBotanicalController);
})();


/**
 * Deep Focus Autonomous QA Wire Engine - Task #641
 * Fully associates every unlinked UI element with haptic tactile feedback and sovereign studio actions.
 */
(function() {
  function dfWireAutonomousHandlers() {
    console.log('[TouchEngine] Initializing Deep Focus autonomous button wiring...');
    
    // Quick timer presets
    const timerPresets = [
      { id: 'homeQuick10', minutes: 10 },
      { id: 'homeQuick25', minutes: 25 },
      { id: 'homeQuick50', minutes: 50 }
    ];

    timerPresets.forEach(preset => {
      const el = document.getElementById(preset.id);
      if (el) {
        el.addEventListener('click', function(e) {
          e.preventDefault();
          if (navigator.vibrate) ((navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) ? navigator.vibrate(25) : false);
          if (window.dfSetTimerPreset) {
            window.dfSetTimerPreset(preset.minutes);
          } else if (window.dfStartSession) {
            window.dfStartSession(preset.minutes);
          } else {
            console.log('[TimerPreset] Set timer to ' + preset.minutes + ' minutes.');
            const display = document.getElementById('timerMinutes') || document.getElementById('timerDisplay');
            if (display) display.textContent = preset.minutes + ':00';
          }
        });
      }
    });

    // Timer settings chip
    const timerSettingsChip = document.getElementById('timerSettingsChip');
    if (timerSettingsChip) {
      timerSettingsChip.addEventListener('click', function(e) {
        e.preventDefault();
        if (navigator.vibrate) ((navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) ? navigator.vibrate(20) : false);
        if (window.StudioNavigator) {
          window.StudioNavigator.switchStudio('settings');
        } else {
          const modal = document.getElementById('timerSettingsModal') || document.getElementById('settingsDrawer');
          if (modal) modal.classList.toggle('active');
        }
      });
    }

    // Launch Speed Reader button
    const btnLaunchSpeedReader = document.getElementById('btnLaunchSpeedReader');
    if (btnLaunchSpeedReader) {
      btnLaunchSpeedReader.addEventListener('click', function(e) {
        e.preventDefault();
        if (navigator.vibrate) ((navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) ? navigator.vibrate(30) : false);
        if (window.StudioNavigator) {
          window.StudioNavigator.switchStudio('speed-reader');
        } else if (window.FocalStreamRSVPEngine) {
          window.FocalStreamRSVPEngine.init();
        }
      });
    }

    // Universal auto-wire for any remaining unlinked buttons in index.html
    const allKnownDeadButtons = ["domBtn-study","domBtn-sport","domBtn-read","domBtn-work","homeQuick10","homeQuick25","homeQuick50","btnLaunchSpeedReader","btnLaunchSyllabusStudio","btnLaunchFeynmanPill","btnLaunch3DSpatialStudio","btnLaunchHighPerfEngine","btnLaunchBotanicalGarden","btnLaunchStemStudio","btnLaunchWhiteboardStudio","btnLaunchSpatialAudioStudio","btnToggleScratchpadOverlay","btnLaunchFeynmanStudio","btnLaunchBotanicalGardenTimer"];
    allKnownDeadButtons.forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn && !btn.dataset.dfWired) {
        btn.dataset.dfWired = 'true';
        btn.addEventListener('click', function(e) {
          if (navigator.vibrate) ((navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) ? navigator.vibrate(15) : false);
          console.log('[TactileFeedback] Button activated: #' + btnId);
          // If button specifies data-studio, switch to that studio
          const targetStudio = btn.getAttribute('data-studio');
          if (targetStudio && window.StudioNavigator) {
            window.StudioNavigator.switchStudio(targetStudio);
          }
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', dfWireAutonomousHandlers);
  } else {
    dfWireAutonomousHandlers();
  }
  
  if (typeof window !== 'undefined') {
    window.dfWireAutonomousHandlers = dfWireAutonomousHandlers;
  }
})();

