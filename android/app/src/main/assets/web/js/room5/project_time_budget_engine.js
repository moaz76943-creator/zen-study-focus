/**
 * DEEP FOCUS — Room5 Project Time Budget Engine
 * Schema-versioned, offline, deterministic minute budgeting for a project,
 * measured and projected only from the actual sessions that are provided.
 *
 * Pure module: CommonJS export, zero networking, zero persistence,
 * no timers, no randomness, no external dependencies.
 */
(function (global) {
  'use strict';

  var SCHEMA_VERSION = 1;
  var LEGACY_SCHEMA_VERSION = 0;

  var CATEGORIES = Object.freeze(['focus', 'admin', 'review', 'meeting']);

  var BUDGET_FIELDS = ['id', 'name', 'budgetMinutes', 'sessions', 'notes', 'tags'];

  var LIMITS = {
    idPattern: /^[A-Za-z0-9_-]{1,64}$/,
    nameMax: 60,
    labelMax: 60,
    noteMax: 200,
    notesMax: 280,
    tagsMax: 6,
    tagMaxLen: 24,
    budgetMinutesMin: 1,
    budgetMinutesMax: 200000,
    sessionMinutesMin: 1,
    sessionMinutesMax: 1440,
    sessionsMax: 500,
    weightMax: 1000000000
  };

  var PROJECT_DEFAULTS = Object.freeze({
    budgetMinutes: 600,
    category: 'focus',
    notes: '',
    tags: Object.freeze([]),
    sessions: Object.freeze([])
  });

  var SESSION_DEFAULTS = Object.freeze({
    minutes: 30,
    category: PROJECT_DEFAULTS.category,
    note: ''
  });

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  function fail(code, field, message) {
    return { ok: false, errors: [{ code: code, field: field, message: message }] };
  }

  function errorList(pairs) {
    var errors = [];
    for (var i = 0; i < pairs.length; i++) {
      errors.push({ code: pairs[i][0], field: pairs[i][1], message: pairs[i][2] });
    }
    return { ok: false, errors: errors };
  }

  function text(value, maxLen) {
    var raw = '';
    if (typeof value === 'string') raw = value;
    else if (typeof value === 'number' && isFinite(value)) raw = String(value);
    else return '';
    return raw.trim().slice(0, maxLen);
  }

  function numberOr(value, fallback) {
    var n = NaN;
    if (typeof value === 'number') n = value;
    else if (typeof value === 'string' && value.trim() !== '') n = Number(value);
    if (!isFinite(n)) return fallback;
    return n;
  }

  function clampInt(value, min, max, fallback) {
    var n = Math.round(numberOr(value, fallback));
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  function round2(value) {
    return Math.round(value * 100) / 100;
  }

  function normalizeCategory(value, fallback) {
    if (typeof value !== 'string') return fallback;
    var key = value.trim().toLowerCase();
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i] === key) return key;
    }
    return fallback;
  }

  function normalizeTags(value) {
    if (!Array.isArray(value)) return [];
    var picked = [];
    for (var i = 0; i < value.length && picked.length < LIMITS.tagsMax; i++) {
      if (typeof value[i] !== 'string') continue;
      var tag = value[i].trim().slice(0, LIMITS.tagMaxLen);
      if (!tag) continue;
      if (picked.indexOf(tag) === -1) picked.push(tag);
    }
    return picked;
  }

  function hashSeed(seed) {
    var input = String(seed === undefined || seed === null ? '' : seed);
    var hash = 0x811c9dc5;
    for (var i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return ('00000000' + hash.toString(16)).slice(-8);
  }

  function deriveBudgetId(seed) {
    return 'pb_' + hashSeed(seed);
  }

  function deriveSessionId(seed) {
    return 'pbs_' + hashSeed(seed);
  }

  function budgetSeed(name, budgetMinutes, sessions) {
    var parts = [];
    for (var i = 0; i < sessions.length; i++) {
      parts.push(sessions[i].label + ':' + sessions[i].minutes + ':' + sessions[i].category + ':' + sessions[i].id);
    }
    return name + '|' + budgetMinutes + '|' + parts.join(',');
  }

  function copyKnown(target, source, fields) {
    if (!isRecord(source)) return target;
    for (var i = 0; i < fields.length; i++) {
      var key = fields[i];
      if (key === '__proto__' || !hasOwn(source, key)) continue;
      target[key] = source[key];
    }
    return target;
  }

  function normalizeSession(input, index) {
    if (!isRecord(input)) return null;
    var label = text(input.label, LIMITS.labelMax);
    if (!label) return null;
    var minutes = clampInt(input.minutes, LIMITS.sessionMinutesMin, LIMITS.sessionMinutesMax, SESSION_DEFAULTS.minutes);
    var category = normalizeCategory(input.category, PROJECT_DEFAULTS.category);
    var id = typeof input.id === 'string' ? input.id.trim() : '';
    if (!LIMITS.idPattern.test(id)) {
      id = deriveSessionId(label + '|' + minutes + '|' + category + '|' + index);
    }
    return {
      id: id,
      label: label,
      minutes: minutes,
      category: category,
      note: typeof input.note === 'string' ? input.note.trim().slice(0, LIMITS.noteMax) : ''
    };
  }

  function normalizeSessions(value) {
    if (!Array.isArray(value)) return [];
    var picked = [];
    for (var i = 0; i < value.length && picked.length < LIMITS.sessionsMax; i++) {
      var session = normalizeSession(value[i], i);
      if (session) picked.push(session);
    }
    return picked;
  }

  function normalizeBudget(input) {
    if (!isRecord(input)) return null;
    var name = text(input.name, LIMITS.nameMax);
    if (!name) return null;
    if (input.sessions !== undefined && !Array.isArray(input.sessions)) return null;
    var budgetMinutes = clampInt(
      input.budgetMinutes,
      LIMITS.budgetMinutesMin,
      LIMITS.budgetMinutesMax,
      PROJECT_DEFAULTS.budgetMinutes
    );
    var sessions = normalizeSessions(input.sessions);
    var id = typeof input.id === 'string' ? input.id.trim() : '';
    if (!LIMITS.idPattern.test(id)) {
      id = deriveBudgetId(budgetSeed(name, budgetMinutes, sessions));
    }
    return {
      id: id,
      name: name,
      budgetMinutes: budgetMinutes,
      sessions: sessions,
      notes: typeof input.notes === 'string' ? input.notes.trim().slice(0, LIMITS.notesMax) : '',
      tags: normalizeTags(input.tags)
    };
  }

  function budgetErrors(input) {
    var errors = validateBudget(input).errors;
    if (!errors.length) {
      errors.push({ code: 'BUDGET_INVALID', field: 'budget', message: 'Budget could not be normalized.' });
    }
    return { ok: false, errors: errors };
  }

  function finishBudget(raw) {
    var normalized = normalizeBudget(raw);
    if (!normalized) return budgetErrors(raw);
    return { ok: true, budget: normalized };
  }

  function createBudget(spec) {
    if (!isRecord(spec)) {
      return fail('INPUT_NOT_OBJECT', 'spec', 'Budget specification must be a plain object.');
    }
    var raw = {
      id: '',
      name: '',
      budgetMinutes: PROJECT_DEFAULTS.budgetMinutes,
      sessions: [],
      notes: PROJECT_DEFAULTS.notes,
      tags: []
    };
    copyKnown(raw, spec, BUDGET_FIELDS);
    return finishBudget(raw);
  }

  function addSession(budget, session) {
    if (!isRecord(budget)) {
      return fail('BUDGET_NOT_OBJECT', 'budget', 'Budget must be a plain object.');
    }
    if (!isRecord(session)) {
      return fail('SESSION_NOT_OBJECT', 'session', 'Session must be a plain object.');
    }
    var base = normalizeBudget(budget);
    if (!base) return budgetErrors(budget);
    if (base.sessions.length >= LIMITS.sessionsMax) {
      return fail(
        'SESSION_LIMIT',
        'sessions',
        'At most ' + LIMITS.sessionsMax + ' sessions can be tracked in one budget.'
      );
    }
    var value = normalizeSession(session, base.sessions.length);
    if (!value) {
      return fail('SESSION_INVALID', 'session', 'Session must have a non-empty label.');
    }
    for (var i = 0; i < base.sessions.length; i++) {
      if (base.sessions[i].id === value.id) {
        return fail('SESSION_DUPLICATE_ID', 'session', 'Session id already exists: ' + value.id + '.');
      }
    }
    var sessions = base.sessions.slice();
    sessions.push(value);
    return finishBudget({
      id: base.id,
      name: base.name,
      budgetMinutes: base.budgetMinutes,
      sessions: sessions,
      notes: base.notes,
      tags: base.tags
    });
  }

  function removeSession(budget, sessionId) {
    if (!isRecord(budget)) {
      return fail('BUDGET_NOT_OBJECT', 'budget', 'Budget must be a plain object.');
    }
    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      return fail('SESSION_ID_INVALID', 'sessionId', 'Session id must be a non-empty string.');
    }
    var base = normalizeBudget(budget);
    if (!base) return budgetErrors(budget);
    var key = sessionId.trim();
    var index = -1;
    for (var i = 0; i < base.sessions.length; i++) {
      if (base.sessions[i].id === key) {
        index = i;
        break;
      }
    }
    if (index === -1) {
      return fail('SESSION_NOT_FOUND', 'sessionId', 'No session with id: ' + key + '.');
    }
    var sessions = base.sessions.slice();
    sessions.splice(index, 1);
    return finishBudget({
      id: base.id,
      name: base.name,
      budgetMinutes: base.budgetMinutes,
      sessions: sessions,
      notes: base.notes,
      tags: base.tags
    });
  }

  function validateSessionEntry(session, position, errors) {
    function add(code, message) {
      errors.push({ code: code, field: 'sessions', message: message });
    }
    if (!isRecord(session)) {
      add('SESSION_NOT_OBJECT', 'Session at position ' + position + ' must be a plain object.');
      return;
    }
    if (
      session.id !== undefined &&
      session.id !== '' &&
      (typeof session.id !== 'string' || !LIMITS.idPattern.test(session.id))
    ) {
      add('SESSION_ID_INVALID', 'Session at position ' + position + ' has an invalid id.');
    }
    if (typeof session.label !== 'string' || !session.label.trim()) {
      add('SESSION_LABEL_REQUIRED', 'Session at position ' + position + ' requires a label.');
    } else if (session.label.trim().length > LIMITS.labelMax) {
      add(
        'SESSION_LABEL_TOO_LONG',
        'Session at position ' + position + ' label must be at most ' + LIMITS.labelMax + ' characters.'
      );
    }
    if (
      !Number.isInteger(session.minutes) ||
      session.minutes < LIMITS.sessionMinutesMin ||
      session.minutes > LIMITS.sessionMinutesMax
    ) {
      add(
        'SESSION_MINUTES_RANGE',
        'Session at position ' +
          position +
          ' minutes must be an integer between ' +
          LIMITS.sessionMinutesMin +
          ' and ' +
          LIMITS.sessionMinutesMax +
          '.'
      );
    }
    if (
      session.category !== undefined &&
      (typeof session.category !== 'string' || CATEGORIES.indexOf(session.category.trim().toLowerCase()) === -1)
    ) {
      add('SESSION_CATEGORY_INVALID', 'Session at position ' + position + ' uses an unknown category.');
    }
    if (session.note !== undefined && typeof session.note !== 'string') {
      add('SESSION_NOTE_INVALID', 'Session at position ' + position + ' note must be a string.');
    } else if (typeof session.note === 'string' && session.note.length > LIMITS.noteMax) {
      add(
        'SESSION_NOTE_TOO_LONG',
        'Session at position ' + position + ' note must be at most ' + LIMITS.noteMax + ' characters.'
      );
    }
  }

  function validateBudget(input) {
    if (!isRecord(input)) {
      return errorList([['INPUT_NOT_OBJECT', 'budget', 'Budget must be a plain object.']]);
    }
    var errors = [];

    function add(code, field, message) {
      errors.push({ code: code, field: field, message: message });
    }

    if (
      input.id !== undefined &&
      input.id !== '' &&
      (typeof input.id !== 'string' || !LIMITS.idPattern.test(input.id))
    ) {
      add('ID_INVALID', 'id', 'Budget id must match ' + LIMITS.idPattern.source + '.');
    }
    if (typeof input.name !== 'string' || !input.name.trim()) {
      add('NAME_REQUIRED', 'name', 'Budget name is required.');
    } else if (input.name.trim().length > LIMITS.nameMax) {
      add('NAME_TOO_LONG', 'name', 'Budget name must be at most ' + LIMITS.nameMax + ' characters.');
    }

    if (input.budgetMinutes !== undefined) {
      if (!Number.isInteger(input.budgetMinutes)) {
        add('BUDGET_MINUTES_INVALID', 'budgetMinutes', 'Budget minutes must be an integer.');
      } else if (input.budgetMinutes < LIMITS.budgetMinutesMin || input.budgetMinutes > LIMITS.budgetMinutesMax) {
        add(
          'BUDGET_MINUTES_RANGE',
          'budgetMinutes',
          'Budget minutes must be an integer between ' +
            LIMITS.budgetMinutesMin +
            ' and ' +
            LIMITS.budgetMinutesMax +
            '.'
        );
      }
    }

    if (input.sessions !== undefined && !Array.isArray(input.sessions)) {
      add('SESSIONS_INVALID', 'sessions', 'Sessions must be an array of session objects.');
    } else if (Array.isArray(input.sessions)) {
      if (input.sessions.length > LIMITS.sessionsMax) {
        add('SESSIONS_LIMIT', 'sessions', 'At most ' + LIMITS.sessionsMax + ' sessions are allowed.');
      }
      var seenIds = [];
      for (var i = 0; i < input.sessions.length; i++) {
        var entry = input.sessions[i];
        validateSessionEntry(entry, i, errors);
        if (isRecord(entry) && typeof entry.id === 'string' && LIMITS.idPattern.test(entry.id)) {
          if (seenIds.indexOf(entry.id) !== -1) {
            add('SESSION_DUPLICATE_ID', 'sessions', 'Duplicate session id: ' + entry.id + '.');
          } else {
            seenIds.push(entry.id);
          }
        }
      }
    }

    if (input.notes !== undefined && typeof input.notes !== 'string') {
      add('NOTES_INVALID', 'notes', 'Notes must be a string.');
    } else if (typeof input.notes === 'string' && input.notes.length > LIMITS.notesMax) {
      add('NOTES_TOO_LONG', 'notes', 'Notes must be at most ' + LIMITS.notesMax + ' characters.');
    }

    if (input.tags !== undefined && !Array.isArray(input.tags)) {
      add('TAGS_INVALID', 'tags', 'Tags must be an array of strings.');
    } else if (Array.isArray(input.tags)) {
      if (input.tags.length > LIMITS.tagsMax) {
        add('TAGS_LIMIT', 'tags', 'At most ' + LIMITS.tagsMax + ' tags are allowed.');
      }
      var seenTags = [];
      for (var t = 0; t < input.tags.length; t++) {
        var tag = input.tags[t];
        if (typeof tag !== 'string' || !tag.trim()) {
          add('TAGS_INVALID', 'tags', 'Tag at position ' + t + ' must be a non-empty string.');
          continue;
        }
        if (tag.trim().length > LIMITS.tagMaxLen) {
          add('TAGS_INVALID', 'tags', 'Tag at position ' + t + ' must be at most ' + LIMITS.tagMaxLen + ' characters.');
        }
        var key = tag.trim();
        if (seenTags.indexOf(key) !== -1) {
          add('TAGS_DUPLICATE', 'tags', 'Duplicate tag: ' + key + '.');
        } else {
          seenTags.push(key);
        }
      }
    }

    return { ok: errors.length === 0, errors: errors };
  }

  function collectTotals(budget) {
    var spentMinutes = 0;
    var categoryMinutes = {};
    for (var c = 0; c < CATEGORIES.length; c++) categoryMinutes[CATEGORIES[c]] = 0;
    var longest = null;
    var shortest = null;
    for (var i = 0; i < budget.sessions.length; i++) {
      var session = budget.sessions[i];
      spentMinutes += session.minutes;
      categoryMinutes[session.category] += session.minutes;
      if (longest === null || session.minutes > longest) longest = session.minutes;
      if (shortest === null || session.minutes < shortest) shortest = session.minutes;
    }
    return {
      spentMinutes: spentMinutes,
      categoryMinutes: categoryMinutes,
      longestSessionMinutes: longest,
      shortestSessionMinutes: shortest
    };
  }

  function summarizeBudget(budget) {
    var normalized = normalizeBudget(budget);
    if (!normalized) return null;
    var totals = collectTotals(normalized);
    var spentMinutes = totals.spentMinutes;
    var budgetMinutes = normalized.budgetMinutes;
    var remainingMinutes = budgetMinutes - spentMinutes;
    var sessionCount = normalized.sessions.length;
    return {
      budgetMinutes: budgetMinutes,
      spentMinutes: spentMinutes,
      remainingMinutes: remainingMinutes,
      usedPercent: round2(spentMinutes * 100 / budgetMinutes),
      remainingPercent: round2(remainingMinutes * 100 / budgetMinutes),
      sessionCount: sessionCount,
      overBudget: spentMinutes > budgetMinutes,
      overByMinutes: Math.max(0, spentMinutes - budgetMinutes),
      categoryMinutes: totals.categoryMinutes,
      averageSessionMinutes: sessionCount ? round2(spentMinutes / sessionCount) : null,
      longestSessionMinutes: totals.longestSessionMinutes,
      shortestSessionMinutes: totals.shortestSessionMinutes
    };
  }

  function projectRemaining(budget) {
    var normalized = normalizeBudget(budget);
    if (!normalized) return null;
    var spentMinutes = 0;
    for (var i = 0; i < normalized.sessions.length; i++) spentMinutes += normalized.sessions[i].minutes;
    var budgetMinutes = normalized.budgetMinutes;
    var remainingMinutes = budgetMinutes - spentMinutes;
    var sessionCount = normalized.sessions.length;
    var average = sessionCount ? round2(spentMinutes / sessionCount) : null;
    return {
      budgetMinutes: budgetMinutes,
      observedMinutes: spentMinutes,
      remainingMinutes: remainingMinutes,
      sessionCount: sessionCount,
      averageSessionMinutes: average,
      estimatedSessionsToBudget:
        average === null ? null : remainingMinutes <= 0 ? 0 : Math.ceil(remainingMinutes / average),
      completionPercent: round2(spentMinutes * 100 / budgetMinutes)
    };
  }

  function validateTargets(targets) {
    if (!Array.isArray(targets)) {
      return errorList([['TARGETS_INVALID', 'targets', 'Allocation targets must be an array of target objects.']]);
    }
    if (!targets.length) {
      return errorList([['TARGETS_EMPTY', 'targets', 'At least one allocation target is required.']]);
    }
    var errors = [];
    var items = [];
    var seen = [];

    function add(code, message) {
      errors.push({ code: code, field: 'targets', message: message });
    }

    for (var i = 0; i < targets.length; i++) {
      var target = targets[i];
      if (!isRecord(target)) {
        add('TARGET_NOT_OBJECT', 'Target at position ' + i + ' must be a plain object.');
        continue;
      }
      var key = text(target.key, LIMITS.nameMax);
      if (!key) {
        add('TARGET_KEY_INVALID', 'Target at position ' + i + ' requires a non-empty key.');
        continue;
      }
      if (seen.indexOf(key) !== -1) {
        add('TARGET_KEY_DUPLICATE', 'Duplicate target key: ' + key + '.');
        continue;
      }
      var weight = numberOr(target.weight, NaN);
      if (!(weight > 0) || weight > LIMITS.weightMax) {
        add('TARGET_WEIGHT_RANGE', 'Target ' + key + ' weight must be a number greater than zero.');
        continue;
      }
      seen.push(key);
      items.push({ key: key, weight: weight });
    }

    return { ok: errors.length === 0, errors: errors, items: items };
  }

  function allocateRemaining(budget, targets) {
    if (!isRecord(budget)) {
      return fail('BUDGET_NOT_OBJECT', 'budget', 'Budget must be a plain object.');
    }
    var normalized = normalizeBudget(budget);
    if (!normalized) return budgetErrors(budget);
    var checked = validateTargets(targets);
    if (!checked.ok) return { ok: false, errors: checked.errors };

    var totals = collectTotals(normalized);
    var remainingMinutes = normalized.budgetMinutes - totals.spentMinutes;
    if (remainingMinutes <= 0) {
      return fail('BUDGET_EXHAUSTED', 'budget', 'Remaining budget must be greater than zero to allocate.');
    }

    var items = checked.items;
    var totalWeight = 0;
    for (var i = 0; i < items.length; i++) totalWeight += items[i].weight;

    var minutes = [];
    var fractions = [];
    var used = 0;
    for (i = 0; i < items.length; i++) {
      var exact = remainingMinutes * items[i].weight / totalWeight;
      var base = Math.floor(exact);
      minutes.push(base);
      fractions.push(exact - base);
      used += base;
    }
    var leftover = remainingMinutes - used;
    var order = [];
    for (i = 0; i < items.length; i++) order.push(i);
    order.sort(function (a, b) {
      if (fractions[b] !== fractions[a]) return fractions[b] - fractions[a];
      return a - b;
    });
    for (i = 0; i < leftover && i < order.length; i++) minutes[order[i]] += 1;

    var allocationItems = [];
    for (i = 0; i < items.length; i++) {
      allocationItems.push({
        key: items[i].key,
        weight: items[i].weight,
        minutes: minutes[i],
        share: round2(minutes[i] * 100 / remainingMinutes)
      });
    }

    return {
      ok: true,
      allocation: {
        totalMinutes: remainingMinutes,
        items: allocationItems
      }
    };
  }

  function serialize(budget) {
    var normalized = normalizeBudget(budget);
    if (!normalized) return null;
    if (!validateBudget(normalized).ok) return null;
    return JSON.stringify({ schemaVersion: SCHEMA_VERSION, budget: normalized });
  }

  function legacyToV1(document) {
    var raw = {
      id: typeof document.id === 'string' ? document.id : '',
      name: hasOwn(document, 'title') ? document.title : document.name,
      budgetMinutes: document.limitMinutes,
      sessions: [],
      notes: document.notes,
      tags: document.tags
    };
    if (Array.isArray(document.entries)) {
      for (var i = 0; i < document.entries.length; i++) {
        var entry = document.entries[i];
        if (!isRecord(entry)) continue;
        raw.sessions.push({ label: entry.name, minutes: entry.minutes, category: entry.category });
      }
    }
    return raw;
  }

  function withMigrated(result, from) {
    if (!result.ok) return result;
    return { ok: true, budget: result.budget, migratedFrom: from };
  }

  function migrate(document) {
    if (!isRecord(document)) {
      return fail('DOCUMENT_NOT_OBJECT', 'document', 'Document must be a plain object.');
    }
    var version = document.schemaVersion;
    if (version === undefined || version === null) {
      return fail('SCHEMA_VERSION_MISSING', 'schemaVersion', 'Document has no schemaVersion.');
    }
    if (!Number.isInteger(version) || version < 0) {
      return fail('SCHEMA_VERSION_UNSUPPORTED', 'schemaVersion', 'Unsupported schema version: ' + String(version) + '.');
    }
    if (version === SCHEMA_VERSION) {
      if (!isRecord(document.budget)) {
        return fail('BUDGET_MISSING', 'budget', 'Version ' + SCHEMA_VERSION + ' documents must contain a budget object.');
      }
      return withMigrated(finishBudget(document.budget), null);
    }
    if (version === LEGACY_SCHEMA_VERSION) {
      return withMigrated(finishBudget(legacyToV1(document)), LEGACY_SCHEMA_VERSION);
    }
    return fail('SCHEMA_VERSION_UNSUPPORTED', 'schemaVersion', 'Unsupported schema version: ' + version + '.');
  }

  function parse(json) {
    if (typeof json !== 'string') {
      return fail('MALFORMED', 'json', 'Expected a JSON string.');
    }
    var document;
    try {
      document = JSON.parse(json);
    } catch (error) {
      return fail('MALFORMED', 'json', 'Invalid JSON payload.');
    }
    return migrate(document);
  }

  var engine = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    CATEGORIES: CATEGORIES,
    PROJECT_DEFAULTS: PROJECT_DEFAULTS,
    createBudget: createBudget,
    addSession: addSession,
    removeSession: removeSession,
    validateBudget: validateBudget,
    normalizeBudget: normalizeBudget,
    summarizeBudget: summarizeBudget,
    allocateRemaining: allocateRemaining,
    projectRemaining: projectRemaining,
    deriveBudgetId: deriveBudgetId,
    deriveSessionId: deriveSessionId,
    serialize: serialize,
    parse: parse,
    migrate: migrate
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.ProjectTimeBudgetEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
