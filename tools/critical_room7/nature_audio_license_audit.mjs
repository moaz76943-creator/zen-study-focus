'use strict';

import { readFileSync, openSync, fstatSync, closeSync, constants } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCHEMA_VERSION = 1;
export const POLICY_VERSION = 1;

export const VERDICTS = Object.freeze({
  APPROVED: 'APPROVED',
  QUARANTINED: 'QUARANTINED'
});

export const allowedLicenses = Object.freeze([
  'CC0-1.0',
  'MIT',
  'CC-BY-4.0',
  'CC-BY-3.0',
  'CC-BY-2.5',
  'CC-BY-2.0',
  'CC-BY-1.0'
]);

export const ALLOWED_LICENSES = allowedLicenses;

const DEFAULT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);

const FORMAT_BY_EXTENSION = Object.freeze({
  '.ogg': 'ogg',
  '.oga': 'ogg',
  '.opus': 'ogg',
  '.mp3': 'mp3',
  '.wav': 'wav',
  '.wave': 'wav',
  '.flac': 'flac',
  '.m4a': 'm4a',
  '.mp4': 'm4a',
  '.webm': 'webm'
});

const DIGEST_KEYS = Object.freeze([
  'sha256',
  'file_sha256',
  'asset_sha256',
  'source_sha256',
  'released_sha256'
]);

const LICENSE_KEYS = Object.freeze(['license', 'licence']);
const SOURCE_KEYS = Object.freeze(['sourceUrl', 'source_url', 'source', 'origin']);
const EVIDENCE_KEYS = Object.freeze([
  'license_evidence',
  'licenseEvidenceUrl',
  'licenseEvidence',
  'license_url',
  'rights_evidence'
]);
const AUTHOR_KEYS = Object.freeze(['author', 'creator', 'artist', 'rights_holder']);
const FILE_KEYS = Object.freeze(['file', 'localPath', 'src', 'path', 'filename']);
const STATUS_KEYS = Object.freeze(['status', 'approval_status', 'review_status']);
const REVIEW_KEYS = Object.freeze(['human_audio_review', 'audio_review', 'human_review']);
const ID_KEYS = Object.freeze(['id', 'asset_id', 'recording_id']);

const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const HTTPS_PATTERN = /^https:\/\/[^\s]+$/i;
const BLOCKING_STATUS = /QUARANTIN|NOT[-_ ]?APPROVED|PENDING|REVIEW|BLOCK|REJECT|DRAFT|NOT_TESTED/i;
const PASSING_REVIEW = new Set(['PASSED', 'PASS', 'APPROVED']);

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    return value;
  }
  if (seen.has(value)) return value;
  seen.add(value);
  for (const key of Object.keys(value)) deepFreeze(value[key], seen);
  return Object.freeze(value);
}

function canonicalizeLicense(value) {
  let text = value
    .trim()
    .toUpperCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!text) return null;
  if (/^CC-?0(?:-?1(?:\.0)?)?$/.test(text)) return 'CC0-1.0';
  if (/^CC-?ZERO(?:-?1(?:\.0)?)?$/.test(text)) return 'CC0-1.0';
  if (text === 'MIT' || text === 'MIT-LICENSE' || text === 'EXPAT') return 'MIT';
  if (
    text === 'PD' ||
    text === 'PD-AUTHOR' ||
    text === 'PUBLIC-DOMAIN' ||
    text === 'PUBLICDOMAIN' ||
    text === 'PUBLIC-DOMAIN-DEDICATION'
  ) {
    return 'PUBLIC-DOMAIN';
  }
  if (
    text === 'ALL-RIGHTS-RESERVED' ||
    text === 'ARR' ||
    text === 'PROPRIETARY' ||
    text === 'COPYRIGHT' ||
    text === 'COPYRIGHTED'
  ) {
    return 'ALL-RIGHTS-RESERVED';
  }
  if (/^CC-(?:BY|BY-SA|BY-NC|BY-NC-SA|BY-ND|BY-NC-ND)$/.test(text)) {
    text += '-4.0';
  }
  const match = text.match(/^CC-(BY(?:-SA|-NC(?:-SA|-ND)?|-ND)?)-(\d+(?:\.\d+)?)$/);
  if (match) return 'CC-' + match[1] + '-' + match[2];
  return text;
}

