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
  'sport_interval_builder_engine.js'
);

const Engine = require(ENGINE_PATH);

function blockGlobal(name) {
  const original = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get: function () {
      throw new Error(name + ' must not be read by the sport interval engine');
    },
    set: function () {
      throw new Error(name + ' must not be written by the sport interval engine');
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
    'PHASES',
    'INTENSITIES',
    'SESSION_DEFAULTS',
    'listTemplates',
    'getTemplate',
    'createSessionFromTemplate',
    'createCustomSession',
    'validateSession',
    'normalizeSession',
    'updateSession',
    'buildTimeline',
    'summarizeSession',
    'deriveSessionId',
    'serialize',
    'parse',
    'migrate'
  ];
  for (const key of expected) {
    const kind = key === 'PHASES' || key === 'INTENSITIES' || key === 'SESSION_DEFAULTS' ? 'object' : 'function';
    assert.strictEqual(typeof Engine[key], kind, key);
  }
  assert.deepStrictEqual(Engine.PHASES, ['warmup', 'work', 'rest', 'cooldown']);
  assert.deepStrictEqual(Engine.INTENSITIES, ['easy', 'moderate', 'hard', 'max']);
  assert.strictEqual(Object.isFrozen(Engine.SESSION_DEFAULTS), true);
  assert.strictEqual(Object.isFrozen(Engine.SESSION_DEFAULTS.warmup), true);
  assert.strictEqual(Object.isFrozen(Engine.SESSION_DEFAULTS.warmup[0]), true);
  assert.strictEqual(Object.isFrozen(Engine.SESSION_DEFAULTS.cooldown), true);
  assert.strictEqual(Object.isFrozen(Engine.SESSION_DEFAULTS.cooldown[0]), true);
  assert.strictEqual(Object.isFrozen(Engine.SESSION_DEFAULTS.tags), true);
});

test('listTemplates returns detached copies and every template builds a valid session', () => {
  const first = Engine.listTemplates();
  assert.ok(Array.isArray(first));
  assert.ok(first.length >= 5, 'expected at least five built-in templates');
  const snapshot = JSON.stringify(first);

  first[0].name = 'MUTATED';
  first[0].warmup[0].minutes = 999;
  first[0].workRounds = 999;

  const second = Engine.listTemplates();
  assert.strictEqual(JSON.stringify(second), snapshot, 'built-in templates must not leak');
  assert.notStrictEqual(second[0], first[0]);
  assert.notStrictEqual(second[0].warmup, first[0].warmup);
  assert.notStrictEqual(second[0].warmup[0], first[0].warmup[0]);

  for (const template of second) {
    const built = Engine.createSessionFromTemplate(template.id, {});
    assert.strictEqual(built.ok, true, template.id + ' must build: ' + JSON.stringify(built.errors));
    assert.strictEqual(Engine.validateSession(built.plan).ok, true);
    assert.strictEqual(built.plan.templateId, template.id);
    assert.ok(built.plan.id.startsWith('int_'), 'session ids must be derived');
    assert.notStrictEqual(built.plan.id, template.id);
    assert.strictEqual(Engine.buildTimeline(built.plan).totalMinutes > 0, true);
  }

  const single = Engine.getTemplate(second[0].id);
  assert.strictEqual(single.id, second[0].id);
  single.workMinutes = 12345;
  single.warmup.length = 0;
  const again = Engine.getTemplate(second[0].id);
  assert.strictEqual(again.workMinutes, second[0].workMinutes);
  assert.ok(again.warmup.length > 0);
  assert.strictEqual(Engine.getTemplate('int_missing'), null);
  assert.strictEqual(Engine.getTemplate(7), null);
});

