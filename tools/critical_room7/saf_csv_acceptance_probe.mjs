/**
 * Deep Focus critical room 7 — task W04: SAF CSV export acceptance probe.
 *
 * Offline parser/assertion helper for Android SAF CSV export evidence
 * (Analytics Studio ACTION_CREATE_DOCUMENT export, request code 7413).
 * It audits captured-style evidence records for:
 *   - the actual selected filename (a user rename is tolerated, not a failure),
 *   - the CSV content contract (full quoting, CRLF terminators, trailing CRLF,
 *     no BOM, size cap, v21 formula-injection guard honesty),
 *   - cancel vs save receipts (Android resultCode must agree with the native
 *     DFRecoveryNativeExportResult receipt),
 *   - Western digits in v21 system fields while user-authored text is kept
 *     verbatim,
 *   - DST-safe credited dates: v21 keys calendar days at UTC 12:00Z noon
 *     anchors, so 23h/25h local transition days stay exactly one calendar day.
 *
 * The reproduced defect class, proven against the integrated v21 code: a SAF
 * CSV payload whose first bytes are U+FEFF is rejected by the native gate
 * csv.startsWith("\"id\"") in MainActivity.exportAnalyticsCsvToFile, which
 * surfaces as a "failed" export although the CSV content itself is valid
 * (the browser Blob fallback in analytics_studio.js prepends a BOM).
 *
 * This tool runs entirely offline on evidence fixtures. It is NOT Android
 * verification and no device result is claimed; collected device evidence
 * stays NOT_COLLECTED until a real device session produces it. The probe
 * never writes app data and holds no filesystem write paths.
 */
'use strict';

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const SCHEMA_VERSION = 1;
export const STATUS = Object.freeze({ PASS: 'PASS', FAIL: 'FAIL' });

/* Mirrors of the live native export bridge (MainActivity.java / NativeCsvWriter.java). */
export const SAF_CONTRACT = Object.freeze({
  requestCode: 7413,
  mimeType: 'text/csv',
  suggestedTitle: 'deep-focus-analytics.csv',
  maxBytes: 4 * 1024 * 1024,
  requestIdPattern: '^df-csv-[0-9]{1,16}$',
  receipts: ['saved', 'cancelled', 'failed'],
  RESULT_OK: -1,
  RESULT_CANCELED: 0,
  nativeCallback: 'DFRecoveryNativeExportResult',
  writeMode: 'wt'
});

/* v21 Analytics Studio export shapes (analytics_core_v21.js toCSV). */
const KIND_HEADERS = Object.freeze({
  sessions: Object.freeze(['id', 'date', 'domain', 'minutes', 'startedAt', 'endedAt', 'timingVerified']),
  daily: Object.freeze(['date', 'minutes', 'sessions']),
  weekly: Object.freeze(['period', 'minutes', 'sessions']),
  monthly: Object.freeze(['period', 'minutes', 'sessions'])
});
/* Columns owned by the app versus columns the user can author freely.
 * 'id' is preserved verbatim; system date/number columns must be Western 0-9. */
const KIND_SYSTEM_FIELDS = Object.freeze({
  sessions: Object.freeze({
    system: Object.freeze(['date', 'domain', 'minutes', 'startedAt', 'endedAt', 'timingVerified']),
    preserved: Object.freeze(['id'])
  }),
  daily: Object.freeze({
    system: Object.freeze(['date', 'minutes', 'sessions']),
    preserved: Object.freeze([])
  }),
  weekly: Object.freeze({
    system: Object.freeze(['period', 'minutes', 'sessions']),
    preserved: Object.freeze([])
  }),
  monthly: Object.freeze({
    system: Object.freeze(['period', 'minutes', 'sessions']),
    preserved: Object.freeze([])
  })
});

const REQUEST_ID_RE = new RegExp(SAF_CONTRACT.requestIdPattern);
const BOM = '\uFEFF';
const WESTERN_DIGITS = /[0-9]/;
const ANY_DECIMAL_DIGIT = /\p{Nd}/u;

function freezeReport(value, seen = new WeakSet()) {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return value;
  if (seen.has(value)) return value;
  seen.add(value);
  for (const key of Object.keys(value)) freezeReport(value[key], seen);
  return Object.freeze(value);
}

export function toResultLabel(resultCode) {
  if (resultCode === SAF_CONTRACT.RESULT_OK) return 'RESULT_OK';
  if (resultCode === SAF_CONTRACT.RESULT_CANCELED) return 'RESULT_CANCELED';
  return null;
}

