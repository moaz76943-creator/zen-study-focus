'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ADAPTER_PATH = path.join(
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
  'room6',
  'sport_interval_adapter.js'
);
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

const Adapter = require(ADAPTER_PATH);
const Engine = require(ENGINE_PATH);

const makeFakeDocument = () => {
  const forbidden = () => {
    throw new Error('innerHTML must never be used by the sport interval adapter');
  };
  const createElement = (tag) => {
    const node = {
      tagName: String(tag).toLowerCase(),
      children: [],
      attributes: {},
      textContent: '',
      setAttribute(name, value) {
        this.attributes[String(name)] = String(value);
      },
      appendChild(child) {
        this.children.push(child);
        return child;
      }
    };
    Object.defineProperty(node, 'innerHTML', { get: forbidden, set: forbidden });
    return node;
  };
  return { createElement };
};

const flattenPlan = (node, visit = [], stack = []) => {
  assert.ok(node && typeof node === 'object' && !Array.isArray(node), 'plan nodes are plain objects');
  const expectedKeys = ['attrs', 'children', 'tag', 'text'].filter((key) => key in node).sort();
  assert.deepEqual(Object.keys(node).sort(), expectedKeys);
  assert.equal(typeof node.tag, 'string');
  assert.ok(/^[a-z][a-z0-9-]*$/.test(node.tag), `native tag expected, got ${node.tag}`);
  if ('text' in node) assert.equal(typeof node.text, 'string');
  for (const [name, value] of Object.entries(node.attrs || {})) {
    assert.equal(typeof value, 'string', `attribute ${name} must be a string`);
    assert.ok(!/^(href|src|srcset|style)$/i.test(name), `attribute ${name} is forbidden in the render plan`);
    assert.ok(!/https?:/i.test(String(value)), `attribute ${name} must not embed a URL`);
  }
  visit.push({ node, path: `${stack.join('/')}/${node.tag}` });
  for (const child of node.children || []) flattenPlan(child, visit, stack.concat(node.tag));
  return visit;
};

const blockGlobal = (name) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get() {
      throw new Error(name + ' must not be touched by the sport interval adapter');
    },
    set() {
      throw new Error(name + ' must not be touched by the sport interval adapter');
    }
  });
  return () => {
    if (original) Object.defineProperty(globalThis, name, original);
    else delete globalThis[name];
  };
};

test('F04 adapter binds the real merged B02 sport interval builder engine', () => {
  assert.equal(Adapter.schemaVersion, Engine.SCHEMA_VERSION);
  assert.equal(Adapter.schemaVersion, 1);
  assert.equal(Adapter.engine, Engine, 'adapter must operate on the actual engine module, not a mock');
  assert.deepEqual(Adapter.PLAN_INTENT_TYPES, {
    FROM_TEMPLATE: 'sport-plan/from-template',
    UPDATE: 'sport-plan/update',
    TOGGLE_FINAL_REST: 'sport-plan/toggle-final-rest'
  });
  for (const key of ['timelinePreview', 'applyIntent', 'listQuickTemplates', 'safeRenderPlan', 'mountTimelinePreview']) {
    assert.equal(typeof Adapter[key], 'function', key);
  }
  assert.throws(() => Adapter.createSportIntervalAdapter(null), /engine/i);
});

