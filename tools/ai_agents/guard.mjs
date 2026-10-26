import { execFileSync } from 'node:child_process';

// P0 safety-critical work always remains under human review and Android E2E gates.
export const TARGET = 'integration/master-qa-verified-v21';
export const LABELS = ['agent-ready', 'agent-safe'];
export const ALLOWED = ['tools/daily_maintenance/', 'tests/integration_quality/', 'docs/ai_agents/'];
export const TEST_PREFIX = 'tests/integration_quality/';
const BLOCKED = ['p0', 'security', 'release', 'privacy', 'data-loss', 'native-android', 'saf', 'blocked'];

export function eligible(issue) {
  const labels = new Set((issue.labels ?? []).map(x => typeof x === 'string' ? x.toLowerCase() : String(x.name ?? '').toLowerCase()));
  return issue.state === 'open' && !issue.pull_request &&
    LABELS.every(x => labels.has(x)) && !BLOCKED.some(x => labels.has(x));
}

export function validateChangedFiles(items) {
  if (items.length < 1 || items.length > 6) throw Error('Change set must contain 1–6 files');
  let changed = 0;
  let test = false;
  for (const item of items) {
    const {status, path, added, deleted} = item;
    if (!['M', 'A'].includes(status)) throw Error('Unsupported change type: ' + status);
    if (!ALLOWED.some(prefix => path.startsWith(prefix))) throw Error('Outside allowlist: ' + path);
    if (/\\|\.{2}|[\r\n]/.test(path) || path.includes('//') || path.startsWith('/')) throw Error('Unsafe path');
    if (!Number.isSafeInteger(added) || !Number.isSafeInteger(deleted)) throw Error('Binary or invalid diff');
    changed += added + deleted;
    if (path.startsWith(TEST_PREFIX) && /\.test\.cjs$/.test(path)) test = true;
  }
  if (changed > 250) throw Error('Too many changed lines');
  if (!test) throw Error('A source regression test in tests/integration_quality/*.test.cjs is required');
  return {files: items.length, changed};
}

export function stagedChanges(cwd = '.') {
  const raw = execFileSync('git', ['diff','--cached','--name-status','-z'], {cwd, encoding:'utf8'}).split('\0').filter(Boolean);
  const names = [];
  for (let i=0;i<raw.length;i+=2) {
    if (i+1>=raw.length) throw Error('Invalid Git name-status');
    names.push({status:raw[i],path:raw[i+1]});
  }
  const nums = execFileSync('git', ['diff','--cached','--numstat','-z'], {cwd, encoding:'utf8'}).split('\0').filter(Boolean);
  if (names.length !== nums.length) throw Error('Diff metadata mismatch');
  return names.map((name, i) => {
    const stat = /^(\d+|-)\t(\d+|-)\t(.+)$/.exec(nums[i]);
    if (!stat || stat[3] !== name.path) throw Error('Unexpected Git diff format');
    return {status:name.status,path:name.path,added:stat[1]==='-'?NaN:Number(stat[1]),deleted:stat[2]==='-'?NaN:Number(stat[2])};
  });
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  try { console.log(JSON.stringify(validateChangedFiles(stagedChanges(process.cwd())))); }
  catch (error) { console.error('AGENT_CHANGE_REJECTED: ' + error.message); process.exitCode=1; }
}
