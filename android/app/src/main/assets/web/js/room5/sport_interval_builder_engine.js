/**
 * DEEP FOCUS — Room5 Sport Interval Builder Engine
 * Schema-versioned, offline, deterministic workout interval sessions
 * built from warmup, work, rest and cooldown intervals.
 *
 * Pure module: CommonJS export, zero networking, zero persistence,
 * no timers, no randomness, no external dependencies.
 */
(function (global) {
  'use strict';

  var SCHEMA_VERSION = 1;
  var LEGACY_SCHEMA_VERSION = 0;

  var PHASES = ['warmup', 'work', 'rest', 'cooldown'];
  var INTENSITIES = ['easy', 'moderate', 'hard', 'max'];
  var WORK_INTENSITY = 'hard';
  var REST_INTENSITY = 'easy';

  var SESSION_FIELDS = [
    'id',
    'name',
    'activity',
    'templateId',
    'warmup',
    'workRounds',
    'workMinutes',
    'restMinutes',
    'includeFinalRest',
    'cooldown',
    'notes',
    'tags'
  ];

  var LIMITS = {
    idPattern: /^[A-Za-z0-9_-]{1,64}$/,
    nameMax: 60,
    activityMax: 40,
    templateIdMax: 64,
    stepsMin: 1,
    stepsMax: 6,
    stepMinutesMin: 1,
    stepMinutesMax: 90,
    workMinutesMin: 1,
    workMinutesMax: 120,
    restMinutesMin: 0,
    restMinutesMax: 60,
    workRoundsMin: 1,
    workRoundsMax: 50,
    notesMax: 280,
    tagsMax: 6,
    tagMaxLen: 24
  };

  var SESSION_DEFAULTS = Object.freeze({
    activity: '',
    warmup: Object.freeze([Object.freeze({ minutes: 5, intensity: 'easy' })]),
    workRounds: 6,
    workMinutes: 1,
    restMinutes: 1,
    includeFinalRest: false,
    cooldown: Object.freeze([Object.freeze({ minutes: 5, intensity: 'easy' })]),
    notes: '',
    tags: Object.freeze([])
  });

  var BUILTIN_TEMPLATES = [
    {
      id: 'int_hiit_8round',
      name: 'HIIT Eight Rounds',
      activity: 'hiit',
      templateId: null,
      warmup: [{ minutes: 5, intensity: 'easy' }],
      workRounds: 8,
      workMinutes: 1,
      restMinutes: 1,
      includeFinalRest: false,
      cooldown: [{ minutes: 5, intensity: 'easy' }],
      notes: 'Eight hard minutes with an easy minute between rounds.',
      tags: ['hiit', 'conditioning']
    },
    {
      id: 'int_strength_ladder',
      name: 'Strength Ladder',
      activity: 'strength',
      templateId: null,
      warmup: [
        { minutes: 5, intensity: 'easy' },
        { minutes: 5, intensity: 'moderate' }
      ],
      workRounds: 5,
      workMinutes: 3,
      restMinutes: 2,
      includeFinalRest: false,
      cooldown: [{ minutes: 6, intensity: 'easy' }],
      notes: 'Five working sets with two minutes of rest.',
      tags: ['strength']
    },
    {
      id: 'int_cycling_sprints',
      name: 'Cycling Sprints',
      activity: 'cycling',
      templateId: null,
      warmup: [
        { minutes: 8, intensity: 'easy' },
        { minutes: 4, intensity: 'moderate' }
      ],
      workRounds: 10,
      workMinutes: 1,
      restMinutes: 2,
      includeFinalRest: true,
      cooldown: [{ minutes: 8, intensity: 'easy' }],
      notes: 'Ten one-minute sprints with two easy spinning minutes.',
      tags: ['bike', 'sprints']
    },
    {
      id: 'int_boxing_rounds',
      name: 'Boxing Rounds',
      activity: 'boxing',
      templateId: null,
      warmup: [{ minutes: 5, intensity: 'easy' }],
      workRounds: 12,
      workMinutes: 3,
      restMinutes: 1,
      includeFinalRest: false,
      cooldown: [{ minutes: 6, intensity: 'easy' }],
      notes: 'Twelve three-minute rounds with one minute of recovery.',
      tags: ['boxing']
    },
    {
      id: 'int_rowing_pyramid',
      name: 'Rowing Pyramid',
      activity: 'rowing',
      templateId: null,
      warmup: [
        { minutes: 6, intensity: 'easy' },
        { minutes: 3, intensity: 'moderate' }
      ],
      workRounds: 5,
      workMinutes: 4,
      restMinutes: 2,
      includeFinalRest: true,
      cooldown: [{ minutes: 7, intensity: 'easy' }],
      notes: 'Five steady-state pieces with full recovery.',
      tags: ['row', 'pyramid']
    }
  ];

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

  function normalizeIntensity(value, fallback) {
    if (typeof value !== 'string') return fallback;
    var key = value.trim().toLowerCase();
    for (var i = 0; i < INTENSITIES.length; i++) {
      if (INTENSITIES[i] === key) return key;
    }
    return fallback;
  }

  function normalizeSteps(value, defaultIntensity) {
    if (!Array.isArray(value)) return [];
    var picked = [];
    for (var i = 0; i < value.length && picked.length < LIMITS.stepsMax; i++) {
      var step = value[i];
      if (!isRecord(step)) continue;
      picked.push({
        minutes: clampInt(step.minutes, LIMITS.stepMinutesMin, LIMITS.stepMinutesMax, LIMITS.stepMinutesMin),
        intensity: normalizeIntensity(step.intensity, defaultIntensity)
      });
    }
    return picked;
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

  function deriveSessionId(seed) {
    var input = String(seed === undefined || seed === null ? '' : seed);
    var hash = 0x811c9dc5;
    for (var i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return 'int_' + ('00000000' + hash.toString(16)).slice(-8);
  }

  function stepsSeed(steps) {
    var parts = [];
    for (var i = 0; i < steps.length; i++) {
      parts.push(steps[i].minutes + ':' + steps[i].intensity);
    }
    return parts.join(',');
  }

  function seedFor(name, activity, warmup, workRounds, workMinutes, restMinutes, includeFinalRest, cooldown) {
    return (
      name +
      '|' + activity +
      '|' + stepsSeed(warmup) +
      '|' + workRounds + 'x' + workMinutes + '+' + restMinutes + (includeFinalRest ? '+final' : '') +
      '|' + stepsSeed(cooldown)
    );
  }

  function copyRecord(record) {
    var out = {};
    for (var key in record) {
      if (key === '__proto__' || !hasOwn(record, key)) continue;
      out[key] = record[key];
    }
    return out;
  }

  function cloneValue(value) {
    if (!Array.isArray(value)) return value;
    var out = [];
    for (var i = 0; i < value.length; i++) {
      out.push(isRecord(value[i]) ? copyRecord(value[i]) : value[i]);
    }
    return out;
  }

  function copyKnown(target, source) {
    if (!isRecord(source)) return target;
    for (var i = 0; i < SESSION_FIELDS.length; i++) {
      var key = SESSION_FIELDS[i];
      if (key === '__proto__' || !hasOwn(source, key)) continue;
      target[key] = cloneValue(source[key]);
    }
    return target;
  }

  function listTemplates() {
    return BUILTIN_TEMPLATES.map(function (template) {
      return copyKnown({}, template);
    });
  }

  function getTemplate(templateId) {
    if (typeof templateId !== 'string') return null;
    for (var i = 0; i < BUILTIN_TEMPLATES.length; i++) {
      if (BUILTIN_TEMPLATES[i].id === templateId) return copyKnown({}, BUILTIN_TEMPLATES[i]);
    }
    return null;
  }

  function isIntensity(value) {
    return typeof value === 'string' && INTENSITIES.indexOf(value) !== -1;
  }

  function addStepErrors(errors, codePrefix, steps) {
    if (!Array.isArray(steps)) {
      errors.push({
        code: codePrefix + '_INVALID',
        field: codePrefix.toLowerCase(),
        message: codePrefix.charAt(0) + codePrefix.slice(1).toLowerCase() + ' must be an array of interval steps.'
      });
      return;
    }
    if (steps.length < LIMITS.stepsMin) {
      errors.push({
        code: codePrefix + '_EMPTY',
        field: codePrefix.toLowerCase(),
        message: 'At least one ' + codePrefix.toLowerCase() + ' interval is required.'
      });
      return;
    }
    if (steps.length > LIMITS.stepsMax) {
      errors.push({
        code: codePrefix + '_LIMIT',
        field: codePrefix.toLowerCase(),
        message: 'At most ' + LIMITS.stepsMax + ' ' + codePrefix.toLowerCase() + ' intervals are allowed.'
      });
    }
    for (var i = 0; i < steps.length; i++) {
      var step = steps[i];
      if (!isRecord(step)) {
        errors.push({
          code: codePrefix + '_STEP_INVALID',
          field: codePrefix.toLowerCase(),
          message: 'Interval at position ' + i + ' must be a plain object.'
        });
        continue;
      }
      if (!Number.isInteger(step.minutes) || step.minutes < LIMITS.stepMinutesMin || step.minutes > LIMITS.stepMinutesMax) {
        errors.push({
          code: codePrefix + '_STEP_MINUTES_RANGE',
          field: codePrefix.toLowerCase(),
          message: 'Interval at position ' + i + ' must be an integer between ' + LIMITS.stepMinutesMin + ' and ' + LIMITS.stepMinutesMax + ' minutes.'
        });
      }
      if (!isIntensity(step.intensity)) {
        errors.push({
          code: codePrefix + '_STEP_INTENSITY_INVALID',
          field: codePrefix.toLowerCase(),
          message: 'Interval at position ' + i + ' must use a known intensity (' + INTENSITIES.join(', ') + ').'
        });
      }
    }
  }

  function validateSession(session) {
    if (!isRecord(session)) {
      return errorList([['SESSION_NOT_OBJECT', 'session', 'Session must be a plain object.']]);
    }
    var errors = [];

    function add(code, field, message) {
      errors.push({ code: code, field: field, message: message });
    }

    if (typeof session.id !== 'string' || !LIMITS.idPattern.test(session.id)) {
      add('ID_INVALID', 'id', 'Session id must match ' + LIMITS.idPattern.source + '.');
    }
    if (typeof session.name !== 'string' || !session.name.trim()) {
      add('NAME_REQUIRED', 'name', 'Session name is required.');
    } else if (session.name.trim().length > LIMITS.nameMax) {
      add('NAME_TOO_LONG', 'name', 'Session name must be at most ' + LIMITS.nameMax + ' characters.');
    }
    if (typeof session.activity !== 'string') {
      add('ACTIVITY_INVALID', 'activity', 'Activity must be a string.');
    } else if (session.activity.trim().length > LIMITS.activityMax) {
      add('ACTIVITY_TOO_LONG', 'activity', 'Activity must be at most ' + LIMITS.activityMax + ' characters.');
    }
    if (session.templateId !== null && (typeof session.templateId !== 'string' || !session.templateId.trim())) {
      add('TEMPLATE_ID_INVALID', 'templateId', 'Template id must be null or a non-empty string.');
    } else if (typeof session.templateId === 'string' && session.templateId.length > LIMITS.templateIdMax) {
      add('TEMPLATE_ID_INVALID', 'templateId', 'Template id is too long.');
    }

    addStepErrors(errors, 'WARMUP', session.warmup);
    addStepErrors(errors, 'COOLDOWN', session.cooldown);

    if (!Number.isInteger(session.workRounds) || session.workRounds < LIMITS.workRoundsMin || session.workRounds > LIMITS.workRoundsMax) {
      add('WORK_ROUNDS_RANGE', 'workRounds', 'Work rounds must be an integer between ' + LIMITS.workRoundsMin + ' and ' + LIMITS.workRoundsMax + '.');
    }
    if (!Number.isInteger(session.workMinutes) || session.workMinutes < LIMITS.workMinutesMin || session.workMinutes > LIMITS.workMinutesMax) {
      add('WORK_MINUTES_RANGE', 'workMinutes', 'Work interval length must be an integer between ' + LIMITS.workMinutesMin + ' and ' + LIMITS.workMinutesMax + '.');
    }
    if (!Number.isInteger(session.restMinutes) || session.restMinutes < LIMITS.restMinutesMin || session.restMinutes > LIMITS.restMinutesMax) {
      add('REST_MINUTES_RANGE', 'restMinutes', 'Rest interval length must be an integer between ' + LIMITS.restMinutesMin + ' and ' + LIMITS.restMinutesMax + '.');
    }
    if (typeof session.includeFinalRest !== 'boolean') {
      add('FINAL_REST_INVALID', 'includeFinalRest', 'includeFinalRest must be a boolean.');
    }
    if (typeof session.notes !== 'string') {
      add('NOTES_INVALID', 'notes', 'Notes must be a string.');
    } else if (session.notes.length > LIMITS.notesMax) {
      add('NOTES_TOO_LONG', 'notes', 'Notes must be at most ' + LIMITS.notesMax + ' characters.');
    }

    if (!Array.isArray(session.tags)) {
      add('TAGS_INVALID', 'tags', 'Tags must be an array of strings.');
    } else {
      if (session.tags.length > LIMITS.tagsMax) {
        add('TAGS_LIMIT', 'tags', 'At most ' + LIMITS.tagsMax + ' tags are allowed.');
      }
      var seenTags = [];
      for (var t = 0; t < session.tags.length; t++) {
        var tag = session.tags[t];
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

  function normalizeSession(session) {
    if (!isRecord(session)) return null;
    var name = text(session.name, LIMITS.nameMax);
    if (!name) return null;
    var warmup = normalizeSteps(session.warmup, 'easy');
    if (!warmup.length) return null;
    var cooldown = normalizeSteps(session.cooldown, 'easy');
    if (!cooldown.length) return null;
    var activity = text(session.activity, LIMITS.activityMax);
    var workRounds = clampInt(session.workRounds, LIMITS.workRoundsMin, LIMITS.workRoundsMax, SESSION_DEFAULTS.workRounds);
    var workMinutes = clampInt(session.workMinutes, LIMITS.workMinutesMin, LIMITS.workMinutesMax, SESSION_DEFAULTS.workMinutes);
    var restMinutes = clampInt(session.restMinutes, LIMITS.restMinutesMin, LIMITS.restMinutesMax, SESSION_DEFAULTS.restMinutes);
    var includeFinalRest = session.includeFinalRest === true;
    var id = typeof session.id === 'string' ? session.id.trim() : '';
    if (!LIMITS.idPattern.test(id)) {
      id = deriveSessionId(seedFor(name, activity, warmup, workRounds, workMinutes, restMinutes, includeFinalRest, cooldown));
    }
    var templateId = typeof session.templateId === 'string' && session.templateId.trim() ? session.templateId.trim() : null;
    var notes = typeof session.notes === 'string' ? session.notes.trim().slice(0, LIMITS.notesMax) : '';
    return {
      id: id,
      name: name,
      activity: activity,
      templateId: templateId,
      warmup: warmup,
      workRounds: workRounds,
      workMinutes: workMinutes,
      restMinutes: restMinutes,
      includeFinalRest: includeFinalRest,
      cooldown: cooldown,
      notes: notes,
      tags: normalizeTags(session.tags)
    };
  }

  function finishSession(raw) {
    var normalized = normalizeSession(raw);
    if (!normalized) {
      var errors = validateSession(raw).errors;
      if (!errors.length) {
        errors.push({ code: 'SESSION_INVALID', field: 'session', message: 'Session could not be normalized.' });
      }
      return { ok: false, errors: errors };
    }
    return { ok: true, plan: normalized };
  }

  function createSessionFromTemplate(templateId, overrides) {
    if (!isRecord(overrides)) {
      return fail('OVERRIDES_NOT_OBJECT', 'overrides', 'Overrides must be a plain object.');
    }
    var template = getTemplate(templateId);
    if (!template) {
      return fail('TEMPLATE_NOT_FOUND', 'templateId', 'Unknown sport interval template: ' + String(templateId) + '.');
    }
    var raw = copyKnown({}, template);
    delete raw.id;
    copyKnown(raw, overrides);
    if (!hasOwn(overrides, 'templateId')) raw.templateId = template.id;
    return finishSession(raw);
  }

  function createCustomSession(spec) {
    if (!isRecord(spec)) {
      return fail('SPEC_NOT_OBJECT', 'spec', 'Custom session specification must be a plain object.');
    }
    var raw = {
      id: '',
      name: '',
      activity: SESSION_DEFAULTS.activity,
      templateId: null,
      warmup: cloneValue(SESSION_DEFAULTS.warmup),
      workRounds: SESSION_DEFAULTS.workRounds,
      workMinutes: SESSION_DEFAULTS.workMinutes,
      restMinutes: SESSION_DEFAULTS.restMinutes,
      includeFinalRest: SESSION_DEFAULTS.includeFinalRest,
      cooldown: cloneValue(SESSION_DEFAULTS.cooldown),
      notes: SESSION_DEFAULTS.notes,
      tags: cloneValue(SESSION_DEFAULTS.tags)
    };
    copyKnown(raw, spec);
    return finishSession(raw);
  }

  function updateSession(session, changes) {
    if (!isRecord(session)) {
      return fail('SESSION_NOT_OBJECT', 'session', 'Session must be a plain object.');
    }
    if (!isRecord(changes)) {
      return fail('CHANGES_NOT_OBJECT', 'changes', 'Changes must be a plain object.');
    }
    var raw = copyKnown({}, session);
    copyKnown(raw, changes);
    return finishSession(raw);
  }

  function sumSteps(steps) {
    var total = 0;
    for (var i = 0; i < steps.length; i++) total += steps[i].minutes;
    return total;
  }

  function restIntervalCount(session) {
    if (session.restMinutes <= 0) return 0;
    return Math.max(0, session.workRounds - 1) + (session.includeFinalRest ? 1 : 0);
  }

  function buildTimeline(session) {
    var normalized = normalizeSession(session);
    if (!normalized) return null;
    var steps = [];
    var cursor = 0;

    function push(phase, round, label, minutes, intensity) {
      steps.push({
        index: steps.length,
        phase: phase,
        round: round,
        label: label,
        minutes: minutes,
        startMinute: cursor,
        endMinute: cursor + minutes,
        intensity: intensity
      });
      cursor += minutes;
    }

    var i;
    for (i = 0; i < normalized.warmup.length; i++) {
      push('warmup', null, 'Warmup ' + (i + 1), normalized.warmup[i].minutes, normalized.warmup[i].intensity);
    }
    for (var round = 1; round <= normalized.workRounds; round++) {
      push('work', round, 'Work ' + round, normalized.workMinutes, WORK_INTENSITY);
      if (normalized.restMinutes > 0 && (round < normalized.workRounds || normalized.includeFinalRest)) {
        push('rest', round, 'Rest ' + round, normalized.restMinutes, REST_INTENSITY);
      }
    }
    for (i = 0; i < normalized.cooldown.length; i++) {
      push('cooldown', null, 'Cooldown ' + (i + 1), normalized.cooldown[i].minutes, normalized.cooldown[i].intensity);
    }

    return {
      steps: steps,
      totalSteps: steps.length,
      totalMinutes: cursor,
      warmupMinutes: sumSteps(normalized.warmup),
      workMinutes: normalized.workRounds * normalized.workMinutes,
      restMinutes: restIntervalCount(normalized) * normalized.restMinutes,
      cooldownMinutes: sumSteps(normalized.cooldown),
      workRounds: normalized.workRounds,
      restIntervals: restIntervalCount(normalized)
    };
  }

  function round2(value) {
    return Math.round(value * 100) / 100;
  }

  function summarizeSession(session) {
    var normalized = normalizeSession(session);
    if (!normalized) return null;
    var warmupMinutes = sumSteps(normalized.warmup);
    var cooldownMinutes = sumSteps(normalized.cooldown);
    var workMinutes = normalized.workRounds * normalized.workMinutes;
    var restIntervals = restIntervalCount(normalized);
    var restMinutes = restIntervals * normalized.restMinutes;
    var totalMinutes = warmupMinutes + workMinutes + restMinutes + cooldownMinutes;
    return {
      warmupMinutes: warmupMinutes,
      workMinutes: workMinutes,
      restMinutes: restMinutes,
      cooldownMinutes: cooldownMinutes,
      totalMinutes: totalMinutes,
      workRounds: normalized.workRounds,
      restIntervals: restIntervals,
      workToRestRatio: restMinutes === 0 ? null : round2(workMinutes / restMinutes),
      totalHours: round2(totalMinutes / 60)
    };
  }

  function serialize(session) {
    var normalized = normalizeSession(session);
    if (!normalized) return null;
    if (!validateSession(normalized).ok) return null;
    return JSON.stringify({ schemaVersion: SCHEMA_VERSION, session: normalized });
  }

  function legacyToV1(document) {
    var raw = {};
    raw.id = typeof document.id === 'string' ? document.id : '';
    raw.name = hasOwn(document, 'title') ? document.title : document.name;
    raw.activity = document.activity;
    raw.templateId = null;
    raw.warmup = [
      {
        minutes: numberOr(document.warmupMinutes, SESSION_DEFAULTS.warmup[0].minutes),
        intensity: 'easy'
      }
    ];
    raw.workRounds = document.rounds === undefined ? SESSION_DEFAULTS.workRounds : document.rounds;
    raw.workMinutes = document.workMinutes;
    raw.restMinutes = document.restMinutes;
    raw.includeFinalRest = false;
    raw.cooldown = [
      {
        minutes: numberOr(document.cooldownMinutes, SESSION_DEFAULTS.cooldown[0].minutes),
        intensity: 'easy'
      }
    ];
    raw.notes = document.notes;
    raw.tags = document.tags;
    return raw;
  }

  function withMigrated(result, from) {
    if (!result.ok) return result;
    return { ok: true, plan: result.plan, migratedFrom: from };
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
      if (!isRecord(document.session)) {
        return fail('SESSION_MISSING', 'session', 'Version ' + SCHEMA_VERSION + ' documents must contain a session object.');
      }
      return withMigrated(finishSession(document.session), null);
    }
    if (version === LEGACY_SCHEMA_VERSION) {
      return withMigrated(finishSession(legacyToV1(document)), LEGACY_SCHEMA_VERSION);
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
    PHASES: PHASES.slice(),
    INTENSITIES: INTENSITIES.slice(),
    SESSION_DEFAULTS: SESSION_DEFAULTS,
    listTemplates: listTemplates,
    getTemplate: getTemplate,
    createSessionFromTemplate: createSessionFromTemplate,
    createCustomSession: createCustomSession,
    validateSession: validateSession,
    normalizeSession: normalizeSession,
    updateSession: updateSession,
    buildTimeline: buildTimeline,
    summarizeSession: summarizeSession,
    deriveSessionId: deriveSessionId,
    serialize: serialize,
    parse: parse,
    migrate: migrate
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.SportIntervalBuilderEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
