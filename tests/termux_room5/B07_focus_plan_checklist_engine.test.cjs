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
  'focus_plan_checklist_engine.js'
);

const Engine = require(ENGINE_PATH);

function blockGlobal(name) {
  const original = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get: function () {
      throw new Error(name + ' must not be read by the focus plan checklist engine');
    },
    set: function () {
      throw new Error(name + ' must not be written by the focus plan checklist engine');
    }
  });
  return function restore() {
    if (original) Object.defineProperty(globalThis, name, original);
    else delete globalThis[name];
  };
}

function textsOf(checklist) {
  return checklist.items.map((item) => item.text);
}

function idsOf(checklist) {
  return checklist.items.map((item) => item.id);
}

function orderedPlan() {
  return Engine.createChecklist({
    title: 'Ordered Plan',
    items: [
      { id: 'pitm_a', text: 'A' },
      { id: 'pitm_b', text: 'B' },
      { id: 'pitm_c', text: 'C' },
      { id: 'pitm_d', text: 'D' },
      { id: 'pitm_e', text: 'E' }
    ]
  }).checklist;
}

test('exposes a stable schema-versioned API surface', () => {
  assert.strictEqual(Engine.SCHEMA_VERSION, 1);
  assert.deepStrictEqual(Object.keys(Engine).sort(), [
    'CHECKLIST_DEFAULTS',
    'SCHEMA_VERSION',
    'addItem',
    'clearCompleted',
    'createChecklist',
    'createChecklistFromTemplate',
    'deriveChecklistId',
    'deriveItemId',
    'getTemplate',
    'listTemplates',
    'migrate',
    'moveItem',
    'normalizeChecklist',
    'parse',
    'removeItem',
    'reorderItems',
    'serialize',
    'summarizeChecklist',
    'toggleItem',
    'updateChecklist',
    'updateItem',
    'validateChecklist'
  ]);
  assert.strictEqual(typeof Engine.CHECKLIST_DEFAULTS, 'object');
  assert.strictEqual(Object.isFrozen(Engine.CHECKLIST_DEFAULTS), true);
  assert.strictEqual(Object.isFrozen(Engine.CHECKLIST_DEFAULTS.items), true);
  assert.strictEqual(Object.isFrozen(Engine.CHECKLIST_DEFAULTS.tags), true);
  assert.strictEqual(Engine.CHECKLIST_DEFAULTS.description, '');
  assert.strictEqual(Engine.CHECKLIST_DEFAULTS.notes, '');
  assert.strictEqual(typeof Engine.deriveChecklistId('seed'), 'string');
  assert.strictEqual(typeof Engine.deriveItemId('seed'), 'string');
});

test('listTemplates returns detached copies and every template builds a valid checklist', () => {
  const first = Engine.listTemplates();
  assert.ok(Array.isArray(first));
  assert.ok(first.length >= 4, 'expected at least four built-in templates');
  const snapshot = JSON.stringify(first);

  first[0].title = 'MUTATED';
  first[0].description = 'MUTATED';
  first[0].items.push({ text: 'Injected', minutes: 1 });
  first[0].items[0].minutes = 999;

  const second = Engine.listTemplates();
  assert.strictEqual(JSON.stringify(second), snapshot, 'built-in templates must not leak');
  assert.notStrictEqual(second[0], first[0]);

  for (const template of second) {
    const built = Engine.createChecklistFromTemplate(template.id, {});
    assert.strictEqual(built.ok, true, template.id + ' must build: ' + JSON.stringify(built.errors));
    assert.strictEqual(Engine.validateChecklist(built.checklist).ok, true);
    assert.strictEqual(built.checklist.templateId, template.id);
    assert.ok(built.checklist.id.startsWith('plan_'), 'checklist ids must be derived');
    assert.notStrictEqual(built.checklist.id, template.id);
    assert.ok(built.checklist.items.length >= 4, template.id + ' must ship at least four items');
    for (const item of built.checklist.items) {
      assert.ok(item.id.startsWith('pitm_'), 'item ids must be derived');
      assert.strictEqual(typeof item.text, 'string');
      assert.ok(item.text.length > 0);
      assert.strictEqual(item.done, false);
    }
    const reparsed = Engine.parse(Engine.serialize(built.checklist));
    assert.strictEqual(reparsed.ok, true);
    assert.deepStrictEqual(reparsed.checklist, built.checklist, template.id + ' must round-trip');
  }

  const single = Engine.getTemplate(second[0].id);
  assert.strictEqual(single.id, second[0].id);
  single.title = 'HIJACKED';
  single.items.length = 0;
  const again = Engine.getTemplate(second[0].id);
  assert.notStrictEqual(again.items.length, 0);
  assert.notStrictEqual(again.title, 'HIJACKED');
  assert.strictEqual(Engine.getTemplate('plan_missing'), null);
  assert.strictEqual(Engine.getTemplate(7), null);
});

