'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MODULE_PATH = '../../tools/termux_room5/audio_provenance_audit.mjs';
const MODULE_FILE = path.join(__dirname, MODULE_PATH);

function asset(overrides = {}) {
  return {
    id: 'rain',
    path: 'sounds/rain.ogg',
    license: 'CC0-1.0',
    author: 'Field Recorder',
    source: 'https://example.org/recordings/rain',
    license_evidence: 'https://example.org/licenses/rain',
    source_sha256: 'a'.repeat(64),
    sha256: 'b'.repeat(64),
    ...overrides
  };
}

test('license classification is explicit about commercial redistribution and obligations', async () => {
  const { classifyLicense } = await import(MODULE_PATH);

  const cc0 = classifyLicense('CC0-1.0');
  assert.equal(cc0.id, 'CC0-1.0');
  assert.equal(cc0.known, true);
  assert.equal(cc0.family, 'public-domain');
  assert.equal(cc0.redistributionAllowed, true);
  assert.equal(cc0.commercialRedistribution, true);
  assert.equal(cc0.attributionRequired, false);
  assert.equal(cc0.shareAlikeRequired, false);
  assert.equal(cc0.derivativesAllowed, true);
  assert.equal(Object.isFrozen(cc0), true);

  const by = classifyLicense('  cc by 3.0  ');
  assert.equal(by.id, 'CC-BY-3.0');
  assert.equal(by.known, true);
  assert.equal(by.commercialRedistribution, true);
  assert.equal(by.attributionRequired, true);
  assert.equal(by.shareAlikeRequired, false);

  const sa = classifyLicense('CC-BY-SA-4.0');
  assert.equal(sa.commercialRedistribution, true);
  assert.equal(sa.attributionRequired, true);
  assert.equal(sa.shareAlikeRequired, true);

  const nc = classifyLicense('CC-BY-NC-SA-4.0');
  assert.equal(nc.commercialRedistribution, false);
  assert.equal(nc.shareAlikeRequired, true);

  const nd = classifyLicense('CC-BY-ND-4.0');
  assert.equal(nd.commercialRedistribution, true);
  assert.equal(nd.derivativesAllowed, false);

  const publicDomain = classifyLicense('Public Domain');
  assert.equal(publicDomain.id, 'PUBLIC-DOMAIN');
  assert.equal(publicDomain.commercialRedistribution, true);
  assert.equal(publicDomain.attributionRequired, false);

  const proprietary = classifyLicense('All Rights Reserved');
  assert.equal(proprietary.known, true);
  assert.equal(proprietary.family, 'proprietary');
  assert.equal(proprietary.commercialRedistribution, false);
  assert.equal(proprietary.redistributionAllowed, false);

  const unknown = classifyLicense('MIT');
  assert.equal(unknown.known, false);
  assert.equal(unknown.family, 'unknown');
  assert.equal(unknown.commercialRedistribution, false);

  const missing = classifyLicense('   ');
  assert.equal(missing.id, null);
  assert.equal(missing.known, false);

  assert.deepEqual(classifyLicense('CC0-1.0'), cc0);
  assert.throws(() => classifyLicense(null), TypeError);
  assert.throws(() => classifyLicense(42), TypeError);
});

test('a fully evidenced commercial asset is approved without mutating its record', async () => {
  const { evaluateAudioAsset, VERDICTS } = await import(MODULE_PATH);
  const record = asset();
  const before = JSON.stringify(record);

  const result = evaluateAudioAsset(record);
  assert.equal(JSON.stringify(record), before);
  assert.equal(result.id, 'rain');
  assert.equal(result.verdict, VERDICTS.APPROVED);
  assert.deepEqual(result.reasons, []);
  assert.equal(result.license, 'CC0-1.0');
  assert.equal(result.commercialRedistribution, true);
  assert.deepEqual(result.obligations, { attribution: false, shareAlike: false });
  assert.equal(result.metadataOnly, true);
  assert.deepEqual(evaluateAudioAsset(record), result);

  const attributed = evaluateAudioAsset(asset({ id: 'forest', license: 'CC-BY-4.0' }));
  assert.equal(attributed.verdict, VERDICTS.APPROVED);
  assert.deepEqual(attributed.obligations, { attribution: true, shareAlike: false });

  const shareAlike = evaluateAudioAsset(asset({ id: 'lake', license: 'CC-BY-SA-4.0' }));
  assert.deepEqual(shareAlike.obligations, { attribution: true, shareAlike: true });

  assert.throws(() => evaluateAudioAsset(null), TypeError);
  assert.throws(() => evaluateAudioAsset('asset'), TypeError);
  assert.throws(() => evaluateAudioAsset(record, null), TypeError);
  assert.throws(() => evaluateAudioAsset(record, { requireDigest: 'yes' }), TypeError);
});

