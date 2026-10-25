#!/usr/bin/env node
'use strict';
// Exact source attestation for scheduled source-only QA; never modifies app code.
const fs=require('node:fs'),path=require('node:path');
const OFFICIAL_REF='integration/master-qa-verified-v21';
const SHA=/^[a-f0-9]{40}$/i;
function classify(checked,pinned,live,ref){
 if(![checked,pinned,live].every(x=>typeof x==='string'&&SHA.test(x)))
  return {status:'SOURCE_NOT_VERIFIED',source_sha:null,expected_sha:null,live_sha:null,ref};
 const source_sha=checked.toLowerCase(),expected_sha=pinned.toLowerCase(),live_sha=live.toLowerCase();
 const status=source_sha!==expected_sha?'CHECKOUT_MISMATCH':expected_sha!==live_sha?'SOURCE_ADVANCED':
  ref===OFFICIAL_REF?'EXACT_OFFICIAL_SOURCE':'NON_OFFICIAL_AUDIT';
 return {status,source_sha,expected_sha,live_sha,ref};
}
function main(argv=process.argv.slice(2)){
 if(argv.length!==5)throw Error('Usage: official_source_guard CHECKED PINNED LIVE REF OUTPUT_DIR');
 const result=classify(argv[0],argv[1],argv[2],argv[3]);
 const out=path.resolve(argv[4]);
 fs.mkdirSync(out,{recursive:true});
 const record={...result,checked_at:new Date().toISOString(),android_e2e:'NOT_TESTED',release_approved:false};
 fs.writeFileSync(path.join(out,'official-source.json'),JSON.stringify(record,null,2)+'\n');
 const message='SOURCE_GATE='+result.status+' SOURCE_SHA='+(result.source_sha||'NOT_VERIFIED')+
  ' PINNED_SHA='+(result.expected_sha||'NOT_VERIFIED')+' LIVE_SHA='+(result.live_sha||'NOT_VERIFIED')+
  ' REF='+String(result.ref).slice(0,120);
 console.log(message);
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,message+'\n');
 if(!['EXACT_OFFICIAL_SOURCE','NON_OFFICIAL_AUDIT'].includes(result.status))process.exitCode=1;
 return result;
}
if(require.main===module){try{main();}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={classify,OFFICIAL_REF,main};
