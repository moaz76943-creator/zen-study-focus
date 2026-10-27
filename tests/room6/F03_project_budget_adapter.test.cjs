'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
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
  'project_budget_adapter.js'
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
  'project_time_budget_engine.js'
);

const Adapter = require(ADAPTER_PATH);
const Engine = require(ENGINE_PATH);

const PROJECT_NAME = 'Thesis Chapter 4';
const TWEAKED_SESSION_LABEL = 'मसौदा पुनरावृत्ति';

const makeBudget = () => {
  let budget = Engine.createBudget({
    name: ` ${PROJECT_NAME} `,
    budgetMinutes: 300
  }).budget;
  for (const session of [
    { label: ' Pilot run ', minutes: 45, category: 'focus' },
    { label: TWEAKED_SESSION_LABEL, minutes: 25, category: 'focus' },
    { label: 'Index cleanup', minutes: 10, category: 'admin' }
  ]) {
    budget = Engine.addSession(budget, session).budget;
  }
  return budget;
};

test('adapter loads the real B04 engine and exposes its API', () => {
  assert.strictEqual(Adapter.engine, Engine, 'adapter must use the actual merged project_time_budget_engine, not a copy');
  assert.strictEqual(Adapter.schemaVersion, Engine.SCHEMA_VERSION);
  for (const key of [
    'formatMinutes',
    'createProjectBudgetViewModel',
    'computeSessionTotals',
    'createAddSessionIntent',
    'createRemoveSessionIntent',
    'applySessionIntent',
    'safeRenderPlan',
    'mountBudgetView',
    'createProjectBudgetAdapter'
  ]) {
    assert.strictEqual(typeof Adapter[key], 'function', `adapter API is missing ${key}`);
  }
  assert.throws(() => Adapter.createProjectBudgetAdapter(null), /ProjectTimeBudgetEngine engine is required/);
});

test('formatMinutes renders human-readable hours and minutes, including deficits', () => {
  assert.strictEqual(Adapter.formatMinutes(0), '0 m');
  assert.strictEqual(Adapter.formatMinutes(45), '45 m');
  assert.strictEqual(Adapter.formatMinutes(60), '1 h');
  assert.strictEqual(Adapter.formatMinutes(355), '5 h 55 m');
  assert.strictEqual(Adapter.formatMinutes(-70), '-1 h 10 m');
  assert.strictEqual(Adapter.formatMinutes('nope'), '');
});

test('createProjectBudgetViewModel describes real supplied sessions honestly', () => {
  const viewmodel = Adapter.createProjectBudgetViewModel(makeBudget()).viewmodel;
  assert.strictEqual(viewmodel.name, PROJECT_NAME);
  assert.strictEqual(viewmodel.budgetMinutes, 300);
  assert.strictEqual(viewmodel.budgetSource, 'supplied');
  assert.strictEqual(viewmodel.budgetLabel, '5 h');
  const spent = 45 + 25 + 10;
  assert.strictEqual(viewmodel.summary.spentMinutes, spent);
  assert.strictEqual(viewmodel.spentDurationLabel, Adapter.formatMinutes(spent));
  assert.strictEqual(viewmodel.spentLabel, `${Adapter.formatMinutes(spent)} spent`);
  assert.strictEqual(viewmodel.remainingLabel, Adapter.formatMinutes(300 - spent));
  assert.strictEqual(viewmodel.averageSessionLabel, Adapter.formatMinutes(Math.round(spent / 3 * 100) / 100));
  assert.strictEqual(viewmodel.categoryLabels.focus, '1 h 10 m');
  assert.strictEqual(viewmodel.categoryLabels.admin, '10 m');
  assert.strictEqual(viewmodel.categoryLabels.review, '0 m');
  assert.strictEqual(viewmodel.summary.overBudget, false);
  assert.strictEqual(viewmodel.sessions.length, 3);
  assert.ok(viewmodel.sessions.some((session) => session.label === TWEAKED_SESSION_LABEL));
  assert.ok(viewmodel.sessions.every((session) => session.durationLabel === Adapter.formatMinutes(session.minutes)));
  assert.match(viewmodel.headline, new RegExp(`^${PROJECT_NAME} · [0-9.]+% of budget used$`));
});

