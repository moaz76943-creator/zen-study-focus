/**
 * DEEP FOCUS — Room5 Free Model Budget (task A05)
 * Rate-aware fair scheduler for free model cooldowns.
 *
 * Free/preview models throttle aggressively: bursts trip per-window budgets
 * and every failure opens a cooldown during which the model must not be
 * called. When several free models are interchangeable, this module chooses
 * the fairest callable model — fewest calls still counting inside its
 * trailing window, tie-broken by least-recently-used, then by declared
 * order — and reports exactly when blocked models become callable again.
 *
 * Pure & standalone: every clock read is caller-supplied (`now`), all state
 * is immutable and deep-frozen, all transitions return new state. Zero
 * networking, zero dependencies, zero persistence: nothing is written to
 * disk and wall-time is never consulted, so identical inputs always yield
 * identical outputs.
 *
 * Fairness model (rate-aware):
 *   1. skip models inside a failure cooldown (state.cooldownUntil[id] > now)
 *   2. skip models whose trailing-window usage reached their budget
 *      (a call at time ts leaves the window when ts + windowMs <= now;
 *      failures count as usage too — the upstream quota is consumed anyway)
 *   3. among eligible models pick fewest in-window calls, then least
 *      recently used, then declared order (stable, deterministic)
 *
 * Public API (stable):
 *   VERSION                     -> 1
 *   REASONS                     -> frozen ['ready','cooldown','window-budget','no-models']
 *   createScheduler(options)                       -> state
 *   pickNext(state, { now })                       -> modelId | null
 *   describeNext(state, { now })                   -> { model, reason, retryAt, ready, blocked }
 *   recordCall(state, modelId, { now, ok, cooldownMs })  -> state
 *   recordSuccess(state, modelId, { now })         -> state
 *   recordFailure(state, modelId, { now, cooldownMs })   -> state
 *   getCooldown(state, modelId, { now })           -> remaining ms (>= 0)
 *   getStatus(state, { now })                      -> summary + per-model health
 *   serializeState(state)                          -> JSON string
 *   deserializeState(json)                         -> state
 */

export const VERSION = 1;

export const REASONS = Object.freeze(['ready', 'cooldown', 'window-budget', 'no-models']);

const REASON_READY = 'ready';
const REASON_COOLDOWN = 'cooldown';
const REASON_BUDGET = 'window-budget';
const REASON_NO_MODELS = 'no-models';

export const DEFAULT_WINDOW_MS = 60_000;
export const DEFAULT_MAX_PER_WINDOW = 60;
export const DEFAULT_COOLDOWN_MS = 60_000;

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function deepFreeze(value) {
  if (isPlainObject(value)) {
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    return Object.freeze(value);
  }
  if (Array.isArray(value)) {
    for (const item of value) deepFreeze(item);
    return Object.freeze(value);
  }
  return value;
}

function assertNow(now, fnName) {
  const t = Number(now);
  if (!Number.isFinite(t) || t < 0) {
    throw new TypeError(`${fnName}: now must be a finite, non-negative number (caller-supplied timestamp)`);
  }
  return t;
}

function assertWindowMs(value, message) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) {
    throw new TypeError(`${message} must be a safe integer >= 1`);
  }
  return n;
}

function assertBudget(value, message) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) {
    throw new TypeError(`${message} must be a safe integer >= 1`);
  }
  return n;
}

function assertPerModelBudget(value, fnName) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new TypeError(`${fnName}: models[].maxPerWindow must be a safe integer >= 0 (0 disables the model)`);
  }
  return n;
}

function assertCooldownMs(value, message) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new TypeError(`${message} must be a safe integer >= 0`);
  }
  return n;
}

