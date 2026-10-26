'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('android/app/src/main/assets/web/app.js','utf8');
const begin=app.indexOf('function applyLanguage(code)');
const end=app.indexOf('/* ========================================================',begin);
const catalog=app.slice(app.indexOf('const LANG_CATALOG = ['),app.indexOf('const DICT = {'));
function fixture(save=()=>true){
 const button={attributes:{},setAttribute(k,v){this.attributes[k]=v;}};
 const nodes=new Map();
 const get=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',attributes:{},setAttribute(k,v){this.attributes[k]=v;}});return nodes.get(id);};
 get('currentLangLabel').parentElement=button;
 const context={cfg:{lang:'en'},document:{getElementById:get,querySelectorAll:()=>[]},window:{},
  saveFortressData:save,L:()=>({sub:'Localized subtitle'}),localizeStarterPreviews(){},
  renderAnalyticsBars(){},syncHeaderMetrics(){},updateTimerDisplay(){},renderTasksList(){},renderCalendar(){},
  renderNotesStack(){},renderSoundsStudio(){},updateSyllabusCalc(){},closeModal(){},quickL10n(){}};
 vm.createContext(context);vm.runInContext(catalog+'\n'+app.slice(begin,end),context);
 return {context,button,get,apply:code=>vm.runInContext('applyLanguage('+JSON.stringify(code)+')',context)};
}
test('language switch updates the actual button accessible name along with the visible label',()=>{
 const f=fixture();
 for(const [code,expected] of [['ar','AR Arabic • العربية'],['de','DE German • Deutsch'],['en','EN English • English']]){
  f.apply(code);
  assert.equal(f.button.attributes['aria-label'],expected);
  assert.equal(f.get('currentLangIso').textContent,expected.split(' ')[0]);
  assert.equal(f.context.cfg.lang,code);
 }
});
test('failed existing persistence leaves the accessible locale unchanged',()=>{
 const f=fixture();f.apply('en');
 const before={...f.button.attributes};
 f.context.saveFortressData=()=>{throw Error('durable save rejected');};
 assert.throws(()=>f.apply('ar'),/durable save rejected/);
 assert.deepEqual(f.button.attributes,before);
 assert.equal(f.context.cfg.lang,'en');
});