test('timeline preview steps come verbatim from the engine, fully frozen', () => {
  const session = Engine.createSessionFromTemplate('int_hiit_8round', {}).plan;
  const before = JSON.stringify(session);
  const expected = Engine.buildTimeline(session);

  const res = Adapter.timelinePreview(session);
  assert.equal(res.ok, true);
  const vm = res.viewmodel;
  assert.equal(Object.isFrozen(vm), true);
  assert.equal(Object.isFrozen(vm.timeline), true);
  assert.equal(Object.isFrozen(vm.timeline.steps), true);
  assert.equal(Object.isFrozen(vm.timeline.steps[0]), true);
  assert.equal(vm.sessionId, session.id);
  assert.equal(vm.name, session.name);
  assert.equal(vm.templateId, 'int_hiit_8round');
  assert.deepEqual(vm.summary, Engine.summarizeSession(session));
  const timeline = vm.timeline;
  assert.equal(timeline.totalSteps, expected.totalSteps);
  assert.equal(timeline.totalMinutes, 25);
  assert.equal(timeline.totalSteps, 17);
  assert.equal(timeline.warmupMinutes, 5);
  assert.equal(timeline.workMinutes, 8);
  assert.equal(timeline.restMinutes, 7);
  assert.equal(timeline.cooldownMinutes, 5);
  assert.equal(timeline.steps.length, expected.steps.length);
  assert.deepEqual(
    timeline.steps.map((step) => [step.phase, step.round, step.label, step.minutes]),
    expected.steps.map((step) => [step.phase, step.round, step.label, step.minutes])
  );
  assert.deepEqual(timeline.steps[0], {
    index: 0,
    phase: 'warmup',
    round: null,
    label: 'Warmup 1',
    minutes: 5,
    startMinute: 0,
    endMinute: 5,
    intensity: 'easy'
  });
  assert.deepEqual(timeline.steps[1], {
    index: 1,
    phase: 'work',
    round: 1,
    label: 'Work 1',
    minutes: 1,
    startMinute: 5,
    endMinute: 6,
    intensity: 'hard'
  });
  assert.equal(timeline.steps[16].label, 'Cooldown 1');
  assert.equal(timeline.steps[16].startMinute, 20);
  for (let i = 0; i < timeline.steps.length; i++) {
    assert.equal(timeline.steps[i].index, i);
    assert.equal(timeline.steps[i].startMinute, i === 0 ? 0 : timeline.steps[i - 1].endMinute);
  }
  assert.equal(JSON.stringify(session), before, 'the preview must never mutate the session');
});

test('timeline preview normalizes messy quick-input specs through the engine', () => {
  const messy = {
    name: '  Sprint Day   ',
    warmup: [{ minutes: '8', intensity: 'MODERATE' }],
    workRounds: '4',
    workMinutes: 2,
    restMinutes: 1,
    cooldown: [{ minutes: 3 }]
  };
  const before = JSON.stringify(messy);
  const res = Adapter.timelinePreview(messy);
  assert.equal(res.ok, true);
  const vm = res.viewmodel;
  assert.equal(vm.name, 'Sprint Day');
  assert.equal(vm.templateId, null);
  const expectedPlan = Engine.normalizeSession(messy);
  assert.equal(JSON.stringify(messy), before, 'quick input specs must not be mutated');
  assert.deepEqual(
    vm.summary,
    Engine.summarizeSession(expectedPlan),
    'summary must come from the real engine normalization'
  );
  assert.deepEqual(
    vm.timeline.steps.map((step) => step.startMinute),
    Engine.buildTimeline(expectedPlan).steps.map((step) => step.startMinute)
  );
  assert.equal(Engine.validateSession(expectedPlan).ok, true);
});

test('invalid payloads surface real engine errors without fabrication', () => {
  assert.deepEqual(Adapter.timelinePreview(null), {
    ok: false,
    errors: [{ code: 'SESSION_NOT_OBJECT', field: 'session' }]
  });
  const emptyName = Adapter.timelinePreview({ name: '   ', warmup: [{ minutes: 5 }] });
  assert.equal(emptyName.ok, false);
  assert.ok(
    emptyName.errors.some((error) => error.code === 'NAME_REQUIRED'),
    JSON.stringify(emptyName.errors)
  );
  const badWarmup = Adapter.timelinePreview({ name: 'Valid', warmup: [] });
  assert.equal(badWarmup.ok, false);
  const codes = badWarmup.errors.map((error) => error.code);
  assert.ok(codes.includes('WARMUP_EMPTY'), JSON.stringify(badWarmup.errors));
  assert.equal(Adapter.timelinePreview('session').ok, false);
  assert.equal(typeof emptyName.errors[0].field, 'string');
  assert.equal(typeof emptyName.errors[0].message, 'string');
});

test('quick templates are honest detached summaries that build valid sessions', () => {
  const first = Adapter.listQuickTemplates();
  assert.ok(Array.isArray(first));
  assert.ok(first.length >= 5, 'expected at least five quick templates');
  assert.equal(Object.isFrozen(first[0]), true);
  const snapshot = JSON.stringify(first);
  assert.equal(JSON.stringify(Adapter.listQuickTemplates()), snapshot, 'quick templates must not leak');
  for (const quick of Adapter.listQuickTemplates()) {
    assert.equal(typeof quick.id, 'string');
    assert.equal(typeof quick.name, 'string');
    assert.equal(typeof quick.totalMinutes, 'number');
    assert.ok(quick.totalMinutes > 0, `${quick.id} must have a positive preview duration`);
    const built = Engine.createSessionFromTemplate(quick.id, {});
    assert.equal(built.ok, true);
    assert.equal(Engine.validateSession(built.plan).ok, true);
    assert.equal(Adapter.timelinePreview(built.plan).ok, true);
  }
});