export function classifyLicense(value) {
  if (typeof value !== 'string') throw new TypeError('license must be a string');
  const id = canonicalizeLicense(value);
  if (!id) {
    return Object.freeze({
      id: null,
      family: 'unknown',
      known: false,
      allowed: false,
      requiresAttribution: false
    });
  }

  let family = 'unknown';
  let known = true;
  let allowed = false;
  let requiresAttribution = false;

  if (id === 'CC0-1.0') {
    family = 'cc0';
    allowed = true;
  } else if (id === 'MIT') {
    family = 'mit';
    allowed = true;
    requiresAttribution = true;
  } else if (/^CC-BY(?:-\d+(?:\.\d+)?)?$/.test(id)) {
    family = 'cc-by';
    allowed = true;
    requiresAttribution = true;
  } else if (/^CC-BY-(?:SA|NC|NC-SA|ND|NC-ND)-\d+(?:\.\d+)?$/.test(id)) {
    family = 'cc-by-restricted';
  } else if (id === 'PUBLIC-DOMAIN') {
    family = 'public-domain';
  } else if (id === 'ALL-RIGHTS-RESERVED') {
    family = 'proprietary';
  } else {
    known = false;
  }

  return Object.freeze({
    id,
    family,
    known,
    allowed,
    requiresAttribution
  });
}

function toBuffer(input) {
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof Uint8Array) {
    return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  }
  if (input instanceof ArrayBuffer) return Buffer.from(input);
  return null;
}

function invalidFormat() {
  return Object.freeze({
    format: null,
    valid: false,
    reason: 'AUDIO_FORMAT_INVALID'
  });
}

function validFormat(format) {
  return Object.freeze({
    format,
    valid: true,
    reason: null
  });
}

export function sniffAudioFormat(input) {
  const data = toBuffer(input);
  if (!data || data.length < 4) return invalidFormat();

  const startsWith = (offset, text) => {
    if (data.length < offset + text.length) return false;
    return data.toString('latin1', offset, offset + text.length) === text;
  };

  if (startsWith(0, 'OggS')) return validFormat('ogg');
  if (startsWith(0, 'RIFF') && startsWith(8, 'WAVE')) return validFormat('wav');
  if (startsWith(0, 'fLaC')) return validFormat('flac');
  if (startsWith(0, 'ID3')) return validFormat('mp3');
  if (data[0] === 0xff && (data[1] & 0xe0) === 0xe0) {
    const version = (data[1] >> 3) & 0x03;
    const layer = (data[1] >> 1) & 0x03;
    if (version !== 1 && layer !== 0) return validFormat('mp3');
  }
  if (startsWith(4, 'ftyp')) return validFormat('m4a');
  if (
    data.length >= 4 &&
    data[0] === 0x1a &&
    data[1] === 0x45 &&
    data[2] === 0xdf &&
    data[3] === 0xa3
  ) {
    return validFormat('webm');
  }
  return invalidFormat();
}

function extensionOf(relative) {
  const base = path.posix.basename(relative).toLowerCase();
  const index = base.lastIndexOf('.');
  return index >= 0 ? base.slice(index) : '';
}

function normalizeRelativePath(value) {
  const text = value.trim();
  if (!text) return { ok: false, reason: 'AUDIO_PATH_MISSING' };
  if (
    text.includes('\0') ||
    text.startsWith('/') ||
    /^[a-zA-Z]:[\\/]/.test(text) ||
    /^[a-z][a-z0-9+.-]*:/i.test(text)
  ) {
    return { ok: false, reason: 'AUDIO_PATH_UNSAFE' };
  }
  const normalized = text.replace(/\\/g, '/');
  if (normalized.split('/').some((part) => part === '..')) {
    return { ok: false, reason: 'AUDIO_PATH_UNSAFE' };
  }
  return { ok: true, path: normalized };
}

