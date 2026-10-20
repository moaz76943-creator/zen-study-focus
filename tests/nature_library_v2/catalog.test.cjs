'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const lib=require('../../android/app/src/main/assets/web/nature_library_v2.js');
const supported=['en','ar','es','zh','hi','fr','de','ru','pt','ja','id','tr','ko','vi','it','bn','ur','fa','pl','nl'];
test('20 unique genuine-nature acquisition lanes, no synthetic or network playback',()=>{
 assert.equal(lib.entries.length,20);
 assert.equal(new Set(lib.entries.map(e=>e.id)).size,20);
 assert.deepEqual(new Set(lib.entries.map(e=>e.category)),new Set(['water','forest','warm']));
 for(const e of lib.entries){
  assert.match(e.id,/^[a-z][a-z_]+$/);
  assert.equal(e.ready,e.id==='forest'||e.id==='wind');
  assert.equal(e.synthetic,false);
  assert.ok(!e.src || /^sounds\/[a-z0-9_-]+\.ogg$/.test(e.src));
  assert.ok(!e.sourceUrl || e.sourceUrl.startsWith('https://'));
 }
});
test('unverified recordings are never available merely because metadata or a URL exists',()=>{
 const everything=new Set(lib.entries.map(e=>e.id));
 const available=lib.availableIds(everything);
 assert.deepEqual([...available].sort(),['forest','wind']);
 assert.deepEqual(lib.listFor('water',everything).filter(e=>e.available),[]);
});
test('all 20 user-interface languages have honest availability labels',()=>{
 for(const lang of supported){
  assert.ok(lib.messages[lang]?.heading?.trim(),lang);
  assert.ok(lib.messages[lang]?.pending?.trim(),lang);
  assert.ok(lib.messages[lang]?.ready?.trim(),lang);
  assert.ok(lib.messages[lang]?.of?.trim(),lang);
 }
});
test('a blocked sound has no play action in the standalone library, and categorization is stable',()=>{
 const available=lib.availableIds(new Set(['forest','wind']));
 const rows=lib.listFor('all',available);
 assert.equal(rows.length,20);
 assert.equal(rows.filter(r=>r.available).length,2);
 assert.equal(lib.listFor('forest',available).filter(r=>r.available).length,2);
 assert.ok(lib.listFor('water',available).every(r=>!r.available));
});