test('adapter never presents the engine default budget as a user goal', () => {
  const result = Adapter.createProjectBudgetViewModel({ name: 'Untitled Project', sessions: [{ label: 'Warm-up', minutes: 20 }] });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.viewmodel.budgetSource, 'engine-default');
  assert.strictEqual(result.viewmodel.budgetMinutes, Engine.PROJECT_DEFAULTS.budgetMinutes);
  assert.strictEqual(result.viewmodel.budgetLabel, '10 h');

  const fuzzy = Adapter.createProjectBudgetViewModel({ name: 'Fuzzy', budgetMinutes: '20-ish' });
  assert.strictEqual(fuzzy.ok, true);
  assert.strictEqual(fuzzy.viewmodel.budgetSource, 'engine-default', 'a non-integer budgetMinutes must not masquerade as a supplied goal');
});

test('totals count exactly the supplied sessions, including over-budget', () => {
  const sessions = Array.from({ length: 37 }, (_, i) => ({ label: `Session ${i + 1}`, minutes: 7 }));
  const raw = Engine.createBudget({ name: 'Long Haul', budgetMinutes: 120, sessions }).budget;
  const totals = Adapter.computeSessionTotals(raw);
  assert.strictEqual(totals.ok, true);
  assert.strictEqual(totals.totals.sessionCount, 37);
  assert.strictEqual(totals.totals.spentMinutes, 37 * 7);
  assert.strictEqual(totals.totals.spentLabel, '4 h 19 m');
  assert.strictEqual(totals.totals.categoryMinutes.focus, 259);
  assert.strictEqual(totals.totals.longestSessionMinutes, 7);
  assert.strictEqual(totals.totals.shortestSessionMinutes, 7);

  const over = Adapter.computeSessionTotals({
    name: 'Deluge',
    budgetMinutes: 60,
    sessions: [
      { label: 'Morning', minutes: 40, category: 'focus' },
      { label: 'Evening', minutes: 55, category: 'review' }
    ]
  });
  assert.strictEqual(over.ok, true);
  assert.strictEqual(over.totals.spentMinutes, 95);
  const overView = Adapter.createProjectBudgetViewModel(over ? {
    name: 'Deluge',
    budgetMinutes: 60,
    sessions: [
      { label: 'Morning', minutes: 40, category: 'focus' },
      { label: 'Evening', minutes: 55, category: 'review' }
    ]
  } : {}).viewmodel;
  assert.strictEqual(overView.summary.overBudget, true);
  assert.strictEqual(overView.summary.overByMinutes, 35);
  assert.strictEqual(overView.remainingLabel, '-35 m');
  assert.strictEqual(overView.spentLabel.indexOf('over by 35 m') !== -1, true);
});

test('adapter refuses to hide unusable supplied session entries', () => {
  const bad = Adapter.computeSessionTotals({
    name: 'Dirty Data',
    budgetMinutes: 120,
    sessions: [
      { label: 'Real work', minutes: 30 },
      { label: '   ' },
      'nonsense'
    ]
  });
  assert.strictEqual(bad.ok, false);
  assert.ok(bad.errors.some((error) => error.code === 'SESSION_INVALID_ENTRY'), 'junk entries must be surfaced, never silenced');
});

test('adapter detects silent clamping and honest recounts beyond engine clamps', () => {
  const base = makeBudget();
  const overClamped = JSON.parse(JSON.stringify(base));
  overClamped.sessions[0].minutes = 90000;
  const result = Adapter.computeSessionTotals(overClamped);
  assert.strictEqual(result.ok, false, 'supplied 90000 minutes must not be silently clamped into totals');
  assert.ok(result.errors.some((error) => error.code === 'SESSION_MINUTES_ADJUSTED'));

  const injected = JSON.parse(JSON.stringify(base));
  injected.sessions[0].minutes = 20;
  const injectedView = Adapter.computeSessionTotals(injected);
  assert.strictEqual(injectedView.ok, true, 'an in-range supplied value is honored exactly as given');
  assert.strictEqual(injectedView.totals.spentMinutes, 55, 'totals must recount from the actual supplied minutes');

  const stubEngine = Object.assign({}, Engine, {
    summarizeBudget: (budget) => ({ ...Engine.summarizeBudget(budget), spentMinutes: Engine.summarizeBudget(budget).spentMinutes + 7 })
  });
  const guarded = Adapter.createProjectBudgetAdapter(stubEngine);
  const guardedResult = guarded.computeSessionTotals(base);
  assert.strictEqual(guardedResult.ok, false, 'engine totals drifting from the recount must be flagged');
  assert.ok(guardedResult.errors.some((error) => error.code === 'TOTALS_MISMATCH'));
});

