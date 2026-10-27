/**
 * DEEP FOCUS — Room5 Study Plan Templates Engine
 * Schema-versioned, offline, customizable study plans.
 *
 * Pure module: CommonJS export, zero networking, zero persistence,
 * no timers, no randomness, no external dependencies.
 */
(function (global) {
  'use strict';

  var SCHEMA_VERSION = 1;
  var LEGACY_SCHEMA_VERSION = 0;

  var WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  var WEEKDAY_ALIASES = Object.create(null);
  (function buildAliases() {
    var fullNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    var extra = { tue: ['tues'], wed: ['weds'], thu: ['thur', 'thurs'] };
    for (var i = 0; i < WEEKDAYS.length; i++) {
      WEEKDAY_ALIASES[WEEKDAYS[i]] = WEEKDAYS[i];
      WEEKDAY_ALIASES[fullNames[i]] = WEEKDAYS[i];
      var extras = extra[WEEKDAYS[i]] || [];
      for (var e = 0; e < extras.length; e++) WEEKDAY_ALIASES[extras[e]] = WEEKDAYS[i];
    }
  })();

  var PLAN_FIELDS = [
    'id',
    'name',
    'subject',
    'templateId',
    'days',
    'sessionMinutes',
    'breakMinutes',
    'sessionsPerDay',
    'startDate',
    'weeks',
    'notes',
    'tags'
  ];

  var LIMITS = {
    idPattern: /^[A-Za-z0-9_-]{1,64}$/,
    nameMax: 60,
    subjectMax: 60,
    templateIdMax: 64,
    sessionMin: 5,
    sessionMax: 480,
    breakMin: 0,
    breakMax: 120,
    sessionsMin: 1,
    sessionsMax: 12,
    weeksMin: 1,
    weeksMax: 52,
    notesMax: 280,
    tagsMax: 6,
    tagMaxLen: 24
  };

  var PLAN_DEFAULTS = Object.freeze({
    subject: '',
    days: Object.freeze(['mon', 'tue', 'wed', 'thu', 'fri']),
    sessionMinutes: 45,
    breakMinutes: 10,
    sessionsPerDay: 1,
    startDate: null,
    weeks: 4,
    notes: '',
    tags: Object.freeze([])
  });

  var BUILTIN_TEMPLATES = [
    {
      id: 'plan_exam_cram',
      name: 'Exam Cram',
      subject: 'Exam prep',
      days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
      sessionMinutes: 50,
      breakMinutes: 10,
      sessionsPerDay: 2,
      startDate: null,
      weeks: 3,
      notes: 'Two focused blocks per day leading up to the exam.',
      tags: ['exam', 'intensive']
    },
    {
      id: 'plan_deep_work',
      name: 'Deep Work Blocks',
      subject: 'Deep work',
      days: ['mon', 'tue', 'wed', 'thu', 'fri'],
      sessionMinutes: 90,
      breakMinutes: 15,
      sessionsPerDay: 1,
      startDate: null,
      weeks: 8,
      notes: 'One long uninterrupted block for the hardest material.',
      tags: ['deep']
    },
    {
      id: 'plan_language_daily',
      name: 'Language Daily',
      subject: 'Languages',
      days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      sessionMinutes: 25,
      breakMinutes: 5,
      sessionsPerDay: 2,
      startDate: null,
      weeks: 12,
      notes: 'Short daily repetition for vocabulary and speaking.',
      tags: ['language', 'daily']
    },
    {
      id: 'plan_light_review',
      name: 'Light Review',
      subject: 'Review',
      days: ['tue', 'thu', 'sat'],
      sessionMinutes: 15,
      breakMinutes: 5,
      sessionsPerDay: 3,
      startDate: null,
      weeks: 6,
      notes: 'Spread review sessions across the week.',
      tags: ['review', 'spaced']
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

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  function isValidDateText(value) {
    if (typeof value !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var year = Number(value.slice(0, 4));
    var month = Number(value.slice(5, 7));
    var day = Number(value.slice(8, 10));
    if (month < 1 || month > 12 || day < 1) return false;
    var monthLengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return day <= monthLengths[month - 1];
  }

  function weekdayIndex(value) {
    if (typeof value !== 'string') return -1;
    var key = value.trim().toLowerCase();
    if (!key || !hasOwn(WEEKDAY_ALIASES, key)) return -1;
    return WEEKDAYS.indexOf(WEEKDAY_ALIASES[key]);
  }

  function normalizeDays(value) {
    if (!Array.isArray(value)) return [];
    var picked = [];
    for (var i = 0; i < value.length; i++) {
      var index = weekdayIndex(value[i]);
      if (index === -1) continue;
      var day = WEEKDAYS[index];
      if (picked.indexOf(day) === -1) picked.push(day);
    }
    picked.sort(function (a, b) {
      return WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b);
    });
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

  function derivePlanId(seed) {
    var input = String(seed === undefined || seed === null ? '' : seed);
    var hash = 0x811c9dc5;
    for (var i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return 'plan_' + ('00000000' + hash.toString(16)).slice(-8);
  }

  function seedFor(name, subject, days) {
    return name + '|' + subject + '|' + days.join(',');
  }

  function cloneValue(value) {
    return Array.isArray(value) ? value.slice() : value;
  }

  function copyKnown(target, source) {
    if (!isRecord(source)) return target;
    for (var i = 0; i < PLAN_FIELDS.length; i++) {
      var key = PLAN_FIELDS[i];
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

  function validatePlan(plan) {
    if (!isRecord(plan)) {
      return errorList([['PLAN_NOT_OBJECT', 'plan', 'Plan must be a plain object.']]);
    }
    var errors = [];

    function add(code, field, message) {
      errors.push({ code: code, field: field, message: message });
    }

    if (typeof plan.id !== 'string' || !LIMITS.idPattern.test(plan.id)) {
      add('ID_INVALID', 'id', 'Plan id must match ' + LIMITS.idPattern.source + '.');
    }
    if (typeof plan.name !== 'string' || !plan.name.trim()) {
      add('NAME_REQUIRED', 'name', 'Plan name is required.');
    } else if (plan.name.trim().length > LIMITS.nameMax) {
      add('NAME_TOO_LONG', 'name', 'Plan name must be at most ' + LIMITS.nameMax + ' characters.');
    }
    if (typeof plan.subject !== 'string') {
      add('SUBJECT_INVALID', 'subject', 'Subject must be a string.');
    } else if (plan.subject.trim().length > LIMITS.subjectMax) {
      add('SUBJECT_TOO_LONG', 'subject', 'Subject must be at most ' + LIMITS.subjectMax + ' characters.');
    }
    if (plan.templateId !== null && (typeof plan.templateId !== 'string' || !plan.templateId.trim())) {
      add('TEMPLATE_ID_INVALID', 'templateId', 'Template id must be null or a non-empty string.');
    } else if (typeof plan.templateId === 'string' && plan.templateId.length > LIMITS.templateIdMax) {
      add('TEMPLATE_ID_INVALID', 'templateId', 'Template id is too long.');
    }

    if (!Array.isArray(plan.days)) {
      add('DAYS_INVALID', 'days', 'Days must be an array of weekday keys.');
    } else if (plan.days.length === 0) {
      add('DAYS_EMPTY', 'days', 'At least one study day is required.');
    } else {
      var seenDays = [];
      for (var d = 0; d < plan.days.length; d++) {
        var index = weekdayIndex(plan.days[d]);
        if (index === -1) {
          add('DAYS_INVALID', 'days', 'Unknown weekday: ' + String(plan.days[d]) + '.');
          continue;
        }
        if (seenDays.indexOf(WEEKDAYS[index]) !== -1) {
          add('DAYS_DUPLICATE', 'days', 'Duplicate weekday: ' + WEEKDAYS[index] + '.');
        } else {
          seenDays.push(WEEKDAYS[index]);
        }
      }
    }

    if (!Number.isInteger(plan.sessionMinutes) || plan.sessionMinutes < LIMITS.sessionMin || plan.sessionMinutes > LIMITS.sessionMax) {
      add('SESSION_MINUTES_RANGE', 'sessionMinutes', 'Session length must be an integer between ' + LIMITS.sessionMin + ' and ' + LIMITS.sessionMax + '.');
    }
    if (!Number.isInteger(plan.breakMinutes) || plan.breakMinutes < LIMITS.breakMin || plan.breakMinutes > LIMITS.breakMax) {
      add('BREAK_MINUTES_RANGE', 'breakMinutes', 'Break length must be an integer between ' + LIMITS.breakMin + ' and ' + LIMITS.breakMax + '.');
    }
    if (!Number.isInteger(plan.sessionsPerDay) || plan.sessionsPerDay < LIMITS.sessionsMin || plan.sessionsPerDay > LIMITS.sessionsMax) {
      add('SESSIONS_PER_DAY_RANGE', 'sessionsPerDay', 'Sessions per day must be an integer between ' + LIMITS.sessionsMin + ' and ' + LIMITS.sessionsMax + '.');
    }
    if (plan.startDate !== null && !isValidDateText(plan.startDate)) {
      add('START_DATE_INVALID', 'startDate', 'Start date must be a real YYYY-MM-DD date or null.');
    }
    if (!Number.isInteger(plan.weeks) || plan.weeks < LIMITS.weeksMin || plan.weeks > LIMITS.weeksMax) {
      add('WEEKS_RANGE', 'weeks', 'Plan length must be an integer between ' + LIMITS.weeksMin + ' and ' + LIMITS.weeksMax + ' weeks.');
    }
    if (typeof plan.notes !== 'string') {
      add('NOTES_INVALID', 'notes', 'Notes must be a string.');
    } else if (plan.notes.length > LIMITS.notesMax) {
      add('NOTES_TOO_LONG', 'notes', 'Notes must be at most ' + LIMITS.notesMax + ' characters.');
    }

    if (!Array.isArray(plan.tags)) {
      add('TAGS_INVALID', 'tags', 'Tags must be an array of strings.');
    } else {
      if (plan.tags.length > LIMITS.tagsMax) {
        add('TAGS_LIMIT', 'tags', 'At most ' + LIMITS.tagsMax + ' tags are allowed.');
      }
      var seenTags = [];
      for (var t = 0; t < plan.tags.length; t++) {
        var tag = plan.tags[t];
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

  function normalizePlan(plan) {
    if (!isRecord(plan)) return null;
    var name = text(plan.name, LIMITS.nameMax);
    if (!name) return null;
    var days = normalizeDays(plan.days);
    if (!days.length) return null;
    var subject = text(plan.subject, LIMITS.subjectMax);
    var id = typeof plan.id === 'string' ? plan.id.trim() : '';
    if (!LIMITS.idPattern.test(id)) id = derivePlanId(seedFor(name, subject, days));
    var templateId = typeof plan.templateId === 'string' && plan.templateId.trim() ? plan.templateId.trim() : null;
    var startDate = isValidDateText(plan.startDate) ? plan.startDate : null;
    var notes = typeof plan.notes === 'string' ? plan.notes.trim().slice(0, LIMITS.notesMax) : '';
    return {
      id: id,
      name: name,
      subject: subject,
      templateId: templateId,
      days: days,
      sessionMinutes: clampInt(plan.sessionMinutes, LIMITS.sessionMin, LIMITS.sessionMax, PLAN_DEFAULTS.sessionMinutes),
      breakMinutes: clampInt(plan.breakMinutes, LIMITS.breakMin, LIMITS.breakMax, PLAN_DEFAULTS.breakMinutes),
      sessionsPerDay: clampInt(plan.sessionsPerDay, LIMITS.sessionsMin, LIMITS.sessionsMax, PLAN_DEFAULTS.sessionsPerDay),
      startDate: startDate,
      weeks: clampInt(plan.weeks, LIMITS.weeksMin, LIMITS.weeksMax, PLAN_DEFAULTS.weeks),
      notes: notes,
      tags: normalizeTags(plan.tags)
    };
  }

  function finishPlan(raw) {
    var normalized = normalizePlan(raw);
    if (!normalized) {
      var errors = validatePlan(raw).errors;
      if (!errors.length) {
        errors.push({ code: 'PLAN_INVALID', field: 'plan', message: 'Plan could not be normalized.' });
      }
      return { ok: false, errors: errors };
    }
    return { ok: true, plan: normalized };
  }

  function createPlanFromTemplate(templateId, overrides) {
    if (!isRecord(overrides)) {
      return fail('OVERRIDES_NOT_OBJECT', 'overrides', 'Overrides must be a plain object.');
    }
    var template = getTemplate(templateId);
    if (!template) {
      return fail('TEMPLATE_NOT_FOUND', 'templateId', 'Unknown study plan template: ' + String(templateId) + '.');
    }
    var raw = copyKnown({}, template);
    delete raw.id;
    copyKnown(raw, overrides);
    if (!hasOwn(overrides, 'templateId')) raw.templateId = template.id;
    return finishPlan(raw);
  }

  function createCustomPlan(spec) {
    if (!isRecord(spec)) {
      return fail('SPEC_NOT_OBJECT', 'spec', 'Custom plan specification must be a plain object.');
    }
    var raw = {
      id: '',
      name: '',
      subject: PLAN_DEFAULTS.subject,
      templateId: null,
      days: PLAN_DEFAULTS.days.slice(),
      sessionMinutes: PLAN_DEFAULTS.sessionMinutes,
      breakMinutes: PLAN_DEFAULTS.breakMinutes,
      sessionsPerDay: PLAN_DEFAULTS.sessionsPerDay,
      startDate: PLAN_DEFAULTS.startDate,
      weeks: PLAN_DEFAULTS.weeks,
      notes: PLAN_DEFAULTS.notes,
      tags: PLAN_DEFAULTS.tags.slice()
    };
    copyKnown(raw, spec);
    return finishPlan(raw);
  }

  function updatePlan(plan, changes) {
    if (!isRecord(plan)) {
      return fail('PLAN_NOT_OBJECT', 'plan', 'Plan must be a plain object.');
    }
    if (!isRecord(changes)) {
      return fail('CHANGES_NOT_OBJECT', 'changes', 'Changes must be a plain object.');
    }
    var raw = copyKnown({}, plan);
    copyKnown(raw, changes);
    return finishPlan(raw);
  }

  function round2(value) {
    return Math.round(value * 100) / 100;
  }

  function summarizePlan(plan) {
    var normalized = normalizePlan(plan);
    if (!normalized) return null;
    var sessionsPerWeek = normalized.days.length * normalized.sessionsPerDay;
    var focusMinutesPerWeek = sessionsPerWeek * normalized.sessionMinutes;
    var breakMinutesPerWeek = sessionsPerWeek * normalized.breakMinutes;
    var minutesPerWeek = focusMinutesPerWeek + breakMinutesPerWeek;
    var planMinutes = minutesPerWeek * normalized.weeks;
    return {
      daysPerWeek: normalized.days.length,
      sessionsPerWeek: sessionsPerWeek,
      focusMinutesPerWeek: focusMinutesPerWeek,
      breakMinutesPerWeek: breakMinutesPerWeek,
      minutesPerWeek: minutesPerWeek,
      hoursPerWeek: round2(minutesPerWeek / 60),
      planMinutes: planMinutes,
      planHours: round2(planMinutes / 60)
    };
  }

  function serialize(plan) {
    var normalized = normalizePlan(plan);
    if (!normalized) return null;
    if (!validatePlan(normalized).ok) return null;
    return JSON.stringify({ schemaVersion: SCHEMA_VERSION, plan: normalized });
  }

  function legacyToV1(document) {
    var raw = {};
    raw.id = typeof document.id === 'string' ? document.id : '';
    raw.name = hasOwn(document, 'title') ? document.title : document.name;
    raw.subject = document.subject;
    raw.days = hasOwn(document, 'weekdays') ? document.weekdays : document.days;
    raw.sessionMinutes = hasOwn(document, 'durationMinutes') ? document.durationMinutes : document.sessionMinutes;
    raw.breakMinutes = document.breakMinutes;
    raw.sessionsPerDay = document.sessionsPerDay;
    raw.startDate = isValidDateText(document.startDate) ? document.startDate : null;
    raw.weeks = document.weeks === undefined ? PLAN_DEFAULTS.weeks : document.weeks;
    raw.notes = document.notes;
    raw.tags = document.tags;
    raw.templateId = null;
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
      if (!isRecord(document.plan)) {
        return fail('PLAN_MISSING', 'plan', 'Version ' + SCHEMA_VERSION + ' documents must contain a plan object.');
      }
      return withMigrated(finishPlan(document.plan), null);
    }
    if (version === LEGACY_SCHEMA_VERSION) {
      return withMigrated(finishPlan(legacyToV1(document)), LEGACY_SCHEMA_VERSION);
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
    WEEKDAYS: WEEKDAYS.slice(),
    PLAN_DEFAULTS: PLAN_DEFAULTS,
    listTemplates: listTemplates,
    getTemplate: getTemplate,
    createPlanFromTemplate: createPlanFromTemplate,
    createCustomPlan: createCustomPlan,
    validatePlan: validatePlan,
    normalizePlan: normalizePlan,
    updatePlan: updatePlan,
    summarizePlan: summarizePlan,
    derivePlanId: derivePlanId,
    serialize: serialize,
    parse: parse,
    migrate: migrate
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.StudyPlanTemplatesEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
