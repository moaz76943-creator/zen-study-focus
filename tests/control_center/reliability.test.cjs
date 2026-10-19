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
