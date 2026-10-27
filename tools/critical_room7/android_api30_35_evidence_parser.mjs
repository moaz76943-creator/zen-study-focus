export const SCHEMA_VERSION = 1;

export const OUTCOMES = Object.freeze(['PASS', 'FAIL', 'NOT_TESTED']);

export const CLASSIFICATIONS = Object.freeze({
  APP_DEFECT: 'APP_DEFECT',
  ADB_INFRA: 'ADB_INFRA',
  CDP_INFRA: 'CDP_INFRA',
  UIAUTOMATOR_INFRA: 'UIAUTOMATOR_INFRA',
  NOT_TESTED: 'NOT_TESTED'
});

export const REQUIRED_API_LEVELS = Object.freeze([30, 35]);

const PASS_OUTCOME = 'PASS';
const FAIL_OUTCOME = 'FAIL';
const NOT_TESTED_OUTCOME = 'NOT_TESTED';

const APP_DEFECT = CLASSIFICATIONS.APP_DEFECT;
const ADB_INFRA = CLASSIFICATIONS.ADB_INFRA;
const CDP_INFRA = CLASSIFICATIONS.CDP_INFRA;
const UIAUTOMATOR_INFRA = CLASSIFICATIONS.UIAUTOMATOR_INFRA;
const NOT_TESTED_CLASSIFICATION = CLASSIFICATIONS.NOT_TESTED;

