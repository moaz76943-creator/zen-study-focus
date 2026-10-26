'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/notes_drafts.js'),'utf8');
const languages=['en','ar','es','zh','hi','fr','de','ru','pt','ja','id','tr','ko','vi','it','bn','ur','fa','pl','nl'];
const keys=['saved','ready','restore','discard','tooLong','restored','cleared','other','conflict','failed','unsaved'];
function fixture(){
 const c={cfg:{lang:'en'},Date,Number,JSON,localDateISO:()=> '2026-10-26',
   document:{getElementById:()=>null,addEventListener(){}},
   window:{addEventListener(){}},setTimeout(){},clearTimeout(){}};
 vm.createContext(c);vm.runInContext(src,c,{timeout:1000});
 return {run:q=>vm.runInContext(q,c,{timeout:1000}),cfg:c.cfg};
}
test('parallel05: reviewed twenty draft-safety locales include all eleven risk messages',()=>{
 const x=fixture();
 const present=x.run('Object.keys(NS_DRAFT_LANG)');
 assert.deepEqual([...present].sort(),[...languages].sort());
 for(const lang of languages){
  const found=x.run('Object.keys(NS_DRAFT_LANG['+JSON.stringify(lang)+'])');
  for(const key of keys)assert.ok(found.includes(key),lang+': missing '+key);
 }
 assert.ok(!present.includes('he')&&!present.includes('iw'));
});
test('parallel05: selected language drives conflict and failed-backup labels without silent English fallback',()=>{
 const x=fixture(),en=x.run('nsDraftLabel("conflict")'),failure=x.run('nsDraftLabel("failed")');
 assert.ok(failure&&failure!=='failed','English failure label required');
 for(const lang of languages.filter(code=>code!=='en')){
  x.cfg.lang=lang;
  assert.notEqual(x.run('nsDraftLabel("conflict")'),en,lang+' conflict fallback');
  assert.notEqual(x.run('nsDraftLabel("failed")'),failure,lang+' save failure fallback');
 }
 x.cfg.lang='de-DE';
 assert.equal(x.run('nsDraftLabel("conflict")'),x.run('NS_DRAFT_LANG.de.conflict'));
});
