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
  'study_plan_templates_engine.js'
);

const Engine = require(ENGINE_PATH);

function blockGlobal(name) {
  const original = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get: function () {
      throw new Error(name + ' must not be read by the study plan engine');
    },
    set: function () {
      throw new Error(name + ' must not be written by the study plan engine');
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
    'WEEKDAYS',
    'PLAN_DEFAULTS',
    'listTemplates',
    'getTemplate',
    'createPlanFromTemplate',
    'createCustomPlan',
    'validatePlan',
    'normalizePlan',
    'updatePlan',
    'summarizePlan',
    'derivePlanId',
    'serialize',
    'parse',
    'migrate'
  ];
  for (const key of expected) {
    assert.strictEqual(typeof Engine[key], key === 'WEEKDAYS' || key === 'PLAN_DEFAULTS' ? 'object' : 'function', key);
  }
  assert.deepStrictEqual(Engine.WEEKDAYS, ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  assert.strictEqual(Object.isFrozen(Engine.PLAN_DEFAULTS), true);
  assert.strictEqual(Object.isFrozen(Engine.PLAN_DEFAULTS.days), true);
  assert.strictEqual(Object.isFrozen(Engine.PLAN_DEFAULTS.tags), true);
});

test('listTemplates returns detached copies and every template builds a valid plan', () => {
  const first = Engine.listTemplates();
  assert.ok(Array.isArray(first));
  assert.ok(first.length >= 4, 'expected at least four built-in templates');
  const snapshot = JSON.stringify(first);

  first[0].name = 'MUTATED';
  first[0].days.push('sun');
  first[0].sessionMinutes = 999;

  const second = Engine.listTemplates();
  assert.strictEqual(JSON.stringify(second), snapshot, 'built-in templates must not leak');
  assert.notStrictEqual(second[0], first[0]);

  for (const template of second) {
    const built = Engine.createPlanFromTemplate(template.id, {});
    assert.strictEqual(built.ok, true, template.id + ' must build: ' + JSON.stringify(built.errors));
    assert.strictEqual(Engine.validatePlan(built.plan).ok, true);
    assert.strictEqual(built.plan.templateId, template.id);
    assert.notStrictEqual(built.plan.id, template.id, 'plan ids must be derived, not copied');
  }

  const single = Engine.getTemplate(second[0].id);
  assert.strictEqual(single.id, second[0].id);
  single.sessionMinutes = 12345;
  single.days.length = 0;
  const again = Engine.getTemplate(second[0].id);
  assert.strictEqual(again.sessionMinutes, second[0].sessionMinutes);
  assert.ok(again.days.length > 0);
  assert.strictEqual(Engine.getTemplate('plan_missing'), null);
  assert.strictEqual(Engine.getTemplate(7), null);
});

test('createPlanFromTemplate is deterministic and normalized', () => {
  const one = Engine.createPlanFromTemplate('plan_exam_cram', {});
  const two = Engine.createPlanFromTemplate('plan_exam_cram', {});
  assert.strictEqual(one.ok, true);
  assert.deepStrictEqual(one.plan, two.plan, 'repeated builds must be identical');

  const plan = one.plan;
  assert.strictEqual(plan.templateId, 'plan_exam_cram');
  assert.deepStrictEqual(plan.days, ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
  assert.deepStrictEqual(plan.tags, ['exam', 'intensive']);
  assert.strictEqual(
    plan.id,
    Engine.derivePlanId(plan.name + '|' + plan.subject + '|' + plan.days.join(',')),
    'plan id must derive from its own content'
  );
  assert.strictEqual(Engine.validatePlan(plan).ok, true);
  assert.strictEqual(Engine.validatePlan(plan).errors.length, 0);
});

test('createPlanFromTemplate applies overrides without mutating them', () => {
  const overrides = {
    name: '  My Plan ',
    days: ['wed', 'mon', 'wed'],
    sessionMinutes: '60',
    notes: '  hello  ',
    tags: ['b', 'a', 'b']
  };
  const before = JSON.stringify(overrides);

  const res = Engine.createPlanFromTemplate('plan_deep_work', overrides);
  assert.strictEqual(JSON.stringify(overrides), before, 'overrides must not be mutated');
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.plan.name, 'My Plan');
  assert.deepStrictEqual(res.plan.days, ['mon', 'wed']);
  assert.strictEqual(res.plan.sessionMinutes, 60);
  assert.strictEqual(res.plan.notes, 'hello');
  assert.deepStrictEqual(res.plan.tags, ['b', 'a']);
  assert.strictEqual(res.plan.templateId, 'plan_deep_work');
  assert.strictEqual(res.plan.subject, 'Deep work');
});

