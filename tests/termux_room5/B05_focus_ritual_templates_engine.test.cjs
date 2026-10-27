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
  'focus_ritual_templates_engine.js'
);

const Engine = require(ENGINE_PATH);

function blockGlobal(name) {
  const original = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get: function () {
      throw new Error(name + ' must not be read by the focus ritual engine');
    },
    set: function () {
      throw new Error(name + ' must not be written by the focus ritual engine');
    }
  });
  return function restore() {
    if (original) Object.defineProperty(globalThis, name, original);
    else delete globalThis[name];
  };
}

test('exposes a stable schema-versioned API surface', () => {
  assert.strictEqual(Engine.SCHEMA_VERSION, 1);
  assert.deepStrictEqual(Object.keys(Engine).sort(), [
    'RITUAL_DEFAULTS',
    'SCHEMA_VERSION',
    'completeStep',
    'createCustomRitual',
    'createRitualFromTemplate',
    'deriveRitualId',
    'deriveStepId',
    'getTemplate',
    'listTemplates',
    'migrate',
    'normalizeRitual',
    'parse',
    'resetRun',
    'serialize',
    'startRun',
    'summarizeRitual',
    'summarizeRun',
    'updateRitual',
    'validateRitual'
  ]);
  assert.strictEqual(typeof Engine.RITUAL_DEFAULTS, 'object');
  assert.strictEqual(Object.isFrozen(Engine.RITUAL_DEFAULTS), true);
  assert.strictEqual(Object.isFrozen(Engine.RITUAL_DEFAULTS.steps), true);
  assert.strictEqual(Object.isFrozen(Engine.RITUAL_DEFAULTS.tags), true);
  assert.strictEqual(typeof Engine.deriveRitualId('seed'), 'string');
  assert.strictEqual(typeof Engine.deriveStepId('seed'), 'string');
});

test('listTemplates returns detached copies and every template builds a valid ritual', () => {
  const first = Engine.listTemplates();
  assert.ok(Array.isArray(first));
  assert.ok(first.length >= 4, 'expected at least four built-in templates');
  const snapshot = JSON.stringify(first);

  first[0].name = 'MUTATED';
  first[0].description = 'MUTATED';
  first[0].steps.push({ label: 'Injected', minutes: 1 });
  first[0].steps[0].minutes = 999;

  const second = Engine.listTemplates();
  assert.strictEqual(JSON.stringify(second), snapshot, 'built-in templates must not leak');
  assert.notStrictEqual(second[0], first[0]);

  for (const template of second) {
    const built = Engine.createRitualFromTemplate(template.id, {});
    assert.strictEqual(built.ok, true, template.id + ' must build: ' + JSON.stringify(built.errors));
    assert.strictEqual(Engine.validateRitual(built.ritual).ok, true);
    assert.strictEqual(built.ritual.templateId, template.id);
    assert.ok(built.ritual.id.startsWith('rit_'), 'ritual ids must be derived');
    assert.notStrictEqual(built.ritual.id, template.id);
    assert.ok(built.ritual.steps.length >= 3, template.id + ' must ship at least three steps');
    for (const step of built.ritual.steps) {
      assert.ok(step.id.startsWith('rstp_'), 'step ids must be derived');
      assert.strictEqual(typeof step.label, 'string');
      assert.ok(step.label.length > 0);
    }
  }

  const single = Engine.getTemplate(second[0].id);
  assert.strictEqual(single.id, second[0].id);
  single.steps[0].label = 'HIJACKED';
  single.steps.length = 0;
  const again = Engine.getTemplate(second[0].id);
  assert.notStrictEqual(again.steps.length, 0);
  assert.notStrictEqual(again.steps[0].label, 'HIJACKED');
  assert.strictEqual(Engine.getTemplate('rit_missing'), null);
  assert.strictEqual(Engine.getTemplate(7), null);
});

