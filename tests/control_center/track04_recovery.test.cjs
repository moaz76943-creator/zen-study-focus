'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const core=require('../../docs/control-center/repo-sync-core.js');
const shaA='a'.repeat(40),shaB='b'.repeat(40),shaC='c'.repeat(40);
const verifiedSha='3ab4ebdf6b4cded3ebaa3b0c08ff30b01e6e73e8';
const pull=(number,head,base=shaA)=>({
  number,head:{sha:head},base:{sha:base},draft:true,
  html_url:'https://github.com/moaz76943-creator/zen-study-focus/pull/'+number
});
const run=(id,head,conclusion='success')=>({
  id,head_sha:head,conclusion,status:'completed',name:'Source QA',
  html_url:'https://github.com/moaz76943-creator/zen-study-focus/actions/runs/'+id
});
test('track04: real PR70 HEAD is separate from source CI and Android approval',()=>{
  const model=core.buildRepoHealth({
    pulls:[pull(25,shaA),pull(37,shaB,shaA),pull(70,shaC)],
    runs:[run(123,shaC)],errors:[]
  });
  assert.equal(model.pr70.sha,shaC);
  assert.equal(model.pr70.ci.status,'PASS');
  assert.equal(model.android.status,'STALE');
  assert.equal(model.android.pass,null);
  assert.equal(model.pr70Verified,true);
  assert.equal(model.release,'NOT_APPROVED');
});
test('track04: dated scoped Android evidence is SOURCE_REPORTED only at matching SHA',()=>{
  const current=core.buildRepoHealth({pulls:[pull(70,verifiedSha)],runs:[]});
  assert.equal(current.android.status,'SOURCE_REPORTED');
  assert.equal(current.android.pass,3);
  assert.equal(current.android.fail,0);
  assert.equal(current.android.notTested,17);
  assert.equal(current.android.uiAutomatorNotTested,20);
  assert.equal(current.android.physicalDevice,'NOT_TESTED');
  assert.equal(current.locale.missing,4608);
  assert.equal(current.locale.languages,20);
  assert.equal(current.audio.recordedPass,1);
  assert.equal(current.audio.recordedFail,2);
  assert.equal(current.security.status,'NOT_VERIFIED');
  assert.equal(current.pr70.ci.status,'NOT_VERIFIED');
});
test('track04: network failure/missing PR70 cannot impersonate current evidence',()=>{
  const model=core.buildRepoHealth({pulls:[pull(25,shaA),pull(37,shaB,shaA)],
    errors:['GitHub HTTP 403'],runs:[]});
  assert.equal(model.pr70,null);
  assert.equal(model.pr70Verified,false);
  assert.equal(model.android.status,'NOT_VERIFIED');
  assert.equal(model.locale.status,'NOT_VERIFIED');
});
test('track04: invalid PR70 HEAD is rejected (fail closed)',()=>{
  assert.throws(()=>core.buildRepoHealth({pulls:[pull(70,'bad')] }),/SHA/);
});
test('track04: dashboard requests PR70 read-only and labels snapshots/mobile evidence',()=>{
  const dir=path.join(__dirname,'../../docs/control-center');
  const ui=fs.readFileSync(path.join(dir,'repo-sync-ui.js'),'utf8');
  const css=fs.readFileSync(path.join(dir,'v3.css'),'utf8');
  assert.match(ui,/\/pulls\/70/);
  assert.match(ui,/renderTrack04/);
  assert.match(ui,/LIVE_GITHUB/);
  assert.match(ui,/SNAPSHOT 2026-10-20/);
  assert.match(ui,/NOT_TESTED/);
  assert.doesNotMatch(ui,/Authorization\s*:/i);
  assert.match(css,/\.repo-sync-recovery/);
  assert.match(css,/max-width:360px/);
  assert.match(css,/min-height:44px/);
});
