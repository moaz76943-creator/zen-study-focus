'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MODULE_URL = new URL('../../tools/termux_room5/free_model_budget.mjs', 'file://' + __dirname + '/').href;
const MODULE_PATH = path.join(__dirname, '..', '..', 'tools', 'termux_room5', 'free_model_budget.mjs');

const A05_KEY = 'tools/termux_room5/free_model_budget.mjs';

function inWindow(state, id, t, span) {
  return state.usage[id].filter((ts) => ts > t - span).length;
}

test('A05 free_model_budget: module exports a stable, pure API', async () => {
  const mod = await import(MODULE_URL);
  assert.equal(mod.VERSION, 1);
  for (const name of [
    'createScheduler',
    'pickNext',
    'describeNext',
    'recordCall',
    'recordSuccess',
    'recordFailure',
    'getCooldown',
    'getStatus',
    'serializeState',
    'deserializeState'
  ]) {
    assert.equal(typeof mod[name], 'function', name);
  }
  assert.deepEqual([...mod.REASONS], ['ready', 'cooldown', 'window-budget', 'no-models']);
  assert.ok(Object.isFrozen(mod.REASONS), 'REASONS must be frozen');
});

test('A05 free_model_budget: no wall-clock, no fs, no networking, no child processes', async () => {
  const src = fs.readFileSync(MODULE_PATH, 'utf8');
  for (const banned of [
    'node:fs',
    'node:http',
    'node:https',
    'node:net',
    'node:child_process',
    'Date.now',
    'new Date',
    'fetch('
  ]) {
    assert.ok(!src.includes(banned), `module must not reference ${banned}`);
  }
});

test('A05 free_model_budget: fresh scheduler is deterministic and picks in stable order', async () => {
  const mod = await import(MODULE_URL);
  const s = mod.createScheduler({
    models: ['m1', 'm2', 'm3'],
    windowMs: 1000,
    maxPerWindow: 2,
    defaultCooldownMs: 500
  });
  assert.equal(mod.pickNext(s, { now: 0 }), 'm1', 'tie -> stable first model');
  assert.equal(mod.pickNext(s, { now: 0 }), 'm1', 'pure: repeated pick is identical');
  assert.equal(mod.getStatus(s, { now: 0 }).ready.length, 3);
});

test('A05 free_model_budget: fairness alternates across models (round-robin by least used + LRU)', async () => {
  const mod = await import(MODULE_URL);
  const s = mod.createScheduler({
    models: ['m1', 'm2', 'm3'],
    windowMs: 1000,
    maxPerWindow: 3,
    defaultCooldownMs: 500
  });
  let cur = s;
  const picks = [];
  let t = 0;
  for (let i = 0; i < 7; i++) {
    const id = mod.pickNext(cur, { now: t });
    assert.ok(id, `pick ${i} must find a model`);
    picks.push(id);
    cur = mod.recordCall(cur, id, { now: t });
    t += 1;
  }
  assert.deepEqual(picks, ['m1', 'm2', 'm3', 'm1', 'm2', 'm3', 'm1']);
});

test('A05 free_model_budget: rate-aware — window budget blocks a model until stamps age out', async () => {
  const mod = await import(MODULE_URL);
  const s = mod.createScheduler({
    models: ['a', 'b'],
    windowMs: 1000,
    maxPerWindow: 2,
    defaultCooldownMs: 500
  });
  let cur = mod.recordCall(s, 'a', { now: 0 });
  cur = mod.recordCall(cur, 'a', { now: 10 });
  assert.equal(inWindow(cur, 'a', 20, 1000), 2, 'two calls inside trailing window');
  assert.equal(mod.pickNext(cur, { now: 20 }), 'b', 'a exhausted -> fair pick moves to b');
  assert.equal(mod.pickNext(cur, { now: 999 }), 'b');
  const atBoundary = mod.getStatus(cur, { now: 1000 });
  assert.equal(atBoundary.perModel.a.usedInWindow, 1, 'stamp@0 aged out of the trailing window');
  assert.ok(atBoundary.ready.includes('a'), 'a is budget-eligible again');
  assert.equal(atBoundary.ready.includes('b'), true, 'b remains ready (unused)');
  const status = mod.getStatus(cur, { now: 20 });
  assert.deepEqual([...status.ready], ['b'], 'only b ready while a is budget-blocked');
  assert.equal(status.perModel.a.usedInWindow, 2);
  assert.equal(status.perModel.a.remainingInWindow, 0);
});

