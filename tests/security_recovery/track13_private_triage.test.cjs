'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const script=path.join(__dirname,'../../tools/security/track13_gitleaks_private_triage.py');
const SHA='a'.repeat(40);
function run(rows,sourceSha=SHA){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'df-private-triage-'));
  try{
    const app=path.join(dir,'android/app/src/main/assets/web');
    fs.mkdirSync(app,{recursive:true});
    fs.writeFileSync(path.join(app,'app.js'),"const SECRET_SALT = 'PUBLIC_COMPAT_TEST_FIXTURE_42';\n",{mode:0o600});
    fs.writeFileSync(path.join(app,'data_compat_v21.js'),"const SECRET_SALT = 'PUBLIC_COMPAT_TEST_FIXTURE_42';\n",{mode:0o600});
    const report=path.join(dir,'private-report.json');
    if(rows!==null)fs.writeFileSync(report,typeof rows==='string'?rows:JSON.stringify(rows),{mode:0o600});
    const init=spawnSync('git',['init','-q',dir],{encoding:'utf8'});assert.equal(init.status,0);
    const commit=spawnSync('git',['-C',dir,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-qm','fixture'],{encoding:'utf8'});
    assert.equal(commit.status,0);
    const gitSha=spawnSync('git',['-C',dir,'rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim();
    const input=Array.isArray(rows)?rows.map(x=>x&&x.Secret==='COMMIT_FIXTURE'?{...x,Secret:gitSha}:x):rows;
    if(input!==rows&&Array.isArray(input))fs.writeFileSync(report,JSON.stringify(input),{mode:0o600});
    const res=spawnSync('python3',[script,'--report',report,'--repo',dir,'--sha',sourceSha],{encoding:'utf8'});
    return {...res,output:JSON.parse(res.stdout)};
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
test('candidate buckets never turn findings into PASS or leak matched secrets',()=>{
  const sentinel='SYNTHETIC-POTENTIAL-CREDENTIAL-DO-NOT-PRINT-999';
  const rows=[
    {RuleID:'generic-api-key',Secret:'PUBLIC_COMPAT_TEST_FIXTURE_42',File:'web/app.js'},
    {RuleID:'generic-api-key',Secret:'zen_fortress_cfg_v21',File:'tests/config.cjs'},
    {RuleID:'generic-api-key',Secret:'COMMIT_FIXTURE',File:'ledger.txt'},
    {RuleID:'generic-api-key',Secret:sentinel,File:'private/'+sentinel}
  ];
  const r=run(rows);
  assert.equal(r.status,1);
  assert.equal(r.output.status,'REVIEW_REQUIRED');
  assert.equal(r.output.findings,4);
  assert.deepEqual(r.output.categories,{
    compatibility_salt_candidate:1,
    storage_key_candidate:1,
    git_commit_reference_candidate:1,
    unresolved:1
  });
  assert.ok(!(r.stdout+r.stderr).includes(sentinel));
  assert.ok(!(r.stdout+r.stderr).includes('private/'));
  assert.ok(!(r.stdout+r.stderr).includes('PUBLIC_COMPAT_TEST_FIXTURE_42'));
});
test('all classified candidates still require review, never generate a clean security gate',()=>{
  const r=run([{RuleID:'generic-api-key',Secret:'zen_fortress_notes_v21'}]);
  assert.equal(r.status,1);
  assert.equal(r.output.status,'REVIEW_REQUIRED');
  assert.equal(r.output.findings,1);
  assert.equal(r.output.categories.storage_key_candidate,1);
});
test('empty report provides zero-findings diagnostics without making the primary scanner PASS',()=>{
  const r=run([]);
  assert.equal(r.status,0);
  assert.equal(r.output.status,'NO_FINDINGS');
  assert.equal(r.output.findings,0);
});
test('malformed report, invalid SHA and missing report fail closed with no untrusted input echoed',()=>{
  for(const [data,sha] of [[null,SHA],['{broken',SHA],[[null],SHA],[[], 'PRIVATE_INVALID_SOURCE_SHA']]){
    const r=run(data,sha);
    assert.equal(r.status,2);
    assert.equal(r.output.status,'BLOCKED');
    assert.ok(!r.stdout.includes('PRIVATE_INVALID_SOURCE_SHA'));
  }
});
test('unknown rules and token-like strings never enter safe candidate categories',()=>{
  const sentinel='VERY-PRIVATE-SYNTHETIC-ACCESS-TOKEN';
  const r=run([{RuleID:'github-pat',Secret:sentinel},{RuleID:'generic-api-key',Secret:'not-a-real-commit-reference'}]);
  assert.equal(r.status,1);
  assert.equal(r.output.categories.unresolved,2);
  assert.ok(!(r.stdout+r.stderr).includes(sentinel));
});