test('createRitualFromTemplate is deterministic and normalized', () => {
  const one = Engine.createRitualFromTemplate('rit_deep_work', {});
  const two = Engine.createRitualFromTemplate('rit_deep_work', {});
  assert.strictEqual(one.ok, true);
  assert.deepStrictEqual(one.ritual, two.ritual, 'repeated builds must be identical');

  const ritual = one.ritual;
  assert.strictEqual(ritual.templateId, 'rit_deep_work');
  assert.strictEqual(ritual.name, 'Deep Work Launch');
  assert.deepStrictEqual(
    ritual.steps.map((s) => s.label),
    ['Clear the desk', 'Phone to Do Not Disturb', 'Write one intention', 'Open the single task', 'Slow breath, then begin']
  );
  const labels = ritual.steps.map((s) => s.label).join(',');
  assert.strictEqual(
    ritual.id,
    Engine.deriveRitualId(ritual.name + '|' + ritual.description + '|' + labels),
    'ritual id must derive from its own content'
  );
  assert.strictEqual(Engine.validateRitual(ritual).ok, true);
  assert.strictEqual(Engine.validateRitual(ritual).errors.length, 0);
});

test('createRitualFromTemplate applies overrides without mutating them', () => {
  const overrides = {
    name: '  Morning Gate ',
    steps: [
      { label: '  Open curtains ', minutes: 2 },
      { label: '   ', minutes: 5 },
      { label: 'Drink water', minutes: '1' },
      { label: 'Pick one task', minutes: 0 }
    ],
    notes: '  ease in  ',
    tags: ['calm', 'morning', 'calm']
  };
  const before = JSON.stringify(overrides);

  const res = Engine.createRitualFromTemplate('rit_quick_reset', overrides);
  assert.strictEqual(JSON.stringify(overrides), before, 'overrides must not be mutated');
  assert.strictEqual(res.ok, true, JSON.stringify(res.errors));
  assert.strictEqual(res.ritual.name, 'Morning Gate');
  assert.strictEqual(res.ritual.description, 'Reset between demanding blocks without losing momentum.');
  assert.strictEqual(res.ritual.steps.length, 3, 'label-less steps must be dropped');
  assert.deepStrictEqual(res.ritual.steps[0], {
    id: res.ritual.steps[0].id,
    label: 'Open curtains',
    minutes: 2,
    note: ''
  });
  assert.strictEqual(res.ritual.steps[1].label, 'Drink water');
  assert.strictEqual(res.ritual.steps[1].minutes, 1);
  assert.strictEqual(res.ritual.steps[2].label, 'Pick one task');
  assert.strictEqual(res.ritual.steps[2].minutes, 1, 'minutes below the minimum must clamp up');
  assert.deepStrictEqual(res.ritual.tags, ['calm', 'morning']);
  assert.strictEqual(res.ritual.templateId, 'rit_quick_reset');
});

test('createRitualFromTemplate rejects unknown templates and malformed input', () => {
  const unknown = Engine.createRitualFromTemplate('rit_missing', {});
  assert.strictEqual(unknown.ok, false);
  assert.strictEqual(unknown.errors[0].code, 'TEMPLATE_NOT_FOUND');

  const badOverrides = Engine.createRitualFromTemplate('rit_deep_work', 'nope');
  assert.strictEqual(badOverrides.ok, false);
  assert.strictEqual(badOverrides.errors[0].code, 'OVERRIDES_NOT_OBJECT');

  const emptySteps = Engine.createRitualFromTemplate('rit_deep_work', { steps: [] });
  assert.strictEqual(emptySteps.ok, false);
  assert.ok(emptySteps.errors.some((e) => e.code === 'STEPS_EMPTY'));

  const emptyName = Engine.createRitualFromTemplate('rit_deep_work', { name: '' });
  assert.strictEqual(emptyName.ok, false);
  assert.ok(emptyName.errors.some((e) => e.code === 'NAME_REQUIRED'));
});

