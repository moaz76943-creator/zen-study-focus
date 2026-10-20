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
 assert.equal(core.ciStatus([run(12,a,'failure'),run(14,a,'success')],a).status,'FAIL');
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