function normalizeModels(models, schedulerMax, schedulerCooldown, fnName) {
  if (!Array.isArray(models)) {
    throw new TypeError(`${fnName}: models must be an array of model ids or { id, maxPerWindow, cooldownMs } objects`);
  }
  const order = [];
  const config = {};
  const seen = new Set();
  for (const entry of models) {
    let id;
    let maxPerWindow;
    let cooldownMs;
    if (typeof entry === 'string') {
      id = entry;
    } else if (isPlainObject(entry)) {
      id = entry.id;
      maxPerWindow = entry.maxPerWindow;
      cooldownMs = entry.cooldownMs;
    } else {
      throw new TypeError(`${fnName}: each model must be a non-empty string or an object with an id`);
    }
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new TypeError(`${fnName}: model id must be a non-empty string`);
    }
    if (seen.has(id)) {
      throw new TypeError(`${fnName}: duplicate model id "${id}"`);
    }
    seen.add(id);
    maxPerWindow = maxPerWindow === undefined
      ? schedulerMax
      : assertPerModelBudget(maxPerWindow, fnName);
    cooldownMs = cooldownMs === undefined
      ? schedulerCooldown
      : assertCooldownMs(cooldownMs, `${fnName}: models[].cooldownMs must be a safe integer >= 0`);
    order.push(id);
    config[id] = { maxPerWindow, cooldownMs };
  }
  return { order, config };
}

function buildState({ windowMs, maxPerWindow, defaultCooldownMs, order, config }) {
  const state = {
    version: VERSION,
    windowMs,
    maxPerWindow,
    defaultCooldownMs,
    order,
    config,
    usage: {},
    cooldownUntil: {},
    lastUsed: {},
    totalCalls: {}
  };
  for (const id of order) {
    state.usage[id] = [];
    state.cooldownUntil[id] = 0;
    state.lastUsed[id] = 0;
    state.totalCalls[id] = 0;
  }
  return deepFreeze(state);
}

export function createScheduler(options = {}) {
  const fnName = 'createScheduler';
  if (!isPlainObject(options)) {
    throw new TypeError(`${fnName}: options must be a plain object`);
  }
  const windowMs = options.windowMs === undefined
    ? DEFAULT_WINDOW_MS
    : assertWindowMs(options.windowMs, `${fnName}: windowMs`);
  const maxPerWindow = options.maxPerWindow === undefined
    ? DEFAULT_MAX_PER_WINDOW
    : assertBudget(options.maxPerWindow, `${fnName}: maxPerWindow`);
  const defaultCooldownMs = options.defaultCooldownMs === undefined
    ? DEFAULT_COOLDOWN_MS
    : assertCooldownMs(options.defaultCooldownMs, `${fnName}: defaultCooldownMs`);
  const { order, config } = normalizeModels(
    options.models === undefined ? [] : options.models,
    maxPerWindow,
    defaultCooldownMs,
    fnName
  );
  return buildState({ windowMs, maxPerWindow, defaultCooldownMs, order, config });
}

function assertState(state, fnName) {
  const ok =
    isPlainObject(state) &&
    state.version === VERSION &&
    Number.isSafeInteger(state.windowMs) &&
    state.windowMs >= 1 &&
    Number.isSafeInteger(state.maxPerWindow) &&
    state.maxPerWindow >= 1 &&
    Number.isSafeInteger(state.defaultCooldownMs) &&
    state.defaultCooldownMs >= 0 &&
    Array.isArray(state.order) &&
    isPlainObject(state.config) &&
    isPlainObject(state.usage) &&
    isPlainObject(state.cooldownUntil) &&
    isPlainObject(state.lastUsed) &&
    isPlainObject(state.totalCalls);
  if (!ok) {
    throw new TypeError(`${fnName}: argument must be a scheduler state created by createScheduler`);
  }
}

function assertKnownModel(state, modelId, fnName) {
  if (typeof modelId !== 'string' || !state.order.includes(modelId)) {
    throw new RangeError(`${fnName}: unknown model ${JSON.stringify(modelId)}`);
  }
  return modelId;
}

/**
 * Stamps still counting inside the trailing window at time t, sorted ascending.
 */