test('createCustomRitual fills documented defaults, requires a name and at least one step', () => {
  const okRes = Engine.createCustomRitual({
    name: '  Thesis Warmup ',
    description: ' ease into deep reading ',
    steps: [{ label: 'Sit down', minutes: 1 }, { label: 'Set lamp', note: ' warm light ' }]
  });
  assert.strictEqual(okRes.ok, true, JSON.stringify(okRes.errors));
  const ritual = okRes.ritual;
  assert.strictEqual(ritual.name, 'Thesis Warmup');
  assert.strictEqual(ritual.description, 'ease into deep reading');
  assert.strictEqual(ritual.templateId, null);
  assert.ok(ritual.id.startsWith('rit_'));
  assert.strictEqual(ritual.notes, Engine.RITUAL_DEFAULTS.notes);
  assert.deepStrictEqual(ritual.tags, []);
  assert.strictEqual(ritual.steps.length, 2);
  assert.strictEqual(ritual.steps[1].minutes, 2, 'missing minutes fall back to the documented default');
  assert.strictEqual(ritual.steps[1].note, 'warm light');
  assert.ok(ritual.steps[0].id.startsWith('rstp_'));
  assert.strictEqual(Engine.validateRitual(ritual).ok, true);

  const missingName = Engine.createCustomRitual({ steps: [{ label: 'Sit', minutes: 1 }] });
  assert.strictEqual(missingName.ok, false);
  assert.ok(missingName.errors.some((e) => e.code === 'NAME_REQUIRED'));

  const noSteps = Engine.createCustomRitual({ name: 'Empty' });
  assert.strictEqual(noSteps.ok, false);
  assert.ok(noSteps.errors.some((e) => e.code === 'STEPS_EMPTY'));

  const notObject = Engine.createCustomRitual('x');
  assert.strictEqual(notObject.ok, false);
  assert.strictEqual(notObject.errors[0].code, 'SPEC_NOT_OBJECT');
});

