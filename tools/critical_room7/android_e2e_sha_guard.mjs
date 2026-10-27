import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const SCHEMA_VERSION = 1;

export const STATUS = Object.freeze({ PASS: 'PASS', FAIL: 'FAIL' });

export const REASONS = Object.freeze({
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',
  SIDECAR_NOT_FOUND: 'SIDECAR_NOT_FOUND',
  MALFORMED_SIDECAR: 'MALFORMED_SIDECAR',
  APK_NOT_FOUND: 'APK_NOT_FOUND',
  NOT_REGULAR_FILE: 'NOT_REGULAR_FILE',
  EMPTY_FILE: 'EMPTY_FILE',
  DIGEST_MISMATCH: 'DIGEST_MISMATCH',
  PATH_ESCAPES_BASE: 'PATH_ESCAPES_BASE',
  RECORDED_PATH_MISMATCH: 'RECORDED_PATH_MISMATCH',
  SOURCE_SHA_NOT_FOUND: 'SOURCE_SHA_NOT_FOUND',
  SOURCE_SHA_MALFORMED: 'SOURCE_SHA_MALFORMED'
});

const SHA_LINE_PATTERN = /^([0-9a-fA-F]{64}) ([ *])(.*)$/;
const SOURCE_SHA_PATTERN = /^(?:[0-9a-fA-F]{40}|[0-9a-fA-F]{64})$/;
const HASH_CHUNK_BYTES = 8 * 1024 * 1024;
const DEFAULT_SIDECAR_NAME = 'apk.sha256';
const DEFAULT_SOURCE_NAME = 'source_sha.txt';

function unescapeSidecarName(name) {
  return name.replace(/\\(\\|n)/g, (match, code) => (code === 'n' ? '\n' : '\\'));
}

export function parseShaSumLine(rawLine) {
  if (typeof rawLine !== 'string') {
    return { ok: false, error: 'line must be a string' };
  }
  const line = rawLine.replace(/\r\n?$/, '');
  if (line.length === 0) {
    return { ok: false, error: 'empty line' };
  }
  let body = line;
  let escaped = false;
  if (body.startsWith('\\')) {
    escaped = true;
    body = body.slice(1);
  }
  const match = SHA_LINE_PATTERN.exec(body);
  if (!match) {
    return { ok: false, error: 'malformed sha256sum line' };
  }
  const name = escaped ? unescapeSidecarName(match[3]) : match[3];
  if (name.length === 0) {
    return { ok: false, error: 'missing file name' };
  }
  return {
    ok: true,
    digest: match[1].toLowerCase(),
    mode: match[2] === '*' ? 'binary' : 'text',
    name,
    escaped
  };
}

export function parseShaSumFile(text) {
  const entries = [];
  const malformed = [];
  if (typeof text !== 'string') {
    return { entries, malformed };
  }
  const lines = text.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].replace(/\r$/, '');
    if (line.trim().length === 0) {
      continue;
    }
    const parsed = parseShaSumLine(line);
    if (parsed.ok) {
      entries.push(parsed);
    } else {
      malformed.push({ index, line, error: parsed.error });
    }
  }
  return { entries, malformed };
}

export async function sha256File(filePath) {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const hash = crypto.createHash('sha256');
    const buffer = Buffer.alloc(HASH_CHUNK_BYTES);
    let sizeBytes = 0;
    for (;;) {
      const { bytesRead } = await handle.read(buffer, 0, HASH_CHUNK_BYTES, null);
      if (bytesRead === 0) {
        break;
      }
      hash.update(buffer.subarray(0, bytesRead));
      sizeBytes += bytesRead;
    }
    return { digest: hash.digest('hex'), sizeBytes };
  } finally {
    await handle.close();
  }
}

