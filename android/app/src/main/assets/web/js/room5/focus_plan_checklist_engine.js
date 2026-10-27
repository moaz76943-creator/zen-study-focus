/**
 * DEEP FOCUS — Room5 Focus Plan Checklist Engine
 * Schema-versioned, offline, reorderable focus-plan checklists with
 * canonical, prototype-safe serialization and legacy migration.
 *
 * Pure module: CommonJS export, zero networking, zero persistence,
 * no timers, no randomness, no external dependencies.
 */
(function (global) {
  'use strict';

  var SCHEMA_VERSION = 1;
  var LEGACY_SCHEMA_VERSION = 0;

  var CHECKLIST_FIELDS = ['id', 'title', 'description', 'templateId', 'items', 'notes', 'tags'];
  var ITEM_FIELDS = ['id', 'text', 'done', 'minutes', 'note'];

  var LIMITS = {
    idPattern: /^[A-Za-z0-9_-]{1,64}$/,
    titleMax: 60,
    descriptionMax: 140,
    templateIdMax: 64,
    itemTextMax: 120,
    itemNoteMax: 140,
    minutesMin: 0,
    minutesMax: 600,
    itemsMax: 40,
    notesMax: 280,
    tagsMax: 6,
    tagMaxLen: 24
  };

  var CHECKLIST_DEFAULTS = Object.freeze({
    description: '',
    items: Object.freeze([]),
    notes: '',
    tags: Object.freeze([])
  });

  var ITEM_DEFAULTS = Object.freeze({
    done: false,
    minutes: 0,
    note: ''
  });

  var BUILTIN_TEMPLATES = [
    {
      id: 'plan_deep_block',
      title: 'Deep Focus Block',
      description: 'A repeatable six item checklist for opening and closing one long focus block.',
      templateId: null,
      items: [
        { text: 'Clear the desk to one material set', minutes: 2 },
        { text: 'Silence notifications and park the phone', minutes: 1 },
        { text: 'Write the single outcome for this block', minutes: 3 },
        { text: 'Set the block timer and start', minutes: 1 },
        { text: 'Log each interruption as it happens', minutes: 1 },
        { text: 'Close the block and note the next step', minutes: 3 }
      ],
      notes: 'About eleven minutes of overhead around the focus work.',
      tags: ['deep', 'block']
    },
    {
      id: 'plan_exam_prep',
      title: 'Exam Prep Run',
      description: 'Full length mock exam rhythm from desk setup to mistake review.',
      templateId: null,
      items: [
        { text: 'Lay out paper, pens and calculator', minutes: 1 },
        { text: 'Set the countdown for the mock section', minutes: 1 },
        { text: 'Silence every notification', minutes: 1 },
        { text: 'Read the three recall prompts once', minutes: 2 },
        { text: 'Answer the mock section without pausing', minutes: 45 },
        { text: 'Review wrong answers and mark patterns', minutes: 10 }
      ],
      notes: 'Run the whole sequence so the exam hour feels familiar.',
      tags: ['exam', 'practice']
    },
    {
      id: 'plan_writing_sprint',
      title: 'Writing Sprint',
      description: 'Draft one section in a single timed pass, then mark what to revise.',
      templateId: null,
      items: [
        { text: 'Pick the single section to draft', minutes: 2 },
        { text: 'Open the draft and hide the research tabs', minutes: 1 },
        { text: 'Set a forty minute draft timer', minutes: 1 },
        { text: 'Draft without editing', minutes: 40 },
        { text: 'Mark two passages to revise later', minutes: 4 },
        { text: 'Save and write the starting line for tomorrow', minutes: 3 }
      ],
      notes: 'Draft first, revise in a separate pass.',
      tags: ['writing', 'sprint']
    },
    {
      id: 'plan_week_review',
      title: 'Weekly Review',
      description: 'Collect every open loop into one list, then rank the outcomes for next week.',
      templateId: null,
      items: [
        { text: 'Collect every open loop into one list', minutes: 8 },
        { text: 'Delete or archive what is no longer live', minutes: 5 },
        { text: 'Rank the three outcomes for next week', minutes: 6 },
        { text: 'Block the deep work sessions on the calendar', minutes: 5 },
        { text: 'Flag one risk and its early warning', minutes: 4 },
        { text: 'Write the weekly reflection in three lines', minutes: 4 }
      ],
      notes: 'Fits inside a forty minute Friday review.',
      tags: ['review', 'weekly']
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

  function deriveChecklistId(seed) {
    return 'plan_' + hashSeed(seed);
  }

  function deriveItemId(seed) {
    return 'pitm_' + hashSeed(seed);
  }

  function checklistSeed(title, description, items) {
    var body = [];
    for (var i = 0; i < items.length; i++) body.push(items[i].text);
    return title + '|' + description + '|' + body.join(',');
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

  function normalizeItem(input, index, seen) {
    if (!isRecord(input)) return null;
    var body = text(input.text, LIMITS.itemTextMax);
    if (!body) return null;
    var minutes = clampInt(input.minutes, LIMITS.minutesMin, LIMITS.minutesMax, ITEM_DEFAULTS.minutes);
    var id = typeof input.id === 'string' ? input.id.trim() : '';
    if (!LIMITS.idPattern.test(id) || (seen && seen.indexOf(id) !== -1)) {
      id = deriveItemId(body + '|' + index);
    }
    var salt = 0;
    while (seen && seen.indexOf(id) !== -1) {
      salt += 1;
      id = deriveItemId(body + '|' + index + '|' + salt);
    }
    if (seen) seen.push(id);
    return {
      id: id,
      text: body,
      done: input.done === true,
      minutes: minutes,
      note: typeof input.note === 'string' ? input.note.trim().slice(0, LIMITS.itemNoteMax) : ''
    };
  }

  function normalizeItems(value) {
    if (!Array.isArray(value)) return [];
    var seen = [];
    var picked = [];
    for (var i = 0; i < value.length && picked.length < LIMITS.itemsMax; i++) {
      var item = normalizeItem(value[i], i, seen);
      if (item) picked.push(item);
    }
    return picked;
  }

  function normalizeChecklist(input) {
    if (!isRecord(input)) return null;
    var title = text(input.title, LIMITS.titleMax);
    if (!title) return null;
    if (input.items !== undefined && !Array.isArray(input.items)) return null;
    var description = text(input.description, LIMITS.descriptionMax);
    var items = normalizeItems(input.items);
    if (!items.length) return null;
    var id = typeof input.id === 'string' ? input.id.trim() : '';
    if (!LIMITS.idPattern.test(id)) id = deriveChecklistId(checklistSeed(title, description, items));
    var templateId = typeof input.templateId === 'string' && input.templateId.trim() ? input.templateId.trim() : null;
    return {
      id: id,
      title: title,
      description: description,
      templateId: templateId,
      items: items,
      notes: typeof input.notes === 'string' ? input.notes.trim().slice(0, LIMITS.notesMax) : '',
      tags: normalizeTags(input.tags)
    };
  }

  function validateItemEntry(item, position, errors) {
    function add(code, message) {
      errors.push({ code: code, field: 'items', message: message });
    }
    if (!isRecord(item)) {
      add('ITEM_NOT_OBJECT', 'Item at position ' + position + ' must be a plain object.');
      return;
    }
    if (
      item.id !== undefined &&
      item.id !== '' &&
      (typeof item.id !== 'string' || !LIMITS.idPattern.test(item.id))
    ) {
      add('ITEM_ID_INVALID', 'Item at position ' + position + ' has an invalid id.');
    }
    if (typeof item.text !== 'string' || !item.text.trim()) {
      add('ITEM_TEXT_REQUIRED', 'Item at position ' + position + ' requires text.');
    } else if (item.text.trim().length > LIMITS.itemTextMax) {
      add(
        'ITEM_TEXT_TOO_LONG',
        'Item at position ' + position + ' text must be at most ' + LIMITS.itemTextMax + ' characters.'
      );
    }
    if (
      item.minutes !== undefined &&
      (!Number.isInteger(item.minutes) || item.minutes < LIMITS.minutesMin || item.minutes > LIMITS.minutesMax)
    ) {
      add(
        'ITEM_MINUTES_RANGE',
        'Item at position ' +
          position +
          ' minutes must be an integer between ' +
          LIMITS.minutesMin +
          ' and ' +
          LIMITS.minutesMax +
          '.'
      );
    }
    if (item.note !== undefined && typeof item.note !== 'string') {
      add('ITEM_NOTE_INVALID', 'Item at position ' + position + ' note must be a string.');
    } else if (typeof item.note === 'string' && item.note.length > LIMITS.itemNoteMax) {
      add(
        'ITEM_NOTE_TOO_LONG',
        'Item at position ' + position + ' note must be at most ' + LIMITS.itemNoteMax + ' characters.'
      );
    }
    if (item.done !== undefined && typeof item.done !== 'boolean') {
      add('ITEM_DONE_INVALID', 'Item at position ' + position + ' done must be a boolean.');
    }
  }

  function validateChecklist(input) {
    if (!isRecord(input)) {
      return errorList([['CHECKLIST_NOT_OBJECT', 'checklist', 'Checklist must be a plain object.']]);
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
      add('ID_INVALID', 'id', 'Checklist id must match ' + LIMITS.idPattern.source + '.');
    }
    if (typeof input.title !== 'string' || !input.title.trim()) {
      add('TITLE_REQUIRED', 'title', 'Checklist title is required.');
    } else if (input.title.trim().length > LIMITS.titleMax) {
      add('TITLE_TOO_LONG', 'title', 'Checklist title must be at most ' + LIMITS.titleMax + ' characters.');
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

    if (input.items !== undefined && !Array.isArray(input.items)) {
      add('ITEMS_INVALID', 'items', 'Items must be an array of item objects.');
    } else if (Array.isArray(input.items)) {
      if (input.items.length === 0) {
        add('ITEMS_EMPTY', 'items', 'At least one checklist item is required.');
      } else if (input.items.length > LIMITS.itemsMax) {
        add('ITEMS_LIMIT', 'items', 'At most ' + LIMITS.itemsMax + ' items are allowed.');
      }
      var seenIds = [];
      for (var i = 0; i < input.items.length; i++) {
        var entry = input.items[i];
        validateItemEntry(entry, i, errors);
        if (isRecord(entry) && typeof entry.id === 'string' && LIMITS.idPattern.test(entry.id)) {
          if (seenIds.indexOf(entry.id) !== -1) {
            add('ITEM_DUPLICATE_ID', 'items', 'Duplicate item id: ' + entry.id + '.');
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

  function checklistErrors(raw) {
    var errors = validateChecklist(raw).errors;
    if (!errors.length) {
      errors.push({ code: 'CHECKLIST_INVALID', field: 'checklist', message: 'Checklist could not be normalized.' });
    }
    return { ok: false, errors: errors };
  }

  function finishChecklist(raw) {
    var normalized = normalizeChecklist(raw);
    if (!normalized) return checklistErrors(raw);
    var check = validateChecklist(normalized);
    if (!check.ok) return check;
    return { ok: true, checklist: normalized };
  }

  function withItems(base, items) {
    var raw = copyKnown({}, base, CHECKLIST_FIELDS);
    raw.items = items;
    return finishChecklist(raw);
  }

  function listTemplates() {
    return BUILTIN_TEMPLATES.map(function (template) {
      return copyKnown({}, template, CHECKLIST_FIELDS);
    });
  }

  function getTemplate(templateId) {
    if (typeof templateId !== 'string') return null;
    for (var i = 0; i < BUILTIN_TEMPLATES.length; i++) {
      if (BUILTIN_TEMPLATES[i].id === templateId) {
        return copyKnown({}, BUILTIN_TEMPLATES[i], CHECKLIST_FIELDS);
      }
    }
    return null;
  }

  function createChecklist(spec) {
    if (!isRecord(spec)) {
      return fail('SPEC_NOT_OBJECT', 'spec', 'Checklist specification must be a plain object.');
    }
    var raw = {
      id: '',
      title: '',
      description: CHECKLIST_DEFAULTS.description,
      templateId: null,
      items: [],
      notes: CHECKLIST_DEFAULTS.notes,
      tags: []
    };
    copyKnown(raw, spec, CHECKLIST_FIELDS);
    return finishChecklist(raw);
  }

  function createChecklistFromTemplate(templateId, overrides) {
    if (!isRecord(overrides)) {
      return fail('OVERRIDES_NOT_OBJECT', 'overrides', 'Overrides must be a plain object.');
    }
    var template = getTemplate(templateId);
    if (!template) {
      return fail('TEMPLATE_NOT_FOUND', 'templateId', 'Unknown focus plan checklist template: ' + String(templateId) + '.');
    }
    var raw = copyKnown({}, template, CHECKLIST_FIELDS);
    delete raw.id;
    copyKnown(raw, overrides, CHECKLIST_FIELDS);
    if (!hasOwn(overrides, 'templateId')) raw.templateId = template.id;
    return finishChecklist(raw);
  }

  function updateChecklist(checklist, changes) {
    if (!isRecord(checklist)) {
      return fail('CHECKLIST_NOT_OBJECT', 'checklist', 'Checklist must be a plain object.');
    }
    if (!isRecord(changes)) {
      return fail('CHANGES_NOT_OBJECT', 'changes', 'Changes must be a plain object.');
    }
    var raw = copyKnown({}, checklist, CHECKLIST_FIELDS);
    copyKnown(raw, changes, CHECKLIST_FIELDS);
    return finishChecklist(raw);
  }

  function requireChecklist(checklist) {
    if (!isRecord(checklist)) {
      return fail('CHECKLIST_NOT_OBJECT', 'checklist', 'Checklist must be a plain object.');
    }
    var base = normalizeChecklist(checklist);
    if (!base) return checklistErrors(checklist);
    return { ok: true, checklist: base };
  }

  function requireItemId(itemId) {
    if (typeof itemId !== 'string' || !itemId.trim()) {
      return fail('ITEM_ID_INVALID', 'itemId', 'Item id must be a non-empty string.');
    }
    return null;
  }

  function addItem(checklist, item) {
    var guard = requireChecklist(checklist);
    if (!guard.ok) return guard;
    if (!isRecord(item)) {
      return fail('ITEM_NOT_OBJECT', 'item', 'Item must be a plain object.');
    }
    if (typeof item.text !== 'string' || !item.text.trim()) {
      return fail('ITEM_TEXT_REQUIRED', 'item', 'Item text is required.');
    }
    if (guard.checklist.items.length >= LIMITS.itemsMax) {
      return fail('ITEMS_LIMIT', 'items', 'At most ' + LIMITS.itemsMax + ' items are allowed.');
    }
    var items = guard.checklist.items.slice();
    items.push(item);
    return withItems(guard.checklist, items);
  }

  function updateItem(checklist, itemId, changes) {
    var guard = requireChecklist(checklist);
    if (!guard.ok) return guard;
    var idError = requireItemId(itemId);
    if (idError) return idError;
    if (!isRecord(changes)) {
      return fail('CHANGES_NOT_OBJECT', 'changes', 'Changes must be a plain object.');
    }
    var base = guard.checklist;
    var key = itemId.trim();
    var index = -1;
    for (var i = 0; i < base.items.length; i++) {
      if (base.items[i].id === key) index = i;
    }
    if (index === -1) {
      return fail('ITEM_NOT_FOUND', 'itemId', 'No item with id: ' + key + '.');
    }
    var merged = copyKnown({}, base.items[index], ITEM_FIELDS);
    copyKnown(merged, changes, ITEM_FIELDS);
    merged.id = base.items[index].id;
    if (typeof merged.text !== 'string' || !merged.text.trim()) {
      return fail('ITEM_TEXT_REQUIRED', 'text', 'Item text is required.');
    }
    var items = base.items.slice();
    items[index] = merged;
    return withItems(base, items);
  }

  function removeItem(checklist, itemId) {
    var guard = requireChecklist(checklist);
    if (!guard.ok) return guard;
    var idError = requireItemId(itemId);
    if (idError) return idError;
    var base = guard.checklist;
    var key = itemId.trim();
    var items = [];
    var found = false;
    for (var i = 0; i < base.items.length; i++) {
      if (base.items[i].id === key) {
        found = true;
        continue;
      }
      items.push(base.items[i]);
    }
    if (!found) {
      return fail('ITEM_NOT_FOUND', 'itemId', 'No item with id: ' + key + '.');
    }
    if (!items.length) {
      return fail('ITEM_REMOVE_LAST', 'items', 'A checklist must keep at least one item.');
    }
    return withItems(base, items);
  }

  function moveItem(checklist, itemId, toIndex) {
    var guard = requireChecklist(checklist);
    if (!guard.ok) return guard;
    var idError = requireItemId(itemId);
    if (idError) return idError;
    var base = guard.checklist;
    var key = itemId.trim();
    var from = -1;
    for (var i = 0; i < base.items.length; i++) {
      if (base.items[i].id === key) from = i;
    }
    if (from === -1) {
      return fail('ITEM_NOT_FOUND', 'itemId', 'No item with id: ' + key + '.');
    }
    var index = typeof toIndex === 'number' ? toIndex : NaN;
    if (!Number.isInteger(index)) {
      return fail('INDEX_INVALID', 'toIndex', 'Target index must be an integer.');
    }
    if (index < 0 || index >= base.items.length) {
      return fail(
        'INDEX_RANGE',
        'toIndex',
        'Target index must be between 0 and ' + (base.items.length - 1) + '.'
      );
    }
    if (index === from) return { ok: true, checklist: base };
    var items = base.items.slice();
    var moved = items.splice(from, 1)[0];
    items.splice(index, 0, moved);
    return withItems(base, items);
  }

  function reorderItems(checklist, orderedIds) {
    var guard = requireChecklist(checklist);
    if (!guard.ok) return guard;
    if (!Array.isArray(orderedIds)) {
      return fail('ORDER_NOT_ARRAY', 'orderedIds', 'orderedIds must be an array of item ids.');
    }
    var base = guard.checklist;
    if (orderedIds.length !== base.items.length) {
      return fail('ORDER_MISMATCH', 'orderedIds', 'orderedIds must contain exactly the current item ids.');
    }
    var items = [];
    var seen = [];
    for (var i = 0; i < orderedIds.length; i++) {
      var key = orderedIds[i];
      if (typeof key !== 'string' || !key.trim()) {
        return fail('ORDER_ID_INVALID', 'orderedIds', 'orderedIds entries must be non-empty strings.');
      }
      key = key.trim();
      if (seen.indexOf(key) !== -1) {
        return fail('ORDER_DUPLICATE', 'orderedIds', 'Duplicate id in orderedIds: ' + key + '.');
      }
      var match = null;
      for (var j = 0; j < base.items.length; j++) {
        if (base.items[j].id === key) match = base.items[j];
      }
      if (!match) {
        return fail('ORDER_MISMATCH', 'orderedIds', 'Unknown item id in orderedIds: ' + key + '.');
      }
      seen.push(key);
      items.push(match);
    }
    return withItems(base, items);
  }

  function toggleItem(checklist, itemId) {
    var guard = requireChecklist(checklist);
    if (!guard.ok) return guard;
    var idError = requireItemId(itemId);
    if (idError) return idError;
    var base = guard.checklist;
    var key = itemId.trim();
    var items = [];
    var found = false;
    for (var i = 0; i < base.items.length; i++) {
      var copy = copyKnown({}, base.items[i], ITEM_FIELDS);
      if (copy.id === key) {
        copy.done = !copy.done;
        found = true;
      }
      items.push(copy);
    }
    if (!found) {
      return fail('ITEM_NOT_FOUND', 'itemId', 'No item with id: ' + key + '.');
    }
    return withItems(base, items);
  }

  function clearCompleted(checklist) {
    var guard = requireChecklist(checklist);
    if (!guard.ok) return guard;
    var base = guard.checklist;
    var items = [];
    for (var i = 0; i < base.items.length; i++) {
      var copy = copyKnown({}, base.items[i], ITEM_FIELDS);
      copy.done = false;
      items.push(copy);
    }
    return withItems(base, items);
  }

  function summarizeChecklist(checklist) {
    var normalized = normalizeChecklist(checklist);
    if (!normalized) return null;
    var doneCount = 0;
    var totalMinutes = 0;
    var pendingMinutes = 0;
    var nextItemId = null;
    var nextItemLabel = null;
    for (var i = 0; i < normalized.items.length; i++) {
      var item = normalized.items[i];
      totalMinutes += item.minutes;
      if (item.done) {
        doneCount += 1;
        continue;
      }
      pendingMinutes += item.minutes;
      if (nextItemId === null) {
        nextItemId = item.id;
        nextItemLabel = item.text;
      }
    }
    return {
      totalItems: normalized.items.length,
      doneCount: doneCount,
      pendingCount: normalized.items.length - doneCount,
      percent: round2(doneCount * 100 / normalized.items.length),
      completed: doneCount === normalized.items.length,
      nextItemId: nextItemId,
      nextItemLabel: nextItemLabel,
      totalMinutes: totalMinutes,
      pendingMinutes: pendingMinutes
    };
  }

  function serialize(checklist) {
    var normalized = normalizeChecklist(checklist);
    if (!normalized) return null;
    if (!validateChecklist(normalized).ok) return null;
    return JSON.stringify({ schemaVersion: SCHEMA_VERSION, checklist: normalized });
  }

  function legacyToV1(document) {
    var raw = {
      id: typeof document.id === 'string' ? document.id : '',
      title: hasOwn(document, 'title') ? document.title : document.name,
      description: hasOwn(document, 'purpose') ? document.purpose : document.description,
      templateId: null,
      items: [],
      notes: document.notes,
      tags: document.tags
    };
    var source = document.tasks;
    if (!hasOwn(document, 'tasks')) {
      source = hasOwn(document, 'checklist') ? document.checklist : document.items;
    }
    if (Array.isArray(source)) {
      for (var i = 0; i < source.length; i++) {
        var entry = source[i];
        if (isRecord(entry)) {
          var body = entry.text;
          if (!hasOwn(entry, 'text')) body = hasOwn(entry, 'label') ? entry.label : entry.name;
          raw.items.push({
            text: body,
            done: entry.done === true || entry.completed === true || entry.checked === true,
            minutes: hasOwn(entry, 'durationMinutes') ? entry.durationMinutes : entry.minutes,
            note: entry.note
          });
        } else if (typeof entry === 'string') {
          raw.items.push({ text: entry });
        }
      }
    }
    return raw;
  }

  function withMigrated(result, from) {
    if (!result.ok) return result;
    return { ok: true, checklist: result.checklist, migratedFrom: from };
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
      if (!isRecord(document.checklist)) {
        return fail('CHECKLIST_MISSING', 'checklist', 'Version ' + SCHEMA_VERSION + ' documents must contain a checklist object.');
      }
      return withMigrated(finishChecklist(document.checklist), null);
    }
    if (version === LEGACY_SCHEMA_VERSION) {
      return withMigrated(finishChecklist(legacyToV1(document)), LEGACY_SCHEMA_VERSION);
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
    CHECKLIST_DEFAULTS: CHECKLIST_DEFAULTS,
    listTemplates: listTemplates,
    getTemplate: getTemplate,
    createChecklistFromTemplate: createChecklistFromTemplate,
    createChecklist: createChecklist,
    validateChecklist: validateChecklist,
    normalizeChecklist: normalizeChecklist,
    updateChecklist: updateChecklist,
    addItem: addItem,
    updateItem: updateItem,
    removeItem: removeItem,
    moveItem: moveItem,
    reorderItems: reorderItems,
    toggleItem: toggleItem,
    clearCompleted: clearCompleted,
    summarizeChecklist: summarizeChecklist,
    deriveChecklistId: deriveChecklistId,
    deriveItemId: deriveItemId,
    serialize: serialize,
    parse: parse,
    migrate: migrate
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.FocusPlanChecklistEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
