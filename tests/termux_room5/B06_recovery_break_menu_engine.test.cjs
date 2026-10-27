'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ENGINE_PATH = path.join(
  __dirname,
  '..',
  '..',
  'android',
  'app',
  'src',
  'main',
  'assets',
  'web',
  'js',
  'room5',
  'recovery_break_menu_engine.js'
);

const Engine = require(ENGINE_PATH);

function blockGlobal(name) {
  const original = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get: function () {
      throw new Error(name + ' must not be read by the recovery break menu engine');
    },
    set: function () {
      throw new Error(name + ' must not be written by the recovery break menu engine');
    }
  });
  return function restore() {
    if (original) Object.defineProperty(globalThis, name, original);
    else delete globalThis[name];
  };
}

test('exposes a stable schema-versioned API surface', () => {
  assert.strictEqual(Engine.SCHEMA_VERSION, 1);
  const expected = [
    'CONTEXTS',
    'CATEGORIES',
    'INTENSITIES',
    'BREAK_DEFAULTS',
    'listCatalog',
    'listByContext',
    'getBreak',
    'validateBreak',
    'normalizeBreak',
    'createCustomBreak',
    'updateBreak',
    'suggestBreakes',
    'suggestBreak',
    'buildBreakPlan',
    'summarizePlan',
    'deriveBreakId',
    'serialize',
    'parse',
    'migrate'
  ];
  for (const key of expected) {
    const kind =
      key === 'CONTEXTS' || key === 'CATEGORIES' || key === 'INTENSITIES' || key === 'BREAK_DEFAULTS'
        ? 'object'
        : 'function';
    assert.strictEqual(typeof Engine[key], kind, key);
  }
  assert.deepStrictEqual(Engine.CONTEXTS, ['study', 'sport', 'work']);
  assert.deepStrictEqual(Engine.CATEGORIES, ['breath', 'eyes', 'hydration', 'movement', 'posture', 'social']);
  assert.deepStrictEqual(Engine.INTENSITIES, ['rest', 'light', 'moderate']);
  assert.strictEqual(Object.isFrozen(Engine.BREAK_DEFAULTS), true);
  assert.strictEqual(Object.isFrozen(Engine.BREAK_DEFAULTS.equipment), true);
  assert.strictEqual(Object.isFrozen(Engine.BREAK_DEFAULTS.tags), true);
});

test('catalog is complete, detached and fully valid', () => {
  const first = Engine.listCatalog();
  assert.ok(Array.isArray(first));
  assert.ok(first.length >= 9, 'expected at least nine built-in breaks');
  const snapshot = JSON.stringify(first);

  first[0].name = 'MUTATED';
  first[0].durationMinutes = 999;
  first[0].tags.push('leak');
  first[0].equipment.push('leak');

  const second = Engine.listCatalog();
  assert.strictEqual(JSON.stringify(second), snapshot, 'built-in catalog must not leak');
  assert.notStrictEqual(second[0], first[0]);
  assert.notStrictEqual(second[0].tags, first[0].tags);
  assert.notStrictEqual(second[0].equipment, first[0].equipment);

  const contextsSeen = new Set();
  const categoriesSeen = new Set();
  for (const item of second) {
    assert.ok(item.id.startsWith('brk_'), 'catalog ids must use the brk_ prefix: ' + item.id);
    assert.strictEqual(Engine.validateBreak(item).ok, true, item.id + ': ' + JSON.stringify(Engine.validateBreak(item).errors));
    assert.strictEqual(Engine.normalizeBreak(item).id, item.id, 'catalog entries must already be normalized');
    contextsSeen.add(item.context);
    categoriesSeen.add(item.category);
  }
  for (const context of ['study', 'sport', 'work']) {
    assert.ok(contextsSeen.has(context), 'catalog must cover the ' + context + ' context');
  }
  assert.ok(contextsSeen.has('any'), 'catalog must cover generic any-context breaks');
  for (const category of Engine.CATEGORIES) {
    assert.ok(categoriesSeen.has(category), 'catalog must cover the ' + category + ' category');
  }

  const single = Engine.getBreak(second[0].id);
  assert.strictEqual(single.id, second[0].id);
  single.durationMinutes = 42;
  single.tags.length = 0;
  const again = Engine.getBreak(second[0].id);
  assert.strictEqual(again.durationMinutes, second[0].durationMinutes);
  assert.ok(again.tags.length > 0);
  assert.strictEqual(Engine.getBreak('brk_missing'), null);
  assert.strictEqual(Engine.getBreak(7), null);

  const study = Engine.listByContext('study');
  assert.ok(study.length > 0);
  for (const item of study) assert.strictEqual(item.context, 'study');
  assert.deepStrictEqual(Engine.listByContext('garden'), []);
  assert.deepStrictEqual(Engine.listByContext(3), []);
});

