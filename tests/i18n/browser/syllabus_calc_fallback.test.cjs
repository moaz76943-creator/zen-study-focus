'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../../..');
const app=fs.readFileSync(path.join(root,'android/app/src/main/assets/web/app.js'),'utf8');
const begin=app.indexOf('function updateSyllabusCalc() {');
const end=app.indexOf('/* Boot Init */',begin);
assert.ok(begin>0&&end>begin,'stable source boundary required');
function run(local){
 const nodes={
  inpPagesLeft:{value:'22'},inpDailyRate:{value:'4'},
  syllabusCalcOut:{textContent:''}
 };
 const context={document:{getElementById:id=>nodes[id]},
  toWest:value=>String(value),L:()=>local,DICT:{en:{calcOutTpl:'Finished in {d} days'}},
  Math,parseInt};
 vm.runInNewContext(app.slice(begin,end)+'\nupdateSyllabusCalc()',context,{timeout:1000});
 return nodes.syllabusCalcOut.textContent;
}
test('missing es/fr/tr syllabus template cannot crash the locale switch',()=>{
 for(const code of ['es','fr','tr']){
  assert.equal(run({}), 'Finished in 6 days',code+' must show fallback, NOT a reviewed translation');
 }
});
test('authored localized syllabus template takes priority over English display fallback',()=>{
 assert.equal(run({calcOutTpl:'Terminé en {d} jours'}),'Terminé en 6 jours');
});
