'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

const MODULE_URL = new URL('../../tools/termux_room5/pr_scope_reconciler.mjs', 'file://' + __dirname + '/').href;

const A03_KEY = 'tools/termux_room5/pr_scope_reconciler.mjs';

const snapshot = () => ([
  {
    id: 'PR-101',
    title: 'Add focus timer engine',
    author: 'alice',
    baseRef: 'main',
    baseSha: 'sha-main-001',
    upstreamHeadSha: 'sha-main-001',
    headSha: 'sha-head-101',
    patch: 'diff --git a/t.mjs b/t.mjs\n+focus timer'
  },
  {
    id: 'PR-102',
    title: 'Add audio mixer',
    author: 'bob',
    baseRef: 'main',
    baseSha: 'sha-main-001',
    upstreamHeadSha: 'sha-main-002',
    headSha: 'sha-head-102',
    patch: 'diff --git a/m.mjs b/m.mjs\n+audio mixer'
  },
  {
    id: 'PR-103',
    title: 'Add focus timer engine (duplicate work)',
    author: 'carol',
    baseRef: 'main',
    baseSha: 'sha-main-003',
    upstreamHeadSha: 'sha-main-003',
    headSha: 'sha-head-103',
    patch: 'diff --git a/t.mjs b/t.mjs\n+focus timer'
  },
  {
    id: 'PR-104',
    title: 'Fix locale gaps',
    author: 'dave',
    baseRef: 'develop',
    baseSha: 'sha-dev-009',
    upstreamHeadSha: 'sha-dev-009',
    headSha: 'sha-head-104',
    patch: 'diff --git a/l.mjs b/l.mjs\n+locale fix'
  }
]);