test('createPlanFromTemplate rejects unknown templates and malformed input', () => {
  const unknown = Engine.createPlanFromTemplate('plan_missing', {});
  assert.strictEqual(unknown.ok, false);
  assert.strictEqual(unknown.errors[0].code, 'TEMPLATE_NOT_FOUND');

  const badOverrides = Engine.createPlanFromTemplate('plan_exam_cram', 'nope');
  assert.strictEqual(badOverrides.ok, false);
  assert.strictEqual(badOverrides.errors[0].code, 'OVERRIDES_NOT_OBJECT');

  const emptyDays = Engine.createPlanFromTemplate('plan_exam_cram', { days: [] });
  assert.strictEqual(emptyDays.ok, false);
  assert.ok(emptyDays.errors.some((e) => e.code === 'DAYS_EMPTY'));

  const emptyName = Engine.createPlanFromTemplate('plan_exam_cram', { name: '' });
  assert.strictEqual(emptyName.ok, false);
  assert.ok(emptyName.errors.some((e) => e.code === 'NAME_REQUIRED'));
});

test('createCustomPlan fills documented defaults and requires a name', () => {
  const okRes = Engine.createCustomPlan({ name: '  Thesis Sprint ', days: ['sun', 'fri'] });
  assert.strictEqual(okRes.ok, true);
  const plan = okRes.plan;
  assert.strictEqual(plan.name, 'Thesis Sprint');
  assert.deepStrictEqual(plan.days, ['fri', 'sun']);
  assert.strictEqual(plan.templateId, null);
  assert.ok(plan.id.startsWith('plan_'));
  assert.strictEqual(plan.sessionMinutes, Engine.PLAN_DEFAULTS.sessionMinutes);
  assert.strictEqual(plan.breakMinutes, Engine.PLAN_DEFAULTS.breakMinutes);
  assert.strictEqual(plan.sessionsPerDay, Engine.PLAN_DEFAULTS.sessionsPerDay);
  assert.strictEqual(plan.subject, Engine.PLAN_DEFAULTS.subject);
  assert.strictEqual(plan.weeks, Engine.PLAN_DEFAULTS.weeks);
  assert.strictEqual(plan.notes, Engine.PLAN_DEFAULTS.notes);
  assert.deepStrictEqual(plan.tags, []);
  assert.strictEqual(Engine.validatePlan(plan).ok, true);

  const missingName = Engine.createCustomPlan({});
  assert.strictEqual(missingName.ok, false);
  assert.ok(missingName.errors.some((e) => e.code === 'NAME_REQUIRED'));

  const notObject = Engine.createCustomPlan('x');
  assert.strictEqual(notObject.ok, false);
  assert.strictEqual(notObject.errors[0].code, 'SPEC_NOT_OBJECT');
});

