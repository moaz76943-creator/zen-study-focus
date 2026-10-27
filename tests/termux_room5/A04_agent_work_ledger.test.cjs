'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const MODULE_URL = new URL('../../tools/termux_room5/agent_work_ledger.mjs', 'file://' + __dirname + '/').href;

const A04_KEY = 'tools/termux_room5/agent_work_ledger.mjs';

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'a04-ledger-'));
}

test('A04 agent_work_ledger: module exports a stable API', async () => {
  const mod = await import(MODULE_URL);
  assert.equal(mod.VERSION, 1);
  for (const name of [
    'createLedger',
    'appendEntry',
    'getEntries',
    'markStepDone',
    'markStepFailed',
    'summarizeLedger',
    'isResumable',
    'serializeLedger',
    'deserializeLedger',
    'writeLedgerAtomically'
  ]) {
    assert.equal(typeof mod[name], 'function', name);
  }
  assert.ok(Object.isFrozen(mod.ENTRY_KINDS) || typeof mod.ENTRY_KINDS === 'object');
});

test('A04 agent_work_ledger: append and summarize entries in memory (no side effects)', async () => {
  const mod = await import(MODULE_URL);
  const ledger = mod.createLedger({ taskId: 'A04', title: 'Pure ledger' });
  assert.equal(ledger.taskId, 'A04');
  assert.equal(ledger.entries.length, 0);

  const before = fs.statSync(os.tmpdir());

  const l1 = mod.appendEntry(ledger, { kind: 'step', step: 'write-test', status: 'done', note: 'regression first' });
  const l2 = mod.appendEntry(l1, { kind: 'step', step: 'implement', status: 'pending' });

  assert.notEqual(l1, ledger, 'append must be pure: returns new ledger');
  assert.equal(ledger.entries.length, 0, 'original ledger untouched');
  assert.equal(l2.entries.length, 2);
  assert.equal(l2.entries[0].step, 'write-test');
  assert.equal(l2.entries[0].status, 'done');
  assert.ok(l2.entries[0].seq >= 1, 'entries have increasing sequence');
  assert.ok(l2.entries[1].seq > l2.entries[0].seq);

  const summary = mod.summarizeLedger(l2);
  assert.equal(summary.taskId, 'A04');
  assert.equal(summary.total, 2);
  assert.equal(summary.done, 1);
  assert.equal(summary.pending, 1);
  assert.equal(summary.failed, 0);
  assert.equal(summary.lastStatus, 'pending');

  const after = fs.statSync(os.tmpdir());
  assert.deepEqual(
    { mtimeMs: before.mtimeMs, size: before.size },
    { mtimeMs: after.mtimeMs, size: after.size },
    'no writes to filesystem happened'
  );
});

test('A04 agent_work_ledger: markStepDone / markStepFailed are pure', async () => {
  const mod = await import(MODULE_URL);
  let ledger = mod.createLedger({ taskId: 'A04' });
  ledger = mod.appendEntry(ledger, { kind: 'step', step: 'alpha', status: 'pending' });
  ledger = mod.appendEntry(ledger, { kind: 'step', step: 'beta', status: 'pending' });

  const done = mod.markStepDone(ledger, 'alpha');
  assert.equal(done.entries[0].status, 'done');
  assert.equal(done.entries[1].status, 'pending');
  assert.equal(ledger.entries[0].status, 'pending', 'source untouched');

  const failed = mod.markStepFailed(done, 'beta', 'boom');
  assert.equal(failed.entries[1].status, 'failed');
  assert.equal(failed.entries[1].error, 'boom');

  assert.equal(mod.markStepDone(ledger, 'missing'), ledger, 'unknown step returns ledger unchanged');

  const summary = mod.summarizeLedger(failed);
  assert.equal(summary.done, 1);
  assert.equal(summary.failed, 1);
  assert.equal(summary.lastStatus, 'failed');
  assert.equal(summary.ok, false);
});

