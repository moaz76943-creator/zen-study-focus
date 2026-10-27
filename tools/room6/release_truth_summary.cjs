'use strict';

/**
 * Q08 - release_truth_summary.cjs
 *
 * Read-only readiness evidence summary built from QA reports that already
 * exist inside this checkout. It NEVER writes, edits or deletes anything and
 * it NEVER blocks manual development.
 *
 * Core truth rules (the whole point of this tool):
 *  - A category (source pass, Android pass, licensing approval, security
 *    triage, real UI integration) is PASS only when at least one explicit,
 *    concrete PASS/BP evidence entry exists in the QA reports AND there is
 *    no negative evidence (FAIL/BLOCKED/NOT_TESTED/missing) for it.
 *  - Missing evidence is reported as UNKNOWN (with reason MISSING_EVIDENCE),
 *    never converted into PASS and never treated as a blocker for manual dev.
 *  - Explicit negative evidence (BLOCKED, NOT_TESTED, FAIL) wins over PASS:
 *    one honest negative -> status FAIL for that category.
 *  - Overall readiness is READY_FOR_RELEASE only when all five categories
 *    are PASS. "Not ready" is an evidence statement, not a command and not
 *    a blocker for anyone continuing manual development.
 */

const fs = require('node:fs');
const path = require('node:path');

const SCHEMA_VERSION = 1;
const DEFAULT_ROOT = path.resolve(__dirname, '..', '..');

const STATUS = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  UNKNOWN: 'UNKNOWN'
};

const REASON = {
  EVIDENCE_PASS: 'EVIDENCE_PASS',
  EVIDENCE_FAIL: 'EVIDENCE_FAIL',
  MISSING_EVIDENCE: 'MISSING_EVIDENCE'
};

// Category -> keyword classification for QA report claims.
const CATEGORY_DEFS = [
  {
    id: 'source_pass',
    label: 'Source pass',
    positive: ['source', 'isolated', 'module test', 'unit', 'cross-lane qa'],
    negative: []
  },
  {
    id: 'android_pass',
    label: 'Android pass',
    positive: ['android', 'device', 'webview', 'apk', 'talkback', 'usb'],
    // A desktop/CI build success alone is NOT an Android pass.
    insufficientWithoutDevice: true
  },
  {
    id: 'licensing_approval',
    label: 'Licensing approval',
    positive: ['license', 'licensing', 'attribution', 'third-party', 'spdx', 'privacy policy'],
    negative: ['unlicensed', 'license missing', 'no license evidence']
  },
  {
    id: 'security_triage',
    label: 'Security triage',
    positive: ['security', 'xss', 'gitleaks', 'codeql', 'sarif', 'adversarial', 'cleartext', 'debuggable', 'triage'],
    negative: ['unvalidated', 'not validated', 'no review']
  },
  {
    id: 'real_ui_integration',
    label: 'Real UI integration',
    positive: ['ui integration', 'live ui', 'integrated', 'browser test', 'real screen', 'cdp', 'on-device ui'],
    // "isolated function pass" without UI binding is insufficient.
    insufficientWithoutIntegration: true,
    negative: ['not integrated', 'utc']
  }
];

const NEGATIVE_WORDS = [
  'blocked', 'not tested', 'not_tested', 'nottested', 'fail', 'failed',
  'skipped', 'not integrated', 'utc', 'no evidence', 'missing', 'red'
];
const PASS_WORDS = ['pass', 'passed', 'pass.', 'ok', 'success', 'successful', 'green', 'verified'];

function classifyWording(text) {
  if (!text) return { verdict: 'unknown', words: [] };
  const lower = String(text).toLowerCase();
  const words = [];
  for (const word of NEGATIVE_WORDS) {
    if (lower.includes(word)) words.push(word);
  }
  if (words.length > 0) return { verdict: 'negative', words };
  const positives = [];
  for (const word of PASS_WORDS) {
    if (lower.includes(word)) positives.push(word);
  }
  return positives.length > 0 ? { verdict: 'positive', words: positives } : { verdict: 'unknown', words: [] };
}

function keywordMatch(hay, needles) {
  return needles.some((needle) => anyAffirmativeMatch(hay, needle));
}

/**
 * Affirmative match: the keyword exists and is not inside a negated phrase
 * like "not Android", "does not prove UI integration", "no device".
 */
