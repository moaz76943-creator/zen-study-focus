'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const client=require('../../docs/control-center/control-center.js');
const SHA='a'.repeat(40),NEXT='b'.repeat(40);
const previous={head:SHA,sync:'2026-10-19T15:00:00.000Z',tasks:[{id:'DF-001',status:'BLOCKED'}],
  prs:[{number:37}],runs:[{id:1,conclusion:'success'}],audit:{inspected_ref:SHA},errors:[],stale:false};
test('offline GitHub failure does not wipe last verified ledger',()=>{
 const got=client.reconcileRefresh(previous,{head:null,errors:['GitHub HTTP 403']});
 assert.equal(got.head,SHA);
 assert.equal(got.tasks.length,1);
 assert.equal(got.sync,previous.sync);
 assert.equal(got.stale,true);
 assert.match(got.errors.join(' '),/403/);
});
test('same HEAD transient ledger failure retains source with stale warning',()=>{
 const got=client.reconcileRefresh(previous,{head:SHA,tasks:null,prs:[{number:38}],runs:null,errors:['Recovery ledger HTTP 500']});
 assert.equal(got.tasks.length,1);
 assert.deepEqual(got.prs,[{number:38}]);
 assert.equal(got.stale,true);
 assert.equal(got.sync,previous.sync);
});
test('new HEAD cannot reuse previous SHA recovery ledger',()=>{
 const got=client.reconcileRefresh(previous,{head:NEXT,tasks:null,prs:null,runs:null,errors:['ledger offline']});
 assert.equal(got.head,NEXT);
 assert.deepEqual(got.tasks,[]);
 assert.equal(got.sync,null);
 assert.equal(got.stale,true);
});
test('complete fresh read clears warnings and syncs new verified snapshot',()=>{
 const got=client.reconcileRefresh(previous,{head:NEXT,tasks:[{id:'DF-002',status:'TESTED'}],
   prs:[],runs:[],at:'2026-10-20T03:00:00.000Z',errors:[]});
 assert.equal(got.stale,false);
 assert.equal(got.sync,'2026-10-20T03:00:00.000Z');
 assert.equal(got.head,NEXT);
 assert.deepEqual(got.tasks.map(x=>x.id),['DF-002']);
});
test('empty ledger never presents false zero-issues health as fresh',()=>{
 const got=client.reconcileRefresh(previous,{head:SHA,tasks:[],prs:[],runs:[],errors:[],at:'2026-10-20T03:00:00.000Z'});
 assert.equal(got.stale,true);
 assert.equal(got.tasks.length,1);
 assert.match(got.errors.join(' '),/empty/i);
});

const v3=require('../../docs/control-center/v3-core.js');
test('offline snapshot normalization is explicitly local and does not promote imported audit to trusted QA',()=>{
 const imported={schema_version:1,inspected_ref:SHA,tasks:[{id:'DF-001',status:'BLOCKED',title:'Audio',area:'AUDIO',evidence:'none'}],
   prs:[{number:25,title:'Recovery',html_url:'https://github.com/moaz76943-creator/zen-study-focus/pull/25',draft:true}],
   workflows:[{id:13,name:'Build',conclusion:'failure',status:'completed',html_url:'https://github.com/moaz76943-creator/zen-study-focus/actions/runs/13'}],
   imported_audit:{findings:[{severity:'critical',title:'Fake gate'}]}};
 const got=v3.normalizeOfflineSnapshot(imported);
 assert.equal(got.stale,true);
 assert.equal(got.source,'local_import');
 assert.equal(got.tasks.length,1);
 assert.equal(got.runs[0].id,13);
 assert.equal(got.audit,null);
 assert.deepEqual(got.findings,[]);
});
test('offline imports reject invalid statuses, excessive text and foreign untrusted URLs',()=>{
 const minimal={schema_version:1,inspected_ref:SHA,tasks:[{id:'DF-001',status:'PASS',title:'x'}]};
 assert.throws(()=>v3.normalizeOfflineSnapshot(minimal));
 const external={schema_version:1,inspected_ref:SHA,tasks:[],
   prs:[{number:9,title:'Bad',html_url:'https://malicious.example/pr'}]};
 assert.throws(()=>v3.normalizeOfflineSnapshot(external));
 const huge={schema_version:1,inspected_ref:SHA,tasks:[{id:'DF-002',status:'BLOCKED',title:'z'.repeat(10000)}]};
 assert.throws(()=>v3.normalizeOfflineSnapshot(huge));
});
