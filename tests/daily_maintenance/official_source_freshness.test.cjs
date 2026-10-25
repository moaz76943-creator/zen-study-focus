'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {classifySource}=require('../../tools/daily_maintenance/official_source_freshness.cjs');
const A='a'.repeat(40),B='b'.repeat(40);
test('only the exact official integration commit is verified',()=>{
 assert.equal(classifySource(A,A).status,'EXACT_OFFICIAL_SOURCE');
 assert.equal(classifySource(A,B).status,'OFFICIAL_SOURCE_STALE');
 assert.equal(classifySource(A,A.toUpperCase()).status,'EXACT_OFFICIAL_SOURCE');
});
test('missing, malformed, or whitespace refs fail closed',()=>{
 for(const [checked,official] of [['',A],[A,''],['main',A],[A,'refs/heads/main'],[A,'  '+A]]) {
  assert.equal(classifySource(checked,official).status,'OFFICIAL_SOURCE_NOT_VERIFIED');
 }
});
test('scheduled daily workflow compares official integration to checked SHA and records blocker',()=>{
 const yml=fs.readFileSync(path.join(__dirname,'../../.github/workflows/daily_maintenance.yml'),'utf8');
 assert.match(yml,/integration\/master-qa-verified-v21/);
 assert.match(yml,/official_source_freshness\.cjs/);
 assert.match(yml,/OFFICIAL_SOURCE_STALE_OR_NOT_VERIFIED/);
 assert.match(yml,/github\.event_name == 'schedule'/);
 assert.match(yml,/git -C source rev-parse HEAD/);
});
