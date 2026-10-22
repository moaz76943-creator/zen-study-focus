'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {audit}=require('../../tools/language_review/audit.cjs');
const {report}=require('../../tools/localization_100/coverage.cjs');
test('exact-head 100-locale report distinguishes current runtime, drafts and missing languages',()=>{
 const result=report();
 assert.equal(result.registered,100);
 assert.equal(result.runtimeExisting,20);
 assert.equal(result.newlyCertified,0);
 assert.equal(result.planned,80);
 assert.equal(result.languages.length,100);
 assert.equal(result.languages.some(v=>['he','iw'].includes(v.code)),false);
 assert.equal(result.releaseApproved,false);
 assert.equal(result.sourceCatalogs,25);
 assert.equal(result.sourceKeysPerLanguage,472);
 const sw=result.languages.find(x=>x.code==='sw');
 const ro=result.languages.find(x=>x.code==='ro');
 const marathi=result.languages.find(x=>x.code==='mr');
 assert.ok(sw.draftCount>=80&&sw.missingKeys>0);
 assert.ok(ro.draftCount>=80&&ro.missingKeys>0);
 assert.equal(marathi.draftCount,0);
 assert.equal(marathi.missingKeys,472);
 assert.equal(sw.selectable,false);
 assert.ok(result.nativeCandidateCount>=8);
 assert.ok(result.nativeDraftStrings>=16);
 assert.ok(sw.nativeDraftCount>=8);
 assert.ok(ro.nativeDraftCount>=8);
 assert.equal(sw.nativeReview,'NOT_TESTED');
 assert.equal(result.languages.find(x=>x.code==='en').runtimeAvailable,true);
 assert.ok(result.legacyExplicitMissing>4000);
 assert.equal(result.sourceInventoryComplete,false);
});

test('every registered language reports verified key approvals separately from present or drafted strings',()=>{
 const result=report();
 assert.equal(result.languages.length,100);
 for(const locale of result.languages){
  assert.equal(locale.verifiedApprovedKeys,0,locale.code+' cannot infer approval from source presence');
  assert.equal(locale.verifiedNativeApprovedStrings,0,locale.code+' has no verified native approval');
  assert.equal(locale.keyApprovalEvidence,'NO_INDEPENDENT_KEY_LEVEL_REVIEW',locale.code);
  assert.equal(locale.translationApproved,false);
 }
 assert.ok(result.languages.some(x=>x.phase==='existing'&&x.explicitExistingKeys>0));
 assert.ok(result.languages.some(x=>x.phase==='planned'&&x.draftCount>0));
});
