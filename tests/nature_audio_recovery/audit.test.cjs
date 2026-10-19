const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const {sniff,auditCatalog}=require('./audit_media.cjs');
const S='a'.repeat(64);
const root=()=>fs.mkdtempSync(path.join(os.tmpdir(),'df-audio-audit-'));
const asset=(over={})=>({id:'rain',src:'nature_audio/rain.ogg',verified:true,packaged:true,recording:true,author:'Recorder',source_page:'https://example.org/rec',license_url:'https://creativecommons.org/publicdomain/zero/1.0/',original_sha256:S,converted_sha256:S,...over});
function write(dir,content) {const file=path.join(dir,'android/app/src/main/assets/web/nature_audio/rain.ogg');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);return file;}
test('distinguishes Ogg header from HTML, XML, JSON, junk and zero bytes',()=>{
  assert.equal(sniff(Buffer.from('OggS'+'.'.repeat(100))),'OGG');
  for (const sample of ['<!DOCTYPE html>404','<html>bad', '<?xml version="1.0"?>','{"error":"not found"}','MP3!']) assert.notEqual(sniff(Buffer.from(sample)),'OGG');
  assert.equal(sniff(Buffer.alloc(0)),'EMPTY');
});
test('corrupt disguised files are blocked despite a claimed license',()=>{
  const dir=root();write(dir,Buffer.from('<html>Not found</html>'));
  const r=auditCatalog(dir,{assets:[asset()]},false);
  assert.equal(r.ok,false);assert.ok(r.results[0].problems.includes('HTML_OR_ERROR'));
  fs.rmSync(dir,{recursive:true,force:true});
});
test('requires original & converted hashes, attribution for CC BY, and unique IDs',()=>{
  const dir=root();write(dir,Buffer.from('OggS'+'.'.repeat(200)));
  const r=auditCatalog(dir,{assets:[asset({original_sha256:null,license_url:'https://creativecommons.org/licenses/by/4.0/'}),asset()]},false);
  assert.equal(r.ok,false);assert.ok(r.results[0].problems.includes('MISSING_ORIGINAL_SHA256'));
  assert.ok(r.results[0].problems.includes('CC_BY_ATTRIBUTION_MISSING'));
  assert.ok(r.results[1].problems.includes('DUPLICATE_ID'));
  fs.rmSync(dir,{recursive:true,force:true});
});
test('SHA256 mismatch blocks activation, missing files never become silent synth',()=>{
  const dir=root(); const b=Buffer.from('OggS'+'.'.repeat(100));write(dir,b);
  const bad=auditCatalog(dir,{assets:[asset()]},false);
  assert.ok(bad.results[0].problems.includes('SHA256_MISMATCH'));
  const good=auditCatalog(dir,{assets:[asset({converted_sha256:crypto.createHash('sha256').update(b).digest('hex')})]},false);
  assert.equal(good.ok,true); // desktop structural gate only; never Android approval
  fs.rmSync(dir,{recursive:true,force:true});
});
