'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const guard=require('../../tools/localization_100/guard.cjs');
const draftTools=require('../../tools/localization_100/drafts.cjs');
const nativeTools=require('../../tools/localization_100/native_copy.cjs');
const nativeDraftTools=require('../../tools/localization_100/native_drafts.cjs');
const {buildQueue}=require('../../tools/localization_100/review_queue.cjs');
const web={'core.timer':{start:'Start',countdown:'Remaining {mins} minutes'},
  'analytics.dictionary':{export:'Export CSV',noData:'No sessions recorded'}};
const native=[{path:'MainActivity.java',kind:'toast',line:30,text:'Unable to save backup; unchanged data',status:'UNTRANSLATED_REQUIRES_REVIEW'}];
function webPack(source=web,strings={'core.timer':{start:'Anza'}}){
 return {schema_version:1,locale:'sw',status:draftTools.DRAFT_STATUS,inventorySha256:guard.inventoryHash(source),strings};
}
function nativePack(source=native){
 return {schema_version:1,locale:'sw',status:nativeDraftTools.STATUS,sourceSha256:nativeTools.inventoryHash(source),
  strings:{[source[0].text]:'Imeshindikana kuhifadhi nakala; data haijabadilika'}};
}
test('80 planned languages receive exhaustive human-review worksheets without pretending English is translated',()=>{
 const q=buildQueue({source:web,nativeRows:native,webDrafts:{sw:webPack()},nativeDrafts:{}});
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
 const old={sw:webPack(web,{'core.timer':{start:'Anza',ghost:'This must fail'}})};
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


test('changed English value at an existing key cannot rebind a stale web draft to a current source hash',()=>{
 const changed=JSON.parse(JSON.stringify(web));changed['core.timer'].start='Begin';
 assert.throws(()=>buildQueue({source:changed,nativeRows:native,webDrafts:{sw:webPack()},nativeDrafts:{}}),/STALE_SOURCE_INVENTORY/);
});
test('native draft provenance must match source paths and callsite kinds, not only text membership',()=>{
 const pack=nativePack();
 for(const changed of [[{...native[0],path:'FocusTimerService.java'}],[{...native[0],kind:'notificationBody'}]]){
  assert.throws(()=>buildQueue({source:web,nativeRows:changed,webDrafts:{},nativeDrafts:{sw:pack}}),/STALE_NATIVE_SOURCE_INVENTORY/);
 }
 const q=buildQueue({source:web,nativeRows:native,webDrafts:{},nativeDrafts:{sw:pack}}).find(x=>x.locale==='sw');
 assert.equal(q.items.find(x=>x.surface==='android').candidate,pack.strings[native[0].text]);
 assert.equal(q.approvedForRuntime,false);
});
test('review queue rejects invalid web draft content even with the current inventory hash',()=>{
 for(const [target,reason] of [['Dakika','PLACEHOLDER_MISMATCH'],['Dakika {mins} ١','NON_WESTERN_DIGITS'],['<b>Dakika {mins}</b>','UNREVIEWED_HTML']]){
  const pack=webPack(web,{'core.timer':{countdown:target}});
  assert.throws(()=>buildQueue({source:web,nativeRows:native,webDrafts:{sw:pack},nativeDrafts:{}}),new RegExp(reason));
 }
 const approved={...webPack(),status:'APPROVED'};
 assert.throws(()=>buildQueue({source:web,nativeRows:native,webDrafts:{sw:approved},nativeDrafts:{}}),/MUST_REMAIN_DRAFT/);
});
test('review queue rejects malformed native drafts rather than passing unsafe copy to reviewers',()=>{
 const pack=nativePack();pack.strings[native[0].text]='<b>Data ١</b>';
 assert.throws(()=>buildQueue({source:web,nativeRows:native,webDrafts:{},nativeDrafts:{sw:pack}}),/UNSAFE_NATIVE_COPY/);
 const approved={...nativePack(),status:'APPROVED'};
 assert.throws(()=>buildQueue({source:web,nativeRows:native,webDrafts:{},nativeDrafts:{sw:approved}}),/NOT_A_NATIVE_DRAFT/);
});
