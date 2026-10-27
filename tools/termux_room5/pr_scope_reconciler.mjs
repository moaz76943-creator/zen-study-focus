/**
 * DEEP FOCUS — Room5 PR Scope Reconciler (task A03)
 * Pure, standalone, offline reconciler for PR snapshots: detects
 * duplicated patch content across open PRs, PRs whose base branch
 * has fallen behind upstream, and redundant duplicate work from the
 * same author on the same base. Zero networking, zero dependencies,
 * zero persistence side-effects, deterministic output.
 *
 * Public API (stable):
 *   reconcilePrSnapshots(prs) -> { status, ok, prCount, issues,
 *       duplicatePatches, staleBases, redundantBases }
 *   findDuplicatePatches(prs) -> [ { patchSha, prs, duplicatePrs, prCount } ]
 *   findStaleBases(prs)       -> [ { pr, baseRef, baseSha, upstreamHeadSha, refs } ]
 *   formatReconciliation(report) -> string
 */

function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Deterministic fingerprint (FNV-1a style) of trimmed patch content.
 * Pure string hashing; no crypto, no randomness.
 */
function fingerprint(text) {
  const s = String(text).trim();
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function normalizePr(raw, index) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new TypeError(
      `PR snapshot #${index} must be an object with id/baseRef/baseSha/headSha/upstreamHeadSha/patch fields`
    );
  }
  const pr = {
    id: asString(raw.id),
    author: asString(raw.author) || 'unknown',
    baseRef: asString(raw.baseRef),
    baseSha: asString(raw.baseSha),
    upstreamHeadSha: asString(raw.upstreamHeadSha),
    headSha: asString(raw.headSha),
    patch: String(raw.patch === undefined || raw.patch === null ? '' : raw.patch).trim()
  };
  if (!pr.id) {
    throw new TypeError(`PR snapshot #${index} must include a non-empty "id"`);
  }
  if (!pr.patch) {
    throw new TypeError(`PR snapshot #${index} (${pr.id}) must include a non-empty "patch"`);
  }
  if (!pr.baseRef) {
    throw new TypeError(`PR snapshot #${index} (${pr.id}) must include a non-empty "baseRef"`);
  }
  if (!pr.baseSha) {
    throw new TypeError(`PR snapshot #${index} (${pr.id}) must include a non-empty "baseSha"`);
  }
  if (!pr.headSha) {
    throw new TypeError(`PR snapshot #${index} (${pr.id}) must include a non-empty "headSha"`);
  }
  if (!pr.upstreamHeadSha) {
    throw new TypeError(`PR snapshot #${index} (${pr.id}) must include a non-empty "upstreamHeadSha"`);
  }
  pr.patchSha = fingerprint(pr.patch);
  return pr;
}

function requireSnapshotArray(prs, fnName) {
  if (!Array.isArray(prs)) {
    throw new TypeError(`${fnName} expects an array of PR snapshots`);
  }
}

/**
 * Duplicates: same normalized patch content on >= 2 distinct PR ids
 * (by different identity: different author or different base).
 */
function findDuplicatePatches(prs) {
  requireSnapshotArray(prs, 'findDuplicatePatches');
  const normalized = prs.map(normalizePr);
  const byPatch = new Map();
  for (const pr of normalized) {
    if (!byPatch.has(pr.patchSha)) byPatch.set(pr.patchSha, []);
    byPatch.get(pr.patchSha).push(pr);
  }
  const duplicates = [];
  for (const [patchSha, group] of byPatch) {
    const identities = new Set(group.map(pr => `${pr.author}#${pr.baseRef}/${pr.baseSha}`));
    // identical patch sharing one author+base identity is redundancy,
    // not duplicated parallel work — handled by findRedundantBases.
    if (identities.size < 2) continue;
    const ids = [...new Set(group.map(pr => pr.id))].sort();
    duplicates.push({
      patchSha,
      patch: group[0].patch,
      prs: ids,
      duplicatePrs: new Set(ids),
      prCount: ids.length
    });
  }
  duplicates.sort((a, b) => (a.patchSha < b.patchSha ? -1 : a.patchSha > b.patchSha ? 1 : 0));
  return duplicates;
}

/**
 * Stale: PR baseSha differs from the recorded upstream head for the
 * same base ref, meaning the base moved since the PR was opened.
 */
