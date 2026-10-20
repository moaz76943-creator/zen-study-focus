'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const manifest=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../tools/nature_audio/commons_intake.json'),'utf8'));
test('candidate intake covers independently authored ambient recordings, not just the storm reference',()=>{
 assert.equal(manifest.status,'RESEARCH_AND_QUARANTINE_ONLY');
 assert.ok(manifest.items.length>=7,'Need seven or more candidate sources with explicit rights evidence');
 assert.equal(new Set(manifest.items.map(x=>x.file)).size,manifest.items.length);
 assert.equal(new Set(manifest.items.map(x=>x.id)).size,manifest.items.length);
});
test('candidate metadata cannot be used as automatic release approval',()=>{
 const good=/^(?:CC0-1\.0|PD-author)$/;
 for(const item of manifest.items){
  assert.match(item.id,/^[a-z][a-z0-9_]*$/);
  assert.match(item.file,/^[A-Za-z0-9][A-Za-z0-9 _()'-]*\.ogg$/);
  assert.ok(item.author && typeof item.author==='string');
  assert.match(item.license,good);
  assert.equal(item.approved_for_runtime,false);
  assert.equal(item.status,'QUARANTINED_NOT_APPROVED');
  assert.equal(item.license_evidence,'https://commons.wikimedia.org/wiki/File:'+item.file.replaceAll(' ','_'));
  assert.ok(item.source_sha1===null || /^[a-f0-9]{40}$/.test(item.source_sha1));
 }
});
