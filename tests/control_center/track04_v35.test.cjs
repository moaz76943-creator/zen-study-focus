'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const core=require('../../docs/control-center/repo-sync-core.js');
const a='a'.repeat(40),b='b'.repeat(40),c='c'.repeat(40),d='d'.repeat(40);
const repo='https://github.com/moaz76943-creator/zen-study-focus/';
const pr=(number,head,base)=>({number,draft:true,head:{sha:head},base:{sha:base},
  html_url:repo+'pull/'+number});
const run=(id,sha,name,conclusion='success')=>({id,head_sha:sha,name,conclusion,status:'completed',
  html_url:repo+'actions/runs/'+id,head_branch:'testing'});
test('v35 follows the existing dashboard recovery PR without creating another source of truth',()=>{
 const model=core.buildRepoHealth({pulls:[pr(25,a,c),pr(37,b,a),pr(70,c,a),pr(72,d,b)]});
 assert.equal(model.pr72.sha,d);
 assert.equal(model.pr72.draft,true);
 assert.equal(model.dashboardDrift,'CURRENT');
 assert.equal(model.release,'NOT_APPROVED');
});
test('v35 warns that dashboard follow-up is stale when its BASE misses PR37 HEAD',()=>{
 const model=core.buildRepoHealth({pulls:[pr(37,b,a),pr(72,d,c)]});
 assert.equal(model.dashboardDrift,'BASE_MOVED');
 assert.equal(model.pr72.baseSha,c);
});
test('v35 marks unavailable dashboard comparison as NOT_VERIFIED',()=>{
 assert.equal(core.buildRepoHealth({pulls:[pr(37,b,a)],errors:['GitHub 403']}).dashboardDrift,'NOT_VERIFIED');
});
test('v35 separates Android-related workflow conclusions from scoped Android test counts',()=>{
 const model=core.buildRepoHealth({pulls:[pr(70,c,a)],runs:[
   run(40,c,'source-node','success'),run(41,c,'Android emulator validation','failure')
 ]});
 assert.equal(model.androidWorkflow.status,'FAIL');
 assert.equal(model.androidWorkflow.runId,41);
 assert.equal(model.android.status,'STALE');
 assert.notEqual(model.androidWorkflow.status,'PASS');
 assert.equal(model.release,'NOT_APPROVED');
});
test('v35 empty Android workflow returns NOT_VERIFIED rather than Android PASS',()=>{
 const model=core.buildRepoHealth({pulls:[pr(70,c,a)],runs:[run(40,c,'Node QA','success')]});
 assert.equal(model.androidWorkflow.status,'NOT_VERIFIED');
 assert.equal(model.pr70.ci.status,'PASS');
});
test('v35 makes mobile quick links and provenance panel available in dashboard source',()=>{
 const base=path.join(__dirname,'../../docs/control-center');
 const ui=fs.readFileSync(path.join(base,'repo-sync-ui.js'),'utf8');
 const css=fs.readFileSync(path.join(base,'v3.css'),'utf8');
 assert.match(ui,/\/pulls\/72/);
 assert.match(ui,/dashboardDrift/);
 assert.match(ui,/androidWorkflow/);
 assert.match(ui,/mobile-quick-nav/);
 assert.match(ui,/source-reported/);
 assert.match(css,/\.mobile-quick-nav/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/min-height:44px/);
 assert.doesNotMatch(ui,/Authorization\s*:|github_pat_|ghp_/i);
});

test('v35 exports a bounded read-only handoff with exact SHAs and no invented Android approval',()=>{
 const model=core.buildRepoHealth({
  pulls:[pr(37,B,A),pr(70,C,A),pr(72,D,B)],
  runs:[run(41,C,'Android emulator validation','failure')],
  timestamp:'2026-10-20T12:00:00Z'
 });
 const report=core.formatHealthReport(model);
 assert.match(report,/PR #70.*cccccccccccccccccccccccccccccccccccccccc/);
 assert.match(report,/Android Workflow: FAIL/);
 assert.match(report,/NOT_APPROVED/);
 assert.match(report,/SNAPSHOT/);
 assert.match(report,/NOT_TESTED/);
 assert.ok(report.length<10000);
 assert.doesNotMatch(report,/Authorization|ghp_|github_pat_/i);
});
test('v35 source exposes an accessible copy action without privileged GitHub operation',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../../docs/control-center/index.html'),'utf8');
 const ui=fs.readFileSync(path.join(__dirname,'../../docs/control-center/repo-sync-ui.js'),'utf8');
 assert.match(html,/id="repo-sync-copy"/);
 assert.match(ui,/formatHealthReport/);
 assert.match(ui,/navigator\.clipboard/);
 assert.doesNotMatch(ui,/fetch\s*\([^)]*POST/i);
});
