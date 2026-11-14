/**
 * DEEP FOCUS — Flashcards core (pure logic: storage, scheduling, search, import/export).
 *
 * Storage (localStorage only, no second database):
 *   df_fc_meta_v1        decks, prefs, sessions, daily counters, migration flags
 *   df_fc_cards_v1_<n>   cards in chunks of 500 (n = floor(card.n / 500)); only dirty chunks are rewritten
 * Legacy keys (df_flashcards_v1, df_vocab_bank, df_cards_v1, df_vocab_bank_v1, df_vocab_flashcards_v21)
 * are READ for a one-time, non-destructive migration and are never modified or deleted.
 *
 * Scheduling: FSRS-4.5 formulas with the default weights from modules/flashcards/fsrs.js (no optimizer)
 * plus a fixed learning-steps scheme (1 min, 10 min). It is deterministic and unit-tested.
 *
 * Capacity: localStorage is limited by the WebView quota (about 5 MB of UTF-16). `usage()` reports the
 * real size and writes that exceed the quota fail with code STORAGE_FULL and roll back; nothing is lost.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./fsrs.js'));
  else root.DFFlashcards = factory(root.FSRS45);
}(typeof self !== 'undefined' ? self : this, function (FSRS) {
  'use strict';

  var SCHEMA = 1;
  var META_KEY = 'df_fc_meta_v1';
  var CHUNK_PREFIX = 'df_fc_cards_v1_';
  var CHUNK_SIZE = 500;
  var LEGACY_KEYS = ['df_flashcards_v1', 'df_vocab_bank', 'df_cards_v1', 'df_vocab_bank_v1', 'df_vocab_flashcards_v21'];
  var LIMITS = { text: 2000, name: 80, desc: 300, tag: 40, tags: 20, cards: 60000, decks: 500, importBytes: 8 * 1024 * 1024, importRows: 50000, log: 30, sessions: 200, dailyDays: 400 };
  var CARD_TYPES = ['word', 'qa', 'term', 'concept', 'custom'];
  var STATES = ['new', 'learning', 'review', 'relearning'];
  var ICONS = ['book', 'bookmark', 'star', 'bolt', 'circle', 'square', 'diamond', 'flask', 'globe', 'hash', 'pencil', 'target'];
  var STEPS_MIN = [1, 10];
  var DAY = 86400000;
  var LANG_RE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$/;
  var SPEECH_RATES = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.0];

  function err(code, message, extra) { var r = { ok: false, code: code, error: message || code }; if (extra) for (var k in extra) r[k] = extra[k]; return r; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey(ms) { var d = new Date(ms); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function clampInt(v, lo, hi, dflt) { v = Math.round(Number(v)); return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt; }
  function str(v, max) { return typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, max) : ''; }

  // ---- text normalisation for search / duplicate detection (never applied to stored text) ----
  function norm(s) {
    s = String(s == null ? '' : s);
    try { s = s.normalize('NFKD'); } catch (_) {}
    return s.replace(/[̀-ًͯ-ٰٟـ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }
  function lev(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    var prev = new Array(b.length + 1), cur = new Array(b.length + 1), i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur[0] = i;
      for (j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1));
      var t = prev; prev = cur; cur = t;
    }
    return prev[b.length];
  }
  function changeRatio(a, b) { a = norm(a); b = norm(b); var m = Math.max(a.length, b.length); return m ? lev(a, b) / m : 0; }
  function validLang(tag) { return tag === '' || (typeof tag === 'string' && tag.length <= 35 && LANG_RE.test(tag)); }

  function defaultPrefs() {
    return { dailyGoal: 20, direction: 'forward', textSize: 'medium', showExamples: true, defaultMode: 'classic', defaultDeckId: '', repeat: 1, rate: 1.0, pitch: 1.0, speakSide: 'front', offlineOnly: false, preferMale: true, engine: '', perLanguage: {} };
  }

  function create(opts) {
    opts = opts || {};
    var storage = opts.storage;
    var nowFn = opts.now || function () { return Date.now(); };
    var rng = opts.random || function () {
      try { var g = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto : (typeof self !== 'undefined' && self.crypto); if (g && g.getRandomValues) { var u = new Uint32Array(1); g.getRandomValues(u); return u[0] / 4294967296; } } catch (_) {}
      return Math.random();
    };
    var fsrs = opts.fsrs || FSRS;
    if (!storage) throw new Error('DFFlashcards: storage is required');
    if (!fsrs) throw new Error('DFFlashcards: FSRS45 is required');

    var meta = null;
    var chunks = {};        // chunk index -> array of cards
    var cardIndex = null;   // id -> card
    var undoStack = [];
    var warnings = [];

    // ---------- persistence ----------
    function readJson(key) {
      var raw = storage.getItem(key);
      if (raw == null) return { missing: true };
      try { return { value: JSON.parse(raw, function (k, v) { return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v; }) }; }
      catch (e) {
        try { storage.setItem('df_fc_quarantine_' + key.slice(-20), raw.slice(0, 200000)); } catch (_) {}
        warnings.push('Corrupt record quarantined: ' + key);
        return { corrupt: true };
      }
    }
    function freshMeta() { return { schema: SCHEMA, decks: [], prefs: defaultPrefs(), sessions: [], daily: {}, nextSeq: 0, activeSession: null, submitted: [], migrated: {}, chunks: [] }; }

    function load() {
      var m = readJson(META_KEY);
      meta = (m.value && typeof m.value === 'object' && !Array.isArray(m.value)) ? m.value : freshMeta();
      if (Number(meta.schema) > SCHEMA) throw new Error('Flashcards data is from a newer app version');
      var f = freshMeta(); Object.keys(f).forEach(function (k) { if (meta[k] === undefined) meta[k] = f[k]; });
      meta.prefs = sanitizePrefs(meta.prefs);
      chunks = {}; cardIndex = Object.create(null);
      (meta.chunks || []).forEach(function (n) {
        var c = readJson(CHUNK_PREFIX + n);
        var arr = (c.value && Array.isArray(c.value)) ? c.value : [];
        chunks[n] = arr.filter(function (x) { return x && typeof x.id === 'string'; });
        chunks[n].forEach(function (card) { cardIndex[card.id] = card; });
      });
    }

    // Write dirty chunks and meta with verification. On any failure restore previous values.
    function persist(dirtyChunks) {
      var keys = [META_KEY], payload = {};
      dirtyChunks = dirtyChunks || [];
      if (dirtyChunks.length) {
        dirtyChunks.forEach(function (n) { if (meta.chunks.indexOf(n) < 0) meta.chunks.push(n); });
        meta.chunks.sort(function (a, b) { return a - b; });
      }
      payload[META_KEY] = JSON.stringify(meta);
      dirtyChunks.forEach(function (n) { payload[CHUNK_PREFIX + n] = JSON.stringify(chunks[n] || []); keys.push(CHUNK_PREFIX + n); });
      var before = {}, done = [];
      keys.forEach(function (k) { before[k] = storage.getItem(k); });
      try {
        keys.forEach(function (k) {
          storage.setItem(k, payload[k]); done.push(k);
          if (storage.getItem(k) !== payload[k]) throw new Error('WRITE_NOT_VERIFIED');
        });
        return { ok: true };
      } catch (e) {
        done.concat(keys).forEach(function (k) { try { if (before[k] == null) storage.removeItem(k); else storage.setItem(k, before[k]); } catch (_) {} });
        return err('STORAGE_FULL', 'Could not save (storage full or unavailable). Nothing was changed.');
      }
    }
    function chunkOf(card) { return Math.floor(card.n / CHUNK_SIZE); }
    function touched(cards) { var s = {}; cards.forEach(function (c) { s[chunkOf(c)] = 1; }); return Object.keys(s).map(Number); }
    function allCards() { var out = []; meta.chunks.forEach(function (n) { (chunks[n] || []).forEach(function (c) { out.push(c); }); }); return out; }
    function cardCount() { return Object.keys(cardIndex).length; }

    function genId(prefix, taken) {
      var id, i = 0;
      do {
        var r = '';
        for (var k = 0; k < 3; k++) r += Math.floor(rng() * 0x100000000).toString(36);
        id = prefix + nowFn().toString(36) + r.slice(0, 10); i++;
      } while (taken(id) && i < 20);
      var base = id, j = 1;
      while (taken(id)) { id = base + '_' + (j++).toString(36); } // guarantees uniqueness even with a bad RNG
      return id;
    }
    function deckById(id) { for (var i = 0; i < meta.decks.length; i++) if (meta.decks[i].id === id) return meta.decks[i]; return null; }

    // ---------- prefs ----------
    function sanitizeLangPrefs(p) {
      p = p && typeof p === 'object' ? p : {};
      var o = {};
      if (typeof p.voiceId === 'string') o.voiceId = p.voiceId.slice(0, 200);
      if (p.rate !== undefined) { var r = Number(p.rate); if (isFinite(r)) o.rate = Math.min(2, Math.max(0.5, r)); }
      if (p.pitch !== undefined) { var pi = Number(p.pitch); if (isFinite(pi)) o.pitch = Math.min(2, Math.max(0.5, pi)); }
      if (['male', 'female', 'any'].indexOf(p.preferredGender) >= 0) o.preferredGender = p.preferredGender;
      if (typeof p.offlineOnly === 'boolean') o.offlineOnly = p.offlineOnly;
      return o;
    }
    function sanitizePrefs(p) {
      var d = defaultPrefs(); p = p && typeof p === 'object' ? p : {};
      d.dailyGoal = clampInt(p.dailyGoal, 1, 1000, d.dailyGoal);
      d.direction = ['forward', 'reverse', 'both'].indexOf(p.direction) >= 0 ? p.direction : d.direction;
      d.repeat = clampInt(p.repeat, 1, 9, 1);
      d.textSize = ['small', 'medium', 'large'].indexOf(p.textSize) >= 0 ? p.textSize : 'medium';
      d.showExamples = p.showExamples !== false;
      d.defaultMode = ['classic', 'reverse', 'both', 'listening', 'pronunciation', 'writing', 'choice', 'cloze', 'mixed', 'quick'].indexOf(p.defaultMode) >= 0 ? p.defaultMode : 'classic';
      d.defaultDeckId = typeof p.defaultDeckId === 'string' ? p.defaultDeckId.slice(0, 60) : '';
      var r = Number(p.rate); d.rate = isFinite(r) ? Math.min(2, Math.max(0.5, r)) : 1;
      var pi = Number(p.pitch); d.pitch = isFinite(pi) ? Math.min(2, Math.max(0.5, pi)) : 1;
      d.speakSide = ['front', 'back'].indexOf(p.speakSide) >= 0 ? p.speakSide : 'front';
      d.offlineOnly = p.offlineOnly === true;
      d.preferMale = p.preferMale !== false;
      d.engine = typeof p.engine === 'string' ? p.engine.slice(0, 120) : '';
      d.perLanguage = {};
      if (p.perLanguage && typeof p.perLanguage === 'object') {
        Object.keys(p.perLanguage).slice(0, 80).forEach(function (tag) { if (tag !== '__proto__' && tag && validLang(tag)) d.perLanguage[tag] = sanitizeLangPrefs(p.perLanguage[tag]); });
      }
      return d;
    }
    function getPrefs() { return JSON.parse(JSON.stringify(meta.prefs)); }
    function setPrefs(patch) {
      var before = meta.prefs;
      meta.prefs = sanitizePrefs(Object.assign({}, meta.prefs, patch || {}));
      var r = persist([]);
      if (!r.ok) meta.prefs = before;
      return r.ok ? { ok: true, prefs: getPrefs() } : r;
    }

    // ---------- decks ----------
    function cleanDeckFields(f, base) {
      var d = base || {};
      if (f.name !== undefined) d.name = str(f.name, LIMITS.name).trim();
      if (f.description !== undefined) d.description = str(f.description, LIMITS.desc);
      if (f.color !== undefined) d.color = /^#[0-9a-fA-F]{6}$/.test(f.color) ? f.color : (d.color || '#111827');
      if (f.icon !== undefined) d.icon = ICONS.indexOf(f.icon) >= 0 ? f.icon : (d.icon || 'book');
      return d;
    }
    function createDeck(f) {
      f = f || {};
      if (meta.decks.length >= LIMITS.decks) return err('LIMIT', 'Too many decks');
      var d = cleanDeckFields(f, { description: '', color: '#111827', icon: 'book' });
      if (!d.name) return err('NAME_REQUIRED', 'Deck name is required');
      var t = nowFn();
      d.id = genId('d_', function (x) { return !!deckById(x); });
      d.createdAt = t; d.updatedAt = t; d.archivedAt = null; d.sortOrder = meta.decks.length;
      meta.decks.push(d);
      var r = persist([]);
      if (!r.ok) { meta.decks.pop(); return r; }
      return { ok: true, deck: JSON.parse(JSON.stringify(d)) };
    }
    function updateDeck(id, f) {
      var d = deckById(id); if (!d) return err('NOT_FOUND', 'Deck not found');
      var snap = JSON.stringify(d), copy = JSON.parse(snap);
      cleanDeckFields(f || {}, copy);
      if (!copy.name) return err('NAME_REQUIRED', 'Deck name is required');
      copy.updatedAt = nowFn();
      Object.keys(copy).forEach(function (k) { d[k] = copy[k]; });
      var r = persist([]);
      if (!r.ok) { Object.assign(d, JSON.parse(snap)); return r; }
      return { ok: true, deck: JSON.parse(JSON.stringify(d)) };
    }
    function setArchived(id, on) {
      var d = deckById(id); if (!d) return err('NOT_FOUND', 'Deck not found');
      var prev = d.archivedAt; d.archivedAt = on ? nowFn() : null; d.updatedAt = nowFn();
      var r = persist([]); if (!r.ok) { d.archivedAt = prev; return r; }
      return { ok: true };
    }
    function archiveDeck(id) { return setArchived(id, true); }
    function restoreDeck(id) { return setArchived(id, false); }
    function deleteDeck(id) {
      var d = deckById(id); if (!d) return err('NOT_FOUND', 'Deck not found');
      if (allCards().some(function (c) { return c.deckId === id; })) return err('DECK_NOT_EMPTY', 'Deck has cards. Archive it instead, or move the cards first.');
      var i = meta.decks.indexOf(d); meta.decks.splice(i, 1);
      var r = persist([]); if (!r.ok) { meta.decks.splice(i, 0, d); return r; }
      return { ok: true };
    }
    function listDecks(o) {
      o = o || {};
      var q = norm(o.search || ''), list = meta.decks.filter(function (d) {
        if (o.archived === true) { if (!d.archivedAt) return false; } else if (o.includeArchived !== true && d.archivedAt) return false;
        return !q || norm(d.name + ' ' + d.description).indexOf(q) >= 0;
      }).map(function (d) { return JSON.parse(JSON.stringify(d)); });
      var by = o.sort || 'order';
      list.sort(function (a, b) { return by === 'name' ? a.name.localeCompare(b.name) : by === 'recent' ? b.updatedAt - a.updatedAt : a.sortOrder - b.sortOrder; });
      return list;
    }
    function deckStats(id) {
      var t = nowFn(), s = { total: 0, new: 0, due: 0, learned: 0, suspended: 0 };
      allCards().forEach(function (c) {
        if (id && c.deckId !== id) return;
        s.total++; if (c.suspended) { s.suspended++; return; }
        if (c.st === 'new') s.new++; else if (c.due <= t) s.due++;
        if (isLearned(c)) s.learned++;
      });
      return s;
    }
    function duplicateDeck(id) {
      var d = deckById(id); if (!d) return err('NOT_FOUND', 'Deck not found');
      var made = createDeck({ name: (d.name + ' (copy)').slice(0, LIMITS.name), description: d.description, color: d.color, icon: d.icon });
      if (!made.ok) return made;
      var src = allCards().filter(function (c) { return c.deckId === id; });
      if (cardCount() + src.length > LIMITS.cards) { return err('LIMIT', 'Too many cards', { deck: made.deck }); }
      var copies = src.map(function (c) { return newCardRecord(copyContent(c), made.deck.id); });
      var r = commitNewCards(copies);
      if (!r.ok) { deleteDeck(made.deck.id); return r; }
      return { ok: true, deck: made.deck, copied: copies.length };
    }

    // ---------- cards ----------
    function copyContent(c) {
      return { cardType: c.cardType, frontText: c.frontText, backText: c.backText, sourceLanguage: c.sourceLanguage, targetLanguage: c.targetLanguage, exampleText: c.exampleText, exampleTranslation: c.exampleTranslation, pronunciationNotes: c.pronunciationNotes, personalNotes: c.personalNotes, tags: c.tags.slice(), favorite: c.favorite };
    }
    function cleanTags(tags) {
      var out = [], seen = {};
      (Array.isArray(tags) ? tags : String(tags || '').split(/[,،;]/)).forEach(function (t) {
        t = str(String(t), LIMITS.tag).trim(); var k = norm(t);
        if (t && !seen[k] && out.length < LIMITS.tags) { seen[k] = 1; out.push(t); }
      });
      return out;
    }
    function validateContent(f, partial) {
      var o = {};
      var fields = { frontText: LIMITS.text, backText: LIMITS.text, exampleText: LIMITS.text, exampleTranslation: LIMITS.text, pronunciationNotes: LIMITS.text, personalNotes: LIMITS.text };
      for (var k in fields) if (f[k] !== undefined) o[k] = str(f[k], fields[k]);
      if (f.cardType !== undefined) { if (CARD_TYPES.indexOf(f.cardType) < 0) return err('BAD_TYPE', 'Unknown card type'); o.cardType = f.cardType; }
      ['sourceLanguage', 'targetLanguage'].forEach(function (k2) {
        if (f[k2] !== undefined) o[k2] = f[k2];
      });
      if (o.sourceLanguage !== undefined && !validLang(o.sourceLanguage)) return err('BAD_LANGUAGE', 'Invalid source language tag');
      if (o.targetLanguage !== undefined && !validLang(o.targetLanguage)) return err('BAD_LANGUAGE', 'Invalid target language tag');
      if (f.tags !== undefined) o.tags = cleanTags(f.tags);
      if (f.favorite !== undefined) o.favorite = f.favorite === true;
      if (!partial) {
        if (!o.frontText || !o.frontText.trim()) return err('FRONT_REQUIRED', 'Front text is required');
        if (!o.backText || !o.backText.trim()) return err('BACK_REQUIRED', 'Back text is required');
      } else {
        if (o.frontText !== undefined && !o.frontText.trim()) return err('FRONT_REQUIRED', 'Front text is required');
        if (o.backText !== undefined && !o.backText.trim()) return err('BACK_REQUIRED', 'Back text is required');
      }
      return { ok: true, value: o };
    }
    function newCardRecord(content, deckId) {
      var t = nowFn();
      var c = Object.assign({ cardType: 'word', sourceLanguage: '', targetLanguage: '', exampleText: '', exampleTranslation: '', pronunciationNotes: '', personalNotes: '', tags: [], favorite: false }, content);
      c.id = genId('c_', function (x) { return !!cardIndex[x]; });
      c.deckId = deckId; c.n = meta.nextSeq++;
      c.createdAt = t; c.updatedAt = t;
      c.st = 'new'; c.due = 0; c.stab = 0; c.diff = 0; c.step = 0; c.ivl = 0; c.reps = 0; c.ok = 0; c.lapses = 0; c.last = 0; c.lastDay = '';
      c.suspended = false; c.flag = null; c.log = [];
      return c;
    }
    function commitNewCards(cards) {
      var prevSeq = meta.nextSeq, prevChunks = meta.chunks.slice();
      var dirty = {};
      cards.forEach(function (c) {
        var n = chunkOf(c); if (!chunks[n]) chunks[n] = []; chunks[n].push(c); cardIndex[c.id] = c; dirty[n] = 1;
      });
      var r = persist(Object.keys(dirty).map(Number));
      if (!r.ok) {
        cards.forEach(function (c) { var n = chunkOf(c); chunks[n] = (chunks[n] || []).filter(function (x) { return x !== c; }); delete cardIndex[c.id]; });
        meta.chunks = prevChunks; meta.nextSeq = prevSeq;
        Object.keys(chunks).forEach(function (n) { if (!chunks[n].length && prevChunks.indexOf(Number(n)) < 0) delete chunks[n]; });
        return r;
      }
      return { ok: true };
    }
    function findDuplicates(front, deckId) {
      var k = norm(front); if (!k) return [];
      return allCards().filter(function (c) { return (!deckId || c.deckId === deckId) && norm(c.frontText) === k; });
    }
    function addCard(f, o) {
      f = f || {}; o = o || {};
      if (!deckById(f.deckId)) return err('DECK_REQUIRED', 'Choose a deck');
      if (cardCount() >= LIMITS.cards) return err('LIMIT', 'Card limit reached');
      var v = validateContent(f, false); if (!v.ok) return v;
      if (!o.allowDuplicate) {
        var dup = findDuplicates(v.value.frontText, f.deckId);
        if (dup.length) return err('DUPLICATE', 'A card with the same front already exists', { existing: dup.slice(0, 5).map(function (c) { return c.id; }) });
      }
      var c = newCardRecord(v.value, f.deckId);
      var r = commitNewCards([c]); if (!r.ok) return r;
      return { ok: true, card: JSON.parse(JSON.stringify(c)) };
    }
    function getCard(id) { var c = cardIndex[id]; return c ? JSON.parse(JSON.stringify(c)) : null; }
    function pushUndo(entry) { undoStack.push(entry); if (undoStack.length > 20) undoStack.shift(); }
    function updateCard(id, patch) {
      var c = cardIndex[id]; if (!c) return err('NOT_FOUND', 'Card not found');
      patch = patch || {};
      var v = validateContent(patch, true); if (!v.ok) return v;
      if (patch.deckId !== undefined && !deckById(patch.deckId)) return err('DECK_REQUIRED', 'Deck not found');
      var before = JSON.parse(JSON.stringify(c));
      var material = (v.value.frontText !== undefined && changeRatio(c.frontText, v.value.frontText) >= 0.5) ||
                     (v.value.backText !== undefined && changeRatio(c.backText, v.value.backText) >= 0.5);
      // Only content fields are written here: scheduling fields (st, due, stab, diff, reps, log...) are untouched.
      Object.keys(v.value).forEach(function (k) { c[k] = v.value[k]; });
      if (patch.deckId !== undefined) c.deckId = patch.deckId;
      c.updatedAt = nowFn();
      if (material && c.st !== 'new') {
        c.flag = { type: 'content_changed', at: c.updatedAt, reason: 'The front or back changed substantially, so the card is due again for review.' };
        c.due = Math.min(c.due || 0, nowFn());
      }
      var r = persist([chunkOf(c)]);
      if (!r.ok) { Object.keys(c).forEach(function (k) { delete c[k]; }); Object.assign(c, before); return r; }
      pushUndo({ type: 'update', before: before });
      return { ok: true, card: JSON.parse(JSON.stringify(c)), needsReview: !!(material && c.st !== 'new') };
    }
    function moveCard(id, deckId) { return updateCard(id, { deckId: deckId }); }
    function setSuspended(id, on) {
      var c = cardIndex[id]; if (!c) return err('NOT_FOUND', 'Card not found');
      var prev = c.suspended; c.suspended = !!on; var r = persist([chunkOf(c)]);
      if (!r.ok) { c.suspended = prev; return r; }
      return { ok: true };
    }
    function toggleFavorite(id) {
      var c = cardIndex[id]; if (!c) return err('NOT_FOUND', 'Card not found');
      c.favorite = !c.favorite; var r = persist([chunkOf(c)]);
      if (!r.ok) { c.favorite = !c.favorite; return r; }
      return { ok: true, favorite: c.favorite };
    }
    function deleteCard(id) {
      var c = cardIndex[id]; if (!c) return err('NOT_FOUND', 'Card not found');
      var n = chunkOf(c), arr = chunks[n], i = arr.indexOf(c);
      arr.splice(i, 1); delete cardIndex[id];
      var r = persist([n]);
      if (!r.ok) { arr.splice(i, 0, c); cardIndex[id] = c; return r; }
      pushUndo({ type: 'delete', card: JSON.parse(JSON.stringify(c)) });
      return { ok: true };
    }
    function undo() {
      var e = undoStack.pop(); if (!e) return err('NOTHING_TO_UNDO', 'Nothing to undo');
      if (e.type === 'delete') {
        var c = e.card; if (cardIndex[c.id]) return err('CONFLICT', 'Card already exists');
        var n = chunkOf(c); if (!chunks[n]) chunks[n] = [];
        chunks[n].push(c); cardIndex[c.id] = c;
        var r = persist([n]);
        if (!r.ok) { chunks[n].pop(); delete cardIndex[c.id]; undoStack.push(e); return r; }
        return { ok: true, restored: c.id };
      }
      var cur = cardIndex[e.before.id]; if (!cur) return err('NOT_FOUND', 'Card no longer exists');
      var keep = JSON.parse(JSON.stringify(cur));
      Object.keys(cur).forEach(function (k) { delete cur[k]; }); Object.assign(cur, e.before);
      var r2 = persist([chunkOf(cur)]);
      if (!r2.ok) { Object.keys(cur).forEach(function (k) { delete cur[k]; }); Object.assign(cur, keep); undoStack.push(e); return r2; }
      return { ok: true, restored: cur.id };
    }

    // ---------- scheduling ----------
    function isLearned(c) { return c.st === 'review' && !c.suspended && c.ivl >= 7 && c.stab >= 7; }
    function initDifficulty(g) { return Math.min(10, Math.max(1, fsrs.W[4] - (g - 3) * fsrs.W[5])); }
    function graduate(c, g, t) {
      c.stab = Math.max(0.1, fsrs.W[g - 1]); c.diff = initDifficulty(g);
      c.ivl = fsrs.interval(c.stab, 0.9); c.st = 'review'; c.step = 0; c.due = t + c.ivl * DAY;
    }
    // Computes the next scheduling fields for a rating WITHOUT mutating the card.
    function planRating(card, g, t) {
      var c = JSON.parse(JSON.stringify(card)); c.lastReview = card.last;
      if (c.st === 'new' || c.st === 'learning' || c.st === 'relearning') {
        var isRelearn = c.st === 'relearning', isNew = c.st === 'new';
        if (isNew) { c.st = 'learning'; c.step = 0; }
        if (g === 4) { if (isRelearn) { c.ivl = Math.max(1, fsrs.interval(c.stab, 0.9)); c.st = 'review'; c.step = 0; c.due = t + c.ivl * DAY; } else graduate(c, 4, t); }
        else if (g === 1) { c.step = 0; c.due = t + STEPS_MIN[0] * 60000; }
        else if (g === 2) { c.due = t + STEPS_MIN[Math.min(c.step, STEPS_MIN.length - 1)] * 60000; }
        else if (c.step + 1 < STEPS_MIN.length) { c.step++; c.due = t + STEPS_MIN[c.step] * 60000; }
        else if (isRelearn) { c.ivl = Math.max(1, fsrs.interval(c.stab, 0.9)); c.st = 'review'; c.step = 0; c.due = t + c.ivl * DAY; }
        else graduate(c, 3, t);
        return c;
      }
      var elapsed = Math.max(0, (t - (c.last || t)) / DAY);
      var ret = fsrs.retention(elapsed, c.stab);
      var nD = fsrs.nextD(c.diff || 5, g);
      var nS = fsrs.nextS(c.stab || 1, nD, ret, g);
      if (g === 1) { c.diff = nD; c.stab = nS; c.st = 'relearning'; c.step = 0; c.lapses++; c.due = t + STEPS_MIN[0] * 60000; return c; }
      c.diff = nD; c.stab = nS; c.ivl = Math.max(1, fsrs.interval(nS, 0.9)); c.st = 'review'; c.step = 0;
      c.due = t + c.ivl * DAY;
      return c;
    }
    function previewIntervals(id) {
      var c = cardIndex[id]; if (!c) return null;
      var t = nowFn(), out = {}, ivls = {};
      [1, 2, 3, 4].forEach(function (g) { var p = planRating(c, g, t); ivls[g] = p; });
      if (c.st === 'review') { // keep ordering Hard < Good < Easy (days)
        var h = ivls[2].ivl, gd = ivls[3].ivl, e = ivls[4].ivl;
        h = Math.min(h, gd); gd = Math.max(gd, h + 1); e = Math.max(e, gd + 1);
        ivls[2].ivl = h; ivls[3].ivl = gd; ivls[4].ivl = e;
        ivls[2].due = t + h * DAY; ivls[3].due = t + gd * DAY; ivls[4].due = t + e * DAY;
      }
      [1, 2, 3, 4].forEach(function (g) { out[g] = { dueAt: ivls[g].due, ms: ivls[g].due - t, days: ivls[g].st === 'review' ? ivls[g].ivl : 0, state: ivls[g].st }; });
      return out;
    }
    function trimDaily() {
      var keys = Object.keys(meta.daily).sort();
      while (keys.length > LIMITS.dailyDays) delete meta.daily[keys.shift()];
    }
    function reviewCard(id, rating, o) {
      o = o || {};
      var c = cardIndex[id]; if (!c) return err('NOT_FOUND', 'Card not found');
      var g = Number(rating); if (g !== 1 && g !== 2 && g !== 3 && g !== 4) return err('BAD_RATING', 'Rating must be 1 to 4');
      if (c.suspended) return err('SUSPENDED', 'Card is suspended');
      if (o.submissionId) {
        if (meta.submitted.indexOf(o.submissionId) >= 0) return { ok: true, duplicate: true, card: getCard(id) };
      }
      var t = nowFn();
      var plan = planRating(c, g, t);
      if (c.st === 'review') { // enforce ordering relative to other ratings
        var pv = previewIntervals(id); plan.ivl = Math.max(1, Math.round(pv[g].days)); plan.due = pv[g].dueAt;
      }
      var before = JSON.parse(JSON.stringify(c)), prevMeta = JSON.stringify({ daily: meta.daily, submitted: meta.submitted, activeSession: meta.activeSession });
      var day = dayKey(t), ms = Math.min(120000, Math.max(0, Number(o.responseMs) || 0));
      ['st', 'due', 'stab', 'diff', 'step', 'ivl', 'lapses'].forEach(function (k) { c[k] = plan[k]; });
      c.reps++; if (g >= 2) c.ok++;
      var firstToday = c.lastDay !== day;
      c.last = t; c.lastDay = day; c.flag = null;
      c.log.push({ t: t, r: g, p: before.st, n: c.st, d: c.due, ms: ms });
      if (c.log.length > LIMITS.log) c.log.splice(0, c.log.length - LIMITS.log);
      var dy = meta.daily[day] || (meta.daily[day] = { n: 0, c: 0, u: 0, ms: 0 });
      dy.n++; if (g >= 2) dy.c++; if (firstToday) dy.u++; dy.ms += ms;
      trimDaily();
      if (o.submissionId) { meta.submitted.push(o.submissionId); if (meta.submitted.length > 300) meta.submitted.splice(0, meta.submitted.length - 300); }
      var s = meta.activeSession;
      if (s && o.sessionId && s.id === o.sessionId) { s.reviewed++; if (g >= 2) s.correct++; s.ms += ms; if (s.queue[s.index] === id) s.index++; }
      var r = persist([chunkOf(c)]);
      if (!r.ok) {
        Object.keys(c).forEach(function (k) { delete c[k]; }); Object.assign(c, before);
        var pm = JSON.parse(prevMeta); meta.daily = pm.daily; meta.submitted = pm.submitted; meta.activeSession = pm.activeSession; return r;
      }
      return { ok: true, card: JSON.parse(JSON.stringify(c)), dueAt: c.due };
    }

    // ---------- queue / sessions ----------
    function buildQueue(o) {
      o = o || {};
      var t = nowFn(), limit = clampInt(o.limit, 1, 100000, 50), mode = o.mode || 'due';
      var tagSet = Array.isArray(o.tags) && o.tags.length ? o.tags.map(norm) : null;
      var learning = [], review = [], fresh = [], other = [];
      allCards().forEach(function (c) {
        if (c.suspended) return;
        if (o.deckId && c.deckId !== o.deckId) return;
        var d = deckById(c.deckId); if (!d || d.archivedAt) return;
        if (mode === 'favorites' && !c.favorite) return;
        if (mode === 'mistakes' && !(c.log.length && c.log[c.log.length - 1].r === 1)) return;
        if (mode === 'difficult' && !(c.lapses >= 3 || (c.reps >= 4 && c.ok / c.reps < 0.6))) return;
        if (tagSet && !c.tags.some(function (x) { return tagSet.indexOf(norm(x)) >= 0; })) return;
        if (o.state && c.st !== o.state) return;
        if (mode === 'due' || mode === 'quick') {
          if (c.st === 'new') { fresh.push(c); return; }
          if (c.due > t) return;
          (c.st === 'review' ? review : learning).push(c);
        } else if (mode === 'new') { if (c.st === 'new') fresh.push(c); }
        else other.push(c);
      });
      var out;
      if (mode === 'due' || mode === 'quick') {
        learning.sort(function (a, b) { return a.due - b.due; }); review.sort(function (a, b) { return a.due - b.due; }); fresh.sort(function (a, b) { return a.n - b.n; });
        if (o.dueOnly) fresh = [];
        else if (o.newLimit !== undefined) fresh = fresh.slice(0, clampInt(o.newLimit, 0, 100000, 20));
        else fresh = fresh.slice(0, 20);
        out = learning.concat(review, fresh);
      } else if (mode === 'new') { out = fresh.sort(function (a, b) { return a.n - b.n; }); }
      else {
        out = other.sort(function (a, b) { return a.n - b.n; });
        if (mode === 'random') { for (var i = out.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var x = out[i]; out[i] = out[j]; out[j] = x; } }
      }
      return out.slice(0, limit).map(function (c) { return c.id; });
    }
    function startSession(o) {
      o = o || {};
      var queue = Array.isArray(o.queue) ? o.queue.filter(function (id) { return cardIndex[id]; }) : buildQueue(o);
      var s = { id: genId('s_', function () { return false; }), startedAt: nowFn(), completedAt: 0, reviewedCount: 0, reviewed: 0, correct: 0, ms: 0, deckId: o.deckId || '', studyMode: o.studyMode || o.mode || 'due', direction: ['forward', 'reverse', 'both'].indexOf(o.direction) >= 0 ? o.direction : meta.prefs.direction, queue: queue, index: 0 };
      var prev = meta.activeSession; meta.activeSession = s;
      var r = persist([]); if (!r.ok) { meta.activeSession = prev; return r; }
      return { ok: true, session: JSON.parse(JSON.stringify(s)) };
    }
    function resumeSession() {
      var s = meta.activeSession; if (!s) return null;
      s.queue = s.queue.filter(function (id) { return cardIndex[id]; });
      s.index = Math.min(s.index, s.queue.length);
      return JSON.parse(JSON.stringify(s));
    }
    function completeSession(id) {
      var s = meta.activeSession; if (!s || (id && s.id !== id)) return err('NOT_FOUND', 'No active session');
      var done = { id: s.id, startedAt: s.startedAt, completedAt: nowFn(), reviewedCount: s.reviewed, correctCount: s.correct, incorrectCount: s.reviewed - s.correct, durationSeconds: Math.round(s.ms / 1000), deckId: s.deckId, studyMode: s.studyMode };
      var prevSessions = meta.sessions.slice();
      meta.sessions.push(done); if (meta.sessions.length > LIMITS.sessions) meta.sessions.shift();
      meta.activeSession = null;
      var r = persist([]); if (!r.ok) { meta.sessions = prevSessions; meta.activeSession = s; return r; }
      return { ok: true, session: done };
    }
    // Moves past the current card without reviewing it (used for suspended or deleted cards).
    function advanceSession(id) {
      var s = meta.activeSession; if (!s || (id && s.id !== id)) return err('NOT_FOUND', 'No active session');
      var prev = s.index; s.index = Math.min(s.queue.length, s.index + 1);
      var r = persist([]); if (!r.ok) { s.index = prev; return r; }
      return { ok: true, index: s.index };
    }
    function abandonSession() { var s = meta.activeSession; meta.activeSession = null; var r = persist([]); if (!r.ok) meta.activeSession = s; return r.ok ? { ok: true } : r; }

    // ---------- typed / choice / cloze helpers (reuse the same card data) ----------
    // A back text may hold several meanings, one per line or separated by ';'. Any of them is a correct answer.
    function answerVariants(text) {
      var v = String(text || '').split(/[\n;]+/).map(function (x) { return x.trim(); }).filter(Boolean);
      return v.length ? v : [String(text || '').trim()];
    }
    // exact: equal after case/diacritic normalisation; close: small spelling slip (<= 25 % edits); wrong otherwise.
    function checkAnswer(expectedText, typed) {
      var t = norm(typed);
      if (!t) return { result: 'wrong', expected: answerVariants(expectedText)[0] };
      var best = 1, variants = answerVariants(expectedText).concat(String(expectedText || '').trim() && answerVariants(expectedText).length > 1 ? [expectedText] : []);
      for (var i = 0; i < variants.length; i++) { var e = norm(variants[i]); if (e === t) return { result: 'exact', expected: variants[i] }; var ratio = lev(e, t) / Math.max(e.length, t.length, 1); if (ratio < best) best = ratio; }
      return { result: best <= 0.25 ? 'close' : 'wrong', expected: variants[0], distance: best };
    }
    function distractors(id, n, direction) {
      var c = cardIndex[id]; if (!c) return [];
      var key = direction === 'reverse' ? 'frontText' : 'backText', own = norm(c[key]), seen = {}, pool = [];
      seen[own] = 1;
      allCards().forEach(function (x) { if (x.id === id || x.deckId !== c.deckId) return; var k = norm(x[key]); if (!k || seen[k]) return; seen[k] = 1; pool.push(x[key]); });
      for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
      return pool.slice(0, n);
    }
    // Fill in the blank from the example sentence; null when the example does not contain the answer.
    function makeCloze(id, direction) {
      var c = cardIndex[id]; if (!c || !c.exampleText) return null;
      var answers = answerVariants(direction === 'reverse' ? c.frontText : c.frontText);
      var ex = c.exampleText, lower = ex.toLowerCase();
      for (var i = 0; i < answers.length; i++) {
        var a = answers[i], at = lower.indexOf(a.toLowerCase());
        if (a && at >= 0) return { text: ex.slice(0, at) + '_____' + ex.slice(at + a.length), answer: ex.slice(at, at + a.length) };
      }
      return null;
    }

    // ---------- search ----------
    function search(q, o) {
      o = o || {};
      var nq = norm(q), terms = nq ? nq.split(' ') : [], t = nowFn();
      var deckNames = {}; meta.decks.forEach(function (d) { deckNames[d.id] = norm(d.name); });
      var res = [];
      allCards().forEach(function (c) {
        if (o.deckId && c.deckId !== o.deckId) return;
        if (o.favorites && !c.favorite) return;
        if (o.due && !(c.st !== 'new' && c.due <= t)) return;
        if (o.difficult && !(c.lapses >= 3 || (c.reps >= 4 && c.ok / c.reps < 0.6))) return;
        if (o.state && c.st !== o.state) return;
        if (o.language) { var lg = String(o.language).toLowerCase(); if (String(c.sourceLanguage).toLowerCase().indexOf(lg) !== 0 && String(c.targetLanguage).toLowerCase().indexOf(lg) !== 0) return; }
        if (terms.length) {
          var hay = norm(c.frontText + ' ' + c.backText + ' ' + c.exampleText + ' ' + c.exampleTranslation + ' ' + c.personalNotes + ' ' + c.pronunciationNotes + ' ' + c.tags.join(' ')) + ' ' + (deckNames[c.deckId] || '');
          for (var i = 0; i < terms.length; i++) if (hay.indexOf(terms[i]) < 0) return;
        }
        res.push(c);
      });
      var by = o.sort || 'recent';
      res.sort(function (a, b) { return by === 'alpha' ? a.frontText.localeCompare(b.frontText) : by === 'due' ? (a.due || 0) - (b.due || 0) : b.createdAt - a.createdAt || b.n - a.n; });
      var total = res.length, off = clampInt(o.offset, 0, 1e9, 0), lim = clampInt(o.limit, 1, 500, 50);
      return { total: total, offset: off, items: res.slice(off, off + lim).map(function (c) { return JSON.parse(JSON.stringify(c)); }) };
    }

    // ---------- analytics ----------
    function stats() {
      var t = nowFn(), s = { total: 0, new: 0, learning: 0, review: 0, relearning: 0, suspended: 0, learned: 0, due: 0, overdue: 0, difficult: 0, favorites: 0 };
      var todayStart = new Date(t); todayStart.setHours(0, 0, 0, 0); var start = todayStart.getTime();
      allCards().forEach(function (c) {
        s.total++; if (c.favorite) s.favorites++;
        if (c.suspended) { s.suspended++; return; }
        s[c.st]++;
        if (isLearned(c)) s.learned++;
        if (c.st !== 'new' && c.due <= t) { s.due++; if (c.due < start) s.overdue++; }
        if (c.lapses >= 3 || (c.reps >= 4 && c.ok / c.reps < 0.6)) s.difficult++;
      });
      var today = meta.daily[dayKey(t)] || { n: 0, c: 0, u: 0, ms: 0 };
      var week = { n: 0, c: 0, u: 0, ms: 0 }, activeDays = 0, i;
      for (i = 0; i < 7; i++) { var d = meta.daily[dayKey(t - i * DAY)]; if (d) { week.n += d.n; week.c += d.c; week.u += d.u; week.ms += d.ms; if (d.n > 0) activeDays++; } }
      var streak = 0, cursor = t; if (!(meta.daily[dayKey(cursor)] && meta.daily[dayKey(cursor)].n > 0)) cursor -= DAY;
      while (meta.daily[dayKey(cursor)] && meta.daily[dayKey(cursor)].n > 0 && streak < 4000) { streak++; cursor -= DAY; }
      s.reviewedToday = today.n; s.uniqueToday = today.u; s.reviewedWeek = week.n; s.uniqueWeek = week.u;
      s.accuracy = week.n ? Math.round(week.c * 100 / week.n) : 0;
      s.studySecondsToday = Math.round(today.ms / 1000); s.studySecondsWeek = Math.round(week.ms / 1000);
      s.activeDaysWeek = activeDays; s.consistency = Math.round(activeDays * 100 / 7);
      s.streak = streak; s.dailyGoal = meta.prefs.dailyGoal; s.goalProgress = Math.min(100, Math.round(today.n * 100 / meta.prefs.dailyGoal));
      s.avgPerActiveDay = activeDays ? Math.round(week.n / activeDays) : 0;
      s.weekly = []; for (i = 6; i >= 0; i--) { var dd = meta.daily[dayKey(t - i * DAY)]; s.weekly.push({ day: dayKey(t - i * DAY), reviewed: dd ? dd.n : 0 }); }
      return s;
    }
    function usage() {
      var bytes = 0; [META_KEY].concat(meta.chunks.map(function (n) { return CHUNK_PREFIX + n; })).forEach(function (k) { var v = storage.getItem(k); if (v) bytes += v.length * 2; });
      return { bytes: bytes, cards: cardCount(), decks: meta.decks.length, approxQuotaBytes: 5 * 1024 * 1024 };
    }

    // ---------- CSV / TSV / JSON ----------
    function parseDelimited(text, delim) {
      var rows = [], row = [], field = '', inQ = false, i = 0, n = text.length;
      if (text.charCodeAt(0) === 0xFEFF) i = 1;
      for (; i < n; i++) {
        var ch = text[i];
        if (inQ) {
          if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; } else field += ch;
        } else if (ch === '"' && field === '') inQ = true;
        else if (ch === delim) { row.push(field); field = ''; }
        else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(field); field = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = []; if (rows.length > LIMITS.importRows + 1) break; }
        else field += ch;
      }
      if (field !== '' || row.length) { row.push(field); if (row.length > 1 || row[0] !== '') rows.push(row); }
      return rows;
    }
    function detectDelimiter(text) {
      var first = text.split(/\r?\n/, 1)[0] || '', best = ',', score = -1;
      [',', '\t', ';'].forEach(function (d) { var c = first.split(d).length; if (c > score) { score = c; best = d; } });
      return best;
    }
    var IMPORT_FIELDS = ['frontText', 'backText', 'sourceLanguage', 'targetLanguage', 'exampleText', 'exampleTranslation', 'personalNotes', 'tags'];
    function parseImport(text, format) {
      if (typeof text !== 'string') return err('BAD_INPUT', 'Import must be text');
      if (text.length * 2 > LIMITS.importBytes) return err('TOO_LARGE', 'Import is too large');
      format = format || (/^\s*[\[{]/.test(text) ? 'json' : 'csv');
      try {
        if (format === 'json') {
          var j = JSON.parse(text, function (k, v) { return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v; });
          var list = Array.isArray(j) ? j : (j && Array.isArray(j.cards) ? j.cards : null);
          if (!list) return err('BAD_FORMAT', 'JSON must be a list of cards or {cards:[...]}');
          if (list.length > LIMITS.importRows) return err('TOO_MANY_ROWS', 'Too many rows');
          var rowsJ = list.map(function (x) { return x && typeof x === 'object' ? x : {}; });
          return { ok: true, headers: IMPORT_FIELDS, rows: rowsJ.map(function (x) { return IMPORT_FIELDS.map(function (f) { var v = x[f]; return Array.isArray(v) ? v.join(',') : (v == null ? '' : String(v)); }); }), format: 'json' };
        }
        var delim = format === 'tsv' ? '\t' : detectDelimiter(text);
        var rows = parseDelimited(text, delim);
        if (!rows.length) return err('EMPTY', 'No rows found');
        if (rows.length > LIMITS.importRows + 1) return err('TOO_MANY_ROWS', 'Too many rows');
        return { ok: true, headers: rows[0], rows: rows.slice(1), format: format, delimiter: delim };
      } catch (e) { return err('PARSE_ERROR', 'Could not parse the file'); }
    }
    function guessMapping(headers) {
      var alias = { frontText: ['front', 'original', 'word', 'term', 'question', 'frontText'], backText: ['back', 'translation', 'answer', 'definition', 'meaning', 'backText'], sourceLanguage: ['sourcelanguage', 'source', 'from', 'sourceLanguage'], targetLanguage: ['targetlanguage', 'target', 'to', 'targetLanguage'], exampleText: ['example', 'sentence', 'exampleText'], exampleTranslation: ['exampletranslation', 'exampleTranslation'], personalNotes: ['notes', 'note', 'personalNotes'], tags: ['tags', 'tag'] };
      var m = {};
      headers.forEach(function (h, i) { var k = norm(h).replace(/[\s_-]/g, ''); IMPORT_FIELDS.forEach(function (f) { if (m[f] === undefined && alias[f].some(function (a) { return a.toLowerCase() === k; })) m[f] = i; }); });
      if (m.frontText === undefined && headers.length >= 2) { m.frontText = 0; m.backText = m.backText === undefined ? 1 : m.backText; }
      return m;
    }
    function previewImport(parsed, mapping, o) {
      o = o || {};
      if (!parsed || !parsed.ok) return parsed || err('BAD_INPUT', 'Nothing to import');
      var deckId = o.deckId; if (!deckById(deckId)) return err('DECK_REQUIRED', 'Choose a deck');
      var existing = Object.create(null); allCards().forEach(function (c) { if (c.deckId === deckId) existing[norm(c.frontText)] = 1; });
      var seen = Object.create(null), out = { ok: true, records: [], invalid: [], duplicates: 0, total: parsed.rows.length };
      parsed.rows.forEach(function (row, idx) {
        var f = {}; IMPORT_FIELDS.forEach(function (name) { var col = mapping[name]; if (col !== undefined && col !== null && col >= 0) f[name] = row[col] == null ? '' : String(row[col]); });
        var v = validateContent(f, false);
        if (!v.ok) { out.invalid.push({ row: idx + 2, reason: v.code }); return; }
        var k = norm(v.value.frontText), dup = !!(existing[k] || seen[k]); seen[k] = 1; if (dup) out.duplicates++;
        out.records.push({ row: idx + 2, content: v.value, duplicate: dup });
      });
      return out;
    }
    // Transactional: builds all cards in memory, writes dirty chunks once per batch, rolls everything back on failure.
    function commitImport(preview, o) {
      o = o || {};
      if (!preview || !preview.ok) return preview || err('BAD_INPUT', 'Nothing to import');
      var skipDup = o.skipDuplicates !== false, deckId = o.deckId;
      if (!deckById(deckId)) return err('DECK_REQUIRED', 'Choose a deck');
      var sel = o.selected ? Object.create(null) : null; if (sel) o.selected.forEach(function (r) { sel[r] = 1; });
      var recs = preview.records.filter(function (r) { return (!skipDup || !r.duplicate) && (!sel || sel[r.row]); });
      if (cardCount() + recs.length > LIMITS.cards) return err('LIMIT', 'Import would exceed the card limit');
      var prevSeq = meta.nextSeq, prevChunks = meta.chunks.slice();
      var snapshot = {}; var affected = {};
      var cards = recs.map(function (r) { return newCardRecord(r.content, deckId); });
      cards.forEach(function (c) { affected[chunkOf(c)] = 1; });
      Object.keys(affected).forEach(function (n) { snapshot[n] = chunks[n] ? chunks[n].slice() : null; });
      var metaBefore = storage.getItem(META_KEY), keysBefore = {}; Object.keys(affected).forEach(function (n) { keysBefore[n] = storage.getItem(CHUNK_PREFIX + n); });
      cards.forEach(function (c) { var n = chunkOf(c); if (!chunks[n]) chunks[n] = []; chunks[n].push(c); cardIndex[c.id] = c; });
      var r = persist(Object.keys(affected).map(Number));
      if (!r.ok) {
        cards.forEach(function (c) { delete cardIndex[c.id]; });
        Object.keys(snapshot).forEach(function (n) { if (snapshot[n]) chunks[n] = snapshot[n]; else delete chunks[n]; });
        meta.chunks = prevChunks; meta.nextSeq = prevSeq;
        return r;
      }
      if (typeof o.onProgress === 'function') o.onProgress(cards.length, cards.length);
      return { ok: true, imported: cards.length, skipped: preview.records.length - cards.length, invalid: preview.invalid.length };
    }
    // A cell is dangerous when, after skipping whitespace/control/invisible characters, it starts with = + - @.
    // Plain signed numbers (-5, -3.14, +2) stay readable; anything else with a leading - or + is guarded.
    function needsFormulaGuard(v) {
      var t = v.replace(/^[\s\u0000-\u001f\u007f\u00a0\u200b-\u200f\u2028\u2029\ufeff]+/, '');
      if (!t) return false;
      var c = t.charAt(0);
      if (c === '=' || c === '@') return true;
      if (c === '+' || c === '-') return !/^[+-]?\d+([.,]\d+)?$/.test(t) || t !== v;
      return /^[\t\r]/.test(v);
    }
    function csvCell(v, safe) {
      v = String(v == null ? '' : v);
      if (safe && needsFormulaGuard(v)) v = "'" + v;
      return /[",\r\n\t]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    }
    function exportCsv(o) {
      o = o || {};
      var cols = ['deck', 'front', 'back', 'sourceLanguage', 'targetLanguage', 'example', 'exampleTranslation', 'notes', 'tags', 'state', 'due'];
      var names = {}; meta.decks.forEach(function (d) { names[d.id] = d.name; });
      var lines = [cols.join(',')];
      allCards().forEach(function (c) {
        if (o.deckId && c.deckId !== o.deckId) return;
        lines.push([names[c.deckId] || '', c.frontText, c.backText, c.sourceLanguage, c.targetLanguage, c.exampleText, c.exampleTranslation, c.personalNotes, c.tags.join(';'), c.st, c.due ? dayKey(c.due) : ''].map(function (v) { return csvCell(v, o.spreadsheetSafe !== false); }).join(','));
      });
      return lines.join('\r\n');
    }

    // ---------- snapshot (backup) ----------
    function exportSnapshot() { return { schema: SCHEMA, decks: JSON.parse(JSON.stringify(meta.decks)), cards: allCards().map(function (c) { return JSON.parse(JSON.stringify(c)); }), prefs: getPrefs(), sessions: meta.sessions.slice(), daily: JSON.parse(JSON.stringify(meta.daily)), nextSeq: meta.nextSeq }; }
    function validateSnapshot(s) {
      if (!s || typeof s !== 'object' || Array.isArray(s)) return err('BAD_SNAPSHOT', 'Invalid flashcards backup');
      if (Number(s.schema) > SCHEMA) return err('TOO_NEW', 'Flashcards backup is from a newer app version');
      if (!Array.isArray(s.decks) || !Array.isArray(s.cards)) return err('BAD_SNAPSHOT', 'Invalid flashcards backup');
      if (s.cards.length > LIMITS.cards || s.decks.length > LIMITS.decks) return err('TOO_LARGE', 'Flashcards backup is too large');
      var deckIds = Object.create(null), decks = [];
      for (var i = 0; i < s.decks.length; i++) {
        var d = s.decks[i]; if (!d || typeof d.id !== 'string' || deckIds[d.id]) return err('BAD_SNAPSHOT', 'Invalid or duplicate deck id');
        deckIds[d.id] = 1;
        var cd = cleanDeckFields(d, { description: '', color: '#111827', icon: 'book' }); if (!cd.name) return err('BAD_SNAPSHOT', 'Deck without a name');
        cd.id = str(d.id, 60); cd.createdAt = Number(d.createdAt) || 0; cd.updatedAt = Number(d.updatedAt) || 0; cd.archivedAt = d.archivedAt ? Number(d.archivedAt) || 0 : null; cd.sortOrder = clampInt(d.sortOrder, 0, 1e6, i);
        decks.push(cd);
      }
      var ids = Object.create(null), cards = [], seqUsed = Object.create(null), maxSeq = -1;
      for (var j = 0; j < s.cards.length; j++) {
        var c = s.cards[j]; if (!c || typeof c.id !== 'string' || ids[c.id]) return err('BAD_SNAPSHOT', 'Invalid or duplicate card id');
        if (!deckIds[c.deckId]) return err('BAD_SNAPSHOT', 'Card references an unknown deck');
        var v = validateContent(c, false); if (!v.ok) return err('BAD_SNAPSHOT', 'Invalid card content: ' + v.code);
        if (STATES.indexOf(c.st) < 0) return err('BAD_SNAPSHOT', 'Invalid card state');
        ids[c.id] = 1;
        var rec = Object.assign({ cardType: 'word', sourceLanguage: '', targetLanguage: '', exampleText: '', exampleTranslation: '', pronunciationNotes: '', personalNotes: '', tags: [], favorite: false }, v.value);
        rec.id = str(c.id, 60); rec.deckId = c.deckId;
        rec.n = clampInt(c.n, 0, 1e9, j); if (seqUsed[rec.n]) rec.n = Math.max(maxSeq + 1, rec.n); seqUsed[rec.n] = 1; if (rec.n > maxSeq) maxSeq = rec.n;
        rec.createdAt = Number(c.createdAt) || 0; rec.updatedAt = Number(c.updatedAt) || 0;
        rec.st = c.st; rec.due = Math.max(0, Number(c.due) || 0); rec.stab = Math.max(0, Number(c.stab) || 0); rec.diff = Math.min(10, Math.max(0, Number(c.diff) || 0));
        rec.step = clampInt(c.step, 0, 5, 0); rec.ivl = clampInt(c.ivl, 0, 36500, 0); rec.reps = clampInt(c.reps, 0, 1e7, 0); rec.ok = clampInt(c.ok, 0, 1e7, 0); rec.lapses = clampInt(c.lapses, 0, 1e7, 0);
        rec.last = Math.max(0, Number(c.last) || 0); rec.lastDay = typeof c.lastDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.lastDay) ? c.lastDay : '';
        rec.suspended = c.suspended === true; rec.flag = c.flag && c.flag.type === 'content_changed' ? { type: 'content_changed', at: Number(c.flag.at) || 0, reason: str(c.flag.reason, 200) } : null;
        rec.log = (Array.isArray(c.log) ? c.log : []).slice(-LIMITS.log).map(function (e) { return { t: Number(e && e.t) || 0, r: clampInt(e && e.r, 1, 4, 3), p: STATES.indexOf(e && e.p) >= 0 ? e.p : 'new', n: STATES.indexOf(e && e.n) >= 0 ? e.n : 'new', d: Number(e && e.d) || 0, ms: clampInt(e && e.ms, 0, 120000, 0) }; });
        cards.push(rec);
      }
      var daily = {}; if (s.daily && typeof s.daily === 'object') Object.keys(s.daily).slice(0, LIMITS.dailyDays).forEach(function (k) { if (/^\d{4}-\d{2}-\d{2}$/.test(k)) { var e = s.daily[k] || {}; daily[k] = { n: clampInt(e.n, 0, 1e6, 0), c: clampInt(e.c, 0, 1e6, 0), u: clampInt(e.u, 0, 1e6, 0), ms: clampInt(e.ms, 0, 1e9, 0) }; } });
      var sessions = (Array.isArray(s.sessions) ? s.sessions : []).slice(-LIMITS.sessions).filter(function (x) { return x && typeof x.id === 'string'; }).map(function (x) { return { id: str(x.id, 60), startedAt: Number(x.startedAt) || 0, completedAt: Number(x.completedAt) || 0, reviewedCount: clampInt(x.reviewedCount, 0, 1e6, 0), correctCount: clampInt(x.correctCount, 0, 1e6, 0), incorrectCount: clampInt(x.incorrectCount, 0, 1e6, 0), durationSeconds: clampInt(x.durationSeconds, 0, 1e7, 0), deckId: str(x.deckId, 60), studyMode: str(x.studyMode, 20) }; });
      return { ok: true, value: { decks: decks, cards: cards, prefs: sanitizePrefs(s.prefs), daily: daily, sessions: sessions, nextSeq: Math.max(maxSeq + 1, clampInt(s.nextSeq, 0, 1e9, 0)) } };
    }
    // mode 'replace' replaces everything; 'merge' adds decks/cards whose ids are not present.
    function importSnapshot(s, o) {
      o = o || {};
      var v = validateSnapshot(s); if (!v.ok) return v;
      var snap = v.value, backup = { meta: storage.getItem(META_KEY), chunkKeys: {}, memMeta: meta, memChunks: chunks, memIndex: cardIndex };
      meta.chunks.forEach(function (n) { backup.chunkKeys[n] = storage.getItem(CHUNK_PREFIX + n); });
      var oldChunkList = meta.chunks.slice();
      try {
        var next = (o.mode === 'merge') ? meta : freshMeta();
        var nextChunks = (o.mode === 'merge') ? chunks : {};
        var nextIndex = (o.mode === 'merge') ? cardIndex : Object.create(null);
        if (o.mode !== 'merge') { next.migrated = meta.migrated; }
        var deckSeen = Object.create(null); next.decks.forEach(function (d) { deckSeen[d.id] = 1; });
        snap.decks.forEach(function (d) { if (!deckSeen[d.id]) next.decks.push(d); });
        var dirty = {};
        snap.cards.forEach(function (c) {
          if (nextIndex[c.id]) return;
          c.n = next.nextSeq++; var n = Math.floor(c.n / CHUNK_SIZE);
          if (!nextChunks[n]) nextChunks[n] = []; nextChunks[n].push(c); nextIndex[c.id] = c; dirty[n] = 1;
        });
        if (o.mode !== 'merge') { next.prefs = snap.prefs; next.daily = snap.daily; next.sessions = snap.sessions; }
        meta = next; chunks = nextChunks; cardIndex = nextIndex;
        var r = persist(Object.keys(dirty).map(Number));
        if (!r.ok) throw new Error('persist');
        oldChunkList.forEach(function (n) { if (meta.chunks.indexOf(n) < 0) { try { storage.removeItem(CHUNK_PREFIX + n); } catch (_) {} } });
        return { ok: true, decks: snap.decks.length, cards: snap.cards.length };
      } catch (e) {
        meta = backup.memMeta; chunks = backup.memChunks; cardIndex = backup.memIndex;
        try {
          if (backup.meta == null) storage.removeItem(META_KEY); else storage.setItem(META_KEY, backup.meta);
          Object.keys(backup.chunkKeys).forEach(function (n) { if (backup.chunkKeys[n] == null) storage.removeItem(CHUNK_PREFIX + n); else storage.setItem(CHUNK_PREFIX + n, backup.chunkKeys[n]); });
        } catch (_) {}
        load();
        return err('RESTORE_FAILED', 'Restore failed; existing flashcards were kept.');
      }
    }

    // ---------- legacy migration (read-only on legacy keys) ----------
    function migrateLegacy(opts) {
      var rescan = !!(opts && opts.rescan), found = [], moved = 0;
      LEGACY_KEYS.forEach(function (key) {
        if (meta.migrated[key] && !rescan) return;
        var raw = storage.getItem(key); if (raw == null) return;
        var arr; try { arr = JSON.parse(raw); } catch (_) { meta.migrated[key] = 'unreadable'; return; }
        if (!Array.isArray(arr)) { meta.migrated[key] = 'not-a-list'; return; }
        found.push({ key: key, items: arr });
      });
      if (!found.length) { return { ok: true, migrated: 0 }; }
      var deck = null, items = [];
      found.forEach(function (f) {
        f.items.slice(0, LIMITS.cards).forEach(function (x) {
          if (!x || typeof x !== 'object') return;
          // Cards auto-derived from the sample Tri-Zone note (ids "fc_...") and starter/sample items are not user data.
          if (typeof x.id === 'string' && /^fc_/.test(x.id)) return;
          if (x.isStarter === true || x.sample === true || x.isSample === true) return;
          var front = x.frontText || x.front || x.word || x.term || x.original || x.q || x.question || x.text;
          var back = x.backText || x.back || x.translation || x.meaning || x.definition || x.a || x.answer;
          if (typeof front !== 'string' || typeof back !== 'string') return;
          var v = validateContent({ frontText: front, backText: back, exampleText: typeof x.example === 'string' ? x.example : '', tags: x.tags }, false);
          if (!v.ok) return;
          items.push({ content: v.value, legacy: { stab: Number(x.stability || x.s), reps: Number(x.reps) } });
        });
      });
      if (items.length) {
        var seen = Object.create(null), cards = [];
        // Restoring an older backup re-reads the legacy keys: cards that already exist anywhere are never added twice.
        if (rescan) allCards().forEach(function (c0) { seen[norm(c0.frontText) + '|' + norm(c0.backText)] = 1; });
        var fresh = items.filter(function (it) { return !seen[norm(it.content.frontText) + '|' + norm(it.content.backText)]; });
        if (!fresh.length) { found.forEach(function (f) { meta.migrated[f.key] = 'done'; }); persist([]); return { ok: true, migrated: 0 }; }
        var existing = rescan ? meta.decks.filter(function (d) { return d.name === 'Imported' && !d.archived; })[0] : null;
        var made = existing ? { ok: true, deck: existing } : createDeck({ name: 'Imported', description: 'Cards found from earlier versions' });
        if (!made.ok) return made; deck = made.deck;
        items.forEach(function (it) { var k = norm(it.content.frontText) + '|' + norm(it.content.backText); if (seen[k]) return; seen[k] = 1; cards.push(newCardRecord(it.content, deck.id)); });
        var r = commitNewCards(cards); if (!r.ok) { if (!existing) deleteDeck(deck.id); return r; }
        moved = cards.length;
      }
      found.forEach(function (f) { meta.migrated[f.key] = 'done'; });
      persist([]);
      return { ok: true, migrated: moved };
    }

    load();
    return {
      SCHEMA: SCHEMA, LIMITS: LIMITS, SPEECH_RATES: SPEECH_RATES, STEPS_MIN: STEPS_MIN, CARD_TYPES: CARD_TYPES, ICONS: ICONS,
      warnings: function () { return warnings.slice(); }, reload: load,
      createDeck: createDeck, updateDeck: updateDeck, archiveDeck: archiveDeck, restoreDeck: restoreDeck, deleteDeck: deleteDeck, duplicateDeck: duplicateDeck, listDecks: listDecks, deckStats: deckStats,
      addCard: addCard, getCard: getCard, updateCard: updateCard, moveCard: moveCard, deleteCard: deleteCard, setSuspended: setSuspended, toggleFavorite: toggleFavorite, undo: undo, findDuplicates: function (f, d) { return findDuplicates(f, d).map(function (c) { return c.id; }); },
      reviewCard: reviewCard, previewIntervals: previewIntervals, buildQueue: buildQueue, startSession: startSession, resumeSession: resumeSession, completeSession: completeSession, abandonSession: abandonSession, advanceSession: advanceSession,
      search: search, checkAnswer: checkAnswer, answerVariants: answerVariants, distractors: distractors, makeCloze: makeCloze, stats: stats, usage: usage, getPrefs: getPrefs, setPrefs: setPrefs,
      parseImport: parseImport, guessMapping: guessMapping, previewImport: previewImport, commitImport: commitImport, exportCsv: exportCsv,
      exportSnapshot: exportSnapshot, validateSnapshot: validateSnapshot, importSnapshot: importSnapshot, migrateLegacy: migrateLegacy,
      util: { norm: norm, changeRatio: changeRatio, validLang: validLang, dayKey: dayKey }
    };
  }

  return { create: create, util: { norm: norm, validLang: validLang } };
}));
