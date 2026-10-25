'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const canonical=read('assets/i18n/df99_reviewed_packs.json');
const folder='assets/i18n/contributions/central_asia';
const target=['tr','az','uz','kk','ka','hy','ky','tg','tk'];
const newLanguages=target.filter(lang=>lang!=='tr');
const expected=Object.fromEntries(Object.entries(canonical.tr).map(([family,entries])=>[family,Object.keys(entries)]));
const families=Object.keys(expected);
const packs=Object.fromEntries(newLanguages.map(code=>[code,read(folder+'/'+code+'.json')]));
const dangerous=/[\u0660-\u0669\u06f0-\u06f9\u0966-\u096f\u09e6-\u09ef]/u;
const unsafe=/<|>|&(?:#\d+|#x[\da-f]+|[a-z]+);/i;
const placeholders=s=>(s.match(/\{\{[A-Za-z_][\w]*\}\}|\$\{[A-Za-z_][\w]*\}|\{[A-Za-z_][\w]*\}|%(?:[1-9]\d*\$)?[sdif]/g)||[]).sort();

test('lane 21 owns exactly eight new contributions; Turkish canonical is preserved',()=>{
 assert.equal(new Set(target).size,9);
 assert.deepEqual(fs.readdirSync(path.join(root,folder)).sort(),newLanguages.map(code=>code+'.json').sort());
 assert.ok(families.length===6);
 for(const family of families)assert.deepEqual(Object.keys(canonical.tr[family]),expected[family]);
});
test('canonical coverage plus additions reaches all 147 keys for each of 9 locales',()=>{
 let introduced=0;
 for(const code of target){
  const pack=packs[code];
  if(pack){assert.equal(pack.language,code);assert.equal(pack.status,'TRANSLATED');}
  for(const family of families){
   const older=canonical[code]?.[family]||{};
   const added=pack?.sections?.[family]||{};
   for(const [key,value] of Object.entries(added)){
    assert.ok(expected[family].includes(key),code+'/'+family+'/'+key+' unknown');
    assert.equal(typeof value,'string');
    assert.ok(value.trim());
    if(Object.hasOwn(older,key))assert.equal(older[key],value,'existing translation changed');
   }
   const available=new Set([...Object.keys(older),...Object.keys(added)]);
   assert.deepEqual([...available].sort(),expected[family].slice().sort(),code+'/'+family+' incomplete');
   introduced+=Object.keys(added).filter(key=>!Object.hasOwn(older,key)).length;
  }
 }
 assert.equal(introduced,1104);
});
test('translations use canonical variable signatures and safe UI text',()=>{
 const signatures=Object.fromEntries(families.map(f=>[f,Object.fromEntries(Object.entries(canonical.tr[f]).map(([key,text])=>[key,placeholders(text)]))]));
 for(const [lang,pack] of Object.entries(packs)){
  for(const [family,strings] of Object.entries(pack.sections)){
   for(const [key,value] of Object.entries(strings)){
    const id=lang+'/'+family+'/'+key;
    assert.equal(value,value.normalize('NFC'),id+' must be NFC');
    assert.doesNotMatch(value,dangerous,id+' nonwestern numeral');
    assert.doesNotMatch(value,unsafe,id+' unsafe markup');
    assert.doesNotMatch(value,/[\ufffd\uD800-\uDFFF]/u,id+' replacement or surrogate');
    assert.deepEqual(placeholders(value),signatures[family][key],id+' placeholder mismatch');
    assert.ok(value.length<=1000,id+' too long');
   }
  }
 }
});
test('script choice is consistent with regional writing systems',()=>{
 for(const code of ['az','uz','tk']){
  const vals=Object.values(packs[code].sections).flatMap(Object.values);
  assert.ok(vals.length>100);
  for(const value of vals)assert.doesNotMatch(value,/[\u0400-\u052f\u0530-\u058f\u10a0-\u10ff]/u,code+' unexpected script');
 }
 for(const code of ['kk','ky','tg']){
  const vals=Object.values((packs[code]?.sections)||canonical[code]).flatMap(Object.values);
  assert.ok(vals.some(v=>/[\u0400-\u052f]/u.test(v)),code+' missing Cyrillic');
  for(const value of vals)assert.doesNotMatch(value,/[\u0530-\u058f\u10a0-\u10ff]/u,code+' unexpected script');
 }
 for(const [code,script] of [['ka',/[\u10d0-\u10ff]/u],['hy',/[\u0531-\u058f]/u]]){
  const vals=Object.values(packs[code].sections).flatMap(Object.values);
  assert.ok(vals.every(v=>script.test(v)),code+' non-native UI label');
  for(const v of vals)assert.doesNotMatch(v,/[\u0400-\u052f]/u,code+' unexpected Cyrillic');
 }
});
test('critical saves, failures, export, notes and timer messages are translated',()=>{
 for(const code of target){
  const lookup=(f,k)=>packs[code]?.sections?.[f]?.[k]??canonical[code]?.[f]?.[k];
  for(const [f,k] of [['timer','10'],['tasks','invalid'],['tasks','notConnected'],['analytics','export'],['notes','34'],['notes','35'],['goals','save']]){
    assert.ok(lookup(f,k)?.trim(),code+'/'+f+'/'+k+' missing');
  }
 }
});
test('absence of runtime modification preserves existing fallback and v21 user storage',()=>{
 assert.equal(canonical.tr.timer['8'],'Kaydet');
 assert.equal(canonical.uz.notes['35'],'Saqlandi');
 assert.equal(canonical.kk.notes['35'],'Сақталды');
 assert.equal(canonical.he,undefined);
 assert.equal(canonical.iw,undefined);
});
