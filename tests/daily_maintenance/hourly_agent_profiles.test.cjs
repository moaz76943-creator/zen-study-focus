'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const roles=['triage','repair','critic','localization','android','audio','data','release'];
test('repository agent contract references the real coordination system and protects historical features',()=>{
 const rules=read('AGENTS.md');
 for(const value of ['Issue #13','hourly_orchestrator.cjs','agents.json','source SHA','v21','ZEN21::','red','green','draft PR'])
  assert.ok(rules.toLowerCase().includes(value.toLowerCase()),value);
 assert.match(rules,/20 UI languages/);
 assert.match(rules,/No force push\/reset/);
 assert.match(rules,/no(t)? (a remotely hosted, autonomous reasoning model|Android E2E)/i);
});
test('all eight specialist code-agent profiles are present and contain review rules',()=>{
 for(const id of roles){
  const p='.github/agents/deep-focus-'+id+'.agent.md',text=read(p);
  assert.match(text,/^---\nname: deep-focus-/);
  assert.ok(text.includes('AGENTS.md')||text.includes('SPECIALIST_AGENTS.md'),id);
  assert.match(text,/SHA|source/i);
  assert.match(text,/review|merge|approval|PR/i);
 }
});
test('workflow PR checks also run when the root agent contract is changed',()=>{
 const workflow=read('.github/workflows/hourly_agent_orchestrator.yml');
 assert.match(workflow,/^\s+- 'AGENTS\.md'$/m);
 assert.match(workflow,/^\s+- '\.github\/agents\/\*\*'$/m);
 assert.match(workflow,/node --test tests\/daily_maintenance\/hourly_\*\.test\.cjs/);
});