function findStaleBases(prs) {
  requireSnapshotArray(prs, 'findStaleBases');
  const normalized = prs.map(normalizePr);
  const stale = [];
  for (const pr of normalized) {
    if (pr.baseSha === pr.upstreamHeadSha) continue;
    stale.push({
      pr: pr.id,
      baseRef: pr.baseRef,
      baseSha: pr.baseSha,
      upstreamHeadSha: pr.upstreamHeadSha,
      refs: [pr.baseRef]
    });
  }
  stale.sort((a, b) =>
    a.pr < b.pr ? -1 : a.pr > b.pr ? 1 : (a.baseRef < b.baseRef ? -1 : a.baseRef > b.baseRef ? 1 : 0)
  );
  return stale;
}

/**
 * Redundant: identical patch content from the same author pinned to
 * the same base state — the later PR is fully superseded by the first.
 */
function findRedundantBases(prs) {
  requireSnapshotArray(prs, 'findRedundantBases');
  const normalized = prs.map(normalizePr);
  const bySignature = new Map();
  for (const pr of normalized) {
    const key = `${pr.patchSha}\u0000${pr.author}\u0000${pr.baseRef}\u0000${pr.baseSha}`;
    if (!bySignature.has(key)) bySignature.set(key, []);
    bySignature.get(key).push(pr);
  }
  const redundant = [];
  for (const group of bySignature.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    for (let i = 1; i < sorted.length; i++) {
      redundant.push({
        pr: sorted[i].id,
        kind: 'redundantBase',
        author: sorted[i].author,
        baseRef: sorted[i].baseRef,
        supersededBy: sorted[0].id
      });
    }
  }
  redundant.sort((a, b) => (a.pr < b.pr ? -1 : a.pr > b.pr ? 1 : 0));
  return redundant;
}

function reconcilePrSnapshots(prs) {
  requireSnapshotArray(prs, 'reconcilePrSnapshots');
  const normalized = prs.map(normalizePr);

  const duplicates = findDuplicatePatches(normalized);
  const stale = findStaleBases(normalized);
  const redundant = findRedundantBases(normalized);

  const dupIssueSet = new Map();
  for (const dup of duplicates) {
    const first = dup.prs[0];
    for (const prId of dup.prs.slice(1)) {
      dupIssueSet.set(
        `duplicatePatch\u0000${prId}`,
        { kind: 'duplicatePatch', pr: prId, detail: `patch identical to ${first}`, patchSha: dup.patchSha }
      );
    }
  }

  const issues = [];
  const seenKinds = new Map();
  for (const [key, issue] of dupIssueSet) {
    issues.push(issue);
    seenKinds.set(key, true);
  }
  for (const s of stale) {
    issues.push({
      kind: 'staleBase',
      pr: s.pr,
      detail: `base ${s.baseRef} moved from ${s.baseSha} to ${s.upstreamHeadSha}`
    });
  }
  for (const r of redundant) {
    issues.push({
      kind: 'redundantBase',
      pr: r.pr,
      detail: `same author, patch and base as ${r.supersededBy}`
    });
  }
  issues.sort((a, b) =>
    a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : (a.pr < b.pr ? -1 : a.pr > b.pr ? 1 : 0)
  );

  const hasDup = duplicates.length > 0;
  const hasStale = stale.length > 0;
  const ok = !hasDup && !hasStale;
  const status = hasDup ? 'DUPLICATED' : hasStale ? 'STALE' : 'PASS';

  return {
    status,
    ok,
    prCount: normalized.length,
    duplicatePatches: duplicates,
    staleBases: stale,
    redundantBases: redundant,
    issues
  };
}

function formatReconciliation(report) {
  if (report === null || typeof report !== 'object' || Array.isArray(report)) {
    throw new TypeError('formatReconciliation expects a reconcilePrSnapshots report object');
  }
  const lines = [];
  lines.push(`status: ${report.status}`);
  lines.push(`prs: ${report.prCount}`);
  lines.push(`duplicate patches: ${Array.isArray(report.duplicatePatches) ? report.duplicatePatches.length : 0}`);
  lines.push(`stale bases: ${Array.isArray(report.staleBases) ? report.staleBases.length : 0}`);
  if (Array.isArray(report.duplicatePatches)) {
    for (const dup of report.duplicatePatches) {
      lines.push(`duplicatePatch prs=[${dup.prs.join(', ')}] sha=${dup.patchSha}`);
    }
  }
  if (Array.isArray(report.staleBases)) {
    for (const s of report.staleBases) {
      lines.push(`staleBase pr=${s.pr} ref=${s.baseRef} base=${s.baseSha} upstream=${s.upstreamHeadSha}`);
    }
  }
  if (Array.isArray(report.redundantBases)) {
    for (const r of report.redundantBases) {
      lines.push(`redundantBase pr=${r.pr} supersededBy=${r.supersededBy}`);
    }
  }
  return lines.join('\n');
}

export { reconcilePrSnapshots, findDuplicatePatches, findStaleBases, formatReconciliation };
