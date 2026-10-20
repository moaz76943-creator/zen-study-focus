'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/quick_training.js'),'utf8');
const c=vm.createContext({});vm.runInContext(source.slice(0,source.indexOf('let quickTraining'))+';this.rows=QUICK_TRANSLATIONS;this.keys=QUICK_KEYS;',c);
const codes='en ar es zh hi fr de ru pt ja id tr ko vi it bn ur fa pl nl'.split(' ');
test('DF-048 training has an explicit complete row for each supported locale',()=>{
 assert.deepEqual(Object.keys(c.rows).sort(),codes.sort());
 for(const [lang,row] of Object.entries(c.rows)){
  assert.equal(row.length,c.keys.length,lang);
  assert.ok(row.every(s=>typeof s==='string'&&s.trim()),lang);
  if(lang!=='en')assert.notEqual(row[c.keys.indexOf('trainingTitle')],c.rows.en[c.keys.indexOf('trainingTitle')],lang);
 }
});
test('DF-060 training preset labels retain ASCII durations and explicit seconds/minutes context',()=>{
 for(const row of Object.values(c.rows)){
  assert.ok(row[c.keys.indexOf('presetTabata')].includes('20/10'));
  assert.ok(row[c.keys.indexOf('presetWorkout')].includes('4/1'));
  assert.ok(!/[\u0660-\u0669\u06f0-\u06f9]/u.test(row.join('')));
 }
});
