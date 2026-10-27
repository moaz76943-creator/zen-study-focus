/**
 * DEEP FOCUS — Room5 CI Signal Classifier (task A02)
 * Pure, standalone, offline classifier for CI signals with an emphasis on
 * Android outcomes. Never fabricates success: a PASS verdict requires an
 * explicit completed+success pair; anything missing, ambiguous, skipped,
 * cancelled or in-flight is NOT_TESTED. Zero networking, zero dependencies,
 * zero persistence side-effects, deterministic output.
 *
 * Public API (stable):
 *   OUTCOMES      -> ['PASS', 'FAIL', 'NOT_TESTED']
 *   SOURCES       -> ['github_actions', 'manual', 'unknown']
 *   PLATFORMS     -> ['android', 'generic', 'unknown']
 *   classifyOutcome(signal) -> 'PASS' | 'FAIL' | 'NOT_TESTED'
 *   classifySource(signal)  -> 'github_actions' | 'manual' | 'unknown'
 *   classifySignal(signal)  -> { source, platform, outcome, ok, reasons }
 *   formatReport(classification) -> string
 */

export const OUTCOMES = Object.freeze(['PASS', 'FAIL', 'NOT_TESTED']);
export const SOURCES = Object.freeze(['github_actions', 'manual', 'unknown']);
export const PLATFORMS = Object.freeze(['android', 'generic', 'unknown']);

const NOT_TESTED = 'NOT_TESTED';

const COMPLETED = 'completed';
const PASS_WORDS = new Set(['success', 'passed', 'pass', 'ok']);
const FAIL_WORDS = new Set(['failure', 'failed', 'fail', 'error', 'timed_out']);
const NON_RUN_WORDS = new Set(['', 'skipped', 'skip', 'cancelled', 'canceled', 'neutral', 'none', 'null', 'pending', 'waiting']);

const GITHUB_HINTS = ['.github/', 'github_actions', 'github-actions', 'workflow', 'gh_run', 'gh run'];
const MANUAL_HINTS = ['manual', 'local', 'hand-run', 'handrun'];
const ANDROID_HINTS = ['android', 'emulator', 'apk', 'gradle', 'connectedandroidtest', 'api-3', 'api_3', 'sdk-3'];

function asString(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function asLower(value) {
  return asString(value).toLowerCase();
}

function reason(signal, outcome) {
  if (signal === null || typeof signal !== 'object') {
    return 'missing-signal';
  }
  const status = asLower(signal.status);
  const conclusion = asLower(signal.conclusion);
  if (!status && !conclusion) return 'no-status-or-conclusion';
  if (status !== COMPLETED) return `status=${status || 'missing'}`;
  if (NON_RUN_WORDS.has(conclusion) && !PASS_WORDS.has(conclusion)) {
    return `conclusion=${conclusion || 'missing'}`;
  }
  return `conclusion=${conclusion}`;
}

/**
 * Classify the observed CI outcome.
 * PASS requires BOTH status==='completed' AND a known-success conclusion.
 * Everything else degrades to NOT_TESTED (never a false success).
 */
export function classifyOutcome(signal) {
  if (signal === null || typeof signal !== 'object' || Array.isArray(signal)) {
    return NOT_TESTED;
  }
  const status = asLower(signal.status);
  const conclusion = asLower(signal.conclusion);
  if (!status || !conclusion) return NOT_TESTED;
  if (status !== COMPLETED) return NOT_TESTED;
  if (FAIL_WORDS.has(conclusion)) return 'FAIL';
  if (PASS_WORDS.has(conclusion)) return 'PASS';
  return NOT_TESTED;
}

/**
 * Classify where the CI signal came from.
 */
export function classifySource(signal) {
  if (signal === null || typeof signal !== 'object' || Array.isArray(signal)) {
    return 'unknown';
  }
  const provider = asLower(signal.provider);
  const workflowPath = asLower(signal.workflowPath);
  if (provider === 'github_actions' || provider === 'github-actions' || provider === 'github-actions-ci') {
    return 'github_actions';
  }
  if (provider === 'manual' || provider === 'local') return 'manual';
  if (GITHUB_HINTS.some(hint => workflowPath.includes(hint)) || workflowPath.startsWith('.github/')) {
    return 'github_actions';
  }
  if (MANUAL_HINTS.some(hint => provider.includes(hint))) return 'manual';
  return 'unknown';
}

function containsAndroidHint(text) {
  return ANDROID_HINTS.some(hint => text.includes(hint));
}

/**
 * Classify the target platform of the signal.
 */
export function classifyPlatform(signal) {
  if (signal === null || typeof signal !== 'object' || Array.isArray(signal)) {
    return 'unknown';
  }
  const labels = Array.isArray(signal.labels) ? signal.labels : [];
  const labelsText = labels.map(asLower).join(' ');
  const workflowPath = asLower(signal.workflowPath);
  const platformRaw = asLower(signal.platform);
  const jobName = asLower(signal.jobName);
  const haystack = `${labelsText} ${workflowPath} ${platformRaw} ${jobName}`;
  if (platformRaw === 'android' || platformRaw === 'generic') {
    return platformRaw === 'android' ? 'android' : 'generic';
  }
  if (haystack && containsAndroidHint(haystack)) return 'android';
  if (haystack) return 'generic';
  return 'unknown';
}

/**
 * Full classification of one CI signal.
 * Returns { source, platform, outcome, ok, reasons } — reasons explain
 * why a signal was NOT treated as PASS/FAIL (auditability, no false success).
 */
export function classifySignal(signal) {
  if (signal === null || typeof signal !== 'object' || Array.isArray(signal)) {
    return Object.freeze({
      source: 'unknown',
      platform: 'unknown',
      outcome: NOT_TESTED,
      ok: false,
      reasons: ['missing-signal']
    });
  }
  const source = classifySource(signal);
  const platform = classifyPlatform(signal);
  const outcome = classifyOutcome(signal);
  const why = reason(signal, outcome);
  const reasons = [why];
  if (platform === 'android' && outcome === NOT_TESTED) {
    reasons.push('android-outcome-unverified');
  }
  return Object.freeze({
    source,
    platform,
    outcome,
    ok: outcome === 'PASS',
    reasons
  });
}

/**
 * Deterministic human-readable report of one classification.
 */
export function formatReport(classification) {
  if (classification === null || typeof classification !== 'object' || Array.isArray(classification)) {
    throw new TypeError('formatReport expects a classification object from classifySignal()');
  }
  const lines = [
    `CI Signal Report`,
    `  source=${classification.source}`,
    `  platform=${classification.platform}`,
    `  outcome=${classification.outcome}`,
    `  ok=${classification.ok === true}`
  ];
  const reasons = Array.isArray(classification.reasons) ? classification.reasons : [];
  if (reasons.length > 0) {
    lines.push(`  reasons: ${reasons.join('; ')}`);
  }
  return lines.join('\n');
}
