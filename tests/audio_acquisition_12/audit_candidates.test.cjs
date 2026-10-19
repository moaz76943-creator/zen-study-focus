'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {sniff,provenance,audit,calculate}=require('./audit_candidates.cjs');
const root=path.resolve(__dirname,'../../audio_candidates/recovery12');
const m=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
test('nine isolated field-derived binary candidates, never Android runtime assets',()=>{
 assert.equal(m.files.length,9);
 assert.equal(new Set(m.files.map(x=>x.id)).size,9);
 for(const a of m.files) {
  assert.equal(a.approved_for_runtime,false);
  assert.equal(a.original_sha256,null);
  assert.equal(a.android_decode,'NOT_TESTED');
  assert.equal(a.human_listening,'NOT_TESTED');
  assert.match(a.filename,/^[a-z0-9_]+\.ogg$/);
 }
});
test('reject HTML, API errors, junk and empty Ogg impostors',()=>{
 for(const c of ['<html>not found</html>','<!DOCTYPE html>blocked','<?xml error','{"error":"denied"}','','RIFF'])
  assert.notEqual(sniff(Buffer.from(c)),'OGG');
 assert.equal(sniff(Buffer.concat([Buffer.from('OggS'),Buffer.alloc(50)])),'OGG');
});
test('no synthetic or missing provenance claim is approved as a field original',()=>{
 const unverified=m.files.find(x=>!x.independently_verified_original_page);
 assert.ok(unverified);
 assert.ok(provenance(unverified).includes('LICENSE_PAGE_UNVERIFIED'));
 const confirmed=m.files.find(x=>x.independently_verified_original_page);
 assert.ok(confirmed);
 assert.ok(!provenance(confirmed).includes('LICENSE_PAGE_UNVERIFIED'));
 assert.ok(provenance(confirmed).includes('ORIGINAL_SHA256_UNKNOWN'));
});
test('desktop evidence is not permission to activate audio',()=>{
 const r=audit({decode:false});
 assert.equal(r.integrity_ok,true);
 assert.equal(r.release_ok,false);
});
test('all nine physical bytes match exact SHA256 and Ogg header',()=>{
 for(const a of m.files){
  const b=fs.readFileSync(path.join(root,a.filename));
  assert.equal(sniff(b),'OGG',a.id);
  assert.ok(b.length>4096,a.id);
  assert.equal(crypto.createHash('sha256').update(b).digest('hex'),a.sha256,a.id);
 }
});
test('wrong original hash and forced approval are rejected',()=>{
 const f={...m.files[0],original_sha256:'fake',approved_for_runtime:true};
 assert.ok(provenance(f).includes('ORIGINAL_SHA256_UNKNOWN'));
 assert.ok(provenance(f).includes('UNAUTHORIZED_APPROVAL'));
});
test('PCM analysis returns invalid for truncated or NaN input',()=>{
 assert.equal(calculate(Buffer.alloc(3)),null);
 const b=Buffer.alloc(16000); b.writeFloatLE(NaN,0);
 assert.equal(calculate(b),null);
});