function equalDigests(expected, actual) {
  const left = Buffer.from(expected.toLowerCase(), 'utf8');
  const right = Buffer.from(actual.toLowerCase(), 'utf8');
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function withinBase(candidate, base) {
  const relative = path.relative(base, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function classifyTarget(candidate) {
  let stats;
  try {
    stats = fs.lstatSync(candidate);
  } catch (error) {
    return { reason: REASONS.APK_NOT_FOUND };
  }
  if (stats.isSymbolicLink() || !stats.isFile()) {
    return { reason: REASONS.NOT_REGULAR_FILE };
  }
  return { stats };
}

function recordedNameMatchesExplicit(name, apkPath, baseDir) {
  if (name === apkPath) {
    return true;
  }
  if (name === path.basename(apkPath)) {
    return true;
  }
  const resolvedApk = path.resolve(apkPath);
  if (name === resolvedApk) {
    return true;
  }
  const relativeApk = path.relative(baseDir, resolvedApk);
  return relativeApk.length > 0 && name === relativeApk;
}

function resolveEntryTarget(entry, options) {
  const { apkPath, baseDir, sidecarDir } = options;
  if (apkPath) {
    if (!recordedNameMatchesExplicit(entry.name, apkPath, baseDir)) {
      return { reason: REASONS.RECORDED_PATH_MISMATCH, resolution: 'explicit', resolvedPath: null };
    }
    const resolvedApk = path.resolve(apkPath);
    return { candidate: resolvedApk, resolution: 'explicit', resolvedPath: resolvedApk };
  }
  const name = entry.name;
  if (path.isAbsolute(name)) {
    const normalized = path.normalize(name);
    return { candidate: normalized, resolution: 'absolute', resolvedPath: normalized };
  }
  const primary = path.resolve(baseDir, name);
  if (!withinBase(primary, baseDir)) {
    return { reason: REASONS.PATH_ESCAPES_BASE, resolution: 'baseDir', resolvedPath: null };
  }
  if (fs.existsSync(primary)) {
    return { candidate: primary, resolution: 'baseDir', resolvedPath: primary };
  }
  const sidecarFull = path.resolve(sidecarDir, name);
  if (withinBase(sidecarFull, sidecarDir) && fs.existsSync(sidecarFull)) {
    return { candidate: sidecarFull, resolution: 'sidecarDir', resolvedPath: sidecarFull };
  }
  const sidecarBase = path.resolve(sidecarDir, path.basename(name));
  if (withinBase(sidecarBase, sidecarDir) && fs.existsSync(sidecarBase)) {
    return { candidate: sidecarBase, resolution: 'sidecarDir', resolvedPath: sidecarBase };
  }
  return { reason: REASONS.APK_NOT_FOUND, resolution: 'baseDir', resolvedPath: primary };
}

function emptyReport() {
  return {
    schemaVersion: SCHEMA_VERSION,
    status: STATUS.FAIL,
    reasons: [],
    sidecar: { path: null, entryCount: 0, malformedCount: 0 },
    entries: [],
    source: { present: false, path: null, sha: null }
  };
}

function addReason(report, reason) {
  if (!report.reasons.includes(reason)) {
    report.reasons.push(reason);
  }
}

async function verifySidecar(report, options) {
  const hasText = options.sidecarText !== undefined;
  report.sidecar.path = options.shaFile || null;
  let parsed;
  if (hasText) {
    parsed = parseShaSumFile(options.sidecarText);
  } else {
    try {
      parsed = parseShaSumFile(fs.readFileSync(options.shaFile, 'utf8'));
    } catch (error) {
      addReason(report, REASONS.SIDECAR_NOT_FOUND);
      return;
    }
  }
  report.sidecar.entryCount = parsed.entries.length;
  report.sidecar.malformedCount = parsed.malformed.length;
  if (parsed.malformed.length > 0 || parsed.entries.length === 0) {
    addReason(report, REASONS.MALFORMED_SIDECAR);
  }
  for (const entry of parsed.entries) {
    const record = {
      name: entry.name,
      resolvedPath: null,
      resolution: null,
      mode: entry.mode,
      expectedSha256: entry.digest,
      actualSha256: null,
      sizeBytes: null,
      ok: false,
      reason: null
    };
    const resolved = resolveEntryTarget(entry, options);
    record.resolution = resolved.resolution || null;
    if (resolved.resolvedPath !== null && resolved.resolvedPath !== undefined) {
      record.resolvedPath = resolved.resolvedPath;
    }
    if (resolved.reason) {
      record.reason = resolved.reason;
      report.entries.push(record);
      addReason(report, resolved.reason);
      continue;
    }
    record.resolvedPath = resolved.candidate;
    const classified = classifyTarget(resolved.candidate);
    if (classified.reason) {
      record.reason = classified.reason;
      report.entries.push(record);
      addReason(report, classified.reason);
      continue;
    }
    let hashed;
    try {
      hashed = await sha256File(resolved.candidate);
    } catch (error) {
      record.reason = REASONS.APK_NOT_FOUND;
      report.entries.push(record);
      addReason(report, record.reason);
      continue;
    }
    record.actualSha256 = hashed.digest;
    record.sizeBytes = hashed.sizeBytes;
    if (hashed.sizeBytes === 0) {
      record.reason = REASONS.EMPTY_FILE;
      report.entries.push(record);
      addReason(report, record.reason);
      continue;
    }
    if (equalDigests(entry.digest, hashed.digest)) {
      record.ok = true;
    } else {
      record.reason = REASONS.DIGEST_MISMATCH;
      addReason(report, REASONS.DIGEST_MISMATCH);
    }
    report.entries.push(record);
  }
}

function firstString(value) {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export async function verifyApkSha(options = {}) {
  const report = emptyReport();
  const sidecarText = typeof options.sidecarText === 'string' ? options.sidecarText : undefined;
  const shaFile = firstString(options.shaFile);
  if (sidecarText === undefined && shaFile === undefined) {
    addReason(report, REASONS.INVALID_ARGUMENT);
    return report;
  }
  const baseDir = path.resolve(firstString(options.baseDir) || process.cwd());
  const baseStats = fs.statSync(baseDir, { throwIfNoEntry: false });
  if (!baseStats || !baseStats.isDirectory()) {
    addReason(report, REASONS.INVALID_ARGUMENT);
    return report;
  }
  const sidecarDir = path.resolve(
    firstString(options.sidecarDir) || (shaFile ? path.dirname(shaFile) : baseDir)
  );
  await verifySidecar(report, {
    sidecarText,
    shaFile,
    apkPath: firstString(options.apkPath),
    baseDir,
    sidecarDir
  });
  report.status = report.reasons.length === 0 ? STATUS.PASS : STATUS.FAIL;
  return report;
}

export async function verifySourceToApk(options = {}) {
  const report = emptyReport();
  const bundleDir = firstString(options.bundleDir) ? path.resolve(options.bundleDir) : undefined;
  const shaFile = firstString(options.shaFile);
  if (!bundleDir && !shaFile) {
    addReason(report, REASONS.INVALID_ARGUMENT);
    return report;
  }
  const baseDir = path.resolve(firstString(options.baseDir) || bundleDir || process.cwd());
  const sidecarPath = shaFile || path.join(bundleDir, firstString(options.sidecarName) || DEFAULT_SIDECAR_NAME);
  let sourcePath;
  if (firstString(options.sourceFile)) {
    sourcePath = options.sourceFile;
  } else if (bundleDir) {
    sourcePath = path.join(bundleDir, firstString(options.sourceName) || DEFAULT_SOURCE_NAME);
  } else if (shaFile) {
    sourcePath = path.join(path.dirname(shaFile), firstString(options.sourceName) || DEFAULT_SOURCE_NAME);
  }
  if (sourcePath) {
    report.source.path = sourcePath;
    let sourceText = null;
    try {
      sourceText = fs.readFileSync(sourcePath, 'utf8');
    } catch (error) {
      addReason(report, REASONS.SOURCE_SHA_NOT_FOUND);
    }
    if (sourceText !== null) {
      const trimmed = sourceText.trim();
      if (SOURCE_SHA_PATTERN.test(trimmed)) {
        report.source.present = true;
        report.source.sha = trimmed.toLowerCase();
      } else {
        addReason(report, REASONS.SOURCE_SHA_MALFORMED);
      }
    }
  }
  const sidecarReport = await verifyApkSha({
    shaFile: sidecarPath,
    apkPath: options.apkPath,
    baseDir,
    sidecarDir: bundleDir || path.dirname(sidecarPath)
  });
  report.sidecar = sidecarReport.sidecar;
  report.entries = sidecarReport.entries;
  for (const reason of sidecarReport.reasons) {
    addReason(report, reason);
  }
  report.status = report.reasons.length === 0 ? STATUS.PASS : STATUS.FAIL;
  return report;
}

const VALUE_FLAGS = new Map([
  ['--apk', 'apkPath'],
  ['--sha-file', 'shaFile'],
  ['--bundle-dir', 'bundleDir'],
  ['--base-dir', 'baseDir'],
  ['--source-file', 'sourceFile'],
  ['--sidecar-name', 'sidecarName'],
  ['--source-name', 'sourceName']
]);

function usageText() {
  return [
    'Usage: node android_e2e_sha_guard.mjs --bundle-dir <dir> [--base-dir <d>] [--json]',
    '       node android_e2e_sha_guard.mjs --sha-file <file> [--apk <file>] [--base-dir <d>] [--json]',
    'Flags: --source-file <p> --sidecar-name <n> --source-name <n> --json',
    'Verifies an Android E2E CI sha256sum sidecar and source SHA against real APK bytes.',
    'Read-only inputs, no network. Exits 0 on PASS, 1 on FAIL, 2 on invalid usage.'
  ].join('\n');
}

export function runCli(argv) {
  const options = { json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (VALUE_FLAGS.has(arg)) {
      const value = argv[index + 1];
      if (typeof value !== 'string' || value.startsWith('--')) {
        return { exit: 2, stderr: usageText() };
      }
      options[VALUE_FLAGS.get(arg)] = value;
      index += 1;
      continue;
    }
    return { exit: 2, stderr: usageText() };
  }
  if (!options.shaFile && !options.bundleDir) {
    return { exit: 2, stderr: usageText() };
  }
  return { exit: 0, options };
}

function renderReport(report, asJson) {
  if (asJson) {
    return `${JSON.stringify(report, null, 2)}\n`;
  }
  const suffix = report.reasons.length > 0 ? ` ${report.reasons.join(',')}` : '';
  return `${report.status}${suffix}\n`;
}

export async function main(argv) {
  const parsedCli = runCli(argv);
  if (parsedCli.exit === 2) {
    process.stderr.write(`${parsedCli.stderr}\n`);
    process.exit(2);
  }
  let report;
  try {
    report = parsedCli.options.bundleDir
      ? await verifySourceToApk(parsedCli.options)
      : await verifyApkSha(parsedCli.options);
  } catch (error) {
    const detail = error && error.message ? error.message : String(error);
    process.stderr.write(`android_e2e_sha_guard: fail closed (${detail})\n`);
    process.exit(1);
  }
  process.stdout.write(renderReport(report, parsedCli.options.json === true));
  process.exitCode = report.status === STATUS.PASS ? 0 : 1;
}

const currentModulePath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath !== '' && fs.realpathSync(invokedPath) === currentModulePath) {
  await main(process.argv.slice(2));
}