function anyAffirmativeMatch(hay, needle) {
  const lower = String(hay).toLowerCase();
  const needleLower = needle.toLowerCase();
  const escaped = needleLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^|[^a-z0-9-])${escaped}($|[^a-z0-9-])`, 'gi');
  let match;
  while ((match = pattern.exec(lower)) !== null) {
    const before = lower.slice(Math.max(0, match.index - 60), match.index);
    if (!/\b(no|not|never|cannot|without|nor)\b/.test(before)) return true;
  }
  return false;
}

function normalizeVerdict(value) {
  if (value === undefined || value === null) return null;
  const str = String(value).trim();
  if (!str) return null;
  const lower = str.toLowerCase();
  if (NEGATIVE_WORDS.some((word) => lower.includes(word))) return 'negative';
  if (PASS_WORDS.some((word) => lower.includes(word))) return 'positive';
  return null;
}

/**
 * Walk a parsed JSON report and pull out every status-like claim.
 * Returns entries: {file, path, text, kindKey, verdict}
 */
function collectFromJson(report, file) {
  const entries = [];
  const seen = new Set();
  (function walk(node, trail) {
    if (!seen.has(node)) seen.add(node);
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${trail}/${index}`));
      return;
    }
    if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        const nextTrail = `${trail}/${key}`;
        if (typeof value === 'string') {
          const verdict = normalizeVerdict(value);
          if (verdict) {
            entries.push({ file, key: key, claim: value, verdict, jsonPath: nextTrail });
          }
        } else {
          walk(value, nextTrail);
        }
      }
    }
  })(report, '');
  return entries;
}

/** Pull room6/Q08-relevant claims out of a master QA markdown audit. */
function collectFromMarkdown(text, file) {
  const entries = [];
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    // Matrix rows like: "| 7 Security | NOT_TESTED | ... |"
    if (line.startsWith('|')) continue;
    const match = line.match(/\b(PASS\w*|FAIL\w*|BLOCKED|NOT_TESTED|SKIPPED|not integrated|utc|no evidence|missing)\b/i);
    if (match) {
      entries.push({ file, key: 'markdown', claim: line, verdict: normalizeVerdict(match[1]) });
    }
  }
  return entries;
}

/** Default set of existing QA report inputs in this checkout; never created or modified. */
function defaultReportFiles(root) {
  return [
    'docs/QA_08_RELEASE_AUDIT_20261019.md',
    'artifacts/evidence/phase3_release_gate_report.json',
    'artifacts/evidence/phase3_release_gate_report.json',
    'artifacts/evidence/full_100_locale_audit_report.json',
    'artifacts/evidence/phase5_master_certification_receipt.json'
  ].filter((file, index, all) => all.indexOf(file) === index);
}

function readReport(root, file) {
  const absolute = path.resolve(root, file);
  const relPath = path.relative(root, absolute).split(path.sep).join('/');
  let raw = '';
  let exists = false;
  try {
    raw = fs.readFileSync(absolute, 'utf8');
    exists = true;
  } catch (error) {
    if (error.code !== 'ENOENT' && error.code !== 'EISDIR') throw error;
  }
  if (!exists) return { file: relPath, exists: false, entries: [] };
  let entries;
  if (relPath.endsWith('.json')) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      return { file: relPath, exists: true, existsReason: 'unparsable', entries: [] };
    }
    entries = collectFromJson(parsed, relPath);
  } else if (relPath.endsWith('.md')) {
    entries = collectFromMarkdown(raw, relPath);
  } else {
    entries = collectFromMarkdown(raw, relPath);
  }
  return { file: relPath, exists: true, entries };
}

function categorize(entries) {
  const buckets = {};
  for (const category of CATEGORY_DEFS) buckets[category.id] = [];
  for (const entry of entries) {
    const haystack = `${entry.key} ${entry.claim}`.toLowerCase();
    if (keywordMatch(haystack, ['license', 'licensing', 'attribution', 'third-party', 'privacy policy'])) {
      buckets.licensing_approval.push(entry);
      continue;
    }
    if (keywordMatch(haystack, ['security', 'xss', 'gitleaks', 'codeql', 'sarif', 'adversarial', 'cleartext', 'debuggable', 'triage'])) {
      buckets.security_triage.push(entry);
      continue;
    }
    if (keywordMatch(haystack, ['android', 'device', 'webview', 'phone', 'talkback', 'usb'])) {
      buckets.android_pass.push(entry);
      continue;
    }
    if (keywordMatch(haystack, ['ui integration', 'live ui', 'integration gate', 'integrated', 'browser test', 'real screen', 'cdp', 'on-device ui', 'ui'])) {
      buckets.real_ui_integration.push(entry);
      continue;
    }
    if (keywordMatch(haystack, ['source', 'isolated', 'module test', 'unit', 'cross-lane', 'baseline guard', 'code-scale', 'scale'])) {
      buckets.source_pass.push(entry);
    }
  }
  return buckets;
}