test('validatePlan reports every broken field with stable codes', () => {
  const broken = {
    id: 'not a valid id!',
    name: '',
    subject: 'x'.repeat(61),
    templateId: 7,
    days: ['mon', 'Monday'],
    sessionMinutes: 4,
    breakMinutes: 121,
    sessionsPerDay: 0,
    startDate: '2026-02-30',
    weeks: 99,
    notes: 'n'.repeat(281),
    tags: ['a', 'a', 't'.repeat(25), 'b', 'c', 'd', 'e']
  };
  const res = Engine.validatePlan(broken);
  assert.strictEqual(res.ok, false);
  const codes = new Set(res.errors.map((e) => e.code));
  const expectedCodes = [
    'ID_INVALID',
    'NAME_REQUIRED',
    'SUBJECT_TOO_LONG',
    'TEMPLATE_ID_INVALID',
    'DAYS_DUPLICATE',
    'SESSION_MINUTES_RANGE',
    'BREAK_MINUTES_RANGE',
    'SESSIONS_PER_DAY_RANGE',
    'START_DATE_INVALID',
    'WEEKS_RANGE',
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

  assert.strictEqual(Engine.validatePlan(null).ok, false);
  assert.strictEqual(Engine.validatePlan(null).errors[0].code, 'PLAN_NOT_OBJECT');
  assert.strictEqual(Engine.validatePlan([1, 2]).ok, false);
  assert.strictEqual(Engine.validatePlan('plan').ok, false);
});

test('normalizePlan cleans messy input without mutating it', () => {
  const messy = {
    name: '   Calm Week   ',
    subject: '  Bio ',
    id: '',
    templateId: undefined,
    days: ['WEDNESDAY', 'mon', 'mon', 'funday'],
    sessionMinutes: 5000,
    breakMinutes: -3,
    sessionsPerDay: '3',
    weeks: 0,
    startDate: '2026-13-01',
    notes: '   take it easy ',
    tags: ['  spam  ', '', 'ok', 'ok', 42]
  };
  const before = JSON.stringify(messy);

  const clean = Engine.normalizePlan(messy);
  assert.strictEqual(JSON.stringify(messy), before, 'normalize must not mutate its input');
  assert.ok(clean);
  assert.strictEqual(clean.name, 'Calm Week');
  assert.strictEqual(clean.subject, 'Bio');
  assert.ok(clean.id.startsWith('plan_'));
  assert.strictEqual(clean.templateId, null);
  assert.deepStrictEqual(clean.days, ['mon', 'wed']);
  assert.strictEqual(clean.sessionMinutes, 480);
  assert.strictEqual(clean.breakMinutes, 0);
  assert.strictEqual(clean.sessionsPerDay, 3);
  assert.strictEqual(clean.weeks, 1);
  assert.strictEqual(clean.startDate, null);
  assert.strictEqual(clean.notes, 'take it easy');
  assert.deepStrictEqual(clean.tags, ['spam', 'ok']);
  assert.strictEqual(Engine.validatePlan(clean).ok, true, JSON.stringify(Engine.validatePlan(clean)));
  assert.deepStrictEqual(Engine.normalizePlan(clean), clean, 'normalize must be idempotent');

  assert.strictEqual(Engine.normalizePlan(null), null);
  assert.strictEqual(Engine.normalizePlan('plan'), null);
  assert.strictEqual(Engine.normalizePlan({ name: '   ' }), null);
  assert.strictEqual(Engine.normalizePlan({ name: 'x', days: ['someday'] }), null);
});

test('updatePlan returns a new validated plan and leaves the original untouched', () => {
  const base = Engine.createCustomPlan({ name: 'Base Plan' }).plan;
  const before = JSON.stringify(base);

  const res = Engine.updatePlan(base, {
    name: 'Renamed Plan',
    sessionMinutes: 30,
    days: ['sun']
  });
  assert.strictEqual(res.ok, true);
  assert.notStrictEqual(res.plan, base);
  assert.strictEqual(res.plan.name, 'Renamed Plan');
  assert.strictEqual(res.plan.sessionMinutes, 30);
  assert.deepStrictEqual(res.plan.days, ['sun']);
  assert.strictEqual(JSON.stringify(base), before, 'update must not mutate the source plan');
  assert.strictEqual(base.name, 'Base Plan');
  assert.strictEqual(Engine.validatePlan(res.plan).ok, true);

  const badDays = Engine.updatePlan(base, { days: [] });
  assert.strictEqual(badDays.ok, false);
  assert.ok(badDays.errors.some((e) => e.code === 'DAYS_EMPTY'));
  assert.strictEqual(JSON.stringify(base), before);

  const notObjectPlan = Engine.updatePlan(null, { name: 'x' });
  assert.strictEqual(notObjectPlan.ok, false);
  assert.strictEqual(notObjectPlan.errors[0].code, 'PLAN_NOT_OBJECT');

  const badChanges = Engine.updatePlan(base, 'x');
  assert.strictEqual(badChanges.ok, false);
  assert.strictEqual(badChanges.errors[0].code, 'CHANGES_NOT_OBJECT');
});

test('summarizePlan computes deterministic weekly and plan totals', () => {
  const plan = Engine.createCustomPlan({
    name: 'Maths Sprint',
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    sessionsPerDay: 2,
    sessionMinutes: 50,
    breakMinutes: 10,
    weeks: 4
  }).plan;
  const summary = Engine.summarizePlan(plan);
  assert.deepStrictEqual(summary, {
    daysPerWeek: 5,
    sessionsPerWeek: 10,
    focusMinutesPerWeek: 500,
    breakMinutesPerWeek: 100,
    minutesPerWeek: 600,
    hoursPerWeek: 10,
    planMinutes: 2400,
    planHours: 40
  });
  assert.deepStrictEqual(Engine.summarizePlan(plan), summary, 'summaries must be deterministic');

  const light = Engine.createCustomPlan({
    name: 'Light Review',
    days: ['tue', 'thu', 'sat'],
    sessionsPerDay: 3,
    sessionMinutes: 25,
    breakMinutes: 5,
    weeks: 2
  }).plan;
  const lightSummary = Engine.summarizePlan(light);
  assert.strictEqual(lightSummary.sessionsPerWeek, 9);
  assert.strictEqual(lightSummary.focusMinutesPerWeek, 225);
  assert.strictEqual(lightSummary.breakMinutesPerWeek, 45);
  assert.strictEqual(lightSummary.hoursPerWeek, 4.5);
  assert.strictEqual(lightSummary.planMinutes, 540);

  assert.strictEqual(Engine.summarizePlan({ name: 'x' }), null);
  assert.strictEqual(Engine.summarizePlan(null), null);
});

test('serialize and parse round-trip a plan with the schema version stamped', () => {
  const plan = Engine.createPlanFromTemplate('plan_language_daily', { startDate: '2026-09-01' }).plan;
  const json = Engine.serialize(plan);
  assert.strictEqual(typeof json, 'string');
  const doc = JSON.parse(json);
  assert.strictEqual(doc.schemaVersion, 1);
  assert.strictEqual(typeof doc.plan.id, 'string');

  const parsed = Engine.parse(json);
  assert.strictEqual(parsed.ok, true);
  assert.deepStrictEqual(parsed.plan, plan, 'round trip must preserve the plan');
  assert.strictEqual(parsed.migratedFrom, null);

  assert.strictEqual(Engine.serialize({ name: 'nope' }), null);
  assert.strictEqual(Engine.parse('not json').ok, false);
  assert.strictEqual(Engine.parse('not json').errors[0].code, 'MALFORMED');
  assert.strictEqual(Engine.parse('[]').errors[0].code, 'DOCUMENT_NOT_OBJECT');
  assert.strictEqual(Engine.parse({}).errors[0].code, 'MALFORMED');
  assert.strictEqual(Engine.parse(JSON.stringify({ schemaVersion: 1 })).errors[0].code, 'PLAN_MISSING');
});

test('migrate upgrades legacy schema 0 documents and blocks unknown versions', () => {
  const legacy = {
    schemaVersion: 0,
    title: 'Legacy Cram',
    subject: 'Chemistry',
    weekdays: ['Mon', 'Tuesday', 'fri'],
    durationMinutes: 45,
    breakMinutes: 5,
    sessionsPerDay: 2,
    notes: 'old notes',
    tags: ['old']
  };
  const before = JSON.stringify(legacy);

  const parsed = Engine.parse(JSON.stringify(legacy));
  assert.strictEqual(JSON.stringify(legacy), before, 'migrating a string must not matter, just a guard');
  assert.strictEqual(parsed.ok, true);
  assert.strictEqual(parsed.migratedFrom, 0);
  assert.strictEqual(parsed.plan.name, 'Legacy Cram');
  assert.deepStrictEqual(parsed.plan.days, ['mon', 'tue', 'fri']);
  assert.strictEqual(parsed.plan.sessionMinutes, 45);
  assert.strictEqual(parsed.plan.breakMinutes, 5);
  assert.strictEqual(parsed.plan.sessionsPerDay, 2);
  assert.strictEqual(parsed.plan.weeks, Engine.PLAN_DEFAULTS.weeks);
  assert.strictEqual(parsed.plan.templateId, null);
  assert.strictEqual(parsed.plan.notes, 'old notes');
  assert.deepStrictEqual(parsed.plan.tags, ['old']);
  assert.ok(parsed.plan.id.startsWith('plan_'));
  assert.strictEqual(Engine.validatePlan(parsed.plan).ok, true);

  const direct = Engine.migrate(legacy);
  assert.strictEqual(JSON.stringify(legacy), before, 'migrate must not mutate legacy documents');
  assert.strictEqual(direct.ok, true);
  assert.strictEqual(direct.migratedFrom, 0);
  assert.deepStrictEqual(direct.plan, parsed.plan, 'migrate must be deterministic');

  assert.strictEqual(Engine.parse(JSON.stringify({ schemaVersion: 2, plan: {} })).errors[0].code, 'SCHEMA_VERSION_UNSUPPORTED');
  assert.strictEqual(Engine.parse(JSON.stringify({ plan: {} })).errors[0].code, 'SCHEMA_VERSION_MISSING');
  assert.strictEqual(Engine.migrate(null).errors[0].code, 'DOCUMENT_NOT_OBJECT');
});

test('prototype-like names never pollute Object.prototype', () => {
  const evil = JSON.parse(
    '{"name":"Safe","__proto__":{"polluted":"yes"},"id":"__proto__","subject":"","' +
      'days":["mon"],"sessionMinutes":45,"breakMinutes":5,"sessionsPerDay":1,"weeks":1,' +
      '"templateId":null,"startDate":null,"notes":"","tags":["__proto__"]}'
  );

  const normalized = Engine.normalizePlan(evil);
  assert.ok(normalized);
  assert.strictEqual({}.polluted, undefined);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(normalized, '__proto__'), false);
  assert.strictEqual(normalized.id, '__proto__');
  assert.strictEqual(normalized.name, 'Safe');
  assert.deepStrictEqual(normalized.tags, ['__proto__']);
  assert.strictEqual(Engine.validatePlan(evil).ok, true);

  const parsed = Engine.parse(JSON.stringify({ schemaVersion: 1, plan: evil }));
  assert.strictEqual(parsed.ok, true);
  assert.strictEqual({}.polluted, undefined);
  assert.strictEqual(parsed.plan.id, '__proto__');

  const summary = Engine.summarizePlan(parsed.plan);
  assert.strictEqual(summary.sessionsPerWeek, 1);
  assert.strictEqual({}.polluted, undefined);

  const custom = Engine.createCustomPlan({ id: '__proto__', name: 'constructor' });
  assert.strictEqual(custom.ok, true);
  assert.strictEqual(custom.plan.id, '__proto__');
  assert.strictEqual({}.polluted, undefined);
  assert.strictEqual(Engine.derivePlanId('constructor'), Engine.derivePlanId('constructor'));
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
    throw new Error('Date.now must not be used by the study plan engine');
  };
  Math.random = function blockedRandom() {
    throw new Error('Math.random must not be used by the study plan engine');
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
    const plan = Engine.createPlanFromTemplate('plan_light_review', { startDate: '2026-01-05' }).plan;
    const custom = Engine.createCustomPlan({ name: 'Blocked World', days: ['mon', 'thu'] });
    captured = {
      templateCount: Engine.listTemplates().length,
      id: plan.id,
      summary: Engine.summarizePlan(plan),
      roundTrip: Engine.parse(Engine.serialize(plan)),
      custom: custom,
      migrated: Engine.migrate({
        schemaVersion: 0,
        title: 'Blocked Legacy',
        weekdays: ['sun'],
        durationMinutes: 30
      })
    };
  } finally {
    while (restores.length) restores.pop()();
  }

  assert.strictEqual(captured.templateCount >= 4, true);
  assert.ok(captured.id.startsWith('plan_'));
  assert.strictEqual(typeof captured.summary.hoursPerWeek, 'number');
  assert.strictEqual(captured.roundTrip.ok, true);
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