test('from-template intents build quick plans through the engine only', () => {
  const res = Adapter.applyIntent(null, null);
  assert.equal(res.ok, false, 'malformed calls must fail safely');
  assert.deepEqual(res.errors, [{ code: 'UNKNOWN_INTENT', field: 'type' }]);

  const direct = Adapter.applyIntent(null, { type: 'sport-plan/from-template', templateId: 'int_strength_ladder' });
  assert.equal(direct.ok, true);
  assert.equal(direct.intentType, 'sport-plan/from-template');
  assert.equal(direct.plan.templateId, 'int_strength_ladder');
  assert.equal(direct.plan.workRounds, 5);
  assert.equal(direct.plan.workMinutes, 3);
  assert.equal(direct.changed, true, 'a first quick plan is always a change');

  const overrides = { workRounds: 3 };
  const tweaked = Adapter.applyIntent(direct.plan, {
    type: 'sport-plan/from-template',
    templateId: 'int_strength_ladder',
    overrides
  });
  assert.equal(tweaked.ok, true);
  assert.equal(tweaked.plan.workRounds, 3);
  assert.equal(JSON.stringify(overrides), '{"workRounds":3}', 'overrides must not be mutated');
  assert.equal(Engine.validateSession(tweaked.plan).ok, true);
  assert.equal(Adapter.timelinePreview(tweaked.plan).viewmodel.timeline.totalSteps > 0, true);

  const unknown = Adapter.applyIntent(null, { type: 'sport-plan/from-template', templateId: 'int_missing' });
  assert.equal(unknown.ok, false);
  assert.deepEqual(unknown.errors, Engine.createSessionFromTemplate('int_missing', {}).errors);
  assert.equal(unknown.errors[0].code, 'TEMPLATE_NOT_FOUND');
});

test('update and toggle-final-rest intents change plans with honest changed flags', () => {
  const base = Engine.createSessionFromTemplate('int_strength_ladder', {}).plan;
  const before = JSON.stringify(base);

  const updated = Adapter.applyIntent(base, {
    type: 'sport-plan/update',
    changes: { workRounds: 4, workMinutes: 2 }
  });
  assert.equal(updated.ok, true);
  assert.equal(updated.intentType, 'sport-plan/update');
  assert.equal(updated.plan.workRounds, 4);
  assert.equal(updated.plan.workMinutes, 2);
  assert.equal(updated.plan.name, base.name, 'unmentioned fields stay intact');
  assert.equal(JSON.stringify(base), before, 'the source session must never be mutated');
  assert.equal(Engine.validateSession(updated.plan).ok, true);
  assert.equal(Adapter.timelinePreview(updated.plan).viewmodel.summary.totalMinutes, 30);

  const noChange = Engine.createSessionFromTemplate('int_strength_ladder', {}).plan;
  const stalled = Adapter.applyIntent(noChange, { type: 'sport-plan/update', changes: {} });
  assert.equal(stalled.ok, true);
  assert.equal(stalled.changed, false, 'empty quick updates must be honest');

  const hiit = Engine.createSessionFromTemplate('int_hiit_8round', {}).plan;
  assert.equal(hiit.includeFinalRest, false);
  assert.equal(Engine.buildTimeline(hiit).steps.filter((s) => s.phase === 'rest' && s.round === 8).length, 0);

  const toggled = Adapter.applyIntent(hiit, { type: 'sport-plan/toggle-final-rest' });
  assert.equal(toggled.ok, true);
  assert.equal(toggled.intentType, 'sport-plan/toggle-final-rest');
  assert.equal(toggled.plan.includeFinalRest, true);
  assert.equal(toggled.changed, true);
  assert.equal(Engine.buildTimeline(toggled.plan).steps.filter((s) => s.phase === 'rest' && s.round === 8).length === 1, true);
  assert.equal(Adapter.timelinePreview(toggled.plan).viewmodel.timeline.restIntervals, 8);
  assert.equal(Engine.validateSession(toggled.plan).ok, true);

  const untoggled = Adapter.applyIntent(toggled.plan, { type: 'sport-plan/toggle-final-rest' });
  assert.equal(untoggled.ok, true);
  assert.equal(untoggled.plan.includeFinalRest, false);
  assert.equal(untoggled.changed, true);

  const brokenSource = { name: 'x', warmup: [] };
  const rejected = Adapter.applyIntent(brokenSource, { type: 'sport-plan/update', changes: { workRounds: 2 } });
  assert.equal(rejected.ok, false);
  assert.ok(rejected.errors.some((error) => error.code === 'WARMUP_EMPTY'));
  const rejectedToggle = Adapter.applyIntent(brokenSource, { type: 'sport-plan/toggle-final-rest' });
  assert.equal(rejectedToggle.ok, false);
});