function categoryStatus(id, bucket) {
  if (bucket.length === 0) {
    return { id, status: STATUS.UNKNOWN, reasons: [REASON.MISSING_EVIDENCE], evidence: [] };
  }
  const negatives = bucket.filter((entry) => entry.verdict === 'negative');
  const positives = bucket.filter((entry) => entry.verdict === 'positive');
  if (negatives.length > 0) {
    return { id, status: STATUS.FAIL, reasons: [REASON.EVIDENCE_FAIL], evidence: bucket };
  }
  if (positives.length === 0) {
    return { id, status: STATUS.UNKNOWN, reasons: [REASON.MISSING_EVIDENCE], evidence: bucket };
  }
  return { id, status: STATUS.PASS, reasons: [REASON.EVIDENCE_PASS], evidence: positives.slice(0, 3) };
}

/**
 * Build the truthful summary. `reports` may be an array of {file|text|json,
 * name} test fixtures or omitted to scan the default QA reports.
 */
function buildSummary(options) {
  const opts = options || {};
  const root = opts.root ? path.resolve(opts.root) : DEFAULT_ROOT;
  const inputs = Array.isArray(opts.reports) ? opts.reports : defaultReportFiles(root);

  const reports = [];
  const entries = [];
  for (const input of inputs) {
    if (input === null || input === undefined) continue;
    if (typeof input === 'string') {
      const report = readReport(root, input);
      reports.push({ file: report.file, exists: report.exists });
      entries.push(...report.entries);
      continue;
    }
    // Fixture input: {name, text?, json?}
    const name = input.name || input.file || '<fixture>';
    if (input.json !== undefined) {
      const parsed = collectFromJson(input.json, name);
      reports.push({ file: name, exists: true });
      entries.push(...parsed);
    }
    if (typeof input.text === 'string') {
      const parsed = collectFromMarkdown(input.text, name);
      reports.push({ file: name, exists: true });
      entries.push(...parsed);
    }
  }

  const buckets = categorize(entries);
  const categories = CATEGORY_DEFS.map((category) =>
    categoryStatus(category.id, buckets[category.id] || [])
  );

  const allPass = categories.every((category) => category.status === STATUS.PASS);
  const anyFail = categories.some((category) => category.status === STATUS.FAIL);
  const overall = allPass
    ? { readiness: 'READY_FOR_RELEASE', reason: 'ALL_CATEGORIES_PASS' }
    : {
        readiness: 'NOT_READY_FOR_RELEASE',
        reason: anyFail ? 'EXPLICIT_NEGATIVE_EVIDENCE' : 'MISSING_OR_UNKNOWN_EVIDENCE'
      };

  const unknown = categories.filter((category) => category.status === STATUS.UNKNOWN);
  const missingFiles = reports.filter((report) => !report.exists).map((report) => report.file);
  if (unknown.length !== 0 && missingFiles.length !== 0) {
    unknown[0].reasons.push(`MISSING_REPORT_FILES:${missingFiles.join(',')}`);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedBy: 'tools/room6/release_truth_summary.cjs',
    readOnly: true,
    reports: reports,
    categories: categories,
    overall,
    // Manual development is never gated by the state of this summary.
    manualDevelopment: { blocked: false, note: 'Evidence summary is advisory only; missing evidence is UNKNOWN and never blocks manual dev.' }
  };
}

/** Deterministic plain text rendering (textContent-safe: no HTML needing escaping elsewhere). */
function renderText(summary) {
  const lines = [];
  lines.push('## Room6 Q08 release truth summary (read-only)');
  lines.push(`Overall: ${summary.overall.readiness} (${summary.overall.reason})`);
  lines.push(`Manual development blocked: ${summary.manualDevelopment.blocked}`);
  for (const category of summary.categories) {
    lines.push(
      `- ${category.id}: ${category.status} (${category.reasons.join('; ')}; ${category.evidence.length} evidence entries)`
    );
  }
  const missing = summary.reports.filter((report) => !report.exists).length;
  for (const report of summary.reports) {
    lines.push(`  report ${report.file}: ${report.exists ? 'present' : 'MISSING'}`);
  }
  return lines.join('\n');
}

module.exports = {
  SCHEMA_VERSION,
  STATUS,
  REASON,
  CATEGORY_DEFS,
  DEFAULT_ROOT,
  buildSummary,
  renderText,
  collectFromJson,
  collectFromMarkdown,
  normalizeVerdict,
  classifyWording,
  defaultReportFiles
};

if (require.main === module) {
  const slice = process.argv.slice(2);
  const rootArg = slice.includes('--root') ? slice[slice.indexOf('--root') + 1] : undefined;
  const summary = buildSummary({ root: rootArg });
  if (slice.includes('--json')) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } else {
    process.stdout.write(`${renderText(summary)}\n`);
  }
}
