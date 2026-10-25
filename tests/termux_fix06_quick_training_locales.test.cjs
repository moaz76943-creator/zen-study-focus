'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const content=fs.readFileSync(path.resolve(__dirname,'../android/app/src/main/assets/web/quick_training.js'),'utf8');
const start=content.indexOf('function quickText(key)');
const end=content.indexOf('function timeString(seconds)',start);
const early=content.indexOf('let quickTraining = null;');
assert.ok(early>0 && start>early && end>start,'Unexpected quick training source');
const cfg={lang:'en'};
const elements={
  title:{getAttribute:()=> 'trainingTitle',textContent:'OLD'},
  rest:{getAttribute:()=> 'rest',textContent:'OLD'},
  placeholder:{getAttribute:()=> 'exercisePlaceholder',placeholder:'OLD'}
};
let refreshCount=0;
const context={cfg,document:{querySelectorAll(selector){
  return selector==='[data-qt]'?[elements.title,elements.rest]:
    selector==='[data-qt-placeholder]'?[elements.placeholder]:[];
}},renderQuickTraining(){refreshCount++},renderTodayPlan(){refreshCount++},updateFocusStatus(){refreshCount++}};
vm.createContext(context);
vm.runInContext(content.slice(0,early)+'\n'+content.slice(start,end)+
  '\nthis.keys=QUICK_KEYS; this.packs=QUICK_TRANSLATIONS; this.lookup=quickText; this.refresh=quickL10n;',context);

test('German Spanish French have a complete 36-key quick training pack',()=>{
  assert.equal(context.keys.length,36);
  for(const lang of ['de','es','fr']) {
    const a=context.packs[lang];
    assert.ok(Array.isArray(a),'Missing locale '+lang);
    assert.equal(a.length,36,lang+' number of translations');
    assert.ok(a.every(v=>typeof v==='string'&&v.trim()),lang+' empty translation');
  }
});

test('real quickText lookup translates the functional labels',()=>{
  const samples={
    de:['Schnelltraining','Training beenden','Aktuelles Training beenden?'],
    es:['Entrenamiento rápido','Terminar entrenamiento','¿Terminar el entrenamiento actual?'],
    fr:['Entraînement rapide','Terminer l’entraînement','Terminer l’entraînement en cours ?']
  };
  for(const [lang,expected] of Object.entries(samples)) {
    cfg.lang=lang;
    assert.equal(context.lookup('trainingTitle'),expected[0]);
    assert.equal(context.lookup('stopTraining'),expected[1]);
    assert.equal(context.lookup('cancelPrompt'),expected[2]);
  }
});

test('language switching updates visible quick training text and placeholder',()=>{
  for(const lang of ['de','es','fr','ar','en']) {
    cfg.lang=lang;
    context.refresh();
    assert.equal(elements.title.textContent,context.lookup('trainingTitle'));
    assert.equal(elements.rest.textContent,context.lookup('rest'));
    assert.equal(elements.placeholder.placeholder,context.lookup('exercisePlaceholder'));
  }
  assert.equal(refreshCount,15);
});

test('missing language falls back to English without writing user content',()=>{
  cfg.lang='it';
  assert.equal(context.lookup('trainingTitle'),'Quick training');
  assert.equal(context.lookup('unknownKey'),'unknownKey');
  assert.equal(context.lookup('trainingSubtitle'),'Custom work-and-rest intervals');
});
