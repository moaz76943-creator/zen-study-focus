#!/usr/bin/env node
'use strict';
// Read-only, exact-checkout localization progress scoreboard (NOT release certification).
const guard=require('./guard.cjs'),drafts=require('./drafts.cjs');
const review=require('../language_review/audit.cjs');
function report(){
 const source=guard.sourceInventory(),screenAudit=review.audit();
 const draftAudit=drafts.reportDrafts(source);
 const nativeCopy=require('./native_copy.cjs').report();
 const nativeDrafts=require('./native_drafts.cjs').report();
 const nativeByLocale=new Map(nativeDrafts.results.map(x=>[x.locale,x]));
 const tracked=new Map(draftAudit.languages.map(x=>[x.locale,x]));
 const missingCount=new Map();
 for(const {language} of screenAudit.missing)missingCount.set(language,(missingCount.get(language)||0)+1);
 const groups=Object.keys(source).length,keys=Object.values(source).reduce((n,r)=>n+Object.keys(r).length,0);
 const languages=guard.REGISTRY.map(loc=>{
  const exists=loc.phase==='existing', candidate=tracked.get(loc.code);
  const missingKeys=exists?(missingCount.get(loc.code)||0):candidate?candidate.missing:keys;
  const draftCount=candidate?candidate.translated:0;
  const nativeCount=nativeByLocale.get(loc.code)?.translated||0;
  return Object.freeze({code:loc.code,name:loc.name,script:loc.script,direction:loc.direction,
   phase:loc.phase,
   state:exists?'EXISTING_RUNTIME_UNCERTIFIED':candidate?'DRAFT_UNREVIEWED':'NOT_STARTED',
   runtimeAvailable:exists,selectable:exists,draftCount,nativeDraftCount:nativeCount,
   nativeTextTotal:nativeCopy.candidates,sourceKeyTotal:keys,
   explicitExistingKeys:exists?keys-missingKeys:0,missingKeys,
   // Source presence and structurally safe drafts are NOT evidence of a human
   // approved translation. The current pipeline has no independently verified
   // key-level approval record for either existing or planned locales.
   verifiedApprovedKeys:0,verifiedNativeApprovedStrings:0,
   keyApprovalEvidence:'NO_INDEPENDENT_KEY_LEVEL_REVIEW',
   nativeReview:'NOT_TESTED',androidVerified:'NOT_TESTED',screensVerified:'NOT_TESTED',
   translationApproved:false});
 });
 return Object.freeze({schema_version:1,
  sourceCommit:screenAudit.pinnedSha,
  registered:languages.length,runtimeExisting:languages.filter(x=>x.runtimeAvailable).length,
  planned:languages.filter(x=>x.state!=='EXISTING_RUNTIME_UNCERTIFIED').length,
  newlyCertified:0,sourceCatalogs:groups,sourceKeysPerLanguage:keys,
  sourceInventorySha256:guard.inventoryHash(source),
  sourceInventoryComplete:false,
  nativeCandidateCount:nativeCopy.candidates,nativeDraftStrings:nativeDrafts.candidateTexts,
  nativeSourceLocalized:false,
  existingMeasurement:'Explicit checked-in dictionary keys only, not rendered/native strings',
  legacyExplicitMissing:screenAudit.missing.length,
  englishIdenticalCandidates:screenAudit.englishIdentical.length,
  unmarkedStaticCandidates:screenAudit.staticCandidates.length,
  newDraftCandidates:draftAudit.candidateCount,
  newDraftStrings:draftAudit.translatedCandidates,
  draftErrors:draftAudit.errors,
  completionRateCertified:0,
  releaseApproved:false,readyForMerge:false,
  independentBlockers:['Existing 20 locale explicit source gaps and unreviewed copy',
   'Native and dynamic UI text unindexed','80 new locales not fully translated',
   'Native-speaker contextual review NOT_TESTED','Android real device, SAF, TalkBack and all-button semantics NOT_TESTED',
   'Security, media and data durability release gates independent'],
  languages});
}
if(require.main===module){
 try{
  if(process.argv.length!==3||process.argv[2]!=='--report')throw Error('Usage: coverage.cjs --report');
  const result=report();console.log(JSON.stringify(result,null,2));
  if(result.draftErrors.length)process.exitCode=1;
 }catch(e){console.error('LOCALE_COVERAGE_REPORT_FAILED:',e.message);process.exitCode=1;}
}
module.exports={report};