test('validateRitual reports every broken field with stable codes', () => {
  const broken = {
    id: 'not a valid id!',
    name: '',
    description: 'd'.repeat(141),
    templateId: 7,
    steps: 'nope',
    notes: 'n'.repeat(281),
    tags: ['a', 'a', 't'.repeat(25), 'b', 'c', 'd', 'e']
  };
  const res = Engine.validateRitual(broken);
  assert.strictEqual(res.ok, false);
  const codes = new Set(res.errors.map((e) => e.code));
  const expectedCodes = [
    'ID_INVALID',
    'NAME_REQUIRED',
    'DESCRIPTION_TOO_LONG',
    'TEMPLATE_ID_INVALID',
    'STEPS_INVALID',
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

  const badSteps = Engine.validateRitual({
    name: 'Messy',
    steps: [
      'nope',
      { label: '' },
      { label: 'x'.repeat(61) },
      { label: 'a', minutes: 0 },
      { label: 'b', minutes: 61 },
      { label: 'c', note: 5 },
      { label: 'd', note: 'n'.repeat(121) },
      { id: 'bad id', label: 'e' },
      { id: 'dup', label: 'f' },
      { id: 'dup', label: 'g' }
    ]
  });
  assert.strictEqual(badSteps.ok, false);
  const stepCodes = new Set(badSteps.errors.map((e) => e.code));
  const expectedStepCodes = [
    'STEP_NOT_OBJECT',
    'STEP_LABEL_REQUIRED',
    'STEP_LABEL_TOO_LONG',
    'STEP_MINUTES_RANGE',
    'STEP_NOTE_INVALID',
    'STEP_NOTE_TOO_LONG',
    'STEP_ID_INVALID',
    'STEP_DUPLICATE_ID'
  ];
  for (const code of expectedStepCodes) {
    assert.ok(stepCodes.has(code), 'missing step error code ' + code);
  }

  const emptySteps = Engine.validateRitual({ name: 'x', steps: [] });
  assert.strictEqual(emptySteps.ok, false);
  assert.ok(emptySteps.errors.some((e) => e.code === 'STEPS_EMPTY'));

  assert.strictEqual(Engine.validateRitual(null).ok, false);
  assert.strictEqual(Engine.validateRitual(null).errors[0].code, 'RITUAL_NOT_OBJECT');
  assert.strictEqual(Engine.validateRitual([1, 2]).errors[0].code, 'RITUAL_NOT_OBJECT');
  assert.strictEqual(Engine.validateRitual('ritual').errors[0].code, 'RITUAL_NOT_OBJECT');
});

test('normalizeRitual cleans messy input without mutating it and is idempotent', () => {
  const messy = {
    name: '   Calm Start  ',
    description: '  breathe first ',
    id: '',
    templateId: undefined,
    steps: [
      { label: '  Sit up   ', minutes: 5000 },
      'skip',
      { label: '', minutes: 3 },
      { label: 'Breathe', minutes: -2, note: '  in out ' },
      { label: 'Breathe', minutes: '2' },
      { label: 'Begin', minutes: 0 }
    ],
    notes: '  take it easy ',
    tags: ['  a  ', '', 'a', 42, 'b']
  };
  const before = JSON.stringify(messy);

  const clean = Engine.normalizeRitual(messy);
  assert.strictEqual(JSON.stringify(messy), before, 'normalize must not mutate its input');
  assert.ok(clean);
  assert.strictEqual(clean.name, 'Calm Start');
  assert.strictEqual(clean.description, 'breathe first');
  assert.ok(clean.id.startsWith('rit_'));
  assert.strictEqual(clean.templateId, null);
  assert.strictEqual(clean.steps.length, 4);
  assert.deepStrictEqual(
    clean.steps.map((s) => [s.label, s.minutes]),
    [
      ['Sit up', 120],
      ['Breathe', 1],
      ['Breathe', 2],
      ['Begin', 1]
    ]
  );
  assert.strictEqual(clean.steps[1].note, 'in out');
  assert.strictEqual(clean.steps[2].note, '');
  assert.deepStrictEqual(clean.tags, ['a', 'b']);
  assert.strictEqual(clean.notes, 'take it easy');
  assert.strictEqual(Engine.validateRitual(clean).ok, true, JSON.stringify(Engine.validateRitual(clean)));
  assert.deepStrictEqual(Engine.normalizeRitual(clean), clean, 'normalize must be idempotent');

  assert.strictEqual(Engine.normalizeRitual(null), null);
  assert.strictEqual(Engine.normalizeRitual('ritual'), null);
  assert.strictEqual(Engine.normalizeRitual({ name: '   ' }), null);
  assert.strictEqual(Engine.normalizeRitual({ name: 'x', steps: [] }), null);
  assert.strictEqual(Engine.normalizeRitual({ name: 'x', steps: 'nope' }), null);
});

test('updateRitual returns a new validated ritual and leaves the original untouched', () => {
  const base = Engine.createCustomRitual({ name: 'Base Ritual', steps: [{ label: 'A', minutes: 1 }] }).ritual;
  const before = JSON.stringify(base);

  const res = Engine.updateRitual(base, {
    name: 'Renamed Ritual',
    steps: [
      { label: 'A', minutes: 1 },
      { label: 'B', minutes: 2 }
    ],
    tags: ['evening']
  });
  assert.strictEqual(res.ok, true, JSON.stringify(res.errors));
  assert.notStrictEqual(res.ritual, base);
  assert.strictEqual(res.ritual.name, 'Renamed Ritual');
  assert.strictEqual(res.ritual.steps.length, 2);
  assert.deepStrictEqual(res.ritual.tags, ['evening']);
  assert.strictEqual(JSON.stringify(base), before, 'update must not mutate the source ritual');
  assert.strictEqual(base.name, 'Base Ritual');
  assert.strictEqual(Engine.validateRitual(res.ritual).ok, true);

  const badSteps = Engine.updateRitual(base, { steps: [] });
  assert.strictEqual(badSteps.ok, false);
  assert.ok(badSteps.errors.some((e) => e.code === 'STEPS_EMPTY'));
  assert.strictEqual(JSON.stringify(base), before);

  const notObjectRitual = Engine.updateRitual(null, { name: 'x' });
  assert.strictEqual(notObjectRitual.ok, false);
  assert.strictEqual(notObjectRitual.errors[0].code, 'RITUAL_NOT_OBJECT');

  const badChanges = Engine.updateRitual(base, 'x');
  assert.strictEqual(badChanges.ok, false);
  assert.strictEqual(badChanges.errors[0].code, 'CHANGES_NOT_OBJECT');
});

test('summarizeRitual computes deterministic step and minute totals', () => {
  const ritual = Engine.createCustomRitual({
    name: 'Three Gates',
    steps: [
      { label: 'A', minutes: 2 },
      { label: 'B', minutes: 3 },
      { label: 'C', minutes: 5 }
    ]
  }).ritual;
  const summary = Engine.summarizeRitual(ritual);
  assert.deepStrictEqual(summary, {
    stepCount: 3,
    totalMinutes: 10,
    firstStepLabel: 'A',
    lastStepLabel: 'C'
  });
  assert.deepStrictEqual(Engine.summarizeRitual(ritual), summary, 'summaries must be deterministic');

  assert.strictEqual(Engine.summarizeRitual({ name: 'x' }), null);
  assert.strictEqual(Engine.summarizeRitual(null), null);
});

test('startRun builds an all-pending run and completeStep walks steps strictly in order', () => {
  const ritual = Engine.createRitualFromTemplate('rit_study_sprint', {}).ritual;
  const start = Engine.startRun(ritual);
  assert.strictEqual(start.ok, true, JSON.stringify(start.errors));
  const run = start.run;
  assert.strictEqual(run.ritualId, ritual.id);
  assert.strictEqual(run.ritualName, ritual.name);
  assert.strictEqual(run.totalSteps, ritual.steps.length);
  assert.strictEqual(run.completedCount, 0);
  assert.strictEqual(run.completed, false);
  assert.deepStrictEqual(
    run.steps.map((s) => s.status),
    ritual.steps.map(() => 'pending')
  );
  assert.deepStrictEqual(
    run.steps.map((s) => s.id),
    ritual.steps.map((s) => s.id)
  );

  const before = JSON.stringify(run);
  const first = Engine.completeStep(run, run.steps[0].id);
  assert.strictEqual(first.ok, true, JSON.stringify(first.errors));
  assert.strictEqual(JSON.stringify(run), before, 'completeStep must not mutate the source run');
  assert.strictEqual(first.run.steps[0].status, 'done');
  assert.strictEqual(first.run.completedCount, 1);
  assert.strictEqual(first.run.completed, false);

  const outOfOrder = Engine.completeStep(first.run, run.steps[2].id);
  assert.strictEqual(outOfOrder.ok, false);
  assert.strictEqual(outOfOrder.errors[0].code, 'STEP_OUT_OF_ORDER');
  assert.ok(outOfOrder.errors[0].message.includes(run.steps[1].id), 'error must name the next pending step');

  assert.strictEqual(Engine.completeStep(first.run, 'rstp_missing').errors[0].code, 'STEP_NOT_FOUND');
  assert.strictEqual(Engine.completeStep(first.run, 42).errors[0].code, 'STEP_ID_INVALID');
  assert.strictEqual(Engine.completeStep(null, 'rstp_x').errors[0].code, 'RUN_NOT_OBJECT');

  let current = first.run;
  for (let i = 1; i < run.steps.length; i++) {
    const stepId = run.steps[i].id;
    const res = Engine.completeStep(current, stepId);
    assert.strictEqual(res.ok, true, 'step ' + i + ' must complete: ' + JSON.stringify(res.errors));
    current = res.run;
    assert.strictEqual(current.completedCount, i + 1);
    assert.strictEqual(current.completed, i + 1 === run.steps.length);
  }
  assert.deepStrictEqual(
    current.steps.map((s) => s.status),
    ritual.steps.map(() => 'done')
  );

  const already = Engine.completeStep(current, run.steps[0].id);
  assert.strictEqual(already.ok, false);
  assert.strictEqual(already.errors[0].code, 'STEP_ALREADY_COMPLETE');

  const reset = Engine.resetRun(current);
  assert.strictEqual(reset.ok, true);
  assert.strictEqual(reset.run.ritualId, ritual.id);
  assert.strictEqual(reset.run.completedCount, 0);
  assert.strictEqual(reset.run.completed, false);
  assert.deepStrictEqual(
    reset.run.steps.map((s) => s.status),
    ritual.steps.map(() => 'pending')
  );
  assert.strictEqual(Engine.resetRun(null).errors[0].code, 'RUN_NOT_OBJECT');
  assert.strictEqual(Engine.resetRun('run').errors[0].code, 'RUN_NOT_OBJECT');

  assert.strictEqual(Engine.startRun(null).errors[0].code, 'RITUAL_NOT_OBJECT');
  assert.strictEqual(Engine.startRun({ name: 'x' }).errors[0].code, 'RITUAL_INVALID');
});

test('summarizeRun reports deterministic progress', () => {
  const ritual = Engine.createCustomRitual({
    name: 'Four Beats',
    steps: [
      { label: 'One', minutes: 1 },
      { label: 'Two', minutes: 1 },
      { label: 'Three', minutes: 1 },
      { label: 'Four', minutes: 1 }
    ]
  }).ritual;
  let run = Engine.startRun(ritual).run;
  run = Engine.completeStep(run, run.steps[0].id).run;
  run = Engine.completeStep(run, run.steps[1].id).run;

  const mid = Engine.summarizeRun(run);
  assert.deepStrictEqual(mid, {
    totalSteps: 4,
    completedCount: 2,
    pendingCount: 2,
    percent: 50,
    completed: false,
    nextStepId: run.steps[2].id,
    nextStepLabel: 'Three'
  });
  assert.deepStrictEqual(Engine.summarizeRun(run), mid, 'summaries must be deterministic');

  run = Engine.completeStep(run, run.steps[2].id).run;
  run = Engine.completeStep(run, run.steps[3].id).run;
  const done = Engine.summarizeRun(run);
  assert.deepStrictEqual(done, {
    totalSteps: 4,
    completedCount: 4,
    pendingCount: 0,
    percent: 100,
    completed: true,
    nextStepId: null,
    nextStepLabel: null
  });

  assert.strictEqual(Engine.summarizeRun(null), null);
  assert.strictEqual(Engine.summarizeRun({ steps: [] }), null);
});

test('serialize and parse round-trip a ritual with the schema version stamped', () => {
  const ritual = Engine.createRitualFromTemplate('rit_exam_mode', { notes: '  before the mock exam  ' }).ritual;
  const json = Engine.serialize(ritual);
  assert.strictEqual(typeof json, 'string');
  const doc = JSON.parse(json);
  assert.strictEqual(doc.schemaVersion, 1);
  assert.strictEqual(typeof doc.ritual.id, 'string');

  const parsed = Engine.parse(json);
  assert.strictEqual(parsed.ok, true);
  assert.deepStrictEqual(parsed.ritual, ritual, 'round trip must preserve the ritual');
  assert.strictEqual(parsed.migratedFrom, null);

  assert.strictEqual(Engine.serialize({ name: 'nope' }), null);
  assert.strictEqual(Engine.parse('not json').ok, false);
  assert.strictEqual(Engine.parse('not json').errors[0].code, 'MALFORMED');
  assert.strictEqual(Engine.parse('[]').errors[0].code, 'DOCUMENT_NOT_OBJECT');
  assert.strictEqual(Engine.parse({}).errors[0].code, 'MALFORMED');
  assert.strictEqual(Engine.parse(JSON.stringify({ schemaVersion: 1 })).errors[0].code, 'RITUAL_MISSING');
});

test('migrate upgrades legacy schema 0 documents and blocks unknown versions', () => {
  const legacy = {
    schemaVersion: 0,
    title: 'Legacy Warmup',
    purpose: 'settle in before reading',
    checklist: [{ text: 'Sit comfortably', durationMinutes: 3 }, { name: 'Sip water' }],
    notes: 'old notes',
    tags: ['old']
  };
  const before = JSON.stringify(legacy);

  const parsed = Engine.parse(JSON.stringify(legacy));
  assert.strictEqual(JSON.stringify(legacy), before, 'parsing must not mutate the caller document');
  assert.strictEqual(parsed.ok, true, JSON.stringify(parsed.errors));
  assert.strictEqual(parsed.migratedFrom, 0);
  assert.strictEqual(parsed.ritual.name, 'Legacy Warmup');
  assert.strictEqual(parsed.ritual.description, 'settle in before reading');
  assert.strictEqual(parsed.ritual.templateId, null);
  assert.strictEqual(parsed.ritual.notes, 'old notes');
  assert.deepStrictEqual(parsed.ritual.tags, ['old']);
  assert.ok(parsed.ritual.id.startsWith('rit_'));
  assert.strictEqual(parsed.ritual.steps.length, 2);
  assert.deepStrictEqual(parsed.ritual.steps[0], {
    id: parsed.ritual.steps[0].id,
    label: 'Sit comfortably',
    minutes: 3,
    note: ''
  });
  assert.strictEqual(parsed.ritual.steps[1].label, 'Sip water');
  assert.strictEqual(parsed.ritual.steps[1].minutes, 2, 'legacy steps without duration fall back to the default');
  assert.strictEqual(Engine.validateRitual(parsed.ritual).ok, true);

  const direct = Engine.migrate(legacy);
  assert.strictEqual(JSON.stringify(legacy), before, 'migrate must not mutate legacy documents');
  assert.strictEqual(direct.ok, true);
  assert.strictEqual(direct.migratedFrom, 0);
  assert.deepStrictEqual(direct.ritual, parsed.ritual, 'migrate must be deterministic');

  assert.strictEqual(Engine.parse(JSON.stringify({ schemaVersion: 2, ritual: {} })).errors[0].code, 'SCHEMA_VERSION_UNSUPPORTED');
  assert.strictEqual(Engine.parse(JSON.stringify({ ritual: {} })).errors[0].code, 'SCHEMA_VERSION_MISSING');
  assert.strictEqual(Engine.migrate(null).errors[0].code, 'DOCUMENT_NOT_OBJECT');
});

test('prototype-like names never pollute Object.prototype', () => {
  const evil = JSON.parse(
    '{"name":"Safe","__proto__":{"polluted":"yes"},"id":"__proto__","description":"","' +
      'templateId":null,"steps":[{"id":"__proto__","label":"Go","minutes":1,"note":""}],' +
      '"notes":"","tags":["__proto__"]}'
  );

  const normalized = Engine.normalizeRitual(evil);
  assert.ok(normalized);
  assert.strictEqual({}.polluted, undefined);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(normalized, '__proto__'), false);
  assert.strictEqual(normalized.id, '__proto__');
  assert.strictEqual(normalized.name, 'Safe');
  assert.deepStrictEqual(normalized.tags, ['__proto__']);
  assert.strictEqual(normalized.steps[0].id, '__proto__');
  assert.strictEqual(Engine.validateRitual(evil).ok, true);

  const parsed = Engine.parse(JSON.stringify({ schemaVersion: 1, ritual: evil }));
  assert.strictEqual(parsed.ok, true);
  assert.strictEqual({}.polluted, undefined);
  assert.strictEqual(parsed.ritual.id, '__proto__');

  const summary = Engine.summarizeRitual(parsed.ritual);
  assert.strictEqual(summary.stepCount, 1);
  assert.strictEqual({}.polluted, undefined);

  const custom = Engine.createCustomRitual({ id: '__proto__', name: 'constructor', steps: [{ label: 'x', minutes: 1 }] });
  assert.strictEqual(custom.ok, true);
  assert.strictEqual(custom.ritual.id, '__proto__');
  assert.strictEqual({}.polluted, undefined);
  assert.strictEqual(Engine.deriveRitualId('constructor'), Engine.deriveRitualId('constructor'));

  const started = Engine.startRun(custom.ritual);
  assert.strictEqual(started.ok, true);
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
});

