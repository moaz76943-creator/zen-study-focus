'use strict';

export const SCHEMA_VERSION = 1;
export const POLICY_VERSION = 1;
export const VERSION = SCHEMA_VERSION;

export const OUTCOMES = Object.freeze(['PASS', 'FAIL', 'NOT_TESTED']);
export const STATUS = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
  NOT_TESTED: 'NOT_TESTED'
});
export const REQUIRED_WIDTHS = Object.freeze([320, 360, 393, 430]);
export const SURFACES = Object.freeze(['notes', 'tasks']);
export const KINDS = Object.freeze([
  'touch',
  'talkback',
  'force-stop-reopen',
  'talkback-force-stop-reopen'
]);

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
const WIDTH_KEYS = [
  'width',
  'viewportWidth',
  'viewport_width',
  'screenWidth',
  'screen_width',
  'cssWidth',
  'css_width'
];
const DEVICE_KEYS = ['device', 'deviceModel', 'device_model', 'model', 'deviceName', 'device_name'];
const SURFACE_KEYS = ['surface', 'tab', 'family'];
const KIND_KEYS = ['kind', 'scenario', 'flow'];
const SHA_KEYS = ['sha', 'sourceSha', 'source_sha', 'headSha', 'head_sha', 'commitSha', 'commit_sha', 'commit'];
const APK_KEYS = ['apkSha', 'apk_sha', 'apkDigest', 'apk_digest', 'installedApkSha256', 'builtApkSha256'];
const OUTCOME_KEYS = ['outcome', 'status', 'result', 'conclusion'];
const DETAIL_KEYS = ['detail', 'reason', 'message', 'error', 'exception'];
const FAILURE_KIND_KEYS = ['failureKind', 'failure_kind', 'transportKind', 'transport_kind', 'kind'];
const TRANSPORT_KEYS = [
  'transportError',
  'transport_error',
  'transportFailure',
  'transport_failure',
  'infra',
  'toolFailure',
  'infrastructureFailure'
];