test('suggestBreakes ranks eligible breaks deterministically', () => {
  const one = Engine.suggestBreakes('study', { minutesAvailable: 3, seed: 'room5' });
  const two = Engine.suggestBreakes('study', { minutesAvailable: 3, seed: 'room5' });
  assert.strictEqual(one.ok, true);
  assert.deepStrictEqual(one.suggestions, two.suggestions, 'suggestions must be deterministic');
  assert.strictEqual(one.context, 'study');
  assert.strictEqual(one.minutesAvailable, 3);
  assert.strictEqual(one.count, one.suggestions.length);
  assert.strictEqual(one.count > 0, true);

  const ids = one.suggestions.map((s) => s.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'no duplicate suggestions');
  const byId = new Map(one.suggestions.map((s) => [s.id, s]));
  assert.ok(byId.has('brk_eye_look_distance'));
  assert.ok(byId.has('brk_eyes_palming'));
  assert.ok(byId.has('brk_wrist_forearm_stretch'));
  assert.ok(byId.has('brk_hydration_glass'));
  assert.strictEqual(byId.get('brk_neck_shoulder_release'), undefined, '4 minute break cannot fit a 3 minute budget');
  assert.strictEqual(byId.get('brk_standing_posture_reset'), undefined, 'work-only break must not be suggested for study');
  assert.strictEqual(byId.get('brk_wall_sit_hold'), undefined, 'sport-only break must not be suggested for study');

  for (const suggestion of one.suggestions) {
    assert.ok(['study', 'any'].includes(suggestion.context), suggestion.id);
    assert.ok(suggestion.durationMinutes <= 3, suggestion.id);
    assert.strictEqual(typeof suggestion.score, 'number');
    assert.ok(Array.isArray(suggestion.reasons));
    assert.ok(suggestion.reasons.length > 0);
    assert.strictEqual(suggestion.reasons.includes('duration:fits'), true);
  }
  assert.strictEqual(byId.get('brk_eyes_palming').score, byId.get('brk_wrist_forearm_stretch').score, 'equal fits must score equally');
  assert.ok(byId.get('brk_eyes_palming').score > byId.get('brk_hydration_glass').score);
  assert.ok(byId.get('brk_eye_look_distance').reasons.includes('context:study'));
  assert.ok(byId.get('brk_hydration_glass').reasons.includes('context:generic'));

  const ranked = [...one.suggestions].sort((a, b) => b.score - a.score);
  assert.deepStrictEqual(one.suggestions.map((s) => s.id), ranked.map((s) => s.id), 'suggestions must be sorted by score');
});

test('suggestions respect context exclusivity across the catalog', () => {
  for (const context of Engine.CONTEXTS) {
    const res = Engine.suggestBreakes(context, { minutesAvailable: 12, seed: 'matrix' });
    assert.strictEqual(res.ok, true, context);
    assert.ok(res.count > 0, context + ' must have suggestions');
    for (const suggestion of res.suggestions) {
      assert.ok([context, 'any'].includes(suggestion.context), context + ' leaked ' + suggestion.context + ': ' + suggestion.id);
      assert.ok(suggestion.durationMinutes <= 12);
    }
  }

  const sport = Engine.suggestBreakes('sport', { minutesAvailable: 8 });
  assert.strictEqual(sport.ok, true);
  const sportById = new Map(sport.suggestions.map((s) => [s.id, s]));
  assert.ok(sportById.has('brk_light_mobility_flow'));
  assert.ok(sportById.has('brk_wall_sit_hold'));
  assert.strictEqual(sportById.get('brk_brisk_walk'), undefined, 'work-only break must not be suggested for sport');
  assert.strictEqual(sport.suggestions[0].id, 'brk_light_mobility_flow', 'best duration fit should rank first');
  assert.ok(sport.suggestions[0].reasons.includes('context:sport'));
});