test('engine runs with time, randomness, storage and network access blocked', () => {
  const beforeLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const originalNow = Date.now;
  const originalRandom = Math.random;
  const restores = [];

  Date.now = function blockedNow() {
    throw new Error('Date.now must not be used by the focus ritual engine');
  };
  Math.random = function blockedRandom() {
    throw new Error('Math.random must not be used by the focus ritual engine');
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
    const ritual = Engine.createRitualFromTemplate('rit_deep_work', {}).ritual;
    let run = Engine.startRun(ritual).run;
    run = Engine.completeStep(run, run.steps[0].id).run;
    run = Engine.completeStep(run, run.steps[1].id).run;
    captured = {
      templateCount: Engine.listTemplates().length,
      id: ritual.id,
      summary: Engine.summarizeRitual(ritual),
      runSummary: Engine.summarizeRun(run),
      roundTrip: Engine.parse(Engine.serialize(ritual)),
      reset: Engine.resetRun(run),
      custom: Engine.createCustomRitual({ name: 'Blocked World', steps: [{ label: 'Go', minutes: 1 }] }),
      migrated: Engine.migrate({
        schemaVersion: 0,
        title: 'Blocked Legacy',
        checklist: [{ text: 'Breathe', durationMinutes: 1 }]
      })
    };
  } finally {
    while (restores.length) restores.pop()();
  }

  assert.strictEqual(captured.templateCount >= 4, true);
  assert.ok(captured.id.startsWith('rit_'));
  assert.strictEqual(typeof captured.summary.totalMinutes, 'number');
  assert.strictEqual(captured.runSummary.completedCount, 2);
  assert.strictEqual(captured.roundTrip.ok, true);
  assert.strictEqual(captured.reset.ok, true);
  assert.strictEqual(captured.custom.ok, true);
  assert.strictEqual(captured.migrated.ok, true);
  assert.strictEqual(Date.now, originalNow, 'clock must be restored');
  assert.strictEqual(Math.random, originalRandom, 'random source must be restored');
  assert.deepStrictEqual(
    Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    beforeLocalStorage,
    'storage globals must be restored'
  );
});
