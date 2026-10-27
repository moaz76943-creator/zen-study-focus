export const SCHEMA_VERSION = 1;
export const VERSION = SCHEMA_VERSION;

export const OUTCOMES = Object.freeze(['PASS', 'FAIL', 'NOT_TESTED']);
export const STATUS = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
  NOT_TESTED: 'NOT_TESTED'
});
export const LAYERS = Object.freeze(['ACK', 'SAF', 'WAL']);
export const REQUIRED_API_LEVELS = Object.freeze([30, 35]);

const PASS = STATUS.PASS;
const FAIL = STATUS.FAIL;
const NOT_TESTED = STATUS.NOT_TESTED;

const PASS_WORDS = new Set(['pass', 'passed', 'success', 'succeeded', 'ok', 'true']);
const FAIL_WORDS = new Set(['fail', 'failed', 'failure', 'error', 'errored', 'false']);
const NOT_TESTED_WORDS = new Set([
  '',
  'not_tested',
  'nottested',
  'not_run',
  'skipped',
  'skip',
  'cancelled',
  'canceled',
  'pending',
  'unknown',
  'none',
  'null',
  'undefined'
]);

const SHA_PATTERN = /^(?:[0-9a-fA-F]{40}|[0-9a-fA-F]{64})$/;
const CASE_ID_KEYS = ['caseId', 'case_id', 'id', 'case', 'name', 'test'];
const API_KEYS = ['apiLevel', 'api_level', 'api', 'sdk', 'sdkLevel', 'sdk_level'];
const SHA_KEYS = ['sha', 'sourceSha', 'source_sha', 'headSha', 'head_sha', 'commitSha', 'commit_sha', 'commit'];
const APK_KEYS = ['apkSha', 'apk_sha', 'apkDigest', 'apk_digest', 'builtApkSha256', 'installedApkSha256'];
const OUTCOME_KEYS = ['outcome', 'status', 'result', 'conclusion'];
const DETAIL_KEYS = ['detail', 'reason', 'message', 'error', 'exception'];
const FAILURE_KIND_KEYS = ['failureKind', 'failure_kind', 'transportKind', 'transport_kind', 'kind'];
const TRANSPORT_KEYS = ['transportError', 'transport_error', 'transportFailure', 'transport_failure', 'infra', 'toolFailure', 'infrastructureFailure'];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepFreeze(value) {
  if (Array.isArray(value)) {
    for (const item of value) deepFreeze(item);
    return Object.freeze(value);
  }
  if (isPlainObject(value)) {
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    return Object.freeze(value);
  }
  return value;
}

