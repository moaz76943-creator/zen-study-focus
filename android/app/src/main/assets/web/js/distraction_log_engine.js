/**
 * DEEP FOCUS — In-Session Distraction Log & Mindful Buffer Engine
 * Mission #049: Quick in-session brain dump, text sanitization,
 * safe memory cap (max 20 entries), and distraction analytics.
 */
(function (global) {
  'use strict';

  var MAX_BUFFER_ITEMS = 20;

  function sanitizeText(str) {
    if (typeof str !== 'string') return '';
    return str.trim().substring(0, 140).replace(/[<>]/g, '');
  }

  function recordDistraction(buffer, rawText, elapsedSeconds) {
    var list = Array.isArray(buffer) ? buffer.slice() : [];
    var cleanText = sanitizeText(rawText);
    if (!cleanText) return list;

    while (list.length >= MAX_BUFFER_ITEMS) {
      list.shift(); // Drop oldest to prevent memory overflow
    }

    list.push({
      id: "dist_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      text: cleanText,
      elapsedSeconds: typeof elapsedSeconds === 'number' && elapsedSeconds >= 0 ? Math.floor(elapsedSeconds) : 0,
      timestamp: Date.now()
    });

    return list;
  }

  function getDistractionSummary(buffer) {
    var list = Array.isArray(buffer) ? buffer : [];
    return {
      totalCount: list.length,
      entries: list,
      hasDistractions: list.length > 0
    };
  }

  var engine = {
    MAX_BUFFER_ITEMS: MAX_BUFFER_ITEMS,
    sanitizeText: sanitizeText,
    recordDistraction: recordDistraction,
    getDistractionSummary: getDistractionSummary
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.DistractionLogEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
