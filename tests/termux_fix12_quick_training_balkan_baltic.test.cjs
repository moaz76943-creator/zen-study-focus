'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'../android/app/src/main/assets/web');
const source=fs.readFileSync(path.join(root,'quick_training.js'),'utf8');
const before=source.indexOf('let quickTraining = null;');
const start=source.indexOf('function quickText(key)');
const end=source.indexOf('function timeString(seconds)',start);
assert.ok(before>0 && start>before && end>start, 'Quick training layout changed');
const cfg={lang:'en'};
const ui={title:{textContent:'',getAttribute(){return 'trainingTitle';}},stop:{textContent:'',getAttribute(){return 'stopTraining';}},hint:{placeholder:'',getAttribute(){return 'exercisePlaceholder';}}};
const context={cfg,document:{querySelectorAll(k){if(k==='[data-qt]')return [ui.title,ui.stop];if(k==='[data-qt-placeholder]')return [ui.hint];return [];}},renderQuickTraining(){},renderTodayPlan(){},updateFocusStatus(){}};
vm.createContext(context);
vm.runInContext(source.slice(0,before)+'\n'+source.slice(start,end)+'\nthis.keys=QUICK_KEYS;this.packs=QUICK_TRANSLATIONS;this.lookup=quickText;this.refresh=quickL10n;',context);
const expected={bg:'Бърза тренировка',hr:'Brzi trening',sr:'Брзи тренинг',sl:'Hitra vadba',lt:'Greitoji treniruotė'};
const previous=['en','ar','de','es','fr','pt','it','nl','tr','ru','zh','hi','ja','ko','id','vi','pl','bn','ur','fa','th','sv','el','cs','ro','da','fi','no','sk','uk'];
test('Each of five newly supported languages contains 36 complete translations',()=>{
 assert.equal(context.keys.length,36);
 assert.equal(new Set(context.keys).size,36);
 for(const code of Object.keys(expected)){
  const words=context.packs[code];
  assert.ok(Array.isArray(words),code+' missing');
  assert.equal(words.length,36,code+' wrong length');
  assert.ok(words.every(x=>typeof x==='string'&&x.trim()),code+' empty text');
 }
});
test('Actual quickText returns new language titles and localized confirmation',()=>{
 for(const [code,title] of Object.entries(expected)){
  cfg.lang=code;
  assert.equal(context.lookup('trainingTitle'),title,code);
  assert.notEqual(context.lookup('cancelPrompt'),context.packs.en[30],code);
 }
});
test('Changing language refreshes controls but not editable user data',()=>{
 const userNote='أرقام ٢٠٢٦ لا تتغير';
 for(const code of Object.keys(expected)){
  cfg.lang=code;context.refresh();
  assert.equal(ui.title.textContent,context.lookup('trainingTitle'),code);
  assert.equal(ui.stop.textContent,context.lookup('stopTraining'),code);
  assert.equal(ui.hint.placeholder,context.lookup('exercisePlaceholder'),code);
 }
 assert.equal(userNote,'أرقام ٢٠٢٦ لا تتغير');
});
test('30 previous languages remain and excluded languages fall back safely',()=>{
 for(const code of previous){assert.ok(context.packs[code],code+' regression');assert.equal(context.packs[code].length,36,code);}
 assert.equal(Object.keys(context.packs).length,35);
 for(const code of ['zz','he','iw']){cfg.lang=code;assert.equal(context.lookup('trainingTitle'),context.packs.en[4]);}
});
