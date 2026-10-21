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
  assert.match(csv,/'\\'=HYPERLINK/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(tmp,'track11-native.json'),'utf8')).rows.length,20);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('a stale or incomplete Android string inventory fails without producing fake review approval',()=>{
 assert.throws(()=>buildNativeReview({...inventory,inventorySha256:''},'a'.repeat(40)),/INVENTORY_SHA_REQUIRED/);
 assert.throws(()=>buildNativeReview(inventory,'bad'),/EXACT_SOURCE_SHA_REQUIRED/);
 assert.throws(()=>buildNativeReview({...inventory,uiStrings:[...inventory.uiStrings,{path:'../bad',kind:'toast',text:'hack'}]},'a'.repeat(40)),/UNSAFE_NATIVE_SOURCE_PATH/);
});