test('session intents mutate accuracy-preserving budgets and surface engine errors', () => {
  const adapter = Adapter.createProjectBudgetAdapter();
  const base = makeBudget();
  const add = adapter.applySessionIntent(base, adapter.createAddSessionIntent('  Sync call ', 15, 'meeting'));
  assert.strictEqual(add.ok, true);
  assert.strictEqual(add.changed, true);
  assert.strictEqual(add.budget.sessions.length, 4);
  assert.strictEqual(add.budget.sessions[3].label, 'Sync call');
  assert.strictEqual(add.budget.sessions[3].minutes, 15);
  assert.strictEqual(add.budget.sessions[3].category, 'meeting');

  const addedTotals = Adapter.computeSessionTotals(add.budget);
  assert.strictEqual(addedTotals.totals.spentMinutes, 80 + 15);

  const remove = adapter.applySessionIntent(add.budget, adapter.createRemoveSessionIntent(add.budget.sessions[3].id));
  assert.strictEqual(remove.ok, true);
  assert.strictEqual(remove.budget.sessions.length, 3);

  assert.strictEqual(
    adapter.applySessionIntent(base, { type: 'project-budget/explode' }).errors[0].code,
    'UNKNOWN_INTENT'
  );
  assert.strictEqual(
    adapter.applySessionIntent(base, adapter.createRemoveSessionIntent('pbs_missing')).errors[0].code,
    'SESSION_NOT_FOUND'
  );
  const duplicate = Engine.addSession(base, { label: 'Pilot run', id: base.sessions[0].id }).errors[0].code;
  assert.strictEqual(duplicate, 'SESSION_DUPLICATE_ID');
});

test('safe render plan uses text-only nodes and mounting never touches innerHTML', () => {
  const viewmodel = Adapter.createProjectBudgetViewModel(makeBudget()).viewmodel;
  const plan = Adapter.safeRenderPlan(viewmodel);
  assert.strictEqual(plan.tag, 'section');
  assert.strictEqual(plan.attrs.class, 'project-budget');
  const texts = [];
  const inspection = (node) => {
    assert.strictEqual(typeof node.tag, 'string');
    assert.strictEqual(Array.isArray(node.children), true);
    if (Object.keys(node.attrs || {}).some((key) => key.toLowerCase() === 'innerhtml')) {
      throw new Error('innerHTML attribute leaked into the render plan');
    }
    if (typeof node.text === 'string') texts.push(node.text);
    for (const child of node.children) inspection(child);
  };
  inspection(plan);
  assert.ok(texts.some((line) => line.indexOf('3 m') !== -1 || line.indexOf('spent') !== -1));
  assert.ok(texts.some((line) => line === viewmodel.name));
  assert.ok(texts.some((line) => line.indexOf(TWEAKED_SESSION_LABEL) !== -1));

  const forbidden = () => {
    throw new Error('innerHTML must never be used by the project budget adapter');
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
  const mounted = Adapter.mountBudgetView(null, plan, { createElement });
  assert.strictEqual(mounted.tagName, 'section');
  assert.strictEqual(mounted.attributes['aria-label'], viewmodel.name);
  assert.strictEqual(mounted.children.length, 5);
  const sessionList = mounted.children[4];
  assert.strictEqual(sessionList.tagName, 'ol');
  assert.strictEqual(sessionList.children.length, viewmodel.sessions.length);
  assert.strictEqual(mounted.children[4].children[1].children[0].textContent, TWEAKED_SESSION_LABEL);
  assert.strictEqual(mounted.children[3].textContent.indexOf('Remaining:') === 0, true);
  assert.throws(() => Adapter.mountBudgetView(null, plan, null), /DOM document factory/);
});