export function filenameFromUri(uri) {
  if (typeof uri !== 'string' || uri.length === 0) return null;
  const segment = uri.split('/').pop() || '';
  if (!segment) return null;
  try {
    return decodeURIComponent(segment);
  } catch (_) {
    return segment;
  }
}

function expectedReceiptsForResult(resultCode) {
  if (resultCode === SAF_CONTRACT.RESULT_OK) return ['saved', 'failed'];
  if (resultCode === SAF_CONTRACT.RESULT_CANCELED) return ['cancelled'];
  return null;
}

/* Mirrors of analytics_core_v21.js UTC-noon anchor arithmetic. */
export function dayNumber(day) {
  return Math.floor(Date.parse(day + 'T12:00:00Z') / 86400000);
}
export function fromDayNumber(n) {
  return new Date(n * 86400000 + 43200000).toISOString().slice(0, 10);
}

/** Strict cell reader for the v21 shape: every field is double-quoted. */
function parseFullyQuotedLine(line) {
  const cells = [];
  let pos = 0;
  while (pos < line.length) {
    if (line[pos] !== '"') return null;
    let i = pos + 1;
    let raw = '';
    for (;;) {
      const ch = line[i];
      if (ch === undefined) return null;
      if (ch === '"') {
        if (line[i + 1] === '"') { raw += '"'; i += 2; continue; }
        break;
      }
      raw += ch;
      i += 1;
    }
    i += 1;
    if (i !== line.length && line[i] !== ',') return null;
    cells.push(raw);
    pos = i === line.length ? line.length : i + 1;
  }
  return cells;
}

export function auditSystemDigits(cells, fields, preserved) {
  const violations = [];
  const preservedSet = new Set(preserved);
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    if (preservedSet.has(field)) continue;
    const text = cells[index] ?? '';
    let nonWestern = 0;
    for (const character of text) {
      if (ANY_DECIMAL_DIGIT.test(character) && !WESTERN_DIGITS.test(character)) nonWestern += 1;
    }
    if (nonWestern > 0) {
      violations.push({ field, text, nonWesternDigits: nonWestern });
    }
  }
  return freezeReport({ violations, preservedUserFields: preserved.slice() });
}

/** Parse one captured SAF CSV export against the v21 content contract. */
export function parseCsvEvidence(csv, options = {}) {
  const kind = options.kind === undefined ? 'sessions' : options.kind;
  const violations = [];
  const add = (id, detail) => violations.push({ id, detail });

  const text = typeof csv === 'string' ? csv : '';
  const byteLength = Buffer.byteLength(text, 'utf8');
  const bomDetected = text.startsWith(BOM);

  let lines = null;
  let lineEnding = null;
  let trailingCrlf = false;

  if (!text.trim()) {
    add('EMPTY_PAYLOAD', 'no CSV payload captured for this export');
  } else {
    if (byteLength > SAF_CONTRACT.maxBytes) {
      add('PAYLOAD_TOO_LARGE',
        'payload is ' + byteLength + ' bytes; NativeCsvWriter.MAX_BYTES is ' + SAF_CONTRACT.maxBytes);
    }
    if (bomDetected) {
      add('BOM_ON_SAF_EXPORT',
        'payload starts with U+FEFF; the native gate csv.startsWith("\\"id\\"") rejects it, so the export reports failed');
    }
    if (text.includes('\r\n')) {
      lineEnding = '\r\n';
      lines = text.split('\r\n');
      const inner = lines.slice(0, -1);
      if (text.endsWith('\r\n')) { trailingCrlf = true; lines = inner; }
      if (lines.some(l => l.includes('\n') || l.includes('\r'))) {
        add('MIXED_LINE_TERMINATOR', 'CRLF payload contains bare CR or LF bytes');
        lineEnding = 'mixed';
      }
    } else if (text.includes('\n')) {
      add('LF_ONLY_ROWTERMINATOR', 'v21 native exports terminate rows with CRLF, not LF');
      lineEnding = '\n';
      trailingCrlf = text.endsWith('\n');
      lines = text.endsWith('\n') ? text.slice(0, -1).split('\n') : text.split('\n');
    } else if (text.includes('\r')) {
      add('CR_ONLY_ROWTERMINATOR', 'v21 native exports terminate rows with CRLF, not bare CR');
      lineEnding = '\r';
      trailingCrlf = text.endsWith('\r');
      lines = text.endsWith('\r') ? text.slice(0, -1).split('\r') : text.split('\r');
    } else {
      lines = [text];
    }
    if (lines.length >= 1) {
      if (!trailingCrlf) {
        add('MISSING_TRAILING_CRLF', 'v21 toCSV appends a trailing CRLF after the last row');
      }
    }
  }

  const headerExpected = kind === null ? null : KIND_HEADERS[kind] || null;
  const rows = [];
  let header = null;

  if (lines && lines.length > 0) {
    lines.forEach((line, lineIndex) => {
      const parsed = parseFullyQuotedLine(line);
      if (parsed === null) {
        add('NOT_FULLY_QUOTED', 'line ' + (lineIndex + 1) + ' is not a fully quoted v21 CSV row');
        return;
      }
      if (lineIndex === 0) {
        header = parsed;
        if (headerExpected && header.join('\u0000') !== headerExpected.join('\u0000')) {
          add('HEADER_MISMATCH',
            'expected header ' + JSON.stringify(headerExpected) + ' for kind ' + JSON.stringify(kind) +
            ', captured ' + JSON.stringify(header));
        }
        return;
      }
      rows.push(parsed);
    });
  }

  let digits = { violations: [], preservedUserFields: [] };
  if (kind && headerExpected && !violations.some(v => v.id === 'HEADER_MISMATCH')) {
    const { system, preserved } = KIND_SYSTEM_FIELDS[kind];
    digits = freezeReport({
      violations: rows.flatMap(row => auditSystemDigits(row, headerExpected ? headerExpected : system, preserved).violations)
        .map(v => ({ field: v.field, text: v.text, nonWesternDigits: v.nonWesternDigits })),
      preservedUserFields: preserved.slice()
    });
    for (const v of digits.violations) {
      add('NON_WESTERN_SYSTEM_DIGITS',
        'system field "' + v.field + '" carries ' + v.nonWesternDigits + ' non-Western digit(s): ' + JSON.stringify(v.text));
    }
  }

  const ids = violations.map(v => v.id);
  const ok = violations.length === 0;
  return freezeReport({
    ok,
    bomDetected,
    byteLength,
    lineEnding,
    trailingCrlf,
    kind,
    header,
    rows,
    preservedUserFields: digits.preservedUserFields,
    violationIds: ids,
    violations
  });
}

