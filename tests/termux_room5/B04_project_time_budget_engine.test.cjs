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
  'project_time_budget_engine.js'
);

const Engine = require(ENGINE_PATH);

function blockGlobal(name) {
  const original = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get: function () {
      throw new Error(name + ' must not be read by the project time budget engine');
    },
    set: function () {
      throw new Error(name + ' must not be written by the project time budget engine');
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
    'CATEGORIES',
    'PROJECT_DEFAULTS',
    'SCHEMA_VERSION',
    'addSession',
    'allocateRemaining',
    'createBudget',
    'deriveBudgetId',
    'deriveSessionId',
    'migrate',
    'normalizeBudget',
    'parse',
    'projectRemaining',
    'removeSession',
    'serialize',
    'summarizeBudget',
    'validateBudget'
  ]);
  assert.deepStrictEqual(Engine.CATEGORIES, ['focus', 'admin', 'review', 'meeting']);
  assert.strictEqual(Object.isFrozen(Engine.CATEGORIES), true);
  assert.strictEqual(Object.isFrozen(Engine.PROJECT_DEFAULTS), true);
  assert.strictEqual(Object.isFrozen(Engine.PROJECT_DEFAULTS.tags), true);
  assert.strictEqual(Object.isFrozen(Engine.PROJECT_DEFAULTS.sessions), true);
  assert.strictEqual(typeof Engine.deriveBudgetId('seed'), 'string');
  assert.strictEqual(typeof Engine.deriveSessionId('seed'), 'string');
});

test('createBudget fills documented defaults and requires a name', () => {
  const bare = Engine.createBudget({ name: '  Bare Project ' });
  assert.strictEqual(bare.ok, true);
  const budget = bare.budget;
  assert.strictEqual(budget.name, 'Bare Project');
  assert.strictEqual(budget.budgetMinutes, Engine.PROJECT_DEFAULTS.budgetMinutes);
  assert.deepStrictEqual(budget.sessions, []);
  assert.deepStrictEqual(budget.tags, []);
  assert.strictEqual(budget.notes, '');
  assert.ok(budget.id.startsWith('pb_'), 'budget ids must be derived');
  assert.strictEqual(Engine.validateBudget(budget).ok, true);

  const named = Engine.createBudget({
    name: '  Launch Site ',
    budgetMinutes: 600,
    sessions: [
      { label: ' Wireframes ', minutes: 90, category: 'focus' },
      { label: 'Copy draft', minutes: 45, category: 'admin', note: ' landing page ' }
    ],
    tags: ['release']
  });
  assert.strictEqual(named.ok, true);
  assert.strictEqual(named.budget.name, 'Launch Site');
  assert.strictEqual(named.budget.budgetMinutes, 600);
  assert.strictEqual(named.budget.sessions.length, 2);
  assert.deepStrictEqual(named.budget.sessions[0], {
    id: named.budget.sessions[0].id,
    label: 'Wireframes',
    minutes: 90,
    category: 'focus',
    note: ''
  });
  assert.ok(named.budget.sessions[0].id.startsWith('pbs_'));
  assert.strictEqual(named.budget.sessions[1].note, 'landing page');
  assert.deepStrictEqual(named.budget.tags, ['release']);
  assert.strictEqual(Engine.validateBudget(named.budget).ok, true);

  assert.strictEqual(Engine.createBudget(null).ok, false);
  assert.strictEqual(Engine.createBudget(null).errors[0].code, 'INPUT_NOT_OBJECT');
  assert.strictEqual(Engine.createBudget('budget').errors[0].code, 'INPUT_NOT_OBJECT');
  const noName = Engine.createBudget({});
  assert.strictEqual(noName.ok, false);
  assert.ok(noName.errors.some((e) => e.code === 'NAME_REQUIRED'));
  const badSessions = Engine.createBudget({ name: '', sessions: 'nope' });
  assert.strictEqual(badSessions.ok, false);
  const codes = new Set(badSessions.errors.map((e) => e.code));
  assert.ok(codes.has('NAME_REQUIRED'), 'expected NAME_REQUIRED');
  assert.ok(codes.has('SESSIONS_INVALID'), 'expected SESSIONS_INVALID');
  assert.strictEqual(Engine.validateBudget({ name: 'Clean', budgetMinutes: 120 }).ok, true);
});