test('unknown or malformed intents are rejected without touching the session', () => {
  const session = Engine.createSessionFromTemplate('int_cycling_sprints', {}).plan;
  const before = JSON.stringify(session);
  const hijack = Adapter.applyIntent(session, { type: 'sport-plan/start-native-timer' });
  assert.equal(hijack.ok, false);
  assert.deepEqual(hijack.errors, [{ code: 'UNKNOWN_INTENT', field: 'type' }]);
  assert.equal(hijack.intentType, 'sport-plan/start-native-timer');
  assert.equal(Adapter.applyIntent(session, null).ok, false);
  assert.equal(Adapter.applyIntent(session, {}).ok, false);
  assert.equal(Adapter.applyIntent(session, { type: 42 }).ok, false);
  assert.equal(JSON.stringify(session), before, 'rejected intents must leave the session untouched');
});

test('render plan is a declarative innerHTML-free DOM contract', () => {
  const session = Engine.createSessionFromTemplate('int_hiit_8round', {}).plan;
  const vm = Adapter.timelinePreview(
    Engine.updateSession(session, { name: '  Track <b>Special</b> & Co  ' }).plan
  ).viewmodel;
  const plan = Adapter.safeRenderPlan(vm);
  const nodes = flattenPlan(plan);
  const text = (at) => nodes[at].node.text;
  const plain = (value) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  assert.equal(plan.tag, 'section');
  assert.equal(plan.attrs['aria-label'], 'Track <b>Special</b> & Co');
  assert.equal(text(1), 'Track <b>Special</b> & Co');
  assert.ok(/25 min total - 8 work rounds - cooldown 5 min/.test(text(2)), text(2));

  const listNode = nodes.find((entry) => entry.node.tag === 'ol');
  assert.equal(listNode.node.attrs.class, 'sport-interval-timeline');
  assert.equal(listNode.node.children.length, 17);
  const firstItem = listNode.node.children[0];
  assert.equal(firstItem.tag, 'li');
  assert.equal(firstItem.attrs['data-step-index'], '0');
  assert.equal(firstItem.attrs['data-phase'], 'warmup');
  assert.equal(firstItem.children.map((child) => child.text).join('|'), 'Warmup 1|0-5 min');
  assert.equal(firstItem.children.find((child) => child.attrs.class === 'sport-interval-step-label').text, 'Warmup 1');
  assert.equal(firstItem.children.find((child) => child.attrs.class === 'sport-interval-step-time').text, '0-5 min');

  const phaseClasses = new Set(listNode.node.children.map((li) => li.attrs['data-phase']));
  for (const phase of Engine.PHASES) assert.ok(phaseClasses.has(phase), 'missing phase ' + phase);
  const setAttributeNames = new Set(nodes.flatMap((entry) => Object.keys(entry.node.attrs || {})));
  assert.equal(setAttributeNames.has('style'), false);
  assert.equal(JSON.stringify(plan).includes('http'), false);
});

