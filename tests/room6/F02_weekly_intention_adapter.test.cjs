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
  'weekly_intention_adapter.js'
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
  'focus_weekly_intentions_engine.js'
);

const Adapter = require(ADAPTER_PATH);
const Week = require(ENGINE_PATH);

const ARABIC_TITLE = 'مراجعة القواعد';

const makePlan = (overrides = []) => Week.createWeeklyPlan({
  weekStart: '2026-10-26',
  intentions: [
    { title: 'Review German', day: 'mon', priority: 'high', estimatedMinutes: 30 },
    { title: ` ${ARABIC_TITLE} `, day: 'tue', estimatedMinutes: 45 },
    { title: 'Read chapter 4', day: 'wed', priority: 'low', estimatedMinutes: 15 },
    { title: 'Gym session', day: 'fri', estimatedMinutes: 20 },
    ...overrides
  ]
}).plan;

const makeFakeDocument = () => {
  const forbidden = () => {
    throw new Error('innerHTML must never be used by the weekly intention adapter');
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

const collectKeys = (value, keys = []) => {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectKeys(entry, keys));
  } else if (value && typeof value === 'object') {
    for (const [name, inner] of Object.entries(value)) {
      keys.push(name);
      collectKeys(inner, keys);
    }
  }
  return keys;
};

const findClass = (nodes, className) => nodes.map((entry) => entry.node).find((node) => node.attrs && node.attrs.class === className);

