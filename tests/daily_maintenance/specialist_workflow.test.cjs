'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),yaml=fs.readFileSync(path.join(root,'.github/workflows/daily_maintenance.yml'),'utf8');
const manifest=require('../../tools/daily_maintenance/agents.json');
test('two genuine daily cron runs plus a distinct weekly debug build',()=>{
 assert.match(yaml,/cron: '17 2 \* \* \*'/);
 assert.match(yaml,/cron: '17 14 \* \* \*'/);
 assert.match(yaml,/cron: '47 1 \* \* 5'/);
 assert.match(yaml,/github\.event\.schedule == '47 1 \* \* 5'/);
});
test('all twelve specialist agents are scheduled without granting app-source write permission',()=>{
 assert.equal(manifest.agents.length,12);
 assert.match(yaml,/quality_agents\.cjs --root source --out/);
 assert.match(yaml,/SPECIALIST_SOURCE_CHECKS_BLOCKED/);
 assert.match(yaml,/quality-agents\.md/);
 assert.match(yaml,/Open PR only for deterministic generated CSS repairs/);
 assert.doesNotMatch(yaml,/git push origin HEAD:refs\/heads\/main/);
 assert.doesNotMatch(yaml,/merge_pull_request|gh pr merge/);
});
test('manual dispatch allows targeted digit and sensitive-data regressions',()=>{
 for(const lane of ['numerals','notes','tasks','security','timer'])
  assert.match(yaml,new RegExp('\\b'+lane+'\\) lane=tests/'));
});
\ntest('source tests cannot read persisted checkout token and only safe repair step receives GH_TOKEN',()=>{
 const scope=yaml.slice(yaml.indexOf('  daily:'),yaml.indexOf('  weekly-debug:'));
 const globalEnv=scope.slice(scope.indexOf('    env:'),scope.indexOf('    steps:'));
 assert.doesNotMatch(globalEnv,/GH_TOKEN|GITHUB_TOKEN/);
 assert.match(scope,/path: source\n\s+fetch-depth: 0\n\s+persist-credentials: false/);
 const safe=scope.slice(scope.indexOf('      - name: Open PR only for deterministic'),scope.indexOf('      - name: Update one daily blockers'));
 assert.match(safe,/GH_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/);
 assert.match(safe,/gh auth setup-git/);
 assert.doesNotMatch(scope.slice(0,scope.indexOf('      - name: Open PR only for deterministic')),/GH_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/);
});
