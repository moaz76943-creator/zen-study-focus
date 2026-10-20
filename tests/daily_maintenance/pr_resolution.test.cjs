'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const r=require('../../tools/daily_maintenance/pr_resolution.cjs');
const SHA='a'.repeat(40), HEAD='b'.repeat(40);
const base={ref:'integration/deep-focus-recovery-00-final-20261019',sha:SHA};
const make=(changes={})=>({number:72,title:'Docs handoff',state:'open',draft:false,mergeable:true,
  user:{login:'moaz76943-creator'},head:{sha:HEAD,repo:{full_name:'moaz76943-creator/zen-study-focus'}},
  base,labels:[{name:'agent-safe-merge'}],...changes});
const run={head_sha:HEAD,status:'completed',conclusion:'success',name:'Deep Focus Control Center Quality Audit'};
const md=[{filename:'docs/qa-agent/handoff.md',status:'added',additions:15,deletions:0}];
test('integration anchor never becomes an auto merge candidate',()=>{
 assert.equal(r.classify(make({number:25}),{number:25,head:{sha:SHA}}).code,'INTEGRATION_ANCHOR');
});
test('precisely contained commits are deduplicated rather than re-merged',()=>{
 assert.equal(r.classify(make(),{number:25,head:{sha:SHA}},new Set([72])).code,'ALREADY_INTEGRATED');
});
test('dependent and old-base PRs are not blindly merged',()=>{
 assert.equal(r.classify(make({base:{ref:'fix/master-completion-20261020',sha:SHA}}),{number:25,head:{sha:SHA}}).code,'DEPENDENT_BRANCH');
});
test('draft PRs cannot be auto merged even when green',()=>{
 assert.equal(r.decideMerge(make({draft:true}),{anchorSha:SHA,files:md,runs:[run]}).code,'DRAFT');
});
test('source head and destination head are pinned and must be complete exact SHAs',()=>{
 assert.equal(r.decideMerge(make({base:{...base,sha:'c'.repeat(40)}}),{anchorSha:SHA,files:md,runs:[run]}).code,'STALE_BASE');
 assert.equal(r.decideMerge(make({head:{sha:'short',repo:{full_name:'moaz76943-creator/zen-study-focus'}}}),{anchorSha:SHA,files:md,runs:[run]}).code,'INVALID_SHA');
});
test('only explicit owner opt in allows low-risk docs auto merge',()=>{
 assert.equal(r.decideMerge(make({labels:[]}),{anchorSha:SHA,files:md,runs:[run]}).code,'NO_OWNER_OPT_IN');
 assert.equal(r.decideMerge(make(),{anchorSha:SHA,files:md,runs:[run]}).code,'READY_DOCS_ONLY');
});
test('runtime, QA gate, scripts, media and workflow modifications are never auto merged',()=>{
 for(const path of ['android/app/src/main/assets/web/app.js','.github/workflows/hourly_agent_orchestrator.yml',
   'tools/daily_maintenance/maintenance.cjs','tests/release_guard/guard.test.cjs',
   'docs/control-center/design-config.json','docs/MEDIA_LICENSES.md','audio/rain.ogg']){
  assert.equal(r.decideMerge(make(),{anchorSha:SHA,files:[{filename:path,status:'modified'}],runs:[run]}).code,'FILE_SCOPE_BLOCKED',path);
 }
});
test('deletions, too many files, changes requested and outside owner are blocked',()=>{
 assert.equal(r.decideMerge(make(),{anchorSha:SHA,files:[{...md[0],status:'removed'}],runs:[run]}).code,'FILE_SCOPE_BLOCKED');
 assert.equal(r.decideMerge(make(),{anchorSha:SHA,files:Array(11).fill(md[0]),runs:[run]}).code,'FILE_SCOPE_BLOCKED');
 assert.equal(r.decideMerge(make({mergeable:false}),{anchorSha:SHA,files:md,runs:[run]}).code,'MERGE_CONFLICT');
 assert.equal(r.decideMerge(make({user:{login:'outsider'}}),{anchorSha:SHA,files:md,runs:[run]}).code,'UNTRUSTED_SOURCE');
});
test('unverified, stale, canceled or failing CI never grants approval',()=>{
 assert.equal(r.decideMerge(make(),{anchorSha:SHA,files:md,runs:[]}).code,'CI_NOT_VERIFIED');
 assert.equal(r.decideMerge(make(),{anchorSha:SHA,files:md,runs:[{...run,head_sha:SHA}]}).code,'CI_NOT_VERIFIED');
 assert.equal(r.decideMerge(make(),{anchorSha:SHA,files:md,runs:[run,{...run,name:'Other',conclusion:'failure'}]}).code,'CI_FAILED');
 assert.equal(r.decideMerge(make(),{anchorSha:SHA,files:md,runs:[{...run,status:'in_progress',conclusion:null}]}).code,'CI_NOT_VERIFIED');
});
test('do not trust generic unrelated CI workflow names',()=>{
 assert.equal(r.decideMerge(make(),{anchorSha:SHA,files:md,runs:[{...run,name:'Unknown workflow'}]}).code,'CI_NOT_VERIFIED');
});
test('reports escape untrusted PR titles and include accurate release scope',()=>{
 const report=r.summarize([make({title:'bad\n| **pretend PASS**'})],{number:25,head:{sha:SHA}});
 const m=r.toMarkdown(report);
 assert.match(m,/NOT APPROVED/);
 assert.doesNotMatch(m,/bad\n\|/);
 assert.match(m,/DEPENDENT_BRANCH|REVIEW_REQUIRED|REVIEW/);
 assert.equal(report.counts.total,1);
});
