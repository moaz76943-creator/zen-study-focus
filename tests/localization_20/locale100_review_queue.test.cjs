'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const guard=require('../../tools/localization_100/guard.cjs');
const {buildQueue}=require('../../tools/localization_100/review_queue.cjs');
const web={'core.timer':{start:'Start',countdown:'Remaining {mins} minutes'},
  'analytics.dictionary':{export:'Export CSV',noData:'No sessions recorded'}};
const native=[{path:'MainActivity.java',kind:'toast',line:30,text:'Unable to save backup; unchanged data',status:'UNTRANSLATED_REQUIRES_REVIEW'}];
test('80 planned languages receive exhaustive human-review worksheets without pretending English is translated',()=>{
 const q=buildQueue({source:web,nativeRows:native,webDrafts:{sw:{
  strings:{'core.timer':{start:'Anza'}}}},nativeDrafts:{}});
 assert.equal(q.length,80);
 assert.equal(q.some(x=>['he','iw'].includes(x.locale)),false);
 assert.equal(q.every(x=>x.approvedForRuntime===false&&x.humanReview==='NOT_TESTED'),true);
 assert.equal(q.every(x=>x.items.length===5),true);
 const sw=q.find(x=>x.locale==='sw'),ro=q.find(x=>x.locale==='ro'),mr=q.find(x=>x.locale==='mr');
 assert.equal(sw.candidateCount,1);
 assert.equal(sw.untranslatedCount,4);
 assert.equal(sw.items.find(x=>x.key==='start').candidate,'Anza');
 assert.equal(sw.items.find(x=>x.key==='countdown').candidate,null);
 assert.equal(sw.items.find(x=>x.key==='countdown').placeholders[0],'{mins}');
 assert.equal(sw.items.find(x=>x.key==='export').critical,true);
 assert.equal(sw.items.find(x=>x.key==='Unable to save backup; unchanged data').critical,true);
 assert.equal(ro.candidateCount,0);
 assert.equal(mr.items.some(x=>x.candidate==='Start'),false);
});
test('source changes and unknown draft keys cannot be silently accepted into queue',()=>{
 const old={sw:{strings:{'core.timer':{start:'Anza',ghost:'This must fail'}}}};
 assert.throws(()=>buildQueue({source:web,nativeRows:native,webDrafts:old,nativeDrafts:{}}),/UNRECOGNIZED_CANDIDATE/);
 const changed=JSON.parse(JSON.stringify(web));changed['core.timer'].start='Begin';
 const q=buildQueue({source:changed,nativeRows:native,webDrafts:{},nativeDrafts:{}});
 assert.equal(q.find(x=>x.locale==='sw').items.find(x=>x.key==='start').english,'Begin');
});

test('candidate HTML/JS literals appear as separate human-classification work, never as approved translations',()=>{
 const staticRows=[{file:'index.html',line:117,kind:'unmarked_html_text',text:'Reset data'},
  {file:'app.js',line:899,kind:'static_js_display_candidate',text:'Choose a day'}];
 const q=buildQueue({source:web,nativeRows:native,webDrafts:{},nativeDrafts:{},unmarkedRows:staticRows});
 assert.equal(q.length,80);
 const sw=q.find(x=>x.locale==='sw');
 assert.equal(sw.items.length,7);
 const reset=sw.items.find(x=>x.english==='Reset data');
 assert.equal(reset.status,'NEEDS_SOURCE_INVENTORY_CLASSIFICATION');
 assert.equal(reset.candidate,null);
 assert.equal(reset.critical,true);
 assert.equal(reset.surface,'unmarked-static');
 assert.equal(reset.sourceFile,'index.html');
 assert.equal(reset.sourceLine,117);
 assert.equal(sw.approvedForRuntime,false);
});
