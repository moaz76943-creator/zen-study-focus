'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const native=require('../../tools/localization_100/native_copy.cjs');
const drafts=require('../../tools/localization_100/native_drafts.cjs');
test('native translation packets are tied to actually detected Java-facing UI copy',()=>{
 const list=[{path:'MainActivity.java',line:4,kind:'toast',text:'Backup saved',status:'UNTRANSLATED_REQUIRES_REVIEW'},
             {path:'MainActivity.java',line:5,kind:'toast',text:'Keep the file private',status:'UNTRANSLATED_REQUIRES_REVIEW'}];
 const p={schema_version:1,locale:'sw',status:'DRAFT_NATIVE_NEEDS_REVIEW',sourceSha256:native.inventoryHash(list),strings:{'Backup saved':'Nakala imehifadhiwa'}};
 const r=drafts.validate(p,list);
 assert.equal(r.valid,true);
 assert.equal(r.total,2);
 assert.equal(r.translated,1);
 assert.equal(r.missing,1);
 assert.equal(r.runtimeApproved,false);
 assert.equal(r.nativeAndroid,'NOT_TESTED');
 p.strings['Bogus phrase']='xx';assert.equal(drafts.validate(p,list).valid,false);
});
test('native draft copy cannot silently change placeholders or use invisible Unicode',()=>{
 const list=[{path:'Test.java',line:1,kind:'toast',text:'Backup %s saved',status:'UNTRANSLATED_REQUIRES_REVIEW'}];
 const p={schema_version:1,locale:'ro',status:'DRAFT_NATIVE_NEEDS_REVIEW',sourceSha256:native.inventoryHash(list),strings:{'Backup %s saved':'Copie salvată'}};
 assert.equal(drafts.validate(p,list).valid,false);
 p.strings['Backup %s saved']='Copie %s salvată';
 assert.equal(drafts.validate(p,list).valid,true);
 p.strings['Backup %s saved']='Copie ١١ %s';
 assert.equal(drafts.validate(p,list).valid,false);
});
test('actual native Swahili and Romanian review packets are structurally valid, not installed',()=>{
 const list=native.report().uiStrings;
 const r=drafts.report();
 assert.equal(r.valid,true,JSON.stringify(r.errors));
 assert.equal(r.candidates,2);
 for(const locale of ['sw','ro']){
  const p=require('../../tools/localization_100/native_drafts/'+locale+'.json');
  const result=drafts.validate(p,list);
  assert.equal(result.valid,true,JSON.stringify(result.errors));
  assert.ok(result.translated>=8);
  assert.equal(result.runtimeApproved,false);
 }
});

test('native candidate must match exact Java UI copy inventory including untouched English sources',()=>{
 const source=[{path:'MainActivity.java',line:4,kind:'toast',text:'Backup saved',status:'UNTRANSLATED_REQUIRES_REVIEW'},
  {path:'FocusTimerService.java',line:7,kind:'notificationBody',text:'Timer is running',status:'UNTRANSLATED_REQUIRES_REVIEW'}];
 const p={schema_version:1,locale:'sw',status:'DRAFT_NATIVE_NEEDS_REVIEW',sourceSha256:native.inventoryHash(source),
  strings:{'Backup saved':'Nakala imehifadhiwa'}};
 assert.equal(drafts.validate(p,source).valid,true);
 const stale={...p,sourceSha256:''.padStart(64,'0')};
 assert.ok(drafts.validate(stale,source).errors.includes('STALE_NATIVE_SOURCE_INVENTORY'));
 const changed=source.map(r=>({...r}));changed[1].text='Timer suspended';
 assert.ok(drafts.validate(p,changed).errors.includes('STALE_NATIVE_SOURCE_INVENTORY'));
 const reordered=[source[1],source[0]];
 assert.equal(native.inventoryHash(source),native.inventoryHash(reordered));
 const moved=source.map(r=>({...r,line:r.line+20}));
 assert.equal(native.inventoryHash(source),native.inventoryHash(moved),'line moves should not invalidate semantically identical source copy');
});
