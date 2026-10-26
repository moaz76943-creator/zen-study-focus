'use strict';
// DF-FINAL-05 historical #90 selective port: pure catalog only, no app activation.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const lib=require(path.resolve(__dirname,'../../android/app/src/main/assets/web/nature_library_v2.js'));
const locales=['en','ar','es','zh','hi','fr','de','ru','pt','ja','id','tr','ko','vi','it','bn','ur','fa','pl','nl'];

test('20 catalog slots have unique IDs, only existing forest/wind marked ready',()=>{
 assert.equal(lib.entries.length,20);
 assert.equal(new Set(lib.entries.map(e=>e.id)).size,20);
 assert.deepEqual(lib.entries.filter(e=>e.ready).map(e=>e.id).sort(),['forest','wind']);
 assert.ok(lib.entries.every(e=>e.synthetic===false && (!e.src || /^sounds\/[a-z0-9_-]+\.ogg$/.test(e.src))));
 for(const e of lib.entries.filter(e=>!e.ready))assert.equal(e.src,null,'Unapproved clip may not specify a playable path: '+e.id);
});

test('unverified entries stay unplayable even with their ID in approved set',()=>{
 const all=new Set(lib.entries.map(e=>e.id));
 assert.deepEqual([...lib.availableIds(all)].sort(),['forest','wind']);
 assert.equal(lib.availableIds(new Set()).size,0);
 assert.equal(lib.listFor('all',new Set()).filter(e=>e.available).length,0);
 assert.equal(lib.listFor('water',all).filter(e=>e.available).length,0);
});

test('20 locale feedback messages exist without Hebrew or silent English fallback',()=>{
 assert.deepEqual(Object.keys(lib.messages).sort(),[...locales].sort());
 for(const locale of locales){
  for(const key of ['heading','pending','ready','of','play','stop','blocked','unavailable'])
   assert.ok(typeof lib.messages[locale][key]==='string'&&lib.messages[locale][key].trim(),locale+':'+key);
  if(locale!=='en')assert.notEqual(lib.messages[locale].blocked,lib.messages.en.blocked,locale);
 }
});

test('render is inert without a host element and uses western count and inert labels with a host',()=>{
 const original=global.document;
 const nodes=[];
 function node(tag){
  return {tagName:tag,children:[],className:'',textContent:'',dir:'',attributes:{},
   append(...els){this.children.push(...els)},replaceChildren(...els){this.children=[...els]},
   setAttribute(name,value){this.attributes[name]=value}};
 }
 const host=node('div');
 global.document={getElementById:id=>id==='natureLibraryV2'?host:null,
  createElement:tag=>{const out=node(tag);nodes.push(out);return out}};
 try{
  const hostile='<img src=x onerror=alert(1)>';
  lib.render('all','ar',{forest:hostile},new Set(['forest','wind']));
  assert.equal(host.children.length,3);
  assert.equal(host.children[1].tagName,'bdi');
  assert.equal(host.children[1].dir,'ltr');
  assert.equal(host.children[1].textContent,'2 / 20');
  const rows=host.children[2].children;
  assert.equal(rows.length,20);
  const forest=rows.find(x=>x.children[0].textContent===hostile);
  assert.ok(forest);
  assert.equal(forest.children[0].tagName,'span');
  assert.equal(forest.children[0].textContent,hostile);
  lib.render('all','ar',{},new Set());
  assert.equal(host.children[1].textContent,'0 / 20');
  assert.ok(host.children[2].children.every(x=>x.className.includes('is-pending')));
  global.document={getElementById:()=>null,createElement:()=>{throw Error('inert render should not build DOM without host')}};
  assert.doesNotThrow(()=>lib.render('all','en',{},new Set()));
 }finally{if(original===undefined)delete global.document;else global.document=original}
});

test('regional locale codes keep nature-library translations and RTL content',()=>{
 const previous=global.document;
 const make=tag=>({
  tagName:tag,children:[],className:'',textContent:'',dir:'',attributes:{},
  append(...xs){this.children.push(...xs)},
  replaceChildren(...xs){this.children=[...xs]},
  setAttribute(key,value){this.attributes[key]=value}
 });
 const host=make('div');
 global.document={getElementById:id=>id==='natureLibraryV2'?host:null,createElement:make};
 try {
  lib.render('all','ar-JO',{},new Set());
  assert.equal(host.children[0].textContent,lib.messages.ar.heading,
   'Arabic regional language must not silently fall back to English');
  assert.equal(host.children[2].children[0].children[1].textContent,lib.messages.ar.pending);
  lib.render('all','de_DE',{},new Set());
  assert.equal(host.children[0].textContent,lib.messages.de.heading);
  lib.render('all','__proto__',{},new Set());
  assert.equal(host.children[0].textContent,lib.messages.en.heading,
   'unknown/prototype keys must not be mistaken for translations');
 } finally {if(previous===undefined)delete global.document;else global.document=previous;}
});
