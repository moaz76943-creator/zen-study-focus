'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),parser=path.join(root,'tools/security/track13_codeql_sarif_report.py');
const sink='tests/android_e2e_recovery/private_evidence.cjs';
const finding=(rule='js/http-to-file-access',uri=sink,line=68)=>({ruleId:rule,locations:[{physicalLocation:{artifactLocation:{uri},region:{startLine:line}}}]});
function fixture(fn){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'df-codeql-review-'));
 const source=path.join(dir,'source'),reports=path.join(dir,'reports');fs.mkdirSync(source);fs.mkdirSync(reports);
 function write(relative,text){const p=path.join(source,relative);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,text);}
 write(sink,fs.readFileSync(path.join(root,sink)));
 write('tests/caller.cjs','// Synthetic inert evidence consumer\n');
 cp.execFileSync('git',['init','-q',source]);cp.execFileSync('git',['-C',source,'add','.']);
 const py=(code,args=[])=>cp.spawnSync('python3',['-c',code,parser,source,reports,...args],{encoding:'utf8'});
 const digest=()=>{
  const r=py("import runpy,sys;from pathlib import Path;m=runpy.run_path(sys.argv[1]);print(m['executable_source_digest'](Path(sys.argv[2])))");
  assert.equal(r.status,0,r.stderr);return r.stdout.trim();
 };
 const policy={schemaVersion:1,adjudications:[{id:'DF-CODEQL-QA-EVIDENCE-001',verdict:'FALSE_POSITIVE_WITH_EVIDENCE',reviewStatus:'APPROVED',reviewedBy:'synthetic-test-reviewer',rule:'js/http-to-file-access',path:sink,line:68,sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(source,sink))).digest('hex'),executableSourceSha256:digest()}]};
 const save=()=>write('tools/security/codeql_adjudications.json',JSON.stringify(policy));save();
 const run=(results=[finding()])=>{
  fs.writeFileSync(path.join(reports,'report.sarif'),JSON.stringify({version:'2.1.0',runs:[{tool:{driver:{name:'CodeQL'}},results}]}));
  const r=py("import runpy,sys,json;from pathlib import Path;m=runpy.run_path(sys.argv[1]);r=m['summarize'](Path(sys.argv[3]),'b'*40,Path(sys.argv[2]));print(json.dumps(r));sys.exit(0 if r['status']=='PASS' else 1)");
  return {...r,out:JSON.parse(r.stdout)};
 };
 try{fn({source,policy,save,write,run,digest});}finally{fs.rmSync(dir,{recursive:true,force:true});}
}
test('an independently reviewed exact sink retains the raw finding and records explicit FP evidence',()=>fixture(({run})=>{
 const r=run();assert.equal(r.status,0);assert.equal(r.out.status,'PASS');
 assert.equal(r.out.findings,1);assert.equal(r.out.false_positives,1);assert.equal(r.out.unresolved,0);
 assert.equal(r.out.rule_counts['js/http-to-file-access'],1);
 assert.equal(r.out.adjudications[0].verdict,'FALSE_POSITIVE_WITH_EVIDENCE');
 assert.match(r.out.adjudications[0].executableSourceSha256,/^[a-f0-9]{64}$/);
}));
test('pending, missing, invalid or stale approval cannot adjudicate a finding',()=>{
 for(const mutate of [p=>p.adjudications[0].reviewStatus='PENDING_INDEPENDENT_REVIEW',p=>p.adjudications[0].reviewedBy=null,p=>p.adjudications[0].executableSourceSha256='a'.repeat(64),p=>p.adjudications[0].sourceSha256='a'.repeat(64),p=>p.adjudications=[]])
  fixture(({policy,save,run})=>{mutate(policy);save();const r=run();assert.equal(r.status,1);assert.equal(r.out.false_positives,0);assert.equal(r.out.unresolved,1);});
});
test('changed helper or changed existing caller revokes the complete source snapshot',()=>{
 for(const file of [sink,'tests/caller.cjs'])fixture(({write,source,run})=>{
  write(file,fs.readFileSync(path.join(source,file),'utf8')+'\n// changed\n');
  const r=run();assert.equal(r.status,1);assert.equal(r.out.false_positives,0);
 });
});
test('a newly tracked caller revokes approval without modifying the helper',()=>fixture(({write,source,run})=>{
 write('tools/new-consumer.cjs','// Newly introduced consumer must be independently reviewed\n');
 cp.execFileSync('git',['-C',source,'add','tools/new-consumer.cjs']);
 const r=run();assert.equal(r.status,1);assert.equal(r.out.false_positives,0);
}));
test('the same finding at another path/line or using another rule cannot match',()=>{
 for(const f of [finding(undefined,'./'+sink),finding(undefined,sink,69),finding('js/sql-injection'),finding(undefined,'other.cjs')])
  fixture(({run})=>{const r=run([f]);assert.equal(r.status,1);assert.equal(r.out.false_positives,0);});
});
test('additional or duplicated findings remain FAIL and preserve their raw counts',()=>fixture(({run})=>{
 let r=run([finding(),finding('js/command-line-injection')]);
 assert.equal(r.status,1);assert.equal(r.out.findings,2);assert.equal(r.out.false_positives,1);assert.equal(r.out.unresolved,1);
 r=run([finding(),finding()]);assert.equal(r.status,1);assert.equal(r.out.findings,2);assert.equal(r.out.false_positives,0);assert.equal(r.out.unresolved,2);
}));
test('an external URI base or non-integer source location cannot impersonate the canonical sink',()=>fixture(({run})=>{
 const external=finding();external.locations[0].physicalLocation.artifactLocation.uriBaseId='REMOTE_SOURCE';
 const fractional=finding();fractional.locations[0].physicalLocation.region.startLine=68.5;
 for(const f of [external,fractional]){
  const r=run([f]);assert.equal(r.status,1);assert.equal(r.out.false_positives,0);
 }
 const canonical=finding();canonical.locations[0].physicalLocation.artifactLocation.uriBaseId='%SRCROOT%';
 assert.equal(run([canonical]).status,0);
}));
