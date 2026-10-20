'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../../docs/control-center/repo-sync-core.js');
const a='a'.repeat(40),b='b'.repeat(40),c='c'.repeat(40);
const pull=(number,head,base)=>({number,head:{sha:head,ref:number===25?'integration/deep-focus-recovery-00-final-20261019':'feature/control-center-ops-20261019'},base:{sha:base},draft:true,html_url:'https://github.com/moaz76943-creator/zen-study-focus/pull/'+number});
const run=(id,head,conclusion,status='completed')=>({id,head_sha:head,conclusion,status,html_url:'https://github.com/moaz76943-creator/zen-study-focus/actions/runs/'+id,name:'Source QA',head_branch:'feature/control-center-ops-20261019'});
test('sync01 recognizes that a stacked PR has drifted from its actual upstream HEAD',()=>{
 const model=core.buildRepoHealth({pulls:[pull(25,b,a),pull(37,c,a)],runs:[run(61,c,'success')],errors:[],timestamp:'2026-10-20T00:00:00Z'});
 assert.equal(model.verified,true);
 assert.equal(model.drift,'BASE_MOVED');
 assert.equal(model.pr25.sha,b);
 assert.equal(model.pr37.baseSha,a);
 assert.equal(model.pr37.sha,c);
 assert.equal(model.pr37.ci.status,'PASS');
});
test('sync02 exact-SHA failed workflow must not be mislabeled PASS from unrelated successful run',()=>{
 const model=core.buildRepoHealth({pulls:[pull(25,b,a),pull(37,c,b)],runs:[run(80,'f'.repeat(40),'success'),run(81,c,'failure')],errors:[],timestamp:'2026-10-20T00:00:00Z'});
 assert.equal(model.pr37.ci.status,'FAIL');
 assert.equal(model.pr25.ci.status,'NOT_VERIFIED');
 assert.equal(model.drift,'CURRENT');
});
test('sync03 queued and skipped jobs never imply production acceptance',()=>{
 assert.equal(core.ciStatus([run(8,a,null,'queued')],a).status,'RUNNING');
 assert.equal(core.ciStatus([run(9,a,'skipped')],a).status,'NOT_VERIFIED');
 assert.equal(core.ciStatus([],a).status,'NOT_VERIFIED');
 assert.equal(core.ciStatus([run(12,a,'success')],a).status,'PASS');
 assert.equal(core.ciStatus([run(12,a,'failure'),run(14,a,'success')],a).status,'PASS');
});
test('sync04 incomplete REST data stays PARTIAL; never show merge/release approval',()=>{
 const model=core.buildRepoHealth({pulls:[pull(25,b,a)],runs:[],errors:['GitHub HTTP 403'],timestamp:null});
 assert.equal(model.verified,false);
 assert.equal(model.drift,'NOT_VERIFIED');
 assert.equal(model.pr37,null);
 assert.equal(model.release,'NOT_APPROVED');
});
test('sync05 refuses external links, malformed SHA and oversized remote payloads',()=>{
 assert.equal(core.trustedGitHubUrl('https://github.com/moaz76943-creator/zen-study-focus/actions/runs/18'), 'https://github.com/moaz76943-creator/zen-study-focus/actions/runs/18');
 assert.equal(core.trustedGitHubUrl('https://github.com/another-owner/another-repo/pull/37'),null);
 assert.equal(core.trustedGitHubUrl('javascript:alert(1)'),null);
 assert.throws(()=>core.buildRepoHealth({pulls:[pull(25,'fake',a)],runs:[],errors:[]}),/SHA/);
 assert.throws(()=>core.buildRepoHealth({pulls:[],runs:Array(501).fill(run(1,a,'success')),errors:[]}),/limit/i);
});
test('sync06 recent workflow links retain source SHA and no fabricated run for missing PRs',()=>{
 const model=core.buildRepoHealth({pulls:[pull(25,a,c),pull(37,b,a)],runs:[run(100,b,'success'),run(101,c,'failure')],errors:[],timestamp:'2026-10-20T00:00:00Z'});
 assert.equal(model.pr37.ci.runId,100);
 assert.equal(model.pr25.ci.status,'NOT_VERIFIED');
 assert.equal(model.recent.length,2);
});

