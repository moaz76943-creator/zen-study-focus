/**
 * DEEP FOCUS — Room5 Focus Ritual Templates Engine
 * Schema-versioned, offline, reusable pre-focus rituals with ordered
 * step completion tracking.
 *
 * Pure module: CommonJS export, zero networking, zero persistence,
 * no timers, no randomness, no external dependencies.
 */
(function (global) {
  'use strict';

  var SCHEMA_VERSION = 1;
  var LEGACY_SCHEMA_VERSION = 0;

  var RITUAL_FIELDS = ['id', 'name', 'description', 'templateId', 'steps', 'notes', 'tags'];

  var LIMITS = {
    idPattern: /^[A-Za-z0-9_-]{1,64}$/,
    nameMax: 60,
    descriptionMax: 140,
    templateIdMax: 64,
    stepLabelMax: 60,
    stepNoteMax: 120,
    stepMinutesMin: 1,
    stepMinutesMax: 120,
    stepsMax: 20,
    notesMax: 280,
    tagsMax: 6,
    tagMaxLen: 24
  };

  var RITUAL_DEFAULTS = Object.freeze({
    description: '',
    steps: Object.freeze([]),
    notes: '',
    tags: Object.freeze([])
  });

  var STEP_DEFAULTS = Object.freeze({
    minutes: 2,
    note: ''
  });

  var STATUS_PENDING = 'pending';
  var STATUS_DONE = 'done';

  var BUILTIN_TEMPLATES = [
    {
      id: 'rit_deep_work',
      name: 'Deep Work Launch',
      description: 'A five step ramp into a long uninterrupted block.',
      templateId: null,
      steps: [
        { label: 'Clear the desk', minutes: 2, note: 'Keep only the current material.' },
        { label: 'Phone to Do Not Disturb', minutes: 1 },
        { label: 'Write one intention', minutes: 3, note: 'A single sentence on paper.' },
        { label: 'Open the single task', minutes: 1 },
        { label: 'Slow breath, then begin', minutes: 1 }
      ],
      notes: 'Run before any block longer than an hour.',
      tags: ['deep', 'launch']
    },
    {
      id: 'rit_exam_mode',
      name: 'Exam Mode',
      description: 'Settle the body and the tools before timed practice.',
      templateId: null,
      steps: [
        { label: 'Check desk supplies', minutes: 1, note: 'Pens, paper, calculator.' },
        { label: 'Fill the water bottle', minutes: 2 },
        { label: 'Silence all notifications', minutes: 1 },
        { label: 'Set the exam countdown', minutes: 1 },
        { label: 'Read a short confidence prompt', minutes: 2 }
      ],
      notes: 'Use before every mock exam.',
      tags: ['exam', 'calm']
    },
    {
      id: 'rit_quick_reset',
      name: 'Quick Reset',
      description: 'Reset between demanding blocks without losing momentum.',
      templateId: null,
      steps: [
        { label: 'Stand and stretch', minutes: 2 },
        { label: 'Refill water', minutes: 2 },
        { label: 'Look out a window', minutes: 1, note: 'Eyes off the screen.' },
        { label: 'Reset the desk surface', minutes: 2 },
        { label: 'Name the next single step', minutes: 1 }
      ],
      notes: 'Fits inside a ten minute break.',
      tags: ['break', 'reset']
    },
    {
      id: 'rit_study_sprint',
      name: 'Study Sprint',
      description: 'Short onboarding for a focused twenty five minute sprint.',
      templateId: null,
      steps: [
        { label: 'Choose the material set', minutes: 1 },
        { label: 'Set a 25 minute timer', minutes: 1 },
        { label: 'Park the phone out of reach', minutes: 1 },
        { label: 'Write the starting question', minutes: 2 },
        { label: 'Begin answering aloud', minutes: 1 }
      ],
      notes: 'Pair with a pomodoro style timer.',
      tags: ['sprint', 'short']
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

  function round2(value) {
    return Math.round(value * 100) / 100;
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

  function deriveRitualId(seed) {
    return 'rit_' + hashSeed(seed);
  }

  function deriveStepId(seed) {
    return 'rstp_' + hashSeed(seed);
  }

  function ritualSeed(name, description, steps) {
    var labels = [];
    for (var i = 0; i < steps.length; i++) labels.push(steps[i].label);
    return name + '|' + description + '|' + labels.join(',');
  }

  function shallowCopyRecord(record) {
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
      out.push(isRecord(value[i]) ? shallowCopyRecord(value[i]) : value[i]);
    }
    return out;
  }

  function copyKnown(target, source, fields) {
    if (!isRecord(source)) return target;
    for (var i = 0; i < fields.length; i++) {
      var key = fields[i];
      if (key === '__proto__' || !hasOwn(source, key)) continue;
      target[key] = cloneValue(source[key]);
    }
    return target;
  }

  function normalizeStep(input, index) {
    if (!isRecord(input)) return null;
    var label = text(input.label, LIMITS.stepLabelMax);
    if (!label) return null;
    var minutes = clampInt(input.minutes, LIMITS.stepMinutesMin, LIMITS.stepMinutesMax, STEP_DEFAULTS.minutes);
    var id = typeof input.id === 'string' ? input.id.trim() : '';
    if (!LIMITS.idPattern.test(id)) {
      id = deriveStepId(label + '|' + minutes + '|' + index);
    }
    return {
      id: id,
      label: label,
      minutes: minutes,
      note: typeof input.note === 'string' ? input.note.trim().slice(0, LIMITS.stepNoteMax) : ''
    };
  }

  function normalizeSteps(value) {
    if (!Array.isArray(value)) return [];
    var picked = [];
    for (var i = 0; i < value.length && picked.length < LIMITS.stepsMax; i++) {
      var step = normalizeStep(value[i], i);
      if (step) picked.push(step);
    }
    return picked;
  }

  function normalizeRitual(input) {
    if (!isRecord(input)) return null;
    var name = text(input.name, LIMITS.nameMax);
    if (!name) return null;
    if (input.steps !== undefined && !Array.isArray(input.steps)) return null;
    var description = text(input.description, LIMITS.descriptionMax);
    var steps = normalizeSteps(input.steps);
    if (!steps.length) return null;
    var id = typeof input.id === 'string' ? input.id.trim() : '';
    if (!LIMITS.idPattern.test(id)) id = deriveRitualId(ritualSeed(name, description, steps));
    var templateId = typeof input.templateId === 'string' && input.templateId.trim() ? input.templateId.trim() : null;
    return {
      id: id,
      name: name,
      description: description,
      templateId: templateId,
      steps: steps,
      notes: typeof input.notes === 'string' ? input.notes.trim().slice(0, LIMITS.notesMax) : '',
      tags: normalizeTags(input.tags)
    };
  }

  function ritualErrors(ritual) {
    var errors = validateRitual(ritual).errors;
    if (!errors.length) {
      errors.push({ code: 'RITUAL_INVALID', field: 'ritual', message: 'Ritual could not be normalized.' });
    }
    return { ok: false, errors: errors };
  }

  function finishRitual(raw) {
    var normalized = normalizeRitual(raw);
    if (!normalized) return ritualErrors(raw);
    return { ok: true, ritual: normalized };
  }

  function listTemplates() {
    return BUILTIN_TEMPLATES.map(function (template) {
      return copyKnown({}, template, RITUAL_FIELDS);
    });
  }

  function getTemplate(templateId) {
    if (typeof templateId !== 'string') return null;
    for (var i = 0; i < BUILTIN_TEMPLATES.length; i++) {
      if (BUILTIN_TEMPLATES[i].id === templateId) {
        return copyKnown({}, BUILTIN_TEMPLATES[i], RITUAL_FIELDS);
      }
    }
    return null;
  }

  function createRitualFromTemplate(templateId, overrides) {
    if (!isRecord(overrides)) {
      return fail('OVERRIDES_NOT_OBJECT', 'overrides', 'Overrides must be a plain object.');
    }
    var template = getTemplate(templateId);
    if (!template) {
      return fail('TEMPLATE_NOT_FOUND', 'templateId', 'Unknown focus ritual template: ' + String(templateId) + '.');
    }
    var raw = copyKnown({}, template, RITUAL_FIELDS);
    delete raw.id;
    copyKnown(raw, overrides, RITUAL_FIELDS);
    if (!hasOwn(overrides, 'templateId')) raw.templateId = template.id;
    return finishRitual(raw);
  }

  function createCustomRitual(spec) {
    if (!isRecord(spec)) {
      return fail('SPEC_NOT_OBJECT', 'spec', 'Custom ritual specification must be a plain object.');
    }
    var raw = {
      id: '',
      name: '',
      description: RITUAL_DEFAULTS.description,
      templateId: null,
      steps: [],
      notes: RITUAL_DEFAULTS.notes,
      tags: []
    };
    copyKnown(raw, spec, RITUAL_FIELDS);
    return finishRitual(raw);
  }

  function validateStepEntry(step, position, errors) {
    function add(code, message) {
      errors.push({ code: code, field: 'steps', message: message });
    }
    if (!isRecord(step)) {
      add('STEP_NOT_OBJECT', 'Step at position ' + position + ' must be a plain object.');
      return;
    }
    if (
      step.id !== undefined &&
      step.id !== '' &&
      (typeof step.id !== 'string' || !LIMITS.idPattern.test(step.id))
    ) {
      add('STEP_ID_INVALID', 'Step at position ' + position + ' has an invalid id.');
    }
    if (typeof step.label !== 'string' || !step.label.trim()) {
      add('STEP_LABEL_REQUIRED', 'Step at position ' + position + ' requires a label.');
    } else if (step.label.trim().length > LIMITS.stepLabelMax) {
      add(
        'STEP_LABEL_TOO_LONG',
        'Step at position ' + position + ' label must be at most ' + LIMITS.stepLabelMax + ' characters.'
      );
    }
    if (
      step.minutes !== undefined &&
      (!Number.isInteger(step.minutes) ||
        step.minutes < LIMITS.stepMinutesMin ||
        step.minutes > LIMITS.stepMinutesMax)
    ) {
      add(
        'STEP_MINUTES_RANGE',
        'Step at position ' +
          position +
          ' minutes must be an integer between ' +
          LIMITS.stepMinutesMin +
          ' and ' +
          LIMITS.stepMinutesMax +
          '.'
      );
    }
    if (step.note !== undefined && typeof step.note !== 'string') {
      add('STEP_NOTE_INVALID', 'Step at position ' + position + ' note must be a string.');
    } else if (typeof step.note === 'string' && step.note.length > LIMITS.stepNoteMax) {
      add(
        'STEP_NOTE_TOO_LONG',
        'Step at position ' + position + ' note must be at most ' + LIMITS.stepNoteMax + ' characters.'
      );
    }
  }

  function validateRitual(input) {
    if (!isRecord(input)) {
      return errorList([['RITUAL_NOT_OBJECT', 'ritual', 'Ritual must be a plain object.']]);
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
      add('ID_INVALID', 'id', 'Ritual id must match ' + LIMITS.idPattern.source + '.');
    }
    if (typeof input.name !== 'string' || !input.name.trim()) {
      add('NAME_REQUIRED', 'name', 'Ritual name is required.');
    } else if (input.name.trim().length > LIMITS.nameMax) {
      add('NAME_TOO_LONG', 'name', 'Ritual name must be at most ' + LIMITS.nameMax + ' characters.');
    }
    if (input.description !== undefined && typeof input.description !== 'string') {
      add('DESCRIPTION_INVALID', 'description', 'Description must be a string.');
    } else if (typeof input.description === 'string' && input.description.trim().length > LIMITS.descriptionMax) {
      add('DESCRIPTION_TOO_LONG', 'description', 'Description must be at most ' + LIMITS.descriptionMax + ' characters.');
    }
    if (input.templateId !== null && input.templateId !== undefined) {
      if (typeof input.templateId !== 'string' || !input.templateId.trim()) {
        add('TEMPLATE_ID_INVALID', 'templateId', 'Template id must be null or a non-empty string.');
      } else if (input.templateId.trim().length > LIMITS.templateIdMax) {
        add('TEMPLATE_ID_INVALID', 'templateId', 'Template id is too long.');
      }
    }

    if (input.steps !== undefined && !Array.isArray(input.steps)) {
      add('STEPS_INVALID', 'steps', 'Steps must be an array of step objects.');
    } else if (Array.isArray(input.steps)) {
      if (input.steps.length === 0) {
        add('STEPS_EMPTY', 'steps', 'At least one ritual step is required.');
      } else if (input.steps.length > LIMITS.stepsMax) {
        add('STEPS_LIMIT', 'steps', 'At most ' + LIMITS.stepsMax + ' steps are allowed.');
      }
      var seenStepIds = [];
      for (var i = 0; i < input.steps.length; i++) {
        var entry = input.steps[i];
        validateStepEntry(entry, i, errors);
        if (isRecord(entry) && typeof entry.id === 'string' && LIMITS.idPattern.test(entry.id)) {
          if (seenStepIds.indexOf(entry.id) !== -1) {
            add('STEP_DUPLICATE_ID', 'steps', 'Duplicate step id: ' + entry.id + '.');
          } else {
            seenStepIds.push(entry.id);
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

  function updateRitual(ritual, changes) {
    if (!isRecord(ritual)) {
      return fail('RITUAL_NOT_OBJECT', 'ritual', 'Ritual must be a plain object.');
    }
    if (!isRecord(changes)) {
      return fail('CHANGES_NOT_OBJECT', 'changes', 'Changes must be a plain object.');
    }
    var raw = copyKnown({}, ritual, RITUAL_FIELDS);
    copyKnown(raw, changes, RITUAL_FIELDS);
    return finishRitual(raw);
  }

  function summarizeRitual(ritual) {
    var normalized = normalizeRitual(ritual);
    if (!normalized) return null;
    var totalMinutes = 0;
    for (var i = 0; i < normalized.steps.length; i++) totalMinutes += normalized.steps[i].minutes;
    return {
      stepCount: normalized.steps.length,
      totalMinutes: totalMinutes,
      firstStepLabel: normalized.steps[0].label,
      lastStepLabel: normalized.steps[normalized.steps.length - 1].label
    };
  }

  function buildRun(ritualId, ritualName, steps) {
    var completedCount = 0;
    for (var i = 0; i < steps.length; i++) {
      if (steps[i].status === STATUS_DONE) completedCount++;
    }
    return {
      ritualId: ritualId,
      ritualName: ritualName,
      steps: steps,
      completedCount: completedCount,
      totalSteps: steps.length,
      completed: completedCount === steps.length
    };
  }

  function normalizeRun(input) {
    if (!isRecord(input)) return null;
    if (!Array.isArray(input.steps) || !input.steps.length) return null;
    var ritualName = text(input.ritualName, LIMITS.nameMax);
    if (!ritualName) return null;
    var steps = [];
    for (var i = 0; i < input.steps.length; i++) {
      var entry = input.steps[i];
      if (!isRecord(entry)) return null;
      var status = entry.status;
      if (status !== STATUS_PENDING && status !== STATUS_DONE) return null;
      var label = text(entry.label, LIMITS.stepLabelMax);
      if (!label) return null;
      var minutes = clampInt(entry.minutes, LIMITS.stepMinutesMin, LIMITS.stepMinutesMax, STEP_DEFAULTS.minutes);
      var id = typeof entry.id === 'string' ? entry.id.trim() : '';
      if (!LIMITS.idPattern.test(id)) id = deriveStepId(label + '|' + minutes + '|' + i);
      steps.push({
        id: id,
        label: label,
        minutes: minutes,
        note: typeof entry.note === 'string' ? entry.note.trim().slice(0, LIMITS.stepNoteMax) : '',
        status: status
      });
    }
    var ritualId = typeof input.ritualId === 'string' ? input.ritualId.trim() : '';
    if (!LIMITS.idPattern.test(ritualId)) ritualId = deriveRitualId(ritualName + '|' + steps.length);
    return buildRun(ritualId, ritualName, steps);
  }

  function runErrors(run) {
    if (!isRecord(run)) {
      return fail('RUN_NOT_OBJECT', 'run', 'Run must be a plain object.');
    }
    return fail('RUN_INVALID', 'run', 'Run could not be normalized.');
  }

  function startRun(ritual) {
    if (!isRecord(ritual)) {
      return fail('RITUAL_NOT_OBJECT', 'ritual', 'Ritual must be a plain object.');
    }
    var normalized = normalizeRitual(ritual);
    if (!normalized) return ritualErrors(ritual);
    var steps = [];
    for (var i = 0; i < normalized.steps.length; i++) {
      steps.push({
        id: normalized.steps[i].id,
        label: normalized.steps[i].label,
        minutes: normalized.steps[i].minutes,
        note: normalized.steps[i].note,
        status: STATUS_PENDING
      });
    }
    return { ok: true, run: buildRun(normalized.id, normalized.name, steps) };
  }

  function completeStep(run, stepId) {
    if (!isRecord(run)) {
      return fail('RUN_NOT_OBJECT', 'run', 'Run must be a plain object.');
    }
    if (typeof stepId !== 'string' || !stepId.trim()) {
      return fail('STEP_ID_INVALID', 'stepId', 'Step id must be a non-empty string.');
    }
    var base = normalizeRun(run);
    if (!base) return runErrors(run);
    var key = stepId.trim();
    var target = null;
    var nextPending = null;
    for (var i = 0; i < base.steps.length; i++) {
      if (nextPending === null && base.steps[i].status === STATUS_PENDING) nextPending = base.steps[i];
      if (base.steps[i].id === key) target = base.steps[i];
    }
    if (!target) {
      return fail('STEP_NOT_FOUND', 'stepId', 'No step with id: ' + key + '.');
    }
    if (target.status === STATUS_DONE) {
      return fail('STEP_ALREADY_COMPLETE', 'stepId', 'Step is already complete: ' + key + '.');
    }
    if (nextPending !== null && target.id !== nextPending.id) {
      return fail('STEP_OUT_OF_ORDER', 'stepId', 'Complete steps in order; next pending step is: ' + nextPending.id + '.');
    }
    var steps = [];
    for (i = 0; i < base.steps.length; i++) {
      var step = base.steps[i];
      steps.push({
        id: step.id,
        label: step.label,
        minutes: step.minutes,
        note: step.note,
        status: step.id === key ? STATUS_DONE : step.status
      });
    }
    return { ok: true, run: buildRun(base.ritualId, base.ritualName, steps) };
  }

  function resetRun(run) {
    if (!isRecord(run)) {
      return fail('RUN_NOT_OBJECT', 'run', 'Run must be a plain object.');
    }
    var base = normalizeRun(run);
    if (!base) return runErrors(run);
    var steps = [];
    for (var i = 0; i < base.steps.length; i++) {
      var step = base.steps[i];
      steps.push({
        id: step.id,
        label: step.label,
        minutes: step.minutes,
        note: step.note,
        status: STATUS_PENDING
      });
    }
    return { ok: true, run: buildRun(base.ritualId, base.ritualName, steps) };
  }

  function summarizeRun(run) {
    var normalized = normalizeRun(run);
    if (!normalized) return null;
    var pendingCount = normalized.totalSteps - normalized.completedCount;
    var nextStepId = null;
    var nextStepLabel = null;
    for (var i = 0; i < normalized.steps.length; i++) {
      if (normalized.steps[i].status === STATUS_PENDING) {
        nextStepId = normalized.steps[i].id;
        nextStepLabel = normalized.steps[i].label;
        break;
      }
    }
    return {
      totalSteps: normalized.totalSteps,
      completedCount: normalized.completedCount,
      pendingCount: pendingCount,
      percent: round2(normalized.completedCount * 100 / normalized.totalSteps),
      completed: normalized.completed,
      nextStepId: nextStepId,
      nextStepLabel: nextStepLabel
    };
  }

  function serialize(ritual) {
    var normalized = normalizeRitual(ritual);
    if (!normalized) return null;
    if (!validateRitual(normalized).ok) return null;
    return JSON.stringify({ schemaVersion: SCHEMA_VERSION, ritual: normalized });
  }

  function legacyToV1(document) {
    var raw = {
      id: typeof document.id === 'string' ? document.id : '',
      name: hasOwn(document, 'title') ? document.title : document.name,
      description: hasOwn(document, 'purpose') ? document.purpose : document.description,
      templateId: null,
      steps: [],
      notes: document.notes,
      tags: document.tags
    };
    var source = hasOwn(document, 'checklist') ? document.checklist : document.steps;
    if (Array.isArray(source)) {
      for (var i = 0; i < source.length; i++) {
        var entry = source[i];
        if (!isRecord(entry)) continue;
        var label = hasOwn(entry, 'text') ? entry.text : hasOwn(entry, 'label') ? entry.label : entry.name;
        raw.steps.push({ label: label, minutes: hasOwn(entry, 'durationMinutes') ? entry.durationMinutes : entry.minutes });
      }
    }
    return raw;
  }

  function withMigrated(result, from) {
    if (!result.ok) return result;
    return { ok: true, ritual: result.ritual, migratedFrom: from };
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
      if (!isRecord(document.ritual)) {
        return fail('RITUAL_MISSING', 'ritual', 'Version ' + SCHEMA_VERSION + ' documents must contain a ritual object.');
      }
      return withMigrated(finishRitual(document.ritual), null);
    }
    if (version === LEGACY_SCHEMA_VERSION) {
      return withMigrated(finishRitual(legacyToV1(document)), LEGACY_SCHEMA_VERSION);
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
    RITUAL_DEFAULTS: RITUAL_DEFAULTS,
    listTemplates: listTemplates,
    getTemplate: getTemplate,
    createRitualFromTemplate: createRitualFromTemplate,
    createCustomRitual: createCustomRitual,
    validateRitual: validateRitual,
    normalizeRitual: normalizeRitual,
    updateRitual: updateRitual,
    summarizeRitual: summarizeRitual,
    startRun: startRun,
    completeStep: completeStep,
    resetRun: resetRun,
    summarizeRun: summarizeRun,
    deriveRitualId: deriveRitualId,
    deriveStepId: deriveStepId,
    serialize: serialize,
    parse: parse,
    migrate: migrate
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.FocusRitualTemplatesEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
