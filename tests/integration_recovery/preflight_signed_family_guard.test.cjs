'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const D = require('../../android/app/src/main/assets/web/data_compat_v21.js');
const Preflight = require('../../android/app/src/main/assets/web/preflight_v22.js');

function storage(packets = {}) {
  const data = new Map(Object.entries(packets));
  const before = [...data];
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: () => { throw new Error('Preflight must never write user data'); },
    removeItem: () => { throw new Error('Preflight must never remove user data'); },
    unchanged: () => assert.deepEqual([...data], before)
  };
}
function family(slot, value, mirrorValue = value) {
  const key = D.KEYS[slot];
  return storage({[key]: D.encodePacket(value),
    [key + '_mirror']: D.encodePacket(mirrorValue)});
}

test('checksum-valid wrong v21 family shapes block startup before any writes', () => {
  for (const [slot, value, code] of [
    ['cfg', [], 'INVALID_CFG'],
    ['tasks', {id:1,title:'bad',done:false}, 'INVALID_TASKS'],
    ['notes', {id:2,title:'bad',body:'x'}, 'INVALID_NOTES'],
    ['notes', [{id:2,title:'bad',body:[]}], 'INVALID_BODY']
  ]) {
    const state = family(slot, value);
    const result = Preflight.inspect(state);
    assert.equal(result.ok, false, slot);
    assert.equal(result.kind, 'data');
    assert.ok(result.issues.some(v => String(v).includes(code)), slot + ' error');
    state.unchanged();
  }
});

test('healthy families, absent slots and historic duplicate warnings remain accepted', () => {
  const samples = [
    storage(),
    family('tasks', [{id:1,title:'Keep',done:false}]),
    family('notes', [{id:2,title:'Keep',body:'User note'}]),
    family('tasks', [{id:1,title:'a',done:false},{id:1,title:'b',done:false}])
  ];
  for (const state of samples) {
    assert.equal(Preflight.inspect(state).ok, true);
    state.unchanged();
  }
});

test('valid mirror remains usable when the primary packet checksum fails', () => {
  const key = D.KEYS.tasks;
  const state = storage({
    [key]: '{invalid',
    [key + '_mirror']: D.encodePacket([{id:5,title:'Recovered',done:false}])
  });
  assert.equal(Preflight.inspect(state).ok, true);
  state.unchanged();
});

test('both corrupted packet copies still block as before', () => {
  const key = D.KEYS.notes;
  const state = storage({[key]:'{bad', [key+'_mirror']:'{bad'});
  const result = Preflight.inspect(state);
  assert.equal(result.ok,false);
  assert.ok(result.issues.some(v => String(v).includes('neither copy verifies')));
  state.unchanged();
});
