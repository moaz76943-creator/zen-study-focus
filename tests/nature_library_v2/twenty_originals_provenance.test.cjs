'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const manifest=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../tools/nature_audio/commons_intake.json'),'utf8'));

test('20 distinct field recordings have individual identifiers and truthful English/Arabic group labels',()=>{
 assert.equal(manifest.items.length,20,'Must collect 20 source recordings, not 20 empty display slots');
 const ids=new Set(),files=new Set();
 const supported=new Set(['rain_weather','rivers_streams','sea_coast','forest_birds','insects_night','fire']);
 for(const item of manifest.items){
  assert.equal(item.approved_for_runtime,false);
  assert.equal(item.status,'QUARANTINED_NOT_APPROVED');
  assert.equal(item.synthetic,false,'Never package AI-made or generated sounds as field recordings');
  assert.equal(item.contains_music,false,'No music is permitted in this intake');
  assert.ok(supported.has(item.category),'Unknown sound grouping: '+item.category);
  assert.ok(item.name_ar?.trim()&&item.name_en?.trim());
  assert.ok(!ids.has(item.id)&&!files.has(item.file),'Distinct genuine originals, not relabelled copies');
  ids.add(item.id);files.add(item.file);
  assert.match(item.license,/^(?:PD-author|CC0-1\.0)$/);
  assert.equal(item.license_evidence,'https://commons.wikimedia.org/wiki/File:'+item.file.replaceAll(' ','_'));
 }
});

test('all twenty downloaded original files have BOTH published digests pinned before listening preview',()=>{
 const candidates=manifest.items;
 assert.equal(candidates.length,20);
 for(const item of candidates){
  assert.match(item.source_sha1,/^[a-f0-9]{40}$/);
  assert.match(item.source_sha256,/^[a-f0-9]{64}$/);
  assert.equal(item.approved_for_runtime,false);
 }
});

test('20 field recordings are NOT confused with original two production-ready files',()=>{
 assert.equal(manifest.status,'RESEARCH_AND_QUARANTINE_ONLY');
 const catalog=require('../../android/app/src/main/assets/web/nature_library_v2.js');
 assert.equal(catalog.entries.length,20);
 assert.deepEqual(catalog.entries.filter(e=>e.ready).map(e=>e.id).sort(),['forest','wind']);
});