function usageInWindow(state, id, t) {
  const stamps = state.usage[id];
  if (!Array.isArray(stamps) || stamps.length === 0) return [];
  const start = t - state.windowMs;
  const kept = [];
  for (const ts of stamps) {
    if (ts > start) kept.push(ts);
  }
  kept.sort((a, b) => a - b);
  return kept;
}

/**
 * Per-model scheduling analysis. `retryAt` is the exact timestamp at which
 * the model becomes callable (null when ready, or when permanently disabled
 * by a zero budget with nothing scheduled).
 */
function analyzeModel(state, id, t, index) {
  const cfg = state.config[id];
  const max = cfg.maxPerWindow;
  const cooldownUntil = state.cooldownUntil[id] || 0;
  const cdWaiting = cooldownUntil > t;
  const recent = usageInWindow(state, id, t);
  const used = recent.length;
  const remaining = Math.max(0, max - used);
  const budgetWaiting = used >= max;

  const cdUnlockAt = cdWaiting ? cooldownUntil : 0;
  let budgetUnlockAt = 0;
  if (budgetWaiting) {
    // The (used - max + 1)-th oldest in-window stamp must age out to free one
    // slot (index used - max). A zero budget with no stamps never unlocks.
    if (max > 0 && used > 0) {
      budgetUnlockAt = recent[used - max] + state.windowMs;
    }
  }
  const unlockAt = Math.max(cdUnlockAt, budgetUnlockAt);
  const ready = !cdWaiting && !budgetWaiting;
  let reason = REASON_READY;
  if (!ready) {
    if (budgetUnlockAt >= cdUnlockAt) {
      reason = REASON_BUDGET;
    } else {
      reason = REASON_COOLDOWN;
    }
  }
  // A budget-blocked model with no unlock path (disabled or cooldown-less)
  // reports unlockAt 0 -> retryAt null.
  return {
    id,
    index,
    ready,
    unlockAt,
    reason,
    usedInWindow: used,
    remaining,
    maxPerWindow: max,
    cooldownUntil,
    cooldownRemainingMs: cdUnlockAt > 0 ? cdUnlockAt - t : 0,
    lastUsed: state.lastUsed[id] || 0,
    totalCalls: state.totalCalls[id] || 0
  };
}

function schedule(state, t) {
  const plans = [];
  let retryAt = null;
  for (let i = 0; i < state.order.length; i++) {
    const id = state.order[i];
    const a = analyzeModel(state, id, t, i);
    if (!a.ready && a.unlockAt > 0) {
      retryAt = retryAt === null ? a.unlockAt : Math.min(retryAt, a.unlockAt);
    }
    plans.push({
      id,
      used: a.usedInWindow,
      lastUsed: a.lastUsed,
      index: i,
      blocked: !a.ready,
      reason: a.reason,
      retryAt: a.unlockAt > 0 ? a.unlockAt : null
    });
  }
  const eligible = plans.filter((p) => !p.blocked);
  eligible.sort(
    (x, y) => x.used - y.used || x.lastUsed - y.lastUsed || x.index - y.index
  );
  return { plans, eligible, retryAt };
}

function buildDescribe({ plans, eligible, retryAt }) {
  const ready = eligible.map((p) => p.id);
  const blocked = [];
  for (const p of plans) {
    if (p.blocked) {
      blocked.push({ id: p.id, reason: p.reason, retryAt: p.retryAt });
    }
  }
  const model = ready.length > 0 ? ready[0] : null;
  let reason = REASON_NO_MODELS;
  let at = null;
  if (model !== null) {
    reason = REASON_READY;
  } else if (blocked.length > 0) {
    at = retryAt;
    const binding = blocked.find((e) => e.retryAt === at);
    if (binding) reason = binding.reason;
  }
  return { model, reason, retryAt: at, ready, blocked };
}

/**
 * Decide the next free model to call. `null` means "wait": nothing is both
 * out of cooldown and under budget at `now`.
 */