test('normalizeBudget repairs messy input without mutating it and stays idempotent', () => {
  const messy = {
    name: '   Weekly Build   ',
    id: 'bad id!',
    budgetMinutes: 1000000,
    sessions: [
      { label: '', minutes: 9999, category: 'nope' },
      'junk',
      { label: 'Overnight', minutes: 5000, category: 'FOCUS' },
      { label: 'Quick', minutes: 0, category: 42 },
      { label: 'No id', minutes: 15 }
    ],
    notes: '  keep going ',
    tags: ['  ship  ', '', 'ship', 42]
  };
  const before = JSON.stringify(messy);

  const clean = Engine.normalizeBudget(messy);
  assert.strictEqual(JSON.stringify(messy), before, 'normalize must not mutate its input');
  assert.ok(clean);
  assert.strictEqual(clean.name, 'Weekly Build');
  assert.ok(clean.id.startsWith('pb_'), 'invalid ids are re-derived');
  assert.strictEqual(clean.budgetMinutes, 200000);
  assert.strictEqual(clean.sessions.length, 3, 'broken sessions are dropped');
  assert.deepStrictEqual(clean.sessions.map((s) => s.label), ['Overnight', 'Quick', 'No id']);
  assert.strictEqual(clean.sessions[0].minutes, 1440);
  assert.strictEqual(clean.sessions[0].category, 'focus');
  assert.strictEqual(clean.sessions[1].minutes, 1);
  assert.strictEqual(clean.sessions[1].category, 'focus');
  assert.strictEqual(clean.sessions[2].minutes, 15);
  assert.ok(clean.sessions[2].id.startsWith('pbs_'));
  assert.strictEqual(clean.notes, 'keep going');
  assert.deepStrictEqual(clean.tags, ['ship']);
  assert.strictEqual(Engine.validateBudget(clean).ok, true, JSON.stringify(Engine.validateBudget(clean)));
  assert.deepStrictEqual(Engine.normalizeBudget(clean), clean, 'normalize must be idempotent');

  assert.strictEqual(Engine.normalizeBudget(null), null);
  assert.strictEqual(Engine.normalizeBudget('budget'), null);
  assert.strictEqual(Engine.normalizeBudget({ name: '   ' }), null);
  assert.strictEqual(Engine.normalizeBudget({ name: 'x', sessions: 'nope' }), null);
});

test('addSession appends normalized sessions and leaves the source budget untouched', () => {
  const base = Engine.createBudget({ name: 'Base Project', budgetMinutes: 300 }).budget;
  const before = JSON.stringify(base);

  const first = Engine.addSession(base, { label: '  Deep Work ', minutes: 25, category: 'focus' });
  assert.strictEqual(first.ok, true);
  assert.strictEqual(first.budget.sessions.length, 1);
  assert.strictEqual(first.budget.sessions[0].label, 'Deep Work');
  assert.strictEqual(first.budget.sessions[0].minutes, 25);
  assert.strictEqual(first.budget.sessions[0].category, 'focus');
  assert.strictEqual(first.budget.sessions[0].note, '');
  assert.ok(first.budget.sessions[0].id.startsWith('pbs_'));
  assert.strictEqual(JSON.stringify(base), before, 'add must not mutate the source budget');

  const second = Engine.addSession(first.budget, { label: 'Review', minutes: 10 });
  assert.strictEqual(second.ok, true);
  assert.strictEqual(second.budget.sessions.length, 2);
  assert.strictEqual(second.budget.sessions[1].category, 'focus', 'default category applies');
  assert.strictEqual(second.budget.budgetMinutes, 300);
  assert.strictEqual(Engine.validateBudget(second.budget).ok, true);

  const repeat = Engine.addSession(base, { label: 'Deep Work', minutes: 25, category: 'focus' });
  assert.strictEqual(repeat.budget.sessions[0].id, first.budget.sessions[0].id, 'ids must be deterministic');

  const clamped = Engine.addSession(base, { label: 'Marathon', minutes: 99999, category: 'nope' });
  assert.strictEqual(clamped.ok, true);
  assert.strictEqual(clamped.budget.sessions[0].minutes, 1440);
  assert.strictEqual(clamped.budget.sessions[0].category, 'focus');

  const duplicate = Engine.addSession(first.budget, {
    id: first.budget.sessions[0].id,
    label: 'Clone',
    minutes: 5
  });
  assert.strictEqual(duplicate.ok, false);
  assert.strictEqual(duplicate.errors[0].code, 'SESSION_DUPLICATE_ID');

  assert.strictEqual(Engine.addSession(null, { label: 'x' }).errors[0].code, 'BUDGET_NOT_OBJECT');
  assert.strictEqual(Engine.addSession(base, 'x').errors[0].code, 'SESSION_NOT_OBJECT');
  const noLabel = Engine.addSession(base, { minutes: 5 });
  assert.strictEqual(noLabel.ok, false);
  assert.strictEqual(noLabel.errors[0].code, 'SESSION_INVALID');

  const full = Engine.createBudget({
    name: 'Full Project',
    sessions: Array.from({ length: 500 }, (_, i) => ({ label: 'S' + i, minutes: 1 }))
  });
  assert.strictEqual(full.ok, true);
  assert.strictEqual(full.budget.sessions.length, 500);
  const overLimit = Engine.addSession(full.budget, { label: 'One more', minutes: 1 });
  assert.strictEqual(overLimit.ok, false);
  assert.strictEqual(overLimit.errors[0].code, 'SESSION_LIMIT');
});

