/**
 * DEEP FOCUS — Room5 Android E2E Outcome Matrix (task C04)
 * Pure, standalone, offline builder for Android API30/API35 end-to-end
 * outcome matrices. Every cell is tied to an exact source SHA; missing,
 * malformed, conflicting or mismatched evidence is NOT_TESTED and can
 * never become a false PASS. Zero networking, zero dependencies, zero
 * persistence side-effects, deterministic read-only output.
 *
 * Public API (stable):
 *   VERSION, REQUIRED_API_LEVELS, OUTCOMES, VERDICTS, DEFAULT_CHECK
 *   normalizeSha(value) -> lowercase full SHA or null
 *   isExactSha(value) -> boolean
 *   evaluateE2eRecord(record, options) -> normalized observation
 *   buildE2eMatrix(recordsOrOptions, options) -> report
 *   summarizeE2eMatrix(report) -> compact summary
 *   formatE2eMatrix(report) -> deterministic text
 */

export const VERSION = 1;

export const REQUIRED_API_LEVELS = Object.freeze([30, 35]);

export const OUTCOMES = Object.freeze(['PASS', 'FAIL', 'NOT_TESTED']);

export const VERDICTS = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
  INCOMPLETE: 'INCOMPLETE'
});

export const DEFAULT_CHECK = 'e2e';

const PASS_OUTCOME = 'PASS';
const FAIL_OUTCOME = 'FAIL';
const NOT_TESTED_OUTCOME = 'NOT_TESTED';

const PASS_WORDS = new Set(['pass', 'passed', 'success', 'succeeded', 'ok', 'true']);
const FAIL_WORDS = new Set([
  'fail', 'failed', 'failure', 'error', 'errored', 'timed_out', 'timedout', 'timeout', 'false'
]);

const SHA_PATTERN = /^(?:[0-9a-fA-F]{40}|[0-9a-fA-F]{64})$/;

const INVALIDATING_REASONS = new Set([
  'invalid_sha',
  'missing_sha',
  'sha_mismatch',
  'invalid_apk_sha',
  'missing_apk_sha',
  'apk_sha_mismatch'
]);

const INTEGRITY_ISSUES = new Set([
  'conflicting_observations',
  'sha_mismatch',
  'sha_inconsistent',
  'apk_sha_mismatch'
]);

const REASON_MESSAGES = Object.freeze({
  invalid_sha: 'source SHA must be a full 40 or 64 character hexadecimal digest',
  missing_sha: 'source SHA is missing',
  sha_mismatch: 'source SHA does not match the expected exact SHA',
  invalid_apk_sha: 'APK SHA must be a full 40 or 64 character hexadecimal digest',
  missing_apk_sha: 'APK SHA is required by expectedApkSha',
  apk_sha_mismatch: 'APK SHA does not match the expected exact APK SHA'
});

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

function pick(record, keys) {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function normalizeToken(value) {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/[\s-]+/g, '_')
    : '';
}

/**
 * Return a lowercased exact source/apk SHA, or null when the value is
 * not a full 40 or 64 character hexadecimal digest. Short SHAs are
 * deliberately rejected because matrix evidence must name exact source.
 */
export function normalizeSha(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!SHA_PATTERN.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

export function isExactSha(value) {
  return normalizeSha(value) !== null;
}

function normalizeApiLevelValue(value) {
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
    throw new TypeError('buildE2eMatrix: apiLevels must be a non-empty array of integers');
  }
  const levels = new Set();
  for (const item of value) {
    if (typeof item !== 'number') {
      throw new TypeError('buildE2eMatrix: apiLevels must contain only positive integers');
    }
    const apiLevel = normalizeApiLevelValue(item);
    if (apiLevel === null) {
      throw new TypeError('buildE2eMatrix: apiLevels must contain only positive integers');
    }
    levels.add(apiLevel);
  }
  return [...levels].sort((left, right) => left - right);
}

function normalizeChecks(value) {
  if (value === undefined) return null;
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError('buildE2eMatrix: checks must be a non-empty array of strings');
  }
  const checks = new Set();
  for (const item of value) {
    if (typeof item !== 'string' || item.trim() === '') {
      throw new TypeError('buildE2eMatrix: checks must contain only non-empty strings');
    }
    checks.add(item.trim());
  }
  return [...checks].sort();
}

function normalizeExpectedSha(value, label) {
  if (value === undefined || value === null || value === '') return null;
  const sha = normalizeSha(value);
  if (sha === null) {
    throw new TypeError(`buildE2eMatrix: ${label} must be an exact 40 or 64 character hexadecimal SHA`);
  }
  return sha;
}

