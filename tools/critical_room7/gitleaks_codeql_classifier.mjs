import { createHash } from 'node:crypto';

export const SCHEMA_VERSION = 1;

export const CLASSIFICATIONS = Object.freeze({
  VERIFIED: 'VERIFIED',
  UNVERIFIED: 'UNVERIFIED',
  TOOL_FAILURE: 'TOOL_FAILURE'
});

export const STATUS = Object.freeze({
  CLEAN: 'CLEAN',
  FINDINGS: 'FINDINGS',
  TOOL_FAILURE: 'TOOL_FAILURE'
});

export const REDACTION_MARKER = '[REDACTED_SECRET]';

const VERIFIED = CLASSIFICATIONS.VERIFIED;
const UNVERIFIED = CLASSIFICATIONS.UNVERIFIED;
const TOOL_FAILURE = CLASSIFICATIONS.TOOL_FAILURE;
const CLEAN = STATUS.CLEAN;
const FINDINGS = STATUS.FINDINGS;

const MAX_INPUT_CHARS = 8 * 1024 * 1024;
const MAX_FINDINGS = 10000;
const MAX_RUNS = 32;
const MAX_RULE_ID_LENGTH = 128;
const MAX_LINE = 100000000;

const SAFE_GITLEAKS_RULE = /^[a-z0-9][a-z0-9-]{0,127}$/;
const SAFE_CODEQL_RULE = /^[a-z][a-z0-9-]*\/[a-z0-9-]{1,64}(?:\/[a-z0-9-]{1,64}){0,3}$/;
const SAFE_COMMIT = /^[0-9a-fA-F]{7,64}$/;

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

function normalizeExitCode(value) {
  if (value === undefined || value === null) return 0;
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  return value;
}

function decodeInput(input) {
  if (typeof input === 'string') {
    if (input.length > MAX_INPUT_CHARS) return { error: 'INPUT_TOO_LARGE' };
    const text = input.replace(/^\uFEFF/, '');
    if (text.trim() === '') return { error: 'INVALID_JSON' };
    try {
      return { value: JSON.parse(text) };
    } catch (_) {
      return { error: 'INVALID_JSON' };
    }
  }
  if (input === null || typeof input !== 'object') return { error: 'INVALID_INPUT' };
  return { value: input };
}

function safeRuleId(value, pattern) {
  if (typeof value !== 'string') return 'unknown';
  if (value.length === 0 || value.length > MAX_RULE_ID_LENGTH) return 'unknown';
  if (!pattern.test(value)) return 'unknown';
  return value;
}

function pathFingerprint(value) {
  if (typeof value !== 'string' || value.length === 0) return '';
  return createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 16);
}

function safeLine(value) {
  if (typeof value !== 'number' || !Number.isInteger(value)) return 0;
  if (value < 0 || value > MAX_LINE) return 0;
  return value;
}

function safeCommit(value) {
  if (typeof value !== 'string' || !SAFE_COMMIT.test(value)) return '';
  return value.toLowerCase();
}

function isExplicitlyVerified(value) {
  if (!isPlainObject(value)) return false;
  if (value.Verified === true || value.verified === true) return true;
  if (isPlainObject(value.properties)) {
    if (value.properties.Verified === true || value.properties.verified === true) return true;
  }
  return false;
}

function baseReport(source) {
  return {
    schemaVersion: SCHEMA_VERSION,
    source,
    releaseApproved: false,
    falsePositiveAutoApplied: false
  };
}

function failureReport(source, reason) {
  return deepFreeze({
    ...baseReport(source),
    status: TOOL_FAILURE,
    classification: TOOL_FAILURE,
    ok: false,
    clean: false,
    toolFailure: true,
    reason,
    findingsCount: 0,
    counts: { verified: 0, unverified: 0, toolFailure: 1 },
    findings: []
  });
}

function cleanReport(source) {
  return deepFreeze({
    ...baseReport(source),
    status: CLEAN,
    classification: null,
    ok: true,
    clean: true,
    toolFailure: false,
    reason: null,
    findingsCount: 0,
    counts: { verified: 0, unverified: 0, toolFailure: 0 },
    findings: []
  });
}

function findingsReport(source, findings) {
  const verified = findings.filter((finding) => finding.classification === VERIFIED).length;
  const unverified = findings.length - verified;
  return deepFreeze({
    ...baseReport(source),
    status: FINDINGS,
    classification: verified > 0 ? VERIFIED : UNVERIFIED,
    ok: false,
    clean: false,
    toolFailure: false,
    reason: null,
    findingsCount: findings.length,
    counts: { verified, unverified, toolFailure: 0 },
    findings
  });
}

function gitleaksFinding(row) {
  const verified = isExplicitlyVerified(row);
  return Object.freeze({
    source: 'gitleaks',
    ruleId: safeRuleId(row.RuleID, SAFE_GITLEAKS_RULE),
    pathSha256_16: pathFingerprint(row.File),
    startLine: safeLine(row.StartLine),
    endLine: safeLine(row.EndLine),
    commit: safeCommit(row.Commit),
    classification: verified ? VERIFIED : UNVERIFIED,
    verified,
    secret: REDACTION_MARKER,
    match: REDACTION_MARKER
  });
}

