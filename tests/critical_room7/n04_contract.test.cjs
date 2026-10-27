'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');

const MODULE = '../../tools/critical_room7/android_e2e_sha_guard.mjs';
const SOURCE = path.join(__dirname, MODULE);
const REPO_ROOT = path.resolve(__dirname, '../..');

const ALLOWED_IMPORTS = /^node:(fs|fs\/promises|path|crypto|util|url|stream)$/;

async function fixture(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'df-n04-sha-guard-'));
  try {
    return await fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function sha256Of(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function makeApk(dir, name, seed) {
  const apkPath = path.join(dir, name);
  fs.mkdirSync(path.dirname(apkPath), { recursive: true });
  const bytes = [];
  for (let i = 0; i < 4096; i += 1) {
    bytes.push((seed + i * 31 + (i * i) % 251) % 256);
  }
  bytes.push(0x50, 0x4b, 0x03, 0x04);
  fs.writeFileSync(apkPath, Buffer.from(bytes));
  return apkPath;
}

function sidecarLine(apkPath, recordedName, mode) {
  const digest = crypto.createHash('sha256').update(fs.readFileSync(apkPath)).digest('hex');
  const separator = mode === 'binary' ? ' *' : '  ';
  return `${digest}${separator}${recordedName}`;
}

const load = () => import(MODULE);

test('N04 guard module exists and exports the E2E CI SHA contract', async () => {
  const guard = await load();

  assert.equal(guard.SCHEMA_VERSION, 1);
  assert.deepEqual(Object.values(guard.STATUS).sort(), ['FAIL', 'PASS']);
  for (const reason of [
    'INVALID_ARGUMENT', 'SIDECAR_NOT_FOUND', 'MALFORMED_SIDECAR', 'APK_NOT_FOUND',
    'NOT_REGULAR_FILE', 'EMPTY_FILE', 'DIGEST_MISMATCH', 'PATH_ESCAPES_BASE',
    'RECORDED_PATH_MISMATCH', 'SOURCE_SHA_NOT_FOUND', 'SOURCE_SHA_MALFORMED'
  ]) {
    assert.equal(typeof guard.REASONS[reason], 'string', `REASONS.${reason}`);
  }
  assert.equal(typeof guard.parseShaSumLine, 'function');
  assert.equal(typeof guard.parseShaSumFile, 'function');
  assert.equal(typeof guard.sha256File, 'function');
  assert.equal(typeof guard.verifyApkSha, 'function');
  assert.equal(typeof guard.verifySourceToApk, 'function');
  assert.equal(typeof guard.runCli, 'function');
});

test('N04 guard uses no network and only read-only node builtins', async () => {
  const source = fs.readFileSync(SOURCE, 'utf8');

  assert.doesNotMatch(source, /https?:\/\//);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\bXMLHttpRequest\b/);
  assert.doesNotMatch(source, /\b(?:axios|undici|node-fetch|got)\b/);
  assert.doesNotMatch(source, /['"]node:(?:http|https|net|tls|dns|dgram)['"]/);

  const specifiers = [];
  for (const match of source.matchAll(/import\s[\s\S]*?from\s*['"]([^'"]+)['"]/g)) {
    specifiers.push(match[1]);
  }
  for (const match of source.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    specifiers.push(match[1]);
  }
  assert.ok(specifiers.length > 0, 'module must declare its imports');
  for (const specifier of specifiers) {
    assert.match(
      specifier,
      ALLOWED_IMPORTS,
      `unexpected import: ${specifier}`
    );
  }
});

test('N04 parses sha256sum sidecar lines exactly like GNU output', async () => {
  const { parseShaSumLine } = await load();

  const text = parseShaSumLine('a'.repeat(64) + '  android/app/build/outputs/apk/debug/app-debug.apk');
  assert.equal(text.ok, true);
  assert.equal(text.digest, 'a'.repeat(64));
  assert.equal(text.mode, 'text');
  assert.equal(text.name, 'android/app/build/outputs/apk/debug/app-debug.apk');

  const binary = parseShaSumLine('B'.repeat(64) + ' *app-debug.apk');
  assert.equal(binary.ok, true);
  assert.equal(binary.digest, 'b'.repeat(64));
  assert.equal(binary.mode, 'binary');
  assert.equal(binary.name, 'app-debug.apk');

  const spaces = parseShaSumLine('c'.repeat(64) + '  Deep Focus v21 (debug).apk');
  assert.equal(spaces.ok, true);
  assert.equal(spaces.name, 'Deep Focus v21 (debug).apk');

  const crlf = parseShaSumLine('d'.repeat(64) + '  app-debug.apk\r\n');
  assert.equal(crlf.ok, true);
  assert.equal(crlf.name, 'app-debug.apk');

  const escaped = parseShaSumLine('\\' + 'e'.repeat(64) + '  back\\\\slash.apk');
  assert.equal(escaped.ok, true);
  assert.equal(escaped.name, 'back\\slash.apk');

  for (const bad of [
    'f'.repeat(64) + ' app-debug.apk',
    'g'.repeat(63) + '  app-debug.apk',
    'h'.repeat(64) + '  app-debug.apk',
    'zz'.repeat(32) + '  app-debug.apk',
    '  app-debug.apk',
    'i'.repeat(64) + '  ',
    ''
  ]) {
    const parsed = parseShaSumLine(bad);
    assert.equal(parsed.ok, false, `line must be rejected: ${JSON.stringify(bad)}`);
    assert.equal(typeof parsed.error, 'string');
  }
});

test('N04 verifies a real APK fixture against a CI-format apk.sha256 sidecar', async () => {
  const guard = await load();

  await fixture(async (dir) => {
    const repo = path.join(dir, 'repo');
    const apkPath = makeApk(path.join(repo, 'android', 'app', 'build', 'outputs', 'apk', 'debug'), 'app-debug.apk', 7);
    const sidecarDir = path.join(dir, 'evidence');
    fs.mkdirSync(sidecarDir);
    const shaFile = path.join(sidecarDir, 'apk.sha256');
    fs.writeFileSync(shaFile, sidecarLine(apkPath, 'android/app/build/outputs/apk/debug/app-debug.apk') + '\n');

    const report = await guard.verifyApkSha({ shaFile, baseDir: repo });

    assert.equal(report.schemaVersion, 1);
    assert.equal(report.status, guard.STATUS.PASS);
    assert.deepEqual(report.reasons, []);
    assert.equal(report.sidecar.path, shaFile);
    assert.equal(report.sidecar.entryCount, 1);
    assert.equal(report.sidecar.malformedCount, 0);
    assert.equal(report.entries.length, 1);
    const entry = report.entries[0];
    assert.equal(entry.name, 'android/app/build/outputs/apk/debug/app-debug.apk');
    assert.equal(entry.resolvedPath, apkPath);
    assert.equal(entry.resolution, 'baseDir');
    assert.equal(entry.ok, true);
    assert.equal(entry.sizeBytes, fs.statSync(apkPath).size);
    assert.equal(entry.expectedSha256, entry.actualSha256);

    const source = fs.readFileSync(shaFile, 'utf8');
    assert.equal(report.entries[0].expectedSha256, source.slice(0, 64));
  });
});

test('N04 fails closed on tampered APK bytes with both digests recorded', async () => {
  const guard = await load();

  await fixture(async (dir) => {
    const repo = path.join(dir, 'repo');
    const apkPath = makeApk(path.join(repo), 'app-debug.apk', 11);
    const shaFile = path.join(dir, 'apk.sha256');
    fs.writeFileSync(shaFile, sidecarLine(apkPath, 'app-debug.apk') + '\n');
    fs.appendFileSync(apkPath, Buffer.from([0xde, 0xad, 0xbe, 0xef]));

    const report = await guard.verifyApkSha({ shaFile, baseDir: repo });

    assert.equal(report.status, guard.STATUS.FAIL);
    assert.ok(report.reasons.includes(guard.REASONS.DIGEST_MISMATCH));
    const entry = report.entries[0];
    assert.equal(entry.ok, false);
    assert.equal(entry.reason, guard.REASONS.DIGEST_MISMATCH);
    assert.equal(entry.expectedSha256, fs.readFileSync(shaFile, 'utf8').slice(0, 64));
    assert.equal(entry.actualSha256, await sha256Of(apkPath));
    assert.notEqual(entry.expectedSha256, entry.actualSha256);
  });
});

test('N04 fails closed on malformed, missing or unsafe sidecar inputs', async () => {
  const guard = await load();
  const { REASONS } = guard;

  await fixture(async (dir) => {
    const apkPath = makeApk(dir, 'app-debug.apk', 13);

    const missing = await guard.verifyApkSha({ shaFile: path.join(dir, 'absent.sha256'), baseDir: dir });
    assert.equal(missing.status, guard.STATUS.FAIL);
    assert.ok(missing.reasons.includes(REASONS.SIDECAR_NOT_FOUND));
    assert.deepEqual(missing.entries, []);

    const emptyReport = await guard.verifyApkSha({ sidecarText: '', baseDir: dir });
    assert.equal(emptyReport.status, guard.STATUS.FAIL);
    assert.ok(emptyReport.reasons.includes(REASONS.MALFORMED_SIDECAR));

    const singleSpace = await guard.verifyApkSha({ sidecarText: 'a'.repeat(64) + ' app-debug.apk', baseDir: dir });
    assert.equal(singleSpace.status, guard.STATUS.FAIL);
    assert.ok(singleSpace.reasons.includes(REASONS.MALFORMED_SIDECAR));
    assert.equal(singleSpace.sidecar.malformedCount, 1);

    const shortDigest = await guard.verifyApkSha({ sidecarText: 'a'.repeat(63) + '  app-debug.apk', baseDir: dir });
    assert.ok(shortDigest.reasons.includes(REASONS.MALFORMED_SIDECAR));

    const nonHex = await guard.verifyApkSha({ sidecarText: 'z'.repeat(64) + '  app-debug.apk', baseDir: dir });
    assert.ok(nonHex.reasons.includes(REASONS.MALFORMED_SIDECAR));

    const missingApk = await guard.verifyApkSha({ sidecarText: 'a'.repeat(64) + '  absent.apk', baseDir: dir });
    assert.equal(missingApk.status, guard.STATUS.FAIL);
    assert.ok(missingApk.reasons.includes(REASONS.APK_NOT_FOUND));
    assert.equal(missingApk.entries[0].reason, REASONS.APK_NOT_FOUND);

    const linkPath = path.join(dir, 'link.apk');
    fs.symlinkSync(apkPath, linkPath);
    const symlinked = await guard.verifyApkSha({ sidecarText: 'a'.repeat(64) + '  link.apk', baseDir: dir });
    assert.equal(symlinked.status, guard.STATUS.FAIL);
    assert.ok(symlinked.reasons.includes(REASONS.NOT_REGULAR_FILE));

    fs.mkdirSync(path.join(dir, 'outside'));
    const outsideApk = makeApk(path.join(dir, 'outside'), 'secret.apk', 17);
    const traversal = await guard.verifyApkSha({
      sidecarText: sidecarLine(outsideApk, '../outside/secret.apk'),
      baseDir: dir
    });
    assert.equal(traversal.status, guard.STATUS.FAIL);
    assert.ok(traversal.reasons.includes(REASONS.PATH_ESCAPES_BASE));
    assert.equal(traversal.entries[0].resolvedPath, null);

    const explicit = await guard.verifyApkSha({
      sidecarText: 'a'.repeat(64) + '  other-app.apk',
      apkPath,
      baseDir: dir
    });
    assert.equal(explicit.status, guard.STATUS.FAIL);
    assert.ok(explicit.reasons.includes(REASONS.RECORDED_PATH_MISMATCH));

    const emptyFile = path.join(dir, 'empty.apk');
    fs.writeFileSync(emptyFile, '');
    const emptyDigest = crypto.createHash('sha256').update('').digest('hex');
    const emptyApk = await guard.verifyApkSha({
      sidecarText: `${emptyDigest}  empty.apk`,
      baseDir: dir
    });
    assert.equal(emptyApk.status, guard.STATUS.FAIL);
    assert.ok(emptyApk.reasons.includes(REASONS.EMPTY_FILE));
  });
});

test('N04 accepts CI-compatible sidecar variants and sidecar-directory resolution', async () => {
  const guard = await load();

  await fixture(async (dir) => {
    const apkPath = makeApk(dir, 'app-debug.apk', 19);

    const upper = await guard.verifyApkSha({
      sidecarText: sidecarLine(apkPath, 'app-debug.apk').replace(/^[0-9a-f]{64}/, (digest) => digest.toUpperCase()),
      baseDir: dir
    });
    assert.equal(upper.status, guard.STATUS.PASS);

    const binaryMode = await guard.verifyApkSha({
      sidecarText: sidecarLine(apkPath, 'app-debug.apk', 'binary'),
      baseDir: dir
    });
    assert.equal(binaryMode.status, guard.STATUS.PASS);

    const crlf = await guard.verifyApkSha({
      sidecarText: sidecarLine(apkPath, 'app-debug.apk') + '\r\n',
      baseDir: dir
    });
    assert.equal(crlf.status, guard.STATUS.PASS);

    const spacedName = makeApk(dir, 'Deep Focus v21 (debug).apk', 23);
    const spacesInName = await guard.verifyApkSha({
      sidecarText: sidecarLine(spacedName, 'Deep Focus v21 (debug).apk'),
      baseDir: dir
    });
    assert.equal(spacesInName.status, guard.STATUS.PASS);
    assert.equal(spacesInName.entries[0].name, 'Deep Focus v21 (debug).apk');

    const evidenceDir = path.join(dir, 'evidence');
    fs.mkdirSync(evidenceDir);
    fs.copyFileSync(apkPath, path.join(evidenceDir, 'app-debug.apk'));
    fs.writeFileSync(
      path.join(evidenceDir, 'apk.sha256'),
      sidecarLine(apkPath, 'android/app/build/outputs/apk/debug/app-debug.apk') + '\n'
    );
    const resolved = await guard.verifyApkSha({ shaFile: path.join(evidenceDir, 'apk.sha256') });
    assert.equal(resolved.status, guard.STATUS.PASS);
    assert.equal(resolved.entries[0].resolution, 'sidecarDir');
    assert.equal(resolved.entries[0].resolvedPath, path.join(evidenceDir, 'app-debug.apk'));

    const escapedName = makeApk(evidenceDir, 'back\\slash.apk', 29);
    const escaped = await guard.verifyApkSha({
      shaFile: path.join(evidenceDir, 'escaped.sha256'),
      sidecarText: '\\' + sidecarLine(escapedName, 'back\\\\slash.apk') + '\n'
    });
    assert.equal(escaped.status, guard.STATUS.PASS);
    assert.equal(escaped.entries[0].name, 'back\\slash.apk');
    assert.equal(escaped.entries[0].resolvedPath, escapedName);

    const explicitPath = await guard.verifyApkSha({
      shaFile: path.join(evidenceDir, 'explicit.sha256'),
      sidecarText: sidecarLine(apkPath, apkPath) + '\n',
      apkPath,
      baseDir: dir
    });
    assert.equal(explicitPath.status, guard.STATUS.PASS);
    assert.equal(explicitPath.entries[0].resolution, 'explicit');

    const explicitBaseRelative = await guard.verifyApkSha({
      shaFile: path.join(evidenceDir, 'explicit2.sha256'),
      sidecarText: sidecarLine(apkPath, 'app-debug.apk') + '\n',
      apkPath,
      baseDir: dir
    });
    assert.equal(explicitBaseRelative.status, guard.STATUS.PASS);
    assert.equal(explicitBaseRelative.entries[0].resolution, 'explicit');
  });
});

test('N04 binds source_sha.txt to the verified APK digest in one bundle verdict', async () => {
  const guard = await load();

  await fixture(async (dir) => {
    const bundle = path.join(dir, 'track05-android');
    fs.mkdirSync(bundle);
    const apkPath = makeApk(bundle, 'app-debug.apk', 31);
    fs.writeFileSync(path.join(bundle, 'apk.sha256'), sidecarLine(apkPath, 'app-debug.apk') + '\n');
    const gitSha = 'a'.repeat(40);
    fs.writeFileSync(path.join(bundle, 'source_sha.txt'), gitSha + '\n');

    const pass = await guard.verifySourceToApk({ bundleDir: bundle });
    assert.equal(pass.status, guard.STATUS.PASS);
    assert.deepEqual(pass.reasons, []);
    assert.equal(pass.source.present, true);
    assert.equal(pass.source.sha, gitSha);
    assert.equal(pass.source.path, path.join(bundle, 'source_sha.txt'));
    assert.equal(pass.entries[0].ok, true);

    fs.appendFileSync(apkPath, Buffer.from([0x0b, 0xad]));
    const tampered = await guard.verifySourceToApk({ bundleDir: bundle });
    assert.equal(tampered.status, guard.STATUS.FAIL);
    assert.ok(tampered.reasons.includes(guard.REASONS.DIGEST_MISMATCH));
    assert.equal(tampered.source.sha, gitSha);

    fs.writeFileSync(path.join(bundle, 'apk.sha256'), sidecarLine(apkPath, 'app-debug.apk') + '\n');
    fs.writeFileSync(path.join(bundle, 'source_sha.txt'), 'not-a-git-sha\n');
    const badSource = await guard.verifySourceToApk({ bundleDir: bundle });
    assert.equal(badSource.status, guard.STATUS.FAIL);
    assert.ok(badSource.reasons.includes(guard.REASONS.SOURCE_SHA_MALFORMED));

    fs.unlinkSync(path.join(bundle, 'source_sha.txt'));
    const absentSource = await guard.verifySourceToApk({ bundleDir: bundle });
    assert.equal(absentSource.status, guard.STATUS.FAIL);
    assert.ok(absentSource.reasons.includes(guard.REASONS.SOURCE_SHA_NOT_FOUND));

    fs.writeFileSync(path.join(bundle, 'source_sha.txt'), 'B'.repeat(64) + '\n');
    const sha256Repo = await guard.verifySourceToApk({ bundleDir: bundle });
    assert.equal(sha256Repo.source.sha, 'b'.repeat(64));
  });
});

test('N04 guard passes against the read-only v21 app-release.apk fixture in this repo', async () => {
  const guard = await load();
  const repoApk = path.join(REPO_ROOT, 'app-release.apk');

  assert.equal(fs.existsSync(repoApk), true, 'repo fixture app-release.apk must exist');
  const expectedDigest = await sha256Of(repoApk);
  const expectedSize = fs.statSync(repoApk).size;

  await fixture(async (dir) => {
    const shaFile = path.join(dir, 'apk.sha256');
    fs.writeFileSync(shaFile, `${expectedDigest}  app-release.apk\n`);

    const report = await guard.verifyApkSha({ shaFile, baseDir: REPO_ROOT });

    assert.equal(report.status, guard.STATUS.PASS);
    assert.deepEqual(report.reasons, []);
    assert.equal(report.entries[0].resolvedPath, repoApk);
    assert.equal(report.entries[0].sizeBytes, expectedSize);
    assert.equal(report.entries[0].actualSha256, expectedDigest);
  });

  const streamed = await guard.sha256File(repoApk);
  assert.equal(streamed.digest, expectedDigest);
  assert.equal(streamed.sizeBytes, expectedSize);
});

test('N04 CLI exits 0 on PASS, 1 on FAIL, 2 on usage without any network', async () => {
  const guard = await load();
  const guardPath = SOURCE;

  await fixture((dir) => {
    const bundle = path.join(dir, 'bundle');
    fs.mkdirSync(bundle);
    const apkPath = makeApk(bundle, 'app-debug.apk', 37);
    fs.writeFileSync(path.join(bundle, 'apk.sha256'), sidecarLine(apkPath, 'app-debug.apk') + '\n');
    fs.writeFileSync(path.join(bundle, 'source_sha.txt'), 'c'.repeat(40) + '\n');

    const pass = cp.spawnSync(process.execPath, [guardPath, '--bundle-dir', bundle, '--json'], {
      encoding: 'utf8', timeout: 30000
    });
    assert.equal(pass.status, 0, pass.stderr);
    const passReport = JSON.parse(pass.stdout);
    assert.equal(passReport.status, guard.STATUS.PASS);
    assert.equal(passReport.source.sha, 'c'.repeat(40));

    fs.appendFileSync(apkPath, Buffer.from([0xba, 0xd0]));
    const fail = cp.spawnSync(process.execPath, [guardPath, '--bundle-dir', bundle, '--json'], {
      encoding: 'utf8', timeout: 30000
    });
    assert.equal(fail.status, 1);
    const failReport = JSON.parse(fail.stdout);
    assert.equal(failReport.status, guard.STATUS.FAIL);
    assert.ok(failReport.reasons.includes(guard.REASONS.DIGEST_MISMATCH));

    const human = cp.spawnSync(process.execPath, [guardPath, '--bundle-dir', bundle], {
      encoding: 'utf8', timeout: 30000
    });
    assert.equal(human.status, 1);
    assert.match(human.stdout, /FAIL/);
    assert.match(human.stdout, /DIGEST_MISMATCH/);

    const noArgs = cp.spawnSync(process.execPath, [guardPath], { encoding: 'utf8', timeout: 30000 });
    assert.equal(noArgs.status, 2);
    assert.match(noArgs.stderr, /usage/i);

    const unknown = cp.spawnSync(process.execPath, [guardPath, '--network', 'on'], {
      encoding: 'utf8', timeout: 30000
    });
    assert.equal(unknown.status, 2);

    const explicitApk = cp.spawnSync(process.execPath, [
      guardPath, '--sha-file', path.join(bundle, 'apk.sha256'), '--apk', apkPath, '--base-dir', bundle, '--json'
    ], { encoding: 'utf8', timeout: 30000 });
    assert.equal(explicitApk.status, 1);
    assert.equal(JSON.parse(explicitApk.stdout).entries[0].resolution, 'explicit');
  });
});