test('removeSession deletes by id with precise failures', () => {
  const budget = Engine.createBudget({
    name: 'Removal Project',
    budgetMinutes: 120,
    sessions: [
      { label: 'Alpha', minutes: 30 },
      { label: 'Beta', minutes: 45 }
    ]
  }).budget;
  const before = JSON.stringify(budget);
  const [alpha, beta] = budget.sessions;

  const removed = Engine.removeSession(budget, alpha.id);
  assert.strictEqual(removed.ok, true);
  assert.strictEqual(removed.budget.sessions.length, 1);
  assert.strictEqual(removed.budget.sessions[0].id, beta.id);
  assert.strictEqual(JSON.stringify(budget), before, 'remove must not mutate the source budget');

  const last = Engine.removeSession(removed.budget, beta.id);
  assert.strictEqual(last.ok, true);
  assert.deepStrictEqual(last.budget.sessions, []);

  assert.strictEqual(Engine.removeSession(last.budget, beta.id).errors[0].code, 'SESSION_NOT_FOUND');
  assert.strictEqual(Engine.removeSession(null, beta.id).errors[0].code, 'BUDGET_NOT_OBJECT');
  assert.strictEqual(Engine.removeSession(budget, 7).errors[0].code, 'SESSION_ID_INVALID');
  assert.strictEqual(Engine.removeSession(budget, '   ').errors[0].code, 'SESSION_ID_INVALID');
  const nameless = Engine.removeSession({ name: '' }, alpha.id);
  assert.strictEqual(nameless.ok, false);
  assert.strictEqual(typeof nameless.errors[0].code, 'string');
  assert.strictEqual(typeof nameless.errors[0].field, 'string');
  assert.strictEqual(typeof nameless.errors[0].message, 'string');
});

