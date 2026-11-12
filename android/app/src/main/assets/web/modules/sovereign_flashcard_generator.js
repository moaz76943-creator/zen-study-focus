/**
 * DEEP FOCUS — SovereignFlashcardGenerator (v618.0.0)
 * On-device heuristic and local AI flashcard extraction engine.
 * Converts raw study notes into SM-2 compliant cards.
 * 100% Sovereign Offline, Zero PII, Western Arabic numerals (0123456789).
 */
(function (global) {
  'use strict';

  var SovereignFlashcardGenerator = {
    version: '618.0.0',

    extractHeuristicCards: function (text, defaultTag) {
      if (!text || typeof text !== 'string') return [];
      defaultTag = defaultTag || 'General';
      var lines = text.split(/\r?\n/);
      var cards = [];
      var counter = 1;

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line || line.length < 5) continue;

        var sepMatch = line.match(/^([^:\-—–]{2,40})\s*[:\-—–]\s*(.{5,})$/);
        if (sepMatch) {
          cards.push({
            id: 'card_' + Date.now() + '_' + (counter++),
            front: sepMatch[1].trim(),
            back: sepMatch[2].trim(),
            tag: defaultTag,
            type: 'definition',
            repetition: 0,
            interval: 1,
            easeFactor: 2.5,
            nextReview: Date.now()
          });
        }
      }
      return cards;
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SovereignFlashcardGenerator;
  }
  global.SovereignFlashcardGenerator = SovereignFlashcardGenerator;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
