'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../android/app/src/main/assets/web');
const D = require(path.join(root, 'data_compat_v21.js'));
const Preflight = require(path.join(root, 'preflight_v22.js'));

function fixture(override = {}) {
  const packets = {};
  const original = {
    cfg: {lang: 'en', sessionHistory: [], unknownConfig: {keep: true}},
    tasks: [{id: 7, title: 'Keep task', done: false, unknownTask: 5}],
    notes: [{id: 9, title: 'Keep note', body: 'Original العربية', unknownNote: 8}]
  };
  for (const [slot, key] of Object.entries(D.KEYS)) {
    const payload = Object.hasOwn(override, slot) ? override[slot] : original[slot];
    packets[key] = D.encodePacket(payload);
    packets[key + '_mirror'] = D.encodePacket(
      Object.hasOwn(override, slot + '_mirror') ? override[slot + '_mirror'] : payload
    );
  }
  return backedStorage(packets);
}
function backedStorage(values = {}) {
  const map = new Map(Object.entries(values));
  const snapshot = () => [...map.entries()];
  return {
    getItem: key => map.has(key) ? map.get(key) : null,
    setItem: () => {throw Error('Preflight must never write to user storage');},
    removeItem: () => {throw Error('Preflight must never remove user storage');},
    snapshot
  };
}
test('reject checksum-valid invalid cfg/tasks/notes shapes before startup, without writes', () => {
  for (const [slot, value, expectedCode] of [
    ['cfg', [], 'INVALID_CFG'],
    ['tasks', {id: 7, title: 'not an array'}, 'INVALID_TASKS'],
    ['notes', {id: 9, title: 'not an array'}, 'INVALID_NOTES'],
    ['notes', [{id: 9, title: 'note', body: []}], 'INVALID_BODY'],
    ['tasks', [{id: '7', title: 'task', done: false}], 'INCOMPATIBLE_RECORD_ID']
  ]) {
    const storage = fixture({[slot]: value});
    const before = storage.snapshot();
    const result = Preflight.inspect(storage);
    assert.equal(result.ok, false, slot);
    assert.equal(result.kind, 'data');
    assert.ok(result.issues.some(s => String(s).includes(expectedCode)), expectedCode);
    assert.deepEqual(storage.snapshot(), before);
  }
});
test('accept valid legacy records and preserve unknown fields read-only', () => {
  const storage = fixture();
  const before = storage.snapshot();
  assert.equal(Preflight.inspect(storage).ok, true);
  assert.deepEqual(storage.snapshot(), before);
});
test('allow a new install and missing families without materializing defaults', () => {
  const empty = backedStorage();
  assert.equal(Preflight.inspect(empty).ok, true);
  assert.deepEqual(empty.snapshot(), []);
  const cfg = D.encodePacket({lang: 'ar', unknown: {keep: 1}});
  const partial = backedStorage({[D.KEYS.cfg]: cfg, [D.KEYS.cfg + '_mirror']: cfg});
  const before = partial.snapshot();
  assert.equal(Preflight.inspect(partial).ok, true);
  assert.deepEqual(partial.snapshot(), before);
});
test('accept historical duplicate numeric task IDs without changing them', () => {
  const storage = fixture({tasks: [
    {id: 3, title: 'First', done: false},
    {id: 3, title: 'Historical duplicate', done: true, extra: 'keep'}
  ]});
  const before = storage.snapshot();
  assert.equal(Preflight.inspect(storage).ok, true);
  assert.deepEqual(storage.snapshot(), before);
});
test('invalid checksum-valid primary cannot bypass validation using healthy mirror', () => {
  const storage = fixture({tasks: {unexpected: true},
    tasks_mirror: [{id: 7, title: 'Mirror', done: false}]});
  const before = storage.snapshot();
  const result = Preflight.inspect(storage);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(s => String(s).includes('INVALID_TASKS')));
  assert.deepEqual(storage.snapshot(), before);
});
test('invalid unsigned primary can fall back to a checksum-valid mirror', () => {
  const validMirror = D.encodePacket([{id: 7, title: 'Mirror', done: false}]);
  const empty = fixture();
  const packets = Object.fromEntries(empty.snapshot());
  packets[D.KEYS.tasks] = 'corrupted-but-retained';
  packets[D.KEYS.tasks + '_mirror'] = validMirror;
  const storage = backedStorage(packets);
  const before = storage.snapshot();
  assert.equal(Preflight.inspect(storage).ok, true);
  assert.deepEqual(storage.snapshot(), before);
});