test('validateBudget reports every broken field with stable codes', () => {
  const broken = {
    id: 'not a valid id!',
    name: '',
    budgetMinutes: 0,
    sessions: 'nope',
    notes: 'n'.repeat(281),
    tags: ['a', 'a', 't'.repeat(25), 'b', 'c', 'd', 'e']
  };
  const res = Engine.validateBudget(broken);
  assert.strictEqual(res.ok, false);
  const codes = new Set(res.errors.map((e) => e.code));
  const expectedCodes = [
    'ID_INVALID',
    'NAME_REQUIRED',
    'BUDGET_MINUTES_RANGE',
    'SESSIONS_INVALID',
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

  assert.strictEqual(Engine.validateBudget(null).errors[0].code, 'INPUT_NOT_OBJECT');
  assert.strictEqual(Engine.validateBudget([1, 2]).errors[0].code, 'INPUT_NOT_OBJECT');
  assert.strictEqual(Engine.validateBudget('budget').errors[0].code, 'INPUT_NOT_OBJECT');

  const fractional = Engine.validateBudget({ name: 'x', budgetMinutes: 12.5 });
  assert.ok(fractional.errors.some((e) => e.code === 'BUDGET_MINUTES_INVALID'));

  const sessionErrors = Engine.validateBudget({
    name: 'x',
    sessions: [{ label: '', minutes: 0, category: 'nope' }, 7, 'str', { id: 'bad id!', label: 'ok' }]
  });
  assert.strictEqual(sessionErrors.ok, false);
  const sessionCodes = new Set(sessionErrors.errors.map((e) => e.code));
  for (const code of [
    'SESSION_LABEL_REQUIRED',
    'SESSION_MINUTES_RANGE',
    'SESSION_CATEGORY_INVALID',
    'SESSION_NOT_OBJECT',
    'SESSION_ID_INVALID'
  ]) {
    assert.ok(sessionCodes.has(code), 'missing error code ' + code);
  }
  assert.strictEqual(Engine.validateBudget({ name: 'x', notes: 7 }).errors.some((e) => e.code === 'NOTES_INVALID'), true);
  assert.strictEqual(Engine.validateBudget({ name: 'x', tags: 'nope' }).errors.some((e) => e.code === 'TAGS_INVALID'), true);
});

test('summarizeBudget computes totals, category split and over-budget state', () => {
  const budget = Engine.createBudget({
    name: 'Sum Project',
    budgetMinutes: 600,
    sessions: [
      { label: 'Design', minutes: 90, category: 'focus' },
      { label: 'Email', minutes: 45, category: 'admin' }
    ]
  }).budget;
  const summary = Engine.summarizeBudget(budget);
  assert.deepStrictEqual(summary, {
    budgetMinutes: 600,
    spentMinutes: 135,
    remainingMinutes: 465,
    usedPercent: 22.5,
    remainingPercent: 77.5,
    sessionCount: 2,
    overBudget: false,
    overByMinutes: 0,
    categoryMinutes: { focus: 90, admin: 45, review: 0, meeting: 0 },
    averageSessionMinutes: 67.5,
    longestSessionMinutes: 90,
    shortestSessionMinutes: 45
  });
  assert.deepStrictEqual(Engine.summarizeBudget(budget), summary, 'summaries must be deterministic');

  const over = Engine.createBudget({
    name: 'Over Project',
    budgetMinutes: 100,
    sessions: [
      { label: 'A', minutes: 60 },
      { label: 'B', minutes: 60 }
    ]
  }).budget;
  const overSummary = Engine.summarizeBudget(over);
  assert.strictEqual(overSummary.spentMinutes, 120);
  assert.strictEqual(overSummary.remainingMinutes, -20);
  assert.strictEqual(overSummary.usedPercent, 120);
  assert.strictEqual(overSummary.remainingPercent, -20);
  assert.strictEqual(overSummary.overBudget, true);
  assert.strictEqual(overSummary.overByMinutes, 20);
  assert.deepStrictEqual(overSummary.categoryMinutes, { focus: 120, admin: 0, review: 0, meeting: 0 });
  assert.strictEqual(overSummary.averageSessionMinutes, 60);
  assert.strictEqual(overSummary.longestSessionMinutes, 60);
  assert.strictEqual(overSummary.shortestSessionMinutes, 60);

  const empty = Engine.summarizeBudget(Engine.createBudget({ name: 'Empty Project' }).budget);
  assert.strictEqual(empty.spentMinutes, 0);
  assert.strictEqual(empty.remainingMinutes, 600);
  assert.strictEqual(empty.usedPercent, 0);
  assert.strictEqual(empty.remainingPercent, 100);
  assert.strictEqual(empty.sessionCount, 0);
  assert.strictEqual(empty.overBudget, false);
  assert.strictEqual(empty.averageSessionMinutes, null);
  assert.strictEqual(empty.longestSessionMinutes, null);
  assert.strictEqual(empty.shortestSessionMinutes, null);

  assert.strictEqual(Engine.summarizeBudget(null), null);
  assert.strictEqual(Engine.summarizeBudget({ name: '   ' }), null);
});

test('allocateRemaining splits the remaining minutes exactly and deterministically', () => {
  const budget = Engine.createBudget({
    name: 'Allocation Project',
    budgetMinutes: 600,
    sessions: [
      { label: 'Design', minutes: 90, category: 'focus' },
      { label: 'Email', minutes: 45, category: 'admin' }
    ]
  }).budget;
  const targets = [
    { key: 'focus', weight: 2 },
    { key: 'admin', weight: 1 }
  ];
  const before = JSON.stringify(targets);
  const res = Engine.allocateRemaining(budget, targets);
  assert.strictEqual(JSON.stringify(targets), before, 'targets must not be mutated');
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.allocation.totalMinutes, 465);
  assert.deepStrictEqual(res.allocation.items, [
    { key: 'focus', weight: 2, minutes: 310, share: 66.67 },
    { key: 'admin', weight: 1, minutes: 155, share: 33.33 }
  ]);
  assert.deepStrictEqual(Engine.allocateRemaining(budget, targets), res, 'allocations must be deterministic');
  const sum = res.allocation.items.reduce((total, item) => total + item.minutes, 0);
  assert.strictEqual(sum, 465, 'allocation must consume the whole remainder');

  const remainderBudget = Engine.createBudget({
    name: 'Remainder Project',
    budgetMinutes: 200,
    sessions: [
      { label: 'One', minutes: 50 },
      { label: 'Two', minutes: 50 }
    ]
  }).budget;
  assert.strictEqual(Engine.summarizeBudget(remainderBudget).remainingMinutes, 100);
  const thirds = Engine.allocateRemaining(remainderBudget, [
    { key: 'a', weight: 1 },
    { key: 'b', weight: 1 },
    { key: 'c', weight: 1 }
  ]);
  assert.strictEqual(thirds.allocation.totalMinutes, 100);
  assert.deepStrictEqual(
    thirds.allocation.items.map((i) => i.minutes),
    [34, 33, 33],
    'leftover minutes go to earliest targets first'
  );
  assert.strictEqual(
    thirds.allocation.items.reduce((t, i) => t + i.minutes, 0),
    100
  );

  const uneven = Engine.allocateRemaining(budget, [
    { key: 'a', weight: 1 },
    { key: 'b', weight: 2 }
  ]);
  assert.deepStrictEqual(
    uneven.allocation.items.map((i) => i.minutes),
    [155, 310]
  );

  assert.strictEqual(Engine.allocateRemaining(null, targets).errors[0].code, 'BUDGET_NOT_OBJECT');
  assert.strictEqual(Engine.allocateRemaining(budget, 'x').errors[0].code, 'TARGETS_INVALID');
  assert.strictEqual(Engine.allocateRemaining(budget, []).errors[0].code, 'TARGETS_EMPTY');
  assert.strictEqual(
    Engine.allocateRemaining(budget, [{ key: '', weight: 1 }]).errors[0].code,
    'TARGET_KEY_INVALID'
  );
  assert.strictEqual(
    Engine.allocateRemaining(budget, [{ key: 'a' }]).errors[0].code,
    'TARGET_WEIGHT_RANGE'
  );
  assert.strictEqual(
    Engine.allocateRemaining(budget, [{ key: 'a', weight: -1 }]).errors[0].code,
    'TARGET_WEIGHT_RANGE'
  );
  assert.strictEqual(
    Engine.allocateRemaining(budget, [
      { key: 'a', weight: 1 },
      { key: 'a', weight: 2 }
    ]).errors[0].code,
    'TARGET_KEY_DUPLICATE'
  );

  const exhausted = Engine.createBudget({
    name: 'Exhausted Project',
    budgetMinutes: 100,
    sessions: [{ label: 'Done', minutes: 120 }]
  }).budget;
  assert.strictEqual(Engine.allocateRemaining(exhausted, targets).errors[0].code, 'BUDGET_EXHAUSTED');
});

