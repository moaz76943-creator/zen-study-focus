/**
 * DEEP FOCUS — SovereignSpacedRepetition (v581.0.0)
 * Mathematical implementation of SuperMemo-2 (SM-2) algorithm for active recall.
 * Zero external network dependencies, privacy-first local study mastery.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'df_spaced_repetition_v1';

  var state = {
    decks: [
      { id: 'default', name: 'General Focus', desc: 'Core study items and foundational concepts' }
    ],
    cards: []
  };

  function loadState() {
    try {
      if (typeof localStorage !== 'undefined') {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          var parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.decks) && Array.isArray(parsed.cards)) {
            state = parsed;
          }
        }
      }
    } catch (e) {}
  }

  function saveState() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch (e) {}
  }

  loadState();

  var SovereignSpacedRepetition = {
    version: '581.0.0',

    listDecks: function () {
      return state.decks.slice();
    },

    createDeck: function (id, name, desc) {
      if (!name) return false;
      var deckId = (id || name).toLowerCase().replace(/[^a-z0-9_]/g, '_');
      for (var i = 0; i < state.decks.length; i++) {
        if (state.decks[i].id === deckId) return state.decks[i];
      }
      var deck = { id: deckId, name: name, desc: desc || '' };
      state.decks.push(deck);
      saveState();
      if (global.SovereignEventBus && typeof global.SovereignEventBus.emit === 'function') {
        global.SovereignEventBus.emit('deck:created', deck);
      }
      return deck;
    },

    createCard: function (data) {
      if (!data || !data.front || !data.back) return false;
      var card = {
        id: 'card_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        deckId: data.deckId || 'default',
        front: String(data.front),
        back: String(data.back),
        repetitions: 0,
        intervalDays: 0,
        easeFactor: 2.5,
        nextReviewDate: Date.now(),
        createdAt: Date.now(),
        lastReviewed: null
      };
      state.cards.push(card);
      saveState();
      if (global.SovereignEventBus && typeof global.SovereignEventBus.emit === 'function') {
        global.SovereignEventBus.emit('card:created', card);
      }
      return card;
    },

    /**
     * Reviews a card using the canonical SM-2 algorithm
     * @param {string} cardId
     * @param {number} quality - 0 to 5 (5: perfect, 0: complete blackout)
     */
    reviewCard: function (cardId, quality) {
      var q = Math.max(0, Math.min(5, parseInt(quality, 10)));
      var card = null;
      for (var i = 0; i < state.cards.length; i++) {
        if (state.cards[i].id === cardId) {
          card = state.cards[i];
          break;
        }
      }
      if (!card) return false;

      // 1. Calculate new Ease Factor (EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
      var newEF = card.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
      if (newEF < 1.3) newEF = 1.3;
      card.easeFactor = parseFloat(newEF.toFixed(3));

      // 2. Calculate interval based on quality and repetition count
      if (q < 3) {
        card.repetitions = 0;
        card.intervalDays = 1;
      } else {
        if (card.repetitions === 0) {
          card.intervalDays = 1;
        } else if (card.repetitions === 1) {
          card.intervalDays = 6;
        } else {
          card.intervalDays = Math.round(card.intervalDays * card.easeFactor);
        }
        card.repetitions += 1;
      }

      card.lastReviewed = Date.now();
      card.nextReviewDate = Date.now() + (card.intervalDays * 86400000);

      saveState();
      if (global.SovereignEventBus && typeof global.SovereignEventBus.emit === 'function') {
        global.SovereignEventBus.emit('card:reviewed', { cardId: card.id, quality: q, nextReviewDate: card.nextReviewDate });
      }
      return card;
    },

    getDueCards: function (deckId) {
      var now = Date.now();
      var due = [];
      for (var i = 0; i < state.cards.length; i++) {
        var c = state.cards[i];
        if (!deckId || c.deckId === deckId) {
          if (c.nextReviewDate <= now) {
            due.push(Object.assign({}, c));
          }
        }
      }
      return due;
    },

    getRetentionStats: function (deckId) {
      var total = 0;
      var mastered = 0;
      var due = 0;
      var now = Date.now();

      for (var i = 0; i < state.cards.length; i++) {
        var c = state.cards[i];
        if (!deckId || c.deckId === deckId) {
          total++;
          if (c.repetitions >= 3) mastered++;
          if (c.nextReviewDate <= now) due++;
        }
      }

      return {
        total: total,
        mastered: mastered,
        due: due,
        retentionRate: total > 0 ? Math.round((mastered / total) * 100) : 100
      };
    }
  };

  global.SovereignSpacedRepetition = SovereignSpacedRepetition;
  if (global.SovereignCoreRegistry && typeof global.SovereignCoreRegistry.register === 'function') {
    global.SovereignCoreRegistry.register('sovereign_spaced_repetition', SovereignSpacedRepetition);
  }
})(typeof window !== 'undefined' ? window : globalThis);
