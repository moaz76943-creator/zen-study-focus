'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const q=require('../../tools/daily_maintenance/quality_agents.cjs');
function fixture(fn){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'df-quality-'));
 try{return fn(root);}finally{fs.rmSync(root,{recursive:true,force:true});}
}
const good={schema_version:1,agents:[
 {id:'localization',lane:'locale',test_dirs:['tests/localization_20'],purpose:'Translation correctness'},
 {id:'numerals',lane:'numerals',test_dirs:['tests/ascii_numerals'],purpose:'Generated number formatting'}]};
test('configuration requires distinct named agents and strictly scoped test directories',()=>{
 assert.equal(q.validateManifest(good).length,2);
 for(const dir of ['../etc','tests/../secrets','android/app','tests/a;rm','tests/a\\b','tests/','tests/.hidden']){
  assert.throws(()=>q.validateManifest({schema_version:1,agents:[{...good.agents[0],test_dirs:[dir]}]}),/test_dirs|unsafe/i,dir);
 }
 assert.throws(()=>q.validateManifest({schema_version:1,agents:[good.agents[0],good.agents[0]]}),/duplicate/i);
 assert.throws(()=>q.validateManifest({schema_version:2,agents:good.agents}),/schema/i);
});
test('recursively discovers existing tests and ignores non-test assets',()=>fixture(root=>{
 fs.mkdirSync(path.join(root,'tests/localization_20/nested'),{recursive:true});
 fs.writeFileSync(path.join(root,'tests/localization_20/nested/check.test.cjs'),'');
 fs.writeFileSync(path.join(root,'tests/localization_20/readme.md'),'');
 assert.deepEqual(q.discoverTests(root,['tests/localization_20']),['tests/localization_20/nested/check.test.cjs']);
}));
test('rejects symlinks leading outside of repository test suite',()=>fixture(root=>{
 fs.mkdirSync(path.join(root,'tests/localization_20'),{recursive:true});
 fs.symlinkSync(os.tmpdir(),path.join(root,'tests/localization_20/escape'));
 assert.throws(()=>q.discoverTests(root,['tests/localization_20']),/symlink/i);
}));
test('missing suite stays NOT_TESTED rather than fabricated green',()=>fixture(root=>{
 const rows=q.runAgents(root,good,{sourceSha:'a'.repeat(40),execute:()=>{throw Error('must not execute');}});
 assert.equal(rows.agents[0].status,'NOT_TESTED');
 assert.equal(rows.agents[1].status,'NOT_TESTED');
 assert.equal(rows.device_qa,'NOT_TESTED');
 assert.equal(rows.production_ready,false);
}));
test('checks are exact-SHA source-only and failed child processes never PASS',()=>fixture(root=>{
 for(const dir of ['tests/localization_20','tests/ascii_numerals']){
  fs.mkdirSync(path.join(root,dir),{recursive:true});
  fs.writeFileSync(path.join(root,dir,'check.test.cjs'),'');
 }
 const invocations=[];
 const TAP='TAP version 13\n1..2\n# tests 2\n# pass 2\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n';
 const report=q.runAgents(root,good,{sourceSha:'b'.repeat(40),execute:(binary,args,opts)=>{
  invocations.push({binary,args,opts});
  return {status:invocations.length===1?0:1,stdout:TAP,stderr:'failed check'};
 }});
 assert.equal(report.agents[0].status,'SOURCE_TESTED');
 assert.equal(report.agents[1].status,'BLOCKED');
 assert.equal(report.source_sha,'b'.repeat(40));
 assert.ok(invocations.every(({binary,args,opts})=>binary===process.execPath&&args[0]==='--test'&&opts.shell===false&&opts.timeout>0));
 assert.equal(q.hasHardFailure(report),true);
 assert.throws(()=>q.runAgents(root,good,{sourceSha:'HEAD'}),/SHA/i);
}));
test('lane selection does not silently report unexecuted lanes as PASS',()=>fixture(root=>{
 fs.mkdirSync(path.join(root,'tests/ascii_numerals'),{recursive:true});
 fs.writeFileSync(path.join(root,'tests/ascii_numerals/check.test.cjs'),'');
 const report=q.runAgents(root,good,{sourceSha:'c'.repeat(40),lane:'numerals',execute:()=>({status:0,stdout:'TAP version 13\n1..1\n# tests 1\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n'})});
 assert.deepEqual(report.agents.map(a=>a.status),['NOT_RUN','SOURCE_TESTED']);
 assert.equal(q.hasHardFailure(report),false);
}));
test('language source audit marks missing translations, unlocalized markup, and strings as gaps',()=>fixture(root=>{
 const out=path.join(root,'report');fs.mkdirSync(path.join(out,'locales'),{recursive:true});
 fs.writeFileSync(path.join(out,'locales/coverage.json'),JSON.stringify({languages:Array.from({length:20},(_,i)=>({code:String(i)})),missing:[{key:'x'}],markup:{unknown:[{key:'missing'}]},staticCandidates:[{text:'Save'}],englishIdentical:[],warnings:[]}));
 const metrics=q.readLocaleAudit(out);
 assert.equal(metrics.status,'GAPS_FOUND');assert.equal(metrics.missing,1);assert.equal(metrics.unmarked,1);
 assert.equal(q.readLocaleAudit(path.join(root,'missing')).status,'NOT_TESTED');
}));

