import { appendFileSync, writeFileSync } from 'node:fs';
import { eligible, TARGET } from './guard.mjs';

const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');
const token = process.env.GH_TOKEN;
if (!owner || !repo || !token) throw Error('Required GitHub context missing');
const api = async (route) => {
  const response = await fetch('https://api.github.com/repos/' + owner + '/' + repo + route, {
    headers: {'Authorization':'Bearer ' + token, 'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}
  });
  if (!response.ok) throw Error('GitHub API returned ' + response.status);
  return response.json();
};
const requested = process.env.REQUESTED_ISSUE?.trim();
if (requested && !/^[1-9]\d{0,6}$/.test(requested)) throw Error('Invalid issue number');
const issues = requested ? [await api('/issues/' + requested)] :
  await api('/issues?state=open&labels=agent-ready%2Cagent-safe&per_page=100&sort=created&direction=asc');
let selected = null;
for (const issue of issues) {
  if (!eligible(issue)) continue;
  // Stable per-issue branch doubles as an idempotency lock after a successful PR.
  const branch = await fetch('https://api.github.com/repos/' + owner + '/' + repo + '/git/ref/heads/agent-repair/issue-' + issue.number, {
    headers:{'Authorization':'Bearer ' + token, 'Accept':'application/vnd.github+json'}
  });
  if (branch.status !== 404) {
    if (!branch.ok) throw Error('Cannot verify branch lock (' + branch.status + ')');
    continue;
  }
  selected = issue;
  break;
}
const output = process.env.GITHUB_OUTPUT;
if (!output) throw Error('Missing GitHub output path');
if (!selected) {
  appendFileSync(output, 'ready=false\n');
  console.log('No eligible unlocked issue; no model call');
} else {
  const number = selected.number;
  const filename = process.env.RUNNER_TEMP + '/df-ai-issue.txt';
  // Issue text is lower-trust task data; it cannot override the agent policy.
  const body = String(selected.body ?? '').slice(0,5000);
  const title = String(selected.title ?? '').slice(0,180);
  writeFileSync(filename, 'ISSUE #' + number + '\nTITLE: ' + title + '\nBODY (untrusted):\n' + body + '\n');
  appendFileSync(output, 'ready=true\nnumber=' + number + '\nbranch=agent-repair/issue-' + number + '\n');
  console.log('Eligible source-only task: issue #' + number + '; target ' + TARGET);
}
