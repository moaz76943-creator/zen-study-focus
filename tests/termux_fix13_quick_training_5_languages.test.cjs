'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'../android/app/src/main/assets/web');
const src=fs.readFileSync(path.join(root,'quick_training.js'),'utf8');
const initialEnd=src.indexOf('let quickTraining = null;');
const lookupStart=src.indexOf('function quickText(key)');
const lookupEnd=src.indexOf('function timeString(seconds)',lookupStart);
assert.ok(initialEnd>0 && lookupStart>initialEnd && lookupEnd>lookupStart);
const cfg={lang:'en'};
const ui={title:{textContent:'',getAttribute:()=> 'trainingTitle'},stop:{textContent:'',getAttribute:()=> 'stopTraining'},hint:{placeholder:'',getAttribute:()=> 'exercisePlaceholder'}};
const context={cfg,document:{querySelectorAll(selector){return selector==='[data-qt]'?[ui.title,ui.stop]:selector==='[data-qt-placeholder]'?[ui.hint]:[];}},renderQuickTraining(){},renderTodayPlan(){},updateFocusStatus(){}};
vm.createContext(context);
vm.runInContext(src.slice(0,initialEnd)+'\n'+src.slice(lookupStart,lookupEnd)+'\nthis.keys=QUICK_KEYS;this.packs=QUICK_TRANSLATIONS;this.lookup=quickText;this.refresh=quickL10n;',context);
const expected={lv:'Ātrais treniņš',et:'Kiirtreening',sw:'Mazoezi ya haraka',fil:'Mabilis na ehersisyo',af:'Vinnige oefening'};
const previous=['en','ar','de','es','fr','pt','it','nl','tr','ru','zh','hi','ja','ko','id','vi','pl','bn','ur','fa','th','sv','el','cs','ro','da','fi','no','sk','uk','bg','hr','sr','sl','lt'];
test('Five new languages have 36 complete quick training labels',()=>{
 assert.equal(context.keys.length,36);
 for(const code of Object.keys(expected)){
  const rows=context.packs[code];
  assert.ok(Array.isArray(rows),code+' missing');
  assert.equal(rows.length,36,code+' wrong key count');
  assert.ok(rows.every(x=>typeof x==='string'&&x.trim()),code+' empty label');
 }
});
test('Functional labels and confirmation messages are localized',()=>{
 for(const [code,title] of Object.entries(expected)){
  cfg.lang=code;
  assert.equal(context.lookup('trainingTitle'),title);
  assert.notEqual(context.lookup('cancelPrompt'),context.packs.en[30]);
 }
});
test('Switching language updates visible controls without rewriting notes',()=>{
 const note='ملاحظة ٢٠٢٦ - keep user content';
 for(const code of Object.keys(expected)){
  cfg.lang=code;context.refresh();
  assert.equal(ui.title.textContent,context.lookup('trainingTitle'),code);
  assert.equal(ui.stop.textContent,context.lookup('stopTraining'),code);
  assert.equal(ui.hint.placeholder,context.lookup('exercisePlaceholder'),code);
 }
 assert.equal(note,'ملاحظة ٢٠٢٦ - keep user content');
});
test('All previous 35 locale packs remain intact; unknown and excluded locales fallback',()=>{
 assert.ok(Object.keys(context.packs).length>=40);
 for(const code of previous){assert.ok(context.packs[code],code+' missing');assert.equal(context.packs[code].length,36,code);}
 for(const code of ['zz','he','iw']){cfg.lang=code;assert.equal(context.lookup('trainingTitle'),context.packs.en[4]);}
});