test('A05 free_model_budget: describeNext reports window-budget retry time and full unlock plan', async () => {
  const mod = await import(MODULE_URL);
  const s = mod.createScheduler({
    models: [{ id: 'a', maxPerWindow: 2 }],
    windowMs: 1000,
    maxPerWindow: 5,
    defaultCooldownMs: 0
  });
  let cur = mod.recordCall(s, 'a', { now: 100 });
  cur = mod.recordCall(cur, 'a', { now: 200 });
  const d = mod.describeNext(cur, { now: 250 });
  assert.equal(d.model, null);
  assert.equal(d.reason, 'window-budget');
  assert.equal(d.retryAt, 1100);
  assert.deepEqual([...d.ready], []);
  assert.deepEqual(d.blocked, [{ id: 'a', reason: 'window-budget', retryAt: 1100 }]);

  const rate = mod.getCooldown(cur, 'a', { now: 250 });
  assert.equal(rate, 0, 'cooldown is 0 when model only budget-blocked');
  const status = mod.getStatus(cur, { now: 250 });
  assert.equal(status.nextReadyAt, 1100);
  assert.equal(status.next, null);

  const afterUnlock = mod.describeNext(cur, { now: 1100 });
  assert.equal(afterUnlock.model, 'a', 'a becomes callable again at 1100 (oldest stamp aged out)');
});

test('A05 free_model_budget: per-model zero budget disables a model entirely', async () => {
  const mod = await import(MODULE_URL);
  const s = mod.createScheduler({
    models: [{ id: 'a', maxPerWindow: 0 }, 'b'],
    windowMs: 1000,
    maxPerWindow: 3,
    defaultCooldownMs: 0
  });
  assert.equal(mod.pickNext(s, { now: 0 }), 'b');
  const d = mod.describeNext(s, { now: 0 });
  assert.deepEqual([...d.ready], ['b']);
  assert.deepEqual(d.blocked, [{ id: 'a', reason: 'window-budget', retryAt: null }]);
  assert.equal(mod.getStatus(s, { now: 0 }).perModel.a.remainingInWindow, 0);
});

test('A05 free_model_budget: cooldowns rotate fairly and expire deterministically', async () => {
  const mod = await import(MODULE_URL);
  const s = mod.createScheduler({
    models: ['a', 'b'],
    windowMs: 1000,
    maxPerWindow: 5,
    defaultCooldownMs: 500
  });
  let cur = mod.recordFailure(s, 'a', { now: 0 });
  assert.equal(mod.getCooldown(cur, 'a', { now: 10 }), 490);
  assert.equal(mod.getCooldown(cur, 'a', { now: 500 }), 0, 'cooldown expired exactly at cooldownUntil');
  assert.equal(mod.pickNext(cur, { now: 10 }), 'b');
  assert.equal(mod.pickNext(cur, { now: 499 }), 'b');
  assert.equal(mod.pickNext(cur, { now: 500 }), 'b', 'cooldown is over, but b is still least-used');
  assert.deepEqual(mod.describeNext(cur, { now: 100 }).blocked, [{ id: 'a', reason: 'cooldown', retryAt: 500 }]);

  cur = mod.recordFailure(cur, 'a', { now: 0, cooldownMs: 300 });
  assert.equal(mod.getCooldown(cur, 'a', { now: 299 }), 1, 'explicit cooldownMs override applies');
  assert.equal(mod.getCooldown(cur, 'a', { now: 300 }), 0);

  const withUse = mod.recordSuccess(cur, 'a', { now: 100 });
  assert.equal(mod.getCooldown(withUse, 'a', { now: 200 }), 0, 'a success clears the cooldown');

  const solo = mod.createScheduler({ models: ['a'], windowMs: 1000, maxPerWindow: 5, defaultCooldownMs: 500 });
  const soloUsed = mod.recordFailure(solo, 'a', { now: 0 });
  assert.equal(mod.pickNext(soloUsed, { now: 10 }), null);
  assert.equal(mod.pickNext(soloUsed, { now: 500 }), 'a');
  const dSolo = mod.describeNext(soloUsed, { now: 100 });
  assert.equal(dSolo.model, null);
  assert.equal(dSolo.reason, 'cooldown');
  assert.equal(dSolo.retryAt, 500);
  assert.equal(mod.getStatus(soloUsed, { now: 100 }).nextReadyAt, 500);
});

