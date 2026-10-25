'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {classify,OFFICIAL_REF}=require('../../tools/daily_maintenance/official_source_guard.cjs');
const a='a'.repeat(40),b='b'.repeat(40),c='c'.repeat(40);
test('only exact pinned and still-live official head is verified',()=>{
 assert.equal(classify(a,a,a,OFFICIAL_REF).status,'EXACT_OFFICIAL_SOURCE');
 assert.equal(classify(a,a,b,OFFICIAL_REF).status,'SOURCE_ADVANCED');
 assert.equal(classify(a,b,b,OFFICIAL_REF).status,'CHECKOUT_MISMATCH');
 assert.equal(classify(a,a,a,'main').status,'NON_OFFICIAL_AUDIT');
});
test('invalid or absent SHA cannot be counted as source PASS',()=>{
 for(const v of ['', 'main', '00', '  '+a, undefined])
  assert.equal(classify(v,a,a,OFFICIAL_REF).status,'SOURCE_NOT_VERIFIED');
 assert.equal(classify(a,a,c+'extra',OFFICIAL_REF).status,'SOURCE_NOT_VERIFIED');
});
test('hourly schedule pins official ref; never resolves historical PR #138',()=>{
 const yml=fs.readFileSync(path.join(__dirname,'../../.github/workflows/hourly_agent_orchestrator.yml'),'utf8');
 assert.match(yml,/integration\/master-qa-verified-v21/);
 assert.match(yml,/official_source_guard\.cjs/);
 assert.match(yml,/steps\.resolve\.outputs\.sha/);
 assert.doesNotMatch(yml,/integration\/master-recovery-20261021|pull_number:policy\.CANONICAL_PR/);
 assert.doesNotMatch(yml,/github\.rest\.issues\.create\(/);
 assert.match(yml,/issue_number:69/);
});
test('daily scheduler and weekly debug pin official source without PR #138',()=>{
 const yml=fs.readFileSync(path.join(__dirname,'../../.github/workflows/daily_maintenance.yml'),'utf8');
 assert.match(yml,/integration\/master-qa-verified-v21/);
 assert.match(yml,/official_source_guard\.cjs/);
 assert.doesNotMatch(yml,/integration\/master-recovery-20261021|pull_number:policy\.CANONICAL_PR/);
 assert.match(yml,/steps\.resolve\.outputs\.sha/);
 assert.match(yml,/OFFICIAL_SOURCE_NOT_VERIFIED/);
});