test('projectRemaining forecasts only from the actual provided sessions', () => {
  const budget = Engine.createBudget({
    name: 'Projection Project',
    budgetMinutes: 600,
    sessions: [
      { label: 'Design', minutes: 90, category: 'focus' },
      { label: 'Email', minutes: 45, category: 'admin' }
    ]
  }).budget;
  assert.deepStrictEqual(Engine.projectRemaining(budget), {
    budgetMinutes: 600,
    observedMinutes: 135,
    remainingMinutes: 465,
    sessionCount: 2,
    averageSessionMinutes: 67.5,
    estimatedSessionsToBudget: 7,
    completionPercent: 22.5
  });

  const empty = Engine.projectRemaining(Engine.createBudget({ name: 'No Sessions Yet' }).budget);
  assert.deepStrictEqual(empty, {
    budgetMinutes: 600,
    observedMinutes: 0,
    remainingMinutes: 600,
    sessionCount: 0,
    averageSessionMinutes: null,
    estimatedSessionsToBudget: null,
    completionPercent: 0
  });

  const over = Engine.projectRemaining(
    Engine.createBudget({
      name: 'Over Projection',
      budgetMinutes: 100,
      sessions: [
        { label: 'A', minutes: 60 },
        { label: 'B', minutes: 60 }
      ]
    }).budget
  );
  assert.strictEqual(over.observedMinutes, 120);
  assert.strictEqual(over.remainingMinutes, -20);
  assert.strictEqual(over.averageSessionMinutes, 60);
  assert.strictEqual(over.estimatedSessionsToBudget, 0);
  assert.strictEqual(over.completionPercent, 120);

  assert.strictEqual(Engine.projectRemaining(null), null);
  assert.strictEqual(Engine.projectRemaining({ name: '  ' }), null);
});