test('language source audit falls back to NOT_TESTED for invalid JSON report',()=>fixture(root=>{
 const out=path.join(root,'report');fs.mkdirSync(path.join(out,'locales'),{recursive:true});
 fs.writeFileSync(path.join(out,'locales/coverage.json'),'{ invalid json ');
 const metrics=q.readLocaleAudit(out);
 assert.equal(metrics.status,'NOT_TESTED');
 assert.match(metrics.reason,/Unable to parse locale report/);
}));

test('TAP parser requires real counted pass/fail/skips/todo evidence',()=>{
 assert.equal(q.parseNodeTap('not TAP'),null);
 assert.equal(q.parseNodeTap('TAP version 13\n1..0'),null);
 assert.equal(q.parseNodeTap('TAP version 13\n# tests 1\n# pass 2\n# fail 0\n# skipped 0\n# todo 0\n# cancelled 0'),null);
 assert.deepEqual(q.parseNodeTap('TAP version 13\n# tests 2\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 1\n# todo 0'),{
  tests:2,pass:1,fail:0,cancelled:0,skipped:1,todo:0
 });
});
test('zero tests, skipped tests, todo, and malformed output cannot claim green source QA',()=>fixture(root=>{
 fs.mkdirSync(path.join(root,'tests/localization_20'),{recursive:true});
 fs.writeFileSync(path.join(root,'tests/localization_20/test.test.cjs'),'');
 const suites=[
  {data:'TAP version 13\n# tests 0\n# pass 0\n# fail 0\n# skipped 0\n# todo 0\n# cancelled 0',expected:'NOT_TESTED'},
  {data:'TAP version 13\n# tests 2\n# pass 1\n# fail 0\n# skipped 1\n# todo 0\n# cancelled 0',expected:'SOURCE_PARTIAL'},
  {data:'TAP version 13\n# tests 2\n# pass 1\n# fail 0\n# skipped 0\n# todo 1\n# cancelled 0',expected:'SOURCE_PARTIAL'},
  {data:'source says success',expected:'NOT_TESTED'}
 ];
 for(const item of suites){
  const report=q.runAgents(root,{schema_version:1,agents:[good.agents[0]]},{
   sourceSha:'d'.repeat(40),execute:()=>({status:0,stdout:item.data})});
  assert.equal(report.agents[0].status,item.expected,item.expected);
  assert.equal(q.hasHardFailure(report),true);
 }
}));

test('source inventory makes newly added unassigned tests an explicit NOT_TESTED result',()=>fixture(root=>{
 for(const dir of ['tests/localization_20','tests/new_screen']){
  fs.mkdirSync(path.join(root,dir),{recursive:true});
  fs.writeFileSync(path.join(root,dir,'check.test.cjs'),'');
 }
 const report=q.runAgents(root,{schema_version:1,agents:[good.agents[0]]},{
  sourceSha:'e'.repeat(40),execute:()=>({status:0,stdout:'TAP version 13\n# tests 1\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0'})});
 assert.deepEqual(report.unmapped_tests,['tests/new_screen/check.test.cjs']);
 assert.equal(report.agents.find(a=>a.id==='unmapped_tests').status,'NOT_TESTED');
 assert.equal(q.hasHardFailure(report),true);
}));
test('media license gate remains excluded from source-green cohorts without losing separate audit',()=>fixture(root=>{
 fs.mkdirSync(path.join(root,'tests/master_recovery_qa'),{recursive:true});
 fs.writeFileSync(path.join(root,'tests/master_recovery_qa/media_provenance_gate.test.cjs'),'');
 fs.writeFileSync(path.join(root,'tests/master_recovery_qa/source_contracts.test.cjs'),'');
 assert.deepEqual(q.discoverTests(root,['tests/master_recovery_qa']),['tests/master_recovery_qa/source_contracts.test.cjs']);
 assert.throws(()=>q.discoverTests(root,['tests']),/Unsafe test_dirs/);}));

test('suite inventory failure adds a BLOCKED agent instead of crashing',()=>fixture(root=>{
 fs.mkdirSync(path.join(root,'tests/localization_20'),{recursive:true});
 fs.symlinkSync(os.tmpdir(),path.join(root,'tests/escape'));
 const report=q.runAgents(root,good,{sourceSha:'f'.repeat(40),lane:'all',execute:()=>({status:0,stdout:''})});
 const inventory=report.agents.find(a=>a.id==='suite_inventory');
 assert.ok(inventory);
 assert.equal(inventory.status,'BLOCKED');
 assert.match(inventory.reason,/Cannot inventory tests/);
}));
test('agent manifest rejects duplicate and ancestor directory ownership before executing',()=>{
 for(const conflict of [['tests/localization_20','tests/localization_20'],['tests/localization_20','tests/localization_20/sub']]){
  const m={schema_version:1,agents:[
   {...good.agents[0],test_dirs:[conflict[0]]},
   {...good.agents[1],test_dirs:[conflict[1]]}
  ]};
  assert.throws(()=>q.validateManifest(m),/Overlapping test ownership/i);
 }
});