test('F02 adapter binds the real merged B08 weekly intentions engine', () => {
  assert.equal(Adapter.schemaVersion, Week.SCHEMA_VERSION);
  assert.equal(Adapter.schemaVersion, 1);
  assert.equal(Adapter.engine, Week, 'adapter must operate on the actual engine module, not a mock');
  assert.deepEqual(Adapter.DAYS, ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  assert.deepEqual(Adapter.DAY_LABELS, {
    mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
    fri: 'Friday', sat: 'Saturday', sun: 'Sunday'
  });
  assert.deepEqual(Adapter.INTENT_TYPES, {
    TOGGLE: 'weekly-view/toggle-completed',
    MOVE: 'weekly-view/move-day',
    ADD: 'weekly-view/add-intention',
    REMOVE: 'weekly-view/remove-intention'
  });
  for (const factory of ['createToggleIntent', 'createMoveIntent', 'createAddIntentionIntent', 'createRemoveIntentionIntent']) {
    assert.equal(typeof Adapter[factory], 'function');
  }
  assert.throws(() => Adapter.createWeeklyViewAdapter(null), /engine/i);
  assert.throws(() => Adapter.createWeeklyViewAdapter({}), /engine/i);
});

test('viewmodel groups user-facing days in engine order from raw user specs', () => {
  const plan = makePlan();
  const snapshot = JSON.stringify(plan);
  const vm = Adapter.createWeeklyViewModel(plan);
  assert.equal(vm.ok, true);
  assert.equal(Object.isFrozen(vm.viewmodel), true);
  assert.equal(vm.viewmodel.planId, plan.id);
  assert.equal(vm.viewmodel.weekStart, '2026-10-26');
  assert.deepEqual(vm.viewmodel.days.map((day) => day.day), ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  const tue = vm.viewmodel.days[1];
  assert.equal(tue.items.length, 1);
  assert.equal(tue.items[0].title, ARABIC_TITLE, 'titles are normalized by the engine');
  assert.equal(tue.items[0].estimatedMinutes, 45);
  assert.equal(tue.plannedMinutes, 45);
  assert.equal(tue.completedMinutes, 0);
  const empty = vm.viewmodel.days[3];
  assert.equal(empty.day, 'thu');
  assert.deepEqual(empty.items, []);
  assert.equal(empty.plannedMinutes, 0);
  const monday = vm.viewmodel.days[0];
  assert.equal(monday.items[0].priority, 'high');
  assert.equal(monday.items[0].completed, false);
  assert.equal(JSON.stringify(plan), snapshot, 'the source plan must never be mutated');
});

test('viewmodel normalizes raw specs through the engine and reuses real engine ids', () => {
  const vm = Adapter.createWeeklyViewModel({
    weekStart: '2026-10-26',
    intentions: [{ title: ' Review German ', id: 'wi_custom1', day: 'mon', estimatedMinutes: 30 }]
  });
  assert.equal(vm.ok, true);
  assert.equal(vm.viewmodel.intentions[0].title, 'Review German');
  assert.equal(vm.viewmodel.intentions[0].id, 'wi_custom1');
  const generated = Adapter.createWeeklyViewModel({
    weekStart: '2026-10-26',
    intentions: [{ title: 'Read', day: 'fri', estimatedMinutes: 20 }]
  });
  const expected = Week.createWeeklyPlan({
    weekStart: '2026-10-26',
    intentions: [{ title: 'Read', day: 'fri', estimatedMinutes: 20 }]
  }).plan;
  assert.equal(generated.viewmodel.planId, expected.id, 'plan ids must come from the real engine');
  assert.equal(generated.viewmodel.intentions[0].id, expected.intentions[0].id);
  assert.equal(Week.validateWeeklyPlan(Week.createWeeklyPlan({
    weekStart: generated.viewmodel.weekStart,
    intentions: generated.viewmodel.intentions.map((item) => ({ ...item }))
  }).plan).ok, true);
});

test('summaries are honest planned minutes with no timer session credits', () => {
  const vm = Adapter.createWeeklyViewModel({
    weekStart: '2026-10-26',
    intentions: [
      { title: 'Review German', day: 'mon', estimatedMinutes: 30, trackedMinutes: 999, focusSeconds: 7200 },
      { title: 'Read', day: 'fri', estimatedMinutes: 20 }
    ],
    creditedTimerMinutes: 3210,
    timerSessions: [{ startedAt: '2026-10-26T10:00:00Z', durationSeconds: 5400 }]
  });
  assert.equal(vm.ok, true);
  assert.deepEqual(vm.viewmodel.summary, Week.summarizeWeeklyPlan(Week.createWeeklyPlan({
    weekStart: '2026-10-26',
    intentions: [
      { title: 'Review German', day: 'mon', estimatedMinutes: 30 },
      { title: 'Read', day: 'fri', estimatedMinutes: 20 }
    ]
  }).plan));
  assert.equal(vm.viewmodel.summary.plannedMinutes, 50);
  assert.equal(vm.viewmodel.summary.doneMinutes, 0);
  assert.equal(vm.viewmodel.summary.total, 2);
  assert.equal(vm.viewmodel.summary.completed, 0);
  const keys = collectKeys(vm.viewmodel);
  assert.equal(keys.some((key) => /session|timer|credit|tracked|focusSeconds/i.test(key)), false,
    'no timer credit concept may leak into user-facing viewmodels');
  assert.equal('creditedTimerMinutes' in vm.viewmodel.summary, false);
});

test('toggle completion intents use engine semantics with honest changed flags', () => {
  const plan = makePlan();
  const before = JSON.stringify(plan);
  const id = plan.intentions[0].id;
  const done = Adapter.applyIntent(plan, Adapter.createToggleIntent(id, true));
  assert.equal(done.ok, true);
  assert.equal(done.intentType, 'weekly-view/toggle-completed');
  assert.equal(done.changed, true);
  assert.equal(done.plan.intentions[0].completed, true);
  const twin = Week.setCompleted(plan, id, true);
  assert.deepEqual(done.plan, twin.plan, 'toggles must be delegated to the real engine');

  const redundant = Adapter.applyIntent(done.plan, Adapter.createToggleIntent(id, true));
  assert.equal(redundant.ok, true);
  assert.equal(redundant.changed, false, 'no-op toggles must report changed:false');

  const restored = Adapter.applyIntent(done.plan, Adapter.createToggleIntent(id, false));
  assert.equal(restored.plan.intentions[0].completed, false);
  assert.equal(restored.changed, true);
  assert.equal(JSON.stringify(plan), before, 'the source plan must never be mutated');

  const afterToggle = Adapter.createWeeklyViewModel(restored.plan);
  assert.equal(afterToggle.viewmodel.summary.completed, 0);
  assert.equal(afterToggle.viewmodel.summary.plannedMinutes, 110, 'planned minutes never change on toggles');
  assert.equal(afterToggle.viewmodel.summary.doneMinutes, 0);

  const completedThree = plan;
  let current = completedThree;
  for (const item of completedThree.intentions.slice(0, 3)) {
    current = Adapter.applyIntent(current, Adapter.createToggleIntent(item.id, true)).plan;
  }
  assert.deepEqual(Adapter.createWeeklyViewModel(current).viewmodel.summary, {
    total: 4, completed: 3, plannedMinutes: 110, doneMinutes: 90
  });
});

test('toggle errors surface real engine codes verbatim', () => {
  const plan = makePlan();
  const missing = Adapter.applyIntent(plan, Adapter.createToggleIntent('wi_00000000', true));
  assert.equal(missing.ok, false);
  assert.deepEqual(missing.errors, Week.setCompleted(plan, 'wi_00000000', true).errors);
  assert.equal(missing.errors[0].code, 'INTENTION_NOT_FOUND');
  const invalid = Adapter.applyIntent(plan, Adapter.createToggleIntent(plan.intentions[0].id, 'yes'));
  assert.equal(invalid.ok, false);
  assert.equal(invalid.errors[0].code, 'INVALID_COMPLETED');
  const badPlan = Adapter.applyIntent({ weekStart: '2026-10-27' }, Adapter.createToggleIntent('wi_x', true));
  assert.equal(badPlan.ok, false);
  assert.equal(badPlan.errors[0].code, 'INVALID_PLAN');
});

test('move-day intents regroup days through the engine only', () => {
  const plan = makePlan();
  const id = plan.intentions[3].id;
  const moved = Adapter.applyIntent(plan, Adapter.createMoveIntent(id, 'sun'));
  assert.equal(moved.ok, true);
  assert.equal(moved.intentType, 'weekly-view/move-day');
  assert.equal(moved.changed, true);
  assert.equal(moved.plan.intentions.find((item) => item.id === id).day, 'sun');
  const vm = Adapter.createWeeklyViewModel(moved.plan);
  const sunday = vm.viewmodel.days[6];
  assert.equal(sunday.items.length, 1);
  assert.equal(sunday.items[0].id, id);
  assert.equal(sunday.plannedMinutes, 20);
  assert.equal(vm.viewmodel.days[4].items.length, 0, 'friday group is now empty');

  const same = Adapter.applyIntent(moved.plan, Adapter.createMoveIntent(id, 'sun'));
  assert.equal(same.changed, false, 'moving to the current day is a no-op');

  const badDay = Adapter.applyIntent(moved.plan, Adapter.createMoveIntent(id, 'sunday'));
  assert.equal(badDay.ok, false);
  assert.deepEqual(badDay.errors, Week.moveIntention(moved.plan, id, 'sunday').errors);
  assert.equal(badDay.errors[0].code, 'INVALID_DAY');
  const unknown = Adapter.applyIntent(plan, Adapter.createMoveIntent('wi_ffffff', 'mon'));
  assert.equal(unknown.errors[0].code, 'INTENTION_NOT_FOUND');
});

test('add and remove intents delegate to the engine including the 30-intention limit', () => {
  const plan = makePlan();
  const added = Adapter.applyIntent(plan, Adapter.createAddIntentionIntent({ title: ' Stretch ', day: 'sat', estimatedMinutes: 10 }));
  assert.equal(added.ok, true);
  assert.equal(added.intentType, 'weekly-view/add-intention');
  assert.equal(added.changed, true);
  const appended = added.plan.intentions[added.plan.intentions.length - 1];
  assert.equal(appended.title, 'Stretch');
  const twin = Week.addIntention(plan, { title: 'Stretch', day: 'sat', estimatedMinutes: 10 }).plan.intentions[4];
  assert.equal(appended.id, twin.id, 'generated ids must be engine-made');
  let grown = added.plan;
  for (let index = 0; index < 25; index++) {
    const filler = Adapter.applyIntent(grown, Adapter.createAddIntentionIntent({
      title: `Filler ${index}`, day: 'thu'
    }));
    assert.equal(filler.ok, true);
    grown = filler.plan;
  }
  assert.equal(grown.intentions.length, 30);
  const overLimit = Adapter.applyIntent(grown, Adapter.createAddIntentionIntent({ title: 'One more', day: 'thu' }));
  assert.equal(overLimit.ok, false);
  assert.equal(overLimit.errors[0].code, 'INTENTION_LIMIT');
  const overLimitPlusTimer = Adapter.applyIntent(grown, Adapter.createAddIntentionIntent({
    title: 'One more', day: 'thu', trackedMinutes: 500
  }));
  assert.equal(overLimitPlusTimer.ok, false);
  const removed = Adapter.applyIntent(added.plan, Adapter.createRemoveIntentionIntent(appended.id));
  assert.equal(removed.ok, true);
  assert.equal(removed.intentType, 'weekly-view/remove-intention');
  assert.equal(removed.changed, true);
  assert.equal(removed.plan.intentions.length, 4);
  assert.equal(removed.plan.intentions.some((item) => item.id === appended.id), false);
  const gone = Adapter.applyIntent(removed.plan, Adapter.createRemoveIntentionIntent(appended.id));
  assert.equal(gone.ok, false);
  assert.equal(gone.errors[0].code, 'INTENTION_NOT_FOUND');
  const invalidInput = Adapter.applyIntent(removed.plan, Adapter.createAddIntentionIntent(' Stretch, quick '));
  assert.equal(invalidInput.ok, false);
  assert.equal(invalidInput.errors[0].code, 'INVALID_INTENTION');
});

test('unknown or malformed intents are rejected without touching the plan', () => {
  const plan = makePlan();
  const before = JSON.stringify(plan);
  const hijack = Adapter.applyIntent(plan, { type: 'weekly-view/credit-timer-session' });
  assert.equal(hijack.ok, false);
  assert.deepEqual(hijack.errors, [{ code: 'UNKNOWN_INTENT', field: 'type' }]);
  assert.equal(Adapter.applyIntent(plan, null).ok, false);
  assert.equal(Adapter.applyIntent(plan, {}).ok, false);
  assert.equal(Adapter.applyIntent(plan, { type: 42 }).ok, false);
  assert.equal(JSON.stringify(plan), before);
});

test('raw invalid plans and non-canonical storage surface engine errors verbatim', () => {
  const notMonday = Adapter.createWeeklyViewModel({ weekStart: '2026-10-27', intentions: [] });
  assert.equal(notMonday.ok, false);
  assert.deepEqual(notMonday.errors, Week.createWeeklyPlan({ weekStart: '2026-10-27', intentions: [] }).errors);
  assert.equal(notMonday.errors[0].code, 'INVALID_SPEC');
  const nonCanonical = Adapter.createWeeklyViewModel({
    schemaVersion: 1,
    weekStart: '2026-10-26',
    intentions: [],
    strayField: true
  });
  assert.equal(nonCanonical.ok, false);
  assert.deepEqual(nonCanonical.errors, Week.validateWeeklyPlan({
    schemaVersion: 1,
    weekStart: '2026-10-26',
    intentions: [],
    strayField: true
  }).errors);
  assert.equal(nonCanonical.errors[0].code, 'NON_CANONICAL_PLAN');
});

test('render plan is a declarative innerHTML-free DOM contract with day grouping', () => {
  const plan = makePlan();
  const toggled = Adapter.applyIntent(plan, Adapter.createToggleIntent(plan.intentions[0].id, true)).plan;
  const vm = Adapter.createWeeklyViewModel(toggled).viewmodel;
  const planNode = Adapter.safeRenderPlan(vm);
  const nodes = flattenPlan(planNode);
  assert.equal(planNode.tag, 'section');
  assert.equal(planNode.attrs['aria-label'], 'Weekly intentions for week of 2026-10-26');
  assert.equal('dir' in planNode.attrs, false, 'direction must stay inherited unless explicitly requested');
  const rtl = Adapter.safeRenderPlan(vm, { dir: 'rtl' });
  assert.equal(rtl.attrs.dir, 'rtl');
  assert.equal(findClass(nodes, 'weekly-intention-week').text, 'Week of 2026-10-26');
  assert.equal(
    findClass(nodes, 'weekly-intention-summary').text,
    '1 of 4 intentions done - 110 min planned (30 min done)'
  );
  const progressBar = findClass(nodes, 'weekly-intention-progress-bar');
  assert.deepEqual(progressBar.attrs, {
    class: 'weekly-intention-progress-bar', value: '1', max: '4'
  });
  const dayGroups = nodes.map((entry) => entry.node).filter((node) => node.attrs && node.attrs.class === 'weekly-intention-day');
  assert.deepEqual(dayGroups.map((group) => group.attrs['data-day']), ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  assert.equal(findClass(nodes, 'weekly-intention-day-name').text, 'Monday');
  const mondayGroup = dayGroups[0];
  const mondayMinutes = mondayGroup.children.find((child) => child.attrs.class === 'weekly-intention-day-total');
  assert.equal(mondayMinutes.text, '30 min planned');
  const fridayGroup = dayGroups[4];
  assert.equal(fridayGroup.children.find((child) => child.tag === 'ul').children.length, 1);
  assert.equal(fridayGroup.children.find((child) => child.tag === 'ul').children[0]
    .children.find((child) => child.tag === 'button').attrs['aria-pressed'], 'false');
  const thursdayGroup = dayGroups[3];
  assert.equal(thursdayGroup.children.find((child) => child.tag === 'ul').children.length, 0);
  const firstItem = mondayGroup.children.find((child) => child.tag === 'ul').children[0];
  assert.equal(firstItem.attrs['data-intention-id'], plan.intentions[0].id);
  const toggleButton = firstItem.children.find((child) => child.tag === 'button');
  assert.deepEqual(toggleButton.attrs, {
    class: 'weekly-intention-toggle',
    type: 'button',
    'data-intention-id': plan.intentions[0].id,
    'data-intent-type': 'weekly-view/toggle-completed',
    'aria-pressed': 'true'
  });
  assert.equal(toggleButton.text, 'Completed');
  const untoggledButton = dayGroups[1].children.find((child) => child.tag === 'ul').children[0].children.find((child) => child.tag === 'button');
  assert.equal(untoggledButton.attrs['aria-pressed'], 'false');
  assert.equal(untoggledButton.text, 'Mark complete');
  const setAttributeNames = new Set(nodes.flatMap((entry) => Object.keys(entry.node.attrs || {})));
  assert.equal(setAttributeNames.has('style'), false);
  assert.equal(JSON.stringify(planNode).includes('http'), false);
});

test('mounting uses only safe textContent primitives and preserves RTL inheritance', () => {
  const plan = makePlan();
  const vm = Adapter.safeRenderPlan(Adapter.createWeeklyViewModel(plan).viewmodel);
  const doc = makeFakeDocument();
  const root = Adapter.mountWeeklyPlan(doc.createElement('div'), vm, doc);
  assert.equal(root.tagName, 'section');
  assert.equal(root.attributes['aria-label'], 'Weekly intentions for week of 2026-10-26');
  assert.equal('dir' in root.attributes, false);
  const dayGroups = root.children.filter((child) => child.attributes.class === 'weekly-intention-day');
  assert.equal(dayGroups.length, 7);
  assert.equal(dayGroups[0].children[0].textContent, 'Monday');
  assert.equal(dayGroups[3].children[0].textContent, 'Thursday');
  const tuesdayItem = dayGroups[1].children[2].children[0];
  assert.equal(tuesdayItem.tagName, 'li');
  assert.equal(tuesdayItem.children[0].textContent, ARABIC_TITLE, 'untrusted titles render through textContent only');
  assert.equal(tuesdayItem.children[0].attributes.dir, 'auto');
  assert.equal(dayGroups[5].children[2].children.length, 0, 'saturday starts empty');
  const button = dayGroups[0].children[2].children[0].children.find((child) => child.tagName === 'button');
  assert.equal(button.attributes['aria-pressed'], 'false');
  assert.equal(button.attributes['data-intent-type'], 'weekly-view/toggle-completed');
  assert.equal(button.textContent, 'Mark complete');
  const rtlRoot = Adapter.mountWeeklyPlan(doc.createElement('div'), safeRtlPlan(doc, plan), doc);
  assert.equal(rtlRoot.attributes.dir, 'rtl');
  assert.throws(() => Adapter.mountWeeklyPlan(doc.createElement('div'), vm, null), /document/i);
});

function safeRtlPlan(doc, plan) {
  return Adapter.safeRenderPlan(Adapter.createWeeklyViewModel(plan).viewmodel, { dir: 'rtl' });
}

test('adapter source stays offline, persistence-free and innerHTML-free', () => {
  const source = fs.readFileSync(ADAPTER_PATH, 'utf8');
  assert.equal(/innerHTML/.test(source), false);
  assert.equal(/localStorage|sessionStorage|indexedDB/.test(source), false);
  assert.equal(/\bfetch\s*\(|XMLHttpRequest|WebSocket|importScripts/.test(source), false);
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
  assert.deepEqual([...targets], ['../room5/focus_weekly_intentions_engine.js']);
  for (const target of targets) {
    assert.equal(fs.existsSync(path.join(path.dirname(ADAPTER_PATH), target)), true, 'engine module must exist');
  }
});
