'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const yaml=fs.readFileSync(path.join(root,'.github/workflows/hourly_agent_orchestrator.yml'),'utf8');
test('GitHub schedules a separate hourly source-only scan and supports manual inspection',()=>{
 assert.match(yaml,/cron: '23 \* \* \* \*'/);
 assert.match(yaml,/workflow_dispatch:/);
 assert.match(yaml,/hourly_orchestrator\.cjs --root source --out/);
 assert.match(yaml,/node --test tests\/daily_maintenance\/hourly_\*\.test\.cjs/);
});
test('the hourly audit never gets a persisted checkout token or write access to sources',()=>{
 assert.equal((yaml.match(/persist-credentials: false/g)||[]).length,3);
 assert.match(yaml,/permissions:\n  contents: read/);
 assert.match(yaml,/contents: read\n      issues: write/);
 assert.doesNotMatch(yaml,/GH_TOKEN:|secrets\.GITHUB_TOKEN|contents: write|pull-requests: write|gh pr merge|force.push|assembleRelease|deploy/);
});
test('source refs are bounded; no uncontrolled dynamic selection of older releases',()=>{
 assert.match(yaml,/options: \[integration, main\]/);
 assert.match(yaml,/fix\/master-completion-20261020/);
 assert.doesNotMatch(yaml,/inputs\.arbitrary_ref/);
});
test('new agents cannot silently pass when checkout or test results fail',()=>{
 assert.match(yaml,/continue-on-error: true/);
 assert.match(yaml,/if: steps\.cohort\.outcome != 'success'/);
 assert.match(yaml,/NOT_TESTED: source checkout or audit failed/);
 assert.match(yaml,/deep-focus-hourly-agent-evidence/);
});
test('coordination uses the same concurrency lock as the deep QA runner',()=>{
 const daily=fs.readFileSync(path.join(root,'.github/workflows/daily_maintenance.yml'),'utf8');
 assert.match(yaml,/group: deep-focus-daily-maintenance/);
 assert.match(daily,/group: deep-focus-daily-maintenance/);
});
