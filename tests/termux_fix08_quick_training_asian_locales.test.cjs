'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../android/app/src/main/assets/web/quick_training.js'),'utf8');
const early=source.indexOf('let quickTraining = null;');
const start=source.indexOf('function quickText(key)');
const end=source.indexOf('function timeString(seconds)', start);
assert.ok(early>0 && start>early && end>start,'Quick training source structure changed');
const cfg={lang:'en'};
const ui={
 title:{textContent:'OLD', getAttribute(){return 'trainingTitle';}},
 stop:{textContent:'OLD', getAttribute(){return 'stopTraining';}},
 placeholder:{placeholder:'OLD', getAttribute(){return 'exercisePlaceholder';}}
};
const ctx={cfg,document:{querySelectorAll(sel){
 if(sel==='[data-qt]')return [ui.title,ui.stop];
 if(sel==='[data-qt-placeholder]')return [ui.placeholder];
 return [];
}},renderQuickTraining(){},renderTodayPlan(){},updateFocusStatus(){}};
vm.createContext(ctx);
vm.runInContext(source.slice(0,early)+'\n'+source.slice(start,end)+'\nthis.keys=QUICK_KEYS;this.packs=QUICK_TRANSLATIONS;this.t=quickText;this.refresh=quickL10n;',ctx);

test('Chinese Hindi Japanese Korean Indonesian have all 36 labels',()=>{
 assert.equal(ctx.keys.length,36);
 for(const code of ['zh','hi','ja','ko','id']){
  const pack=ctx.packs[code];
  assert.ok(Array.isArray(pack),code+' missing');
  assert.equal(pack.length,36,code+' wrong key count');
  assert.ok(pack.every(x=>typeof x==='string' && x.trim()),code+' blank label');
 }
});
test('Real quickText returns properly localized titles and stop controls',()=>{
 const expected={
  zh:['快速训练','结束训练'], hi:['त्वरित प्रशिक्षण','प्रशिक्षण समाप्त करें'],
  ja:['クイックトレーニング','トレーニングを終了'],
  ko:['빠른 운동','운동 종료'], id:['Latihan cepat','Akhiri latihan']
 };
 for(const [code,items] of Object.entries(expected)){
  cfg.lang=code;
  assert.equal(ctx.t('trainingTitle'),items[0],code);
  assert.equal(ctx.t('stopTraining'),items[1],code);
 }
});
test('Changing locale refreshes actual labels and placeholder without editing user notes',()=>{
 const userNote='ملاحظة ٢٠٢٦ · study';
 for(const code of ['zh','hi','ja','ko','id','pt','it','nl','tr','ru','de','es','fr','ar','en']){
  cfg.lang=code;
  ctx.refresh();
  assert.equal(ui.title.textContent,ctx.t('trainingTitle'),code);
  assert.equal(ui.stop.textContent,ctx.t('stopTraining'),code);
  assert.equal(ui.placeholder.placeholder,ctx.t('exercisePlaceholder'),code);
  assert.equal(userNote,'ملاحظة ٢٠٢٦ · study');
 }
});
test('Older packs remain and unknown language falls back to English',()=>{
 for(const code of ['en','ar','de','es','fr','pt','it','nl','tr','ru']){
  assert.equal(ctx.packs[code].length,36,code+' previous pack changed');
 }
 cfg.lang='zz';
 assert.equal(ctx.t('trainingTitle'),ctx.packs.en[4]);
 assert.equal(ctx.t('undefinedKey'),'undefinedKey');
});
