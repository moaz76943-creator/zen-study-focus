'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
const start=source.indexOf('function applyLanguage(code) {'),end=source.indexOf('\n}',start);
assert.ok(start>=0&&end>start,'Actual applyLanguage function found');
const live=source.slice(start,end+2);
function rig({locale='en',failure='throw'}={}){
 const toast=[],dom=[],cfg={lang:locale};
 const context=vm.createContext({
  cfg,
  LANG_CATALOG:[{code:'en',dir:'ltr',iso:'EN',enName:'English',nativeName:'English'},
                {code:'ar',dir:'rtl',iso:'AR',enName:'Arabic',nativeName:'العربية'},
                {code:'de',dir:'ltr',iso:'DE',enName:'German',nativeName:'Deutsch'}],
  saveFortressData:(key,object)=>{
   assert.equal(key,'zen_fortress_cfg_v21');
   assert.equal(object,cfg);
   if(failure==='throw')throw new Error('QuotaExceededError');
   return failure==='false'?false:true;
  },
  showToast:s=>toast.push(s),
  document:{getElementById:id=>{dom.push(id);throw Error('UI mutated before verified save: '+id);}},
  L:()=>({sub:'Sub',modeFocus:'Focus'}),toWest:x=>x
 });
 vm.runInContext(live,context);
 return {cfg,toast,dom,run:code=>vm.runInContext(code,context)};
}
test('language switch failing from quota restores previous language and does not mutate DOM',()=>{
 const r=rig();
 assert.equal(r.run('applyLanguage("ar")'),false);
 assert.equal(r.cfg.lang,'en');
 assert.deepEqual(r.dom,[]);
 assert.equal(r.toast.length,1);
});
test('silently unacknowledged language save cannot change selected locale',()=>{
 const r=rig({locale:'de',failure:'false'});
 assert.equal(r.run('applyLanguage("ar")'),false);
 assert.equal(r.cfg.lang,'de');
 assert.deepEqual(r.dom,[]);
});
test('Arabic source language gets a useful failure explanation, preserving RTL selection',()=>{
 const r=rig({locale:'ar'});
 assert.equal(r.run('applyLanguage("de")'),false);
 assert.equal(r.cfg.lang,'ar');
 assert.match(r.toast[0],/[\u0600-\u06ff]/);
});