test('createSessionFromTemplate is deterministic and normalized', () => {
  const one = Engine.createSessionFromTemplate('int_hiit_8round', {});
  const two = Engine.createSessionFromTemplate('int_hiit_8round', {});
  assert.strictEqual(one.ok, true);
  assert.deepStrictEqual(one.plan, two.plan, 'repeated builds must be identical');

  const session = one.plan;
  assert.strictEqual(session.templateId, 'int_hiit_8round');
  assert.deepStrictEqual(session.warmup, [{ minutes: 5, intensity: 'easy' }]);
  assert.deepStrictEqual(session.cooldown, [{ minutes: 5, intensity: 'easy' }]);
  assert.strictEqual(session.workRounds, 8);
  assert.strictEqual(session.workMinutes, 1);
  assert.strictEqual(session.restMinutes, 1);
  assert.strictEqual(session.includeFinalRest, false);
  assert.strictEqual(Engine.validateSession(session).ok, true);
  assert.strictEqual(Engine.validateSession(session).errors.length, 0);

  const renamed = Engine.createSessionFromTemplate('int_hiit_8round', { name: 'Renamed' });
  assert.strictEqual(renamed.ok, true);
  assert.notStrictEqual(renamed.plan.id, session.id, 'ids must derive from session content');
});

test('createSessionFromTemplate applies overrides without mutating them', () => {
  const overrides = {
    name: '  Track Special ',
    activity: ' sprint ',
    workRounds: '12',
    workMinutes: 500,
    restMinutes: -4,
    includeFinalRest: 'yes',
    warmup: [
      { minutes: 0, intensity: 'nope' },
      { minutes: '8', intensity: 'MODERATE' }
    ],
    tags: ['b', 'a', 'b']
  };
  const before = JSON.stringify(overrides);

  const res = Engine.createSessionFromTemplate('int_strength_ladder', overrides);
  assert.strictEqual(JSON.stringify(overrides), before, 'overrides must not be mutated');
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.plan.name, 'Track Special');
  assert.strictEqual(res.plan.activity, 'sprint');
  assert.strictEqual(res.plan.workRounds, 12);
  assert.strictEqual(res.plan.workMinutes, 120);
  assert.strictEqual(res.plan.restMinutes, 0);
  assert.strictEqual(res.plan.includeFinalRest, false);
  assert.deepStrictEqual(res.plan.warmup, [
    { minutes: 1, intensity: 'easy' },
    { minutes: 8, intensity: 'moderate' }
  ]);
  assert.deepStrictEqual(res.plan.cooldown, [{ minutes: 6, intensity: 'easy' }]);
  assert.deepStrictEqual(res.plan.tags, ['b', 'a']);
  assert.strictEqual(res.plan.templateId, 'int_strength_ladder');
  assert.strictEqual(res.plan.notes, 'Five working sets with two minutes of rest.');
  assert.strictEqual(Engine.validateSession(res.plan).ok, true);
});

test('createSessionFromTemplate rejects unknown templates and malformed input', () => {
  const unknown = Engine.createSessionFromTemplate('int_missing', {});
  assert.strictEqual(unknown.ok, false);
  assert.strictEqual(unknown.errors[0].code, 'TEMPLATE_NOT_FOUND');

  const badOverrides = Engine.createSessionFromTemplate('int_hiit_8round', 'nope');
  assert.strictEqual(badOverrides.ok, false);
  assert.strictEqual(badOverrides.errors[0].code, 'OVERRIDES_NOT_OBJECT');

  const emptyWarmup = Engine.createSessionFromTemplate('int_hiit_8round', { warmup: [] });
  assert.strictEqual(emptyWarmup.ok, false);
  assert.ok(emptyWarmup.errors.some((e) => e.code === 'WARMUP_EMPTY'));

  const emptyCooldown = Engine.createSessionFromTemplate('int_hiit_8round', { cooldown: [] });
  assert.strictEqual(emptyCooldown.ok, false);
  assert.ok(emptyCooldown.errors.some((e) => e.code === 'COOLDOWN_EMPTY'));

  const emptyName = Engine.createSessionFromTemplate('int_hiit_8round', { name: '' });
  assert.strictEqual(emptyName.ok, false);
  assert.ok(emptyName.errors.some((e) => e.code === 'NAME_REQUIRED'));
});