test('missing or restrictive rights are blocked with stable reason codes', async () => {
  const { evaluateAudioAsset, VERDICTS } = await import(MODULE_PATH);

  const cases = [
    [{ license: '' }, 'license_missing'],
    [{ license: 'MIT' }, 'license_unknown'],
    [{ license: 'CC-BY-NC-4.0' }, 'license_noncommercial'],
    [{ license: 'All Rights Reserved' }, 'license_no_redistribution'],
    [{ license: 'CC-BY-4.0', author: '' }, 'author_missing'],
    [{ license_evidence: '' }, 'evidence_missing'],
    [{ license_evidence: 'http://example.org/license' }, 'evidence_not_https'],
    [{ source: '' }, 'source_missing'],
    [{ source_sha256: 'not-a-digest' }, 'digest_invalid'],
    [{ source_sha256: undefined, sha256: undefined }, 'digest_missing']
  ];

  for (const [overrides, reason] of cases) {
    const result = evaluateAudioAsset(asset(overrides));
    assert.equal(result.verdict, VERDICTS.BLOCKED, reason);
    assert.ok(result.reasons.includes(reason), reason + ' in ' + result.reasons.join(','));
    assert.equal(result.metadataOnly, true);
  }
});

test('no-derivatives and quarantined approvals never silently pass', async () => {
  const { evaluateAudioAsset, VERDICTS } = await import(MODULE_PATH);

  const unverifiedNd = evaluateAudioAsset(asset({ license: 'CC-BY-ND-4.0' }));
  assert.equal(unverifiedNd.verdict, VERDICTS.REVIEW_REQUIRED);
  assert.ok(unverifiedNd.reasons.includes('license_no_derivatives_unverified'));

  const modifiedNd = evaluateAudioAsset(asset({ license: 'CC-BY-ND-4.0', modified: true }));
  assert.equal(modifiedNd.verdict, VERDICTS.BLOCKED);
  assert.ok(modifiedNd.reasons.includes('license_no_derivatives'));

  const verbatimNd = evaluateAudioAsset(asset({ license: 'CC-BY-ND-4.0', modified: false }));
  assert.equal(verbatimNd.verdict, VERDICTS.APPROVED);

  const quarantined = evaluateAudioAsset(asset({
    id: 'ocean',
    status: 'QUARANTINED_NOT_APPROVED',
    approved_for_runtime: false,
    ready: false
  }));
  assert.equal(quarantined.verdict, VERDICTS.REVIEW_REQUIRED);
  assert.ok(quarantined.reasons.includes('status_not_approved'));
  assert.ok(quarantined.reasons.includes('runtime_not_approved'));
  assert.ok(quarantined.reasons.includes('runtime_not_ready'));

  const inconsistent = evaluateAudioAsset(asset({ id: 'night', approved_for_runtime: true, ready: false }));
  assert.equal(inconsistent.verdict, VERDICTS.REVIEW_REQUIRED);
  assert.ok(inconsistent.reasons.includes('runtime_approval_inconsistent'));

  const rejected = evaluateAudioAsset(asset({ id: 'rejected', status: 'RIGHTS_BLOCKED' }));
  assert.equal(rejected.verdict, VERDICTS.BLOCKED);
  assert.ok(rejected.reasons.includes('status_blocked'));
});