test('serialize and parse round-trip a budget with the schema version stamped', () => {
  const budget = Engine.createBudget({
    name: 'Round Trip',
    budgetMinutes: 480,
    sessions: [{ label: 'Draft', minutes: 60, category: 'review' }]
  }).budget;
  const json = Engine.serialize(budget);
  assert.strictEqual(typeof json, 'string');
  const doc = JSON.parse(json);
  assert.strictEqual(doc.schemaVersion, 1);
  assert.strictEqual(typeof doc.budget.id, 'string');

  const parsed = Engine.parse(json);
  assert.strictEqual(parsed.ok, true);
  assert.deepStrictEqual(parsed.budget, budget, 'round trip must preserve the budget');
  assert.strictEqual(parsed.migratedFrom, null);

  assert.strictEqual(Engine.serialize(null), null);
  assert.strictEqual(Engine.serialize({}), null);
  assert.strictEqual(Engine.parse('not json').ok, false);
  assert.strictEqual(Engine.parse('not json').errors[0].code, 'MALFORMED');
  assert.strictEqual(Engine.parse('[]').errors[0].code, 'DOCUMENT_NOT_OBJECT');
  assert.strictEqual(Engine.parse({}).errors[0].code, 'MALFORMED');
  assert.strictEqual(Engine.parse(JSON.stringify({ schemaVersion: 1 })).errors[0].code, 'BUDGET_MISSING');
  assert.strictEqual(
    Engine.parse(JSON.stringify({ schemaVersion: 2, budget: {} })).errors[0].code,
    'SCHEMA_VERSION_UNSUPPORTED'
  );
  assert.strictEqual(Engine.parse(JSON.stringify({ budget: {} })).errors[0].code, 'SCHEMA_VERSION_MISSING');
});

