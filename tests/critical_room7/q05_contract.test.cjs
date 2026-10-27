'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const MODULE = '../../tools/critical_room7/nature_audio_license_audit.mjs';
const MODULE_FILE = path.resolve(__dirname, MODULE);
const WEB_ASSETS = path.join(ROOT, 'android/app/src/main/assets/web');
const LIBRARY = path.join(WEB_ASSETS, 'nature_library_v2.js');
const COMMONS = path.join(ROOT, 'tools/nature_audio/commons_intake.json');

const OGG = Buffer.from([
  0x4f, 0x67, 0x67, 0x53, 0x00, 0x02, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
]);
const MP3 = Buffer.from([
  0xff, 0xfb, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00
]);
const WAV = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0x24, 0x00, 0x00, 0x00]),
  Buffer.from('WAVE'),
  Buffer.from('fmt ')
]);

function digest(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function writeFixture(root, relative, data) {
  const absolute = path.join(root, relative);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, data);
  return absolute;
}

function withFixture(callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'q05-audio-'));
  try {
    return callback(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function record(id, file, license, data, overrides = {}) {
  const result = {
    id,
    file,
    license,
    author: 'Original Recorder',
    sourceUrl: 'https://example.org/source/' + id,
    license_evidence: 'https://example.org/license/' + id,
    sha256: digest(data),
    approved_for_runtime: true,
    ready: true,
    human_audio_review: 'PASSED',
    status: 'APPROVED',
    ...overrides
  };
  return result;
}

function load() {
  return import(MODULE);
}

function itemFor(report, id) {
  const item = report.items.find((entry) => entry.id === id);
  assert.ok(item, 'missing audit item ' + id);
  return item;
}

test('Q05 is a standalone read-only offline registry validator', async () => {
  const { SCHEMA_VERSION, POLICY_VERSION, VERDICTS, allowedLicenses } = await load();

  assert.equal(SCHEMA_VERSION, 1);
  assert.equal(POLICY_VERSION, 1);
  assert.equal(VERDICTS.APPROVED, 'APPROVED');
  assert.equal(VERDICTS.QUARANTINED, 'QUARANTINED');
  assert.ok(allowedLicenses.includes('CC0-1.0'));
  assert.ok(allowedLicenses.includes('MIT'));
  assert.ok(allowedLicenses.includes('CC-BY-4.0'));

  const source = fs.readFileSync(MODULE_FILE, 'utf8');
  assert.match(source, /^export\s+/m);
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket|child_process/);
  assert.doesNotMatch(source, /\bspawn\s*\(|\bexec\s*\(/);
  assert.doesNotMatch(source, /writeFile|appendFile|unlink|rmSync|renameSync|mkdirSync/);
  assert.doesNotMatch(source, /https?:\/\/(?!\S*example)/);
});

test('Q05 fails closed on the real v21 library overclaim without touching media', async () => {
  const { auditRegistry } = await load();
  const library = require(LIBRARY);
  const forestFile = path.join(WEB_ASSETS, 'sounds/forest.ogg');
  const windFile = path.join(WEB_ASSETS, 'sounds/wind.ogg');
  const before = [forestFile, windFile].map((file) => ({
    buffer: fs.readFileSync(file),
    mtimeMs: fs.statSync(file).mtimeMs
  }));

  const report = auditRegistry(library.entries, { assetRoot: WEB_ASSETS });

  assert.equal(report.status, 'QUARANTINED');
  assert.deepEqual(report.approved, []);
  assert.equal(report.counts.approved, 0);
  assert.equal(report.counts.total, library.entries.length);
  assert.deepEqual(
    [...report.quarantined].sort(),
    library.entries.map((entry) => entry.id).sort()
  );
  assert.ok(report.overclaims.includes('forest'));
  assert.ok(report.overclaims.includes('wind'));
  assert.equal(report.networkUsed, false);
  assert.equal(report.wroteRegistry, false);
  assert.equal(report.androidPass, false);

  const forest = itemFor(report, 'forest');
  const wind = itemFor(report, 'wind');
  for (const item of [forest, wind]) {
    assert.equal(item.verdict, 'QUARANTINED');
    assert.equal(item.declaredReady, true);
    assert.ok(item.reasons.includes('LICENSE_MISSING'));
    assert.ok(item.reasons.includes('AUDIO_DIGEST_MISSING'));
    assert.ok(item.reasons.includes('RUNTIME_APPROVAL_MISSING'));
    assert.equal(item.audio.format, 'ogg');
    assert.equal(item.audio.formatMatchesExtension, true);
  }

  [forestFile, windFile].forEach((file, index) => {
    assert.deepEqual(fs.readFileSync(file), before[index].buffer);
    assert.equal(fs.statSync(file).mtimeMs, before[index].mtimeMs);
  });
});

test('Q05 approves only explicit CC0, MIT and CC BY approvals with matching real audio', async () => {
  await withFixture(async (root) => {
    const { auditRegistry } = await load();
    writeFixture(root, 'sounds/rain.ogg', OGG);
    writeFixture(root, 'audio/birds.mp3', MP3);
    writeFixture(root, 'completion_alerts/tap.wav', WAV);

    const records = [
      record('rain', 'sounds/rain.ogg', 'CC0-1.0', OGG),
      record('birds', 'audio/birds.mp3', 'MIT', MP3),
      record('tap', 'completion_alerts/tap.wav', 'CC BY 4.0', WAV)
    ];
    const before = JSON.stringify(records);
    const report = auditRegistry(records, { assetRoot: root });

    assert.equal(JSON.stringify(records), before);
    assert.equal(report.status, 'PASS');
    assert.deepEqual(report.approved, ['birds', 'rain', 'tap']);
    assert.deepEqual(report.quarantined, []);
    assert.deepEqual(report.overclaims, []);
    assert.deepEqual(
      report.items.map((item) => [item.id, item.license, item.audio.format]),
      [
        ['rain', 'CC0-1.0', 'ogg'],
        ['birds', 'MIT', 'mp3'],
        ['tap', 'CC-BY-4.0', 'wav']
      ]
    );
    for (const item of report.items) {
      assert.deepEqual(item.reasons, []);
      assert.equal(item.audio.formatMatchesExtension, true);
      assert.equal(item.audio.sha256, digest(item.id === 'rain' ? OGG : item.id === 'birds' ? MP3 : WAV));
    }
  });
});

test('Q05 quarantines HTML impostors, extension mismatches and digest mismatches', async () => {
  await withFixture(async (root) => {
    const { auditRegistry } = await load();
    const html = Buffer.from('<!doctype html><html><body>404</body></html>');
    writeFixture(root, 'sounds/html.ogg', html);
    writeFixture(root, 'sounds/wrong.mp3', OGG);
    writeFixture(root, 'sounds/digest.ogg', OGG);

    const report = auditRegistry([
      record('html', 'sounds/html.ogg', 'CC0-1.0', html),
      record('wrong-extension', 'sounds/wrong.mp3', 'CC0-1.0', OGG),
      record('wrong-digest', 'sounds/digest.ogg', 'CC0-1.0', OGG, {
        sha256: 'a'.repeat(64)
      })
    ], { assetRoot: root });

    assert.equal(report.status, 'QUARANTINED');
    assert.deepEqual(report.approved, []);
    assert.deepEqual(report.quarantined, ['html', 'wrong-digest', 'wrong-extension']);
    assert.ok(itemFor(report, 'html').reasons.includes('AUDIO_FORMAT_INVALID'));
    assert.ok(itemFor(report, 'wrong-extension').reasons.includes('AUDIO_FORMAT_MISMATCH'));
    assert.ok(itemFor(report, 'wrong-digest').reasons.includes('AUDIO_DIGEST_MISMATCH'));
  });
});

test('Q05 never auto-approves licences, missing human review or unapproved runtime flags', async () => {
  await withFixture(async (root) => {
    const { auditRegistry } = await load();
    writeFixture(root, 'sounds/rain.ogg', OGG);

    const variants = [
      ['no-approval', { approved_for_runtime: undefined }, 'RUNTIME_APPROVAL_MISSING'],
      ['false-approval', { approved_for_runtime: false }, 'RUNTIME_NOT_APPROVED'],
      ['string-approval', { approved_for_runtime: 'true' }, 'RUNTIME_NOT_APPROVED'],
      ['not-ready', { ready: false }, 'READY_NOT_CONFIRMED'],
      ['not-reviewed', { human_audio_review: 'NOT_TESTED' }, 'HUMAN_REVIEW_NOT_PASSED'],
      ['quarantined', { status: 'QUARANTINED_NOT_APPROVED' }, 'STATUS_QUARANTINED'],
      ['pd-author', { license: 'PD-author' }, 'LICENSE_OUTSIDE_POLICY'],
      ['noncommercial', { license: 'CC-BY-NC-4.0' }, 'LICENSE_OUTSIDE_POLICY'],
      ['share-alike', { license: 'CC-BY-SA-4.0' }, 'LICENSE_OUTSIDE_POLICY'],
      ['http-source', { sourceUrl: 'http://example.org/rain' }, 'SOURCE_URL_NOT_HTTPS'],
      ['no-evidence', { license_evidence: '' }, 'LICENSE_EVIDENCE_MISSING'],
      ['no-digest', { sha256: undefined }, 'AUDIO_DIGEST_MISSING'],
      ['bad-digest', { sha256: 'not-a-digest' }, 'AUDIO_DIGEST_INVALID']
    ];

    const records = variants.map(([id, overrides]) =>
      record(id, 'sounds/rain.ogg', 'CC0-1.0', OGG, overrides)
    );
    const report = auditRegistry(records, { assetRoot: root });

    assert.equal(report.status, 'QUARANTINED');
    assert.deepEqual(report.approved, []);
    assert.equal(report.counts.quarantined, variants.length);
    for (const [id, , reason] of variants) {
      const item = itemFor(report, id);
      assert.equal(item.verdict, 'QUARANTINED', id);
      assert.ok(item.reasons.includes(reason), id + ': ' + item.reasons.join(','));
    }
  });
});

test('Q05 keeps every real commons intake candidate quarantined', async () => {
  const { auditRegistry } = await load();
  const manifest = require(COMMONS);
  const report = auditRegistry(manifest, {
    assetRoot: path.join(ROOT, 'tools/nature_audio')
  });

  assert.equal(
    report.counts.total,
    manifest.items.length + manifest.replacement_candidates.length
  );
  assert.equal(report.counts.approved, 0);
  assert.deepEqual(report.approved, []);
  assert.equal(report.quarantined.length, report.counts.total);
  assert.deepEqual(report.overclaims, []);
  for (const item of report.items) {
    assert.equal(item.verdict, 'QUARANTINED', item.id);
    assert.ok(item.reasons.includes('AUDIO_FILE_MISSING'), item.id);
  }
});

test('Q05 rejects malformed registries and options instead of inventing approvals', async () => {
  const { auditRegistry, classifyLicense, sniffAudioFormat } = await load();

  assert.throws(() => classifyLicense(null), TypeError);
  assert.throws(() => classifyLicense(42), TypeError);
  assert.throws(() => auditRegistry(null), TypeError);
  assert.throws(() => auditRegistry({}), TypeError);
  assert.throws(() => auditRegistry({ items: 'bad' }), TypeError);
  assert.throws(() => auditRegistry([], { assetRoot: 42 }), TypeError);

  assert.deepEqual(sniffAudioFormat(Buffer.from('not audio')), {
    format: null,
    valid: false,
    reason: 'AUDIO_FORMAT_INVALID'
  });
  assert.equal(sniffAudioFormat(OGG).format, 'ogg');
  assert.equal(sniffAudioFormat(MP3).format, 'mp3');
  assert.equal(sniffAudioFormat(WAV).format, 'wav');

  const empty = auditRegistry([]);
  assert.equal(empty.status, 'EMPTY');
  assert.equal(empty.counts.total, 0);
  assert.deepEqual(empty.approved, []);
});
