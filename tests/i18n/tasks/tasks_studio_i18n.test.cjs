'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
require('../../../android/app/src/main/assets/web/js/df99_multiscreen_i18n.js');
require('../../../android/app/src/main/assets/web/js/df99_reviewed_packs.js');
const Studio=require('../../../android/app/src/main/assets/web/tasks_studio.js');
const reviewed=require('../../../assets/i18n/df99_reviewed_packs.json');

class Element {
 constructor(doc,tag){
  this.ownerDocument=doc;this.tagName=tag.toUpperCase();this.children=[];this.events={};
  this.attributes={};this.style={};this.textContent='';this.value='';this.checked=false;
 }
 get value(){return this._value||'';}
 set value(raw){
  const v=String(raw??'');
  if(this.tagName==='SELECT'&&this.children.length&&!this.children.some(o=>o.value===v))this._value='';
  else if(this.tagName==='INPUT'&&this.type==='number'&&v&&!/^-?\d+(\.\d+)?$/.test(v))this._value='';
  else if(this.tagName==='INPUT'&&this.type==='time'&&v&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(v))this._value='';
  else this._value=v;
 }
 appendChild(n){this.children.push(n);n.parent=this;return n;}
 replaceChildren(...xs){this.children=[];xs.forEach(x=>this.appendChild(x));}
 setAttribute(k,v){this.attributes[k]=String(v);}
 addEventListener(event,fn){this.events[event]=fn;}
 dispatch(event){this.events[event]?.({target:this,preventDefault(){}});}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}
 get descendants(){return this.children.flatMap(x=>[x,...x.descendants]);}
}
const doc={createElement(tag){return new Element(this,tag);}};
function fixture(tasks=[{id:7,title:'Undated',done:false,catKey:'study',isStarter:false}],locale='en'){
 let data={cfg:{sessionHistory:[],taskProjectsV21:[],untouched:'v21'},tasksList:JSON.parse(JSON.stringify(tasks))};
 let commits=0;const target=new Element(doc,'main');
 const adapter={
  locale,now:()=>new Date(2026,9,25),
  readState:()=>JSON.parse(JSON.stringify(data)),
  commit(before,after){
   assert.deepEqual(before,data);
   data=JSON.parse(JSON.stringify(after));commits++;
  },linkTaskToTimer:()=>true
 };
 const studio=Studio.mount(target,adapter);
 const all=()=>target.descendants;
 const button=text=>all().find(e=>e.tagName==='BUTTON'&&e.textContent===text);
 const editor=()=>all().find(e=>e.tagName==='FORM');
 const byLabel=(label)=>editor()?.descendants.find(e=>e.tagName==='LABEL'&&e.textContent===label)?.children[0];
 const cardTitles=()=>all().find(e=>e.id==='df-task-results')?.descendants.filter(e=>e.className==='df-title').map(e=>e.textContent)||[];
 return {adapter,studio,target,all,button,editor,byLabel,cardTitles,get:()=>data,commits:()=>commits};
}
test('reviewed Tasks Studio packs resolve on live DOM without rewriting task titles',()=>{
 let validated=0;
 for(const [locale,entry] of Object.entries(reviewed)){
  if(!entry.tasks?.title)continue;
  const f=fixture(undefined,locale);
  assert.equal(f.all().find(e=>e.tagName==='H2').textContent,entry.tasks.title,locale);
  assert.equal(f.get().tasksList[0].title,'Undated');
  assert.equal(f.commits(),0);
  f.studio.destroy();validated++;
 }
 assert.ok(validated>=1,'at least one reviewed Tasks pack required');
});
test('locale refresh updates labels, RTL, blocked Hebrew and preserves v21 state',()=>{
 const f=fixture();
 const initial=JSON.stringify(f.get());
 for(const [code,dir] of [['ar','rtl'],['fa','rtl'],['ur','rtl'],['ps','rtl'],['ku','ltr'],['de','ltr'],['he','ltr'],['iw','ltr']]){
  f.adapter.locale=code;f.studio.render();
  assert.equal(f.target.children[0].attributes.dir,dir,code);
  if(code==='he'||code==='iw')assert.equal(f.target.children[0].attributes.lang,'en');
 }
 assert.equal(f.all().find(e=>e.tagName==='H2').textContent,'Tasks Studio');
 assert.equal(f.commits(),0);
 assert.equal(JSON.stringify(f.get()),initial);
});
test('editing legacy task without date and optional fields does not insert defaults',()=>{
 const f=fixture([{id:8,title:'Legacy',done:false,other:{preserve:1}}]);
 const original=JSON.stringify(f.get());
 f.button('Edit').dispatch('click');
 assert.equal(f.editor().descendants.find(e=>e.tagName==='INPUT'&&e.type==='date').value,'');
 f.editor().dispatch('submit');
 assert.equal(f.commits(),0);assert.equal(JSON.stringify(f.get()),original);
 f.button('Edit').dispatch('click');
 f.byLabel('Task title').value='Edited';
 f.editor().dispatch('submit');
 assert.equal(f.commits(),1);
 const t=f.get().tasksList[0];
 assert.equal(t.title,'Edited');assert.equal(Object.hasOwn(t,'date'),false);
 assert.equal(Object.hasOwn(t,'priority'),false);
 assert.equal(Object.hasOwn(t,'repeat'),false);
 assert.deepEqual(t.other,{preserve:1});
 f.studio.undo();assert.equal(f.get().tasksList[0].title,'Legacy');
});
test('cancelled editor cannot change stored task and no locale value is persisted',()=>{
 const f=fixture();
 const before=JSON.stringify(f.get());
 f.button('Edit').dispatch('click');f.byLabel('Task title').value='Discard me';
 f.button('Cancel').dispatch('click');
 assert.equal(JSON.stringify(f.get()),before);
 assert.equal(f.commits(),0);
});
test('new task stores category, priority and repeat as stable machine keys',()=>{
 const f=fixture([]);
 f.button('＋ New task').dispatch('click');
 f.byLabel('Task title').value='New task';
 f.byLabel('Category').value='sport';f.byLabel('Priority').value='urgent';f.byLabel('Repeat').value='daily';
 f.editor().dispatch('submit');
 const task=f.get().tasksList[0];
 assert.equal(task.title,'New task');assert.equal(task.catKey,'sport');
 assert.equal(task.priority,'urgent');assert.deepEqual(task.repeat,{frequency:'daily',interval:1});
 assert.equal(task.date,'2026-10-25');assert.equal(f.commits(),1);
 f.adapter.locale='ar';f.studio.render();
 assert.equal(f.get().tasksList[0].catKey,'sport');
 assert.equal(f.get().tasksList[0].priority,'urgent');
});
test('localized numeric note error does not expose hard-coded English and does not commit',()=>{
 const f=fixture([],'ar');f.button('＋ إضافة مهمة').dispatch('click');
 f.byLabel('عنوان المهمة').value='اختبار';
 f.byLabel('أرقام الملاحظات').value='١٢';
 f.editor().dispatch('submit');
 const error=f.all().find(e=>e.attributes.role==='status');
 assert.match(error.textContent,/الأرقام الغربية/);
 assert.doesNotMatch(error.textContent,/Numeric note IDs required/);
 assert.equal(f.commits(),0);assert.equal(f.get().tasksList.length,0);
});
test('sort/filter/search/kanban with 1000 tasks is read-only and has accessible labels',()=>{
 const rows=Array.from({length:1000},(_,i)=>({
  id:i+1,title:'Task '+i,catKey:i%2?'study':'exam',done:false,
  priority:i===499?'urgent':'medium',date:i%2?'2026-10-20':'2026-10-26',isStarter:false
 }));
 const f=fixture(rows);const original=JSON.stringify(f.get());
 const sort=f.all().find(e=>e.attributes['aria-label']==='Sort tasks');
 assert.ok(sort);
 sort.value='priority';sort.dispatch('change');
 assert.equal(f.cardTitles()[0],'Task 499');
 const search=f.all().find(e=>e.tagName==='INPUT'&&e.type==='search');
 assert.equal(search.attributes['aria-label'],'Search tasks');
 search.value='Task 499';search.dispatch('input');
 assert.deepEqual(f.cardTitles(),['Task 499']);
 search.value='';search.dispatch('input');
 f.button('Kanban').dispatch('click');assert.equal(f.cardTitles().length,1000);
 f.button('Priorities').dispatch('click');
 assert.equal(f.commits(),0);assert.equal(JSON.stringify(f.get()),original);
});
test('legacy Arabic/Persian/Devanagari numerals render as Western digits without storage writes',()=>{
 const f=fixture([{id:11,title:'Legacy',date:'٢٠٢٦-۱۰-२५',dueTime:'١٢:۳۰',done:false,isStarter:false,catKey:'study'}]);
 const raw=JSON.stringify(f.get());
 const meta=f.all().find(e=>e.className==='df-meta');
 assert.ok(meta.children[0].textContent.includes('2026-10-25'));
 assert.ok(meta.children[0].textContent.includes('12:30'));
 assert.equal(JSON.stringify(f.get()),raw);
});

