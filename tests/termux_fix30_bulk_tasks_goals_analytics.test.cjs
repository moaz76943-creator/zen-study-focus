"use strict";
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const packs=JSON.parse(fs.readFileSync('assets/i18n/df99_reviewed_packs.json','utf8'));
const TASK_KEYS='title subtitle add project today search all board matrix trash calendar undo redo empty task desc due time cat priority estimate repeat group notes proj none save cancel focus edit done resume archive remove restore addCheck check sub study sport review exam todo doing completed archived low medium high urgent daily weekly monthly never allCategories estimated actual overdue do schedule delegate eliminate invalid notConnected'.split(' ');
const GOAL_KEYS='kicker heading desc edit modal hint save invalid noGoal minute done today week weekTarget weekInvalid'.split(' ');
const ANALYTICS_KEYS='title activity period start end minutes sessions average streak noData goal noGoals tasks chart year export details'.split(' ');
const DOMAIN_KEYS='study read work sport'.split(' ');
const tasks=['fil','sw','el','sk','fa'];
const analytics=['fil','sw','el','sk','fa','zh','ja','ko','hi','id'];
function runtime(){
  const cx={window:{},console};vm.createContext(cx);
  vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_multiscreen_i18n.js','utf8'),cx);
  vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_reviewed_packs.js','utf8'),cx);
  return cx.window.DF99Locale.t;
}
test('batch30 provides native 64-key task dictionaries for five languages',()=>{
  for(const code of tasks){
    assert.ok(packs[code]?.tasks,'MISSING_BATCH30 '+code+'/tasks');
    const dict=packs[code].tasks;
    assert.deepEqual(Object.keys(dict).sort(),TASK_KEYS.slice().sort(),code+' task keys');
    assert.ok(Object.values(dict).every(x=>typeof x==='string'&&x.trim()),code+' blank tasks');
    assert.notEqual(dict.title,'Tasks Studio',code+' task title copied');
  }
});
test('batch30 provides full 15-key goal dictionaries for five languages',()=>{
  for(const code of tasks){
    const d=packs[code]?.goals;
    assert.ok(d,'MISSING_BATCH30 '+code+'/goals');
    assert.deepEqual(Object.keys(d).sort(),GOAL_KEYS.slice().sort());
    assert.ok(Object.values(d).every(x=>typeof x==='string'&&x.trim()));
  }
});
test('batch30 provides complete analytics and activity domains for ten languages',()=>{
  for(const code of analytics){
    assert.ok(packs[code]?.analytics,'MISSING_BATCH30 '+code+'/analytics');
    assert.ok(packs[code]?.analyticsDomain,'MISSING_BATCH30 '+code+'/analyticsDomain');
    assert.deepEqual(Object.keys(packs[code].analytics).sort(),ANALYTICS_KEYS.slice().sort());
    assert.deepEqual(Object.keys(packs[code].analyticsDomain).sort(),DOMAIN_KEYS.slice().sort());
    for(const family of ['analytics','analyticsDomain']){
      const vals=Object.values(packs[code][family]);
      assert.ok(vals.every(x=>typeof x==='string'&&x.trim()));
      for(const x of vals)assert.doesNotMatch(x,/[\u0660-\u0669\u06F0-\u06F9]|<\/?(?:script|style|iframe)/i);
    }
  }
});
test('all 605 added translations resolve from the offline runtime',()=>{
  const t=runtime();let count=0;
  for(const code of analytics){
    const families=code in Object.fromEntries(tasks.map(x=>[x,true]))
      ? ['tasks','goals','analytics','analyticsDomain'] : ['analytics','analyticsDomain'];
    for(const family of families)for(const [key,v] of Object.entries(packs[code][family])){
      assert.equal(t(code,family,key,'fallback'),v,code+'/'+family+'/'+key); count++;
    }
  }
  assert.equal(count,605);
  for(const code of ['he','iw','zz'])assert.equal(t(code,'analytics','title','fallback'),'fallback');
  assert.equal(t('fil','analytics','not_a_real_key','fallback'),'fallback');
  assert.equal(t('hi','tasks','title','fallback'),'fallback');
  assert.equal(t('vi','tasks','title','fallback'),'fallback');
});
test('prior 4755 strings survive without unsafe runtime or fabricated completeness',()=>{
  const total=Object.values(packs).reduce((n,s)=>n+Object.values(s).reduce((m,dict)=>m+Object.keys(dict).length,0),0);
  assert.ok(total>=5360,'Expected at least 5360 translations after batch30: '+total);
  for(const code of ['de','es','fr','it','pt','tr','ru','nl','sv','da','no','fi','pl','uk','ro','cs','hu'])
    assert.ok(packs[code]?.timer,'Missing earlier timer pack '+code);
  for(const code of ['he','iw'])assert.equal(packs[code],undefined);
  for(const code of analytics)assert.ok(packs[code]?.notes,'Earlier notes lost: '+code);
  const js=fs.readFileSync('android/app/src/main/assets/web/js/df99_reviewed_packs.js','utf8');
  assert.doesNotMatch(js,/\b(?:localStorage|indexedDB|XMLHttpRequest|fetch\s*\()\b/);
});
test('selected action labels keep their intended meaning',()=>{
  assert.equal(packs.fil.tasks.cancel,'Kanselahin');
  assert.equal(packs.sw.goals.save,'Malengo yamehifadhiwa');
  assert.equal(packs.el.analytics.title,'Καταγεγραμμένα στατιστικά');
  assert.equal(packs.sk.tasks.save,'Uložiť');
  assert.equal(packs.fa.tasks.save,'ذخیره');
  assert.equal(packs.zh.analytics.export,'导出 CSV');
  assert.equal(packs.ja.analytics.export,'CSV をエクスポート');
  assert.equal(packs.ko.analytics.title,'기록된 분석');
  assert.equal(packs.hi.analytics.noData,'इस अवधि में कोई सत्र दर्ज नहीं है');
  assert.equal(packs.id.analytics.title,'Analitik tercatat');
});