test('suggestion options: intensity, category, focus, excludes, includeTags and errors', () => {
  const focus = Engine.suggestBreakes('work', { minutesAvailable: 10, focusMinutes: 100 });
  assert.strictEqual(focus.ok, true);
  assert.strictEqual(focus.suggestions[0].id, 'brk_brisk_walk');
  assert.ok(focus.suggestions[0].reasons.includes('focus:extended'));
  assert.ok(focus.suggestions[0].reasons.includes('focus:deep'));
  const focusById = new Map(focus.suggestions.map((s) => [s.id, s]));
  assert.ok(focusById.get('brk_desk_squats').score > focusById.get('brk_social_checkin').score, 'movement should beat generic breaks in a deep work session');

  const restPreference = Engine.suggestBreakes('work', { minutesAvailable: 5, intensity: 'rest' });
  const restById = new Map(restPreference.suggestions.map((s) => [s.id, s]));
  assert.ok(restById.get('brk_hydration_glass').reasons.includes('intensity:match'));
  const plain = Engine.suggestBreakes('work', { minutesAvailable: 5 });
  const plainById = new Map(plain.suggestions.map((s) => [s.id, s]));
  assert.strictEqual(
    restById.get('brk_hydration_glass').score,
    plainById.get('brk_hydration_glass').score + 15,
    'intensity match must add a fixed bonus without filtering'
  );

  const category = Engine.suggestBreakes('study', { minutesAvailable: 5, category: 'eyes' });
  const categoryById = new Map(category.suggestions.map((s) => [s.id, s]));
  assert.ok(categoryById.get('brk_eye_look_distance').reasons.includes('category:match'));

  const excluded = Engine.suggestBreakes('study', {
    minutesAvailable: 3,
    excludeIds: ['brk_eyes_palming', 'brk_wrist_forearm_stretch']
  });
  assert.strictEqual(excluded.count, 2);
  assert.deepStrictEqual(excluded.suggestions.map((s) => s.id).sort(), ['brk_eye_look_distance', 'brk_hydration_glass']);

  const tagged = Engine.suggestBreakes('study', { minutesAvailable: 5, includeTags: ['water'] });
  assert.strictEqual(tagged.count, 1);
  assert.strictEqual(tagged.suggestions[0].id, 'brk_hydration_glass');

  const badContext = Engine.suggestBreakes('garden', { minutesAvailable: 5 });
  assert.strictEqual(badContext.ok, false);
  assert.strictEqual(badContext.errors[0].code, 'CONTEXT_UNKNOWN');
  assert.strictEqual(Engine.suggestBreakes(7).errors[0].code, 'CONTEXT_UNKNOWN');
  const badOptions = Engine.suggestBreakes('study', 'nope');
  assert.strictEqual(badOptions.ok, false);
  assert.strictEqual(badOptions.errors[0].code, 'OPTIONS_NOT_OBJECT');
});

test('suggestBreak returns the single best break or null', () => {
  const top = Engine.suggestBreak('sport', { minutesAvailable: 8 });
  assert.ok(top);
  assert.strictEqual(top.id, 'brk_light_mobility_flow');
  const res = Engine.suggestBreakes('sport', { minutesAvailable: 8 });
  assert.deepStrictEqual(top, res.suggestions[0]);
  assert.strictEqual(Engine.suggestBreak('garden'), null);
  const none = Engine.suggestBreak('sport', { minutesAvailable: 1, excludeIds: ['brk_wall_sit_hold', 'brk_hydration_glass'] });
  const resNone = Engine.suggestBreakes('sport', { minutesAvailable: 1, excludeIds: ['brk_wall_sit_hold', 'brk_hydration_glass'] });
  assert.strictEqual(resNone.count, 0);
  assert.strictEqual(none, null);
});

