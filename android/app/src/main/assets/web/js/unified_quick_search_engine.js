/**
 * DEEP FOCUS — Unified Offline Quick Search Engine (v21 Compatible)
 * Mission #034: Fast, tokenized, diacritic-insensitive search across
 * Tasks, Notes, and Session History without network or regex injection risks.
 */
(function (global) {
  'use strict';

  /**
   * Normalizes text for robust Arabic and Latin matching.
   * - Strips Arabic diacritics (tashkeel).
   * - Normalizes alef forms (أ, إ, آ -> ا).
   * - Normalizes teh marbuta (ة -> ه) and alef maksura (ى -> ي).
   * - Converts Latin text to lowercase.
   */
  function normalizeText(str) {
    if (typeof str !== 'string') return '';
    return str
      .trim()
      .toLowerCase()
      // Remove Arabic diacritics
      .replace(/[\u064B-\u065F\u0670]/g, '')
      // Normalize Alef
      .replace(/[أإآ]/g, 'ا')
      // Normalize Teh Marbuta
      .replace(/ة/g, 'ه')
      // Normalize Alef Maksura
      .replace(/ى/g, 'ي');
  }

  /**
   * Safe tokenization split by whitespace.
   */
  function tokenize(query) {
    var norm = normalizeText(query);
    if (!norm) return [];
    return norm.split(/\s+/).filter(function (t) { return t.length > 0; });
  }

  /**
   * Computes match score for a given target text against query tokens.
   */
  function computeFieldScore(rawField, tokens, weight) {
    if (!rawField || tokens.length === 0) return 0;
    var normField = normalizeText(rawField);
    var matches = 0;
    for (var i = 0; i < tokens.length; i++) {
      if (normField.indexOf(tokens[i]) !== -1) {
        matches++;
      }
    }
    if (matches === 0) return 0;
    // Boost if full token sequence matches exactly
    var fullMatchBoost = (normField.indexOf(tokens.join(' ')) !== -1) ? 1.5 : 1.0;
    return (matches / tokens.length) * weight * fullMatchBoost;
  }

  /**
   * Main Search Function across Tasks, Notes, and Focus Sessions.
   * @param {string} rawQuery - User search query.
   * @param {Object} datasets - { tasks: [], notes: [], sessions: [] }
   * @param {Object} options - { limit: number }
   * @returns {Object} { query, totalMatches, results: [] }
   */
  function searchAll(rawQuery, datasets, options) {
    datasets = datasets || {};
    options = options || {};
    var limit = typeof options.limit === 'number' && options.limit > 0 ? options.limit : 30;

    var tokens = tokenize(rawQuery);
    if (tokens.length === 0) {
      return {
        query: rawQuery || '',
        totalMatches: 0,
        results: []
      };
    }

    var tasks = Array.isArray(datasets.tasks) ? datasets.tasks : [];
    var notes = Array.isArray(datasets.notes) ? datasets.notes : [];
    var sessions = Array.isArray(datasets.sessions) ? datasets.sessions : [];

    var hits = [];

    // 1. Search Tasks (Title: 60, Tags: 30)
    for (var t = 0; t < tasks.length; t++) {
      var task = tasks[t];
      if (!task) continue;
      var titleScore = computeFieldScore(task.title || '', tokens, 60);
      var tagScore = computeFieldScore(Array.isArray(task.tags) ? task.tags.join(' ') : (task.tag || ''), tokens, 30);
      var totalScore = titleScore + tagScore;

      if (totalScore > 0) {
        hits.push({
          type: 'task',
          id: task.id || ('task_' + t),
          title: task.title || 'Untitled Task',
          subtitle: task.completed ? 'مكتملة' : 'قيد الانتظار',
          score: Math.round(totalScore),
          raw: task
        });
      }
    }

    // 2. Search Notes (Title: 50, Content: 30, Tags: 20)
    for (var n = 0; n < notes.length; n++) {
      var note = notes[n];
      if (!note) continue;
      var nTitleScore = computeFieldScore(note.title || '', tokens, 50);
      var nContentScore = computeFieldScore(note.content || '', tokens, 30);
      var nTagScore = computeFieldScore(Array.isArray(note.tags) ? note.tags.join(' ') : (note.tag || ''), tokens, 20);
      var nTotalScore = nTitleScore + nContentScore + nTagScore;

      if (nTotalScore > 0) {
        hits.push({
          type: 'note',
          id: note.id || ('note_' + n),
          title: note.title || 'Untitled Note',
          subtitle: (note.content || '').substring(0, 60),
          score: Math.round(nTotalScore),
          raw: note
        });
      }
    }

    // 3. Search Sessions (Label/Category: 40)
    for (var s = 0; s < sessions.length; s++) {
      var session = sessions[s];
      if (!session) continue;
      var sLabelScore = computeFieldScore(session.label || session.taskTitle || '', tokens, 50);
      var sCatScore = computeFieldScore(session.category || '', tokens, 30);
      var sTotalScore = sLabelScore + sCatScore;

      if (sTotalScore > 0) {
        hits.push({
          type: 'session',
          id: session.id || ('session_' + s),
          title: session.label || session.taskTitle || 'جلسة تركيز',
          subtitle: (session.durationMinutes || 0) + ' دقيقة' + (session.date ? ' (' + session.date + ')' : ''),
          score: Math.round(sTotalScore),
          raw: session
        });
      }
    }

    // Sort descending by relevance score
    hits.sort(function (a, b) {
      return b.score - a.score;
    });

    var boundedHits = hits.slice(0, limit);

    return {
      query: rawQuery,
      totalMatches: hits.length,
      results: boundedHits
    };
  }

  var engine = {
    normalizeText: normalizeText,
    tokenize: tokenize,
    searchAll: searchAll
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.UnifiedQuickSearchEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
