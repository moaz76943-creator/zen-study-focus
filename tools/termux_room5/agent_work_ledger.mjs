import fs from 'node:fs';
import path from 'node:path';

export const VERSION = 1;

export const ENTRY_KINDS = Object.freeze({
  STEP: 'step',
  NOTE: 'note'
});

export const ENTRY_STATUSES = Object.freeze({
  PENDING: 'pending',
  DONE: 'done',
  FAILED: 'failed'
});

const clampInt = (value, fallback) => {
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : fallback;
};

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export function createLedger({ taskId, title = '', version = VERSION } = {}) {
  if (typeof taskId !== 'string' || taskId.length === 0) {
    throw new TypeError('createLedger: taskId must be a non-empty string');
  }
  return deepFreeze({
    version,
    taskId,
    title: typeof title === 'string' ? title : '',
    entries: []
  });
}

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

export function appendEntry(ledger, entry) {
  assertLedgerShape(ledger, 'appendEntry');
  if (!isPlainObject(entry)) {
    throw new TypeError('appendEntry: entry must be a plain object');
  }
  const kind =
    entry.kind === ENTRY_KINDS.STEP
      ? ENTRY_KINDS.STEP
      : entry.kind === ENTRY_KINDS.NOTE
        ? ENTRY_KINDS.NOTE
        : null;
  if (kind === null) {
    throw new TypeError(`appendEntry: entry.kind must be one of ${Object.values(ENTRY_KINDS).join(', ')}`);
  }
  const lastSeq = ledger.entries.length > 0 ? ledger.entries[ledger.entries.length - 1].seq : 0;
  const base = {
    seq: lastSeq + 1,
    kind,
    at: typeof entry.at === 'string' ? entry.at : new Date().toISOString()
  };
  const normalized =
    kind === ENTRY_KINDS.STEP
      ? {
          ...base,
          step: typeof entry.step === 'string' ? entry.step : '',
          status: normalizeStatus(entry.status),
          note: optionalString(entry.note),
          ...optionalError(entry)
        }
      : {
          ...base,
          note: optionalString(entry.note)
        };
  return {
    ...ledger,
    entries: Object.freeze([...ledger.entries, deepFreeze(normalized)])
  };
}

function normalizeStatus(status) {
  switch (status) {
    case ENTRY_STATUSES.DONE:
      return ENTRY_STATUSES.DONE;
    case ENTRY_STATUSES.FAILED:
      return ENTRY_STATUSES.FAILED;
    default:
      return ENTRY_STATUSES.PENDING;
  }
}

function optionalString(value) {
  return typeof value === 'string' ? value : undefined;
}

function optionalError(entry) {
  return entry.error === undefined ? {} : { error: optionalString(entry.error) };
}

export function markStepDone(ledger, step) {
  return transformStep(ledger, step, { status: ENTRY_STATUSES.DONE });
}

export function markStepFailed(ledger, step, error = '') {
  return transformStep(ledger, step, { status: ENTRY_STATUSES.FAILED, error });
}

function transformStep(ledger, step, patch) {
  assertLedgerShape(ledger, 'transformStep');
  let found = false;
  const entries = ledger.entries.map((entry) => {
    if (entry.kind === ENTRY_KINDS.STEP && entry.step === step) {
      found = true;
      return deepFreeze({ ...entry, ...patch });
    }
    return entry;
  });
  if (!found) return ledger;
  return { ...ledger, entries };
}

export function getEntries(ledger, { status, kind } = {}) {
  assertLedgerShape(ledger, 'getEntries');
  return ledger.entries.filter(
    (entry) =>
      (status === undefined || entry.status === status) && (kind === undefined || entry.kind === kind)
  );
}