test('migrate upgrades legacy schema 0 documents and blocks unknown versions', () => {
  const legacy = {
    schemaVersion: 0,
    title: 'Legacy Project',
    limitMinutes: 900,
    entries: [
      { name: 'Deep work', minutes: 120, category: 'focus' },
      { name: 'Mail', minutes: 30 }
    ],
    notes: 'old notes',
    tags: ['old']
  };
  const before = JSON.stringify(legacy);

  const parsed = Engine.parse(JSON.stringify(legacy));
  assert.strictEqual(parsed.ok, true);
  assert.strictEqual(parsed.migratedFrom, 0);
  assert.strictEqual(parsed.budget.name, 'Legacy Project');
  assert.strictEqual(parsed.budget.budgetMinutes, 900);
  assert.strictEqual(parsed.budget.sessions.length, 2);
  assert.strictEqual(parsed.budget.sessions[0].label, 'Deep work');
  assert.strictEqual(parsed.budget.sessions[0].minutes, 120);
  assert.strictEqual(parsed.budget.sessions[0].category, 'focus');
  assert.strictEqual(parsed.budget.sessions[1].category, 'focus');
  assert.strictEqual(parsed.budget.notes, 'old notes');
  assert.deepStrictEqual(parsed.budget.tags, ['old']);
  assert.ok(parsed.budget.id.startsWith('pb_'));
  assert.strictEqual(Engine.validateBudget(parsed.budget).ok, true);
  assert.strictEqual(Engine.summarizeBudget(parsed.budget).spentMinutes, 150);

  const direct = Engine.migrate(legacy);
  assert.strictEqual(JSON.stringify(legacy), before, 'migrate must not mutate legacy documents');
  assert.strictEqual(direct.ok, true);
  assert.strictEqual(direct.migratedFrom, 0);
  assert.deepStrictEqual(direct.budget, parsed.budget, 'migrate must be deterministic');

  const sparse = Engine.migrate({ schemaVersion: 0, title: 'Sparse Legacy' });
  assert.strictEqual(sparse.ok, true);
  assert.strictEqual(sparse.budget.budgetMinutes, Engine.PROJECT_DEFAULTS.budgetMinutes);
  assert.deepStrictEqual(sparse.budget.sessions, []);

  assert.strictEqual(
    Engine.parse(JSON.stringify({ schemaVersion: 3, budget: {} })).errors[0].code,
    'SCHEMA_VERSION_UNSUPPORTED'
  );
  assert.strictEqual(Engine.migrate({}).errors[0].code, 'SCHEMA_VERSION_MISSING');
  assert.strictEqual(Engine.migrate(null).errors[0].code, 'DOCUMENT_NOT_OBJECT');
  assert.strictEqual(Engine.migrate('doc').errors[0].code, 'DOCUMENT_NOT_OBJECT');
});

test('prototype-like names never pollute Object.prototype', () => {
  const evil = JSON.parse(
    '{"name":"Safe","__proto__":{"polluted":"yes"},"budgetMinutes":300,' +
      '"sessions":[{"label":"Work","minutes":30,"category":"focus","__proto__":{"polluted":"yes"}}],' +
      '"tags":["__proto__"]}'
  );

  const budget = Engine.normalizeBudget(evil);
  assert.ok(budget);
  assert.strictEqual({}.polluted, undefined);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(budget, '__proto__'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(budget.sessions[0], '__proto__'), false);
  assert.strictEqual(budget.name, 'Safe');
  assert.ok(budget.id.startsWith('pb_'));
  assert.deepStrictEqual(budget.tags, ['__proto__']);
  assert.strictEqual(Engine.validateBudget(evil).ok, true);
  assert.strictEqual({}.polluted, undefined);

  const parsed = Engine.parse(JSON.stringify({ schemaVersion: 1, budget: evil }));
  assert.strictEqual(parsed.ok, true, JSON.stringify(parsed));
  assert.strictEqual({}.polluted, undefined);
  assert.strictEqual(parsed.budget.sessions[0].label, 'Work');

  const summary = Engine.summarizeBudget(parsed.budget);
  assert.deepStrictEqual(summary.categoryMinutes, { focus: 30, admin: 0, review: 0, meeting: 0 });
  assert.strictEqual({}.polluted, undefined);

  const added = Engine.addSession(budget, { id: '__proto__', label: 'constructor', minutes: 5 });
  assert.strictEqual(added.ok, true);
  assert.strictEqual(added.budget.sessions[1].id, '__proto__');
  assert.strictEqual({}.polluted, undefined);

  const allocated = Engine.allocateRemaining(budget, [{ key: '__proto__', weight: 1 }]);
  assert.strictEqual(allocated.ok, true);
  assert.strictEqual(allocated.allocation.items[0].key, '__proto__');
  assert.strictEqual({}.polluted, undefined);

  assert.ok(Engine.deriveBudgetId('constructor').startsWith('pb_'));
  assert.strictEqual(Engine.deriveBudgetId('constructor'), Engine.deriveBudgetId('constructor'));
  assert.notStrictEqual(Engine.deriveBudgetId('constructor'), Engine.deriveBudgetId('safe'));
  assert.ok(Engine.deriveSessionId('constructor').startsWith('pbs_'));
  assert.notStrictEqual(Engine.deriveSessionId('constructor'), Engine.deriveSessionId('safe'));
});