test('createCustomSession fills documented defaults and requires a name', () => {
  const okRes = Engine.createCustomSession({ name: '  Easy Intervals ', warmup: [{ minutes: 4 }] });
  assert.strictEqual(okRes.ok, true);
  const session = okRes.plan;
  assert.strictEqual(session.name, 'Easy Intervals');
  assert.deepStrictEqual(session.warmup, [{ minutes: 4, intensity: 'easy' }]);
  assert.strictEqual(session.templateId, null);
  assert.ok(session.id.startsWith('int_'));
  assert.strictEqual(session.activity, Engine.SESSION_DEFAULTS.activity);
  assert.strictEqual(session.workRounds, Engine.SESSION_DEFAULTS.workRounds);
  assert.strictEqual(session.workMinutes, Engine.SESSION_DEFAULTS.workMinutes);
  assert.strictEqual(session.restMinutes, Engine.SESSION_DEFAULTS.restMinutes);
  assert.strictEqual(session.includeFinalRest, Engine.SESSION_DEFAULTS.includeFinalRest);
  assert.deepStrictEqual(session.cooldown, [{ minutes: 5, intensity: 'easy' }]);
  assert.strictEqual(session.notes, Engine.SESSION_DEFAULTS.notes);
  assert.deepStrictEqual(session.tags, []);
  assert.strictEqual(Engine.validateSession(session).ok, true);

  const bare = Engine.createCustomSession({ name: 'Bare' });
  assert.strictEqual(bare.ok, true);
  assert.deepStrictEqual(bare.plan.warmup, [{ minutes: 5, intensity: 'easy' }]);
  assert.deepStrictEqual(bare.plan.cooldown, [{ minutes: 5, intensity: 'easy' }]);

  const missingName = Engine.createCustomSession({});
  assert.strictEqual(missingName.ok, false);
  assert.ok(missingName.errors.some((e) => e.code === 'NAME_REQUIRED'));

  const notObject = Engine.createCustomSession('x');
  assert.strictEqual(notObject.ok, false);
  assert.strictEqual(notObject.errors[0].code, 'SPEC_NOT_OBJECT');
});