const PASS_WORDS = new Set(['pass', 'passed', 'success', 'succeeded', 'ok', 'true']);
const FAIL_WORDS = new Set([
  'fail',
  'failed',
  'failure',
  'assert_failed',
  'assertion_failed',
  'assertion_error',
  'assertionerror'
]);
const UNKNOWN_WORDS = new Set([
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

const SHA_KEYS = ['sha', 'sourceSha', 'source_sha', 'headSha', 'head_sha', 'commitSha', 'commit_sha', 'commit'];
const API_KEYS = ['apiLevel', 'api_level', 'api', 'sdk', 'sdkLevel', 'sdk_level'];
const ID_KEYS = ['name', 'id', 'check', 'checkId', 'check_id', 'test', 'testName', 'scenario', 'case'];
const STATUS_KEYS = ['status', 'outcome', 'result', 'conclusion', 'testResult', 'test_result', 'testOutcome', 'test_outcome'];
const DETAIL_KEYS = ['detail', 'reason', 'message', 'error', 'failure', 'exception'];
const APK_KEYS = ['builtApkSha256', 'builtApkSha', 'built_apk_sha256', 'installedApkSha256', 'installedApkSha', 'installed_apk_sha256'];

const SHA_PATTERN = /^(?:[0-9a-fA-F]{40}|[0-9a-fA-F]{64})$/;
const ANSI_PATTERN = /\u001b\[[0-9;]*[A-Za-z]/g;
const MARKER_PATTERN = /^([A-Z][A-Z0-9_]{1,})\s*=\s*([A-Za-z][A-Za-z0-9_-]*)\s*$/;
const INFRA_PREFIX_PATTERN = /^(?:QA INFRA BLOCKER|TEST_INFRA|TEST_PROTOCOL|DEPENDENCY_NOT_TESTED|TRANSPORT)\s*:/i;
const INFRA_TEXT_PATTERN = /(?:cannot run[^\n]*(?:no emulator|no adb|emulator\/adb)|android package ?manager|runtime not_test|on-device[^\n]*(?:unavailable|not run))/i;

const FAILURE_RULES = [
  {
    classification: UIAUTOMATOR_INFRA,
    kind: 'uiautomator_unavailable',
    pattern: /(?:uiautomator|ui hierarchy|hierarchy dump|native (?:confirmation|dialog|confirm|control)[^\n]*(?:not observable|unavailable|missing|omitted|could not)|branded native confirmation|native ok button unavailable|resource-id\s*=\s*"android:id\/button1")/i
  },
  {
    classification: ADB_INFRA,
    kind: 'adb_or_emulator_failure',
    pattern: /(?:no connected emulator|no emulator\/?adb|requires an emulator\/adb|emulator[^\n]*(?:unavailable|lost|died|did not return|not booted|failed to boot|bootstrap)|adb[^\n]*(?:failed|timed out|timeout|offline|error|discovery)|device offline|package ?manager|package service|install[^\n]*(?:failed|timed out|timeout)|apk install|wait-for-device|ro\.kernel\.qemu)/i
  },
  {
    classification: CDP_INFRA,
    kind: 'cdp_transport_failure',
    pattern: /(?:\bcdp\b|devtools|websocket|runtime\.evaluate|json\/list|127\.0\.0\.1:9222|9222|no android asset webview|webview devtools|cdp target)/i
  },
  {
    classification: NOT_TESTED_CLASSIFICATION,
    kind: 'transport_or_not_tested',
    pattern: /(?:dependency_not_tested|not[_\s-]?tested|skipped|skip|cancelled|canceled|timed[_\s-]?out|timeout|network|socket|connect|transport)/i
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

function uniqueSorted(values) {
  return [...new Set(values)].sort();
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
    throw new TypeError('parseAndroidEvidenceLog: apiLevels must be a non-empty array');
  }
  const levels = [];
  for (const item of value) {
    const level = normalizeApiLevel(item);
    if (level === null) {
      throw new TypeError('parseAndroidEvidenceLog: apiLevels must contain positive integers');
    }
    if (!levels.includes(level)) levels.push(level);
  }
  return levels.sort((left, right) => left - right);
}

function normalizeStatus(value) {
  const token = normalizeToken(value);
  if (PASS_WORDS.has(token)) return PASS_OUTCOME;
  if (FAIL_WORDS.has(token)) return FAIL_OUTCOME;
  if (UNKNOWN_WORDS.has(token)) return NOT_TESTED_OUTCOME;
  return NOT_TESTED_OUTCOME;
}

function transportToken(value) {
  const token = normalizeToken(value);
  return [
    'timeout',
    'timed_out',
    'timedout',
    'transport_error',
    'transport_failure',
    'failed_ack',
    'ack_failed',
    'adb_error',
    'adb_offline',
    'device_offline',
    'emulator_lost',
    'install_timeout',
    'not_tested'
  ].includes(token);
}

export function classifyFailure(message) {
  const text = asString(message);
  if (!text) return null;
  for (const rule of FAILURE_RULES) {
    if (rule.pattern.test(text)) {
      return Object.freeze({
        classification: rule.classification,
        kind: rule.kind
      });
    }
  }
  return null;
}

function hasObservationShape(value) {
  if (!isPlainObject(value)) return false;
  if (Array.isArray(value.cases) || Array.isArray(value.observations)) return false;
  return [...STATUS_KEYS, ...ID_KEYS, ...DETAIL_KEYS].some((key) => value[key] !== undefined && value[key] !== null);
}

function parseJsonLine(line) {
  const trimmed = line.trim();
  if (!/^[\[{]/.test(trimmed) || !/[\]}]$/.test(trimmed)) return null;
  try {
    return JSON.parse(trimmed);
  } catch (_) {
    return null;
  }
}

function makeRawObservation(value, inheritedSha, inheritedApiLevel) {
  const ownSha = normalizeSha(pick(value, SHA_KEYS));
  const ownApi = normalizeApiLevel(pick(value, API_KEYS));
  return {
    value,
    sourceSha: ownSha || inheritedSha || null,
    apiLevel: ownApi === null ? (inheritedApiLevel === undefined ? null : inheritedApiLevel) : ownApi
  };
}

function collectStructured(value, inheritedSha, inheritedApiLevel, sink, depth) {
  if (depth > 8) return;
  if (Array.isArray(value)) {
    for (const item of value) collectStructured(item, inheritedSha, inheritedApiLevel, sink, depth + 1);
    return;
  }
  if (!isPlainObject(value)) return;

  const ownSha = normalizeSha(pick(value, SHA_KEYS)) || inheritedSha || null;
  const ownApiRaw = normalizeApiLevel(pick(value, API_KEYS));
  const ownApi = ownApiRaw === null ? inheritedApiLevel : ownApiRaw;

  if (Array.isArray(value.cases)) {
    for (const item of value.cases) collectStructured(item, ownSha, ownApi, sink, depth + 1);
    return;
  }
  if (Array.isArray(value.observations)) {
    for (const item of value.observations) collectStructured(item, ownSha, ownApi, sink, depth + 1);
    return;
  }
  if (hasObservationShape(value)) {
    sink.push(makeRawObservation(value, ownSha, ownApi));
  }
}

function collectTextObservations(text, sink) {
  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.replace(ANSI_PATTERN, '').trim();
    if (!line) continue;

    const parsed = parseJsonLine(line);
    if (parsed !== null) {
      collectStructured(parsed, null, null, sink, 0);
      continue;
    }

    const marker = MARKER_PATTERN.exec(line);
    if (marker) {
      const value = marker[2];
      const token = normalizeToken(value);
      if (!PASS_WORDS.has(token) && !FAIL_WORDS.has(token) && !UNKNOWN_WORDS.has(token)) continue;
      if (/^(?:GITHUB_SHA|.*_SHA|.*_SHA256|RELEASE_APPROVED)$/.test(marker[1])) continue;
      sink.push({
        value: { name: marker[1], status: value },
        sourceSha: null,
        apiLevel: null
      });
    }
  }
}

function extractTextSha(text) {
  const pattern = /\b(?:GITHUB_SHA|headSha|head_sha|sourceSha|source_sha|commitSha|commit_sha|sha)\b\s*[:=]\s*["']?([0-9a-fA-F]{40}|[0-9a-fA-F]{64})["']?/g;
  let match;
  const found = [];
  while ((match = pattern.exec(text)) !== null) {
    const sha = normalizeSha(match[1]);
    if (sha) found.push(sha);
  }
  return found;
}

function extractInfrastructure(text) {
  const events = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(ANSI_PATTERN, '').trim();
    if (!line || /^[\[{]/.test(line)) continue;
    if (!INFRA_PREFIX_PATTERN.test(line) && !INFRA_TEXT_PATTERN.test(line)) continue;
    const failure = classifyFailure(line) || {
      classification: NOT_TESTED_CLASSIFICATION,
      kind: 'unclassified_transport'
    };
    events.push({
      classification: failure.classification,
      kind: failure.kind,
      message: line.slice(0, 300),
      sourceSha: null
    });
  }
  return events;
}

function buildObservation(raw, options) {
  const value = raw.value;
  const id = asString(pick(value, ID_KEYS)) || 'unnamed_check';
  const rawStatusValue = pick(value, STATUS_KEYS);
  const rawStatus = asString(rawStatusValue);
  const detail = asString(pick(value, DETAIL_KEYS));
  const failure = classifyFailure(detail) || (transportToken(rawStatusValue) ? classifyFailure(rawStatusValue) : null);

  let outcome;
  let classification;
  let reason;
  if (failure) {
    outcome = NOT_TESTED_OUTCOME;
    classification = failure.classification;
    reason = failure.classification === NOT_TESTED_CLASSIFICATION
      ? 'not_tested:' + failure.kind
      : 'infra:' + failure.classification + ':' + failure.kind;
  } else {
    const status = normalizeStatus(rawStatusValue);
    if (status === PASS_OUTCOME) {
      outcome = PASS_OUTCOME;
      classification = null;
      reason = null;
    } else if (status === FAIL_OUTCOME) {
      outcome = FAIL_OUTCOME;
      classification = APP_DEFECT;
      reason = 'application_failure';
    } else {
      outcome = NOT_TESTED_OUTCOME;
      classification = NOT_TESTED_CLASSIFICATION;
      reason = rawStatus ? 'unexpected_result_token' : 'missing_result';
    }
  }

  let apiLevel = raw.apiLevel;
  if (apiLevel === null && options.apiLevels.length === 1) apiLevel = options.apiLevels[0];

  return {
    id,
    apiLevel,
    rawStatus: rawStatus || null,
    outcome,
    classification,
    reason,
    detail: detail || null,
    sourceSha: raw.sourceSha || null,
    shaMatch: null
  };
}

function applyShaGate(observation, canonicalSha, options) {
  if (options.invalidExpectedSha) {
    if (observation.outcome !== NOT_TESTED_OUTCOME || observation.classification === null) {
      observation.outcome = NOT_TESTED_OUTCOME;
      observation.classification = NOT_TESTED_CLASSIFICATION;
      observation.reason = 'invalid_expected_sha';
    }
    observation.shaMatch = false;
    return;
  }

  if (!observation.sourceSha) {
    if (observation.outcome !== NOT_TESTED_OUTCOME || observation.classification === null) {
      observation.outcome = NOT_TESTED_OUTCOME;
      observation.classification = NOT_TESTED_CLASSIFICATION;
      observation.reason = 'missing_sha';
    }
    observation.shaMatch = null;
    return;
  }

  if (canonicalSha === null) {
    if (observation.outcome !== NOT_TESTED_OUTCOME || observation.classification === null) {
      observation.outcome = NOT_TESTED_OUTCOME;
      observation.classification = NOT_TESTED_CLASSIFICATION;
      observation.reason = 'sha_inconsistent';
    }
    observation.shaMatch = false;
    return;
  }

  observation.shaMatch = observation.sourceSha === canonicalSha;
  if (!observation.shaMatch && (observation.outcome !== NOT_TESTED_OUTCOME || observation.classification === null)) {
    observation.outcome = NOT_TESTED_OUTCOME;
    observation.classification = NOT_TESTED_CLASSIFICATION;
    observation.reason = 'sha_mismatch';
  }
}

function observationInfrastructure(observation) {
  if (
    observation.classification === ADB_INFRA ||
    observation.classification === CDP_INFRA ||
    observation.classification === UIAUTOMATOR_INFRA ||
    observation.classification === NOT_TESTED_CLASSIFICATION
  ) {
    if (observation.outcome !== NOT_TESTED_OUTCOME) return null;
    return {
      classification: observation.classification,
      kind: observation.reason || 'not_tested',
      message: observation.detail || observation.id,
      sourceSha: observation.sourceSha
    };
  }
  return null;
}

function uniqueEvents(events) {
  const seen = new Set();
  const result = [];
  for (const event of events) {
    const key = `${event.classification}\u0000${event.kind}\u0000${event.message}\u0000${event.sourceSha || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(event);
  }
  return result;
}

function countClassification(events, classification) {
  return events.filter((event) => event.classification === classification).length;
}

function aggregateApi(apiLevel, observations) {
  const own = observations.filter((observation) => observation.apiLevel === apiLevel);
  const reasons = [];
  let outcome;
  if (own.length === 0) {
    outcome = NOT_TESTED_OUTCOME;
    reasons.push('no_observations');
  } else if (own.some((observation) => observation.outcome === FAIL_OUTCOME && observation.classification === APP_DEFECT)) {
    outcome = FAIL_OUTCOME;
    reasons.push('application_failure');
  } else if (own.some((observation) => observation.outcome === NOT_TESTED_OUTCOME)) {
    outcome = NOT_TESTED_OUTCOME;
    for (const observation of own) {
      if (observation.outcome === NOT_TESTED_OUTCOME) {
        reasons.push(observation.reason || 'not_tested');
      }
    }
  } else {
    outcome = own.every((observation) => observation.outcome === PASS_OUTCOME)
      ? PASS_OUTCOME
      : NOT_TESTED_OUTCOME;
    if (outcome === NOT_TESTED_OUTCOME) reasons.push('incomplete_observations');
  }
  return {
    apiLevel,
    outcome,
    reasons: uniqueSorted(reasons),
    observationIds: own.map((observation) => observation.id)
  };
}

export function parseAndroidEvidenceLog(input, options = {}) {
  if (!isPlainObject(options)) {
    throw new TypeError('parseAndroidEvidenceLog: options must be a plain object');
  }
  const apiLevels = normalizeApiLevels(options.apiLevels);
  const expectedRaw = options.expectedSha;
  const expectedWasSupplied = expectedRaw !== undefined && expectedRaw !== null;
  const expectedSha = normalizeSha(expectedRaw);
  const invalidExpectedSha = expectedWasSupplied && expectedSha === null;
  const optionSourceSha = normalizeSha(options.sourceSha);

  let text = '';
  const raws = [];
  if (typeof input === 'string') {
    text = input;
  } else if (isPlainObject(input) && typeof input.log === 'string') {
    text = input.log;
  } else if (isPlainObject(input) && typeof input.text === 'string') {
    text = input.text;
  } else if (Array.isArray(input) || isPlainObject(input)) {
    collectStructured(input, optionSourceSha, null, raws, 0);
  } else if (input !== undefined && input !== null) {
    text = String(input);
  }

  if (text) {
    collectTextObservations(text, raws);
  }

  const textShas = text ? extractTextSha(text) : [];
  const textInfrastructure = text ? extractInfrastructure(text) : [];
  const observations = raws.map((raw) => buildObservation(raw, { apiLevels }));

  const observedShas = uniqueSorted([
    ...observations.map((observation) => observation.sourceSha).filter(Boolean),
    ...(optionSourceSha ? [optionSourceSha] : []),
    ...textShas
  ]);

  let canonicalSha = expectedSha || optionSourceSha || (observedShas.length === 1 ? observedShas[0] : null);
  if (invalidExpectedSha) canonicalSha = null;

  for (const observation of observations) {
    applyShaGate(observation, canonicalSha, { invalidExpectedSha });
  }

  const observationInfra = observations.map(observationInfrastructure).filter(Boolean);
  const infrastructure = uniqueEvents([...textInfrastructure, ...observationInfra]);
  const apiReports = apiLevels.map((level) => aggregateApi(level, observations));

  const anyAppDefect = observations.some((observation) =>
    observation.outcome === FAIL_OUTCOME && observation.classification === APP_DEFECT
  );
  const exactSha = !invalidExpectedSha &&
    canonicalSha !== null &&
    observedShas.length > 0 &&
    observedShas.every((sha) => sha === canonicalSha) &&
    observations.every((observation) => observation.sourceSha === canonicalSha);

  let overall;
  if (anyAppDefect) {
    overall = FAIL_OUTCOME;
  } else if (
    invalidExpectedSha ||
    infrastructure.length > 0 ||
    observations.some((observation) => observation.outcome !== PASS_OUTCOME) ||
    apiReports.some((report) => report.outcome !== PASS_OUTCOME) ||
    !exactSha
  ) {
    overall = NOT_TESTED_OUTCOME;
  } else {
    overall = PASS_OUTCOME;
  }

  const reasons = new Set();
  if (invalidExpectedSha) reasons.add('invalid_expected_sha');
  if (observedShas.length === 0) reasons.add('missing_sha');
  if (canonicalSha === null && observedShas.length > 1) reasons.add('sha_inconsistent');
  if (observations.length === 0) reasons.add('no_observations');
  for (const observation of observations) {
    if (observation.outcome === NOT_TESTED_OUTCOME && observation.reason) reasons.add(observation.reason);
  }
  for (const report of apiReports) {
    for (const reason of report.reasons) reasons.add(`api${report.apiLevel}:${reason}`);
  }
  for (const event of infrastructure) {
    if (event.classification !== NOT_TESTED_CLASSIFICATION) {
      reasons.add(`infra:${event.classification}:${event.kind}`);
    }
  }

  const counts = {
    observations: observations.length,
    pass: observations.filter((observation) => observation.outcome === PASS_OUTCOME).length,
    fail: observations.filter((observation) => observation.outcome === FAIL_OUTCOME).length,
    notTested: observations.filter((observation) => observation.outcome === NOT_TESTED_OUTCOME).length,
    appDefect: observations.filter((observation) => observation.classification === APP_DEFECT).length,
    adbInfra: countClassification(infrastructure, ADB_INFRA),
    cdpInfra: countClassification(infrastructure, CDP_INFRA),
    uiAutomatorInfra: countClassification(infrastructure, UIAUTOMATOR_INFRA),
    infrastructureEvents: infrastructure.length,
    missingSha: observations.filter((observation) => observation.reason === 'missing_sha').length
  };

  const report = {
    schemaVersion: SCHEMA_VERSION,
    overall,
    ok: overall === PASS_OUTCOME,
    releaseApproved: false,
    expectedSha: invalidExpectedSha ? null : canonicalSha,
    observedShas,
    exactSha,
    apiLevels: apiReports,
    observations,
    infrastructure,
    counts,
    reasons: [...reasons].sort()
  };

  return deepFreeze(report);
}

export const parseAndroidApiEvidence = parseAndroidEvidenceLog;
export const parseEvidenceLog = parseAndroidEvidenceLog;
