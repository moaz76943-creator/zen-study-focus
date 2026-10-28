'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
test('standalone CSV Android runner refuses physical devices before install or network changes',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'df-csv-disposable-'));
 try{
  const ledger=path.join(dir,'commands');
  fs.writeFileSync(path.join(dir,'adb'),'#!/bin/sh\nprintf "%s\\n" "$*" >> "$DF_CSV_GUARD_LEDGER"\nif [ "$*" = "shell getprop ro.kernel.qemu" ]; then echo 0; fi\n',{mode:0o700});
  const result=cp.spawnSync('bash',[path.join(__dirname,'run_android.sh')],{encoding:'utf8',timeout:10000,
   env:{...process.env,PATH:dir+path.delimiter+process.env.PATH,DF09_NATIVE_EVIDENCE:dir,DF_CSV_GUARD_LEDGER:ledger}});
  assert.equal(result.status,2,result.stderr);
  assert.deepEqual(fs.readFileSync(ledger,'utf8').trim().split('\n'),['shell getprop ro.kernel.qemu']);
  assert.match(result.stderr,/DISPOSABLE_EMULATOR_REQUIRED/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
