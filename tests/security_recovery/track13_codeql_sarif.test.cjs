'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const code = path.join(root,'tools/security/track13_codeql_sarif_report.py');
const SHA = 'b'.repeat(40);
function run(sarif, sourceSha = SHA) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'df-codeql-'));
  if(sarif !== null) fs.writeFileSync(path.join(dir,'report.sarif'),typeof sarif === 'string' ? sarif : JSON.stringify(sarif),{mode:0o600});
  try { const r = spawnSync('python3',[code,'--directory',dir,'--sha',sourceSha],{encoding:'utf8'}); return {...r, out:JSON.parse(r.stdout)}; }
  finally {fs.rmSync(dir,{recursive:true,force:true});}
}
const sarif = findings => ({version:'2.1.0',runs:[{tool:{driver:{name:'CodeQL'}},results:findings}]});
test('clean CodeQL SARIF yields exact SHA and PASS',()=>{
  const r=run(sarif([]));assert.equal(r.status,0);assert.deepEqual([r.out.status,r.out.findings,r.out.sha],['PASS',0,SHA]);assert.deepEqual(r.out.rule_counts,{});
});
test('a CodeQL result makes security FAIL without printing snippet, path or message',()=>{
  const secret='ULTRA-SENSITIVE-SYNTHETIC-VALUE';
  const r=run(sarif([{ruleId:secret,message:{text:secret},locations:[{physicalLocation:{artifactLocation:{uri:secret}}}]}]));
  assert.equal(r.status,1);assert.equal(r.out.status,'FAIL');assert.equal(r.out.findings,1);
  assert.ok(!(r.stdout+r.stderr).includes(secret));
});
test('CodeQL safe rule identifiers are grouped without exposing secret fields',()=>{
  const secret='UNTRUSTED-SYNTHETIC-VALUE';
  const finding=(ruleId)=>({ruleId,message:{text:secret},locations:[{physicalLocation:{artifactLocation:{uri:secret}}}]});
  const r=run(sarif([finding('js/sql-injection'),finding('js/sql-injection'),finding(secret),finding('js/command-line-injection')]));
  assert.equal(r.status,1);assert.equal(r.out.status,'FAIL');assert.equal(r.out.findings,4);
  assert.deepEqual(r.out.rule_counts,{'js/command-line-injection':1,'js/sql-injection':2,unknown:1});
  assert.ok(!(r.stdout+r.stderr).includes(secret));
});
test('bounded CodeQL rule groups resist huge untrusted rule identifier sets',()=>{
  const results=Array.from({length:40},(_,i)=>({ruleId:'js/finding-'+i}));
  const r=run(sarif(results));
  assert.equal(r.status,1);assert.equal(r.out.findings,40);
  assert.ok(Object.keys(r.out.rule_counts).length<=25);
  assert.equal(Object.values(r.out.rule_counts).reduce((a,b)=>a+b,0),40);
});
test('missing, corrupt, structurally invalid or tool-mismatched SARIF blocks',()=>{
  for(const data of [null,'invalid',{}, {runs:[]}, {runs:[{tool:{driver:{name:'NotCodeQL'}},results:[]}]}, {runs:[{tool:{driver:{name:'CodeQL'}}}]}]){
    const r=run(data);assert.equal(r.status,1);assert.equal(r.out.status,'BLOCKED');
  }
});
test('malicious SHA is excluded from summary',()=>{
  const r=run(sarif([]),'SENSITIVE-INPUT');assert.equal(r.status,1);assert.equal(r.out.status,'BLOCKED');assert.ok(!r.stdout.includes('SENSITIVE-INPUT'));
});
test('CodeQL workflow cannot upload SARIF or databases and analyzes exact checkout',()=>{
  const wf=fs.readFileSync(path.join(root,'.github/workflows/track13_codeql_exact_sha.yml'),'utf8');
  assert.match(wf,/fetch-depth: 0/);assert.match(wf,/persist-credentials: false/);
  assert.match(wf,/git rev-parse HEAD/);assert.match(wf,/queries: security-extended/);
  assert.match(wf,/upload: never/);assert.match(wf,/upload-database: false/);
  assert.match(wf,/track13_codeql_sarif_report\.py/);
  assert.doesNotMatch(wf,/upload-artifact|continue-on-error|\bsecrets\./);
});
