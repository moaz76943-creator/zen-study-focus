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
