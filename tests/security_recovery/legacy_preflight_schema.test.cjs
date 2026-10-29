'use strict';
// Focused regression of legacy PR #141 against current production preflight.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const D=require('../../android/app/src/main/assets/web/data_compat_v21.js');
const Preflight=require('../../android/app/src/main/assets/web/preflight_v22.js');

function readOnlyStorage(data={}) {
  const values=new Map(Object.entries(data));
  return {
    getItem(key){return values.has(key)?values.get(key):null;},
    setItem(){throw new Error('Preflight must not write user data');},
    removeItem(){throw new Error('Preflight must not remove user data');}
  };
}
function v21({cfg={},tasks=[],notes=[]}={}) {
  const result={};
  for(const [key,value] of [
    [D.KEYS.cfg,cfg],
    [D.KEYS.tasks,tasks],
    [D.KEYS.notes,notes]
  ]) {
    const signed=D.encodePacket(value,123);
    result[key]=signed;
    result[key+'_mirror']=signed;
  }
  return result;
}

test('untouched fresh install stays ready without creating defaults',()=>{
  const result=Preflight.inspect(readOnlyStorage());
  assert.equal(result.ok,true);
  assert.equal(result.kind,'ready');
});

test('schema-valid signed v21 task/note families remain ready',()=>{
  const result=Preflight.inspect(readOnlyStorage(v21()));
  assert.equal(result.ok,true,JSON.stringify(result.issues));
});

test('checksum-valid wrong tasks family must block startup (legacy PR #141)',()=>{
  const bad=v21({tasks:{wrong:'not an array'}});
  const result=Preflight.inspect(readOnlyStorage(bad));
  assert.equal(result.ok,false);
  assert.equal(result.kind,'data');
  assert.ok(result.issues.some(x=>String(x).includes('INVALID_TASKS')),JSON.stringify(result.issues));
});

test('a valid primary is selected ahead of a malformed signed mirror',()=>{
  const good=v21();
  good[D.KEYS.tasks+'_mirror']=D.encodePacket({wrong:'mirror type'},124);
  assert.equal(Preflight.inspect(readOnlyStorage(good)).ok,true);
});

test('a signed but malformed primary blocks even if mirror is schema-valid',()=>{
  const data=v21();
  data[D.KEYS.tasks]=D.encodePacket({wrong:'primary type'},125);
  assert.equal(Preflight.inspect(readOnlyStorage(data)).ok,false);
});

test('invalid notes family with valid signature is also blocked',()=>{
  const result=Preflight.inspect(readOnlyStorage(v21({notes:{wrong:'notes object'}})));
  assert.equal(result.ok,false);
  assert.ok(result.issues.some(x=>String(x).includes('INVALID_NOTES')));
});
