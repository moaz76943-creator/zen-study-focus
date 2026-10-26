import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const filename = new URL('../../tools/ai_agents/setup_termux.sh', import.meta.url);
const source = readFileSync(filename, 'utf8');
test('setup shell is valid Bash', ()=>{
 const p=spawnSync('bash',['-n',filename.pathname],{encoding:'utf8'});
 assert.equal(p.status,0,p.stderr);
});
test('setup is fail-closed and targets Deep Focus only',()=>{
 assert.match(source,/set -euo pipefail/);
 assert.match(source,/REPO='moaz76943-creator\/zen-study-focus'/);
 assert.match(source,/CURRENT_USER/);
 assert.match(source,/CURRENT_USER.*moaz76943-creator/);
});
test('setup never activates model or reveals input secret',()=>{
 assert.match(source,/gh variable set DF_AI_ENABLED --body false/);
 assert.match(source,/IFS= read -r -s -p/);
 assert.match(source,/printf '%s' "\$GROQ_KEY" \| gh secret set/);
 assert.doesNotMatch(source,/set -x\b|echo "\$GROQ_KEY"/);
});
test('first run dispatches dry-run only and does not approve PRs',()=>{
 assert.match(source,/gh workflow run "\$WORKFLOW".*dry_run=true/);
 assert.doesNotMatch(source,/can_approve_pull_request_reviews|gh pr merge|DF_AI_ENABLED --body true/);
});