export function pickNext(state, { now } = {}) {
  assertState(state, 'pickNext');
  const t = assertNow(now, 'pickNext');
  const { eligible } = schedule(state, t);
  return eligible.length > 0 ? eligible[0].id : null;
}

/**
 * Full plan for the next call: chosen model (or null), why (ready / blocked
 * reason / no-models), when a blocked plan could proceed, and the detailed
 * ready/blocked breakdown.
 */
export function describeNext(state, { now } = {}) {
  assertState(state, 'describeNext');
  const t = assertNow(now, 'describeNext');
  return deepFreeze(buildDescribe(schedule(state, t)));
}

/**
 * Register that a call was made (success or failure, both consume budget).
 * Pure: returns a new state; the input state is never mutated.
 *   ok=true clears any prior cooldown (observed working again).
 *   ok=false opens a cooldown of cooldownMs (override > per-model config).
 */
function record(state, modelId, { now, ok = true, cooldownMs }, fnName) {
  const t = assertNow(now, fnName);
  assertState(state, fnName);
  assertKnownModel(state, modelId, fnName);
  if (ok !== undefined && typeof ok !== 'boolean') {
    throw new TypeError(`${fnName}: ok must be a boolean when provided`);
  }
  const cfg = state.config[modelId];
  let cooldownUntil;
  if (ok === false) {
    const cd = cooldownMs === undefined
      ? cfg.cooldownMs
      : assertCooldownMs(cooldownMs, `${fnName}: cooldownMs must be a safe integer >= 0`);
    cooldownUntil = t + cd;
  } else {
    cooldownUntil = 0;
  }
  const recent = usageInWindow(state, modelId, t);
  const usage = { ...state.usage };
  usage[modelId] = deepFreeze([...recent, t]);
  return deepFreeze({
    ...state,
    usage,
    cooldownUntil: { ...state.cooldownUntil, [modelId]: cooldownUntil },
    lastUsed: { ...state.lastUsed, [modelId]: t },
    totalCalls: { ...state.totalCalls, [modelId]: (state.totalCalls[modelId] || 0) + 1 }
  });
}

export function recordCall(state, modelId, { now, ok = true, cooldownMs } = {}) {
  return record(state, modelId, { now, ok, cooldownMs }, 'recordCall');
}

export function recordSuccess(state, modelId, { now } = {}) {
  return record(state, modelId, { now }, 'recordSuccess');
}

export function recordFailure(state, modelId, { now, cooldownMs } = {}) {
  return record(state, modelId, { now, ok: false, cooldownMs }, 'recordFailure');
}

/**
 * Milliseconds remaining on a model's cooldown (0 when callable).
 */
export function getCooldown(state, modelId, { now } = {}) {
  assertState(state, 'getCooldown');
  const t = assertNow(now, 'getCooldown');
  assertKnownModel(state, modelId, 'getCooldown');
  const until = state.cooldownUntil[modelId] || 0;
  return until > t ? until - t : 0;
}

/**
 * Point-in-time health report: who is ready now, who is waiting and for how
 * long, the next pick, and the earliest scheduled unlock (null while a pick
 * is available or nothing is scheduled).
 */
export function getStatus(state, { now } = {}) {
  assertState(state, 'getStatus');
  const t = assertNow(now, 'getStatus');
  const { plans, eligible } = schedule(state, t);
  const ready = eligible.map((p) => p.id);
  const next = ready.length > 0 ? ready[0] : null;
  let nextReadyAt = null;
  const waiting = [];
  const perModel = {};
  for (const id of state.order) {
    const a = analyzeModel(state, id, t, 0);
    perModel[id] = {
      ready: a.ready,
      usedInWindow: a.usedInWindow,
      maxPerWindow: a.maxPerWindow,
      remainingInWindow: a.remaining,
      cooldownUntil: a.cooldownUntil,
      cooldownRemainingMs: a.cooldownRemainingMs,
      lastUsed: a.lastUsed,
      totalCalls: a.totalCalls
    };
    if (!a.ready) {
      waiting.push({ id, reason: a.reason, retryAt: a.unlockAt > 0 ? a.unlockAt : null });
      if (a.unlockAt > 0 && (nextReadyAt === null || a.unlockAt < nextReadyAt)) {
        nextReadyAt = a.unlockAt;
      }
    }
  }
  const planById = new Map(plans.map((p) => [p.id, p]));
  // keep pick order for ready, declaration order for waiting
  return deepFreeze({
    now: t,
    windowMs: state.windowMs,
    ready,
    waiting,
    next,
    nextReadyAt: next === null ? nextReadyAt : null,
    perModel,
    plan: deepFreeze(planById.get(next) || null)
  });
}