test('strict checks can be relaxed explicitly without accepting insecure evidence', async () => {
  const { evaluateAudioAsset, VERDICTS } = await import(MODULE_PATH);

  const noDigest = asset({ source_sha256: undefined, sha256: undefined });
  assert.equal(evaluateAudioAsset(noDigest).verdict, VERDICTS.BLOCKED);
  assert.equal(evaluateAudioAsset(noDigest, { requireDigest: false }).verdict, VERDICTS.APPROVED);

  const noEvidence = asset({ license_evidence: '' });
  assert.equal(evaluateAudioAsset(noEvidence).verdict, VERDICTS.BLOCKED);
  assert.equal(evaluateAudioAsset(noEvidence, { requireEvidence: false }).verdict, VERDICTS.APPROVED);

  const noAuthor = asset({ author: '' });
  assert.equal(evaluateAudioAsset(noAuthor).verdict, VERDICTS.BLOCKED);
  assert.equal(evaluateAudioAsset(noAuthor, { requireAuthor: false }).verdict, VERDICTS.APPROVED);

  const noSource = asset({ source: '' });
  assert.equal(evaluateAudioAsset(noSource).verdict, VERDICTS.BLOCKED);
  assert.equal(evaluateAudioAsset(noSource, { requireSource: false }).verdict, VERDICTS.APPROVED);

  const insecure = evaluateAudioAsset(noEvidence, { requireEvidence: false });
  assert.equal(insecure.verdict, VERDICTS.APPROVED);
  const insecureProvided = evaluateAudioAsset(asset({ license_evidence: 'http://example.org/x' }), {
    requireEvidence: false
  });
  assert.equal(insecureProvided.verdict, VERDICTS.BLOCKED);
  assert.ok(insecureProvided.reasons.includes('evidence_not_https'));
});

test('audit report aggregates a clean manifest as PASS and labels metadata-only scope', async () => {
  const { auditAudioProvenance, summarizeProvenanceAudit } = await import(MODULE_PATH);
  const report = auditAudioProvenance({
    assets: [
      asset({ id: 'rain' }),
      asset({
        id: 'forest',
        license: 'CC-BY-4.0',
        source_sha256: 'c'.repeat(64),
        sha256: 'd'.repeat(64)
      })
    ]
  });

  assert.equal(report.status, 'PASS');
  assert.equal(report.ok, true);
  assert.equal(report.metadataOnly, true);
  assert.equal(report.byteVerification, 'NOT_PERFORMED');
  assert.equal(report.counts.total, 2);
  assert.equal(report.counts.approved, 2);
  assert.equal(report.counts.review_required, 0);
  assert.equal(report.counts.blocked, 0);
  assert.deepEqual(report.obligations.attribution, ['forest']);
  assert.deepEqual(report.obligations.shareAlike, []);
  assert.deepEqual(report.duplicates, []);
  assert.deepEqual(report.blockers, []);
  assert.deepEqual(report.review, []);
  assert.deepEqual(report.assets.map((item) => item.id), ['forest', 'rain']);
  assert.deepEqual(report.summary, summarizeProvenanceAudit(report));
  assert.equal(report.summary.counts.total, 2);
  assert.equal(report.summary.metadataOnly, true);
});

test('audit report fails closed for blocked rights and missing evidence', async () => {
  const { auditAudioProvenance } = await import(MODULE_PATH);
  const report = auditAudioProvenance([
    asset({ id: 'rain' }),
    asset({ id: 'night', license: 'CC-BY-NC-4.0', source_sha256: 'e'.repeat(64), sha256: 'f'.repeat(64) }),
    asset({ id: 'mystery', license: 'MIT', source_sha256: '1'.repeat(64), sha256: '2'.repeat(64) })
  ]);

  assert.equal(report.status, 'BLOCKED');
  assert.equal(report.ok, false);
  assert.equal(report.counts.approved, 1);
  assert.equal(report.counts.blocked, 2);
  assert.deepEqual(report.blockers, ['mystery', 'night']);
  assert.ok(report.assets.find((item) => item.id === 'night').reasons.includes('license_noncommercial'));
  assert.ok(report.assets.find((item) => item.id === 'mystery').reasons.includes('license_unknown'));
});

test('duplicate source digests downgrade otherwise approved assets to review', async () => {
  const { auditAudioProvenance } = await import(MODULE_PATH);
  const digest = 'e'.repeat(64);
  const report = auditAudioProvenance([
    asset({ id: 'earth', source_sha256: digest, sha256: '1'.repeat(64) }),
    asset({ id: 'noise', source_sha256: digest, sha256: '2'.repeat(64) })
  ]);

  assert.equal(report.status, 'REVIEW_REQUIRED');
  assert.equal(report.ok, false);
  assert.equal(report.counts.review_required, 2);
  assert.equal(report.duplicates.length, 1);
  assert.equal(report.duplicates[0].sha256, digest);
  assert.deepEqual(report.duplicates[0].ids, ['earth', 'noise']);
  assert.deepEqual(report.review, ['earth', 'noise']);
  for (const item of report.assets) {
    assert.ok(item.reasons.includes('duplicate_digest'));
  }
});

