/**
 * DEEP FOCUS — Golden Studio Navigator & Viewport Isolation Engine
 * Module: modules/core/studio_navigator.js
 * Version: v452.0.0 | Code: 41172
 * 
 * Eliminates endless page scrolling by isolating every master studio into
 * dedicated, clean, responsive view panes controlled via Bottom Navigation:
 * 1. Timer Studio (Core Focus, Interval Progress, Ambient Sounds)
 * 2. Notes Studio (Cornell Tri-Zone, Active Recall Mask, Vector Mind-Map)
 * 3. Reader Studio (Focal Stream RSVP Speed Reader, Optical Guide Ruler)
 * 4. STEM Studio (Pure Vector SVG Typesetter, 24-Symbol Insert, Timed Exams)
 * 5. Whiteboard Studio (Infinite Vector Canvas, Shape-Snap, Diagram Occlusion)
 * 6. Audio Studio (3D Spatial Nature Sounds, 40Hz Gamma, 10-Band Parametric EQ)
 * 7. Syllabus Studio (Adaptive Load-Balancer, Exam Countdown, Burnout Sentinel)
 * 8. Garden Studio (Fractal L-Systems Botanical Garden, Forest Vault)
 * 9. Recall Studio (Feynman Blank Sheet Challenge, Intelligent Error Bank)
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StudioNavigator = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_ACTIVE_TAB_KEY = 'df_active_studio_tab_v1';

  const STUDIOS = [
    { id: 'timer', label: 'Timer', icon: '⏱️', paneSelector: '#studioPaneTimer, .studio-timer, [data-studio="timer"]' },
    { id: 'notes', label: 'Notes', icon: '📝', paneSelector: '#studioPaneNotes, .studio-notes, [data-studio="notes"]' },
    { id: 'reader', label: 'RSVP Reader', icon: '👁️', paneSelector: '#studioPaneReader, .studio-reader, [data-studio="reader"]' },
    { id: 'stem', label: 'STEM & Math', icon: '∑', paneSelector: '#studioPaneStem, .studio-stem, [data-studio="stem"]' },
    { id: 'whiteboard', label: 'Whiteboard', icon: '🎨', paneSelector: '#studioPaneWhiteboard, .studio-whiteboard, [data-studio="whiteboard"]' },
    { id: 'audio', label: 'Soundscapes', icon: '🎧', paneSelector: '#studioPaneAudio, .studio-audio, [data-studio="audio"]' },
    { id: 'syllabus', label: 'Syllabus', icon: '📚', paneSelector: '#studioPaneSyllabus, .studio-syllabus, [data-studio="syllabus"]' },
    { id: 'garden', label: 'Zen Garden', icon: '🌱', paneSelector: '#studioPaneGarden, .studio-garden, [data-studio="garden"]' },
    { id: 'recall', label: 'Feynman Recall', icon: '🧠', paneSelector: '#studioPaneRecall, .studio-recall, [data-studio="recall"]' }
  ];

  class StudioNavigator {
    constructor(options = {}) {
      this.options = Object.assign({
        defaultStudioId: 'timer',
        storage: typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
      }, options);

      this.activeStudioId = this.options.defaultStudioId;
      this.studios = STUDIOS;
      this.loadSavedTab();
    }

    /**
     * Switch to a specific studio and isolate its view pane
     */
    switchStudio(studioId) {
      const match = STUDIOS.find(s => s.id === studioId);
      if (!match) return false;

      this.activeStudioId = studioId;
      this.saveActiveTab();

      if (typeof document !== 'undefined') {
        this.applyDomIsolation();
      }

      return {
        studioId: match.id,
        label: match.label,
        icon: match.icon
      };
    }

    /**
     * Show only active studio pane in the DOM and hide others
     */
    applyDomIsolation() {
      if (typeof document === 'undefined') return;

      STUDIOS.forEach(s => {
        const panes = document.querySelectorAll(s.paneSelector);
        panes.forEach(p => {
          if (s.id === this.activeStudioId) {
            p.style.display = 'block';
            p.style.opacity = '1';
            p.classList.add('active-studio-pane');
          } else {
            p.style.display = 'none';
            p.classList.remove('active-studio-pane');
          }
        });
      });

      // Update bottom navigation bar active state
      const navButtons = document.querySelectorAll('.bottom-nav-item, [data-nav-studio]');
      navButtons.forEach(btn => {
        const target = btn.getAttribute('data-nav-studio');
        if (target === this.activeStudioId) {
          btn.classList.add('active');
          btn.style.color = '#2563EB';
          btn.style.transform = 'scale(1.08)';
        } else {
          btn.classList.remove('active');
          btn.style.color = '#64748B';
          btn.style.transform = 'scale(1.0)';
        }
      });

      // Scroll smoothly to top on tab change
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    saveActiveTab() {
      if (this.options.storage) {
        try {
          this.options.storage.setItem(STORAGE_ACTIVE_TAB_KEY, this.activeStudioId);
        } catch (e) {}
      }
    }

    loadSavedTab() {
      if (this.options.storage) {
        try {
          const saved = this.options.storage.getItem(STORAGE_ACTIVE_TAB_KEY);
          if (saved && STUDIOS.some(s => s.id === saved)) {
            this.activeStudioId = saved;
          }
        } catch (e) {}
      }
    }
  }

  return StudioNavigator;
}));
