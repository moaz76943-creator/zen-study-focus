'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const cp=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const helper=()=>require('./private_evidence.cjs');
function fixture(fn){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'df-evidence-test-'));
 try{return fn(dir);}finally{fs.rmSync(dir,{recursive:true,force:true});}
}

test('actual SAF runner refuses a symlink report without overwriting its target',()=>fixture(dir=>{
 const evidence=path.join(dir,'evidence');fs.mkdirSync(evidence,{mode:0o700});
 const victim=path.join(dir,'victim.txt');fs.writeFileSync(victim,'synthetic-victim');
 fs.symlinkSync(victim,path.join(evidence,'native-analytics-saf-results.json'));
 const bin=path.join(dir,'bin');fs.mkdirSync(bin);
 fs.writeFileSync(path.join(bin,'adb'),'#!/bin/sh\nexit 1\n',{mode:0o700});
 const result=cp.spawnSync(process.execPath,[path.join(root,'tests/analytics_csv/real_android_saf.cjs'),evidence],{
  cwd:root,env:{...process.env,PATH:bin+path.delimiter+process.env.PATH},encoding:'utf8',timeout:10000});
 assert.equal(result.status,1);
 assert.match(result.stderr,/Unsafe evidence output/);
 assert.equal(fs.readFileSync(victim,'utf8'),'synthetic-victim');
}));

test('defaults create distinct private directories; explicit artifact paths remain unchanged',()=>fixture(dir=>{
 const {createEvidenceDirectory}=helper();
 const first=createEvidenceDirectory(),second=createEvidenceDirectory();
 try{
  assert.notEqual(first.path,second.path);
  assert.equal(fs.statSync(first.path).mode&0o777,0o700);
  const requested=path.join(dir,'nested','artifacts');
  const explicit=createEvidenceDirectory(requested);
  try{assert.equal(explicit.path,requested);explicit.write('report.json','first');explicit.write('report.json','second');
   assert.equal(fs.readFileSync(path.join(requested,'report.json'),'utf8'),'second');
   assert.equal(fs.statSync(path.join(requested,'report.json')).mode&0o777,0o600);
  }finally{explicit.close();}
 }finally{first.close();second.close();fs.rmSync(first.path,{recursive:true});fs.rmSync(second.path,{recursive:true});}
}));

test('untrusted directories, symlink ancestors and path traversal fail closed',()=>fixture(dir=>{
 const {createEvidenceDirectory}=helper();
 const writable=path.join(dir,'writable');fs.mkdirSync(writable);fs.chmodSync(writable,0o777);
 assert.throws(()=>createEvidenceDirectory(writable),/evidence/i);
 fs.symlinkSync(dir,path.join(dir,'link'));
 assert.throws(()=>createEvidenceDirectory(path.join(dir,'link','child')),/evidence/i);
 const store=createEvidenceDirectory(path.join(dir,'safe'));
 try{for(const name of ['../victim','nested/report','..','x\\y'])assert.throws(()=>store.write(name,'x'),/evidence/i);}
 finally{store.close();}
}));

test('atomic replacement preserves hardlink targets and rejects output symlinks',()=>fixture(dir=>{
 const store=helper().createEvidenceDirectory(path.join(dir,'safe'));
 const victim=path.join(dir,'victim');fs.writeFileSync(victim,'original');
 try{
  fs.linkSync(victim,path.join(store.path,'hardlink'));
  store.write('hardlink','replacement');
  assert.equal(fs.readFileSync(victim,'utf8'),'original');
  fs.symlinkSync(victim,path.join(store.path,'symlink'));
  assert.throws(()=>store.write('symlink','replacement'),/evidence/i);
  assert.equal(fs.readFileSync(victim,'utf8'),'original');
  assert.deepEqual(fs.readdirSync(store.path).sort(),['hardlink','symlink']);
 }finally{store.close();}
}));