test('audit accepts assets and items manifests, never mutates input, and is deterministic', async () => {
  const { auditAudioProvenance, formatProvenanceReport } = await import(MODULE_PATH);
  const records = [
    asset({ id: 'rain' }),
    asset({ id: 'wind', license: 'CC-BY-SA-4.0' })
  ];
  const before = JSON.stringify(records);

  const fromArray = auditAudioProvenance(records);
  const fromAssets = auditAudioProvenance({ assets: records });
  const fromItems = auditAudioProvenance({ items: records });

  assert.equal(JSON.stringify(records), before);
  assert.deepEqual(fromArray, fromAssets);
  assert.deepEqual(fromArray, fromItems);
  assert.deepEqual(fromArray, auditAudioProvenance(records));
  assert.equal(fromArray.status, 'REVIEW_REQUIRED');
  assert.deepEqual(fromArray.assets.map((item) => item.id), ['rain', 'wind']);
  assert.deepEqual(fromArray.obligations.shareAlike, ['wind']);

  const text = formatProvenanceReport(fromArray);
  assert.equal(typeof text, 'string');
  assert.equal(formatProvenanceReport(fromArray), text);
  assert.ok(text.includes('Status: REVIEW_REQUIRED'));
  assert.ok(text.includes('rain'));
  assert.ok(text.includes('wind'));
  assert.ok(!/https?:\/\//.test(text), 'report text must not leak URLs');
  assert.throws(() => formatProvenanceReport(null), TypeError);
});

test('invalid manifests and records fail closed instead of producing a false PASS', async () => {
  const { auditAudioProvenance, VERDICTS } = await import(MODULE_PATH);

  assert.throws(() => auditAudioProvenance(null), TypeError);
  assert.throws(() => auditAudioProvenance({}), TypeError);
  assert.throws(() => auditAudioProvenance({ assets: 'nope' }), TypeError);
  assert.throws(() => auditAudioProvenance([], 'options'), TypeError);

  const report = auditAudioProvenance([null, asset({ id: 'rain' })]);
  assert.equal(report.status, 'BLOCKED');
  assert.deepEqual(report.assets.map((item) => item.id), ['asset_0', 'rain']);
  assert.equal(report.assets[0].verdict, VERDICTS.BLOCKED);
  assert.ok(report.assets[0].reasons.includes('asset_not_object'));

  const empty = auditAudioProvenance([]);
  assert.equal(empty.status, 'PASS');
  assert.equal(empty.ok, true);
  assert.equal(empty.counts.total, 0);
});

test('module is standalone ESM with no networking, storage, clock or dependency side effects', async () => {
  const ns = await import(MODULE_PATH);

  assert.equal(ns.VERSION, 1);
  assert.equal(ns.POLICY_VERSION, 1);
  assert.equal(Object.isFrozen(ns.LICENSES), true);
  assert.equal(Object.isFrozen(ns.LICENSES['CC0-1.0']), true);
  assert.equal(Object.isFrozen(ns.VERDICTS), true);
  assert.deepEqual(Object.keys(ns).sort(), [
    'LICENSES',
    'POLICY_VERSION',
    'VERDICTS',
    'VERSION',
    'auditAudioProvenance',
    'classifyLicense',
    'evaluateAudioAsset',
    'formatProvenanceReport',
    'summarizeProvenanceAudit'
  ]);

  const source = fs.readFileSync(MODULE_FILE, 'utf8');
  assert.ok(/^export\s+/m.test(source), 'ESM exports required');
  assert.ok(!/\brequire\s*\(/.test(source), 'no CommonJS require');
  assert.ok(!/^\s*import\s+/m.test(source), 'no imports or external dependencies');
  assert.ok(!/XMLHttpRequest|WebSocket|\bfetch\s*\(/.test(source), 'no networking');
  assert.ok(!/localStorage|sessionStorage|indexedDB/.test(source), 'no persistence');
  assert.ok(!/Date\.now|Math\.random|setTimeout|setInterval/.test(source), 'no clock or scheduling');
  assert.ok(!/node:fs|node:https|node:http|node:net|node:crypto/.test(source), 'no Node runtime modules');
});
