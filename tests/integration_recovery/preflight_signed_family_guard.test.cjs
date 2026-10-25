'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const D = require('../../android/app/src/main/assets/web/data_compat_v21.js');
const P = require('../../android/app/src/main/assets/web/preflight_v22.js');

function storage(families) {
  const values = new Map();
  for (const [slot, value] of Object.entries(families)) {
    const key = D.KEYS[slot], packet = D.encodePacket(value, 123);
    values.set(key, packet);
    values.set(key + '_mirror', packet);
  }
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value),
    snapshot: () => JSON.stringify([...values])
  };
}

test('fresh v21 install and correctly shaped records can start without writes', () => {
  for (const s of [storage({}), storage({cfg:{lang:'en'}, tasks:[], notes:[]})]) {
    const before = s.snapshot();
    assert.equal(P.inspect(s).ok, true);
    assert.equal(s.snapshot(), before);
  }
});

test('checksum-valid but malformed v21 families fail closed without rewriting user data', () => {
  for (const [slot, invalid, code] of [
    ['cfg', [], 'INVALID_CFG'],
    ['tasks', {id:1, title:'not a task array'}, 'INVALID_TASKS'],
    ['notes', {id:2, body:'not a notes array'}, 'INVALID_NOTES'],
    ['notes', [{id:2, title:'N', body:[]}], 'INVALID_BODY']
  ]) {
    const s = storage({cfg:{lang:'en'}, tasks:[], notes:[]});
    const signed = D.encodePacket(invalid, 124);
    s.setItem(D.KEYS[slot], signed);
    s.setItem(D.KEYS[slot]+'_mirror', signed);
    const before = s.snapshot(), result = P.inspect(s);
    assert.equal(result.ok, false, slot);
    assert.equal(result.kind, 'data', slot);
    assert.ok(result.issues.some(issue => issue.includes(code)), slot);
    assert.equal(s.snapshot(), before, slot + ': must not mutate primary or mirror');
  }
});

test('valid mirror survives invalid checksum in primary', () => {
  const s = storage({cfg:{lang:'en'}, tasks:[], notes:[]});
  s.setItem(D.KEYS.cfg, '{"payload":"{}","sig":"BAD","ts":1}');
  const before = s.snapshot();
  assert.equal(P.inspect(s).ok, true);
  assert.equal(s.snapshot(), before);
});

test('legacy duplicate task IDs and unknown cfg fields are preserved for explicit review', () => {
  const s = storage({
    cfg:{lang:'en', unknown:{keep:true}},
    tasks:[{id:42,title:'Original',done:false},{id:42,title:'Historic duplicate',done:true}],
    notes:[]
  });
  const before = s.snapshot();
  assert.equal(P.inspect(s).ok, true);
  assert.equal(s.snapshot(), before);
});