test('createCustomBreak fills documented defaults and stays deterministic', () => {
  const res = Engine.createCustomBreak({ name: '  Desk Reset ', durationMinutes: 12 });
  assert.strictEqual(res.ok, true);
  const item = res.item;
  assert.strictEqual(item.name, 'Desk Reset');
  assert.ok(item.id.startsWith('brk_'));
  assert.strictEqual(item.context, Engine.BREAK_DEFAULTS.context);
  assert.strictEqual(item.category, Engine.BREAK_DEFAULTS.category);
  assert.strictEqual(item.durationMinutes, 12);
  assert.strictEqual(item.intensity, Engine.BREAK_DEFAULTS.intensity);
  assert.strictEqual(item.description, Engine.BREAK_DEFAULTS.description);
  assert.deepStrictEqual(item.equipment, []);
  assert.deepStrictEqual(item.tags, []);
  assert.strictEqual(Engine.validateBreak(item).ok, true);

  const again = Engine.createCustomBreak({ name: 'Desk Reset', durationMinutes: 12 });
  assert.deepStrictEqual(again.item, item, 'identical specs must derive identical ids');

  const bare = Engine.createCustomBreak({ name: 'Bare' });
  assert.strictEqual(bare.ok, true);
  assert.strictEqual(bare.item.durationMinutes, Engine.BREAK_DEFAULTS.durationMinutes);

  const missingName = Engine.createCustomBreak({});
  assert.strictEqual(missingName.ok, false);
  assert.ok(missingName.errors.some((e) => e.code === 'NAME_REQUIRED'));

  const notObject = Engine.createCustomBreak('x');
  assert.strictEqual(notObject.ok, false);
  assert.strictEqual(notObject.errors[0].code, 'SPEC_NOT_OBJECT');

  const overrides = {
    name: '  Track Reset ',
    context: ' WORK ',
    category: 'movement',
    durationMinutes: '9',
    intensity: 'LOUD',
    description: '  take it slow ',
    equipment: [' Mat ', '', 42, 'mat'],
    tags: ['  a  ', '', 'a', 'b']
  };
  const before = JSON.stringify(overrides);
  const messy = Engine.createCustomBreak(overrides);
  assert.strictEqual(JSON.stringify(overrides), before, 'overrides must not be mutated');
  assert.strictEqual(messy.ok, true);
  assert.strictEqual(messy.item.name, 'Track Reset');
  assert.strictEqual(messy.item.context, 'work');
  assert.strictEqual(messy.item.durationMinutes, 9);
  assert.strictEqual(messy.item.intensity, 'light');
  assert.strictEqual(messy.item.description, 'take it slow');
  assert.deepStrictEqual(messy.item.equipment, ['Mat', 'mat']);
  assert.deepStrictEqual(messy.item.tags, ['a', 'b']);
  assert.strictEqual(Engine.validateBreak(messy.item).ok, true);
});

test('validateBreak reports every broken field with stable codes', () => {
  const broken = {
    id: 'not a valid id!',
    name: '   ',
    context: 'garden',
    category: 'nonsense',
    intensity: 'max',
    durationMinutes: 0,
    description: 12,
    equipment: 'no',
    tags: ['a', 'a', 't'.repeat(25), 'b', 'c', 'd', 'e']
  };
  const res = Engine.validateBreak(broken);
  assert.strictEqual(res.ok, false);
  const codes = new Set(res.errors.map((e) => e.code));
  const expectedCodes = [
    'ID_INVALID',
    'NAME_REQUIRED',
    'CONTEXT_INVALID',
    'CATEGORY_INVALID',
    'INTENSITY_INVALID',
    'DURATION_MINUTES_RANGE',
    'DESCRIPTION_INVALID',
    'EQUIPMENT_INVALID',
    'TAGS_LIMIT',
    'TAGS_INVALID',
    'TAGS_DUPLICATE'
  ];
  for (const code of expectedCodes) {
    assert.ok(codes.has(code), 'missing error code ' + code);
  }
  for (const error of res.errors) {
    assert.strictEqual(typeof error.code, 'string');
    assert.strictEqual(typeof error.field, 'string');
    assert.strictEqual(typeof error.message, 'string');
  }

  assert.strictEqual(Engine.validateBreak(null).errors[0].code, 'BREAK_NOT_OBJECT');
  assert.strictEqual(Engine.validateBreak([1, 2]).errors[0].code, 'BREAK_NOT_OBJECT');
  assert.strictEqual(Engine.validateBreak('break').errors[0].code, 'BREAK_NOT_OBJECT');

  const longName = Engine.validateBreak({ name: 'x'.repeat(61) });
  assert.ok(longName.errors.some((e) => e.code === 'NAME_TOO_LONG'));
  const longDescription = Engine.validateBreak({ name: 'x', description: 'd'.repeat(201) });
  assert.ok(longDescription.errors.some((e) => e.code === 'DESCRIPTION_TOO_LONG'));
  const tooManyEquipment = Engine.validateBreak({
    name: 'x',
    equipment: ['a', 'b', 'c', 'd', 'e']
  });
  assert.ok(tooManyEquipment.errors.some((e) => e.code === 'EQUIPMENT_LIMIT'));
  const duplicateEquipment = Engine.validateBreak({ name: 'x', equipment: ['mat', 'mat'] });
  assert.ok(duplicateEquipment.errors.some((e) => e.code === 'EQUIPMENT_DUPLICATE'));
});

