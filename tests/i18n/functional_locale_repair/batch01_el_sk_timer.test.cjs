'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');

const root=path.resolve(__dirname,'../../..');
const sourcePath=path.join(root,'assets/i18n/df99_reviewed_packs.json');
const runtimePath=path.join(root,'android/app/src/main/assets/web/js/df99_reviewed_packs.js');
const bridgePath=path.join(root,'android/app/src/main/assets/web/js/df99_multiscreen_i18n.js');
const keys=Array.from({length:11},(_,i)=>String(i));
const locales=['el','sk'];
const english=['Customize','Focus & break settings','The current session stays unchanged',
  'Focus','Short break','Long break','Sessions per cycle','Defaults','Save',
  'Use whole numbers','Settings saved'];

test('DF13-E batch01: Greek and Slovak Timer dictionaries contain all 11 actual labels',()=>{
  const packs=JSON.parse(fs.readFileSync(sourcePath,'utf8'));
  for(const lang of locales){
    assert.ok(packs[lang],lang+' missing');
    assert.ok(packs[lang].timer,lang+'/timer missing');
    assert.deepEqual(Object.keys(packs[lang].timer).sort(),keys.slice().sort(),lang+'/timer keys');
    for(const key of keys){
      const v=packs[lang].timer[key];
      assert.equal(typeof v,'string',lang+'/'+key);
      assert.ok(v.trim(),lang+'/'+key+' blank');
      assert.doesNotMatch(v,/[٠-٩۰-۹]/u,lang+'/'+key+' non-Western numeral');
      assert.doesNotMatch(v,/<\/?(?:script|style|iframe|img)\b/i,lang+'/'+key+' markup');
      assert.deepEqual((v.match(/\{[A-Za-z][A-Za-z0-9_]*\}/g)||[]),[],lang+'/'+key+' unexpected placeholders');
      assert.notEqual(v,english[Number(key)],lang+'/'+key+' is an English placeholder');
    }
  }
  assert.match(packs.el.timer['10'],/αποθηκεύτηκαν/u,'Greek success message must say saved');
  assert.match(packs.sk.timer['10'],/uložené/iu,'Slovak success message must say saved');
  assert.equal(packs.he,undefined);
  assert.equal(packs.iw,undefined);
});

test('DF13-E batch01: official source generator reproduces committed runtime byte-for-byte',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'df13-e-'));
  try{
    const target=path.join(directory,'generated.js');
    execFileSync(process.execPath,[path.join(root,'tools/df99_bulk_import.cjs'),sourcePath,target],{cwd:root,stdio:'pipe'});
    assert.equal(fs.readFileSync(target,'utf8'),fs.readFileSync(runtimePath,'utf8'),
      'Generated runtime changed without rerunning tools/df99_bulk_import.cjs');
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

test('DF13-E batch01: actual runtime resolves newly translated strings, not fallback text',()=>{
  const context={window:{},console};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(bridgePath,'utf8'),context);
  vm.runInContext(fs.readFileSync(runtimePath,'utf8'),context);
  const t=context.window.DF99Locale.t;
  const packs=JSON.parse(fs.readFileSync(sourcePath,'utf8'));
  for(const lang of locales)for(const key of keys){
    assert.equal(t(lang,'timer',key,'FALLBACK'),packs[lang].timer[key],lang+'/timer/'+key);
    assert.notEqual(t(lang,'timer',key,'FALLBACK'),'FALLBACK',lang+'/'+key);
  }
  assert.equal(t('he','timer','0','FALLBACK'),'FALLBACK');
  assert.equal(t('iw','timer','0','FALLBACK'),'FALLBACK');
});