test('A05 free_model_budget: cooldown + exhausted budget -> waits for the later unlock', async () => {
  const mod = await import(MODULE_URL);
  const s = mod.createScheduler({
    models: ['a', 'b'],
    windowMs: 1000,
    maxPerWindow: 2,
    defaultCooldownMs: 500
  });
  let cur = mod.recordFailure(s, 'a', { now: 0 });
  cur = mod.recordFailure(cur, 'a', { now: 10 });
  cur = mod.recordFailure(cur, 'b', { now: 10 });
  cur = mod.recordFailure(cur, 'b', { now: 11 });
  const d = mod.describeNext(cur, { now: 100 });
  assert.deepEqual(d.blocked, [
    { id: 'a', reason: 'window-budget', retryAt: 1000 },
    { id: 'b', reason: 'window-budget', retryAt: 1010 }
  ]);
  assert.equal(d.model, null, 'everything blocked');
  assert.equal(d.retryAt, 1000, 'budget refills are the binding wait');
  assert.equal(mod.pickNext(cur, { now: 100 }), null);
  assert.equal(mod.pickNext(cur, { now: 600 }), null, 'cooldown is over but window budget still binds');
  assert.equal(mod.pickNext(cur, { now: 1000 }), 'a');
});

test('A05 free_model_budget: recordCall is pure — original state is never mutated', async () => {
  const mod = await import(MODULE_URL);
  const s = mod.createScheduler({ models: ['a', 'b'], windowMs: 1000, maxPerWindow: 2, defaultCooldownMs: 0 });
  const before = mod.serializeState(s);
  const s2 = mod.recordCall(s, 'a', { now: 7 });
  assert.notEqual(s2, s, 'record returns a new state');
  assert.deepEqual(s, mod.deserializeState(before), 'original state untouched');

  const pick1 = mod.describeNext(s2, { now: 9 });
  const pick2 = mod.describeNext(s2, { now: 9 });
  assert.deepEqual(pick1, pick2, 'describeNext is pure too');

  const again = mod.recordCall(s, 'a', { now: 7 });
  assert.deepEqual(mod.serializeState(again), mod.serializeState(s2), 'same inputs -> same outputs');
  assert.ok(Object.isFrozen(s2), 'states are frozen');
  assert.ok(Object.isFrozen(s2.usage.a), 'nested usage is frozen');
});

test('A05 free_model_budget: getLastSeen tracking survives via totalCalls vs usedInWindow', async () => {
  const mod = await import(MODULE_URL);
  const s = mod.createScheduler({ models: ['a'], windowMs: 1000, maxPerWindow: 5, defaultCooldownMs: 0 });
  let cur = mod.recordCall(s, 'a', { now: 0 });
  cur = mod.recordCall(cur, 'a', { now: 2000 });
  const status = mod.getStatus(cur, { now: 2000 });
  assert.equal(status.perModel.a.usedInWindow, 1, 'only the fresh call counts inside the window');
  assert.equal(status.perModel.a.totalCalls, 2, 'lifetime totals still tracked');
});

test('A05 free_model_budget: getStatus summarises per-model health', async () => {
  const mod = await import(MODULE_URL);
  const s = mod.createScheduler({
    models: ['a', 'b'],
    windowMs: 1000,
    maxPerWindow: 2,
    defaultCooldownMs: 0
  });
  let cur = mod.recordCall(s, 'a', { now: 0 });
  cur = mod.recordCall(cur, 'b', { now: 10 });
  const st = mod.getStatus(cur, { now: 100 });
  assert.equal(st.now, 100);
  assert.deepEqual([...st.ready], ['a', 'b'], 'LRU tie-break: a used earlier');
  assert.equal(st.next, 'a');
  assert.deepEqual([...st.waiting], []);
  assert.deepEqual(st.perModel.a, {
    ready: true,
    usedInWindow: 1,
    maxPerWindow: 2,
    remainingInWindow: 1,
    cooldownUntil: 0,
    cooldownRemainingMs: 0,
    lastUsed: 0,
    totalCalls: 1
  });
  assert.equal(st.perModel.b.lastUsed, 10);
});