/**
 * Deterministic DST check: v21 credits calendar dates at UTC-noon anchors, so
 * consecutive credited days must step by exactly 86400000 ms even when the
 * local day length is 23h or 25h.
 */
export function verifyDayAnchors(dates) {
  const valid = [];
  const gaps = [];
  let status = STATUS.PASS;
  for (const day of dates) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) ||
      !Number.isFinite(Date.parse(day + 'T12:00:00Z')) ||
      new Date(day + 'T12:00:00Z').toISOString().slice(0, 10) !== day) {
      status = STATUS.FAIL;
      valid.push({ day, valid: false });
      continue;
    }
    valid.push({ day, valid: true });
  }
  for (let i = 1; i < dates.length; i += 1) {
    if (!valid[i].valid || !valid[i - 1].valid) continue;
    const gapMs = Date.parse(dates[i] + 'T12:00:00Z') - Date.parse(dates[i - 1] + 'T12:00:00Z');
    gaps.push({ from: dates[i - 1], to: dates[i], gapMs });
    if (gapMs !== 86400000) status = STATUS.FAIL;
  }
  return freezeReport({
    status,
    note: 'credited dates are keyed at UTC 12:00Z noon anchors, so 23h/25h local days stay exactly one calendar day (gapMs must be 86400000, not 82800000 or 90000000)',
    gaps,
    days: valid,
    dayNumberArithmeticChecked: gaps.length > 0
  });
}

const NATIVE_SOURCE_PATH =
  'android/app/src/main/java/com/zenstudy/focus/MainActivity.java';

const LITERAL_PROBES = Object.freeze([
  { label: 'external extra title ' + SAF_CONTRACT.suggestedTitle, needle: 'EXTRA_TITLE, "' + SAF_CONTRACT.suggestedTitle + '"' },
  { label: 'ACTION_CREATE_DOCUMENT with text/csv', needle: 'intent.setType("' + SAF_CONTRACT.mimeType + '")' },
  { label: 'openOutputStream(target, "wt")', needle: 'openOutputStream(target, "' + SAF_CONTRACT.writeMode + '")' },
  { label: 'native callback name', needle: SAF_CONTRACT.nativeCallback },
  { label: 'request code 7413', needle: 'REQUEST_ANALYTICS_EXPORT = ' + SAF_CONTRACT.requestCode },
  { label: 'startsWith gate on the id/date/period header cell', needle: 'csv.startsWith("\\"id\\"")' }
]);