test('normalizeBreak cleans messy input without mutating it', () => {
  const messy = {
    id: '',
    name: '   Soft Reset   ',
    context: 'GARDEN',
    category: 5,
    durationMinutes: '9',
    intensity: 'LOUD',
    description: '  easy now  ',
    equipment: [' Mat ', '', 7, 'mat'],
    tags: ['  a  ', '', 'a', 'b']
  };
  const before = JSON.stringify(messy);

  const clean = Engine.normalizeBreak(messy);
  assert.strictEqual(JSON.stringify(messy), before, 'normalize must not mutate its input');
  assert.ok(clean);
  assert.strictEqual(clean.name, 'Soft Reset');
  assert.ok(clean.id.startsWith('brk_'));
  assert.strictEqual(clean.context, 'any');
  assert.strictEqual(clean.category, 'movement');
  assert.strictEqual(clean.intensity, 'light');
  assert.strictEqual(clean.durationMinutes, 9);
  assert.strictEqual(clean.description, 'easy now');
  assert.deepStrictEqual(clean.equipment, ['Mat', 'mat']);
  assert.deepStrictEqual(clean.tags, ['a', 'b']);
  assert.strictEqual(Engine.validateBreak(clean).ok, true, JSON.stringify(Engine.validateBreak(clean)));
  assert.deepStrictEqual(Engine.normalizeBreak(clean), clean, 'normalize must be idempotent');

  assert.strictEqual(Engine.normalizeBreak(null), null);
  assert.strictEqual(Engine.normalizeBreak('break'), null);
  assert.strictEqual(Engine.normalizeBreak({ name: '   ' }), null);

  const clamped = Engine.normalizeBreak({ name: 'Clamped', durationMinutes: 500 });
  assert.strictEqual(clamped.durationMinutes, 60);
  const floor = Engine.normalizeBreak({ name: 'Floored', durationMinutes: -3 });
  assert.strictEqual(floor.durationMinutes, 1);
});

test('updateBreak returns a new validated item and leaves the original untouched', () => {
  const base = Engine.createCustomBreak({ name: 'Base Break', durationMinutes: 4 }).item;
  const before = JSON.stringify(base);

  const res = Engine.updateBreak(base, { name: 'Renamed Break', durationMinutes: 7, tags: ['focus'] });
  assert.strictEqual(res.ok, true);
  assert.notStrictEqual(res.item, base);
  assert.strictEqual(res.item.name, 'Renamed Break');
  assert.strictEqual(res.item.durationMinutes, 7);
  assert.deepStrictEqual(res.item.tags, ['focus']);
  assert.strictEqual(JSON.stringify(base), before, 'update must not mutate the source item');
  assert.strictEqual(base.name, 'Base Break');
  assert.strictEqual(Engine.validateBreak(res.item).ok, true);

  const emptyName = Engine.updateBreak(base, { name: '   ' });
  assert.strictEqual(emptyName.ok, false);
  assert.ok(emptyName.errors.some((e) => e.code === 'NAME_REQUIRED'));
  assert.strictEqual(JSON.stringify(base), before);

  const notObjectItem = Engine.updateBreak(null, { name: 'x' });
  assert.strictEqual(notObjectItem.ok, false);
  assert.strictEqual(notObjectItem.errors[0].code, 'BREAK_NOT_OBJECT');

  const badChanges = Engine.updateBreak(base, 'x');
  assert.strictEqual(badChanges.ok, false);
  assert.strictEqual(badChanges.errors[0].code, 'CHANGES_NOT_OBJECT');
});