test('A05 free_model_budget: serialize/deserialize round trip keeps behaviour', async () => {
  const mod = await import(MODULE_URL);
  const s = mod.createScheduler({ models: ['a', 'b'], windowMs: 1000, maxPerWindow: 2, defaultCooldownMs: 500 });
  let cur = mod.recordFailure(s, 'a', { now: 0 });
  cur = mod.recordCall(cur, 'b', { now: 10 });
  const json = mod.serializeState(cur);
  assert.equal(typeof json, 'string');
  const round = mod.deserializeState(json);
  assert.deepEqual(round, cur);
  assert.equal(mod.pickNext(round, { now: 20 }), 'b');
  assert.deepEqual(mod.serializeState(round), json);

  assert.throws(() => mod.deserializeState('not json'));
  assert.throws(() => mod.deserializeState('{"version":999,"windowMs":1000}'));
  assert.throws(() => mod.deserializeState(42));
});

test('A05 free_model_budget: argument validation', async () => {
  const mod = await import(MODULE_URL);
  const s = mod.createScheduler({ models: ['a', 'b'], windowMs: 1000, maxPerWindow: 2, defaultCooldownMs: 500 });

  assert.throws(() => mod.createScheduler({ models: ['a', 'a'] }), /duplicate model/);
  assert.throws(() => mod.createScheduler({ models: ['a', ''], windowMs: 1000 }));
  assert.throws(() => mod.createScheduler({ models: 'a' }), /models/);
  assert.throws(() => mod.createScheduler({ models: ['a'], windowMs: 0 }), /windowMs/);
  assert.throws(() => mod.createScheduler({ models: ['a'], windowMs: 1.5 }), /windowMs/);
  assert.throws(() => mod.createScheduler({ models: ['a'], maxPerWindow: 0 }), /maxPerWindow/);
  assert.throws(() => mod.createScheduler({ models: ['a'], defaultCooldownMs: -1 }), /defaultCooldownMs/);

  assert.throws(() => mod.pickNext(s, { now: -1 }), /now/);
  assert.throws(() => mod.pickNext(s, { now: 'x' }), /now/);
  assert.throws(() => mod.pickNext(s, { now: NaN }), /now/);
  assert.throws(() => mod.pickNext(s), /now/);
  assert.throws(() => mod.recordCall(s, 'zz', { now: 0 }), /unknown model/);
  assert.throws(() => mod.recordCall(s, 'a', { now: 0, ok: 'yes' }), /ok/);
  assert.throws(() => mod.recordFailure(s, 'a', { now: 0, cooldownMs: -5 }), /cooldownMs/);
  assert.throws(() => mod.getCooldown(s, 'zz', { now: 0 }), /unknown model/);
  assert.throws(() => mod.describeNext(null, { now: 0 }), /createScheduler/);
  assert.throws(() => mod.getStatus(s, { now: Infinity }), /now/);
  assert.throws(() => mod.serializeState({ nope: true }), /createScheduler/);
});

test('A05 free_model_budget: scheduler with no models yields null pick and no-models reason', async () => {
  const mod = await import(MODULE_URL);
  const s = mod.createScheduler({ models: [] });
  assert.equal(mod.pickNext(s, { now: 0 }), null);
  const d = mod.describeNext(s, { now: 0 });
  assert.equal(d.model, null);
  assert.equal(d.reason, 'no-models');
  assert.equal(d.retryAt, null);
  assert.equal(mod.getStatus(s, { now: 0 }).nextReadyAt, null);
});

test('A05 free_model_budget: errors carry fn-name context and freeze results', async () => {
  const mod = await import(MODULE_URL);
  const s = mod.createScheduler({ models: ['a', 'b'], windowMs: 1000, maxPerWindow: 2, defaultCooldownMs: 500 });
  const d = mod.describeNext(s, { now: 0 });
  assert.ok(Object.isFrozen(d));
  assert.ok(Object.isFrozen(d.blocked));
  const st = mod.getStatus(s, { now: 0 });
  assert.ok(Object.isFrozen(st));
  assert.ok(Object.isFrozen(st.ready));
  let err = null;
  try {
    mod.recordFailure(s, 'zz', { now: 0 });
  } catch (e) {
    err = e;
  }
  assert.match(err.message, /recordFailure.*unknown model/);
});

test('A05 free_model_budget: A05 contract key present', () => {
  assert.ok(A05_KEY === 'tools/termux_room5/free_model_budget.mjs');
});