function normalizeOutcomeValue(value) {
  const token = normalizeToken(value);
  if (PASS_WORDS.has(token)) return PASS_OUTCOME;
  if (FAIL_WORDS.has(token)) return FAIL_OUTCOME;
  return NOT_TESTED_OUTCOME;
}

function resolveOutcome(record) {
  const explicit = pick(record, ['outcome', 'result']);
  if (explicit !== undefined) return normalizeOutcomeValue(explicit);

  const status = pick(record, ['status']);
  const conclusion = pick(record, ['conclusion']);
  if (status !== undefined && conclusion !== undefined) {
    const statusToken = normalizeToken(status);
    const conclusionToken = normalizeToken(conclusion);
    if (statusToken === 'completed' && PASS_WORDS.has(conclusionToken)) return PASS_OUTCOME;
    if (statusToken === 'completed' && FAIL_WORDS.has(conclusionToken)) return FAIL_OUTCOME;
    if (FAIL_WORDS.has(statusToken)) return FAIL_OUTCOME;
    return NOT_TESTED_OUTCOME;
  }
  if (status !== undefined) return normalizeOutcomeValue(status);
  if (conclusion !== undefined) return normalizeOutcomeValue(conclusion);
  return NOT_TESTED_OUTCOME;
}

function normalizeCheckValue(value) {
  if (typeof value !== 'string' || value.trim() === '') return DEFAULT_CHECK;
  return value.trim();
}

function observationView(observation) {
  return {
    outcome: observation.outcome,
    sourceSha: observation.sourceSha,
    apkSha: observation.apkSha,
    reasons: [...observation.reasons]
  };
}

/**
 * Normalize and validate one raw test observation. Invalid records throw
 * TypeError; missing or malformed evidence becomes NOT_TESTED/FAIL as
 * appropriate rather than being silently promoted to PASS.
 */
export function evaluateE2eRecord(raw, options = {}) {
  if (!isPlainObject(raw)) {
    throw new TypeError('evaluateE2eRecord: record must be a plain object');
  }
  const expectedSha = normalizeExpectedSha(options.expectedSha, 'expectedSha');
  const expectedApkSha = normalizeExpectedSha(options.expectedApkSha, 'expectedApkSha');

  const rawApiLevel = pick(raw, ['apiLevel', 'api', 'api_level', 'sdk', 'sdkLevel', 'apiVersion']);
  const apiLevel = normalizeApiLevelValue(rawApiLevel);
  if (apiLevel === null) {
    throw new TypeError('evaluateE2eRecord: record must include a valid integer apiLevel');
  }

  const check = normalizeCheckValue(pick(raw, ['check', 'name', 'test', 'testName', 'scenario']));
  const outcome = resolveOutcome(raw);

  const rawSourceSha = pick(raw, ['sourceSha', 'sha', 'commitSha', 'commit', 'headSha']);
  const sourceSha = normalizeSha(rawSourceSha);
  const rawApkSha = pick(raw, ['apkSha', 'apk_sha', 'apkDigest', 'apk_digest']);
  const apkSha = normalizeSha(rawApkSha);

  const reasons = new Set();
  if (sourceSha === null) {
    if (rawSourceSha === undefined) reasons.add('missing_sha');
    else reasons.add('invalid_sha');
  }
  if (rawApkSha !== undefined && apkSha === null) reasons.add('invalid_apk_sha');

  let shaMatch = null;
  if (expectedSha !== null) {
    if (sourceSha === null) {
      shaMatch = false;
    } else {
      shaMatch = sourceSha === expectedSha;
      if (!shaMatch) reasons.add('sha_mismatch');
    }
  }

  let apkShaMatch = null;
  if (expectedApkSha !== null) {
    if (apkSha === null) {
      apkShaMatch = false;
      if (rawApkSha === undefined) reasons.add('missing_apk_sha');
    } else {
      apkShaMatch = apkSha === expectedApkSha;
      if (!apkShaMatch) reasons.add('apk_sha_mismatch');
    }
  }

  const finalOutcome =
    outcome === PASS_OUTCOME && [...reasons].some((reason) => INVALIDATING_REASONS.has(reason))
      ? NOT_TESTED_OUTCOME
      : outcome;

  return {
    apiLevel,
    check,
    outcome: finalOutcome,
    sourceSha,
    apkSha,
    exactSha: sourceSha !== null,
    shaMatch,
    apkShaMatch,
    reasons: [...reasons].sort()
  };
}