test('buildBreakPlan expands breaks into a deterministic timeline', () => {
  const built = Engine.buildBreakPlan(['brk_hydration_glass', 'brk_eye_look_distance', 'brk_box_breathing']);
  assert.strictEqual(built.ok, true);
  const plan = built.plan;
  assert.deepStrictEqual(Engine.buildBreakPlan(['brk_hydration_glass', 'brk_eye_look_distance', 'brk_box_breathing']).plan, plan, 'plans must be deterministic');
  assert.ok(plan.planId.startsWith('plan_'));
  assert.strictEqual(plan.totalSteps, 3);
  assert.strictEqual(plan.totalMinutes, 8);
  assert.strictEqual(plan.longestBreakMinutes, 5);
  assert.deepStrictEqual(plan.contexts, ['any', 'study']);
  assert.deepStrictEqual(plan.categoryMinutes, [
    { category: 'breath', minutes: 5 },
    { category: 'eyes', minutes: 2 },
    { category: 'hydration', minutes: 1 }
  ]);

  assert.deepStrictEqual(plan.steps[0], {
    index: 0,
    breakId: 'brk_hydration_glass',
    name: 'Hydration Glass',
    label: 'Break 1',
    category: 'hydration',
    context: 'any',
    intensity: 'rest',
    minutes: 1,
    startMinute: 0,
    endMinute: 1
  });
  assert.deepStrictEqual(plan.steps[2], {
    index: 2,
    breakId: 'brk_box_breathing',
    name: 'Box Breathing',
    label: 'Break 3',
    category: 'breath',
    context: 'any',
    intensity: 'rest',
    minutes: 5,
    startMinute: 3,
    endMinute: 8
  });
  for (let i = 0; i < plan.steps.length; i++) {
    assert.strictEqual(plan.steps[i].index, i);
    assert.strictEqual(plan.steps[i].startMinute, i === 0 ? 0 : plan.steps[i - 1].endMinute);
    assert.strictEqual(plan.steps[i].endMinute, plan.steps[i].startMinute + plan.steps[i].minutes);
  }

  const mixed = Engine.buildBreakPlan([
    Engine.createCustomBreak({ name: 'Custom Stand', context: 'work', category: 'posture', durationMinutes: 2 }).item,
    'brk_wall_sit_hold'
  ]);
  assert.strictEqual(mixed.ok, true);
  assert.deepStrictEqual(mixed.plan.contexts, ['work', 'sport']);
  assert.strictEqual(mixed.plan.totalMinutes, 4);

  assert.strictEqual(Engine.buildBreakPlan('x').errors[0].code, 'PLAN_ITEMS_INVALID');
  assert.strictEqual(Engine.buildBreakPlan([]).errors[0].code, 'PLAN_EMPTY');
  const badItem = Engine.buildBreakPlan(['brk_hydration_glass', 42]);
  assert.strictEqual(badItem.ok, false);
  assert.strictEqual(badItem.errors[0].code, 'BREAK_INVALID');
  assert.ok(badItem.errors[0].message.includes('position 1'));
});

test('summarizePlan recomputes totals from the timeline', () => {
  const plan = Engine.buildBreakPlan(['brk_hydration_glass', 'brk_eye_look_distance', 'brk_box_breathing']).plan;
  const summary = Engine.summarizePlan(plan);
  assert.deepStrictEqual(summary, {
    totalSteps: 3,
    totalMinutes: 8,
    longestBreakMinutes: 5,
    averageMinutes: 2.67,
    categories: ['breath', 'eyes', 'hydration'],
    contexts: ['any', 'study']
  });
  assert.deepStrictEqual(Engine.summarizePlan(plan), summary, 'summaries must be deterministic');
  assert.strictEqual(Engine.summarizePlan(null), null);
  assert.strictEqual(Engine.summarizePlan({}), null);
  assert.strictEqual(Engine.summarizePlan({ steps: 'nope' }), null);
});

