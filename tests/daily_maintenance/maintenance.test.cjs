'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const m=require('../../tools/daily_maintenance/maintenance.cjs');
const matrix=Array.from({length:161},(_,i)=>'| DF-'+String(i+1).padStart(3,'0')+' | '+(i<58?'BLOCKED':i<155?'IN_PROGRESS':'TESTED')+' | QA | item | evidence |').join('\n');
test('all 161 IDs exactly once, no fabricated completion status',()=>{
 const x=m.assertMatrix(m.readMatrix(matrix));
 assert.equal(x.status.BLOCKED,58);assert.equal(x.status.IN_PROGRESS,97);assert.equal(x.status.TESTED,6);
 assert.deepEqual(x.missing,[]);assert.deepEqual(x.duplicate,[]);
});
test('rejects duplicate or missing tasks and invalid states',()=>{
 assert.throws(()=>m.assertMatrix(m.readMatrix(matrix+'\n| DF-001 | TESTED | QA | duplicate | src |')),/duplicate/i);
 assert.throws(()=>m.assertMatrix(m.readMatrix(matrix.replace(/^\| DF-100.*$/m,''))),/161/);
 assert.throws(()=>m.assertMatrix(m.readMatrix(matrix.replace('DF-001 | BLOCKED','DF-001 | RELEASE_APPROVED'))),/invalid/i);
});
test('queue ranks P0 blockers above progress, skips unapproved device PASS claims',()=>{
 const q=m.queue({tasks:[
  {TASK_ID:'DF4-005',PRIORITY:'P1',CURRENT_STATUS:'IN_PROGRESS',ANDROID_RESULT:'NOT_TESTED',NEXT_ACTION:'test UI'},
  {TASK_ID:'DF-003',PRIORITY:'P0',CURRENT_STATUS:'IN_PROGRESS',ANDROID_RESULT:'NOT_TESTED',NEXT_ACTION:'test backup'},
  {TASK_ID:'DF4-012',PRIORITY:'P0',CURRENT_STATUS:'BLOCKED',ANDROID_RESULT:'NOT_TESTED',NEXT_ACTION:'test timer'},
  {TASK_ID:'DF-001',PRIORITY:'P0',CURRENT_STATUS:'SOURCE_TESTED',ANDROID_RESULT:'NOT_TESTED'}
 ]},3);
 assert.deepEqual(q.map(x=>x.TASK_ID),['DF4-012','DF-003','DF4-005']);
});
test('automatic code changes allow only generated appearance CSS',()=>{
 assert.deepEqual(m.validateChanges([]),[]);
 assert.deepEqual(m.validateChanges(['android/app/src/main/assets/web/control_center_overrides.css']),['android/app/src/main/assets/web/control_center_overrides.css']);
 for(const x of ['android/app/src/main/assets/web/app.js','docs/MEDIA_LICENSES.md','../secret','android/app/src/main/AndroidManifest.xml'])
  assert.throws(()=>m.validateChanges([x]),/unsafe/i);
});
test('generator uses pinned command without shell and fails on error',()=>{
 let observed;
 m.applySafeFix('/tmp/checkout',(bin,args,opts)=>{observed={bin,args,opts};return {status:0}});
 assert.deepEqual(observed.args,['tools/control_center/generate_style.cjs','--write']);
 assert.equal(observed.opts.shell,false);assert.equal(observed.opts.timeout,25000);
 assert.throws(()=>m.applySafeFix('/tmp/checkout',()=>({status:1,stderr:'generator failed'})),/generator failed/);
});
test('daily report is attached to checked-out SHA, never a device or release pass',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'df-maint-'));
 fs.mkdirSync(path.join(dir,'docs/recovery_integration'),{recursive:true});
 fs.writeFileSync(path.join(dir,'docs/recovery_integration/FINAL_MATRIX_161.md'),matrix);
 const r=m.buildReport(dir,{sourceSha:'a'.repeat(40),mode:'audit',now:'2026-10-20T00:00:00Z'});
 assert.equal(r.tasks.total,161);assert.equal(r.release_approved,false);assert.equal(r.device_qa,'NOT_TESTED');
 assert.match(m.toMarkdown(r),/NOT APPROVED/);
 fs.rmSync(dir,{recursive:true,force:true});
});
test('invalid SHA or execution modes are rejected',()=>{
 assert.throws(()=>m.buildReport('.', {sourceSha:'HEAD'}),/SHA/i);
 assert.throws(()=>m.parseArgs(['--root','.','--mode','danger','--out','/tmp/a']),/mode/i);
});