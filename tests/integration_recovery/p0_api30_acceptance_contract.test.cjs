'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),os=require('node:os');
const root=path.resolve(__dirname,'../..'),probe=path.join(root,'tests/android_e2e_recovery/p0_timer_saf_android.cjs');
test('P0 API30 missing emulator cannot be reported Android PASS',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'p0-api30-')),out=path.join(dir,'report.json');
 try{const r=cp.spawnSync(process.execPath,[probe,out],{env:{...process.env,DF_ANDROID_DISPOSABLE:'0'},encoding:'utf8',timeout:5000});
 assert.equal(r.status,1);const p=JSON.parse(fs.readFileSync(out));assert.equal(p.counts.PASS,0);assert.equal(p.counts.NOT_TESTED,1);assert.equal(p.release_approved,false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('P0 API30 gate pins application tree and covers required timer flows',()=>{
 const src=fs.readFileSync(probe,'utf8'),workflow=fs.readFileSync(path.join(root,'.github/workflows/p0_timer_saf_api30.yml'),'utf8');
 for(const flow of ['timer_start_pause','timer_reset_cancel_retry','timer_mode_and_custom_reopen','activity_and_sport_rest','quick_training_rejection_retry','timer_completion_credit_retry','prior_user_data_unchanged'])assert.ok(src.includes(flow),'Missing actual acceptance '+flow);
 assert.match(workflow,/APP_SOURCE_SHA:/);assert.match(workflow,/HEAD:android/);assert.match(workflow,/api-level: 30/);
 assert.match(src,/application_sha/);assert.match(src,/native.*receipt|receipt\(\)/);
});