test('serialize and parse round-trip a menu with the schema version stamped', () => {
  const items = [Engine.getBreak('brk_hydration_glass'), Engine.getBreak('brk_box_breathing')];
  const json = Engine.serialize(items);
  assert.strictEqual(typeof json, 'string');
  const doc = JSON.parse(json);
  assert.strictEqual(doc.schemaVersion, 1);
  assert.strictEqual(Array.isArray(doc.breaks), true);

  const parsed = Engine.parse(json);
  assert.strictEqual(parsed.ok, true);
  assert.deepStrictEqual(parsed.breaks, items, 'round trip must preserve the menu');
  assert.strictEqual(parsed.migratedFrom, null);

  assert.deepStrictEqual(Engine.parse(Engine.serialize(Engine.listCatalog())).breaks, Engine.listCatalog());

  assert.strictEqual(Engine.serialize('x'), null);
  assert.strictEqual(Engine.serialize([{ name: '   ' }]), null);
  assert.strictEqual(Engine.serialize([null]), null);
  assert.strictEqual(Engine.parse('not json').ok, false);
  assert.strictEqual(Engine.parse('not json').errors[0].code, 'MALFORMED');
  assert.strictEqual(Engine.parse('[]').errors[0].code, 'DOCUMENT_NOT_OBJECT');
  assert.strictEqual(Engine.parse({}).errors[0].code, 'MALFORMED');
  assert.strictEqual(Engine.migrate({}).errors[0].code, 'SCHEMA_VERSION_MISSING');
  assert.strictEqual(Engine.parse(JSON.stringify({ schemaVersion: 1 })).errors[0].code, 'BREAKS_MISSING');
  const badMenu = Engine.parse(JSON.stringify({ schemaVersion: 1, breaks: [{ name: '' }] }));
  assert.strictEqual(badMenu.ok, false);
  assert.ok(badMenu.errors.some((e) => e.code === 'NAME_REQUIRED'));
});

test('migrate upgrades legacy schema 0 documents and blocks unknown versions', () => {
  const legacy = {
    schemaVersion: 0,
    title: 'Legacy Eye Rest',
    context: 'study',
    minutes: 4,
    category: 'eyes',
    description: 'old description',
    tags: ['old']
  };
  const before = JSON.stringify(legacy);

  const parsed = Engine.parse(JSON.stringify(legacy));
  assert.strictEqual(parsed.ok, true);
  assert.strictEqual(parsed.migratedFrom, 0);
  assert.strictEqual(parsed.breaks.length, 1);
  const item = parsed.breaks[0];
  assert.strictEqual(item.name, 'Legacy Eye Rest');
  assert.strictEqual(item.context, 'study');
  assert.strictEqual(item.category, 'eyes');
  assert.strictEqual(item.durationMinutes, 4);
  assert.strictEqual(item.intensity, 'light');
  assert.strictEqual(item.description, 'old description');
  assert.deepStrictEqual(item.equipment, []);
  assert.deepStrictEqual(item.tags, ['old']);
  assert.ok(item.id.startsWith('brk_'));
  assert.strictEqual(Engine.validateBreak(item).ok, true);

  const direct = Engine.migrate(legacy);
  assert.strictEqual(JSON.stringify(legacy), before, 'migrate must not mutate legacy documents');
  assert.strictEqual(direct.ok, true);
  assert.strictEqual(direct.migratedFrom, 0);
  assert.deepStrictEqual(direct.breaks, parsed.breaks, 'migrate must be deterministic');

  const sparse = Engine.migrate({ schemaVersion: 0, title: 'Sparse Legacy' });
  assert.strictEqual(sparse.ok, true);
  assert.strictEqual(sparse.breaks[0].context, 'any');
  assert.strictEqual(sparse.breaks[0].category, 'movement');
  assert.strictEqual(sparse.breaks[0].durationMinutes, Engine.BREAK_DEFAULTS.durationMinutes);

  assert.strictEqual(Engine.parse(JSON.stringify({ schemaVersion: 2, breaks: [] })).errors[0].code, 'SCHEMA_VERSION_UNSUPPORTED');
  assert.strictEqual(Engine.migrate(null).errors[0].code, 'DOCUMENT_NOT_OBJECT');
});

