/**
 * DEEP FOCUS — Room5 Recovery Break Menu Engine
 * Schema-versioned, offline study/sport/work break catalog with
 * deterministic, signal-driven break suggestions and plan timelines.
 *
 * Pure module: CommonJS export, zero networking, zero persistence,
 * no timers, no randomness, no external dependencies.
 */
(function (global) {
  'use strict';

  var SCHEMA_VERSION = 1;
  var LEGACY_SCHEMA_VERSION = 0;

  var CONTEXTS = ['study', 'sport', 'work'];
  var GENERIC_CONTEXT = 'any';
  var CATEGORIES = ['breath', 'eyes', 'hydration', 'movement', 'posture', 'social'];
  var INTENSITIES = ['rest', 'light', 'moderate'];

  var BREAK_FIELDS = [
    'id',
    'name',
    'context',
    'category',
    'durationMinutes',
    'intensity',
    'description',
    'equipment',
    'tags'
  ];

  var LIMITS = {
    idPattern: /^[A-Za-z0-9_-]{1,64}$/,
    nameMax: 60,
    descriptionMax: 200,
    durationMinutesMin: 1,
    durationMinutesMax: 60,
    equipmentMax: 4,
    equipmentItemMaxLen: 24,
    tagsMax: 6,
    tagMaxLen: 24,
    minutesAvailableMin: 1,
    minutesAvailableMax: 120,
    minutesAvailableDefault: 5,
    focusMinutesMin: 0,
    focusMinutesMax: 600,
    seedMax: 64
  };

  var SCORE = {
    contextExact: 40,
    contextGeneric: 15,
    durationFit: 25,
    durationClosenessMax: 10,
    intensityMatch: 15,
    categoryMatch: 12,
    focusExtended: 8,
    focusDeep: 5,
    focusExtendedAt: 45,
    focusDeepAt: 90
  };

  var BREAK_DEFAULTS = Object.freeze({
    context: GENERIC_CONTEXT,
    category: 'movement',
    durationMinutes: 5,
    intensity: 'light',
    description: '',
    equipment: Object.freeze([]),
    tags: Object.freeze([])
  });

  var CATALOG = [
    {
      id: 'brk_eye_look_distance',
      name: 'Eye Look Distance',
      context: 'study',
      category: 'eyes',
      durationMinutes: 2,
      intensity: 'rest',
      description: 'Look twenty metres away and blink slowly.',
      equipment: [],
      tags: ['eyes', 'desk']
    },
    {
      id: 'brk_eyes_palming',
      name: 'Eye Palming',
      context: 'study',
      category: 'eyes',
      durationMinutes: 3,
      intensity: 'rest',
      description: 'Warm the palms and cup them over closed eyes.',
      equipment: [],
      tags: ['eyes', 'calm']
    },
    {
      id: 'brk_neck_shoulder_release',
      name: 'Neck and Shoulder Release',
      context: 'study',
      category: 'movement',
      durationMinutes: 4,
      intensity: 'light',
      description: 'Slow neck turns with easy shoulder rolls.',
      equipment: [],
      tags: ['neck', 'desk']
    },
    {
      id: 'brk_wrist_forearm_stretch',
      name: 'Wrist and Forearm Stretch',
      context: 'study',
      category: 'movement',
      durationMinutes: 3,
      intensity: 'light',
      description: 'Extend each arm and ease the wrist back gently.',
      equipment: [],
      tags: ['typing', 'desk']
    },
    {
      id: 'brk_standing_posture_reset',
      name: 'Standing Posture Reset',
      context: 'work',
      category: 'posture',
      durationMinutes: 3,
      intensity: 'light',
      description: 'Stand tall, stack the spine and roll the shoulders back.',
      equipment: [],
      tags: ['posture', 'desk']
    },
    {
      id: 'brk_brisk_walk',
      name: 'Brisk Walk',
      context: 'work',
      category: 'movement',
      durationMinutes: 10,
      intensity: 'moderate',
      description: 'Walk at a brisk pace away from the desk.',
      equipment: [],
      tags: ['steps', 'cardio']
    },
    {
      id: 'brk_desk_squats',
      name: 'Desk Squats',
      context: 'work',
      category: 'movement',
      durationMinutes: 5,
      intensity: 'moderate',
      description: 'Ten slow bodyweight squats beside the chair.',
      equipment: [],
      tags: ['legs']
    },
    {
      id: 'brk_wall_sit_hold',
      name: 'Wall Sit Hold',
      context: 'sport',
      category: 'movement',
      durationMinutes: 2,
      intensity: 'moderate',
      description: 'Hold a wall sit with knees stacked over ankles.',
      equipment: [],
      tags: ['legs', 'strength']
    },
    {
      id: 'brk_light_mobility_flow',
      name: 'Light Mobility Flow',
      context: 'sport',
      category: 'movement',
      durationMinutes: 8,
      intensity: 'moderate',
      description: 'Hips, ankles and thoracic spine through a gentle flow.',
      equipment: [],
      tags: ['mobility', 'warmdown']
    },
    {
      id: 'brk_box_breathing',
      name: 'Box Breathing',
      context: GENERIC_CONTEXT,
      category: 'breath',
      durationMinutes: 5,
      intensity: 'rest',
      description: 'Four-count inhale, hold, exhale and hold.',
      equipment: [],
      tags: ['breath', 'calm']
    },
    {
      id: 'brk_hydration_glass',
      name: 'Hydration Glass',
      context: GENERIC_CONTEXT,
      category: 'hydration',
      durationMinutes: 1,
      intensity: 'rest',
      description: 'Drink one full glass of water slowly.',
      equipment: [],
      tags: ['water']
    },
    {
      id: 'brk_social_checkin',
      name: 'Social Check-in',
      context: GENERIC_CONTEXT,
      category: 'social',
      durationMinutes: 5,
      intensity: 'rest',
      description: 'Have a short unhurried conversation with a colleague.',
      equipment: [],
      tags: ['social']
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

  function normalizeContext(value, fallback) {
    if (typeof value !== 'string') return fallback;
    var key = value.trim().toLowerCase();
    if (key === GENERIC_CONTEXT) return GENERIC_CONTEXT;
    for (var i = 0; i < CONTEXTS.length; i++) {
      if (CONTEXTS[i] === key) return key;
    }
    return fallback;
  }

  function isContext(value) {
    return typeof value === 'string' && (value === GENERIC_CONTEXT || CONTEXTS.indexOf(value) !== -1);
  }

  function normalizeCategory(value, fallback) {
    if (typeof value !== 'string') return fallback;
    var key = value.trim().toLowerCase();
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i] === key) return key;
    }
    return fallback;
  }

  function isCategory(value) {
    return typeof value === 'string' && CATEGORIES.indexOf(value) !== -1;
  }

  function normalizeIntensity(value, fallback) {
    if (typeof value !== 'string') return fallback;
    var key = value.trim().toLowerCase();
    for (var i = 0; i < INTENSITIES.length; i++) {
      if (INTENSITIES[i] === key) return key;
    }
    return fallback;
  }

  function isIntensity(value) {
    return typeof value === 'string' && INTENSITIES.indexOf(value) !== -1;
  }

  function normalizeList(value, maxItems, maxLen) {
    if (!Array.isArray(value)) return [];
    var picked = [];
    for (var i = 0; i < value.length && picked.length < maxItems; i++) {
      if (typeof value[i] !== 'string') continue;
      var entry = value[i].trim().slice(0, maxLen);
      if (!entry) continue;
      if (picked.indexOf(entry) !== -1) continue;
      picked.push(entry);
    }
    return picked;
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
    for (var i = 0; i < BREAK_FIELDS.length; i++) {
      var key = BREAK_FIELDS[i];
      if (key === '__proto__' || !hasOwn(source, key)) continue;
      target[key] = cloneValue(source[key]);
    }
    return target;
  }

  function deriveBreakId(seed) {
    var input = String(seed === undefined || seed === null ? '' : seed);
    var hash = 0x811c9dc5;
    for (var i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return 'brk_' + ('00000000' + hash.toString(16)).slice(-8);
  }

  function breakSeed(context, category, durationMinutes, name) {
    return context + '|' + category + '|' + durationMinutes + '|' + name;
  }

  function listCatalog() {
    return CATALOG.map(function (item) {
      return copyKnown({}, item);
    });
  }

  function listByContext(context) {
    if (!isContext(context)) return [];
    var out = [];
    for (var i = 0; i < CATALOG.length; i++) {
      if (CATALOG[i].context === context) out.push(copyKnown({}, CATALOG[i]));
    }
    return out;
  }

  function getBreak(breakId) {
    if (typeof breakId !== 'string') return null;
    for (var i = 0; i < CATALOG.length; i++) {
      if (CATALOG[i].id === breakId) return copyKnown({}, CATALOG[i]);
    }
    return null;
  }

  function validateBreak(breakItem) {
    if (!isRecord(breakItem)) {
      return { ok: false, errors: [{ code: 'BREAK_NOT_OBJECT', field: 'break', message: 'Break must be a plain object.' }] };
    }
    var errors = [];

    function add(code, field, message) {
      errors.push({ code: code, field: field, message: message });
    }

    if (typeof breakItem.id !== 'string' || !LIMITS.idPattern.test(breakItem.id)) {
      add('ID_INVALID', 'id', 'Break id must match ' + LIMITS.idPattern.source + '.');
    }
    if (typeof breakItem.name !== 'string' || !breakItem.name.trim()) {
      add('NAME_REQUIRED', 'name', 'Break name is required.');
    } else if (breakItem.name.trim().length > LIMITS.nameMax) {
      add('NAME_TOO_LONG', 'name', 'Break name must be at most ' + LIMITS.nameMax + ' characters.');
    }
    if (!isContext(breakItem.context)) {
      add('CONTEXT_INVALID', 'context', 'Context must be one of: ' + CONTEXTS.join(', ') + ', ' + GENERIC_CONTEXT + '.');
    }
    if (!isCategory(breakItem.category)) {
      add('CATEGORY_INVALID', 'category', 'Category must be one of: ' + CATEGORIES.join(', ') + '.');
    }
    if (!isIntensity(breakItem.intensity)) {
      add('INTENSITY_INVALID', 'intensity', 'Intensity must be one of: ' + INTENSITIES.join(', ') + '.');
    }
    if (!Number.isInteger(breakItem.durationMinutes) || breakItem.durationMinutes < LIMITS.durationMinutesMin || breakItem.durationMinutes > LIMITS.durationMinutesMax) {
      add('DURATION_MINUTES_RANGE', 'durationMinutes', 'Duration must be an integer between ' + LIMITS.durationMinutesMin + ' and ' + LIMITS.durationMinutesMax + ' minutes.');
    }
    if (typeof breakItem.description !== 'string') {
      add('DESCRIPTION_INVALID', 'description', 'Description must be a string.');
    } else if (breakItem.description.length > LIMITS.descriptionMax) {
      add('DESCRIPTION_TOO_LONG', 'description', 'Description must be at most ' + LIMITS.descriptionMax + ' characters.');
    }

    if (!Array.isArray(breakItem.equipment)) {
      add('EQUIPMENT_INVALID', 'equipment', 'Equipment must be an array of strings.');
    } else {
      if (breakItem.equipment.length > LIMITS.equipmentMax) {
        add('EQUIPMENT_LIMIT', 'equipment', 'At most ' + LIMITS.equipmentMax + ' equipment entries are allowed.');
      }
      var seenEquipment = [];
      for (var e = 0; e < breakItem.equipment.length; e++) {
        var gear = breakItem.equipment[e];
        if (typeof gear !== 'string' || !gear.trim()) {
          add('EQUIPMENT_INVALID', 'equipment', 'Equipment at position ' + e + ' must be a non-empty string.');
          continue;
        }
        if (gear.trim().length > LIMITS.equipmentItemMaxLen) {
          add('EQUIPMENT_INVALID', 'equipment', 'Equipment at position ' + e + ' must be at most ' + LIMITS.equipmentItemMaxLen + ' characters.');
        }
        var gearKey = gear.trim();
        if (seenEquipment.indexOf(gearKey) !== -1) {
          add('EQUIPMENT_DUPLICATE', 'equipment', 'Duplicate equipment: ' + gearKey + '.');
        } else {
          seenEquipment.push(gearKey);
        }
      }
    }

    if (!Array.isArray(breakItem.tags)) {
      add('TAGS_INVALID', 'tags', 'Tags must be an array of strings.');
    } else {
      if (breakItem.tags.length > LIMITS.tagsMax) {
        add('TAGS_LIMIT', 'tags', 'At most ' + LIMITS.tagsMax + ' tags are allowed.');
      }
      var seenTags = [];
      for (var t = 0; t < breakItem.tags.length; t++) {
        var tag = breakItem.tags[t];
        if (typeof tag !== 'string' || !tag.trim()) {
          add('TAGS_INVALID', 'tags', 'Tag at position ' + t + ' must be a non-empty string.');
          continue;
        }
        if (tag.trim().length > LIMITS.tagMaxLen) {
          add('TAGS_INVALID', 'tags', 'Tag at position ' + t + ' must be at most ' + LIMITS.tagMaxLen + ' characters.');
        }
        var tagKey = tag.trim();
        if (seenTags.indexOf(tagKey) !== -1) {
          add('TAGS_DUPLICATE', 'tags', 'Duplicate tag: ' + tagKey + '.');
        } else {
          seenTags.push(tagKey);
        }
      }
    }

    return { ok: errors.length === 0, errors: errors };
  }

  function normalizeBreak(breakItem) {
    if (!isRecord(breakItem)) return null;
    var name = text(breakItem.name, LIMITS.nameMax);
    if (!name) return null;
    var context = normalizeContext(breakItem.context, BREAK_DEFAULTS.context);
    var category = normalizeCategory(breakItem.category, BREAK_DEFAULTS.category);
    var durationMinutes = clampInt(breakItem.durationMinutes, LIMITS.durationMinutesMin, LIMITS.durationMinutesMax, BREAK_DEFAULTS.durationMinutes);
    var id = typeof breakItem.id === 'string' ? breakItem.id.trim() : '';
    if (!LIMITS.idPattern.test(id)) {
      id = deriveBreakId(breakSeed(context, category, durationMinutes, name));
    }
    return {
      id: id,
      name: name,
      context: context,
      category: category,
      durationMinutes: durationMinutes,
      intensity: normalizeIntensity(breakItem.intensity, BREAK_DEFAULTS.intensity),
      description: text(breakItem.description, LIMITS.descriptionMax),
      equipment: normalizeList(breakItem.equipment, LIMITS.equipmentMax, LIMITS.equipmentItemMaxLen),
      tags: normalizeList(breakItem.tags, LIMITS.tagsMax, LIMITS.tagMaxLen)
    };
  }

  function finishBreak(raw) {
    var normalized = normalizeBreak(raw);
    if (!normalized) {
      var errors = validateBreak(raw).errors;
      if (!errors.length) {
        errors.push({ code: 'BREAK_INVALID', field: 'break', message: 'Break could not be normalized.' });
      }
      return { ok: false, errors: errors };
    }
    return { ok: true, item: normalized };
  }

  function createCustomBreak(spec) {
    if (!isRecord(spec)) {
      return fail('SPEC_NOT_OBJECT', 'spec', 'Custom break specification must be a plain object.');
    }
    var raw = {
      id: '',
      name: '',
      context: BREAK_DEFAULTS.context,
      category: BREAK_DEFAULTS.category,
      durationMinutes: BREAK_DEFAULTS.durationMinutes,
      intensity: BREAK_DEFAULTS.intensity,
      description: BREAK_DEFAULTS.description,
      equipment: cloneValue(BREAK_DEFAULTS.equipment),
      tags: cloneValue(BREAK_DEFAULTS.tags)
    };
    copyKnown(raw, spec);
    return finishBreak(raw);
  }

  function updateBreak(breakItem, changes) {
    if (!isRecord(breakItem)) {
      return fail('BREAK_NOT_OBJECT', 'break', 'Break must be a plain object.');
    }
    if (!isRecord(changes)) {
      return fail('CHANGES_NOT_OBJECT', 'changes', 'Changes must be a plain object.');
    }
    var raw = copyKnown({}, breakItem);
    copyKnown(raw, changes);
    return finishBreak(raw);
  }

  function optionIdSet(value) {
    var out = [];
    if (!Array.isArray(value)) return out;
    for (var i = 0; i < value.length; i++) {
      if (typeof value[i] !== 'string') continue;
      var id = value[i].trim();
      if (id && out.indexOf(id) === -1) out.push(id);
    }
    return out;
  }

  function isEligibleForContext(item, context) {
    return item.context === context || item.context === GENERIC_CONTEXT;
  }

  function scoreBreak(item, signals) {
    var score = 0;
    var reasons = [];
    if (item.context === signals.context) {
      score += SCORE.contextExact;
      reasons.push('context:' + item.context);
    } else {
      score += SCORE.contextGeneric;
      reasons.push('context:generic');
    }
    score += SCORE.durationFit;
    reasons.push('duration:fits');
    score += Math.round((item.durationMinutes / signals.minutesAvailable) * SCORE.durationClosenessMax);
    if (signals.intensity !== null && item.intensity === signals.intensity) {
      score += SCORE.intensityMatch;
      reasons.push('intensity:match');
    }
    if (signals.category !== null && item.category === signals.category) {
      score += SCORE.categoryMatch;
      reasons.push('category:match');
    }
    if (signals.focusMinutes >= SCORE.focusExtendedAt && (item.category === 'movement' || item.category === 'posture')) {
      score += SCORE.focusExtended;
      reasons.push('focus:extended');
      if (signals.focusMinutes >= SCORE.focusDeepAt && item.category === 'movement') {
        score += SCORE.focusDeep;
        reasons.push('focus:deep');
      }
    }
    return { score: score, reasons: reasons };
  }

  function suggestionTiebreak(seed, id) {
    var input = seed + '|' + id;
    var hash = 0x811c9dc5;
    for (var i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash >>> 0;
  }

  function suggestBreakes(context, options) {
    if (!isContext(context)) {
      return fail('CONTEXT_UNKNOWN', 'context', 'Context must be one of: ' + CONTEXTS.join(', ') + '.');
    }
    if (!isRecord(options)) {
      if (options === undefined || options === null) options = {};
      else return fail('OPTIONS_NOT_OBJECT', 'options', 'Options must be a plain object.');
    }
    var signals = {
      context: context,
      minutesAvailable: clampInt(options.minutesAvailable, LIMITS.minutesAvailableMin, LIMITS.minutesAvailableMax, LIMITS.minutesAvailableDefault),
      intensity: isIntensity(options.intensity) ? options.intensity : null,
      category: isCategory(options.category) ? options.category : null,
      focusMinutes: clampInt(options.focusMinutes, LIMITS.focusMinutesMin, LIMITS.focusMinutesMax, 0),
      excludeIds: optionIdSet(options.excludeIds),
      includeTags: optionIdSet(options.includeTags),
      seed: text(options.seed, LIMITS.seedMax)
    };

    var candidates = [];
    for (var i = 0; i < CATALOG.length; i++) {
      var item = CATALOG[i];
      if (!isEligibleForContext(item, context)) continue;
      if (item.durationMinutes > signals.minutesAvailable) continue;
      if (signals.excludeIds.indexOf(item.id) !== -1) continue;
      if (signals.includeTags.length) {
        var tagged = false;
        for (var t = 0; t < item.tags.length; t++) {
          if (signals.includeTags.indexOf(item.tags[t]) !== -1) {
            tagged = true;
            break;
          }
        }
        if (!tagged) continue;
      }
      var scored = scoreBreak(item, signals);
      var copy = copyKnown({}, item);
      copy.score = scored.score;
      copy.reasons = scored.reasons;
      candidates.push({ item: copy, tiebreak: suggestionTiebreak(signals.seed, item.id) });
    }

    candidates.sort(function (a, b) {
      if (b.item.score !== a.item.score) return b.item.score - a.item.score;
      if (a.tiebreak !== b.tiebreak) return a.tiebreak - b.tiebreak;
      return a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0;
    });

    var suggestions = candidates.map(function (entry) {
      return entry.item;
    });
    return {
      ok: true,
      context: context,
      minutesAvailable: signals.minutesAvailable,
      count: suggestions.length,
      suggestions: suggestions
    };
  }

  function suggestBreak(context, options) {
    var res = suggestBreakes(context, options);
    if (!res.ok) return null;
    return res.count ? res.suggestions[0] : null;
  }

  function buildBreakPlan(input) {
    if (!Array.isArray(input)) {
      return fail('PLAN_ITEMS_INVALID', 'items', 'Plan items must be an array of breaks.');
    }
    if (!input.length) {
      return fail('PLAN_EMPTY', 'items', 'Plan requires at least one break.');
    }
    var steps = [];
    var cursor = 0;
    var categoryMinutes = {};
    var contexts = [];
    var longestBreakMinutes = 0;

    for (var i = 0; i < input.length; i++) {
      var entry = input[i];
      if (typeof entry === 'string') {
        var resolved = getBreak(entry.trim());
        if (!resolved) {
          return fail('BREAK_INVALID', 'items', 'Break at position ' + i + ' references an unknown id: ' + entry + '.');
        }
        entry = resolved;
      }
      var normalized = normalizeBreak(entry);
      if (!normalized) {
        return fail('BREAK_INVALID', 'items', 'Break at position ' + i + ' could not be normalized.');
      }
      steps.push({
        index: steps.length,
        breakId: normalized.id,
        name: normalized.name,
        label: 'Break ' + (i + 1),
        category: normalized.category,
        context: normalized.context,
        intensity: normalized.intensity,
        minutes: normalized.durationMinutes,
        startMinute: cursor,
        endMinute: cursor + normalized.durationMinutes
      });
      cursor += normalized.durationMinutes;
      categoryMinutes[normalized.category] = (categoryMinutes[normalized.category] || 0) + normalized.durationMinutes;
      if (contexts.indexOf(normalized.context) === -1) contexts.push(normalized.context);
      if (normalized.durationMinutes > longestBreakMinutes) longestBreakMinutes = normalized.durationMinutes;
    }

    var categoryTotals = [];
    for (var key in categoryMinutes) {
      if (key === '__proto__' || !hasOwn(categoryMinutes, key)) continue;
      categoryTotals.push({ category: key, minutes: categoryMinutes[key] });
    }
    categoryTotals.sort(function (a, b) {
      return a.category < b.category ? -1 : a.category > b.category ? 1 : 0;
    });

    var planSeedParts = [];
    for (var s = 0; s < steps.length; s++) planSeedParts.push(steps[s].breakId);
    var planHash = 0x811c9dc5;
    var planInput = planSeedParts.join(',');
    for (var p = 0; p < planInput.length; p++) {
      planHash ^= planInput.charCodeAt(p);
      planHash = Math.imul(planHash, 0x01000193) >>> 0;
    }

    return {
      ok: true,
      plan: {
        planId: 'plan_' + ('00000000' + planHash.toString(16)).slice(-8),
        steps: steps,
        totalSteps: steps.length,
        totalMinutes: cursor,
        categoryMinutes: categoryTotals,
        contexts: contexts,
        longestBreakMinutes: longestBreakMinutes
      }
    };
  }

  function summarizePlan(plan) {
    if (!isRecord(plan) || !Array.isArray(plan.steps) || !plan.steps.length) return null;
    var totalMinutes = 0;
    var longestBreakMinutes = 0;
    var categories = [];
    var contexts = [];
    for (var i = 0; i < plan.steps.length; i++) {
      var step = plan.steps[i];
      if (!isRecord(step) || typeof step.minutes !== 'number' || !isFinite(step.minutes)) return null;
      totalMinutes += step.minutes;
      if (step.minutes > longestBreakMinutes) longestBreakMinutes = step.minutes;
      if (typeof step.category === 'string' && categories.indexOf(step.category) === -1) categories.push(step.category);
      if (typeof step.context === 'string' && contexts.indexOf(step.context) === -1) contexts.push(step.context);
    }
    categories.sort();
    return {
      totalSteps: plan.steps.length,
      totalMinutes: totalMinutes,
      longestBreakMinutes: longestBreakMinutes,
      averageMinutes: round2(totalMinutes / plan.steps.length),
      categories: categories,
      contexts: contexts
    };
  }

  function serialize(items) {
    if (!Array.isArray(items)) return null;
    var breaks = [];
    for (var i = 0; i < items.length; i++) {
      var normalized = normalizeBreak(items[i]);
      if (!normalized) return null;
      if (!validateBreak(normalized).ok) return null;
      breaks.push(normalized);
    }
    return JSON.stringify({ schemaVersion: SCHEMA_VERSION, breaks: breaks });
  }

  function withMigrated(result, from) {
    if (!result.ok) return result;
    return { ok: true, breaks: result.breaks, migratedFrom: from };
  }

  function finishList(items) {
    var breaks = [];
    for (var i = 0; i < items.length; i++) {
      var res = finishBreak(items[i]);
      if (!res.ok) return res;
      breaks.push(res.item);
    }
    return { ok: true, breaks: breaks };
  }

  function legacyToV1(document) {
    return {
      id: typeof document.id === 'string' ? document.id : '',
      name: hasOwn(document, 'title') ? document.title : document.name,
      context: document.context,
      category: document.category,
      durationMinutes: hasOwn(document, 'minutes') ? document.minutes : document.durationMinutes,
      intensity: document.intensity,
      description: document.description,
      equipment: [],
      tags: document.tags
    };
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
      if (!Array.isArray(document.breaks)) {
        return fail('BREAKS_MISSING', 'breaks', 'Version ' + SCHEMA_VERSION + ' documents must contain a breaks array.');
      }
      return withMigrated(finishList(document.breaks), null);
    }
    if (version === LEGACY_SCHEMA_VERSION) {
      return withMigrated(finishList([legacyToV1(document)]), LEGACY_SCHEMA_VERSION);
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
    CONTEXTS: CONTEXTS.slice(),
    CATEGORIES: CATEGORIES.slice(),
    INTENSITIES: INTENSITIES.slice(),
    BREAK_DEFAULTS: BREAK_DEFAULTS,
    listCatalog: listCatalog,
    listByContext: listByContext,
    getBreak: getBreak,
    validateBreak: validateBreak,
    normalizeBreak: normalizeBreak,
    createCustomBreak: createCustomBreak,
    updateBreak: updateBreak,
    suggestBreakes: suggestBreakes,
    suggestBreak: suggestBreak,
    buildBreakPlan: buildBreakPlan,
    summarizePlan: summarizePlan,
    deriveBreakId: deriveBreakId,
    serialize: serialize,
    parse: parse,
    migrate: migrate
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.RecoveryBreakMenuEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
