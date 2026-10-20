'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const ledger=require('../../tools/daily_maintenance/cohort_ledger.cjs');
const sha='a'.repeat(40),fingerprint='b'.repeat(64);
const ids=['localization','notes','tasks','analytics'];
function cycle({source_sha=sha,manifest_sha256=fingerprint,checked_at='2026-10-20T01:23:00.000Z',chosen=[ids[0]],statuses={},unmapped=[],duplicates=[]}={}){
 return {schema_version:1,source_sha,manifest_sha256,checked_at,agent_ids:ids,agents:chosen.map(id=>({id,status:statuses[id]||'SOURCE_TESTED',tests:2})),selected_agents:chosen.length,total_agents:ids.length,coverage:{unmapped,duplicates},status:'COHORT_PASS'};
}
test('one hourly green cohort does not indicate a full green cycle',()=>{
 const s=ledger.aggregate(null,cycle());
 assert.equal(s.overall,'INCOMPLETE');
 assert.deepEqual(s.missing,['notes','tasks','analytics']);
 assert.equal(s.full_source_cycle_pass,false);
});
test('full source cycle requires every specialist at identical SHA',()=>{
 let s=null;
 for(let h=1;h<=4;h++)s=ledger.aggregate(s,cycle({checked_at:'2026-10-20T0'+h+':23:00.000Z',chosen:[ids[h-1]]}));
 assert.equal(s.overall,'FULL_SOURCE_CYCLE_PASS');
 assert.equal(s.missing.length,0);
 assert.equal(s.full_source_cycle_pass,true);
 assert.match(ledger.toMarkdown(s),/does not prove Android/i);
});
test('new commit SHA invalidates previous agent evidence',()=>{
 let s=null;
 for(let h=1;h<=4;h++)s=ledger.aggregate(s,cycle({checked_at:'2026-10-20T0'+h+':23:00.000Z',chosen:[ids[h-1]]}));
 const next=ledger.aggregate(s,cycle({source_sha:'c'.repeat(40),checked_at:'2026-10-20T05:23:00.000Z'}));
 assert.equal(next.overall,'INCOMPLETE');
 assert.equal(next.missing.length,3);
});
test('manifest change invalidates older coverage at same code SHA',()=>{
 const a=ledger.aggregate(null,cycle());
 const b=ledger.aggregate(a,cycle({manifest_sha256:'d'.repeat(64),chosen:['notes'],checked_at:'2026-10-20T02:23:00.000Z'}));
 assert.deepEqual(b.missing,['localization','tasks','analytics']);
});
test('old results expire; missed hourly runs never create phantom PASS',()=>{
 let s=null;
 for(let h=1;h<=4;h++)s=ledger.aggregate(s,cycle({checked_at:'2026-10-20T0'+h+':23:00.000Z',chosen:[ids[h-1]]}));
 const stale=ledger.aggregate(s,cycle({checked_at:'2026-10-20T10:23:00.000Z',chosen:['analytics']}));
 assert.equal(stale.overall,'INCOMPLETE');
 assert.equal(stale.missing.length,3);
});
test('failed, cancelled or skipped suite blocks even after previous PASS',()=>{
 let s=null;
 for(let h=1;h<=4;h++)s=ledger.aggregate(s,cycle({checked_at:'2026-10-20T0'+h+':23:00.000Z',chosen:[ids[h-1]]}));
 const failed=ledger.aggregate(s,cycle({checked_at:'2026-10-20T05:23:00.000Z',chosen:['notes'],statuses:{notes:'SOURCE_PARTIAL'}}));
 assert.equal(failed.overall,'BLOCKED');
 assert.equal(failed.full_source_cycle_pass,false);
 assert.equal(failed.blocked.length,1);
});
test('unmapped new feature tests remain a coverage gap',()=>{
 const s=ledger.aggregate(null,cycle({unmapped:['tests/new/feature.test.cjs']}));
 assert.equal(s.overall,'COVERAGE_GAP');
 assert.equal(s.full_source_cycle_pass,false);
});
test('issue evidence roundtrip rejects malformed, forged or unsafe inputs',()=>{
 const s=ledger.aggregate(null,cycle());
 const body=ledger.toMarkdown(s)+'\n'+ledger.serialize(s);
 assert.equal(ledger.parseIssueLedger(body).source_sha,sha);
 assert.equal(ledger.parseIssueLedger('no ledger'),null);
 assert.equal(ledger.parseIssueLedger('<!-- DF_AGENT_LEDGER_V1\n{bad}\nEND_DF_AGENT_LEDGER_V1 -->'),null);
 assert.throws(()=>ledger.aggregate(null,cycle({source_sha:'main'})),/source SHA/);
 assert.throws(()=>ledger.aggregate(null,cycle({chosen:['bad-agent']})),/Unknown specialist/);
 assert.throws(()=>ledger.aggregate(null,cycle({chosen:['notes','notes']})),/Duplicate selected/);
});
test('an out-of-order older run never overwrites latest evidence',()=>{
 const s=ledger.aggregate(null,cycle({checked_at:'2026-10-20T04:23:00.000Z'}));
 assert.throws(()=>ledger.aggregate(s,cycle({checked_at:'2026-10-20T03:23:00.000Z'})),/out-of-order/i);
});