test('prototype-like names never pollute Object.prototype', () => {
  const evil = JSON.parse(
    '{"name":"Safe","__proto__":{"polluted":"yes"},"id":"__proto__","context":"study",' +
      '"category":"eyes","durationMinutes":2,"intensity":"rest","description":"x",' +
      '"equipment":[],"tags":["__proto__"]}'
  );

  const normalized = Engine.normalizeBreak(evil);
  assert.ok(normalized);
  assert.strictEqual({}.polluted, undefined);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(normalized, '__proto__'), false);
  assert.strictEqual(normalized.id, '__proto__');
  assert.strictEqual(normalized.name, 'Safe');
  assert.deepStrictEqual(normalized.tags, ['__proto__']);
  assert.strictEqual(Engine.validateBreak(evil).ok, true);
  assert.strictEqual({}.polluted, undefined);

  const parsed = Engine.parse(JSON.stringify({ schemaVersion: 1, breaks: [evil] }));
  assert.strictEqual(parsed.ok, true, JSON.stringify(parsed));
  assert.strictEqual({}.polluted, undefined);
  assert.strictEqual(parsed.breaks[0].id, '__proto__');

  const plan = Engine.buildBreakPlan(parsed.breaks);
  assert.strictEqual(plan.ok, true);
  assert.strictEqual(plan.plan.totalMinutes, 2);
  assert.strictEqual({}.polluted, undefined);

  const custom = Engine.createCustomBreak({ id: '__proto__', name: 'constructor' });
  assert.strictEqual(custom.ok, true);
  assert.strictEqual(custom.item.id, '__proto__');
  assert.strictEqual({}.polluted, undefined);
  assert.strictEqual(Engine.deriveBreakId('constructor'), Engine.deriveBreakId('constructor'));
  assert.ok(Engine.deriveBreakId('constructor').startsWith('brk_'));
  assert.notStrictEqual(Engine.deriveBreakId('constructor'), Engine.deriveBreakId('safe'));
});

test('engine source stays dependency-free and side-effect free', () => {
  const source = fs.readFileSync(ENGINE_PATH, 'utf8');
  assert.ok(/module\.exports/.test(source), 'CommonJS export required');
  assert.ok(!/require\s*\(/.test(source), 'engine must not require other modules');
  assert.ok(!/localStorage|sessionStorage|indexedDB/.test(source), 'engine must not touch persistence');
  assert.ok(!/XMLHttpRequest|WebSocket|\bfetch\s*\(/.test(source), 'engine must not touch the network');
  assert.ok(!/Date\.now|Math\.random/.test(source), 'engine must stay deterministic');
  assert.ok(!/setTimeout|setInterval|requestAnimationFrame/.test(source), 'engine must not schedule work');
});

test('engine runs with time, randomness, storage and network access blocked', () => {
  const beforeLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const originalNow = Date.now;
  const originalRandom = Math.random;
  const restores = [];

  Date.now = function blockedNow() {
    throw new Error('Date.now must not be used by the recovery break menu engine');
  };
  Math.random = function blockedRandom() {
    throw new Error('Math.random must not be used by the recovery break menu engine');
  };
  restores.push(function restoreClock() {
    Date.now = originalNow;
    Math.random = originalRandom;
  });
  for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'localStorage', 'sessionStorage', 'indexedDB']) {
    restores.push(blockGlobal(name));
  }

  let captured;
  try {
    const custom = Engine.createCustomBreak({ name: 'Blocked World', context: 'work' });
    captured = {
      catalogCount: Engine.listCatalog().length,
      suggestion: Engine.suggestBreak('study', { minutesAvailable: 3 }),
      ranked: Engine.suggestBreakes('work', { minutesAvailable: 10, focusMinutes: 95, seed: 'blocked' }),
      plan: Engine.buildBreakPlan(['brk_box_breathing', custom.item]),
      roundTrip: Engine.parse(Engine.serialize([custom.item])),
      migrated: Engine.migrate({ schemaVersion: 0, title: 'Blocked Legacy', minutes: 3 })
    };
  } finally {
    while (restores.length) restores.pop()();
  }

  assert.ok(captured.catalogCount >= 9);
  assert.ok(captured.suggestion.id.startsWith('brk_'));
  assert.strictEqual(captured.ranked.ok, true);
  assert.strictEqual(captured.ranked.suggestions[0].id, 'brk_brisk_walk');
  assert.strictEqual(captured.plan.ok, true);
  assert.strictEqual(captured.plan.plan.totalMinutes, 10);
  assert.strictEqual(captured.roundTrip.ok, true);
  assert.strictEqual(captured.migrated.ok, true);
  assert.strictEqual(captured.migrated.breaks[0].durationMinutes, 3);
  assert.strictEqual(Date.now, originalNow, 'clock must be restored');
  assert.strictEqual(Math.random, originalRandom, 'random source must be restored');
  assert.deepStrictEqual(
    Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    beforeLocalStorage,
    'storage globals must be restored'
  );
});
