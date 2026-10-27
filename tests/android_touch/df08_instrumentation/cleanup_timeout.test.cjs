'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const shell=fs.readFileSync(path.join(__dirname,'run_ci.sh'),'utf8');
test('offline ADB cannot trap the Android runner in cleanup indefinitely',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'df08-offline-cleanup-'));
 try {
  fs.writeFileSync(path.join(dir,'adb'),'#!/bin/sh\nexec sleep 120\n',{mode:0o700});
  const begin=shell.indexOf('cleanup() {'),end=shell.indexOf('\ntrap cleanup EXIT',begin);
  assert.ok(begin>=0&&end>begin);
  const result=cp.spawnSync('bash',['-c',shell.slice(begin,end)+'\ncleanup\nprintf CLEANUP_FINISHED'],{
   env:{...process.env,PATH:dir+path.delimiter+process.env.PATH,out:dir},encoding:'utf8',timeout:45000
  });
  assert.equal(result.error,undefined,'Cleanup must finish before the external watchdog');
  assert.equal(result.status,0);assert.equal(result.stdout,'CLEANUP_FINISHED');
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