test('timer linking failure is displayed in selected language rather than generic save error',()=>{
 for(const [locale,caption,expected] of [
  ['en','Start focus','Timer link not connected'],
  ['ar','ابدأ التركيز','ربط المؤقت غير متاح بعد']
 ]){
  const f=fixture(undefined,locale);f.adapter.linkTaskToTimer=()=>false;
  f.button(caption).dispatch('click');
  assert.equal(f.all().find(e=>e.attributes.role==='status').textContent,expected);
  assert.equal(f.commits(),0);
 }
});
test('empty new task title reports a localized validation reason without a commit',()=>{
 for(const [locale,caption,expected] of [
  ['en','＋ New task','Task title is required'],
  ['ar','＋ إضافة مهمة','عنوان المهمة مطلوب']
 ]){
  const f=fixture([],locale);f.button(caption).dispatch('click');
  f.editor().dispatch('submit');
  assert.equal(f.all().find(e=>e.attributes.role==='status').textContent,expected);
  assert.equal(f.commits(),0);
 }
});

test('legacy invalid optional values survive browser input normalization on title-only edit',()=>{
 const legacy={id:72,title:'Keep odd fields',catKey:'study',done:false,isStarter:false,
  dueTime:'99:99',estimateMin:'legacy estimate',repeat:{frequency:'weekdays',interval:1},
  proprietary:{value:'do not touch'}};
 const f=fixture([legacy]);
 f.button('Edit').dispatch('click');
 assert.equal(f.byLabel('Time').value,'');
 assert.equal(f.byLabel('Estimated minutes').value,'');
 assert.equal(f.byLabel('Repeat').value,'');
 f.byLabel('Task title').value='Rename only';
 f.editor().dispatch('submit');
 assert.equal(f.commits(),1);
 const result=f.get().tasksList[0];
 assert.equal(result.title,'Rename only');
 assert.equal(result.dueTime,'99:99');
 assert.equal(result.estimateMin,'legacy estimate');
 assert.deepEqual(result.repeat,{frequency:'weekdays',interval:1});
 assert.deepEqual(result.proprietary,{value:'do not touch'});
});
