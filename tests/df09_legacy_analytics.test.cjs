'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const web=path.resolve(__dirname,'../android/app/src/main/assets/web');
require(path.join(web,'js/df99_multiscreen_i18n.js'));
require(path.join(web,'js/df99_reviewed_packs.js'));
const old=require(path.join(web,'localization_20_recovery.js'));
globalThis.DeepFocusLocale20Recovery=old;
const beforeDe=globalThis.DF99Locale.t('de','analytics','title','Recorded analytics');
const beforeFr=globalThis.DF99Locale.t('fr','analytics','minutes','Recorded minutes');
const beforeBn=globalThis.DF99Locale.t('bn','analytics','title','Recorded analytics');
const beforeSw=globalThis.DF99Locale.t('sw','analytics','title','Recorded analytics');
const bridge=require(path.join(web,'js/legacy20_analytics_bridge.js'));
test('old 20-language analytics dictionary is complete; excluded Hebrew absent',()=>{
  assert.equal(old.audit().valid,true);assert.equal(old.LANGUAGES.length,20);
  assert.equal(old.KEYS.length,29);
  assert.ok(!old.LANGUAGES.includes('he')&&!old.LANGUAGES.includes('iw'));
  assert.equal(bridge.canonical.length,30);
});
test('reviewed current German and French strings are not overwritten',()=>{
  assert.equal(globalThis.DF99Locale.t('de','analytics','title','Recorded analytics'),beforeDe);
  assert.equal(globalThis.DF99Locale.t('fr','analytics','minutes','Recorded minutes'),beforeFr);
});
test('missing Bengali analytics labels become real Bengali, while other 79 locales remain untouched',()=>{
  assert.equal(beforeBn,'Recorded analytics');
  assert.equal(globalThis.DF99Locale.t('bn','analytics','title','Recorded analytics'),old.t('bn','analyticsTitle'));
  assert.equal(globalThis.DF99Locale.t('bn','analytics','noData','No data'),old.t('bn','noSessions'));
  assert.equal(globalThis.DF99Locale.t('sw','analytics','title','Recorded analytics'),beforeSw);
});
test('actual analytics UI receives the bridged translation, without changing data or session counts',()=>{
  const A=require(path.join(web,'analytics_core_v21.js'));
  const S=require(path.join(web,'analytics_studio.js'));
  const d={createElement(tag){return {tagName:tag.toUpperCase(),children:[],style:{},value:'',textContent:'',attributes:{},
    setAttribute(k,v){this.attributes[k]=v},addEventListener(){},appendChild(x){this.children.push(x);if(this.tagName==='SELECT'&&!this.value)this.value=x.value;return x},
    append(...xs){this.children.push(...xs)},replaceChildren(...xs){this.children=xs},remove(){}}}};
  const target={ownerDocument:d,children:[],appendChild(x){this.children.push(x)}};
  const data={cfg:{sessionHistory:[{id:'valid',date:'2026-10-19',minutes:15,domain:'study'}]},tasksList:[],projects:[]};
  const frozen=JSON.stringify(data);
  const mount=S.mount(target,()=>data,{locale:'bn',today:'2026-10-19',startDate:'2026-10-18',endDate:'2026-10-19'});
  assert.equal(target.children[0].children[0].textContent,old.t('bn','analyticsTitle'));
  assert.equal(mount.getReport().totals.minutes,15);assert.equal(JSON.stringify(data),frozen);
  assert.ok(A);
});
test('bridge is loaded after active reviewed packs and before analytics runtime; no user records touched',()=>{
  const html=fs.readFileSync(path.join(web,'index.html'),'utf8');
  const a=html.indexOf('js/df99_reviewed_packs.js'),b=html.indexOf('localization_20_recovery.js'),c=html.indexOf('js/legacy20_analytics_bridge.js'),d=html.indexOf('analytics_studio.js');
  assert.ok(a>0&&a<b&&b<c&&c<d);
  const src=fs.readFileSync(path.join(web,'js/legacy20_analytics_bridge.js'),'utf8');
  assert.doesNotMatch(src,/localStorage|setItem\(|saveFortressData|zen_fortress_cfg_v21|he-IL|iw-IL/);
});

test('preserves separately reviewed Analytics labels when bridging an old locale',()=>{
  const vm=require('node:vm');
  const saved=new Map([['title','Reviewed title'],['today','Heute (reviewed)'],
    ['activitySplit','Verteilung (reviewed)'],['exportUnavailable','Export nicht verfügbar']]);
  const live={
    t(_locale,_family,key,fallback){return saved.get(key)||fallback;},
    register(_locale,_family,pack){saved.clear();for(const [key,value] of Object.entries(pack))saved.set(key,value);return true;}
  };
  const oldPack={LANGUAGES:['de'],t(locale,key){return locale==='en'?'English '+key:'Übersetzt '+key;}};
  const sandbox=vm.createContext({DF99Locale:live,DeepFocusLocale20Recovery:oldPack});
  const src=fs.readFileSync(path.join(web,'js/legacy20_analytics_bridge.js'),'utf8');
  vm.runInContext(src,sandbox,{filename:'legacy20_analytics_bridge.js'});
  assert.equal(saved.get('title'),'Reviewed title');
  assert.equal(saved.get('today'),'Heute (reviewed)');
  assert.equal(saved.get('activitySplit'),'Verteilung (reviewed)');
  assert.equal(saved.get('exportUnavailable'),'Export nicht verfügbar');
});
test('distinguishes real Bengali labels from English fallback in coverage',()=>{
  const coverage=globalThis.DF99Locale.coverage(['bn','sw','zz'],'analytics',
    ['title','noData','invalidRange']);
  assert.equal(coverage[0].code,'bn');
  assert.equal(coverage[0].translated,2);
  assert.equal(coverage[1].code,'sw');
  assert.equal(coverage[1].translated,2); // Current reviewed Swahili labels, not fallback.
  assert.equal(coverage[2].code,'zz');
  assert.equal(coverage[2].translated,0); // No pack: English fallback is not translation.
  assert.equal(coverage[0].total,3);
});
test('offline scripts reinitialize Bengali Analytics on a fresh reopen without user state',()=>{
  const vm=require('node:vm');
  const scripts=['js/df99_multiscreen_i18n.js','js/df99_reviewed_packs.js',
    'localization_20_recovery.js','js/legacy20_analytics_bridge.js'];
  const boot=()=>{
    const sandbox={};sandbox.window=sandbox;vm.createContext(sandbox);
    for(const script of scripts)vm.runInContext(fs.readFileSync(path.join(web,script),'utf8'),
      sandbox,{filename:script});
    return sandbox;
  };
  const first=boot(),reopened=boot();
  for(const sandbox of [first,reopened]){
    assert.equal(sandbox.DF99Locale.t('bn','analytics','title','Recorded analytics'),
      old.t('bn','analyticsTitle'));
    assert.equal(sandbox.DF99Locale.t('sw','analytics','title','Recorded analytics'),
      'Takwimu zilizorekodiwa');
    assert.equal(sandbox.DF99Locale.t('zz','analytics','title','Recorded analytics'),
      'Recorded analytics');
    assert.equal(sandbox.DeepFocusLocale20Recovery.direction('fa'),'rtl');
    assert.equal(sandbox.DeepFocusLocale20Recovery.direction('ur'),'rtl');
    assert.equal(sandbox.DeepFocusLocale20Recovery.resolve('he'),'en');
    assert.equal(sandbox.DeepFocusLocale20Recovery.resolve('iw'),'en');
    const n=sandbox.DeepFocusLocale20Recovery.formatNumber(1234,'fa',{useGrouping:false});
    assert.equal(n,'1234');
    assert.doesNotMatch(sandbox.DeepFocusLocale20Recovery.formatDate('2026-10-19','ur',
      {year:'numeric',month:'numeric',day:'numeric'}),/[\u0660-\u0669\u06f0-\u06f9]/u);
  }
});

test('source inventory counts live 99-locale Analytics labels separately from fallback',()=>{
  const audit=require('../tools/localization_100/analytics_live_99_report.cjs').report();
  assert.equal(audit.scope,'source-only-analytics');
  assert.equal(audit.registered,99);
  assert.ok(audit.keys>=35);
  assert.equal(audit.releaseApproved,false);
  assert.equal(audit.certifiedLanguages,0);
  assert.ok(!audit.languages.some(x=>['he','iw'].includes(x.code)));
  const bn=audit.languages.find(x=>x.code==='bn');
  const sw=audit.languages.find(x=>x.code==='sw');
  assert.ok(bn.explicitSourceKeys>=20);
  assert.ok(sw.explicitSourceKeys>0);
  assert.equal(bn.englishFallbackKeys+bn.explicitSourceKeys,bn.totalKeys);
  assert.equal(sw.englishFallbackKeys+sw.explicitSourceKeys,sw.totalKeys);
  assert.equal(audit.languages.find(x=>x.code==='en').uiInlineSource,'EN');
  assert.equal(audit.languages.find(x=>x.code==='ar').uiInlineSource,'AR');
  assert.ok(audit.languages.every(x=>x.androidVerified===false));
});

test('actual app language switch keeps v21 values and reopens saved offline locale',()=>{
  const vm=require('node:vm');
  const app=fs.readFileSync(path.join(web,'app.js'),'utf8');
  const start=app.indexOf('function applyLanguage(code) {');
  const end=app.indexOf('\n/* =====',start);
  assert.ok(start>=0&&end>start);
  const realFn=app.slice(start,end);
  const catalog=[
    {code:'en',dir:'ltr',iso:'EN',enName:'English',nativeName:'English'},
    {code:'bn',dir:'ltr',iso:'BN',enName:'Bengali',nativeName:'বাংলা'},
    {code:'fa',dir:'rtl',iso:'FA',enName:'Persian',nativeName:'فارسی'},
    {code:'ur',dir:'rtl',iso:'UR',enName:'Urdu',nativeName:'اردو'}
  ];
  const initial={lang:'en',sessionHistory:[{id:'record',minutes:15}],
    taskUserText:'DO NOT TRANSLATE',focusMin:25};
  let saved=structuredClone(initial),writes=0;
  function boot(){
    const nodes=new Map();
    const makeNode=()=>({textContent:'',attributes:{},
      parentElement:{setAttribute(){}},
      setAttribute(name,value){this.attributes[name]=value;}});
    const document={
      getElementById(name){if(!nodes.has(name))nodes.set(name,makeNode());return nodes.get(name);},
      querySelectorAll(){return [];}
    };
    const cfg=structuredClone(saved);
    const noop=()=>{};
    const sandbox={document,cfg,LANG_CATALOG:catalog,
      window:{DF22Locale:{translations:{},apply:noop},DF22Integration:{refreshLocale:noop}},
      saveFortressData(key,value){
        assert.equal(key,'zen_fortress_cfg_v21');
        saved=structuredClone(value);writes++;return true;
      },
      L:()=>({sub:'Focus'}),renderAnalyticsBars:noop,localizeStarterPreviews:noop,
      syncHeaderMetrics:noop,updateTimerDisplay:noop,renderTasksList:noop,
      renderCalendar:noop,renderNotesStack:noop,renderSoundsStudio:noop,
      updateSyllabusCalc:noop,closeModal:noop,quickL10n:noop
    };
    vm.createContext(sandbox);
    vm.runInContext(realFn+'\nthis.applyLanguage=applyLanguage;',sandbox);
    return {sandbox,nodes};
  }
  const first=boot();
  first.sandbox.applyLanguage('bn');
  assert.equal(saved.lang,'bn');
  assert.equal(first.nodes.get('htmlRoot').attributes.lang,'bn');
  assert.equal(first.nodes.get('htmlRoot').attributes.dir,'ltr');
  assert.equal(saved.taskUserText,initial.taskUserText);
  assert.deepEqual(saved.sessionHistory,initial.sessionHistory);
  const reopened=boot();
  reopened.sandbox.applyLanguage(reopened.sandbox.cfg.lang);
  assert.equal(reopened.nodes.get('htmlRoot').attributes.lang,'bn');
  reopened.sandbox.applyLanguage('fa');
  assert.equal(saved.lang,'fa');
  assert.equal(reopened.nodes.get('htmlRoot').attributes.dir,'rtl');
  const next=boot();
  next.sandbox.applyLanguage('he');
  assert.equal(saved.lang,'en');
  next.sandbox.applyLanguage('iw');
  assert.equal(saved.lang,'en');
  assert.equal(saved.focusMin,25);
  assert.ok(writes>=5);
});

test('date-only Analytics calendar labels never shift a day in western time zones',()=>{
  const {spawnSync}=require('node:child_process');
  const localeModule=path.join(web,'localization_20_recovery.js');
  const program='const l=require('+JSON.stringify(localeModule)+');'+
    'process.stdout.write(l.formatDate("2026-10-19","en",'+
    '{year:"numeric",month:"2-digit",day:"2-digit"}));';
  for(const zone of ['America/Los_Angeles','Pacific/Honolulu','Asia/Amman']){
    const result=spawnSync(process.execPath,['-e',program],{
      env:{...process.env,TZ:zone},encoding:'utf8',timeout:15000
    });
    assert.equal(result.status,0,zone+': '+result.stderr);
    assert.equal(result.stdout,'10/19/2026',zone+': calendar day drift');
  }
});