const INFRA_RULES = [
  {
    classification: 'UIAUTOMATOR_INFRA',
    kind: 'uiautomator_unavailable',
    pattern: /uiautomator|\buia\b|hierarchy|accessibility service not running/i
  },
  {
    classification: 'ADB_INFRA',
    kind: 'adb_or_emulator_failure',
    pattern: /\badb\b|emulator|device[_ -]?offline|install|package ?manager|wait-for-device|ro\.kernel\.qemu/i
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

function normalizeWidth(value) {
  let number;
  if (typeof value === 'number') number = value;
  else if (typeof value === 'string' && value.trim() !== '') number = Number(value);
  else return null;
  if (!Number.isInteger(number) || number < 1 || number > 10000) return null;
  return number;
}

function normalizeWidths(value) {
  if (value === undefined) return [...REQUIRED_WIDTHS];
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError('buildNotesTouchAccessibilityMatrix: widths must be a non-empty array');
  }
  const widths = new Set();
  for (const item of value) {
    const width = normalizeWidth(item);
    if (width === null || !REQUIRED_WIDTHS.includes(width)) {
      throw new TypeError(
        'buildNotesTouchAccessibilityMatrix: widths must be one of ' + REQUIRED_WIDTHS.join(',')
      );
    }
    widths.add(width);
  }
  return [...widths].sort((left, right) => left - right);
}

function normalizeSha(value) {
  const text = asString(value);
  if (!SHA_PATTERN.test(text)) return null;
  return text.toLowerCase();
}

function normalizeExpectedSha(value, label) {
  if (value === undefined || value === null || value === '') return null;
  const sha = normalizeSha(value);
  if (sha === null) {
    throw new TypeError(`${label} must be an exact 40 or 64 character hexadecimal SHA`);
  }
  return sha;
}

function freezeCheck(check) {
  const view = { key: check.key };
  if (check.atLeast !== undefined) view.atLeast = check.atLeast;
  else view.equals = check.equals;
  return Object.freeze(view);
}

function freezeCase(definition) {
  return Object.freeze({
    id: definition.id,
    surface: definition.surface,
    kind: definition.kind,
    title: definition.title,
    checks: Object.freeze(definition.checks.map(freezeCheck))
  });
}

export const CASE_MATRIX = Object.freeze([
  freezeCase({
    id: 'NOTES-TOUCH',
    surface: 'notes',
    kind: 'touch',
    title: 'Notes primary touch targets stay reachable and persistent at this width',
    checks: [
      { key: 'primaryControlReachable', equals: true },
      { key: 'noHorizontalOverflow', equals: true },
      { key: 'minTouchTargetDp', atLeast: 48 },
      { key: 'editorOpened', equals: true },
      { key: 'savePersisted', equals: true }
    ]
  }),
  freezeCase({
    id: 'NOTES-TALKBACK',
    surface: 'notes',
    kind: 'talkback',
    title: 'TalkBack can focus, name, announce and activate Notes controls',
    checks: [
      { key: 'talkBackFocusReached', equals: true },
      { key: 'accessibleNameNonEmpty', equals: true },
      { key: 'accessibleRoleExposed', equals: true },
      { key: 'actionAnnounced', equals: true },
      { key: 'activationWorked', equals: true }
    ]
  }),
  freezeCase({
    id: 'NOTES-REOPEN',
    surface: 'notes',
    kind: 'force-stop-reopen',
    title: 'Notes survive force-stop and reopen with the v21 store intact',
    checks: [
      { key: 'forceStopIssued', equals: true },
      { key: 'reopenLaunched', equals: true },
      { key: 'recordPresentAfterReopen', equals: true },
      { key: 'contentIntactAfterReopen', equals: true },
      { key: 'v21StoreFormatIntact', equals: true }
    ]
  }),
  freezeCase({
    id: 'NOTES-TALKBACK-REOPEN',
    surface: 'notes',
    kind: 'talkback-force-stop-reopen',
    title: 'TalkBack still reaches intact Notes after force-stop and reopen',
    checks: [
      { key: 'forceStopIssued', equals: true },
      { key: 'reopenLaunched', equals: true },
      { key: 'talkBackFocusReached', equals: true },
      { key: 'accessibleNameNonEmpty', equals: true },
      { key: 'recordPresentAfterReopen', equals: true },
      { key: 'contentIntactAfterReopen', equals: true },
      { key: 'v21StoreFormatIntact', equals: true }
    ]
  }),
  freezeCase({
    id: 'TASKS-TOUCH',
    surface: 'tasks',
    kind: 'touch',
    title: 'Tasks primary touch targets stay reachable and functional at this width',
    checks: [
      { key: 'primaryControlReachable', equals: true },
      { key: 'noHorizontalOverflow', equals: true },
      { key: 'minTouchTargetDp', atLeast: 48 },
      { key: 'taskCreated', equals: true },
      { key: 'completionToggleWorked', equals: true }
    ]
  }),
  freezeCase({
    id: 'TASKS-TALKBACK',
    surface: 'tasks',
    kind: 'talkback',
    title: 'TalkBack can focus, name, announce and activate Tasks controls',
    checks: [
      { key: 'talkBackFocusReached', equals: true },
      { key: 'accessibleNameNonEmpty', equals: true },
      { key: 'accessibleRoleExposed', equals: true },
      { key: 'actionAnnounced', equals: true },
      { key: 'activationWorked', equals: true }
    ]
  }),
  freezeCase({
    id: 'TASKS-REOPEN',
    surface: 'tasks',
    kind: 'force-stop-reopen',
    title: 'Tasks survive force-stop and reopen with the v21 store intact',
    checks: [
      { key: 'forceStopIssued', equals: true },
      { key: 'reopenLaunched', equals: true },
      { key: 'recordPresentAfterReopen', equals: true },
      { key: 'contentIntactAfterReopen', equals: true },
      { key: 'v21StoreFormatIntact', equals: true }
    ]
  }),
  freezeCase({
    id: 'TASKS-TALKBACK-REOPEN',
    surface: 'tasks',
    kind: 'talkback-force-stop-reopen',
    title: 'TalkBack still reaches intact Tasks after force-stop and reopen',
    checks: [
      { key: 'forceStopIssued', equals: true },
      { key: 'reopenLaunched', equals: true },
      { key: 'talkBackFocusReached', equals: true },
      { key: 'accessibleNameNonEmpty', equals: true },
      { key: 'recordPresentAfterReopen', equals: true },
      { key: 'contentIntactAfterReopen', equals: true },
      { key: 'v21StoreFormatIntact', equals: true }
    ]
  })
]);

export const CASES = CASE_MATRIX;
const CASE_BY_ID = new Map(CASE_MATRIX.map((testCase) => [testCase.id, testCase]));

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

function checkView(check, actual) {
  const expected = check.atLeast !== undefined ? `>=${check.atLeast}` : check.equals;
  let outcome = NOT_TESTED;
  if (actual !== undefined) {
    outcome = check.atLeast !== undefined
      ? (typeof actual === 'number' && Number.isFinite(actual) && actual >= check.atLeast ? PASS : FAIL)
      : (sameValue(actual, check.equals) ? PASS : FAIL);
  }
  return Object.freeze({
    key: check.key,
    expected,
    actual: actual === undefined ? null : actual,
    outcome
  });
}

export function evaluateNotesTouchCell(caseId, width, rawEvidence, options = {}) {
  const normalizedId = normalizeCaseId(caseId);
  const testCase = normalizedId ? CASE_BY_ID.get(normalizedId) : undefined;
  if (!testCase) {
    throw new TypeError(`evaluateNotesTouchCell: unknown case id ${String(caseId)}`);
  }
  const normalizedWidth = normalizeWidth(width);
  if (normalizedWidth === null || !REQUIRED_WIDTHS.includes(normalizedWidth)) {
    throw new TypeError(`evaluateNotesTouchCell: width must be one of ${REQUIRED_WIDTHS.join(',')}`);
  }

  const expectedSha = normalizeExpectedSha(options.expectedSha, 'evaluateNotesTouchCell: expectedSha');
  const expectedApkSha = normalizeExpectedSha(
    options.expectedApkSha,
    'evaluateNotesTouchCell: expectedApkSha'
  );
  const base = {
    caseId: testCase.id,
    surface: testCase.surface,
    kind: testCase.kind,
    width: normalizedWidth,
    title: testCase.title,
    sourceSha: null,
    apkSha: null,
    device: null,
    outcome: NOT_TESTED,
    status: NOT_TESTED,
    reasons: [],
    checks: [],
    classification: NOT_TESTED,
    infrastructure: null
  };

  if (!isPlainObject(rawEvidence)) {
    const reason = rawEvidence === undefined || rawEvidence === null
      ? 'missing_evidence'
      : 'malformed_evidence';
    return deepFreeze({
      ...base,
      reasons: [reason],
      checks: testCase.checks.map((check) => checkView(check, undefined))
    });
  }

  const reasons = new Set();
  const infrastructure = classifyInfrastructure(rawEvidence);
  if (infrastructure) reasons.add(`infra:${infrastructure.kind}`);

  const rawSha = pick(rawEvidence, SHA_KEYS);
  const sourceSha = normalizeSha(rawSha);
  const rawApkSha = pick(rawEvidence, APK_KEYS);
  const apkSha = normalizeSha(rawApkSha);
  const rawWidth = pick(rawEvidence, WIDTH_KEYS);
  const observedWidth = normalizeWidth(rawWidth);
  const device = asString(pick(rawEvidence, DEVICE_KEYS));
  const rawSurface = pick(rawEvidence, SURFACE_KEYS);
  const surface = normalizeToken(rawSurface);
  const rawKind = pick(rawEvidence, KIND_KEYS);
  const kind = normalizeToken(rawKind);

  if (expectedSha === null) {
    reasons.add('missing_expected_sha');
  } else if (sourceSha === null) {
    reasons.add(rawSha === undefined ? 'missing_sha' : 'invalid_sha');
  } else if (sourceSha !== expectedSha) {
    reasons.add('sha_mismatch');
  }

  if (apkSha === null) {
    reasons.add(rawApkSha === undefined ? 'missing_apk_sha' : 'invalid_apk_sha');
  } else if (expectedApkSha !== null && apkSha !== expectedApkSha) {
    reasons.add('apk_sha_mismatch');
  }

  if (observedWidth === null) {
    reasons.add(rawWidth === undefined ? 'missing_width' : 'invalid_width');
  } else if (observedWidth !== normalizedWidth) {
    reasons.add('width_mismatch');
  }

  if (device === '') reasons.add('missing_device');
  if (surface !== '' && surface !== testCase.surface) reasons.add('surface_mismatch');
  if (kind !== '' && kind !== testCase.kind.replace(/-/g, '_')) reasons.add('kind_mismatch');

  const missingChecks = [];
  const failedChecks = [];
  const checks = testCase.checks.map((check) => {
    const present = Object.prototype.hasOwnProperty.call(rawEvidence, check.key)
      && rawEvidence[check.key] !== undefined;
    const view = checkView(check, present ? rawEvidence[check.key] : undefined);
    if (!present) missingChecks.push(check.key);
    else if (view.outcome === FAIL) failedChecks.push(check.key);
    return view;
  });

  if (missingChecks.length > 0) {
    reasons.add(`missing_checks:${missingChecks.slice().sort().join(',')}`);
  }
  for (const key of failedChecks) reasons.add(`check_failed:${key}`);

  const rawOutcome = pick(rawEvidence, OUTCOME_KEYS);
  const hasDeclared = rawOutcome !== undefined;
  const declared = normalizeOutcome(rawOutcome);
  const blocking = [...reasons].some((reason) => (
    !reason.startsWith('missing_checks:') && !reason.startsWith('check_failed:')
  ));

  let outcome;
  if (blocking) {
    outcome = NOT_TESTED;
  } else if (failedChecks.length > 0) {
    outcome = FAIL;
  } else if (missingChecks.length > 0) {
    outcome = NOT_TESTED;
  } else if (hasDeclared && declared === null) {
    reasons.add('invalid_outcome');
    outcome = NOT_TESTED;
  } else if (declared === NOT_TESTED) {
    reasons.add('explicit_not_tested');
    outcome = NOT_TESTED;
  } else if (declared === FAIL) {
    reasons.add('explicit_failure');
    outcome = FAIL;
  } else {
    outcome = PASS;
  }

  return deepFreeze({
    ...base,
    sourceSha,
    apkSha,
    device: device === '' ? null : device,
    outcome,
    status: outcome,
    reasons: [...reasons],
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
    throw new TypeError('buildNotesTouchAccessibilityMatrix: input must be an array or object');
  }
  const merged = { ...input, ...(options || {}) };
  const records = merged.records === undefined
    ? (merged.evidence === undefined ? [] : merged.evidence)
    : merged.records;
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

export function buildNotesTouchAccessibilityMatrix(input, options = {}) {
  const parsed = normalizeInput(input, options);
  const records = parsed.records;
  const settings = parsed.options;
  if (!Array.isArray(records)) {
    throw new TypeError('buildNotesTouchAccessibilityMatrix: records must be an array');
  }

  const expectedSha = normalizeExpectedSha(
    pick(settings, ['expectedSha', 'expected_sha', 'sourceSha', 'source_sha', 'sha']),
    'buildNotesTouchAccessibilityMatrix: expectedSha'
  );
  const expectedApkSha = normalizeExpectedSha(
    pick(settings, ['expectedApkSha', 'expected_apk_sha', ...APK_KEYS]),
    'buildNotesTouchAccessibilityMatrix: expectedApkSha'
  );
  const widths = normalizeWidths(settings.widths);

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
    const width = normalizeWidth(pick(record, WIDTH_KEYS));
    if (width === null || !REQUIRED_WIDTHS.includes(width)) {
      issues.push(Object.freeze({ code: 'invalid_width', index, caseId }));
      return;
    }
    const key = `${caseId}@${width}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(record);
  });

  let duplicates = 0;
  let conflicts = 0;
  const cells = [];
  const infrastructure = [];

  for (const testCase of CASE_MATRIX) {
    for (const width of widths) {
      const rawList = grouped.get(`${testCase.id}@${width}`) || [];
      let result;
      if (rawList.length === 0) {
        result = evaluateNotesTouchCell(testCase.id, width, null, {
          expectedSha,
          expectedApkSha
        });
      } else {
        const evaluated = rawList.map((record) => evaluateNotesTouchCell(testCase.id, width, record, {
          expectedSha,
          expectedApkSha
        }));
        const outcomes = new Set(evaluated.map((entry) => entry.outcome));
        if (outcomes.size > 1) {
          conflicts += 1;
          result = deepFreeze({
            ...evaluated[0],
            outcome: NOT_TESTED,
            status: NOT_TESTED,
            reasons: [...new Set([
              'conflicting_observations',
              ...evaluated.flatMap((entry) => entry.reasons)
            ])],
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
          width: result.width,
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

  const surfaces = SURFACES.map((surface) => {
    const surfaceCells = cells.filter((entry) => entry.surface === surface);
    return Object.freeze({
      surface,
      outcome: outcomeFor(surfaceCells),
      counts: Object.freeze(countsFor(surfaceCells))
    });
  });

  const widthSummaries = widths.map((width) => {
    const widthCells = cells.filter((entry) => entry.width === width);
    return Object.freeze({
      width,
      outcome: outcomeFor(widthCells),
      counts: Object.freeze(countsFor(widthCells))
    });
  });

  const summary = deepFreeze({
    overall,
    ok: overall === PASS,
    counts: { ...counts },
    widths: [...widths],
    surfaces: surfaces.map((entry) => ({ surface: entry.surface, outcome: entry.outcome })),
    widthSummaries: widthSummaries.map((entry) => ({ width: entry.width, outcome: entry.outcome }))
  });

  return deepFreeze({
    schemaVersion: SCHEMA_VERSION,
    version: VERSION,
    policyVersion: POLICY_VERSION,
    overall,
    status: overall,
    outcome: overall,
    ok: overall === PASS,
    androidPass: false,
    releaseApproved: false,
    expectedSha,
    expectedApkSha,
    widths,
    sha: {
      expected: expectedSha,
      exact: expectedSha !== null && cells.length > 0
        && observedSha.length === 1 && observedSha[0] === expectedSha,
      observed: observedSha,
      apkExpected: expectedApkSha,
      apkExact: expectedApkSha !== null && observedApk.length === 1
        && observedApk[0] === expectedApkSha,
      apkObserved: observedApk
    },
    counts,
    surfaces,
    widthSummaries,
    cells,
    infrastructure,
    issues,
    summary
  });
}

export function summarizeNotesTouchAccessibilityMatrix(report) {
  return report && report.summary ? report.summary : report;
}

export function formatNotesTouchAccessibilityMatrix(report) {
  const lines = [
    `Deep Focus Notes/Tasks touch+accessibility matrix v${report.schemaVersion}`,
    `overall=${report.overall} androidPass=${report.androidPass} releaseApproved=${report.releaseApproved}`,
    `sha=${report.sha.expected === null ? 'missing' : report.sha.expected} exact=${report.sha.exact}`,
    `cells=${report.counts.cells} pass=${report.counts.pass} fail=${report.counts.fail} notTested=${report.counts.notTested}`
  ];
  for (const cell of report.cells) {
    lines.push(`${cell.caseId}@${cell.width} ${cell.outcome} ${cell.reasons.join(',') || 'observed'}`);
  }
  return lines.join('\n');
}

export const buildMatrix = buildNotesTouchAccessibilityMatrix;
export const evaluateEvidence = buildNotesTouchAccessibilityMatrix;
export const evaluateNotesTouchEvidence = buildNotesTouchAccessibilityMatrix;
export const summarizeMatrix = summarizeNotesTouchAccessibilityMatrix;
export const formatMatrix = formatNotesTouchAccessibilityMatrix;
