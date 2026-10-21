#!/usr/bin/env node
'use strict';
// TRACK11: read-only reporting for the EXISTING 20 UI languages.
// No runtime imports, locale promotion, translation mutations, or user-data reads.
const fs=require('node:fs'),path=require('node:path');
const A=require('./audit.cjs');
const EXPECTED=A.LANGS.slice();
const RTL=new Set(['ar','fa','ur']);
const canonicalScreens=new Set(['timer','tasks','notes','goals','analytics','sounds','settings','calendar','navigation','training','dialogs']);
function screenOf(catalog,lookups){
 if(lookups.has(catalog))return lookups.get(catalog);
 if(catalog==='quick.training')return 'training';
 if(catalog==='sounds.alerts')return 'sounds';
 if(catalog==='timer.settings')return 'settings';
 const parts=String(catalog).split('.');
 for(const part of parts)if(canonicalScreens.has(part))return part;
 return 'unclassified';
}
function buildReview(source){
 if(!source||!Array.isArray(source.languages))throw Error('EXACTLY_20_ACTIVE_LOCALES_REQUIRED');
 const codes=source.languages.map(x=>x.code);
 if(codes.length!==20||new Set(codes).size!==20||
    codes.some(x=>!EXPECTED.includes(x))||EXPECTED.some(x=>!codes.includes(x)))
   throw Error('EXACTLY_20_ACTIVE_LOCALES_REQUIRED');
 for(const {code,dir} of source.languages)
  if(dir!==(RTL.has(code)?'rtl':'ltr'))throw Error('ACTIVE_LOCALE_DIRECTION_MISMATCH:'+code);
 if(!/^[a-f\d]{40}$/.test(source.pinnedSha||''))throw Error('EXACT_SOURCE_SHA_REQUIRED');
 const lookups=new Map((source.catalogs||[]).map(c=>[c.id,c.screen]));
 const gaps=(source.missing||[]).map(x=>({
  language:x.language,screen:screenOf(x.catalog,lookups),catalog:x.catalog,
  key:x.key,english:x.english,classification:'EXPLICIT_CATALOG_GAP',
  rendered:'NOT_TESTED',fallback:'NOT_VERIFIED',candidate:null,
  reviewStatus:'PENDING_HUMAN',approvedForRuntime:false
 }));
 const surfaces=(source.staticCandidates||[]).map(x=>({
  ...x,classification:'UNMARKED_SOURCE_CANDIDATE',
  rendered:'NOT_TESTED',reviewStatus:'NEEDS_CONTEXT_CLASSIFICATION'
 }));
 const identicalEnglish=(source.englishIdentical||[]).map(x=>({
  ...x,status:'NATIVE_REVIEW_REQUIRED_NOT_PROVEN_ERROR'
 }));
 const easternLiterals=(source.eastern||[]).map(x=>({
  ...x,status:'REVIEW_LITERAL_CONTEXT'
 }));
 const matrix=source.languages.map(({code,dir})=>({
  code,dir,screens:Object.fromEntries((source.screens||[]).map(s=>
   [s,source.coverage?.[code]?.[s]||{present:0,total:0,missing:0,percent:0}]))
 }));
 return {
  schema:1,kind:'TRACK11_EXISTING_20_ONLY',sourceSha:source.pinnedSha,
  workingTreeDirty:source.workingTreeDirty,
  measurement:'Explicit source catalog entries; NOT rendered-screen or fallback verification',
  languages:source.languages,matrix,gaps,
  staticCount:surfaces.length,surfaces,identicalEnglish,easternLiterals,
  markup:source.markup,warnings:source.warnings||[],
  futureLanguagesActivated:0,releaseApproved:false,
  reviewRule:'Every suggested correction requires qualified human contextual approval, and native Android validation',
  limits:['Actual visible fallback and unused keys remain NOT_TESTED until instrumented UI checks',
   'Android SAF, on-device TalkBack and process restart are NOT_TESTED by this report',
   'Arabic/Farsi/Urdu RTL and generated 0-9 must be verified at runtime',
   'Do not rewrite any user-authored notes, tasks or stored backup values']
 };
}
function cell(value){
 let v=value==null?'':String(value);
 // CSV remains lossless for benign data; prefix spreadsheet formulas only in this export.
 if(/^[\s]*[=+@-]/u.test(v))v="'"+v;
 return '"'+v.replace(/"/g,'""')+'"';
}
function csv(review){
 const names=['language','screen','catalog','key','english','classification','rendered','fallback','reviewStatus','candidate','reviewer','humanApproved'];
 const rows=[names];
 for(const g of review.gaps)rows.push([
   g.language,g.screen,g.catalog,g.key,g.english,g.classification,g.rendered,g.fallback,
   g.reviewStatus,'','','NO'
 ]);
 return rows.map(x=>x.map(cell).join(',')).join('\n')+'\n';
}
function matrixMarkdown(review){
 const screens=[...new Set(review.matrix.flatMap(x=>Object.keys(x.screens)))].sort();
 const lines=['# Track 11: current 20-language source review','',
  'Pinned source SHA: `'+review.sourceSha+'`','',
  '**Source presence only. Percentages DO NOT prove visible translation or human suitability.**','',
  '| Locale | Dir | '+screens.join(' | ')+' | Missing |',
  '|:--|:--|'+screens.map(()=>'--:').join('|')+'|--:|'];
 for(const row of review.matrix){
  const total=review.gaps.filter(x=>x.language===row.code).length;
  lines.push('| '+row.code+' | '+row.dir+' | '+screens.map(s=>{
   const c=row.screens[s];return c&&c.total?c.present+'/'+c.total+' ('+c.percent+'%)':'NOT_TESTED';
  }).join(' | ')+' | '+total+' |');
 }
 lines.push('','## Triage categories','',
  '- EXPLICIT_CATALOG_GAP: '+review.gaps.length+' language/key pairs; rendering and fallback NOT_TESTED.',
  '- UNMARKED_SOURCE_CANDIDATE: '+review.surfaces.length+' suspicious source literals; not automatically defects.',
  '- NATIVE_REVIEW_REQUIRED_NOT_PROVEN_ERROR: '+review.identicalEnglish.length+' identical-to-English candidate translations.',
  '- REVIEW_LITERAL_CONTEXT: '+review.easternLiterals.length+' localized source literals containing Eastern digits; may be quoted text, not generated counters.',
  '- Unknown markup i18n keys: '+(review.markup?.unknown?.length||0)+'.',
  '', '## Required independent gates','',
  'Chromium 20-locale × 320/360/393/430px; Android WebView and native dialogs; TalkBack; actual locale persistence after restart and restore; CSV/SVG/ARIA Latin digits; qualified translator approval for EACH changed sentence.',
  '', 'Every CSV row is a reviewer worksheet, not a runtime translation. No future locale activation and RELEASE_APPROVED=NO.','');
 return lines.join('\n');
}
function writeReview(review,dir){
 fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'track11-coverage.json'),JSON.stringify(review,null,2)+'\n');
 fs.writeFileSync(path.join(dir,'track11-review-queue.csv'),csv(review));
 fs.writeFileSync(path.join(dir,'track11-matrix.md'),matrixMarkdown(review));
 const triage={sourceSha:review.sourceSha,summary:{
  explicitMissing:review.gaps.length,staticCandidates:review.surfaces.length,
  englishIdentical:review.identicalEnglish.length,easternSourceLiterals:review.easternLiterals.length,
  unresolvedMarkup:review.markup?.unknown?.length||0},
  staticCandidates:review.surfaces,englishIdentical:review.identicalEnglish,
  easternLiterals:review.easternLiterals,unresolvedMarkup:review.markup?.unknown||[],
  humanApproval:'NOT_TESTED',android:'NOT_TESTED',runtimeCoverage:'NOT_TESTED'};
 fs.writeFileSync(path.join(dir,'track11-triage.json'),JSON.stringify(triage,null,2)+'\n');
}
function main(args=process.argv.slice(2)){
 if(args.length!==2||args[0]!=='--out')throw Error('Usage: track11_review.cjs --out DIRECTORY');
 const r=buildReview(A.audit());
 writeReview(r,args[1]);
 console.log(JSON.stringify({sha:r.sourceSha,languages:r.languages.length,screens:r.matrix[0].screens,
  explicitMissing:r.gaps.length,staticCandidates:r.staticCount,
  englishIdentical:r.identicalEnglish.length,easternLiterals:r.easternLiterals.length,
  releaseApproved:r.releaseApproved},null,2));
 return r;
}
if(require.main===module)main();
module.exports={buildReview,writeReview,csv,matrixMarkdown,main};