export function inspectAudioFile(assetRoot, relative) {
  const root = path.resolve(assetRoot);
  const absolute = path.resolve(root, relative);
  const inside = path.relative(root, absolute);
  const extension = extensionOf(relative);
  const expected = FORMAT_BY_EXTENSION[extension] || null;

  if (inside.startsWith('..') || path.isAbsolute(inside)) {
    return deepFreeze({
      exists: false,
      size: 0,
      format: null,
      extension,
      extensionKnown: expected !== null,
      formatValid: false,
      formatMatchesExtension: false,
      sha256: null,
      reason: 'AUDIO_PATH_UNSAFE'
    });
  }

  let descriptor;
  let data;
  let reason = 'AUDIO_FILE_MISSING';
  try {
    // Inspect and read a single opened file, never check one pathname and then
    // reopen a potentially replaced file. No-follow also rejects leaf symlinks.
    descriptor = openSync(absolute, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    if (!fstatSync(descriptor).isFile()) throw new Error('Not a regular audio file');
    reason = 'AUDIO_FILE_UNREADABLE';
    data = readFileSync(descriptor);
  } catch {
    return deepFreeze({
      exists: false,
      size: 0,
      format: null,
      extension,
      extensionKnown: expected !== null,
      formatValid: false,
      formatMatchesExtension: false,
      sha256: null,
      reason
    });
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }

  const sniff = sniffAudioFormat(data.subarray(0, 64));
  const formatMatchesExtension =
    sniff.valid && expected !== null && sniff.format === expected;

  return deepFreeze({
    exists: true,
    size: data.length,
    format: sniff.format,
    extension,
    extensionKnown: expected !== null,
    formatValid: sniff.valid,
    formatMatchesExtension,
    sha256: createHash('sha256').update(data).digest('hex'),
    reason: null
  });
}

function readString(record, keys) {
  for (const key of keys) {
    if (!hasOwn(record, key)) continue;
    const value = record[key];
    if (value === undefined || value === null) continue;
    if (typeof value !== 'string') {
      return { present: true, value: '', invalid: true };
    }
    return { present: true, value: value.trim(), invalid: false };
  }
  return { present: false, value: '', invalid: false };
}

function collectDigests(record) {
  let present = false;
  let invalid = false;
  const digests = [];

  for (const key of DIGEST_KEYS) {
    if (!hasOwn(record, key)) continue;
    const value = record[key];
    if (value === undefined || value === null) continue;
    present = true;
    if (typeof value !== 'string' || !SHA256_PATTERN.test(value.trim())) {
      invalid = true;
      continue;
    }
    const digest = value.trim().toLowerCase();
    if (!digests.includes(digest)) digests.push(digest);
  }

  digests.sort();
  return { present, invalid, digests };
}

function approvalState(record) {
  if (!hasOwn(record, 'approved_for_runtime')) return 'missing';
  const value = record.approved_for_runtime;
  if (value === undefined) return 'missing';
  return value === true ? 'approved' : 'not-approved';
}

function evaluateRecording(record, context) {
  const reasons = [];
  const addReason = (reason) => {
    if (!reasons.includes(reason)) reasons.push(reason);
  };

  if (!isPlainObject(record)) {
    return deepFreeze({
      id: 'asset_' + context.index,
      verdict: VERDICTS.QUARANTINED,
      reasons: ['RECORD_INVALID'],
      declaredReady: false,
      declaredApproved: false,
      status: null,
      license: null,
      licenseFamily: null,
      file: null,
      audio: null
    });
  }

  const idField = readString(record, ID_KEYS);
  const id = idField.value || 'asset_' + context.index;

  const licenseField = readString(record, LICENSE_KEYS);
  let license = null;
  if (!licenseField.present || !licenseField.value) {
    addReason('LICENSE_MISSING');
  } else if (licenseField.invalid) {
    addReason('LICENSE_INVALID');
  } else {
    license = classifyLicense(licenseField.value);
    if (!license.known) addReason('LICENSE_UNKNOWN');
    else if (!license.allowed) addReason('LICENSE_OUTSIDE_POLICY');
  }

  const sourceField = readString(record, SOURCE_KEYS);
  if (!sourceField.present || !sourceField.value) {
    addReason('SOURCE_URL_MISSING');
  } else if (sourceField.invalid || !HTTPS_PATTERN.test(sourceField.value)) {
    addReason('SOURCE_URL_NOT_HTTPS');
  }

  const evidenceField = readString(record, EVIDENCE_KEYS);
  if (!evidenceField.present || !evidenceField.value) {
    addReason('LICENSE_EVIDENCE_MISSING');
  } else if (evidenceField.invalid || !HTTPS_PATTERN.test(evidenceField.value)) {
    addReason('LICENSE_EVIDENCE_NOT_HTTPS');
  }

  if (license && license.allowed && license.requiresAttribution) {
    const authorField = readString(record, AUTHOR_KEYS);
    if (!authorField.present || !authorField.value) addReason('AUTHOR_MISSING');
  }

  const digestInfo = collectDigests(record);
  if (!digestInfo.present) addReason('AUDIO_DIGEST_MISSING');
  else if (digestInfo.invalid) addReason('AUDIO_DIGEST_INVALID');

  const approval = approvalState(record);
  if (approval === 'missing') addReason('RUNTIME_APPROVAL_MISSING');
  else if (approval !== 'approved') addReason('RUNTIME_NOT_APPROVED');
  if (record.ready !== true) addReason('READY_NOT_CONFIRMED');

  const reviewField = readString(record, REVIEW_KEYS);
  if (!PASSING_REVIEW.has(reviewField.value.toUpperCase())) {
    addReason('HUMAN_REVIEW_NOT_PASSED');
  }

  const statusField = readString(record, STATUS_KEYS);
  if (
    statusField.present &&
    statusField.value &&
    BLOCKING_STATUS.test(statusField.value)
  ) {
    addReason('STATUS_QUARANTINED');
  }

  const fileField = readString(record, FILE_KEYS);
  let file = null;
  let audio = null;
  if (!fileField.present || !fileField.value) {
    addReason('AUDIO_PATH_MISSING');
  } else if (fileField.invalid) {
    addReason('AUDIO_PATH_INVALID');
  } else {
    const normalized = normalizeRelativePath(fileField.value);
    if (!normalized.ok) {
      addReason(normalized.reason);
    } else {
      file = normalized.path;
      audio = inspectAudioFile(context.assetRoot, file);
      if (!audio.exists) {
        addReason('AUDIO_FILE_MISSING');
      } else {
        if (!audio.formatValid) addReason('AUDIO_FORMAT_INVALID');
        else if (!audio.formatMatchesExtension) addReason('AUDIO_FORMAT_MISMATCH');
        if (
          digestInfo.present &&
          !digestInfo.invalid &&
          !digestInfo.digests.includes(audio.sha256)
        ) {
          addReason('AUDIO_DIGEST_MISMATCH');
        }
      }
    }
  }

  return deepFreeze({
    id,
    verdict: reasons.length === 0 ? VERDICTS.APPROVED : VERDICTS.QUARANTINED,
    reasons,
    declaredReady: record.ready === true,
    declaredApproved: record.approved_for_runtime === true,
    status: statusField.value || null,
    license: license ? license.id : null,
    licenseFamily: license ? license.family : null,
    file,
    audio
  });
}

function extractRecords(registry) {
  if (Array.isArray(registry)) return [...registry];
  if (!isPlainObject(registry)) {
    throw new TypeError('registry must be an array or a plain object');
  }

  const containerKeys = ['items', 'assets', 'recordings', 'entries'];
  let records = null;
  for (const key of containerKeys) {
    if (!hasOwn(registry, key)) continue;
    if (!Array.isArray(registry[key])) {
      throw new TypeError(key + ' must be an array');
    }
    records = [...registry[key]];
    break;
  }

  if (hasOwn(registry, 'replacement_candidates')) {
    if (!Array.isArray(registry.replacement_candidates)) {
      throw new TypeError('replacement_candidates must be an array');
    }
    if (records === null) records = [];
    records.push(...registry.replacement_candidates);
  }

  if (records === null) {
    throw new TypeError('registry must contain items, assets, recordings or entries');
  }
  return records;
}

export function auditRegistry(registry, options = {}) {
  if (options === undefined) options = {};
  if (!isPlainObject(options)) {
    throw new TypeError('options must be a plain object');
  }

  const assetRoot = options.assetRoot === undefined ? DEFAULT_ROOT : options.assetRoot;
  if (typeof assetRoot !== 'string' || !assetRoot.trim()) {
    throw new TypeError('assetRoot must be a non-empty string');
  }

  const root = path.resolve(assetRoot);
  const records = extractRecords(registry);
  const items = records.map((record, index) =>
    evaluateRecording(record, { assetRoot: root, index })
  );

  const approved = items
    .filter((item) => item.verdict === VERDICTS.APPROVED)
    .map((item) => item.id)
    .sort();
  const quarantined = items
    .filter((item) => item.verdict === VERDICTS.QUARANTINED)
    .map((item) => item.id)
    .sort();
  const overclaims = items
    .filter(
      (item) =>
        item.verdict !== VERDICTS.APPROVED &&
        (item.declaredReady || item.declaredApproved)
    )
    .map((item) => item.id)
    .sort();

  let status = 'EMPTY';
  if (items.length > 0) {
    if (approved.length === 0) status = 'QUARANTINED';
    else if (quarantined.length === 0) status = 'PASS';
    else status = 'MIXED';
  }

  return deepFreeze({
    schemaVersion: SCHEMA_VERSION,
    policyVersion: POLICY_VERSION,
    status,
    items,
    approved,
    quarantined,
    overclaims,
    counts: {
      total: items.length,
      approved: approved.length,
      quarantined: quarantined.length,
      overclaims: overclaims.length
    },
    networkUsed: false,
    wroteRegistry: false,
    androidPass: false
  });
}