test('directory substitution is rejected before writing',()=>fixture(dir=>{
 const store=helper().createEvidenceDirectory(path.join(dir,'safe'));
 fs.renameSync(store.path,path.join(dir,'moved'));fs.symlinkSync(dir,store.path);
 try{assert.throws(()=>store.write('victim','bad'),/evidence/i);assert.equal(fs.existsSync(path.join(dir,'victim')),false);}
 finally{store.close();}
}));

test('interrupted publication preserves the prior artifact and removes temporary bytes',()=>fixture(dir=>{
 const store=helper().createEvidenceDirectory(path.join(dir,'safe'));
 store.write('report','original');
 const sync=fs.fsyncSync;fs.fsyncSync=()=>{throw Error('synthetic I/O refusal');};
 try{assert.throws(()=>store.write('report','partial'),/synthetic I\/O refusal/);
  assert.equal(fs.readFileSync(path.join(store.path,'report'),'utf8'),'original');
  assert.deepEqual(fs.readdirSync(store.path),['report']);
 }finally{fs.fsyncSync=sync;store.close();}
}));

test('a directory swap during atomic rename cannot redirect writes through a symlink',()=>fixture(dir=>{
 const store=helper().createEvidenceDirectory(path.join(dir,'safe'));
 const attacker=path.join(dir,'attacker');fs.mkdirSync(attacker);
 fs.writeFileSync(path.join(attacker,'report'),'victim');
 const rename=fs.renameSync;
 fs.renameSync=(from,to)=>{
  rename(store.path,path.join(dir,'moved'));fs.symlinkSync(attacker,store.path);
  return rename(from,to);
 };
 try{store.write('report','safe-result');assert.equal(fs.readFileSync(path.join(attacker,'report'),'utf8'),'victim');
  assert.equal(fs.readFileSync(path.join(dir,'moved','report'),'utf8'),'safe-result');
 }finally{fs.renameSync=rename;store.close();}
}));

test('explicit single-file report paths preserve CI destinations',()=>fixture(dir=>{
 const requested=path.join(dir,'locales.json');
 const report=helper().createEvidenceReport(requested,'default.json');
 try{report.write('synthetic');assert.equal(fs.readFileSync(requested,'utf8'),'synthetic');}
 finally{report.close();}
}));

test('descriptor-only writes handle short writes without truncating UTF-8 or binary evidence',()=>fixture(dir=>{
 const store=helper().createEvidenceDirectory(path.join(dir,'safe'));
 const original=fs.writeSync;let calls=0;
 fs.writeSync=(fd,buffer,offset,length,position)=>{
  assert.equal(typeof fd,'number');calls++;
  return original(fd,buffer,offset,Math.min(length,3),position);
 };
 try{
  store.write('arabic.txt','نص محفوظ');
  store.write('image.bin',Buffer.from([0,255,128,1,2,3,4]));
 }finally{fs.writeSync=original;store.close();}
 assert.ok(calls>2,'Must exercise the descriptor-only short-write loop');
 assert.equal(fs.readFileSync(path.join(dir,'safe','arabic.txt'),'utf8'),'نص محفوظ');
 assert.deepEqual(fs.readFileSync(path.join(dir,'safe','image.bin')),Buffer.from([0,255,128,1,2,3,4]));
}));

test('a stalled descriptor write refuses publication and preserves the prior artifact',()=>fixture(dir=>{
 const store=helper().createEvidenceDirectory(path.join(dir,'safe'));
 store.write('report','original');
 const original=fs.writeSync;fs.writeSync=()=>0;
 try{assert.throws(()=>store.write('report','partial'),/Evidence write stalled/);}
 finally{fs.writeSync=original;store.close();}
 assert.equal(fs.readFileSync(path.join(dir,'safe','report'),'utf8'),'original');
 assert.deepEqual(fs.readdirSync(path.join(dir,'safe')),['report']);
}));
