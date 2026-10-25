'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=JSON.parse(fs.readFileSync('assets/i18n/df99_reviewed_packs.json','utf8'));
const required=[
  'title','subtitle','add','project','today','search','all','board','matrix','trash','calendar',
  'undo','redo','empty','task','desc','due','time','cat','priority','estimate','repeat','group',
  'notes','proj','none','save','cancel','focus','edit','done','resume','archive','remove','restore',
  'addCheck','check','sub','study','sport','review','exam','todo','doing','completed','archived',
  'low','medium','high','urgent','daily','weekly','monthly','never','allCategories','estimated',
  'actual','overdue','do','schedule','delegate','eliminate','invalid','notConnected'
];
test('DF13-E batch04: all 64 Vietnamese Task labels are complete and validated',()=>{
  const task=src.vi.tasks;
  assert.ok(task,'Vietnamese Tasks reviewed pack missing');
  assert.deepEqual(Object.keys(task).sort(),required.slice().sort());
  for(const [key,value] of Object.entries(task)){
    assert.equal(typeof value,'string',key);
    assert.ok(value.trim(),key+' blank');
    assert.doesNotMatch(value,/[٠-٩۰-۹]/u,key+' digits');
    assert.doesNotMatch(value,/<\/?(?:script|style|iframe|img)\b/i,key+' markup');
    assert.deepEqual((value.match(/\{[A-Za-z][A-Za-z0-9_]*\}/g)||[]),[],key+' placeholder');
  }
  assert.equal(task.review,'Đọc sách','review must be Reading, not generic review');
  assert.equal(task.exam,'Làm việc','exam must be Work in existing activity domain');
  assert.match(task.notes,/ID/u,'Notes link field refers to numeric note ID');
  assert.match(task.notConnected,/hẹn giờ/u,'Timer integration error semantics');
  assert.equal(src.he,undefined);
  assert.equal(src.iw,undefined);
});
test('DF13-E batch04: all Vietnamese Task labels resolve via actual packaged offline runtime',()=>{
  const context={window:{},console};vm.createContext(context);
  vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_multiscreen_i18n.js','utf8'),context);
  vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_reviewed_packs.js','utf8'),context);
  for(const key of required){
    assert.equal(context.window.DF99Locale.t('vi','tasks',key,'FALLBACK'),src.vi.tasks[key],key);
    assert.notEqual(src.vi.tasks[key],'FALLBACK');
  }
});
