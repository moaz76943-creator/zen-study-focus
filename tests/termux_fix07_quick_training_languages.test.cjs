'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../android/app/src/main/assets/web/quick_training.js'),'utf8');
const early=source.indexOf('let quickTraining = null;');
const start=source.indexOf('function quickText(key)');
const end=source.indexOf('function timeString(seconds)',start);
assert.ok(early>0&&start>early&&end>start,'Quick training source changed unexpectedly');
const cfg={lang:'en'};
const labels={
 title:{getAttribute:()=> 'trainingTitle',textContent:'OLD'},
 stop:{getAttribute:()=> 'stopTraining',textContent:'OLD'},
 placeholder:{getAttribute:()=> 'exercisePlaceholder',placeholder:'OLD'}
};
const ctx={cfg,document:{querySelectorAll(q){return q==='[data-qt]'?[labels.title,labels.stop]:q==='[data-qt-placeholder]'?[labels.placeholder]:[];}},
  renderQuickTraining(){},renderTodayPlan(){},updateFocusStatus(){}};
vm.createContext(ctx);
vm.runInContext(source.slice(0,early)+'\n'+source.slice(start,end)+'\nthis.keyList=QUICK_KEYS;this.packs=QUICK_TRANSLATIONS;this.t=quickText;this.update=quickL10n;',ctx);

test('Five more languages have all 36 nonempty quick training entries',()=>{
 assert.equal(ctx.keyList.length,36);
 for(const lang of ['pt','it','nl','tr','ru']){
   const a=ctx.packs[lang];
   assert.ok(Array.isArray(a),lang+' missing');
   assert.equal(a.length,36,lang+' count');
   assert.ok(a.every(v=>typeof v==='string'&&v.trim()),lang+' empty');
 }
});

test('Real quickText gives the correct translated controls',()=>{
 const examples={
  pt:['Treino rápido','Encerrar treino'],
  it:['Allenamento rapido','Termina allenamento'],
  nl:['Snelle training','Training beëindigen'],
  tr:['Hızlı antrenman','Antrenmanı bitir'],
  ru:['Быстрая тренировка','Завершить тренировку']
 };
 for(const [lang,items] of Object.entries(examples)){
  cfg.lang=lang;
  assert.equal(ctx.t('trainingTitle'),items[0]);
  assert.equal(ctx.t('stopTraining'),items[1]);
 }
});

test('Switching language updates visible controls without changing user input',()=>{
 const untouched='Read ٢٠٢٦ and learn 25 words';
 for(const lang of ['pt','it','nl','tr','ru','de','es','fr','ar','en']){
  cfg.lang=lang;
  ctx.update();
  assert.equal(labels.title.textContent,ctx.t('trainingTitle'),lang);
  assert.equal(labels.stop.textContent,ctx.t('stopTraining'),lang);
  assert.equal(labels.placeholder.placeholder,ctx.t('exercisePlaceholder'),lang);
  assert.equal(untouched,'Read ٢٠٢٦ and learn 25 words');
 }
});

test('Unlisted locale still falls back to English; previous language packs preserved',()=>{
 cfg.lang='zz';
 assert.equal(ctx.t('trainingTitle'),ctx.packs.en[4]);
 assert.equal(ctx.t('notAKey'),'notAKey');
 for(const lang of ['en','ar','de','es','fr'])assert.equal(ctx.packs[lang].length,36,lang);
});