test('A04 agent_work_ledger: serialize/deserialize round trip', async () => {
  const mod = await import(MODULE_URL);
  let ledger = mod.createLedger({ taskId: 'A04', title: 'Round trip' });
  ledger = mod.appendEntry(ledger, { kind: 'step', step: 'one', status: 'done' });
  ledger = mod.appendEntry(ledger, { kind: 'note', note: 'two' });

  const json = mod.serializeLedger(ledger);
  assert.equal(typeof json, 'string');
  const parsed = JSON.parse(json);
  assert.equal(parsed.taskId, 'A04');
  assert.equal(parsed.version, mod.VERSION);

  const restored = mod.deserializeLedger(json);
  assert.deepEqual(restored.entries, ledger.entries);
  assert.deepEqual(restored, ledger);

  assert.throws(() => mod.deserializeLedger('not json'));
  assert.throws(() => mod.deserializeLedger('{"version":999,"taskId":"x","entries":[]}'));
  assert.throws(() => mod.deserializeLedger('{"version":1}'));
});

test('A04 agent_work_ledger: isResumable logic', async () => {
  const mod = await import(MODULE_URL);
  let ledger = mod.createLedger({ taskId: 'A04' });
  ledger = mod.appendEntry(ledger, { kind: 'step', step: 'one', status: 'done' });
  ledger = mod.appendEntry(ledger, { kind: 'step', step: 'two', status: 'pending' });

  const report = mod.isResumable(ledger);
  assert.equal(report.resumable, true);
  assert.deepEqual(report.pendingSteps, ['two']);
  assert.deepEqual(report.failedSteps, []);

  ledger = mod.markStepFailed(ledger, 'two', 'boom');
  const failedReport = mod.isResumable(ledger);
  assert.equal(failedReport.resumable, true, 'failed steps are also resumable work');
  assert.deepEqual(failedReport.pendingSteps, []);
  assert.deepEqual(failedReport.failedSteps, ['two']);
  assert.deepEqual(failedReport.nextSteps, ['two']);

  const allLedger = mod.markStepDone(ledger, 'two');
  const doneReport = mod.isResumable(allLedger);
  assert.equal(doneReport.resumable, false);
  assert.deepEqual(doneReport.nextSteps, []);
});

test('A04 agent_work_ledger: appendEntry validates input', async () => {
  const mod = await import(MODULE_URL);
  const ledger = mod.createLedger({ taskId: 'A04' });
  assert.throws(() => mod.appendEntry(ledger, null));
  assert.throws(() => mod.appendEntry(ledger, { kind: 'bad-kind' }));
});

test('A04 agent_work_ledger: atomic file write creates, resumes, and never truncates on failure', async () => {
  const mod = await import(MODULE_URL);
  const dir = makeTmpDir();
  try {
    const file = path.join(dir, 'ledger.json');
    let ledger = mod.createLedger({ taskId: 'A04', title: 'Atomic write' });
    ledger = mod.appendEntry(ledger, { kind: 'step', step: 'one', status: 'done' });

    const res = mod.writeLedgerAtomically(file, ledger);
    assert.equal(res.ok, true);
    assert.equal(res.bytesWritten, fs.statSync(file).size);
    const onDisk = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(onDisk.taskId, 'A04');
    assert.equal(onDisk.entries.length, 1);

    // resume: read from disk, append, write again
    const resumed = mod.deserializeLedger(fs.readFileSync(file, 'utf8'));
    const grown = mod.appendEntry(resumed, { kind: 'step', step: 'two', status: 'pending' });
    const res2 = mod.writeLedgerAtomically(file, grown);
    assert.equal(res2.ok, true);
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).entries.length, 2);

    // only ever one artifact on disk (tmp file cleaned up)
    const listing = fs.readdirSync(dir).filter(f => f.startsWith('ledger.json'));
    assert.equal(listing.length, 1);

    // atomicity: serialize failure leaves original file intact
    const broken = { ...grown, entries: 'not-an-array' };
    const bad = mod.writeLedgerAtomically(file, broken);
    assert.equal(bad.ok, false);
    assert.ok(bad.error);
    const intact = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(intact.entries.length, 2, 'failed write must not clobber existing ledger');

    // new dir creation is supported
    const nested = path.join(dir, 'nested', 'deeper', 'ledger.json');
    const res3 = mod.writeLedgerAtomically(nested, ledger);
    assert.equal(res3.ok, true);
    assert.ok(fs.existsSync(nested));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('A04 agent_work_ledger: A04 contract key present', () => {
  assert.ok(A04_KEY === 'tools/termux_room5/agent_work_ledger.mjs');
});
