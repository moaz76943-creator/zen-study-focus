'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const script = path.join(root, 'tools/security/track13_gitleaks_report.py');
const sha = 'a'.repeat(40);
function scan(report, status=0) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'df-track13-'));
  const file = path.join(dir,'private.json');
  if (report !== null) fs.writeFileSync(file,JSON.stringify(report));
  try { return spawnSync('python3',[script,'--report',file,'--sha',sha,'--scan-exit',String(status)],{encoding:'utf8'}); }
  finally { fs.rmSync(dir,{force:true,recursive:true}); }
}
test('clean Gitleaks report is a verified zero-finding PASS',()=>{
  const r=scan([]);
  assert.equal(r.status,0,r.stderr);
  const out=JSON.parse(r.stdout);
  assert.equal(out.status,'PASS');
  assert.equal(out.sha,sha);
  assert.equal(out.findings,0);
});
test('suspected key is BLOCKED and secret and raw path are never printed',()=>{
  const sentinel='SENSITIVE-DO-NOT-PRINT-123';
  const r=scan([{RuleID:'generic-api-key',File:'path/'+sentinel+'.env',StartLine:18,Secret:sentinel,Match:sentinel,Description:sentinel} ],1);
  assert.equal(r.status,1);
  assert.ok(!r.stdout.includes(sentinel));
  assert.ok(!r.stderr.includes(sentinel));
  const out=JSON.parse(r.stdout);
  assert.equal(out.status,'BLOCKED');
  assert.equal(out.findings,1);
  assert.equal(out.evidence[0].rule,'generic-api-key');
  assert.match(out.evidence[0].path_sha256_16,/^[a-f0-9]{16}$/);
  assert.equal(out.evidence[0].line,18);
});
test('scanner error, missing or malformed report always blocks release',()=>{
  for(const [report,status] of [[null,2],[{unexpected:true},1],[[],2]]) {
    const r=scan(report,status);
    assert.equal(r.status,1);
    assert.equal(JSON.parse(r.stdout).status,'BLOCKED');
  }
});
test('exact SHA security workflow is present with bounded read-only scanner permissions',()=>{
  const wf=fs.readFileSync(path.join(root,'.github/workflows/track13_security_exact_sha.yml'),'utf8');
  assert.match(wf,/persist-credentials: false/);
  assert.match(wf,/fetch-depth: 0/);
  assert.match(wf,/contents: read/);
  assert.match(wf,/security-events: write/);
  assert.match(wf,/gitleaks" git --no-banner/);
  assert.match(wf,/gitleaks" dir --no-banner/);
  assert.match(wf,/track13_gitleaks_report\.py/);
  assert.doesNotMatch(wf,/upload-artifact|continue-on-error|\bsecrets\./);
});
