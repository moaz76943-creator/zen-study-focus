'use strict';
// DF-PR-03 RED-first: execute the production quick-training functions, not replicas.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/quick_training.js'),'utf8');
function extract(name){
  const token='function '+name+'(';
  const start=source.indexOf(token);
  if(start<0)return '';
  const end=source.indexOf('\nfunction ',start+token.length);
  return source.slice(start,end<0?source.length:end);
}
function fixture(fail=false,throws=false){
  const fields=new Map(),messages=[],writes=[],rendered=[];
  const el=id=>{
    if(!fields.has(id))fields.set(id,{value:'',checked:false});
    return fields.get(id);
  };
  el('qtSets').value='4';el('qtWork').value='04:00';
  el('qtRest').value='01:00';el('qtSkipLast').checked=false;
  el('qtNewExercise').value='Jump';
  const context={
    document:{getElementById:el},
    quickExercises:['Run','Walk'],quickPresetDomain:'sport',quickTraining:null,
    QUICK_CFG_KEY:'zen_quick_training_cfg_v21',
    L:()=>({saveFailed:'Save failed'}),cfg:{lang:'en'},
    saveFortressData:(key,value)=>{writes.push([key,JSON.parse(JSON.stringify(value))]);if(throws)throw Error('ACK rejected');return !fail;},
    showToast:msg=>messages.push(msg),renderQuickTraining:()=>rendered.push('render'),
    quickText:()=> 'Replacement requires confirmation',
    timeString:s=>String(s)
  };
  const code='let quickLastSavedFields=null;\n'+
    ['quickSaveError','quickFormFields','saveQuickConfig','addQuickExercise','removeQuickExercise','applyQuickTrainingPreset']
      .map(extract).filter(Boolean).join('\n');
  vm.createContext(context);
  vm.runInContext(code,context,{filename:'quick_training.js:production-functions'});
  return {context,fields,el,messages,writes,rendered};
}
for(const throws of [false,true]){
  test('rejected quick preferences write returns failure; thrown='+throws,()=>{
    const f=fixture(true,throws);
    assert.equal(f.context.saveQuickConfig(),false,'Never report an unacknowledged preference write');
    assert.deepEqual(f.context.quickExercises,['Run','Walk']);
  });
  test('rejected add exercise restores list and input; thrown='+throws,()=>{
    const f=fixture(true,throws);
    assert.equal(f.context.addQuickExercise(),false);
    assert.deepEqual(f.context.quickExercises,['Run','Walk']);
    assert.equal(f.el('qtNewExercise').value,'Jump');
    assert.equal(f.rendered.length,0);
    assert.ok(f.messages.includes('Save failed'));
  });
  test('rejected remove exercise does not destroy the item; thrown='+throws,()=>{
    const f=fixture(true,throws);
    assert.equal(f.context.removeQuickExercise(0),false);
    assert.deepEqual(f.context.quickExercises,['Run','Walk']);
    assert.equal(f.rendered.length,0);
  });
  test('rejected preset does not mutate the form or active domain; thrown='+throws,()=>{
    const f=fixture(true,throws);
    assert.equal(f.context.applyQuickTrainingPreset('reading'),false);
    assert.equal(f.el('qtSets').value,'4');
    assert.equal(f.el('qtWork').value,'04:00');
    assert.equal(f.el('qtRest').value,'01:00');
    assert.equal(f.context.quickPresetDomain,'sport');
  });
}
test('successful preference write preserves identity, values and opt-in fields',()=>{
  const f=fixture();
  assert.equal(f.context.saveQuickConfig(),true);
  assert.equal(f.writes.length,1);
  assert.equal(f.writes[0][0],'zen_quick_training_cfg_v21');
  assert.equal(f.writes[0][1].domain,'sport');
  assert.equal(f.writes[0][1].exercises.join('|'),'Run|Walk');
  assert.equal(f.writes[0][1].work,'04:00');
});
test('invalid exercise index is non-destructive',()=>{
  const f=fixture();
  assert.equal(f.context.removeQuickExercise(-1),false);
  assert.deepEqual(f.context.quickExercises,['Run','Walk']);
  assert.equal(f.writes.length,0);
});