export function summarizeLedger(ledger) {
  assertLedgerShape(ledger, 'summarizeLedger');
  const steps = ledger.entries.filter((entry) => entry.kind === ENTRY_KINDS.STEP);
  const count = (status) => steps.filter((entry) => entry.status === status).length;
  const last = steps[steps.length - 1];
  const done = count(ENTRY_STATUSES.DONE);
  const pending = count(ENTRY_STATUSES.PENDING);
  const failed = count(ENTRY_STATUSES.FAILED);
  return {
    taskId: ledger.taskId,
    title: ledger.title,
    total: ledger.entries.length,
    steps: steps.length,
    done,
    pending,
    failed,
    lastStatus: last ? last.status : null,
    ok: failed === 0 && pending === 0
  };
}

export function isResumable(ledger) {
  assertLedgerShape(ledger, 'isResumable');
  const steps = ledger.entries.filter((entry) => entry.kind === ENTRY_KINDS.STEP);
  const pendingSteps = steps.filter((e) => e.status === ENTRY_STATUSES.PENDING).map((e) => e.step);
  const failedSteps = steps.filter((e) => e.status === ENTRY_STATUSES.FAILED).map((e) => e.step);
  return {
    resumable: pendingSteps.length > 0 || failedSteps.length > 0,
    nextSteps: [...pendingSteps, ...failedSteps],
    pendingSteps,
    failedSteps
  };
}

export function serializeLedger(ledger) {
  assertLedgerShape(ledger, 'serializeLedger');
  assertSerializable(ledger);
  return JSON.stringify({ version: ledger.version, taskId: ledger.taskId, title: ledger.title, entries: ledger.entries }, null, 2);
}

function assertSerializable(ledger) {
  if (typeof ledger.version !== 'number' || typeof ledger.taskId !== 'string' || !Array.isArray(ledger.entries)) {
    throw new TypeError('serializeLedger: invalid ledger shape');
  }
  try {
    JSON.stringify(ledger);
  } catch (error) {
    throw new TypeError(`serializeLedger: ledger is not JSON serializable: ${error.message}`);
  }
}

export function deserializeLedger(json) {
  if (typeof json !== 'string' || json.length === 0) {
    throw new TypeError('deserializeLedger: json must be a non-empty string');
  }
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new TypeError(`deserializeLedger: invalid JSON: ${error.message}`);
  }
  if (!isPlainObject(parsed) || parsed.version !== VERSION) {
    throw new Error(`deserializeLedger: unsupported ledger version (expected ${VERSION})`);
  }
  if (typeof parsed.taskId !== 'string' || !Array.isArray(parsed.entries)) {
    throw new TypeError('deserializeLedger: malformed ledger payload');
  }
  let ledger = { version: VERSION, taskId: parsed.taskId, title: parsed.title ?? '', entries: [] };
  for (const entry of parsed.entries) {
    ledger = appendEntry({ ...ledger, entries: [...ledger.entries] }, entry);
  }
  return deepFreeze(ledger);
}

export function writeLedgerAtomically(filePath, ledger) {
  if (typeof filePath !== 'string' || filePath.length === 0) {
    return { ok: false, error: 'writeLedgerAtomically: filePath must be a non-empty string', bytesWritten: 0 };
  }
  let payload;
  try {
    payload = serializeLedger(ledger);
  } catch (error) {
    return { ok: false, error: error.message, bytesWritten: 0 };
  }
  try {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    const tmpFile = path.join(dir, `.${path.basename(filePath)}.${
      `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    }.tmp`);
    let bytesWritten = 0;
    try {
      bytesWritten = fs.writeFileSync(tmpFile, payload, { encoding: 'utf8', flag: 'wx' });
      fs.renameSync(tmpFile, filePath);
    } finally {
      if (fs.existsSync(tmpFile)) {
        try {
          fs.unlinkSync(tmpFile);
        } catch {}
      }
    }
    return { ok: true, error: null, bytesWritten: Buffer.byteLength(payload, 'utf8') };
  } catch (error) {
    return { ok: false, error: error.message, bytesWritten: 0 };
  }
}

function assertLedgerShape(ledger, fnName) {
  if (!isPlainObject(ledger) || !Array.isArray(ledger.entries) || typeof ledger.taskId !== 'string') {
    throw new TypeError(`${fnName}: argument must be a ledger created by createLedger`);
  }
}
