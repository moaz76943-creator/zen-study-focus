/**
 * DEEP FOCUS — Post-Session Mindful Reflection Engine
 * Mission #041: Non-intrusive post-session reflection, 1-tap skip,
 * zero medical claims, rating clamping, and session contract binding.
 */
(function (global) {
  'use strict';

  var VALID_ENERGY_LEVELS = ['low', 'medium', 'high'];
  var VALID_FOCUS_QUALITIES = ['distracted', 'steady', 'deep_flow'];

  /**
   * Clamps rating strictly between 1 and 5.
   */
  function clampRating(val) {
    if (typeof val !== 'number' || isNaN(val)) return 3;
    var rounded = Math.round(val);
    if (rounded < 1) return 1;
    if (rounded > 5) return 5;
    return rounded;
  }

  /**
   * Sanitizes reflection takeaway text.
   */
  function sanitizeTakeaway(text) {
    if (typeof text !== 'string') return '';
    var trimmed = text.trim();
    if (trimmed.length > 200) {
      trimmed = trimmed.substring(0, 200);
      if (/[\uD800-\uDBFF]$/.test(trimmed)) {
        trimmed = trimmed.slice(0, -1);
      }
    }
    return trimmed.replace(/[<>]/g, '');
  }

  /**
   * Creates a clean, default reflection object.
   */
  function createDefaultReflection() {
    return {
      skipped: false,
      rating: 4,
      energy: 'medium',
      focusQuality: 'steady',
      takeaway: '',
      timestamp: Date.now()
    };
  }

  /**
   * Creates a skipped reflection record.
   */
  function createSkippedReflection() {
    return {
      skipped: true,
      rating: null,
      energy: null,
      focusQuality: null,
      takeaway: '',
      timestamp: Date.now()
    };
  }

  /**
   * Validates and normalizes user reflection inputs.
   */
  function buildReflection(rawInputs) {
    if (!rawInputs || typeof rawInputs !== 'object') {
      return createSkippedReflection();
    }
    if (rawInputs.skipped) {
      return createSkippedReflection();
    }

    var energy = String(rawInputs.energy).toLowerCase();
    if (VALID_ENERGY_LEVELS.indexOf(energy) === -1) {
      energy = 'medium';
    }

    var quality = String(rawInputs.focusQuality).toLowerCase();
    if (VALID_FOCUS_QUALITIES.indexOf(quality) === -1) {
      quality = 'steady';
    }

    return {
      skipped: false,
      rating: clampRating(rawInputs.rating),
      energy: energy,
      focusQuality: quality,
      takeaway: sanitizeTakeaway(rawInputs.takeaway),
      timestamp: Date.now()
    };
  }

  /**
   * Attaches reflection safely to a completed session object.
   */
  function attachReflectionToSession(session, reflectionInputs) {
    if (!session || typeof session !== 'object') {
      return null;
    }
    var cloned = Object.assign({}, session);
    cloned.reflection = buildReflection(reflectionInputs);
    return cloned;
  }

  var engine = {
    clampRating: clampRating,
    sanitizeTakeaway: sanitizeTakeaway,
    createDefaultReflection: createDefaultReflection,
    createSkippedReflection: createSkippedReflection,
    buildReflection: buildReflection,
    attachReflectionToSession: attachReflectionToSession
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.PostSessionReflectionEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