/* Read-only audit of the current integrated v21 native source. */
export function runLiveSourceAudit(options = {}) {
  const root = options.root
    ? path.resolve(options.root)
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
  const main = path.join(root, NATIVE_SOURCE_PATH);
  let text = null;
  try {
    text = fs.readFileSync(main, 'utf8');
  } catch (error) {
    return freezeReport({
      status: 'source-audit-unavailable',
      source: NATIVE_SOURCE_PATH,
      error: error instanceof Error ? error.message : String(error),
      missing: [NATIVE_SOURCE_PATH]
    });
  }
  const missing = LITERAL_PROBES
    .filter(({ needle }) => !text.includes(needle))
    .map(({ label }) => label);
  // The audit performs reads only; there are no write paths in this module.
  return freezeReport({
    status: missing.length === 0 ? 'source-audit-pass' : 'source-audit-fail',
    source: NATIVE_SOURCE_PATH,
    requestCodeFound: text.includes(String(SAF_CONTRACT.requestCode)),
    missing
  });
}

const DEFECT_LIBRARY = Object.freeze({
  BOM_ON_SAF_EXPORT: Object.freeze({
    remediation: 'Strip U+FEFF before the native handoff; the SAF path must carry the BOM-less analytics_core_v21.js toCSV payload.'
  }),
  RESULT_RECEIPT_MISMATCH: Object.freeze({
    remediation: 'Recapture the evidence; Android resultCode and the native receipt must agree (RESULT_CANCELED -> cancelled, RESULT_OK -> saved/failed).'
  }),
  UNRECOGNIZED_RESULT_CODE: Object.freeze({
    remediation: 'Recapture with the Android resultCode value; only -1 (RESULT_OK) and 0 (RESULT_CANCELED) are recognizable.'
  }),
  INVALID_REQUEST_ID: Object.freeze({
    remediation: 'The request id must match df-csv-[0-9]{1,16}; re-request the export through the bridge.'
  }),
  CONTENT_CONTRACT_BROKEN: Object.freeze({
    remediation: 'The CSV bytes must match analytics_core_v21.js toCSV output (full quoting, CRLF, trailing CRLF, header per kind, <=4MiB, no BOM).'
  })
});

function confirmDefectsFrom(parsed, entryIndex) {
  const defects = [];
  const bom = parsed.violationIds.includes('BOM_ON_SAF_EXPORT');
  if (bom) {
    defects.push({
      id: 'BOM_ON_SAF_EXPORT',
      entryIndex,
      detail: 'SAF payload bytes start with U+FEFF; the native gate csv.startsWith("\\"id\\"") rejects it and the receipt reports failed although the CSV content itself is valid (the browser Blob fallback adds this BOM).',
      remediation: DEFECT_LIBRARY.BOM_ON_SAF_EXPORT.remediation
    });
  }
  const structural = parsed.violationIds.filter(id =>
    id !== 'BOM_ON_SAF_EXPORT' && id !== 'EMPTY_PAYLOAD');
  if (structural.length > 0) {
    defects.push({
      id: 'CONTENT_CONTRACT_BROKEN',
      entryIndex,
      detail: 'violations: ' + structural.join(', '),
      remediation: DEFECT_LIBRARY.CONTENT_CONTRACT_BROKEN.remediation
    });
  }
  return defects;
}