/**
 * JSON snapshot of the whole scheduler state (pure — no disk writes).
 */
export function serializeState(state) {
  assertState(state, 'serializeState');
  return JSON.stringify(state);
}

/**
 * Rebuild a scheduler state from serializeState output. Validates the
 * payload and returns a fresh frozen state.
 */
export function deserializeState(json) {
  const fnName = 'deserializeState';
  if (typeof json !== 'string' || json.length === 0) {
    throw new TypeError(`${fnName}: json must be a non-empty string produced by serializeState`);
  }
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new TypeError(`${fnName}: invalid JSON: ${error.message}`);
  }
  if (!isPlainObject(parsed) || parsed.version !== VERSION) {
    throw new Error(`${fnName}: unsupported state version (expected ${VERSION})`);
  }
  const windowMs = assertWindowMs(parsed.windowMs, `${fnName}: windowMs`);
  const maxPerWindow = parsed.maxPerWindow === undefined
    ? DEFAULT_MAX_PER_WINDOW
    : assertBudget(parsed.maxPerWindow, `${fnName}: maxPerWindow`);
  const defaultCooldownMs = parsed.defaultCooldownMs === undefined
    ? DEFAULT_COOLDOWN_MS
    : assertCooldownMs(parsed.defaultCooldownMs, `${fnName}: defaultCooldownMs`);
  const overrideConfig = isPlainObject(parsed.config) ? parsed.config : {};
  const { order, config } = normalizeModels(
    Array.isArray(parsed.order) ? parsed.order : [],
    maxPerWindow,
    defaultCooldownMs,
    fnName
  );
  for (const id of order) {
    const override = overrideConfig[id];
    if (isPlainObject(override)) {
      config[id] = {
        maxPerWindow: override.maxPerWindow === undefined
          ? config[id].maxPerWindow
          : assertPerModelBudget(override.maxPerWindow, fnName),
        cooldownMs: override.cooldownMs === undefined
          ? config[id].cooldownMs
          : assertCooldownMs(override.cooldownMs, `${fnName}: models[].cooldownMs must be a safe integer >= 0`)
      };
    }
  }
  const usage = parsed.usage === undefined ? {} : parsed.usage;
  const cooldownUntil = parsed.cooldownUntil || {};
  const lastUsed = parsed.lastUsed || {};
  const totalCalls = parsed.totalCalls || {};
  let state = buildState({ windowMs, maxPerWindow, defaultCooldownMs, order, config });
  const mutableUsage = {};
  const mutableCooldownUntil = {};
  const mutableLastUsed = {};
  const mutableTotalCalls = {};
  for (const id of order) {
    mutableUsage[id] = Array.isArray(usage[id]) ? usage[id].map(Number) : [];
    mutableCooldownUntil[id] = Number(cooldownUntil[id]) || 0;
    mutableLastUsed[id] = Number(lastUsed[id]) || 0;
    mutableTotalCalls[id] = Number(totalCalls[id]) || 0;
  }
  state = {
    ...state,
    usage: mutableUsage,
    cooldownUntil: mutableCooldownUntil,
    lastUsed: mutableLastUsed,
    totalCalls: mutableTotalCalls
  };
  return deepFreeze(state);
}
