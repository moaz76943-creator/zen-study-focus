'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const web=path.resolve(__dirname,'../android/app/src/main/assets/web');
const read=p=>fs.readFileSync(path.join(web,p),'utf8');
const html=read('index.html');
const app=read('app.js');
const bridge=read('js/df99_multiscreen_i18n.js');

function scriptFiles() {
  return [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(x=>x[1]);
}
test('Reviewed and premium packs are each loaded before app boot, in dependency order',()=>{
  const scripts=scriptFiles();
  assert.equal(new Set(scripts).size,scripts.length,'duplicate scripts execute twice');
  const at=p=>scripts.indexOf(p);
  for(const p of ['locale_rows.js','locale_extras.js','js/df99_multiscreen_i18n.js',
    'quick_training.js','locale_premium_v22.js','js/df99_reviewed_packs.js','app.js']){
    assert.ok(at(p)>=0,p+' was not included');
  }
  assert.ok(at('locale_rows.js')<at('app.js'));
  assert.ok(at('locale_extras.js')<at('app.js'));
  assert.ok(at('js/df99_multiscreen_i18n.js')<at('js/df99_reviewed_packs.js'));
  assert.ok(at('quick_training.js')<at('app.js'));
  assert.ok(at('locale_premium_v22.js')<at('js/df99_reviewed_packs.js'));
  assert.ok(at('js/df99_reviewed_packs.js')<at('app.js'));
  for(const script of scripts) assert.ok(fs.existsSync(path.join(web,script)),script+' missing offline');
});
test('Localization shell source and bridge parse without evaluating application startup',()=>{
  new vm.Script(app,{filename:'app.js'});
  new vm.Script(bridge,{filename:'df99_multiscreen_i18n.js'});
  assert.match(html,/data-i18n="langSearchTitle"/);
  assert.match(html,/data-i18n-placeholder="langSearchPlaceholder"/);
});
function makeElement(tag='SPAN',text='',key=null) {
  const attrs={};
  if(key!==null)attrs['data-i18n']=key;
  return {
    tagName:tag, textContent:text, value:'', isContentEditable:false, attrs,
    getAttribute(name){return this.attrs[name]??null;},
    setAttribute(name,value){this.attrs[name]=String(value);}
  };
}
function setup(initialLanguage='en') {
  const index=(start,end)=> {
    const a=app.indexOf(start),b=app.indexOf(end,a);
    assert.ok(a>=0 && b>a,start+' source anchor changed');
    return app.slice(a,b);
  };
  const sources=[
    index('const WESTERN_DIGIT_ZERO_POINTS = ',"document.addEventListener('input'"),
    index('const SHELL_LABELS = ','const CONFIRMATION_TEXT = '),
    index('function localizeStarterPreviews(target) {','/* ========================================================\n   3. CLOUD BACKUP')
  ].join('\n');
  const root=makeElement('HTML');
  const iso=makeElement(),heading=makeElement(),sub=makeElement();
  const nav=makeElement('SPAN','Timer','navTimer');
  const search=makeElement('SPAN','🌐 Language & Country Search','langSearchTitle');
  const missing=makeElement('SPAN','Human readable fallback','internalMissingValue');
  const editable=makeElement('INPUT','Personal text','navTasks');
  editable.value='My handwritten notes १२٣';
  const searchInput=makeElement('INPUT');
  searchInput.setAttribute('data-i18n-placeholder','langSearchPlaceholder');
  searchInput.setAttribute('placeholder','Search language or country...');
  const training=makeElement('SPAN');
  const byId={htmlRoot:root,currentLangIso:iso,currentLangLabel:heading,
    hdrMainTitle:makeElement(),hdrSubTitle:sub,navTrainingText:training};
  const events=[];
  const saved=[];
  const tasksList=[
    {id:1,isStarter:true,title:'Study EN'},
    {id:2,isStarter:true,title:'Edited personal task'},
    {id:21,isStarter:false,title:'Owner note १२٣'}
  ];
  const notesList=[
    {id:1,isStarter:true,title:'Demo EN',body:'Demo EN body'},
    {id:2,isStarter:false,title:'Owner private note',body:'Do not translate ۱۲٣'}
  ];
  const DICT={
    en:{navTimer:'Timer',navTasks:'Tasks',sub:'English subtitle',
      sampleTasks:['Study EN','Sport EN'],sampleNotes:[{t:'Demo EN',b:'Demo EN body'}]},
    ar:{navTimer:'المؤقت',navTasks:'المهام',sub:'شرح عربي',
      sampleTasks:['دراسة','رياضة'],sampleNotes:[{t:'تجريبي',b:'نص تجريبي'}]},
    de:{navTimer:'Timer',navTasks:'Aufgaben',sub:'Deutscher Text',
      sampleTasks:['Lernen','Sport'],sampleNotes:[{t:'Probe',b:'Text'}]}
  };
  const cfg={lang:initialLanguage};
  const ctx=vm.createContext({
    window:{
      DF22Locale:{t(code,key){return key==='quickTraining'?(code==='ar'?'تدريب سريع':'Quick training'):null;},
        apply(document,code){events.push('premium:'+code);}},
      DF22Integration:{refreshLocale(){events.push('integration');}}
    },
    document:{
      getElementById(id){return byId[id]||(byId[id]=makeElement());},
      querySelectorAll(selector){
        if(selector==='[data-i18n]')return [nav,search,missing,editable];
        if(selector==='[data-i18n-placeholder]')return [searchInput];
        return [];
      }
    },
    LANG_CATALOG:[
      {code:'en',iso:'EN',dir:'ltr',enName:'English',nativeName:'English'},
      {code:'ar',iso:'AR',dir:'rtl',enName:'Arabic',nativeName:'العربية'},
      {code:'de',iso:'DE',dir:'ltr',enName:'German',nativeName:'Deutsch'}
    ],
    DICT,cfg,tasksList,notesList,
    L(){return DICT[cfg.lang]||DICT.en;},
    saveFortressData(key,data){saved.push({key,lang:data.lang});if(ctx.rejectSave)throw Error('STORAGE_REJECTED');return true;},
    renderAnalyticsBars(){events.push('analytics');},syncHeaderMetrics(){},updateTimerDisplay(){},
    renderTasksList(){},renderCalendar(){events.push('calendar');},renderNotesStack(){},
    renderSoundsStudio(){},updateSyllabusCalc(){},closeModal(){},
    quickL10n(){events.push('training');},
    refreshTimerSettings(){events.push('timer');},
    quickText(){return 'Quick training';},
    console
  });
  vm.runInContext(bridge,ctx);
  vm.runInContext(sources,ctx);
  return {ctx,nav,search,missing,editable,searchInput,root,iso,sub,training,events,saved,tasksList,notesList};
}
test('Arabic/RTL switch updates shell, quick nav, premium, calendar and preserves user content',()=>{
  const d=setup();
  vm.runInContext("applyLanguage('ar-JO')",d.ctx);
  assert.equal(d.ctx.cfg.lang,'ar');
  assert.equal(d.root.attrs.dir,'rtl');
  assert.equal(d.root.attrs.lang,'ar');
  assert.equal(d.nav.textContent,'المؤقت');
  assert.equal(d.search.textContent,'🌐 البحث عن اللغة والبلد');
  assert.match(d.searchInput.attrs.placeholder,/ابحث عن/);
  assert.equal(d.missing.textContent,'Human readable fallback');
  assert.equal(d.editable.value,'My handwritten notes १२٣');
  assert.equal(d.editable.textContent,'Personal text');
  assert.equal(d.tasksList[0].title,'دراسة');
  assert.equal(d.tasksList[1].title,'Edited personal task');
  assert.equal(d.tasksList[2].title,'Owner note १२٣');
  assert.equal(d.notesList[1].body,'Do not translate ۱۲٣');
  for (const area of ['timer','calendar','training','premium:ar','integration']) {
    assert.ok(d.events.includes(area),area+' failed to refresh');
  }
  assert.deepEqual(d.saved.map(x=>x.key),['zen_fortress_cfg_v21']);
});
test('Reviewed shell overlay wins over legacy dictionary, offline reload restores preference',()=>{
  const d=setup('de');
  assert.equal(d.ctx.window.DF99Locale.register('de','shell',{navTimer:'Stoppuhr'}),true);
  vm.runInContext("applyLanguage(cfg.lang)",d.ctx);
  assert.equal(d.nav.textContent,'Stoppuhr');
  assert.equal(d.root.attrs.dir,'ltr');
  assert.equal(d.iso.textContent,'DE');
  assert.equal(d.saved[0].lang,'de');
});
test('Blocked he/iw never change UI to a forbidden locale; failed storage ACK restores state',()=>{
  const d=setup();
  assert.equal(d.ctx.window.DF99Locale.register('he','shell',{navTimer:'blocked'}),false);
  assert.equal(d.ctx.window.DF99Locale.normalize('iw-IL'),'en');
  vm.runInContext("applyLanguage('he-IL')",d.ctx);
  assert.equal(d.ctx.cfg.lang,'en');
  assert.equal(d.root.attrs.dir,'ltr');
  d.ctx.rejectSave=true;
  assert.throws(()=>vm.runInContext("applyLanguage('ar')",d.ctx),/STORAGE_REJECTED/);
  assert.equal(d.ctx.cfg.lang,'en');
  assert.equal(d.nav.textContent,'Timer','a rejected save must not re-render into an unsaved locale');
});
test('Templates substitute scalars only; HTML-safe interpolation neutralizes user markup',()=>{
  const d=setup();
  const t=d.ctx.window.DF99Locale;
  assert.equal(t.format('Next: {days} days',{days:12}),'Next: 12 days');
  assert.equal(t.format('Value {missing}',{other:1}),'Value {missing}');
  assert.equal(t.format('Value {x}',{x:{evil:true}}),'Value {x}');
  assert.equal(t.formatHtml('Title: {title}',{title:'<img src=x onerror="bad()">&'}),
    'Title: &lt;img src=x onerror=&quot;bad()&quot;&gt;&amp;');
  assert.equal(t.register('de','shell',{status:'Schritt {days}'}),true);
  assert.equal(t.t('de','shell','status','Step {days}',{days:3}),'Schritt 3');
  assert.equal(t.t('zz','shell','unknown','Human fallback'),'Human fallback');
});
test('Localized system numerals use Latin 0-9 for Arabic, Persian, Indic and fullwidth',()=>{
  const d=setup();
  assert.equal(vm.runInContext("toWest('١٢٣ ۱۲۳ १२३ ১২৩ ๑๒๓ １２３')",d.ctx),
    '123 123 123 123 123 123');
});