test('mounting uses only safe DOM primitives (textContent, no untrusted markup)', () => {
  const vm = Adapter.timelinePreview(Engine.createSessionFromTemplate('int_strength_ladder', {}).plan).viewmodel;
  const doc = makeFakeDocument();
  const plan = Adapter.safeRenderPlan(vm);
  const expectedFirstTime = '0-5 min';

  const root = Adapter.mountTimelinePreview(doc.createElement('div'), plan, doc);
  assert.equal(root.tagName, 'section');
  assert.equal(root.attributes['aria-label'], 'Strength Ladder');
  assert.equal(root.children[0].tagName, 'p');
  assert.equal(root.children[0].textContent, 'Strength Ladder');
  assert.equal(root.children[1].textContent.includes('39 min total'), true, root.children[1].textContent);
  assert.equal(root.children[2].children.length, 12);
  const firstStep = root.children[2].children[0];
  assert.equal(firstStep.attributes['data-phase'], 'warmup');
  assert.equal(firstStep.children[0].tagName, 'span');
  assert.equal(firstStep.children[0].textContent, 'Warmup 1');
  assert.equal(firstStep.children[1].textContent, '0-5 min');

  const target = doc.createElement('div');
  const attached = Adapter.mountTimelinePreview(target, plan, doc);
  assert.equal(target.children.length, 1);
  assert.equal(attached.tagName, 'section');
  assert.equal(attached.children.length, root.children.length);

  assert.throws(
    () => Adapter.mountTimelinePreview(doc.createElement('div'), plan, null),
    /document/i,
    'a missing document factory must fail loudly'
  );
});

test('adapter never starts timers, alters live sessions or awards minutes', () => {
  const session = Engine.createSessionFromTemplate('int_rowing_pyramid', {}).plan;
  const before = JSON.stringify(session);
  let created = null;
  const restorations = [];
  const originalNow = Date.now;
  const originalRandom = Math.random;
  const blockedNow = function blockedNow() {
    throw new Error('Date.now must not be read by the sport interval adapter');
  };
  const blockedRandom = function blockedRandom() {
    throw new Error('Math.random must not be used by the sport interval adapter');
  };
  Date.now = blockedNow;
  Math.random = blockedRandom;
  restorations.push(() => {
    Date.now = originalNow;
    Math.random = originalRandom;
  });
  for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'localStorage', 'sessionStorage', 'indexedDB']) {
    restorations.push(blockGlobal(name));
  }
  try {
    created = {
      preview: Adapter.timelinePreview(session),
      quick: Adapter.applyIntent(session, { type: 'sport-plan/update', changes: { name: 'Blocked Quick Plan' } })
    };
  } finally {
    while (restorations.length) restorations.pop()();
  }
  assert.equal(created.preview.ok, true);
  assert.equal(created.quick.ok, true, 'quick plan editing must work fully offline');
  assert.equal(Engine.validateSession(created.quick.plan).ok, true);
  assert.equal(JSON.stringify(session), before, 'the session must never be mutated');
  assert.equal(Date.now, originalNow, 'clock must be restored');
  assert.equal(Math.random, originalRandom, 'random source must be restored');
  for (const key of ['running', 'isRunning', 'remainingSeconds', 'elapsedMinutes', 'awardedMinutes', 'timerHandle']) {
    const hit = JSON.stringify({ ...created.preview.viewmodel, ...created.quick.plan }).includes(key);
    assert.equal(hit, false, 'the adapter surface must not expose live timer state: ' + key);
  }
});

test('adapter source stays offline, persistence-free, timer-free and innerHTML-free', () => {
  const source = fs.readFileSync(ADAPTER_PATH, 'utf8');
  assert.equal(/innerHTML/.test(source), false);
  assert.equal(/localStorage|sessionStorage|indexedDB/.test(source), false);
  assert.equal(/\bfetch\s*\(|XMLHttpRequest|WebSocket|importScripts/.test(source), false);
  assert.equal(/setTimeout|setInterval|requestAnimationFrame/.test(source), false, 'quick preview input must not start native timers');
  assert.equal(/Date\.now|Math\.random/.test(source), false);
  assert.equal(/https?:\/\//.test(source), false);
  const requireArgs = [...source.matchAll(/require\(\s*([^)]+?)\s*\)/g)].map((match) => match[1]);
  assert.ok(requireArgs.length >= 1, 'adapter must load the engine module via require');
  const targets = new Set();
  for (const arg of requireArgs) {
    const literal = arg.match(/^['"]([^'"]+)['"]$/);
    if (literal) {
      targets.add(literal[1]);
      continue;
    }
    const declared = source.match(new RegExp(`(?:const|let|var)\\s+${arg.trim()}\\s*=\\s*['"]([^'"]+)['"]`));
    assert.ok(declared, `require target ${arg} must resolve to a local module path`);
    targets.add(declared[1]);
  }
  assert.deepEqual([...targets], ['../room5/sport_interval_builder_engine.js']);
  for (const target of targets) {
    assert.equal(
      fs.existsSync(path.resolve(path.dirname(ADAPTER_PATH), target)),
      true,
      'engine module must exist beside the adapter'
    );
  }
});