test('validateSession reports every broken field with stable codes', () => {
  const broken = {
    id: 'not a valid id!',
    name: '',
    activity: 'x'.repeat(41),
    templateId: 7,
    warmup: [],
    workRounds: 0,
    workMinutes: 0,
    restMinutes: 999,
    includeFinalRest: 'no',
    cooldown: [
      { minutes: 90, intensity: 'hard' },
      { minutes: 0, intensity: 'hard' },
      { minutes: 10, intensity: 'insane' },
      'junk'
    ],
    notes: 'n'.repeat(281),
    tags: ['a', 'a', 't'.repeat(25), 'b', 'c', 'd', 'e']
  };
  const res = Engine.validateSession(broken);
  assert.strictEqual(res.ok, false);
  const codes = new Set(res.errors.map((e) => e.code));
  const expectedCodes = [
    'ID_INVALID',
    'NAME_REQUIRED',
    'ACTIVITY_TOO_LONG',
    'TEMPLATE_ID_INVALID',
    'WARMUP_EMPTY',
    'WORK_ROUNDS_RANGE',
    'WORK_MINUTES_RANGE',
    'REST_MINUTES_RANGE',
    'FINAL_REST_INVALID',
    'COOLDOWN_STEP_MINUTES_RANGE',
    'COOLDOWN_STEP_INTENSITY_INVALID',
    'COOLDOWN_STEP_INVALID',
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

  assert.strictEqual(Engine.validateSession(null).errors[0].code, 'SESSION_NOT_OBJECT');
  assert.strictEqual(Engine.validateSession([1, 2]).errors[0].code, 'SESSION_NOT_OBJECT');
  assert.strictEqual(Engine.validateSession('session').errors[0].code, 'SESSION_NOT_OBJECT');

  const badWarmupShape = Engine.validateSession({ name: 'x', warmup: 'nope' });
  assert.ok(badWarmupShape.errors.some((e) => e.code === 'WARMUP_INVALID'));
  const tooManyWarmup = Engine.validateSession({
    name: 'x',
    warmup: [
      { minutes: 2, intensity: 'easy' },
      { minutes: 2, intensity: 'easy' },
      { minutes: 2, intensity: 'easy' },
      { minutes: 2, intensity: 'easy' },
      { minutes: 2, intensity: 'easy' },
      { minutes: 2, intensity: 'easy' },
      { minutes: 2, intensity: 'easy' }
    ]
  });
  assert.ok(tooManyWarmup.errors.some((e) => e.code === 'WARMUP_LIMIT'));
  assert.ok(!tooManyWarmup.errors.some((e) => e.code === 'WARMUP_STEP_MINUTES_RANGE'));
  const badCooldownShape = Engine.validateSession({ name: 'x', cooldown: 'nope' });
  assert.ok(badCooldownShape.errors.some((e) => e.code === 'COOLDOWN_INVALID'));
  const badWarmupStep = Engine.validateSession({
    name: 'x',
    warmup: [{ minutes: 5, intensity: 'easy' }, { minutes: 10 }]
  });
  assert.ok(badWarmupStep.errors.some((e) => e.code === 'WARMUP_STEP_INTENSITY_INVALID'));
});

test('normalizeSession cleans messy input without mutating it', () => {
  const messy = {
    name: '   Sprint Day   ',
    activity: '  running  ',
    id: '',
    templateId: undefined,
    warmup: [
      { minutes: 0, intensity: 'nope' },
      'junk',
      { minutes: 500, intensity: 'MODERATE' },
      { minutes: '10', intensity: 'easy' }
    ],
    workRounds: '9',
    workMinutes: 500,
    restMinutes: -4,
    includeFinalRest: 'yes',
    cooldown: [{ minutes: 12, intensity: 'hard' }],
    notes: '  take it easy ',
    tags: ['  spam  ', '', 'ok', 'ok', 42]
  };
  const before = JSON.stringify(messy);

  const clean = Engine.normalizeSession(messy);
  assert.strictEqual(JSON.stringify(messy), before, 'normalize must not mutate its input');
  assert.ok(clean);
  assert.strictEqual(clean.name, 'Sprint Day');
  assert.strictEqual(clean.activity, 'running');
  assert.ok(clean.id.startsWith('int_'));
  assert.strictEqual(clean.templateId, null);
  assert.deepStrictEqual(clean.warmup, [
    { minutes: 1, intensity: 'easy' },
    { minutes: 90, intensity: 'moderate' },
    { minutes: 10, intensity: 'easy' }
  ]);
  assert.strictEqual(clean.workRounds, 9);
  assert.strictEqual(clean.workMinutes, 120);
  assert.strictEqual(clean.restMinutes, 0);
  assert.strictEqual(clean.includeFinalRest, false);
  assert.deepStrictEqual(clean.cooldown, [{ minutes: 12, intensity: 'hard' }]);
  assert.strictEqual(clean.notes, 'take it easy');
  assert.deepStrictEqual(clean.tags, ['spam', 'ok']);
  assert.strictEqual(Engine.validateSession(clean).ok, true, JSON.stringify(Engine.validateSession(clean)));
  assert.deepStrictEqual(Engine.normalizeSession(clean), clean, 'normalize must be idempotent');

  assert.strictEqual(Engine.normalizeSession(null), null);
  assert.strictEqual(Engine.normalizeSession('session'), null);
  assert.strictEqual(Engine.normalizeSession({ name: '   ' }), null);
  assert.strictEqual(Engine.normalizeSession({ name: 'x', warmup: [] }), null);
  assert.strictEqual(Engine.normalizeSession({ name: 'x', cooldown: [] }), null);
});

test('updateSession returns a new validated session and leaves the original untouched', () => {
  const base = Engine.createCustomSession({ name: 'Base Session' }).plan;
  const before = JSON.stringify(base);

  const res = Engine.updateSession(base, {
    name: 'Renamed Session',
    workRounds: 3,
    workMinutes: 2
  });
  assert.strictEqual(res.ok, true);
  assert.notStrictEqual(res.plan, base);
  assert.strictEqual(res.plan.name, 'Renamed Session');
  assert.strictEqual(res.plan.workRounds, 3);
  assert.strictEqual(res.plan.workMinutes, 2);
  assert.strictEqual(JSON.stringify(base), before, 'update must not mutate the source session');
  assert.strictEqual(base.name, 'Base Session');
  assert.strictEqual(Engine.validateSession(res.plan).ok, true);

  const badWarmup = Engine.updateSession(base, { warmup: [] });
  assert.strictEqual(badWarmup.ok, false);
  assert.ok(badWarmup.errors.some((e) => e.code === 'WARMUP_EMPTY'));
  assert.strictEqual(JSON.stringify(base), before);

  const notObjectSession = Engine.updateSession(null, { name: 'x' });
  assert.strictEqual(notObjectSession.ok, false);
  assert.strictEqual(notObjectSession.errors[0].code, 'SESSION_NOT_OBJECT');

  const badChanges = Engine.updateSession(base, 'x');
  assert.strictEqual(badChanges.ok, false);
  assert.strictEqual(badChanges.errors[0].code, 'CHANGES_NOT_OBJECT');
});

test('buildTimeline expands warmup, work, rest and cooldown deterministically', () => {
  const hiit = Engine.createSessionFromTemplate('int_hiit_8round', {}).plan;
  const timeline = Engine.buildTimeline(hiit);
  assert.deepStrictEqual(Engine.buildTimeline(hiit), timeline, 'timelines must be deterministic');

  assert.strictEqual(timeline.totalSteps, 17);
  assert.strictEqual(timeline.totalMinutes, 25);
  assert.strictEqual(timeline.warmupMinutes, 5);
  assert.strictEqual(timeline.workMinutes, 8);
  assert.strictEqual(timeline.restMinutes, 7);
  assert.strictEqual(timeline.cooldownMinutes, 5);
  assert.strictEqual(timeline.workRounds, 8);
  assert.strictEqual(timeline.restIntervals, 7);

  assert.deepStrictEqual(timeline.steps[0], {
    index: 0,
    phase: 'warmup',
    round: null,
    label: 'Warmup 1',
    minutes: 5,
    startMinute: 0,
    endMinute: 5,
    intensity: 'easy'
  });
  assert.deepStrictEqual(timeline.steps[1], {
    index: 1,
    phase: 'work',
    round: 1,
    label: 'Work 1',
    minutes: 1,
    startMinute: 5,
    endMinute: 6,
    intensity: 'hard'
  });
  assert.deepStrictEqual(timeline.steps[2], {
    index: 2,
    phase: 'rest',
    round: 1,
    label: 'Rest 1',
    minutes: 1,
    startMinute: 6,
    endMinute: 7,
    intensity: 'easy'
  });
  assert.deepStrictEqual(timeline.steps[15], {
    index: 15,
    phase: 'work',
    round: 8,
    label: 'Work 8',
    minutes: 1,
    startMinute: 19,
    endMinute: 20,
    intensity: 'hard'
  });
  assert.deepStrictEqual(timeline.steps[16], {
    index: 16,
    phase: 'cooldown',
    round: null,
    label: 'Cooldown 1',
    minutes: 5,
    startMinute: 20,
    endMinute: 25,
    intensity: 'easy'
  });
  assert.strictEqual(
    timeline.steps.filter((s) => s.phase === 'rest' && s.round === 8).length,
    0,
    'no trailing rest when includeFinalRest is false'
  );
  for (let i = 0; i < timeline.steps.length; i++) {
    assert.strictEqual(timeline.steps[i].index, i);
    assert.strictEqual(timeline.steps[i].startMinute, i === 0 ? 0 : timeline.steps[i - 1].endMinute);
    assert.strictEqual(
      timeline.steps[i].endMinute,
      timeline.steps[i].startMinute + timeline.steps[i].minutes
    );
  }

  const cycling = Engine.createSessionFromTemplate('int_cycling_sprints', {}).plan;
  const cyclingTimeline = Engine.buildTimeline(cycling);
  assert.strictEqual(cycling.includeFinalRest, true);
  assert.strictEqual(cyclingTimeline.totalSteps, 23);
  assert.strictEqual(cyclingTimeline.totalMinutes, 50);
  assert.strictEqual(cyclingTimeline.restIntervals, 10);
  assert.strictEqual(cyclingTimeline.restMinutes, 20);
  assert.strictEqual(cyclingTimeline.steps[2].label, 'Work 1');
  assert.strictEqual(cyclingTimeline.steps[3].label, 'Rest 1');
  assert.ok(
    cyclingTimeline.steps.some((s) => s.phase === 'rest' && s.round === 10),
    'final rest must appear when includeFinalRest is true'
  );
  assert.deepStrictEqual(cyclingTimeline.steps[0], {
    index: 0,
    phase: 'warmup',
    round: null,
    label: 'Warmup 1',
    minutes: 8,
    startMinute: 0,
    endMinute: 8,
    intensity: 'easy'
  });
  assert.deepStrictEqual(cyclingTimeline.steps[1], {
    index: 1,
    phase: 'warmup',
    round: null,
    label: 'Warmup 2',
    minutes: 4,
    startMinute: 8,
    endMinute: 12,
    intensity: 'moderate'
  });
  assert.strictEqual(cyclingTimeline.steps[22].phase, 'cooldown');

  const noRest = Engine.createCustomSession({
    name: 'No Rest',
    warmup: [{ minutes: 3, intensity: 'easy' }],
    workRounds: 4,
    workMinutes: 2,
    restMinutes: 0,
    cooldown: [{ minutes: 3, intensity: 'moderate' }]
  }).plan;
  const noRestTimeline = Engine.buildTimeline(noRest);
  assert.strictEqual(noRestTimeline.totalSteps, 6);
  assert.strictEqual(noRestTimeline.totalMinutes, 14);
  assert.strictEqual(noRestTimeline.restIntervals, 0);
  assert.strictEqual(noRestTimeline.restMinutes, 0);
  assert.strictEqual(noRestTimeline.steps.filter((s) => s.phase === 'rest').length, 0);

  assert.strictEqual(Engine.buildTimeline({ name: 'x', warmup: [] }), null);
  assert.strictEqual(Engine.buildTimeline(null), null);
});

test('summarizeSession computes deterministic totals and work to rest ratio', () => {
  const hiit = Engine.createSessionFromTemplate('int_hiit_8round', {}).plan;
  const summary = Engine.summarizeSession(hiit);
  assert.deepStrictEqual(summary, {
    warmupMinutes: 5,
    workMinutes: 8,
    restMinutes: 7,
    cooldownMinutes: 5,
    totalMinutes: 25,
    workRounds: 8,
    restIntervals: 7,
    workToRestRatio: 1.14,
    totalHours: 0.42
  });
  assert.deepStrictEqual(Engine.summarizeSession(hiit), summary, 'summaries must be deterministic');

  const cycling = Engine.createSessionFromTemplate('int_cycling_sprints', {}).plan;
  const cyclingSummary = Engine.summarizeSession(cycling);
  assert.strictEqual(cyclingSummary.warmupMinutes, 12);
  assert.strictEqual(cyclingSummary.workMinutes, 10);
  assert.strictEqual(cyclingSummary.restMinutes, 20);
  assert.strictEqual(cyclingSummary.cooldownMinutes, 8);
  assert.strictEqual(cyclingSummary.totalMinutes, 50);
  assert.strictEqual(cyclingSummary.restIntervals, 10);
  assert.strictEqual(cyclingSummary.workToRestRatio, 0.5);
  assert.strictEqual(cyclingSummary.totalHours, 0.83);

  const boxing = Engine.createSessionFromTemplate('int_boxing_rounds', {}).plan;
  const boxingSummary = Engine.summarizeSession(boxing);
  assert.strictEqual(boxingSummary.totalMinutes, 58);
  assert.strictEqual(boxingSummary.workMinutes, 36);
  assert.strictEqual(boxingSummary.restMinutes, 11);
  assert.strictEqual(boxingSummary.restIntervals, 11);

  const noRest = Engine.createCustomSession({
    name: 'No Rest',
    workRounds: 4,
    workMinutes: 2,
    restMinutes: 0
  }).plan;
  const noRestSummary = Engine.summarizeSession(noRest);
  assert.strictEqual(noRestSummary.restIntervals, 0);
  assert.strictEqual(noRestSummary.restMinutes, 0);
  assert.strictEqual(noRestSummary.workToRestRatio, null);

  assert.strictEqual(Engine.summarizeSession({ name: 'x' }), null);
  assert.strictEqual(Engine.summarizeSession(null), null);
});

test('serialize and parse round-trip a session with the schema version stamped', () => {
  const session = Engine.createSessionFromTemplate('int_boxing_rounds', {}).plan;
  const json = Engine.serialize(session);
  assert.strictEqual(typeof json, 'string');
  const doc = JSON.parse(json);
  assert.strictEqual(doc.schemaVersion, 1);
  assert.strictEqual(typeof doc.session.id, 'string');

  const parsed = Engine.parse(json);
  assert.strictEqual(parsed.ok, true);
  assert.deepStrictEqual(parsed.plan, session, 'round trip must preserve the session');
  assert.strictEqual(parsed.migratedFrom, null);

  assert.strictEqual(Engine.serialize({ name: 'nope' }), null);
  assert.strictEqual(Engine.parse('not json').ok, false);
  assert.strictEqual(Engine.parse('not json').errors[0].code, 'MALFORMED');
  assert.strictEqual(Engine.parse('[]').errors[0].code, 'DOCUMENT_NOT_OBJECT');
  assert.strictEqual(Engine.parse({}).errors[0].code, 'MALFORMED');
  assert.strictEqual(Engine.parse(JSON.stringify({ schemaVersion: 1 })).errors[0].code, 'SESSION_MISSING');
});

test('migrate upgrades legacy schema 0 documents and blocks unknown versions', () => {
  const legacy = {
    schemaVersion: 0,
    title: 'Legacy HIIT',
    activity: 'hiit',
    warmupMinutes: 5,
    rounds: 8,
    workMinutes: 1,
    restMinutes: 1,
    cooldownMinutes: 5,
    notes: 'old notes',
    tags: ['old']
  };
  const before = JSON.stringify(legacy);

  const parsed = Engine.parse(JSON.stringify(legacy));
  assert.strictEqual(parsed.ok, true);
  assert.strictEqual(parsed.migratedFrom, 0);
  assert.strictEqual(parsed.plan.name, 'Legacy HIIT');
  assert.strictEqual(parsed.plan.activity, 'hiit');
  assert.deepStrictEqual(parsed.plan.warmup, [{ minutes: 5, intensity: 'easy' }]);
  assert.strictEqual(parsed.plan.workRounds, 8);
  assert.strictEqual(parsed.plan.workMinutes, 1);
  assert.strictEqual(parsed.plan.restMinutes, 1);
  assert.strictEqual(parsed.plan.includeFinalRest, false);
  assert.deepStrictEqual(parsed.plan.cooldown, [{ minutes: 5, intensity: 'easy' }]);
  assert.strictEqual(parsed.plan.templateId, null);
  assert.strictEqual(parsed.plan.notes, 'old notes');
  assert.deepStrictEqual(parsed.plan.tags, ['old']);
  assert.ok(parsed.plan.id.startsWith('int_'));
  assert.strictEqual(Engine.validateSession(parsed.plan).ok, true);
  assert.strictEqual(Engine.summarizeSession(parsed.plan).totalMinutes, 25);

  const direct = Engine.migrate(legacy);
  assert.strictEqual(JSON.stringify(legacy), before, 'migrate must not mutate legacy documents');
  assert.strictEqual(direct.ok, true);
  assert.strictEqual(direct.migratedFrom, 0);
  assert.deepStrictEqual(direct.plan, parsed.plan, 'migrate must be deterministic');

  const sparse = Engine.migrate({ schemaVersion: 0, title: 'Sparse Legacy' });
  assert.strictEqual(sparse.ok, true);
  assert.strictEqual(sparse.plan.workRounds, Engine.SESSION_DEFAULTS.workRounds);
  assert.deepStrictEqual(sparse.plan.warmup, [{ minutes: 5, intensity: 'easy' }]);
  assert.deepStrictEqual(sparse.plan.cooldown, [{ minutes: 5, intensity: 'easy' }]);

  assert.strictEqual(Engine.parse(JSON.stringify({ schemaVersion: 2, session: {} })).errors[0].code, 'SCHEMA_VERSION_UNSUPPORTED');
  assert.strictEqual(Engine.parse(JSON.stringify({ session: {} })).errors[0].code, 'SCHEMA_VERSION_MISSING');
  assert.strictEqual(Engine.migrate(null).errors[0].code, 'DOCUMENT_NOT_OBJECT');
});

test('prototype-like names never pollute Object.prototype', () => {
  const evil = JSON.parse(
    '{"name":"Safe","__proto__":{"polluted":"yes"},"id":"__proto__","activity":"core",' +
      '"templateId":null,"warmup":[{"minutes":5,"intensity":"easy"}],"workRounds":2,' +
      '"workMinutes":1,"restMinutes":1,"includeFinalRest":false,' +
      '"cooldown":[{"minutes":5,"intensity":"easy"}],"notes":"","tags":["__proto__"]}'
  );

  const normalized = Engine.normalizeSession(evil);
  assert.ok(normalized);
  assert.strictEqual({}.polluted, undefined);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(normalized, '__proto__'), false);
  assert.strictEqual(normalized.id, '__proto__');
  assert.strictEqual(normalized.name, 'Safe');
  assert.deepStrictEqual(normalized.tags, ['__proto__']);
  assert.strictEqual(Engine.validateSession(evil).ok, true);
  assert.strictEqual({}.polluted, undefined);

  const parsed = Engine.parse(JSON.stringify({ schemaVersion: 1, session: evil }));
  assert.strictEqual(parsed.ok, true, JSON.stringify(parsed));
  assert.strictEqual({}.polluted, undefined);
  assert.strictEqual(parsed.plan.id, '__proto__');

  const timeline = Engine.buildTimeline(parsed.plan);
  assert.strictEqual(timeline.totalMinutes, 13);
  assert.strictEqual({}.polluted, undefined);

  const custom = Engine.createCustomSession({ id: '__proto__', name: 'constructor' });
  assert.strictEqual(custom.ok, true);
  assert.strictEqual(custom.plan.id, '__proto__');
  assert.strictEqual({}.polluted, undefined);
  assert.strictEqual(Engine.deriveSessionId('constructor'), Engine.deriveSessionId('constructor'));
  assert.ok(Engine.deriveSessionId('constructor').startsWith('int_'));
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
});