test('createChecklist is deterministic, normalized and never mutates its input', () => {
  const spec = {
    title: '  Morning Plan  ',
    description: '  pick one thing and finish it  ',
    items: [
      { text: '  Review notes ', minutes: 5000 },
      { text: '   ' },
      { text: 'Pick one task', minutes: '3' },
      { text: 'Zero minutes', minutes: -5 }
    ],
    notes: '  ease in  ',
    tags: ['calm', 'morning', 'calm']
  };
  const before = JSON.stringify(spec);

  const one = Engine.createChecklist(spec);
  const two = Engine.createChecklist(JSON.parse(JSON.stringify(spec)));
  assert.strictEqual(JSON.stringify(spec), before, 'createChecklist must not mutate the spec');
  assert.strictEqual(one.ok, true, JSON.stringify(one.errors));
  assert.deepStrictEqual(one.checklist, two.checklist, 'repeated builds must be identical');

  const checklist = one.checklist;
  assert.strictEqual(checklist.title, 'Morning Plan');
  assert.strictEqual(checklist.description, 'pick one thing and finish it');
  assert.strictEqual(checklist.templateId, null);
  assert.ok(checklist.id.startsWith('plan_'));
  assert.strictEqual(checklist.notes, 'ease in');
  assert.deepStrictEqual(checklist.tags, ['calm', 'morning']);
  assert.strictEqual(checklist.items.length, 3, 'label-less items must be dropped');
  assert.deepStrictEqual(checklist.items[0], {
    id: checklist.items[0].id,
    text: 'Review notes',
    done: false,
    minutes: 600,
    note: ''
  });
  assert.strictEqual(checklist.items[1].text, 'Pick one task');
  assert.strictEqual(checklist.items[1].minutes, 3);
  assert.strictEqual(checklist.items[2].minutes, 0, 'minutes below the minimum must clamp up');
  assert.strictEqual(Engine.validateChecklist(checklist).ok, true);
  assert.deepStrictEqual(Engine.normalizeChecklist(checklist), checklist, 'normalize must be idempotent');

  assert.strictEqual(Engine.createChecklist(null).ok, false);
  assert.strictEqual(Engine.createChecklist(null).errors[0].code, 'SPEC_NOT_OBJECT');
  assert.strictEqual(Engine.createChecklist('nope').errors[0].code, 'SPEC_NOT_OBJECT');
});

test('createChecklist fills documented defaults, requires a title and at least one item', () => {
  const okRes = Engine.createChecklist({
    title: '  Thesis Warmup ',
    description: ' ease into deep reading ',
    items: [{ text: 'Sit down', minutes: 1 }, { text: 'Set lamp', note: ' warm light ' }]
  });
  assert.strictEqual(okRes.ok, true, JSON.stringify(okRes.errors));
  const checklist = okRes.checklist;
  assert.strictEqual(checklist.title, 'Thesis Warmup');
  assert.strictEqual(checklist.description, 'ease into deep reading');
  assert.strictEqual(checklist.templateId, null);
  assert.ok(checklist.id.startsWith('plan_'));
  assert.strictEqual(checklist.notes, Engine.CHECKLIST_DEFAULTS.notes);
  assert.deepStrictEqual(checklist.tags, []);
  assert.strictEqual(checklist.items.length, 2);
  assert.strictEqual(checklist.items[1].minutes, 0, 'missing minutes fall back to the documented default');
  assert.strictEqual(checklist.items[1].note, 'warm light');
  assert.strictEqual(checklist.items[1].done, false);
  assert.ok(checklist.items[0].id.startsWith('pitm_'));
  assert.strictEqual(Engine.validateChecklist(checklist).ok, true);

  const missingTitle = Engine.createChecklist({ items: [{ text: 'Sit', minutes: 1 }] });
  assert.strictEqual(missingTitle.ok, false);
  assert.ok(missingTitle.errors.some((e) => e.code === 'TITLE_REQUIRED'));

  const noItems = Engine.createChecklist({ title: 'Empty' });
  assert.strictEqual(noItems.ok, false);
  assert.ok(noItems.errors.some((e) => e.code === 'ITEMS_EMPTY'));
});

test('createChecklistFromTemplate applies overrides without mutating them', () => {
  const overrides = {
    title: '  Friday Review ',
    items: [
      { text: '  Collect open loops ', minutes: 400 },
      { text: '   ' },
      { text: 'Pick three outcomes', minutes: '6' },
      { text: 'Nothing', minutes: -1 }
    ],
    notes: '  keep it short  ',
    tags: ['weekly', 'weekly', 'calm']
  };
  const before = JSON.stringify(overrides);

  const res = Engine.createChecklistFromTemplate('plan_week_review', overrides);
  assert.strictEqual(JSON.stringify(overrides), before, 'overrides must not be mutated');
  assert.strictEqual(res.ok, true, JSON.stringify(res.errors));
  assert.strictEqual(res.checklist.title, 'Friday Review');
  assert.strictEqual(
    res.checklist.description,
    'Collect every open loop into one list, then rank the outcomes for next week.'
  );
  assert.strictEqual(res.checklist.templateId, 'plan_week_review');
  assert.strictEqual(res.checklist.items.length, 3, 'empty-text items must be dropped');
  assert.strictEqual(res.checklist.items[0].text, 'Collect open loops');
  assert.strictEqual(res.checklist.items[0].minutes, 400, 'in-range minutes must pass through unchanged');
  assert.strictEqual(res.checklist.items[1].text, 'Pick three outcomes');
  assert.strictEqual(res.checklist.items[1].minutes, 6);
  assert.strictEqual(res.checklist.items[2].minutes, 0);
  assert.deepStrictEqual(res.checklist.tags, ['weekly', 'calm']);
  assert.strictEqual(res.checklist.notes, 'keep it short');
  assert.strictEqual(Engine.validateChecklist(res.checklist).ok, true);
});

test('createChecklistFromTemplate rejects unknown templates and malformed input', () => {
  const unknown = Engine.createChecklistFromTemplate('plan_missing', {});
  assert.strictEqual(unknown.ok, false);
  assert.strictEqual(unknown.errors[0].code, 'TEMPLATE_NOT_FOUND');

  const badOverrides = Engine.createChecklistFromTemplate('plan_deep_block', 'nope');
  assert.strictEqual(badOverrides.ok, false);
  assert.strictEqual(badOverrides.errors[0].code, 'OVERRIDES_NOT_OBJECT');

  const emptyItems = Engine.createChecklistFromTemplate('plan_deep_block', { items: [] });
  assert.strictEqual(emptyItems.ok, false);
  assert.ok(emptyItems.errors.some((e) => e.code === 'ITEMS_EMPTY'));

  const emptyTitle = Engine.createChecklistFromTemplate('plan_deep_block', { title: '' });
  assert.strictEqual(emptyTitle.ok, false);
  assert.ok(emptyTitle.errors.some((e) => e.code === 'TITLE_REQUIRED'));
});

