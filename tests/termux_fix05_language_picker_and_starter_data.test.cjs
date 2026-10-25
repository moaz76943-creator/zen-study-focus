'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const app = fs.readFileSync(path.resolve(__dirname,'../android/app/src/main/assets/web/app.js'),'utf8');
const begin=app.indexOf('function renderLanguageList() {');
const end=app.indexOf('/* ========================================================\n   3. CLOUD BACKUP', begin);
assert.ok(begin>0 && end>begin,'language UI function signatures changed');
const source=app.slice(begin,end);

function fakeElement(tag='div') {
  const element={tagName:tag.toUpperCase(),children:[],attrs:{},textContent:'',value:'',type:'',className:'',style:{},
    appendChild(child){this.children.push(child);return child;},
    replaceChildren(...children){this.children=[...children];},
    setAttribute(name,value){this.attrs[name]=String(value);},
    getAttribute(name){return this.attrs[name]??null;},
    classList:{add(){},remove(){}}};
  Object.defineProperty(element,'innerHTML',{
    set(value){ if(value !== '') throw new Error('unsafe innerHTML injection'); this.children=[]; },
    get(){return ''}
  });
  return element;
}
function setup() {
  const nodes=new Map();
  const box=fakeElement('div');
  nodes.set('langListScrollBox',box);
  const search=fakeElement('input');search.value='';nodes.set('inpLangCountrySearch',search);
  const doc={
    createElement(tag){return fakeElement(tag);},
    getElementById(id){if(!nodes.has(id))nodes.set(id,fakeElement('div'));return nodes.get(id);},
    querySelectorAll(){return []}
  };
  const en={sub:'English subtitle',sampleTasks:['Study EN','Sport EN','Read EN','Work EN'],sampleNotes:[
    {t:'First EN',b:'First EN body'}, {t:'Second EN',b:'Second EN body'}, {t:'Third EN',b:'Third EN body'}]};
  const fr={sub:'Français',sampleTasks:['Étude FR','Sport FR','Lecture FR','Travail FR'],sampleNotes:[
    {t:'First FR',b:'First FR body'}, {t:'Second FR',b:'Second FR body'}, {t:'Third FR',b:'Third FR body'}]};
  const cfg={lang:'en'};
  const tasksList=[
    {id:404,isStarter:false,title:'My own task'},
    {id:3,isStarter:true,title:'Read EN'},
    {id:2,isStarter:true,title:'Edited by user'},
    {id:1,isStarter:true,title:'Study EN'}];
  const notesList=[
    {id:90,isStarter:false,title:'User note',body:'Private user text'},
    {id:3,isStarter:true,title:'Third EN',body:'Third EN body'},
    {id:2,isStarter:true,title:'Second EN',body:'User edited body'},
    {id:1,isStarter:true,title:'First EN',body:'First EN body'}];
  const LANG_CATALOG=[
    {code:'ar',iso:'AR',enName:'Arabic',nativeName:'العربية',countries:'Jordan',dir:'rtl'},
    {code:'en',iso:'EN',enName:'English',nativeName:'English',countries:'USA',dir:'ltr'},
    {code:'fr',iso:'FR',enName:'French',nativeName:'Français',countries:'France',dir:'ltr'},
    {code:'xx',iso:'XX',enName:'<img src=x onerror=alert(1)>',nativeName:'Not translated',countries:'Test',dir:'ltr'}];
  const noop=()=>{};
  const context={document:doc,window:{},LANG_CATALOG,DICT:{en,fr},cfg,tasksList,notesList,toWest:String,
    saveFortressData:noop,L(){return context.DICT[cfg.lang]||context.DICT.en;},
    renderAnalyticsBars:noop,syncHeaderMetrics:noop,updateTimerDisplay:noop,renderTasksList:noop,
    renderCalendar:noop,renderNotesStack:noop,renderSoundsStudio:noop,updateSyllabusCalc:noop,
    closeModal:noop,quickL10n:noop,refreshTimerSettings:noop,console};
  vm.createContext(context);
  vm.runInContext(source,context,{filename:'app.js:language-ui',timeout:2500});
  return {...context,box};
}

test('unknown and excluded locales fall back to English, never Arabic',()=>{
  for(const code of ['he','iw','missing',null]){
    const context=setup();
    context.applyLanguage(code);
    assert.equal(context.cfg.lang,'en',String(code));
  }
});
test('locale options are safe, keyboard accessible buttons without markup injection',()=>{
  const c=setup();
  c.renderLanguageList();
  assert.equal(c.box.children.length,c.LANG_CATALOG.length);
  for(const row of c.box.children){
    assert.equal(row.tagName,'BUTTON');
    assert.equal(row.type,'button');
    assert.equal(typeof row.onclick,'function');
    assert.ok(['true','false'].includes(row.getAttribute('aria-pressed')));
  }
  const unsafe=c.box.children[3];
  assert.equal(unsafe.children[1].children[0].textContent,'<img src=x onerror=alert(1)>');
});
test('language change uses stable starter IDs and preserves edited user content',()=>{
  const c=setup();
  c.applyLanguage('fr');
  assert.equal(c.cfg.lang,'fr');
  assert.equal(c.tasksList[0].title,'My own task');
  assert.equal(c.tasksList[1].title,'Lecture FR','starter 3 uses ID, not list index');
  assert.equal(c.tasksList[2].title,'Edited by user','edited starter remains intact');
  assert.equal(c.tasksList[3].title,'Étude FR');
  assert.equal(c.notesList[0].body,'Private user text');
  assert.equal(c.notesList[1].title,'Third FR');
  assert.equal(c.notesList[2].body,'User edited body','edited note remains intact');
  assert.equal(c.notesList[2].title,'Second EN','note title preserved with edited body');
  assert.equal(c.notesList[3].title,'First FR');
  assert.equal(c.notesList[3].body,'First FR body');
});