test('A03 pr_scope_reconciler: duplicated patches and stale bases', async () => {
  const { reconcilePrSnapshots, findDuplicatePatches, findStaleBases, formatReconciliation } = await import(MODULE_URL);

  await test('clean snapshot of distinct fresh PRs reconciles to PASS', () => {
    const prs = snapshot().map(p => ({ ...p, patch: 'unique-' + p.id }));
    prs[1].upstreamHeadSha = prs[1].baseSha; // make PR-102 fresh again
    const report = reconcilePrSnapshots(prs);
    assert.equal(report.status, 'PASS');
    assert.equal(report.ok, true);
    assert.equal(report.prCount, 4);
    assert.equal(report.duplicatePatches.length, 0);
    assert.equal(report.staleBases.length, 0);
    assert.equal(report.redundantBases.length, 0);
    assert.equal(report.issues.length, 0);
  });

  await test('detects duplicated patches across two PRs', () => {
    const report = reconcilePrSnapshots(snapshot());
    assert.equal(report.duplicatePatches.length, 1);
    const dup = report.duplicatePatches[0];
    assert.deepEqual(dup.prs, ['PR-101', 'PR-103']);
    assert.ok(dup.duplicatePrs.has('PR-101'));
    assert.ok(dup.duplicatePrs.has('PR-103'));
    assert.equal(dup.prCount, 2);
    assert.ok(dup.patchSha.length > 0, 'patch content is fingerprinted');
    assert.ok(report.issues.some(i => i.kind === 'duplicatePatch' && i.pr === 'PR-103'));
    assert.equal(report.status, 'DUPLICATED');
    assert.equal(report.ok, false);
  });

  await test('identical patch by same author on same base counts as redundant, not duplicated', () => {
    const prs = snapshot().slice(0, 3);
    prs[2].author = prs[0].author;
    prs[2].baseSha = prs[0].baseSha;
    prs[2].upstreamHeadSha = prs[0].upstreamHeadSha;
    const report = reconcilePrSnapshots(prs);
    assert.equal(report.duplicatePatches.length, 0);
    assert.equal(report.redundantBases.length, 1);
    assert.equal(report.redundantBases[0].pr, 'PR-103');
    assert.equal(report.redundantBases[0].supersededBy, 'PR-101');
  });

  await test('detects stale base when baseSha lags upstream head', () => {
    const prs = snapshot();
    // PR-102 is stale by construction: baseSha !== upstreamHeadSha
    const stale = findStaleBases(prs);
    assert.equal(stale.length, 1);
    assert.equal(stale[0].pr, 'PR-102');
    assert.equal(stale[0].baseRef, 'main');
    assert.equal(stale[0].baseSha, 'sha-main-001');
    assert.equal(stale[0].upstreamHeadSha, 'sha-main-002');
    assert.deepEqual(stale[0].refs, ['main']);
    const report = reconcilePrSnapshots(prs);
    assert.ok(report.staleBases.length >= 1);
    assert.ok(report.issues.some(i => i.kind === 'staleBase' && i.pr === 'PR-102'));
  });

  await test('snapshot where only stale-base issue exists gets STALE status', () => {
    const prs = snapshot().map(p => ({ ...p, patch: 'unique-' + p.id }));
    prs[1].upstreamHeadSha = 'sha-main-009';
    const report = reconcilePrSnapshots(prs);
    assert.equal(report.status, 'STALE');
    assert.equal(report.ok, false);
    assert.equal(report.staleBases.length, 1);
    assert.equal(report.duplicatePatches.length, 0);
  });

  await test('multiple stale PRs sharing the same lagging base are grouped', () => {
    const prs = snapshot().map(p => ({ ...p, patch: 'unique-' + p.id }));
    prs[0].upstreamHeadSha = 'sha-main-777';
    prs[1].upstreamHeadSha = 'sha-main-777';
    const stale = findStaleBases(prs);
    assert.equal(stale.length, 2);
    assert.deepEqual(stale[0].refs.map(r => r).filter(x => x === 'main').length, 1);
    for (const s of stale) assert.equal(s.upstreamHeadSha, 'sha-main-777');
  });

  await test('findDuplicatePatches returns deterministic sorted flat list', () => {
    const prs = snapshot();
    prs.push({ ...snapshot()[3], id: 'PR-105', author: 'erin', patch: snapshot()[3].patch });
    const list = findDuplicatePatches(prs);
    assert.equal(list.length, 2); // {101,103} and {104,105}
    for (const d of list) {
      assert.ok(Array.isArray(d.prs) && d.prs.length > 1);
      for (let i = 1; i < d.prs.length; i++) {
        assert.ok(d.prs[i - 1] < d.prs[i], 'prs sorted ascending');
      }
    }
    assert.deepEqual(findDuplicatePatches(prs), list, 'repeated runs deeply equal');
  });

  await test('input never mutated; reconciliation repeatable', () => {
    const prs = snapshot();
    const before = JSON.stringify(prs);
    const report = reconcilePrSnapshots(prs);
    assert.equal(JSON.stringify(prs), before);
    assert.deepEqual(report, reconcilePrSnapshots(prs));
  });

  await test('whitespace-only patch differences are still duplicates; different patches are not', () => {
    const prs = [
      { id: 'P1', author: 'a', baseRef: 'm', baseSha: 'b1', upstreamHeadSha: 'b1', headSha: 'h1', patch: ' +line ' },
      { id: 'P2', author: 'b', baseRef: 'm', baseSha: 'b1', upstreamHeadSha: 'b1', headSha: 'h2', patch: '+line' }
    ];
    const report = reconcilePrSnapshots(prs);
    assert.equal(report.duplicatePatches.length, 1);
    // genuinely different patches produce no duplicates
    prs[1].patch = '+totally different';
    assert.equal(reconcilePrSnapshots(prs).duplicatePatches.length, 0);
  });

  await test('rejects invalid snapshots with precise errors', () => {
    assert.throws(() => reconcilePrSnapshots(null), /array of pr snapshots/i);
    assert.throws(() => reconcilePrSnapshots('nope'), /array of pr snapshots/i);
    assert.throws(() => reconcilePrSnapshots([{}]), /id/i);
    assert.throws(() => reconcilePrSnapshots([{ id: 'P1' }]), /patch/i);
    assert.throws(() => reconcilePrSnapshots([{ id: 'P1', patch: 'x' }]), /baseSha|headSha|baseRef|upstreamHeadSha/i);
    assert.throws(() => findStaleBases(undefined), /array of pr snapshots/i);
    assert.throws(() => findDuplicatePatches(42), /array of pr snapshots/i);
  });

  await test('empty snapshot is a valid PASS baseline', () => {
    const report = reconcilePrSnapshots([]);
    assert.equal(report.status, 'PASS');
    assert.equal(report.ok, true);
    assert.equal(report.prCount, 0);
    assert.deepEqual(report.duplicatePatches, []);
    assert.deepEqual(report.staleBases, []);
    assert.deepEqual(report.redundantBases, []);
  });

  await test('formatReconciliation deterministic, offline, summary-only text', () => {
    const good = formatReconciliation(reconcilePrSnapshots([]));
    const mixed = formatReconciliation(reconcilePrSnapshots(snapshot()));
    assert.equal(typeof good, 'string');
    assert.ok(good.includes('PASS'));
    assert.ok(mixed.includes('DUPLICATED'));
    assert.ok(mixed.includes('staleBase') || mixed.includes('duplicatePatch'));
    assert.ok(mixed.includes('PR-103'));
    assert.equal(formatReconciliation(reconcilePrSnapshots(snapshot())), mixed);
    assert.ok(!/https?:\/\//.test(mixed), 'no URLs / network hints in report');
  });

  await test('stable API surface: exactly four exported functions', async () => {
    const ns = await import(MODULE_URL);
    const keys = Object.keys(ns).sort();
    assert.deepEqual(keys, ['findDuplicatePatches', 'findStaleBases', 'formatReconciliation', 'reconcilePrSnapshots']);
    for (const k of keys) assert.equal(typeof ns[k], 'function');
  });
});