export function parseGitleaksJSON(input, options = {}) {
  const settings = isPlainObject(options) ? options : {};
  const exitCode = normalizeExitCode(settings.exitCode);
  if (exitCode === null) return failureReport('gitleaks', 'INVALID_OPTIONS');

  const decoded = decodeInput(input);
  if (decoded.error) return failureReport('gitleaks', decoded.error);

  const rows = decoded.value;
  if (!Array.isArray(rows)) return failureReport('gitleaks', 'INVALID_GITLEAKS_REPORT');
  if (rows.length > MAX_FINDINGS) return failureReport('gitleaks', 'TOO_MANY_FINDINGS');
  if (exitCode !== 0 && exitCode !== 1) return failureReport('gitleaks', 'SCANNER_ERROR');
  if (rows.some((row) => !isPlainObject(row))) return failureReport('gitleaks', 'INVALID_GITLEAKS_REPORT');

  if (rows.length === 0) {
    if (exitCode !== 0) return failureReport('gitleaks', 'EMPTY_REPORT_WITH_FINDINGS_EXIT');
    return cleanReport('gitleaks');
  }

  return findingsReport('gitleaks', rows.map(gitleaksFinding));
}

function codeqlFinding(result, descriptors) {
  let rawRuleId = result.ruleId;

  if (Object.prototype.hasOwnProperty.call(result, 'ruleIndex')) {
    const index = result.ruleIndex;
    if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= descriptors.length) {
      return null;
    }
    const descriptor = descriptors[index];
    if (!isPlainObject(descriptor) || typeof descriptor.id !== 'string') return null;
    if (rawRuleId !== undefined && rawRuleId !== null && rawRuleId !== descriptor.id) return null;
    rawRuleId = descriptor.id;
  }

  const verified = isExplicitlyVerified(result);
  const finding = {
    source: 'codeql',
    ruleId: safeRuleId(rawRuleId, SAFE_CODEQL_RULE),
    pathSha256_16: '',
    startLine: 0,
    classification: verified ? VERIFIED : UNVERIFIED,
    verified
  };

  const locations = result.locations;
  if (Array.isArray(locations) && isPlainObject(locations[0])) {
    const physical = locations[0].physicalLocation;
    if (isPlainObject(physical)) {
      const artifact = physical.artifactLocation;
      if (isPlainObject(artifact)) finding.pathSha256_16 = pathFingerprint(artifact.uri);
      const region = physical.region;
      if (isPlainObject(region)) finding.startLine = safeLine(region.startLine);
    }
  }

  return Object.freeze(finding);
}

export function parseCodeQLJSON(input, options = {}) {
  const settings = isPlainObject(options) ? options : {};
  const exitCode = normalizeExitCode(settings.exitCode);
  if (exitCode === null) return failureReport('codeql', 'INVALID_OPTIONS');
  if (exitCode !== 0) return failureReport('codeql', 'SCANNER_ERROR');

  const decoded = decodeInput(input);
  if (decoded.error) return failureReport('codeql', decoded.error);

  const sarif = decoded.value;
  if (!isPlainObject(sarif) || sarif.version !== '2.1.0') {
    return failureReport('codeql', 'INVALID_CODEQL_SARIF');
  }

  const runs = sarif.runs;
  if (!Array.isArray(runs) || runs.length === 0 || runs.length > MAX_RUNS) {
    return failureReport('codeql', 'INVALID_CODEQL_SARIF');
  }

  const findings = [];
  for (const run of runs) {
    if (!isPlainObject(run) || !isPlainObject(run.tool) || !isPlainObject(run.tool.driver)) {
      return failureReport('codeql', 'INVALID_CODEQL_SARIF');
    }
    if (run.tool.driver.name !== 'CodeQL' || !Array.isArray(run.results)) {
      return failureReport('codeql', 'INVALID_CODEQL_SARIF');
    }

    const descriptors = run.tool.driver.rules === undefined ? [] : run.tool.driver.rules;
    if (!Array.isArray(descriptors)) return failureReport('codeql', 'INVALID_CODEQL_SARIF');

    for (const result of run.results) {
      if (!isPlainObject(result)) return failureReport('codeql', 'INVALID_CODEQL_SARIF');
      const finding = codeqlFinding(result, descriptors);
      if (finding === null) return failureReport('codeql', 'INVALID_CODEQL_SARIF');
      findings.push(finding);
      if (findings.length > MAX_FINDINGS) return failureReport('codeql', 'TOO_MANY_FINDINGS');
    }
  }

  if (findings.length === 0) return cleanReport('codeql');
  return findingsReport('codeql', findings);
}

export const parseGitleaksReport = parseGitleaksJSON;
export const parseCodeQLSARIF = parseCodeQLJSON;
export const parseCodeqlJSON = parseCodeQLJSON;
export const parseCodeQlJSON = parseCodeQLJSON;