test('validateChecklist reports every broken field with stable codes', () => {
  const broken = {
    id: 'not a valid id!',
    title: '',
    description: 'd'.repeat(141),
    templateId: 7,
    items: 'nope',
    notes: 'n'.repeat(281),
    tags: ['a', 'a', 't'.repeat(25), 'b', 'c', 'd', 'e']
  };
  const res = Engine.validateChecklist(broken);
  assert.strictEqual(res.ok, false);
  const codes = new Set(res.errors.map((e) => e.code));
  const expectedCodes = [
    'ID_INVALID',
    'TITLE_REQUIRED',
    'DESCRIPTION_TOO_LONG',
    'TEMPLATE_ID_INVALID',
    'ITEMS_INVALID',
    'NOTES_TOO_LONG',
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

  const badItems = Engine.validateChecklist({
    title: 'Messy',
    items: [
      'nope',
      { text: '' },
      { text: 'x'.repeat(121) },
      { text: 'a', minutes: -1 },
      { text: 'b', minutes: 601 },
      { text: 'c', note: 5 },
      { text: 'd', note: 'n'.repeat(141) },
      { id: 'bad id', text: 'e' },
      { id: 'dup', text: 'f' },
      { id: 'dup', text: 'g' }
    ]
  });
  assert.strictEqual(badItems.ok, false);
  const itemCodes = new Set(badItems.errors.map((e) => e.code));
  const expectedItemCodes = [
    'ITEM_NOT_OBJECT',
    'ITEM_TEXT_REQUIRED',
    'ITEM_TEXT_TOO_LONG',
    'ITEM_MINUTES_RANGE',
    'ITEM_NOTE_INVALID',
    'ITEM_NOTE_TOO_LONG',
    'ITEM_ID_INVALID',
    'ITEM_DUPLICATE_ID'
  ];
  for (const code of expectedItemCodes) {
    assert.ok(itemCodes.has(code), 'missing item error code ' + code);
  }

  const emptyItems = Engine.validateChecklist({ title: 'x', items: [] });
  assert.strictEqual(emptyItems.ok, false);
  assert.ok(emptyItems.errors.some((e) => e.code === 'ITEMS_EMPTY'));

  const tooMany = Engine.validateChecklist({
    title: 'x',
    items: Array.from({ length: 41 }, (_, i) => ({ text: 'Item ' + i }))
  });
  assert.strictEqual(tooMany.ok, false);
  assert.ok(tooMany.errors.some((e) => e.code === 'ITEMS_LIMIT'));

  assert.strictEqual(Engine.validateChecklist(null).ok, false);
  assert.strictEqual(Engine.validateChecklist(null).errors[0].code, 'CHECKLIST_NOT_OBJECT');
  assert.strictEqual(Engine.validateChecklist([1, 2]).errors[0].code, 'CHECKLIST_NOT_OBJECT');
  assert.strictEqual(Engine.validateChecklist('checklist').errors[0].code, 'CHECKLIST_NOT_OBJECT');
});

test('normalizeChecklist cleans messy input without mutating it and is idempotent', () => {
  const messy = {
    id: '',
    title: '   Calm Plan  ',
    description: '  one thing at a time ',
    templateId: undefined,
    items: [
      { id: 'pitm_keep', text: '  Sit down   ', minutes: 5000 },
      'skip',
      { text: '', minutes: 3 },
      { text: 'Breathe', minutes: -2, note: '  in out ' },
      { text: 'Breathe', minutes: '2' },
      { text: 'Begin', minutes: 0 },
      { id: 'pitm_keep', text: 'Duplicate id lands here' }
    ],
    notes: '  take it easy ',
    tags: ['  a  ', '', 'a', 42, 'b']
  };
  const before = JSON.stringify(messy);

  const clean = Engine.normalizeChecklist(messy);
  assert.strictEqual(JSON.stringify(messy), before, 'normalize must not mutate its input');
  assert.ok(clean);
  assert.strictEqual(clean.title, 'Calm Plan');
  assert.strictEqual(clean.description, 'one thing at a time');
  assert.ok(clean.id.startsWith('plan_'));
  assert.strictEqual(clean.templateId, null);
  assert.strictEqual(clean.notes, 'take it easy');
  assert.deepStrictEqual(clean.tags, ['a', 'b']);
  assert.strictEqual(clean.items.length, 5, 'empty-text items and non-objects must be dropped');
  assert.deepStrictEqual(clean.items[0], {
    id: 'pitm_keep',
    text: 'Sit down',
    done: false,
    minutes: 600,
    note: ''
  });
  assert.deepStrictEqual(clean.items[1], {
    id: clean.items[1].id,
    text: 'Breathe',
    done: false,
    minutes: 0,
    note: 'in out'
  });
  assert.strictEqual(clean.items[2].minutes, 2);
  assert.strictEqual(clean.items[2].note, '');
  assert.strictEqual(clean.items[3].minutes, 0);
  assert.strictEqual(clean.items[4].id.startsWith('pitm_'), true);
  assert.strictEqual(
    clean.items[4].id,
    Engine.deriveItemId('Duplicate id lands here|6'),
    'colliding ids must be re-derived from content and position'
  );
  const uniqueIds = new Set(idsOf(clean));
  assert.strictEqual(uniqueIds.size, clean.items.length, 'item ids must stay unique');
  assert.strictEqual(Engine.validateChecklist(clean).ok, true, JSON.stringify(Engine.validateChecklist(clean)));
  assert.deepStrictEqual(Engine.normalizeChecklist(clean), clean, 'normalize must be idempotent');

  assert.strictEqual(Engine.normalizeChecklist(null), null);
  assert.strictEqual(Engine.normalizeChecklist('checklist'), null);
  assert.strictEqual(Engine.normalizeChecklist({ title: '   ' }), null);
  assert.strictEqual(Engine.normalizeChecklist({ title: 'x', items: [] }), null);
  assert.strictEqual(Engine.normalizeChecklist({ title: 'x', items: 'nope' }), null);
});

test('updateChecklist returns a new validated checklist and leaves the original untouched', () => {
  const base = Engine.createChecklist({ title: 'Base Plan', items: [{ text: 'A', minutes: 1 }] }).checklist;
  const before = JSON.stringify(base);

  const res = Engine.updateChecklist(base, {
    title: 'Renamed Plan',
    items: [{ text: 'A', minutes: 1 }, { text: 'B', minutes: 2 }],
    tags: ['evening']
  });
  assert.strictEqual(res.ok, true, JSON.stringify(res.errors));
  assert.notStrictEqual(res.checklist, base);
  assert.strictEqual(res.checklist.title, 'Renamed Plan');
  assert.strictEqual(res.checklist.items.length, 2);
  assert.deepStrictEqual(res.checklist.tags, ['evening']);
  assert.strictEqual(JSON.stringify(base), before, 'update must not mutate the source checklist');
  assert.strictEqual(base.title, 'Base Plan');
  assert.strictEqual(Engine.validateChecklist(res.checklist).ok, true);

  const badItems = Engine.updateChecklist(base, { items: [] });
  assert.strictEqual(badItems.ok, false);
  assert.ok(badItems.errors.some((e) => e.code === 'ITEMS_EMPTY'));
  assert.strictEqual(JSON.stringify(base), before);

  const nullChecklist = Engine.updateChecklist(null, { title: 'x' });
  assert.strictEqual(nullChecklist.ok, false);
  assert.strictEqual(nullChecklist.errors[0].code, 'CHECKLIST_NOT_OBJECT');

  const badChanges = Engine.updateChecklist(base, 'x');
  assert.strictEqual(badChanges.ok, false);
  assert.strictEqual(badChanges.errors[0].code, 'CHANGES_NOT_OBJECT');
});

test('addItem, updateItem and removeItem keep the checklist valid and immutable', () => {
  const plan = Engine.createChecklist({
    title: 'Errands',
    items: [{ id: 'pitm_a', text: 'First', minutes: 5 }, { id: 'pitm_b', text: 'Second' }]
  }).checklist;
  const before = JSON.stringify(plan);

  const added = Engine.addItem(plan, { text: '  Third  ', minutes: '7' });
  assert.strictEqual(added.ok, true, JSON.stringify(added.errors));
  assert.strictEqual(JSON.stringify(plan), before, 'addItem must not mutate the source');
  assert.strictEqual(plan.items.length, 2);
  assert.strictEqual(added.checklist.items.length, 3);
  assert.strictEqual(added.checklist.items[2].text, 'Third');
  assert.strictEqual(added.checklist.items[2].minutes, 7);
  assert.strictEqual(added.checklist.items[2].done, false);
  assert.ok(added.checklist.items[2].id.startsWith('pitm_'));
  assert.strictEqual(new Set(idsOf(added.checklist)).size, 3, 'added ids must stay unique');
  assert.strictEqual(Engine.validateChecklist(added.checklist).ok, true);

  const clash = Engine.addItem(plan, { id: 'pitm_a', text: 'Clashing id' });
  assert.strictEqual(clash.ok, true);
  assert.notStrictEqual(clash.checklist.items[2].id, 'pitm_a', 'colliding ids must be re-derived');
  assert.strictEqual(new Set(idsOf(clash.checklist)).size, 3);

  assert.strictEqual(Engine.addItem(plan, { text: '   ' }).errors[0].code, 'ITEM_TEXT_REQUIRED');
  assert.strictEqual(Engine.addItem(null, { text: 'x' }).errors[0].code, 'CHECKLIST_NOT_OBJECT');
  assert.strictEqual(Engine.addItem(plan, 'nope').errors[0].code, 'ITEM_NOT_OBJECT');

  const fullResult = Engine.createChecklist({
    title: 'Maxed',
    items: Array.from({ length: 40 }, (_, i) => ({ text: 'Item ' + i }))
  });
  assert.strictEqual(fullResult.ok, true, JSON.stringify(fullResult.errors));
  const full = fullResult.checklist;
  assert.strictEqual(full.items.length, 40);
  assert.strictEqual(Engine.validateChecklist(full).ok, true);
  assert.strictEqual(Engine.addItem(full, { text: 'One too many' }).errors[0].code, 'ITEMS_LIMIT');

  const edited = Engine.updateItem(plan, 'pitm_b', {
    text: ' Second edited ',
    minutes: 9,
    note: '  remember ',
    id: 'hijacked'
  });
  assert.strictEqual(edited.ok, true, JSON.stringify(edited.errors));
  assert.strictEqual(JSON.stringify(plan), before, 'updateItem must not mutate the source');
  assert.strictEqual(edited.checklist.items[1].id, 'pitm_b', 'item identity must be preserved');
  assert.strictEqual(edited.checklist.items[1].text, 'Second edited');
  assert.strictEqual(edited.checklist.items[1].minutes, 9);
  assert.strictEqual(edited.checklist.items[1].note, 'remember');
  assert.strictEqual(Engine.validateChecklist(edited.checklist).ok, true);

  assert.strictEqual(Engine.updateItem(plan, 'pitm_z', { text: 'x' }).errors[0].code, 'ITEM_NOT_FOUND');
  assert.strictEqual(Engine.updateItem(plan, 42, { text: 'x' }).errors[0].code, 'ITEM_ID_INVALID');
  assert.strictEqual(Engine.updateItem(plan, 'pitm_a', 'x').errors[0].code, 'CHANGES_NOT_OBJECT');
  assert.strictEqual(Engine.updateItem(plan, 'pitm_a', { text: '   ' }).errors[0].code, 'ITEM_TEXT_REQUIRED');
  assert.strictEqual(Engine.updateItem(null, 'pitm_a', { text: 'x' }).errors[0].code, 'CHECKLIST_NOT_OBJECT');

  const removed = Engine.removeItem(plan, 'pitm_a');
  assert.strictEqual(removed.ok, true, JSON.stringify(removed.errors));
  assert.strictEqual(JSON.stringify(plan), before, 'removeItem must not mutate the source');
  assert.deepStrictEqual(idsOf(removed.checklist), ['pitm_b']);

  assert.strictEqual(Engine.removeItem(removed.checklist, 'pitm_b').errors[0].code, 'ITEM_REMOVE_LAST');
  assert.strictEqual(Engine.removeItem(plan, 'pitm_z').errors[0].code, 'ITEM_NOT_FOUND');
  assert.strictEqual(Engine.removeItem(plan, 42).errors[0].code, 'ITEM_ID_INVALID');
  assert.strictEqual(Engine.removeItem(null, 'pitm_a').errors[0].code, 'CHECKLIST_NOT_OBJECT');
  assert.deepStrictEqual(idsOf(plan), ['pitm_a', 'pitm_b'], 'failures must leave the source alone');
});

test('moveItem and reorderItems reorder without mutating the source', () => {
  const plan = orderedPlan();
  const before = JSON.stringify(plan);
  assert.deepStrictEqual(textsOf(plan), ['A', 'B', 'C', 'D', 'E']);

  const toFront = Engine.moveItem(plan, 'pitm_c', 0);
  assert.strictEqual(toFront.ok, true, JSON.stringify(toFront.errors));
  assert.deepStrictEqual(textsOf(toFront.checklist), ['C', 'A', 'B', 'D', 'E']);
  assert.deepStrictEqual(idsOf(toFront.checklist), ['pitm_c', 'pitm_a', 'pitm_b', 'pitm_d', 'pitm_e']);

  const toEnd = Engine.moveItem(plan, 'pitm_a', 4);
  assert.strictEqual(toEnd.ok, true);
  assert.deepStrictEqual(textsOf(toEnd.checklist), ['B', 'C', 'D', 'E', 'A']);

  const sameSpot = Engine.moveItem(plan, 'pitm_e', 4);
  assert.strictEqual(sameSpot.ok, true);
  assert.deepStrictEqual(sameSpot.checklist, plan, 'moving to the same index must be a no-op');

  const middle = Engine.moveItem(plan, 'pitm_e', 1);
  assert.strictEqual(middle.ok, true);
  assert.deepStrictEqual(textsOf(middle.checklist), ['A', 'E', 'B', 'C', 'D']);

  assert.strictEqual(JSON.stringify(plan), before, 'moveItem must not mutate the source');
  assert.strictEqual(Engine.validateChecklist(toFront.checklist).ok, true);

  assert.strictEqual(Engine.moveItem(plan, 'pitm_z', 0).errors[0].code, 'ITEM_NOT_FOUND');
  assert.strictEqual(Engine.moveItem(plan, 7, 0).errors[0].code, 'ITEM_ID_INVALID');
  assert.strictEqual(Engine.moveItem(plan, '', 0).errors[0].code, 'ITEM_ID_INVALID');
  assert.strictEqual(Engine.moveItem(plan, 'pitm_a', 5).errors[0].code, 'INDEX_RANGE');
  assert.strictEqual(Engine.moveItem(plan, 'pitm_a', -1).errors[0].code, 'INDEX_RANGE');
  assert.strictEqual(Engine.moveItem(plan, 'pitm_a', 1.5).errors[0].code, 'INDEX_INVALID');
  assert.strictEqual(Engine.moveItem(plan, 'pitm_a', '1').errors[0].code, 'INDEX_INVALID');
  assert.strictEqual(Engine.moveItem(plan, 'pitm_a', null).errors[0].code, 'INDEX_INVALID');
  assert.strictEqual(Engine.moveItem(null, 'pitm_a', 0).errors[0].code, 'CHECKLIST_NOT_OBJECT');
  assert.strictEqual(JSON.stringify(plan), before, 'failed moves must leave the source alone');

  const reversed = Engine.reorderItems(plan, ['pitm_e', 'pitm_d', 'pitm_c', 'pitm_b', 'pitm_a']);
  assert.strictEqual(reversed.ok, true, JSON.stringify(reversed.errors));
  assert.deepStrictEqual(textsOf(reversed.checklist), ['E', 'D', 'C', 'B', 'A']);
  assert.strictEqual(JSON.stringify(plan), before, 'reorderItems must not mutate the source');
  assert.strictEqual(Engine.validateChecklist(reversed.checklist).ok, true);

  const identity = Engine.reorderItems(plan, idsOf(plan));
  assert.strictEqual(identity.ok, true);
  assert.deepStrictEqual(identity.checklist, plan, 'reordering with the current order must be a no-op');

  const done = Engine.toggleItem(plan, 'pitm_c');
  const movedDone = Engine.reorderItems(done.checklist, ['pitm_c', 'pitm_a', 'pitm_b', 'pitm_d', 'pitm_e']);
  assert.strictEqual(movedDone.ok, true);
  assert.strictEqual(movedDone.checklist.items[0].text, 'C');
  assert.strictEqual(movedDone.checklist.items[0].done, true, 'completion state must travel with its item');

  assert.strictEqual(Engine.reorderItems(plan, 'abc').errors[0].code, 'ORDER_NOT_ARRAY');
  assert.strictEqual(Engine.reorderItems(plan, null).errors[0].code, 'ORDER_NOT_ARRAY');
  assert.strictEqual(Engine.reorderItems(plan, ['pitm_a', 'pitm_b']).errors[0].code, 'ORDER_MISMATCH');
  assert.strictEqual(
    Engine.reorderItems(plan, ['pitm_a', 'pitm_a', 'pitm_b', 'pitm_c', 'pitm_d']).errors[0].code,
    'ORDER_DUPLICATE'
  );
  assert.strictEqual(
    Engine.reorderItems(plan, ['pitm_a', 'pitm_b', 'pitm_c', 'pitm_d', 'pitm_x']).errors[0].code,
    'ORDER_MISMATCH'
  );
  assert.strictEqual(
    Engine.reorderItems(plan, ['pitm_a', 'pitm_b', 'pitm_c', 'pitm_d', 5]).errors[0].code,
    'ORDER_ID_INVALID'
  );
  assert.strictEqual(Engine.reorderItems(null, []).errors[0].code, 'CHECKLIST_NOT_OBJECT');

  const roundTrip = Engine.parse(Engine.serialize(reversed.checklist));
  assert.strictEqual(roundTrip.ok, true);
  assert.deepStrictEqual(textsOf(roundTrip.checklist), ['E', 'D', 'C', 'B', 'A'], 'reorders must survive serialization');
});

test('toggleItem and clearCompleted manage completion state immutably', () => {
  const plan = Engine.createChecklist({
    title: 'Two Passes',
    items: [{ id: 'pitm_a', text: 'Draft' }, { id: 'pitm_b', text: 'Revise' }]
  }).checklist;
  const before = JSON.stringify(plan);

  const first = Engine.toggleItem(plan, 'pitm_a');
  assert.strictEqual(first.ok, true, JSON.stringify(first.errors));
  assert.strictEqual(JSON.stringify(plan), before, 'toggleItem must not mutate the source');
  assert.strictEqual(plan.items[0].done, false);
  assert.strictEqual(first.checklist.items[0].done, true);
  assert.strictEqual(first.checklist.items[1].done, false);

  const back = Engine.toggleItem(first.checklist, 'pitm_a');
  assert.strictEqual(back.ok, true);
  assert.strictEqual(back.checklist.items[0].done, false);
  assert.deepStrictEqual(back.checklist, plan, 'toggling twice must restore the original');

  assert.strictEqual(Engine.toggleItem(plan, 'pitm_z').errors[0].code, 'ITEM_NOT_FOUND');
  assert.strictEqual(Engine.toggleItem(plan, 9).errors[0].code, 'ITEM_ID_INVALID');
  assert.strictEqual(Engine.toggleItem(null, 'pitm_a').errors[0].code, 'CHECKLIST_NOT_OBJECT');

  const partial = Engine.toggleItem(
    Engine.toggleItem(plan, 'pitm_a').checklist,
    'pitm_b'
  ).checklist;
  assert.strictEqual(partial.items[0].done, true);
  assert.strictEqual(partial.items[1].done, true);
  const partialBefore = JSON.stringify(partial);

  const cleared = Engine.clearCompleted(partial);
  assert.strictEqual(cleared.ok, true, JSON.stringify(cleared.errors));
  assert.strictEqual(JSON.stringify(partial), partialBefore, 'clearCompleted must not mutate the source');
  assert.deepStrictEqual(idsOf(cleared.checklist), idsOf(plan), 'clearing must preserve order and ids');
  assert.deepStrictEqual(cleared.checklist, plan, 'clearing every done flag must restore the original');

  const noop = Engine.clearCompleted(plan);
  assert.strictEqual(noop.ok, true);
  assert.deepStrictEqual(noop.checklist, plan, 'clearing with nothing done must be a no-op');
  assert.strictEqual(Engine.clearCompleted(null).errors[0].code, 'CHECKLIST_NOT_OBJECT');
  assert.strictEqual(Engine.clearCompleted('plan').errors[0].code, 'CHECKLIST_NOT_OBJECT');
});

test('summarizeChecklist reports deterministic progress and next item', () => {
  const plan = Engine.createChecklist({
    title: 'Four Gates',
    items: [
      { id: 'pitm_a', text: 'A', minutes: 2 },
      { id: 'pitm_b', text: 'B', minutes: 3 },
      { id: 'pitm_c', text: 'C', minutes: 5 },
      { id: 'pitm_d', text: 'D', minutes: 4 }
    ]
  }).checklist;

  const idle = Engine.summarizeChecklist(plan);
  assert.deepStrictEqual(idle, {
    totalItems: 4,
    doneCount: 0,
    pendingCount: 4,
    percent: 0,
    completed: false,
    nextItemId: 'pitm_a',
    nextItemLabel: 'A',
    totalMinutes: 14,
    pendingMinutes: 14
  });
  assert.deepStrictEqual(Engine.summarizeChecklist(plan), idle, 'summaries must be deterministic');

  let mid = Engine.toggleItem(plan, 'pitm_a').checklist;
  mid = Engine.toggleItem(mid, 'pitm_b').checklist;
  assert.deepStrictEqual(Engine.summarizeChecklist(mid), {
    totalItems: 4,
    doneCount: 2,
    pendingCount: 2,
    percent: 50,
    completed: false,
    nextItemId: 'pitm_c',
    nextItemLabel: 'C',
    totalMinutes: 14,
    pendingMinutes: 9
  });

  let done = mid;
  done = Engine.toggleItem(done, 'pitm_c').checklist;
  done = Engine.toggleItem(done, 'pitm_d').checklist;
  assert.deepStrictEqual(Engine.summarizeChecklist(done), {
    totalItems: 4,
    doneCount: 4,
    pendingCount: 0,
    percent: 100,
    completed: true,
    nextItemId: null,
    nextItemLabel: null,
    totalMinutes: 14,
    pendingMinutes: 0
  });

  const front = Engine.summarizeChecklist(Engine.moveItem(plan, 'pitm_c', 0).checklist);
  assert.strictEqual(front.nextItemId, 'pitm_c', 'the next item must follow the visible order');
  assert.strictEqual(front.nextItemLabel, 'C');
  assert.strictEqual(front.percent, 0);

  assert.strictEqual(Engine.summarizeChecklist(null), null);
  assert.strictEqual(Engine.summarizeChecklist({ title: 'x' }), null);
});

test('serialize and parse round-trip with a stamped schema version and canonical bytes', () => {
  const plan = Engine.createChecklistFromTemplate('plan_exam_prep', { notes: '  before the mock exam  ' }).checklist;
  const json = Engine.serialize(plan);
  assert.strictEqual(typeof json, 'string');
  const doc = JSON.parse(json);
  assert.strictEqual(doc.schemaVersion, 1);
  assert.strictEqual(typeof doc.checklist.id, 'string');
  assert.deepStrictEqual(Object.keys(doc), ['schemaVersion', 'checklist']);

  const parsed = Engine.parse(json);
  assert.strictEqual(parsed.ok, true, JSON.stringify(parsed.errors));
  assert.deepStrictEqual(parsed.checklist, plan, 'round trip must preserve the checklist');
  assert.strictEqual(parsed.migratedFrom, null);
  assert.strictEqual(Engine.serialize(parsed.checklist), json, 'serialization must be canonical');
  assert.strictEqual(Engine.parse(Engine.serialize(parsed.checklist)).ok, true);

  assert.strictEqual(Engine.serialize({ title: 'nope' }), null);
  assert.strictEqual(Engine.serialize(null), null);
  assert.strictEqual(Engine.parse('not json').ok, false);
  assert.strictEqual(Engine.parse('not json').errors[0].code, 'MALFORMED');
  assert.strictEqual(Engine.parse('[]').errors[0].code, 'DOCUMENT_NOT_OBJECT');
  assert.strictEqual(Engine.parse({}).errors[0].code, 'MALFORMED');
  assert.strictEqual(Engine.parse(JSON.stringify({ schemaVersion: 1 })).errors[0].code, 'CHECKLIST_MISSING');
  assert.strictEqual(
    Engine.parse(JSON.stringify({ schemaVersion: 1, checklist: 'nope' })).errors[0].code,
    'CHECKLIST_MISSING'
  );
  assert.strictEqual(
    Engine.parse(JSON.stringify({ schemaVersion: 2, checklist: {} })).errors[0].code,
    'SCHEMA_VERSION_UNSUPPORTED'
  );
  assert.strictEqual(Engine.parse(JSON.stringify({ checklist: {} })).errors[0].code, 'SCHEMA_VERSION_MISSING');
});

test('migrate upgrades legacy schema 0 documents and blocks unknown versions', () => {
  const legacy = {
    schemaVersion: 0,
    title: 'Legacy Errands',
    purpose: 'clear the desk before deep work',
    notes: 'old notes',
    tags: ['old'],
    tasks: [
      { text: 'Close extra tabs', completed: true, durationMinutes: 5 },
      'Fill the water bottle'
    ]
  };
  const before = JSON.stringify(legacy);

  const parsed = Engine.parse(JSON.stringify(legacy));
  assert.strictEqual(JSON.stringify(legacy), before, 'parsing must not mutate the caller document');
  assert.strictEqual(parsed.ok, true, JSON.stringify(parsed.errors));
  assert.strictEqual(parsed.migratedFrom, 0);
  assert.strictEqual(parsed.checklist.title, 'Legacy Errands');
  assert.strictEqual(parsed.checklist.description, 'clear the desk before deep work');
  assert.strictEqual(parsed.checklist.templateId, null);
  assert.strictEqual(parsed.checklist.notes, 'old notes');
  assert.deepStrictEqual(parsed.checklist.tags, ['old']);
  assert.ok(parsed.checklist.id.startsWith('plan_'));
  assert.strictEqual(parsed.checklist.items.length, 2);
  assert.deepStrictEqual(parsed.checklist.items[0], {
    id: parsed.checklist.items[0].id,
    text: 'Close extra tabs',
    done: true,
    minutes: 5,
    note: ''
  });
  assert.ok(parsed.checklist.items[0].id.startsWith('pitm_'));
  assert.strictEqual(parsed.checklist.items[1].text, 'Fill the water bottle');
  assert.strictEqual(parsed.checklist.items[1].done, false);
  assert.strictEqual(parsed.checklist.items[1].minutes, 0, 'legacy string items fall back to default minutes');
  assert.strictEqual(Engine.validateChecklist(parsed.checklist).ok, true);

  const direct = Engine.migrate(legacy);
  assert.strictEqual(JSON.stringify(legacy), before, 'migrate must not mutate legacy documents');
  assert.strictEqual(direct.ok, true);
  assert.strictEqual(direct.migratedFrom, 0);
  assert.deepStrictEqual(direct.checklist, parsed.checklist, 'migrate must be deterministic');

  const alt = Engine.parse(
    JSON.stringify({
      schemaVersion: 0,
      name: 'Old Reading List',
      checklist: [{ label: 'Read chapter two', checked: false, minutes: 20 }]
    })
  );
  assert.strictEqual(alt.ok, true, JSON.stringify(alt.errors));
  assert.strictEqual(alt.migratedFrom, 0);
  assert.strictEqual(alt.checklist.title, 'Old Reading List');
  assert.strictEqual(alt.checklist.items[0].text, 'Read chapter two');
  assert.strictEqual(alt.checklist.items[0].done, false);
  assert.strictEqual(alt.checklist.items[0].minutes, 20);

  assert.strictEqual(
    Engine.parse(JSON.stringify({ schemaVersion: 2, checklist: {} })).errors[0].code,
    'SCHEMA_VERSION_UNSUPPORTED'
  );
  assert.strictEqual(Engine.parse(JSON.stringify({ checklist: {} })).errors[0].code, 'SCHEMA_VERSION_MISSING');
  assert.strictEqual(Engine.migrate(null).errors[0].code, 'DOCUMENT_NOT_OBJECT');
  assert.strictEqual(Engine.migrate('doc').errors[0].code, 'DOCUMENT_NOT_OBJECT');
});

test('prototype-like names never pollute Object.prototype', () => {
  const evil = JSON.parse(
    '{"__proto__":{"polluted":"yes"},"id":"__proto__","title":"Safe","description":"","' +
      'templateId":null,"items":[{"id":"__proto__","text":"Go","done":true,"minutes":1,"note":""}],' +
      '"notes":"","tags":["__proto__"]}'
  );

  const normalized = Engine.normalizeChecklist(evil);
  assert.ok(normalized);
  assert.strictEqual({}.polluted, undefined);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(normalized, '__proto__'), false);
  assert.strictEqual(normalized.id, '__proto__');
  assert.strictEqual(normalized.title, 'Safe');
  assert.deepStrictEqual(normalized.tags, ['__proto__']);
  assert.strictEqual(normalized.items[0].id, '__proto__');
  assert.strictEqual(normalized.items[0].done, true);
  assert.strictEqual(Engine.validateChecklist(evil).ok, true);

  const parsed = Engine.parse(JSON.stringify({ schemaVersion: 1, checklist: evil }));
  assert.strictEqual(parsed.ok, true, JSON.stringify(parsed.errors));
  assert.strictEqual({}.polluted, undefined);
  assert.strictEqual(parsed.checklist.id, '__proto__');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(parsed.checklist, '__proto__'), false);

  const summary = Engine.summarizeChecklist(parsed.checklist);
  assert.strictEqual(summary.totalItems, 1);
  assert.strictEqual(summary.doneCount, 1);
  assert.strictEqual({}.polluted, undefined);

  const reordered = Engine.reorderItems(parsed.checklist, ['__proto__']);
  assert.strictEqual(reordered.ok, true);
  assert.strictEqual({}.polluted, undefined);

  const custom = Engine.createChecklist({
    id: '__proto__',
    title: 'constructor',
    items: [{ text: 'x', minutes: 1 }]
  });
  assert.strictEqual(custom.ok, true);
  assert.strictEqual(custom.checklist.id, '__proto__');
  assert.strictEqual({}.polluted, undefined);
  assert.strictEqual(Engine.deriveChecklistId('constructor'), Engine.deriveChecklistId('constructor'));

  const toggled = Engine.toggleItem(parsed.checklist, '__proto__');
  assert.strictEqual(toggled.ok, true);
  assert.strictEqual(toggled.checklist.items[0].done, false);
  assert.strictEqual({}.polluted, undefined);
});