test('engine runs with time, randomness, storage and network access blocked', () => {
  const beforeLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const originalNow = Date.now;
  const originalRandom = Math.random;
  const restores = [];

  Date.now = function blockedNow() {
    throw new Error('Date.now must not be used by the sport interval engine');
  };
  Math.random = function blockedRandom() {
    throw new Error('Math.random must not be used by the sport interval engine');
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
    const session = Engine.createSessionFromTemplate('int_rowing_pyramid', {}).plan;
    const custom = Engine.createCustomSession({ name: 'Blocked World', activity: 'run' });
    captured = {
      templateCount: Engine.listTemplates().length,
      id: session.id,
      summary: Engine.summarizeSession(session),
      timeline: Engine.buildTimeline(session),
      roundTrip: Engine.parse(Engine.serialize(session)),
      custom: custom,
      migrated: Engine.migrate({
        schemaVersion: 0,
        title: 'Blocked Legacy',
        rounds: 4,
        workMinutes: 2,
        restMinutes: 1
      })
    };
  } finally {
    while (restores.length) restores.pop()();
  }

  assert.strictEqual(captured.templateCount >= 5, true);
  assert.ok(captured.id.startsWith('int_'));
  assert.strictEqual(typeof captured.summary.totalHours, 'number');
  assert.strictEqual(captured.timeline.totalMinutes > 0, true);
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
