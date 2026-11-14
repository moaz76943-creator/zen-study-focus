'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('android/app/src/main/assets/web/app.js','utf8');
const begin=app.indexOf('function applyLanguage(code)');
const end=app.indexOf('/* ========================================================',begin);
const catalog=app.slice(app.indexOf('const LANG_CATALOG = ['),app.indexOf('const DICT = {'));
// applyLanguage() relies on shared helpers that live outside the sliced region. Take the REAL implementations
// from app.js (not stubs) so the accessible-name behaviour under test is the shipped one.
function topLevel(startMarker){
 const i=app.indexOf(startMarker);if(i<0)throw new Error('missing '+startMarker);
 let depth=0,j=app.indexOf('{',i),k=j;
 for(;k<app.length;k++){if(app[k]==='{')depth++;else if(app[k]==='}'&&--depth===0)break;}
 return app.slice(i,k+1);
}
const helpers=[
 app.slice(app.indexOf('const DF_EXCLUDED_LOCALE_CODES'),app.indexOf(']);',app.indexOf('const DF_EXCLUDED_LOCALE_CODES'))+3),
 app.slice(app.indexOf('const DF_RTL_BASE_CODES'),app.indexOf(']);',app.indexOf('const DF_RTL_BASE_CODES'))+3),
 app.slice(app.indexOf('const ARABIC_ZERO_OFFSET'),app.indexOf(']);',app.indexOf('const WESTERN_DIGIT_ZERO_POINTS'))+3),
 app.slice(app.indexOf('const DF_EXCLUDED_SCRIPT_RE'),app.indexOf('\n',app.indexOf('const DF_EXCLUDED_SCRIPT_RE'))),
 topLevel('function toWest('),topLevel('function dfIsExcludedLocale('),topLevel('function dfIsRtlLocale('),
 'function dfGetLocalizedText(k,l,fb){return fb;}', // dictionary lookup is not under test here
 'function dfSyncInfiniteLocaleRegistry(){}' // registry sync needs the full DOM-backed locale loader; irrelevant to the accessible name
].join('\n');
function fixture(save=()=>true){
 const button={attributes:{},setAttribute(k,v){this.attributes[k]=v;}};
 const nodes=new Map();
 const get=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',attributes:{},setAttribute(k,v){this.attributes[k]=v;}});return nodes.get(id);};
 get('currentLangLabel').parentElement=button;
 const context={cfg:{lang:'en'},document:{getElementById:get,querySelectorAll:()=>[]},window:{},
  saveFortressData:save,L:()=>({sub:'Localized subtitle'}),localizeStarterPreviews(){},
  renderAnalyticsBars(){},syncHeaderMetrics(){},updateTimerDisplay(){},renderTasksList(){},renderCalendar(){},
  renderNotesStack(){},renderSoundsStudio(){},updateSyllabusCalc(){},closeModal(){},quickL10n(){}};
 vm.createContext(context);vm.runInContext(helpers+'\n'+catalog+'\n'+app.slice(begin,end),context);
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
