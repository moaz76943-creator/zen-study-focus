'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'live_android_cdp.cjs'),'utf8');
function harness(dir) {
 const cases=[],logs=[],options=[],ctx={serial:'emulator-5554',cases,seq:0,ws:null,file:null,
  // Production runner initializes this selector in main(); the isolated
  // classification harness must supply the same executed-case contract.
  qa:{level:'full',deferred:[],async run(name,fn){return {executed:true,value:await fn()};},verify(){}},
  process:{env:{},exitCode:0},console:{log:s=>logs.push(s)},
  record:(name,status,detail)=>cases.push({name,status,detail}),
  cp:{execFileSync:(cmd,args,opts)=>{
   options.push(opts);
   return cp.execFileSync(path.join(dir,cmd),args,{...opts,timeout:40});
  }}};
 vm.createContext(ctx);
 vm.runInContext(source.slice(source.indexOf('const adb='),source.indexOf('const cases='))+'\nglobalThis.runAdb=adb;\n'+
  source.slice(source.indexOf('async function test('),source.indexOf('async function main(')),ctx);
 const finish=()=>vm.runInContext(source.slice(source.indexOf(' const out={headSha:'),source.lastIndexOf('\n});')),ctx);
 return {ctx,cases,logs,options,finish};
}
for(const kind of ['offline','timeout'])test(kind+' ADB error remains sanitized NOT_TESTED and strictly nonzero',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'df05-adb-classification-'));
 try {
  const secret='sensitive-app-content-should-not-leak';
  fs.writeFileSync(path.join(dir,'adb'),'#!/bin/sh\nprintf '+secret+' >&2\n'+(kind==='offline'?'printf "device offline" >&2\nexit 1\n':'exec sleep 120\n'),{mode:0o700});
  const h=harness(dir);
  await h.ctx.test('physical-command',async()=>h.ctx.runAdb('shell','input','tap','10','20'));
  assert.equal(h.options[0].timeout,25000,'Production command keeps its configured bound');
  assert.deepEqual(Array.from(h.options[0].stdio),['ignore','pipe','pipe'],'Do not print raw ADB stderr');
  assert.equal(h.cases[0].status,'NOT_TESTED');
  assert.match(h.cases[0].detail,/^TRANSPORT: ADB/);
  assert.ok(!JSON.stringify(h.cases).includes(secret));
  assert.ok(!JSON.stringify(h.cases).includes(dir));
  h.finish();assert.equal(h.ctx.process.exitCode,2,'Unexecuted app case cannot produce successful exit');
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
test('real app assertion remains FAIL and exit one',async()=>{
 const h=harness(os.tmpdir());
 await h.ctx.test('app-state',async()=>assert.equal('actual','expected'));
 assert.equal(h.cases[0].status,'FAIL');h.finish();assert.equal(h.ctx.process.exitCode,1);
});