test('sync07 newest run per workflow replaces an earlier failure or success',()=>{
 const failed=run(200,a,'failure');failed.workflow_id=101;
 const repaired=run(201,a,'success');repaired.workflow_id=101;
 const laterPending=run(202,a,null,'in_progress');laterPending.workflow_id=101;
 assert.equal(core.ciStatus([failed,repaired],a).status,'PASS');
 assert.equal(core.ciStatus([failed,repaired,laterPending],a).status,'RUNNING');
 assert.equal(core.ciStatus([laterPending,failed,repaired],a).runId,202);
});
test('sync08 two distinct workflows preserve mixed/skipped reality instead of false green',()=>{
 const passed=run(210,a,'success');passed.workflow_id=11;
 const skipped=run(211,a,'skipped');skipped.workflow_id=12;
 const failed=run(212,a,'failure');failed.workflow_id=13;
 assert.equal(core.ciStatus([passed,skipped],a).status,'PARTIAL');
 assert.equal(core.ciStatus([skipped],a).status,'NOT_VERIFIED');
 assert.equal(core.ciStatus([passed,failed,skipped],a).status,'FAIL');
});
test('sync09 partial network errors cannot certify exact-head workflow status',()=>{
 const model=core.buildRepoHealth({pulls:[pull(25,b,a),pull(37,c,b)],
   runs:[run(300,b,'success'),run(301,c,'success')],
   errors:['/actions/runs?head_sha=...: GitHub 403'],timestamp:'2026-10-20T02:00:00Z'});
 assert.equal(model.verified,false);
 assert.equal(model.pr25.ci.status,'NOT_VERIFIED');
 assert.equal(model.pr37.ci.status,'NOT_VERIFIED');
 assert.equal(model.release,'NOT_APPROVED');
});
test('sync10 status breakdown keeps all distinct workflows with latest attempt only',()=>{
 const pass=run(401,a,'success');pass.workflow_id=10;
 const earlier=run(402,a,'failure');earlier.workflow_id=20;
 const retry=run(403,a,'success');retry.workflow_id=20;
 const info=core.ciStatus([pass,earlier,retry],a);
 assert.equal(info.status,'PASS');
 assert.equal(info.count,3);
 assert.equal(info.workflows,2);
 assert.equal(info.runId,403);
});

test('sync11 derives a bounded review queue using only trusted same-repository PR links',()=>{
 const source=[
 {number:82,title:'Nature audio proof',draft:true,updated_at:'2026-10-20T17:40:00Z',
  html_url:'https://github.com/moaz76943-creator/zen-study-focus/pull/82',
  head:{sha:a,ref:'review/audio'},base:{ref:'integration/recovery'}},
 {number:81,title:'Phone Android QA',draft:false,updated_at:'2026-10-20T17:41:00Z',
  html_url:'https://github.com/evil/test/pull/81',head:{sha:b,ref:'review/qa'}},
 {number:80,title:'Notes regression',draft:true,updated_at:'2026-10-19T17:00:00Z',
  html_url:'https://github.com/moaz76943-creator/zen-study-focus/pull/80',head:{sha:c,ref:'review/notes'}}
 ];
 const info=core.reviewQueue(source,{filter:'draft',limit:15});
 assert.equal(info.total,2);
 assert.equal(info.items[0].number,82);
 assert.equal(info.items[1].number,80);
 assert.equal(info.items[0].sha,a);
 const query=core.reviewQueue(source,{term:'notes',limit:15});
 assert.equal(query.total,1);
 assert.equal(query.items[0].number,80);
});
test('sync12 review queue refuses unsafe search and invalid caps',()=>{
 assert.throws(()=>core.reviewQueue([], {limit:100}),/limit/);
 assert.throws(()=>core.reviewQueue([], {term:'z'.repeat(400)}),/search/);
 assert.throws(()=>core.reviewQueue([], {filter:'merged'}),/filter/);
 assert.deepEqual(core.reviewQueue([],{}),{total:0,items:[],drafts:0});
});