function createIssueCollector() {
  const issues = [];
  const seen = new Set();
  const add = (code, apiLevel, check, message) => {
    const key = `${code}\u0000${apiLevel === null ? '' : apiLevel}\u0000${check || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    issues.push({ code, apiLevel, check, message });
  };
  return { issues, add };
}

function addReasonIssues(add, apiLevel, check, reasons) {
  for (const reason of reasons) {
    const message = REASON_MESSAGES[reason];
    if (message) add(reason, apiLevel, check, message);
  }
}

function cellMatchesExpected(cell, expectedSha) {
  return expectedSha !== null && cell.sourceSha === expectedSha;
}

function apiVerdict(apiCells, expectedSha) {
  const hasIntegrityFailure = apiCells.some((cell) =>
    cell.reasons.includes('conflicting_observations') ||
    cell.reasons.includes('sha_mismatch') ||
    cell.reasons.includes('sha_inconsistent') ||
    cell.reasons.includes('apk_sha_mismatch')
  );
  if (apiCells.some((cell) => cell.outcome === FAIL_OUTCOME) || hasIntegrityFailure) {
    return VERDICTS.FAIL;
  }
  const allPass = apiCells.length > 0 && apiCells.every((cell) => cell.outcome === PASS_OUTCOME);
  const exact = apiCells.length > 0 && apiCells.every((cell) => cellMatchesExpected(cell, expectedSha));
  return allPass && exact ? VERDICTS.PASS : VERDICTS.INCOMPLETE;
}

function sortIssues(issues) {
  return issues.sort((left, right) => {
    if (left.code !== right.code) return left.code < right.code ? -1 : 1;
    const leftApi = left.apiLevel === null ? -1 : left.apiLevel;
    const rightApi = right.apiLevel === null ? -1 : right.apiLevel;
    if (leftApi !== rightApi) return leftApi - rightApi;
    const leftCheck = left.check || '';
    const rightCheck = right.check || '';
    return leftCheck < rightCheck ? -1 : leftCheck > rightCheck ? 1 : 0;
  });
}

function apiCounts(cells) {
  return {
    cells: cells.length,
    pass: cells.filter((cell) => cell.outcome === PASS_OUTCOME).length,
    fail: cells.filter((cell) => cell.outcome === FAIL_OUTCOME).length,
    notTested: cells.filter((cell) => cell.outcome === NOT_TESTED_OUTCOME).length,
    missing: cells.filter((cell) => cell.reasons.includes('missing_observation')).length
  };
}

/**
 * Build a read-only API30/API35 (or caller-selected) outcome matrix.
 * Accepts either an array of observations or an options object with a
 * `records`/`observations` array. PASS is only reported when every cell
 * is an explicit PASS tied to one exact, matching source SHA.
 */
export function buildE2eMatrix(input, extraOptions = {}) {
  let options;
  if (Array.isArray(input)) {
    if (extraOptions !== undefined && !isPlainObject(extraOptions)) {
      throw new TypeError('buildE2eMatrix: options must be a plain object');
    }
    options = { ...extraOptions, records: input };
  } else if (isPlainObject(input)) {
    if (extraOptions !== undefined && !isPlainObject(extraOptions)) {
      throw new TypeError('buildE2eMatrix: options must be a plain object');
    }
    options = { ...input, ...extraOptions };
  } else {
    throw new TypeError('buildE2eMatrix: expected an array of records or an options object');
  }

  const rawRecords = options.records !== undefined ? options.records : options.observations;
  if (!Array.isArray(rawRecords)) {
    throw new TypeError('buildE2eMatrix: records must be an array');
  }

  const apiLevels = normalizeApiLevels(options.apiLevels);
  const declaredExpectedSha = normalizeExpectedSha(options.expectedSha, 'expectedSha');
  const expectedApkSha = normalizeExpectedSha(options.expectedApkSha, 'expectedApkSha');
  const requestedChecks = normalizeChecks(options.checks);

  const observations = rawRecords.map((raw, index) => {
    if (!isPlainObject(raw)) {
      throw new TypeError(`buildE2eMatrix: record #${index} must be a plain object`);
    }
    return evaluateE2eRecord(raw, {
      expectedSha: declaredExpectedSha,
      expectedApkSha
    });
  });

  const selectedApiLevels = new Set(apiLevels);
  const derivedChecks = [...new Set(
    observations
      .filter((observation) => selectedApiLevels.has(observation.apiLevel))
      .map((observation) => observation.check)
  )].sort();
  const checks = requestedChecks !== null
    ? requestedChecks
    : derivedChecks.length > 0
      ? derivedChecks
      : [DEFAULT_CHECK];
  const selectedChecks = new Set(checks);

  const grouped = new Map();
  let ignoredRecords = 0;
  for (const observation of observations) {
    if (!selectedApiLevels.has(observation.apiLevel) || !selectedChecks.has(observation.check)) {
      ignoredRecords += 1;
      continue;
    }
    const key = `${observation.apiLevel}\u0000${observation.check}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(observation);
  }

  const issueCollector = createIssueCollector();
  const cells = [];
  let duplicates = 0;
  let conflicts = 0;

  for (const apiLevel of apiLevels) {
    for (const check of checks) {
      const key = `${apiLevel}\u0000${check}`;
      const group = grouped.get(key) || [];
      for (const observation of group) {
        addReasonIssues(issueCollector.add, apiLevel, check, observation.reasons);
      }

      if (group.length === 0) {
        cells.push({
          apiLevel,
          check,
          outcome: NOT_TESTED_OUTCOME,
          sourceSha: null,
          apkSha: null,
          exactSha: false,
          shaMatch: null,
          apkShaMatch: null,
          reasons: ['missing_observation'],
          observations: []
        });
        issueCollector.add(
          'missing_observation',
          apiLevel,
          check,
          'no observation was supplied for this API/check cell'
        );
        continue;
      }

      if (group.length === 1) {
        const observation = group[0];
        cells.push({
          ...observation,
          reasons: [...observation.reasons],
          observations: [observationView(observation)]
        });
        continue;
      }

      const signatures = new Set(group.map((observation) =>
        JSON.stringify([
          observation.outcome,
          observation.sourceSha,
          observation.apkSha,
          observation.reasons
        ])
      ));

      if (signatures.size === 1) {
        const observation = group[0];
        duplicates += group.length - 1;
        cells.push({
          ...observation,
          reasons: [...observation.reasons],
          observations: group.map(observationView)
        });
        continue;
      }

      conflicts += 1;
      cells.push({
        apiLevel,
        check,
        outcome: NOT_TESTED_OUTCOME,
        sourceSha: null,
        apkSha: null,
        exactSha: false,
        shaMatch: null,
        apkShaMatch: null,
        reasons: ['conflicting_observations'],
        observations: group.map(observationView)
      });
      issueCollector.add(
        'conflicting_observations',
        apiLevel,
        check,
        'duplicate observations disagree on outcome or exact SHA'
      );
    }
  }

  const observedShas = new Set();
  const observedApkShas = new Set();
  for (const group of grouped.values()) {
    for (const observation of group) {
      if (observation.sourceSha !== null) observedShas.add(observation.sourceSha);
      if (observation.apkSha !== null) observedApkShas.add(observation.apkSha);
    }
  }
  const observed = [...observedShas].sort();
  const apkObserved = [...observedApkShas].sort();

  let expectedSha = declaredExpectedSha;
  if (expectedSha === null && observed.length === 1) expectedSha = observed[0];
  if (declaredExpectedSha === null && observed.length > 1) {
    issueCollector.add(
      'sha_inconsistent',
      null,
      null,
      'observations reference more than one exact source SHA'
    );
  }

  for (const cell of cells) {
    if (expectedSha === null) {
      cell.shaMatch = null;
      continue;
    }
    cell.shaMatch = cell.sourceSha !== null && cell.sourceSha === expectedSha;
    if (cell.sourceSha !== null && !cell.shaMatch && !cell.reasons.includes('sha_mismatch')) {
      cell.reasons.push('sha_mismatch');
      cell.reasons.sort();
      issueCollector.add(
        'sha_mismatch',
        cell.apiLevel,
        cell.check,
        REASON_MESSAGES.sha_mismatch
      );
      if (cell.outcome === PASS_OUTCOME) cell.outcome = NOT_TESTED_OUTCOME;
    }
  }

  const exactSha = cells.length > 0 && expectedSha !== null &&
    cells.every((cell) => cell.sourceSha === expectedSha);

  const counts = {
    records: rawRecords.length,
    cells: cells.length,
    expected: cells.length,
    observed: cells.filter((cell) => cell.observations.length > 0).length,
    pass: cells.filter((cell) => cell.outcome === PASS_OUTCOME).length,
    fail: cells.filter((cell) => cell.outcome === FAIL_OUTCOME).length,
    notTested: cells.filter((cell) => cell.outcome === NOT_TESTED_OUTCOME).length,
    missing: cells.filter((cell) => cell.reasons.includes('missing_observation')).length,
    duplicates,
    conflicts,
    ignoredRecords,
    invalidSha: cells.filter((cell) => cell.reasons.includes('invalid_sha')).length,
    missingSha: cells.filter((cell) => cell.reasons.includes('missing_sha')).length,
    shaMismatch: cells.filter((cell) => cell.reasons.includes('sha_mismatch')).length,
    invalidApkSha: cells.filter((cell) => cell.reasons.includes('invalid_apk_sha')).length,
    missingApkSha: cells.filter((cell) => cell.reasons.includes('missing_apk_sha')).length,
    apkShaMismatch: cells.filter((cell) => cell.reasons.includes('apk_sha_mismatch')).length
  };

  const issues = sortIssues(issueCollector.issues);
  const hasIntegrityFailure = issues.some((issue) => INTEGRITY_ISSUES.has(issue.code));
  const allPass = cells.length > 0 && cells.every((cell) => cell.outcome === PASS_OUTCOME);
  let status;
  if (counts.fail > 0 || hasIntegrityFailure) status = VERDICTS.FAIL;
  else if (allPass && exactSha) status = VERDICTS.PASS;
  else status = VERDICTS.INCOMPLETE;

  const apis = apiLevels.map((apiLevel) => {
    const apiCells = cells.filter((cell) => cell.apiLevel === apiLevel);
    const apiStatus = apiVerdict(apiCells, expectedSha);
    return {
      apiLevel,
      status: apiStatus,
      ok: apiStatus === VERDICTS.PASS,
      counts: apiCounts(apiCells),
      cells: apiCells
    };
  });

  const summary = {
    version: VERSION,
    status,
    ok: status === VERDICTS.PASS,
    expectedSha,
    apiLevels: [...apiLevels],
    checks: [...checks],
    counts: { ...counts }
  };

  const report = {
    version: VERSION,
    status,
    ok: status === VERDICTS.PASS,
    expectedSha,
    apiLevels,
    checks,
    sha: {
      expected: expectedSha,
      exact: exactSha,
      observed,
      apkExpected: expectedApkSha,
      apkObserved
    },
    cells,
    apis,
    counts,
    issues,
    summary
  };

  return deepFreeze(report);
}

function assertReport(report, fnName) {
  if (
    !isPlainObject(report) ||
    typeof report.status !== 'string' ||
    !Array.isArray(report.cells) ||
    !Array.isArray(report.apis) ||
    !isPlainObject(report.sha) ||
    !isPlainObject(report.summary)
  ) {
    throw new TypeError(`${fnName}: expected a report produced by buildE2eMatrix`);
  }
}

export function summarizeE2eMatrix(report) {
  assertReport(report, 'summarizeE2eMatrix');
  return report.summary;
}

export function formatE2eMatrix(report) {
  assertReport(report, 'formatE2eMatrix');
  const lines = [];
  lines.push(`Android E2E Outcome Matrix v${report.version}`);
  lines.push(`Status: ${report.status}`);
  lines.push(`Expected SHA: ${report.sha.expected === null ? 'UNVERIFIED' : report.sha.expected}`);
  lines.push(`Exact SHA: ${report.sha.exact ? 'yes' : 'no'}`);
  if (report.sha.observed.length > 0) {
    lines.push(`Observed SHA: ${report.sha.observed.join(', ')}`);
  }
  if (report.sha.apkExpected !== null) {
    lines.push(`Expected APK SHA: ${report.sha.apkExpected}`);
  }
  for (const api of report.apis) {
    lines.push(`API ${api.apiLevel}: ${api.status} (${api.counts.pass}/${api.counts.cells} PASS)`);
    for (const cell of api.cells) {
      const sha = cell.sourceSha === null ? 'MISSING' : cell.sourceSha;
      const reasonText = cell.reasons.length > 0 ? ` reasons=${cell.reasons.join(',')}` : '';
      lines.push(`  [${cell.outcome}] ${cell.check} sha=${sha}${reasonText}`);
    }
  }
  if (report.issues.length > 0) {
    lines.push('Issues:');
    for (const issue of report.issues) {
      const apiText = issue.apiLevel === null ? '' : `API ${issue.apiLevel} `;
      const checkText = issue.check ? `${issue.check} ` : '';
      lines.push(`  ${issue.code} ${apiText}${checkText}${issue.message}`);
    }
  }
  return lines.join('\n');
}
