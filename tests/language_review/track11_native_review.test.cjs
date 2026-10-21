'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {buildNativeReview,writeNativeReview}=require('../../tools/language_review/track11_native_review.cjs');
const inventory={inventorySha256:'b'.repeat(64),files:3,candidates:2,uiStrings:[
 {path:'MainActivity.java',line:77,kind:'toast',text:'Unable to save backup',status:'UNTRANSLATED_REQUIRES_REVIEW'},
 {path:'FocusTimerService.java',line:21,kind:'notificationTitle',text:'Focus session completed',status:'UNTRANSLATED_REQUIRES_REVIEW'}
]};
test('native copy review produces 20 original locales per Java source without enabling translations',()=>{
 const r=buildNativeReview(inventory,'a'.repeat(40));
 assert.equal(r.rows.length,40);
 assert.equal(new Set(r.rows.map(x=>x.language)).size,20);
 assert.deepEqual([...new Set(r.rows.filter(x=>x.dir==='rtl').map(x=>x.language))].sort(),['ar','fa','ur']);
 assert.equal(r.rows.every(x=>x.candidate===null&&x.reviewStatus==='PENDING_HUMAN'),true);
 assert.equal(r.rows.every(x=>x.rendered==='NOT_TESTED'),true);
 assert.equal(r.approvedForRuntime,false);
});
test('native pending worksheet protects against spreadsheet CSV formulas',()=>{
 const danger={...inventory,uiStrings:[{...inventory.uiStrings[0],text:'=HYPERLINK("bad","text")'}],candidates:1};
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'track11-native-'));
 try{
  const r=buildNativeReview(danger,'a'.repeat(40));writeNativeReview(r,tmp);
  const csv=fs.readFileSync(path.join(tmp,'track11-native-review.csv'),'utf8');
  assert.match(csv,/'=HYPERLINK/);
  assert.match(csv,/'=HYPERLINK/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(tmp,'track11-native.json'),'utf8')).rows.length,20);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('a stale or incomplete Android string inventory fails without producing fake review approval',()=>{
 assert.throws(()=>buildNativeReview({...inventory,inventorySha256:''},'a'.repeat(40)),/INVENTORY_SHA_REQUIRED/);
 assert.throws(()=>buildNativeReview(inventory,'bad'),/EXACT_SOURCE_SHA_REQUIRED/);
 assert.throws(()=>buildNativeReview({...inventory,candidates:3,uiStrings:[...inventory.uiStrings,{path:'../bad',kind:'toast',text:'hack'}]},'a'.repeat(40)),/UNSAFE_NATIVE_SOURCE_PATH/);
});

test('native Track 12 dynamic callsites remain distinct 20-language contextual review rows',()=>{
 const v={...inventory,dynamicCandidateCount:2,dynamicInventorySha256:'c'.repeat(64),
  dynamicUiCallsites:[
   {path:'MainActivity.java',line:152,kind:'dynamicDialogMessage',expression:'state.message',status:'DYNAMIC_RUNTIME_CROSS_REFERENCE_REQUIRED'},
   {path:'FocusTimerService.java',line:88,kind:'dynamicNotificationBody',expression:'title + " completed"',status:'DYNAMIC_RUNTIME_CROSS_REFERENCE_REQUIRED'}
  ]};
 const r=buildNativeReview(v,'a'.repeat(40));
 assert.equal(r.englishSourceCandidateCount,2);
 assert.equal(r.dynamicSourceCandidateCount,2);
 assert.equal(r.rows.length,80);
 assert.equal(r.rows.filter(row=>row.classification==='NATIVE_DYNAMIC_CALLEE_REQUIRES_CONTEXT').length,40);
 assert.equal(r.rows.filter(row=>row.classification==='NATIVE_DYNAMIC_CALLEE_REQUIRES_CONTEXT').every(row=>
  row.candidate===null&&row.rendered==='NOT_TESTED'&&row.reviewStatus==='PENDING_HUMAN'&&row.approvedForRuntime===false),true);
 assert.ok(r.rows.some(x=>x.sourceExpression==='state.message'));
 assert.equal(r.dynamicInventorySha256,'c'.repeat(64));
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'track11-dynamic-'));
 try{
  writeNativeReview(r,tmp);
  assert.match(fs.readFileSync(path.join(tmp,'track11-native-review.csv'),'utf8'),/state\.message/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('dynamic inventory hash or counts missing cannot silently discard native review candidates',()=>{
 const data={...inventory,dynamicCandidateCount:1,dynamicUiCallsites:[
  {path:'MainActivity.java',line:210,kind:'dynamicDialogMessage',expression:'externalText'}
 ]};
 assert.throws(()=>buildNativeReview(data,'a'.repeat(40)),/DYNAMIC_INVENTORY_SHA_REQUIRED/);
 assert.throws(()=>buildNativeReview({...data,dynamicInventorySha256:'c'.repeat(64),dynamicCandidateCount:2},'a'.repeat(40)),/DYNAMIC_CANDIDATE_COUNT_MISMATCH/);
});
