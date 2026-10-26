import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const path=new URL('../../tools/ai_agents/activate_termux.sh',import.meta.url);
const shell=readFileSync(path,'utf8');
test('activation helper is valid Bash and locked to pilot repo/issue',()=>{
  const result=spawnSync('bash',['-n',path.pathname],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.match(shell,/set -euo pipefail/);
  assert.match(shell,/moaz76943-creator\/zen-study-focus/);
  assert.match(shell,/ISSUE=307/);
});
test('activation refuses to enable until auth, labels, secret and PR permissions are checked',()=>{
  for(const mark of ['gh auth status','agent-ready','agent-safe','GROQ_API_KEY','can_approve_pull_request_reviews'])
    assert.ok(shell.includes(mark),'Missing: '+mark);
  assert.match(shell,/gh workflow run.*dry_run=true/);
  assert.match(shell,/gh workflow run.*dry_run=false/);
});
test('activation fails closed and never merges automatically',()=>{
  assert.match(shell,/trap .*EXIT/);
  assert.match(shell,/DF_AI_ENABLED --body false/);
  assert.match(shell,/DF_AI_ENABLED --body true/);
  assert.match(shell,/gh run watch/);
  assert.match(shell,/isDraft/);
  assert.doesNotMatch(shell,/gh pr merge|gh issue close|echo "\$GROQ_API_KEY"/);
});