test('engine source stays dependency-free and side-effect free', () => {
  const source = fs.readFileSync(ENGINE_PATH, 'utf8');
  assert.ok(/module\.exports/.test(source), 'CommonJS export required');
  assert.ok(!/require\s*\(/.test(source), 'engine must not require other modules');
  assert.ok(!/localStorage|sessionStorage|indexedDB/.test(source), 'engine must not touch persistence');
  assert.ok(!/XMLHttpRequest|WebSocket|\bfetch\s*\(/.test(source), 'engine must not touch the network');
  assert.ok(!/Date\.now|Math\.random/.test(source), 'engine must stay deterministic');
  assert.ok(!/setTimeout|setInterval|requestAnimationFrame/.test(source), 'engine must not schedule work');
  assert.ok(!/https?:\/\//.test(source), 'engine must not carry URLs');
});

test('engine runs with time, randomness, storage and network access blocked', () => {
  const beforeLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const originalNow = Date.now;
  const originalRandom = Math.random;
  const restores = [];

  Date.now = function blockedNow() {
    throw new Error('Date.now must not be used by the project time budget engine');
  };
  Math.random = function blockedRandom() {
    throw new Error('Math.random must not be used by the project time budget engine');
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
    const budget = Engine.createBudget({
      name: 'Blocked World',
      budgetMinutes: 240,
      sessions: [{ label: 'Focus block', minutes: 50, category: 'focus' }]
    }).budget;
    const added = Engine.addSession(budget, { label: 'Notes', minutes: 10, category: 'admin' });
    captured = {
      id: budget.id,
      summary: Engine.summarizeBudget(budget),
      projection: Engine.projectRemaining(budget),
      allocation: Engine.allocateRemaining(budget, [{ key: 'focus', weight: 1 }]),
      cleaned: Engine.normalizeBudget({ name: '  Clean ', budgetMinutes: 999999, sessions: 'bad' }),
      validated: Engine.validateBudget(budget),
      removed: Engine.removeSession(budget, budget.sessions[0].id),
      added: added,
      roundTrip: Engine.parse(Engine.serialize(budget)),
      migrated: Engine.migrate({
        schemaVersion: 0,
        title: 'Blocked Legacy',
        limitMinutes: 300,
        entries: [{ name: 'Legacy entry', minutes: 45 }]
      }),
      derived: Engine.deriveBudgetId('blocked') + Engine.deriveSessionId('blocked')
    };
  } finally {
    while (restores.length) restores.pop()();
  }

  assert.ok(captured.id.startsWith('pb_'));
  assert.strictEqual(typeof captured.summary.spentMinutes, 'number');
  assert.strictEqual(typeof captured.projection.completionPercent, 'number');
  assert.strictEqual(captured.allocation.ok, true);
  assert.strictEqual(captured.cleaned, null, 'non-array sessions stay structural failures');
  assert.strictEqual(captured.validated.ok, true);
  assert.strictEqual(captured.removed.ok, true);
  assert.strictEqual(captured.added.ok, true);
  assert.strictEqual(captured.roundTrip.ok, true);
  assert.strictEqual(captured.migrated.ok, true);
  assert.strictEqual(typeof captured.derived, 'string');
  assert.strictEqual(Date.now, originalNow, 'clock must be restored');
  assert.strictEqual(Math.random, originalRandom, 'random source must be restored');
  assert.deepStrictEqual(
    Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    beforeLocalStorage,
    'storage globals must be restored'
  );
});