test('engine source stays dependency-free and side-effect free', () => {
  const source = fs.readFileSync(ENGINE_PATH, 'utf8');
  assert.ok(/module\.exports/.test(source), 'CommonJS export required');
  assert.ok(!/\brequire\s*\(/.test(source), 'engine must not require other modules');
  assert.ok(!/localStorage|sessionStorage|indexedDB/.test(source), 'engine must not touch persistence');
  assert.ok(!/XMLHttpRequest|WebSocket|\bfetch\s*\(/.test(source), 'engine must not touch the network');
  assert.ok(!/Date\.now|Math\.random/.test(source), 'engine must stay deterministic');
  assert.ok(!/setTimeout|setInterval|requestAnimationFrame/.test(source), 'engine must not schedule work');
  assert.ok(!/process\.|globalThis/.test(source), 'engine must not reach into the runtime');
});

test('engine runs with time, randomness, storage and network access blocked', () => {
  const beforeLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const originalNow = Date.now;
  const originalRandom = Math.random;
  const restores = [];

  Date.now = function blockedNow() {
    throw new Error('Date.now must not be used by the focus plan checklist engine');
  };
  Math.random = function blockedRandom() {
    throw new Error('Math.random must not be used by the focus plan checklist engine');
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
    const plan = Engine.createChecklistFromTemplate('plan_deep_block', {}).checklist;
    const baseIds = idsOf(plan);
    const summaryBefore = Engine.summarizeChecklist(plan);
    const moved = Engine.moveItem(plan, baseIds[0], 3);
    const movedIds = [baseIds[1], baseIds[2], baseIds[3], baseIds[0], baseIds[4], baseIds[5]];
    const reordered = Engine.reorderItems(moved.checklist, idsOf(moved.checklist).slice().reverse());
    const toggled = Engine.toggleItem(reordered.checklist, reordered.checklist.items[0].id);
    const added = Engine.addItem(toggled.checklist, { text: 'Write the next step', minutes: 4 });
    const edited = Engine.updateItem(added.checklist, 'nope', { text: 'x' });
    const cleared = Engine.clearCompleted(toggled.checklist);
    const updated = Engine.updateChecklist(plan, { notes: '  blocked world  ', tags: ['safe'] });
    const migrated = Engine.migrate({
      schemaVersion: 0,
      title: 'Blocked Legacy',
      purpose: 'stays offline',
      tasks: ['Breathe', { label: 'Begin', durationMinutes: 3 }]
    });
    captured = {
      templateCount: Engine.listTemplates().length,
      id: plan.id,
      summaryBefore,
      movedIds: idsOf(moved.checklist),
      expectedMovedIds: movedIds,
      reorderedIds: idsOf(reordered.checklist),
      expectedReorderedIds: movedIds.slice().reverse(),
      toggledDone: toggled.checklist.items[0].done,
      addedCount: added.checklist.items.length,
      editError: edited.errors[0].code,
      clearedCount: Engine.summarizeChecklist(cleared.checklist).doneCount,
      updatedNotes: updated.checklist.notes,
      roundTrip: Engine.parse(Engine.serialize(plan)),
      migrated
    };
  } finally {
    while (restores.length) restores.pop()();
  }

  assert.strictEqual(captured.templateCount >= 4, true);
  assert.ok(captured.id.startsWith('plan_'));
  assert.strictEqual(typeof captured.summaryBefore.totalMinutes, 'number');
  assert.deepStrictEqual(captured.movedIds, captured.expectedMovedIds, 'move must reorder by absolute index');
  assert.deepStrictEqual(captured.reorderedIds, captured.expectedReorderedIds, 'reorder must apply the given ids');
  assert.strictEqual(captured.toggledDone, true);
  assert.strictEqual(captured.addedCount, 7);
  assert.strictEqual(captured.editError, 'ITEM_NOT_FOUND');
  assert.strictEqual(captured.clearedCount, 0);
  assert.strictEqual(captured.updatedNotes, 'blocked world');
  assert.strictEqual(captured.roundTrip.ok, true);
  assert.strictEqual(captured.migrated.ok, true);
  assert.strictEqual(captured.migrated.migratedFrom, 0);
  assert.strictEqual(Date.now, originalNow, 'clock must be restored');
  assert.strictEqual(Math.random, originalRandom, 'random source must be restored');
  assert.deepStrictEqual(
    Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    beforeLocalStorage,
    'storage globals must be restored'
  );
});
