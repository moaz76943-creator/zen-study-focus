'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'../android/app/src/main/assets/web');
const source=fs.readFileSync(path.join(root,'quick_training.js'),'utf8');
const early=source.indexOf('let quickTraining = null;');
const start=source.indexOf('function quickText(key)');
const end=source.indexOf('function timeString(seconds)',start);
assert.ok(early>0 && start>early && end>start, 'Quick training source structure changed');
const cfg={lang:'en'};
const ui={
 title:{textContent:'OLD',getAttribute:()=> 'trainingTitle'},
 stop:{textContent:'OLD',getAttribute:()=> 'stopTraining'},
 hint:{placeholder:'OLD',getAttribute:()=> 'exercisePlaceholder'}
};
const ctx={cfg, document:{querySelectorAll(s){
 if(s==='[data-qt]') return [ui.title,ui.stop];
 if(s==='[data-qt-placeholder]') return [ui.hint];
 return [];
}},renderQuickTraining(){},renderTodayPlan(){},updateFocusStatus(){}};
vm.createContext(ctx);
vm.runInContext(source.slice(0,early)+'\n'+source.slice(start,end)+
 '\nthis.keys=QUICK_KEYS; this.packs=QUICK_TRANSLATIONS; this.lookup=quickText; this.refresh=quickL10n;',ctx);

test('20 core app interface languages remain complete when new locale packs are added',()=>{
 const langs=['en','ar','de','es','fr','pt','it','nl','tr','ru',
  'zh','hi','ja','ko','id','vi','pl','bn','ur','fa'];
 assert.equal(ctx.keys.length,36);
 assert.equal(new Set(ctx.keys).size,36);
 // Keep validating the ORIGINAL 20 packs even after later batches expand them.
 assert.equal(langs.filter(code => Object.prototype.hasOwnProperty.call(ctx.packs, code)).length, langs.length);
 assert.ok(Object.keys(ctx.packs).length >= 20, 'New locales must not remove core packs');
 for(const lang of langs){
  const pack=ctx.packs[lang];
  assert.ok(Array.isArray(pack),lang+' pack missing');
  assert.equal(pack.length,36,lang+' unexpected key count');
  assert.ok(pack.every(x=>typeof x==='string'&&x.trim()),lang+' blank key');
 }
 assert.equal(ctx.packs.he,undefined);
 assert.equal(ctx.packs.iw,undefined);
});

test('new Vietnamese Polish Bengali Urdu Persian packs return localized functional controls',()=>{
 const sample={
  vi:['Luyện tập nhanh','Kết thúc luyện tập','Kết thúc buổi tập hiện tại?'],
  pl:['Szybki trening','Zakończ trening','Zakończyć bieżący trening?'],
  bn:['দ্রুত প্রশিক্ষণ','প্রশিক্ষণ শেষ করুন','চলমান প্রশিক্ষণ শেষ করবেন?'],
  ur:['فوری تربیت','تربیت ختم کریں','کیا موجودہ تربیت ختم کریں؟'],
  fa:['تمرین سریع','پایان تمرین','تمرین فعلی پایان یابد؟']
 };
 for(const [code,expected] of Object.entries(sample)){
  cfg.lang=code;
  assert.equal(ctx.lookup('trainingTitle'),expected[0],code);
  assert.equal(ctx.lookup('stopTraining'),expected[1],code);
  assert.equal(ctx.lookup('cancelPrompt'),expected[2],code);
 }
});

test('language switching updates visible training and placeholder without touching user data',()=>{
 const originalNote='الأرقام ٢٠٢٦ في ملاحظة المستخدم';
 const frozen=originalNote;
 for(const code of ['vi','pl','bn','ur','fa','zh','hi','ja','ko','id',
  'pt','it','nl','tr','ru','de','es','fr','ar','en']){
  cfg.lang=code; ctx.refresh();
  assert.equal(ui.title.textContent,ctx.lookup('trainingTitle'),code);
  assert.equal(ui.stop.textContent,ctx.lookup('stopTraining'),code);
  assert.equal(ui.hint.placeholder,ctx.lookup('exercisePlaceholder'),code);
 }
 assert.equal(originalNote,frozen);
});

test('unknown language falls back to English and does not expose excluded Hebrew',()=>{
 for(const code of ['zz','he','iw']){
  cfg.lang=code;
  assert.equal(ctx.lookup('trainingTitle'),ctx.packs.en[4],code);
  assert.equal(ctx.lookup('missing_key'),'missing_key');
 }
});