function asString(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function normalizeToken(value) {
  return asString(value).toLowerCase().replace(/[\s-]+/g, '_');
}

function pick(source, keys) {
  if (!isPlainObject(source)) return undefined;
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function normalizeOutcome(value) {
  const token = normalizeToken(value);
  if (token === '') return null;
  if (PASS_WORDS.has(token)) return PASS;
  if (FAIL_WORDS.has(token)) return FAIL;
  if (NOT_TESTED_WORDS.has(token)) return NOT_TESTED;
  return null;
}

function normalizeCaseId(value) {
  const text = asString(value).toUpperCase();
  return text === '' ? null : text;
}

export function normalizeSha(value) {
  const text = asString(value);
  if (!SHA_PATTERN.test(text)) return null;
  return text.toLowerCase();
}

export function isExactSha(value) {
  return normalizeSha(value) !== null;
}

function normalizeApiLevel(value) {
  let number;
  if (typeof value === 'number') number = value;
  else if (typeof value === 'string' && value.trim() !== '') number = Number(value);
  else return null;
  if (!Number.isInteger(number) || number < 1 || number > 100) return null;
  return number;
}

function normalizeApiLevels(value) {
  if (value === undefined) return [...REQUIRED_API_LEVELS];
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError('buildAckSafWalMatrix: apiLevels must be a non-empty array');
  }
  const levels = new Set();
  for (const item of value) {
    const level = normalizeApiLevel(item);
    if (level === null) {
      throw new TypeError('buildAckSafWalMatrix: apiLevels must contain positive integers');
    }
    levels.add(level);
  }
  return [...levels].sort((left, right) => left - right);
}

function normalizeExpectedSha(value, label) {
  if (value === undefined || value === null || value === '') return null;
  const sha = normalizeSha(value);
  if (sha === null) {
    throw new TypeError(`${label} must be an exact 40 or 64 character hexadecimal SHA`);
  }
  return sha;
}

function freezeCase(definition) {
  return Object.freeze({
    id: definition.id,
    layer: definition.layer,
    title: definition.title,
    checks: Object.freeze(definition.checks.map((check) => Object.freeze({
      key: check.key,
      equals: check.equals
    })))
  });
}

export const CASE_MATRIX = Object.freeze([
  freezeCase({
    id: 'ACK-01',
    layer: 'ACK',
    title: 'accepted timer snapshot is byte-verified before ACK',
    checks: [
      { key: 'nativeAck', equals: true },
      { key: 'writeClosed', equals: true },
      { key: 'readbackMatch', equals: true }
    ]
  }),
  freezeCase({
    id: 'ACK-02',
    layer: 'ACK',
    title: 'invalid or oversized packet is rejected without changing the prior checkpoint',
    checks: [
      { key: 'nativeAck', equals: false },
      { key: 'checkpointUnchanged', equals: true }
    ]
  }),
  freezeCase({
    id: 'ACK-03',
    layer: 'ACK',
    title: 'injected native write failure fails closed and preserves the prior checkpoint',
    checks: [
      { key: 'nativeAck', equals: false },
      { key: 'rollbackVerified', equals: true }
    ]
  }),
  freezeCase({
    id: 'ACK-04',
    layer: 'ACK',
    title: 'acknowledged snapshot survives process reopen exactly',
    checks: [
      { key: 'nativeAck', equals: true },
      { key: 'reopenMatches', equals: true }
    ]
  }),
  freezeCase({
    id: 'SAF-01',
    layer: 'SAF',
    title: 'export writes the selected document and reopens byte-identical',
    checks: [
      { key: 'receiptStatus', equals: 'saved' },
      { key: 'savedToSelectedUri', equals: true },
      { key: 'readbackMatch', equals: true }
    ]
  }),
  freezeCase({
    id: 'SAF-02',
    layer: 'SAF',
    title: 'picker cancel returns a cancelled receipt and leaves the target unchanged',
    checks: [
      { key: 'receiptStatus', equals: 'cancelled' },
      { key: 'targetUnchanged', equals: true }
    ]
  }),
  freezeCase({
    id: 'SAF-03',
    layer: 'SAF',
    title: 'export write or readback failure reports failed instead of success',
    checks: [
      { key: 'receiptStatus', equals: 'failed' },
      { key: 'successToast', equals: false }
    ]
  }),
  freezeCase({
    id: 'SAF-04',
    layer: 'SAF',
    title: 'import is bounded and an invalid backup is rejected without v21 mutation',
    checks: [
      { key: 'importRejected', equals: true },
      { key: 'storageUnchanged', equals: true }
    ]
  }),
  freezeCase({
    id: 'SAF-05',
    layer: 'SAF',
    title: 'import picker cancel leaves every v21 packet untouched',
    checks: [
      { key: 'pickerCancelled', equals: true },
      { key: 'storageUnchanged', equals: true }
    ]
  }),
  freezeCase({
    id: 'WAL-01',
    layer: 'WAL',
    title: 'commit writes a durable journal before replacing the six v21 packets',
    checks: [
      { key: 'journalWrittenBeforeMutation', equals: true },
      { key: 'packetsVerified', equals: true },
      { key: 'journalCleared', equals: true }
    ]
  }),
  freezeCase({
    id: 'WAL-02',
    layer: 'WAL',
    title: 'write failure restores the exact original packet bytes',
    checks: [
      { key: 'rollbackVerified', equals: true },
      { key: 'originalBytesPreserved', equals: true }
    ]
  }),
  freezeCase({
    id: 'WAL-03',
    layer: 'WAL',
    title: 'interrupted pending journal requires explicit recovery and rolls back',
    checks: [
      { key: 'pendingDetected', equals: true },
      { key: 'explicitRecoveryOnly', equals: true },
      { key: 'rollbackVerified', equals: true }
    ]
  }),
  freezeCase({
    id: 'WAL-04',
    layer: 'WAL',
    title: 'unknown concurrent mutation blocks recovery without overwriting storage',
    checks: [
      { key: 'concurrentMutationDetected', equals: true },
      { key: 'recoveryBlocked', equals: true },
      { key: 'storageUnchanged', equals: true }
    ]
  }),
  freezeCase({
    id: 'WAL-05',
    layer: 'WAL',
    title: 'committed journal cleanup failure reports cleanupPending and blocks the next writer',
    checks: [
      { key: 'cleanupPending', equals: true },
      { key: 'nextWriterBlocked', equals: true }
    ]
  })
]);

export const CASES = CASE_MATRIX;
export const NATIVE_ACK_SAF_WAL_CASES = CASE_MATRIX;

const CASE_BY_ID = new Map(CASE_MATRIX.map((testCase) => [testCase.id, testCase]));

const INFRA_RULES = [
  {
    classification: 'UIAUTOMATOR_INFRA',
    kind: 'uiautomator_unavailable',
    pattern: /uiautomator|\buia\b|hierarchy|talkback|native dialog not observable/i
  },
  {
    classification: 'ADB_INFRA',
    kind: 'adb_or_emulator_failure',
    pattern: /\badb\b|emulator|device[_ -]?offline|install|bootstrap|package ?manager|wait-for-device|ro\.kernel\.qemu/i
  },
  {
    classification: 'CDP_INFRA',
    kind: 'cdp_transport_failure',
    pattern: /\bcdp\b|devtools|websocket|9222|webview devtools|cdp target/i
  },
  {
    classification: 'NOT_TESTED',
    kind: 'transport_not_tested',
    pattern: /timeout|timed[_ -]?out|network|socket|transport|not[_ -]?tested|skipped|unavailable/i
  }
];

function classifyInfrastructure(record) {
  if (!isPlainObject(record)) return null;
  const flagged = TRANSPORT_KEYS.some((key) => record[key] === true);
  if (!flagged) return null;
  const text = [
    pick(record, FAILURE_KIND_KEYS),
    pick(record, DETAIL_KEYS),
    pick(record, ['error'])
  ].map(asString).filter(Boolean).join(' ');
  for (const rule of INFRA_RULES) {
    if (rule.pattern.test(text)) {
      return Object.freeze({ classification: rule.classification, kind: rule.kind });
    }
  }
  return Object.freeze({ classification: 'TOOL_INFRA', kind: 'unspecified_infrastructure' });
}

function sameValue(actual, expected) {
  if (Object.is(actual, expected)) return true;
  if (actual && expected && typeof actual === 'object' && typeof expected === 'object') {
    try {
      return JSON.stringify(actual) === JSON.stringify(expected);
    } catch (_) {
      return false;
    }
  }
  return false;
}

function checkView(key, expected, actual, outcome) {
  return Object.freeze({
    key,
    expected,
    actual: actual === undefined ? null : actual,
    outcome
  });
}

export function evaluateCase(caseId, rawEvidence, options = {}) {
  const normalizedId = normalizeCaseId(caseId);
  const testCase = normalizedId ? CASE_BY_ID.get(normalizedId) : undefined;
  if (!testCase) {
    throw new TypeError(`evaluateCase: unknown case id ${String(caseId)}`);
  }

  const expectedSha = normalizeExpectedSha(options.expectedSha, 'evaluateCase: expectedSha');
  const expectedApkSha = normalizeExpectedSha(options.expectedApkSha, 'evaluateCase: expectedApkSha');
  const expectedApiLevel = normalizeApiLevel(options.apiLevel);
  const base = {
    caseId: testCase.id,
    layer: testCase.layer,
    title: testCase.title,
    apiLevel: expectedApiLevel,
    sourceSha: null,
    apkSha: null,
    outcome: NOT_TESTED,
    status: NOT_TESTED,
    reasons: [],
    checks: [],
    classification: NOT_TESTED,
    infrastructure: null
  };

  if (!isPlainObject(rawEvidence)) {
    const reason = rawEvidence === undefined || rawEvidence === null ? 'missing_evidence' : 'malformed_evidence';
    return deepFreeze({
      ...base,
      reasons: [reason],
      checks: testCase.checks.map((check) => checkView(check.key, check.equals, undefined, NOT_TESTED))
    });
  }

  const reasons = new Set();
  const infrastructure = classifyInfrastructure(rawEvidence);
  const rawSha = pick(rawEvidence, SHA_KEYS);
  const sourceSha = normalizeSha(rawSha);
  const rawApkSha = pick(rawEvidence, APK_KEYS);
  const apkSha = normalizeSha(rawApkSha);
  const rawApiLevel = pick(rawEvidence, API_KEYS);
  const observedApiLevel = normalizeApiLevel(rawApiLevel);

  if (infrastructure) reasons.add(`infra:${infrastructure.kind}`);

  if (expectedSha === null) {
    reasons.add('missing_expected_sha');
  } else if (sourceSha === null) {
    reasons.add(rawSha === undefined ? 'missing_sha' : 'invalid_sha');
  } else if (sourceSha !== expectedSha) {
    reasons.add('sha_mismatch');
  }

  if (expectedApkSha !== null) {
    if (apkSha === null) {
      reasons.add(rawApkSha === undefined ? 'missing_apk_sha' : 'invalid_apk_sha');
    } else if (apkSha !== expectedApkSha) {
      reasons.add('apk_sha_mismatch');
    }
  } else if (rawApkSha !== undefined && apkSha === null) {
    reasons.add('invalid_apk_sha');
  }

  if (observedApiLevel === null) {
    reasons.add(rawApiLevel === undefined ? 'missing_api' : 'invalid_api');
  } else if (expectedApiLevel !== null && observedApiLevel !== expectedApiLevel) {
    reasons.add('api_mismatch');
  }

  const missingChecks = [];
  const failedChecks = [];
  const checks = testCase.checks.map((check) => {
    const present = Object.prototype.hasOwnProperty.call(rawEvidence, check.key)
      && rawEvidence[check.key] !== undefined;
    if (!present) {
      missingChecks.push(check.key);
      return checkView(check.key, check.equals, undefined, NOT_TESTED);
    }
    if (!sameValue(rawEvidence[check.key], check.equals)) {
      failedChecks.push(check.key);
      return checkView(check.key, check.equals, rawEvidence[check.key], FAIL);
    }
    return checkView(check.key, check.equals, rawEvidence[check.key], PASS);
  });

  if (missingChecks.length > 0) {
    reasons.add(`missing_checks:${missingChecks.slice().sort().join(',')}`);
  }
  for (const key of failedChecks) reasons.add(`check_failed:${key}`);

  const rawOutcome = pick(rawEvidence, OUTCOME_KEYS);
  const declared = normalizeOutcome(rawOutcome);
  const hasDeclared = rawOutcome !== undefined;
  const blocking = [...reasons].some((reason) => !reason.startsWith('missing_checks:') && !reason.startsWith('check_failed:'));
  let outcome;
  if (blocking) {
    outcome = NOT_TESTED;
  } else if (failedChecks.length > 0) {
    outcome = FAIL;
  } else if (declared === FAIL) {
    reasons.add('explicit_failure');
    outcome = FAIL;
  } else if (missingChecks.length > 0) {
    outcome = NOT_TESTED;
  } else if (hasDeclared && declared === null) {
    reasons.add('invalid_outcome');
    outcome = NOT_TESTED;
  } else if (declared === NOT_TESTED) {
    reasons.add('explicit_not_tested');
    outcome = NOT_TESTED;
  } else {
    outcome = PASS;
  }

  const orderedReasons = [...reasons];
  return deepFreeze({
    ...base,
    apiLevel: observedApiLevel === null ? expectedApiLevel : observedApiLevel,
    sourceSha,
    apkSha,
    outcome,
    status: outcome,
    reasons: orderedReasons,
    checks,
    classification: outcome === FAIL ? 'APP_DEFECT' : (infrastructure ? infrastructure.classification : NOT_TESTED),
    infrastructure
  });
}

function normalizeInput(input, options) {
  if (Array.isArray(input)) {
    return { records: input, options: options || {} };
  }
  if (!isPlainObject(input)) {
    throw new TypeError('buildAckSafWalMatrix: input must be an array or object');
  }
  const merged = { ...input, ...(options || {}) };
  const records = merged.records === undefined ? (merged.evidence === undefined ? [] : merged.evidence) : merged.records;
  return { records, options: merged };
}

function outcomeFor(cells) {
  if (cells.some((entry) => entry.outcome === FAIL)) return FAIL;
  if (cells.some((entry) => entry.outcome === NOT_TESTED)) return NOT_TESTED;
  return PASS;
}

function countsFor(cells) {
  return {
    cells: cells.length,
    pass: cells.filter((entry) => entry.outcome === PASS).length,
    fail: cells.filter((entry) => entry.outcome === FAIL).length,
    notTested: cells.filter((entry) => entry.outcome === NOT_TESTED).length
  };
}

export function buildAckSafWalMatrix(input, options = {}) {
  const parsed = normalizeInput(input, options);
  const records = parsed.records;
  const settings = parsed.options;
  if (!Array.isArray(records)) {
    throw new TypeError('buildAckSafWalMatrix: records must be an array');
  }

  const expectedSha = normalizeExpectedSha(
    pick(settings, ['expectedSha', 'expected_sha', 'sourceSha', 'source_sha', 'sha']),
    'buildAckSafWalMatrix: expectedSha'
  );
  const expectedApkSha = normalizeExpectedSha(
    pick(settings, ['expectedApkSha', 'expected_apk_sha', ...APK_KEYS]),
    'buildAckSafWalMatrix: expectedApkSha'
  );
  const apiLevels = normalizeApiLevels(settings.apiLevels);

  const issues = [];
  const grouped = new Map();
  records.forEach((record, index) => {
    if (!isPlainObject(record)) {
      issues.push(Object.freeze({ code: 'malformed_record', index }));
      return;
    }
    const caseId = normalizeCaseId(pick(record, CASE_ID_KEYS));
    if (!caseId || !CASE_BY_ID.has(caseId)) {
      issues.push(Object.freeze({ code: 'unknown_case', index, caseId }));
      return;
    }
    const apiLevel = normalizeApiLevel(pick(record, API_KEYS));
    if (apiLevel === null) {
      issues.push(Object.freeze({ code: 'invalid_api', index, caseId }));
      return;
    }
    const key = `${caseId}@${apiLevel}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(record);
  });

  let duplicates = 0;
  let conflicts = 0;
  const cells = [];
  const infrastructure = [];

  for (const testCase of CASE_MATRIX) {
    for (const apiLevel of apiLevels) {
      const rawList = grouped.get(`${testCase.id}@${apiLevel}`) || [];
      let result;
      if (rawList.length === 0) {
        result = evaluateCase(testCase.id, null, { expectedSha, expectedApkSha, apiLevel });
      } else {
        const evaluated = rawList.map((record) => evaluateCase(testCase.id, record, {
          expectedSha,
          expectedApkSha,
          apiLevel
        }));
        const outcomes = new Set(evaluated.map((entry) => entry.outcome));
        if (outcomes.size > 1) {
          conflicts += 1;
          result = deepFreeze({
            ...evaluated[0],
            outcome: NOT_TESTED,
            status: NOT_TESTED,
            reasons: [...new Set(['conflicting_observations', ...evaluated.flatMap((entry) => entry.reasons)])],
            checks: evaluated[0].checks,
            classification: NOT_TESTED,
            evidenceCount: evaluated.length
          });
        } else {
          duplicates += evaluated.length - 1;
          result = evaluated[0];
        }
      }
      cells.push(result);
      if (result.infrastructure) {
        infrastructure.push(Object.freeze({
          caseId: result.caseId,
          apiLevel: result.apiLevel,
          classification: result.infrastructure.classification,
          kind: result.infrastructure.kind
        }));
      }
    }
  }

  const counts = countsFor(cells);
  counts.missing = cells.filter((entry) => entry.reasons.includes('missing_evidence')).length;
  counts.shaMismatch = cells.filter((entry) => entry.reasons.includes('sha_mismatch')).length;
  counts.conflicts = conflicts;
  counts.duplicates = duplicates;
  const overall = outcomeFor(cells);
  const observedSha = [...new Set(cells.map((entry) => entry.sourceSha).filter(Boolean))].sort();
  const observedApk = [...new Set(cells.map((entry) => entry.apkSha).filter(Boolean))].sort();

  const apis = apiLevels.map((apiLevel) => {
    const apiCells = cells.filter((entry) => entry.apiLevel === apiLevel);
    const apiCounts = countsFor(apiCells);
    return Object.freeze({
      apiLevel,
      outcome: outcomeFor(apiCells),
      counts: Object.freeze(apiCounts)
    });
  });

  const layers = LAYERS.map((layer) => {
    const layerCells = cells.filter((entry) => entry.layer === layer);
    const layerCounts = countsFor(layerCells);
    return Object.freeze({
      layer,
      outcome: outcomeFor(layerCells),
      counts: Object.freeze(layerCounts)
    });
  });

  const summary = deepFreeze({
    overall,
    ok: overall === PASS,
    counts: { ...counts },
    apis: apis.map((entry) => ({ apiLevel: entry.apiLevel, outcome: entry.outcome })),
    layers: layers.map((entry) => ({ layer: entry.layer, outcome: entry.outcome }))
  });

  return deepFreeze({
    schemaVersion: SCHEMA_VERSION,
    version: VERSION,
    overall,
    status: overall,
    outcome: overall,
    ok: overall === PASS,
    releaseApproved: false,
    expectedSha,
    apiLevels,
    sha: {
      expected: expectedSha,
      exact: expectedSha !== null && cells.length > 0 && observedSha.length === 1 && observedSha[0] === expectedSha,
      observed: observedSha,
      apkExpected: expectedApkSha,
      apkObserved: observedApk
    },
    counts,
    apis,
    layers,
    cells,
    infrastructure,
    issues,
    summary
  });
}

export function summarizeAckSafWalMatrix(report) {
  return report && report.summary ? report.summary : report;
}

export function formatAckSafWalMatrix(report) {
  const lines = [
    `Deep Focus native ACK/SAF/WAL matrix v${report.schemaVersion}`,
    `overall=${report.overall} releaseApproved=${report.releaseApproved}`,
    `sha=${report.sha.expected === null ? 'missing' : report.sha.expected} exact=${report.sha.exact}`,
    `cells=${report.counts.cells} pass=${report.counts.pass} fail=${report.counts.fail} notTested=${report.counts.notTested}`
  ];
  for (const cell of report.cells) {
    lines.push(`${cell.caseId}@${cell.apiLevel} ${cell.outcome} ${cell.reasons.join(',') || 'observed'}`);
  }
  return lines.join('\n');
}

export const buildMatrix = buildAckSafWalMatrix;
export const evaluateEvidence = buildAckSafWalMatrix;
export const evaluateNativeAckSafWalEvidence = buildAckSafWalMatrix;
export const summarizeMatrix = summarizeAckSafWalMatrix;
export const formatMatrix = formatAckSafWalMatrix;
