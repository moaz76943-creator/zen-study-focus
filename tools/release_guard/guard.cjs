#!/usr/bin/env node
'use strict';
// Fail-closed publication gate. Never modifies a v21 record or publishes anything.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const SHA = /^[a-f0-9]{40}$/i;
const MIN_NEW_VERSION_CODE = 22; // current default main is v21; reusing it would overwrite an older build
function evaluate(input) {
  const x=input||{}, reasons=[];
  if (!SHA.test(x.checkedSha||'')) reasons.push('Invalid checked-out SHA');
  if (!SHA.test(x.requestedSha||'') || x.requestedSha!==x.checkedSha) reasons.push('Requested SHA must match checked-out SHA exactly');
  if (!SHA.test(x.approvedSha||'') || x.approvedSha!==x.checkedSha) reasons.push('Approved SHA must match checked-out SHA exactly');
  if (!SHA.test(x.candidateSha||'')) reasons.push('Invalid integrated candidate SHA');
  if (x.containsCandidate!==true) reasons.push('Integrated candidate SHA is not an ancestor of the checked-out release source');
  if (x.ref!=='refs/heads/main') reasons.push('Release is restricted to main');
  for (const key of ['media','device','backup','locales','human']) {
    if (x[key]!=='true') reasons.push('Missing '+key+' approval for this exact release');
  }
  if (x.hasUploadCredentials!==true) reasons.push('Missing upload signing credentials');
  const gradle=String(x.gradle||'');
  const versions=[...gradle.matchAll(/\bversionCode\s+(\d+)\b/g)].map(a=>Number(a[1]));
  if (versions.length!==1||versions[0]<MIN_NEW_VERSION_CODE) reasons.push('versionCode must advance beyond existing v21 builds');
  if (/signingConfig\s+signingConfigs\.debug\b/.test(gradle)) reasons.push('Release debug signing is forbidden');
  if (!/signingConfig\s+signingConfigs\.upload\b/.test(gradle)) reasons.push('Explicit upload signing configuration required');
  return {allowed:reasons.length===0,reasons};
}
function gitText(args){
  const r=cp.spawnSync('git',args,{encoding:'utf8',shell:false,timeout:7000,maxBuffer:100000});
  if (r.error||r.status!==0) throw new Error('Cannot obtain exact Git evidence: '+(r.error?.message||r.stderr||r.status));
  return r.stdout.trim();
}
function candidateIsAncestor(candidate,checked){
  if (!SHA.test(candidate||'')||!SHA.test(checked||''))return false;
  const r=cp.spawnSync('git',['merge-base','--is-ancestor',candidate,checked],{encoding:'utf8',shell:false,timeout:7000});
  return !r.error&&r.status===0;
}
function main() {
  const env=process.env;
  const checked=gitText(['rev-parse','HEAD']);
  const gradle=fs.readFileSync(path.resolve('android/app/build.gradle'),'utf8');
  const result=evaluate({
    checkedSha:checked,requestedSha:env.EXPECTED_RELEASE_SHA,approvedSha:env.ZEN_RELEASE_APPROVED_SHA,
    candidateSha:env.ZEN_CANDIDATE_SHA,containsCandidate:candidateIsAncestor(env.ZEN_CANDIDATE_SHA,checked),
    ref:env.GITHUB_REF,gradle,media:env.ZEN_MEDIA_LICENSES_APPROVED,
    device:env.ZEN_ANDROID_E2E_APPROVED,backup:env.ZEN_BACKUP_RESTORE_APPROVED,
    locales:env.ZEN_20_LOCALES_APPROVED,human:env.ZEN_HUMAN_RELEASE_APPROVED,
    hasUploadCredentials:['ZEN_UPLOAD_KEYSTORE_BASE64','ZEN_UPLOAD_STORE_PASSWORD','ZEN_UPLOAD_KEY_ALIAS','ZEN_UPLOAD_KEY_PASSWORD']
      .every(k=>typeof env[k]==='string'&&env[k].length>0)
  });
  if (!result.allowed){console.error('RELEASE BLOCKED at '+checked+':\n- '+result.reasons.join('\n- '));process.exitCode=1;}
  else console.log('SHA-bound source, release inputs and explicit gates validated at '+checked+'.');
}
if (require.main===module){try{main();}catch(e){console.error('RELEASE BLOCKED: '+e.message);process.exitCode=1;}}
module.exports={evaluate,candidateIsAncestor};