/** Audit captured SAF export evidence entries. */
export function evaluateEvidence(entries) {
  if (!Array.isArray(entries)) throw new TypeError('Evidence must be an array');

  const auditedEntries = [];
  const confirmedDefects = [];

  entries.forEach((entry, index) => {
    const requestId = typeof entry.requestId === 'string' ? entry.requestId : '';
    const requestIdOk = REQUEST_ID_RE.test(requestId);
    const resultLabel = toResultLabel(entry.resultCode);
    const receipt = SAF_CONTRACT.receipts.includes(entry.receipt) ? entry.receipt : null;
    const violationIds = [];

    if (!requestIdOk) {
      violationIds.push('INVALID_REQUEST_ID');
      confirmedDefects.push({
        id: 'INVALID_REQUEST_ID',
        entryIndex: index,
        detail: 'request id ' + JSON.stringify(requestId) + ' does not match ' + SAF_CONTRACT.requestIdPattern,
        remediation: DEFECT_LIBRARY.INVALID_REQUEST_ID.remediation
      });
    }

    if (resultLabel === null) {
      violationIds.push('UNRECOGNIZED_RESULT_CODE');
      confirmedDefects.push({
        id: 'UNRECOGNIZED_RESULT_CODE',
        entryIndex: index,
        detail: 'resultCode ' + JSON.stringify(entry.resultCode) + ' is neither RESULT_OK (-1) nor RESULT_CANCELED (0)',
        remediation: DEFECT_LIBRARY.UNRECOGNIZED_RESULT_CODE.remediation
      });
    }

    const expectation = expectedReceiptsForResult(entry.resultCode);
    if (expectation && !expectation.includes(entry.receipt)) {
      violationIds.push('RESULT_RECEIPT_MISMATCH');
      confirmedDefects.push({
        id: 'RESULT_RECEIPT_MISMATCH',
        entryIndex: index,
        detail: 'Android ' + resultLabel + ' cannot produce receipt ' + JSON.stringify(entry.receipt) +
          ' (expected one of ' + expectation.join(', ') + ')',
        remediation: DEFECT_LIBRARY.RESULT_RECEIPT_MISMATCH.remediation
      });
    }

    const selectedUriName = filenameFromUri(entry.uri);
    const selected = typeof entry.selected === 'string' && entry.selected
      ? entry.selected
      : (typeof entry.displayName === 'string' && entry.displayName ? entry.displayName : selectedUriName);
    const renamed = Boolean(selected && selected !== SAF_CONTRACT.suggestedTitle);

    // Cancelled exports must not carry written bytes.
    if (entry.receipt === 'cancelled' && typeof entry.csv === 'string' && entry.csv.length > 0) {
      violationIds.push('RESULT_RECEIPT_MISMATCH');
      confirmedDefects.push({
        id: 'RESULT_RECEIPT_MISMATCH',
        entryIndex: index,
        detail: 'receipt "cancelled" is incompatible with ' + entry.csv.length + ' captured payload characters',
        remediation: DEFECT_LIBRARY.RESULT_RECEIPT_MISMATCH.remediation
      });
    }

    let content;
    if (typeof entry.csv === 'string' && entry.csv.length > 0) {
      const parsed = parseCsvEvidence(entry.csv, {
        kind: entry.kind === undefined ? 'sessions' : entry.kind
      });
      content = {
        ok: parsed.ok,
        skipped: false,
        kind: parsed.kind,
        header: parsed.header,
        rows: parsed.rows,
        byteLength: parsed.byteLength,
        bomDetected: parsed.bomDetected,
        lineEnding: parsed.lineEnding,
        trailingCrlf: parsed.trailingCrlf,
        preservedUserFields: parsed.preservedUserFields,
        violationIds: parsed.violationIds
      };
      parsed.violationIds.forEach(id => {
        if (!violationIds.includes(id)) violationIds.push(id);
      });
      confirmDefectsFrom(parsed, index).forEach(defect => confirmedDefects.push(defect));
    } else {
      content = { ok: true, skipped: true, kind: entry.kind ?? null, rows: [], violationIds: [] };
      if (entry.receipt === 'saved') {
        violationIds.push('MISSING_SAVED_CONTENT');
        confirmedDefects.push({
          id: 'CONTENT_CONTRACT_BROKEN',
          entryIndex: index,
          detail: 'receipt "saved" without captured CSV payload bytes; content cannot be verified',
          remediation: DEFECT_LIBRARY.CONTENT_CONTRACT_BROKEN.remediation
        });
      }
    }

    const status = violationIds.length === 0 ? STATUS.PASS : STATUS.FAIL;
    auditedEntries.push(freezeReport({
      index,
      requestId,
      requestIdOk,
      resultLabel,
      resultCode: entry.resultCode,
      receipt,
      filename: { selected, suggested: SAF_CONTRACT.suggestedTitle, renamed },
      content,
      status,
      violationIds
    }));
  });

  const passCount = auditedEntries.filter(e => e.status === STATUS.PASS).length;
  const failCount = auditedEntries.length - passCount;
  const status = confirmedDefects.length > 0 || failCount > 0 ? STATUS.FAIL : STATUS.PASS;

  return freezeReport({
    schemaVersion: SCHEMA_VERSION,
    offline: true,
    is_android_verification: false,
    androidPass: false,
    deviceEvidence: 'NOT_COLLECTED',
    disclaimer: 'Node offline evidence audit; NOT Android verification. No device result is claimed.',
    status,
    entries: auditedEntries,
    confirmedDefects,
    summary: {
      entries: auditedEntries.length,
      pass: passCount,
      fail: failCount,
      confirmedDefects: confirmedDefects.length
    }
  });
}
