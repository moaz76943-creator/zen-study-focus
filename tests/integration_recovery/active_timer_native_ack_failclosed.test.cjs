'use strict';
// P0 regression: never acknowledge an Android active-timer snapshot without a native fsync receipt.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.resolve(__dirname, '../../android/app/src/main/assets/web/app.js'), 'utf8');
const start = app.indexOf('function saveFortressData(key, obj) {');
const end = app.indexOf('\nfunction loadFortressData(', start);
assert.ok(start >= 0 && end > start, 'Extract the actual production save function');
const actualSave = app.slice(start, end);
const KEY = 'zen_fortress_active_timer_v21';

function fixture(nativeBridge, seed = {}) {
  const values = new Map(Object.entries(seed));
  const calls = [];
  const localStorage = {
    getItem(k) { return values.has(k) ? values.get(k) : null; },
    setItem(k, v) { calls.push(['set', k]); values.set(k, String(v)); },
    removeItem(k) { calls.push(['remove', k]); values.delete(k); }
  };
  const context = vm.createContext({
    localStorage, JSON, Date,
    computeHash: value => 'test-signature:' + value,
    window: nativeBridge === null ? {} : {ZenNative: nativeBridge}
  });
  vm.runInContext(actualSave, context, {filename: 'app.js:saveFortressData'});
  return {save: (key, obj) => context.saveFortressData(key, obj), values, calls};
}

test('P0: Android bridge without acknowledgeTimerV21 must reject and restore both packets', () => {
  const f = fixture({someOtherMethod() {}}, {[KEY]:'old-primary', [KEY + '_mirror']:'old-mirror'});
  assert.throws(() => f.save(KEY, {remaining: 12}), /TIMER_NATIVE_ACK_(UNAVAILABLE|FAILED)/);
  assert.equal(f.values.get(KEY), 'old-primary');
  assert.equal(f.values.get(KEY + '_mirror'), 'old-mirror');
});

test('P0: explicit false native timer receipt rejects and rolls back both packets', () => {
  let count = 0;
  const f = fixture({acknowledgeTimerV21() { count++; return false; }}, {[KEY]:'old-a', [KEY + '_mirror']:'old-b'});
  assert.throws(() => f.save(KEY, {remaining: 13}), /TIMER_NATIVE_ACK_FAILED/);
  assert.equal(count, 1);
  assert.equal(f.values.get(KEY), 'old-a');
  assert.equal(f.values.get(KEY + '_mirror'), 'old-b');
});

test('P0: throwing native timer bridge rejects and rolls back both packets', () => {
  const f = fixture({acknowledgeTimerV21() { throw Error('native disk unavailable'); }}, {[KEY]:'old-a', [KEY + '_mirror']:'old-b'});
  assert.throws(() => f.save(KEY, {remaining: 14}), /native disk unavailable/);
  assert.equal(f.values.get(KEY), 'old-a');
  assert.equal(f.values.get(KEY + '_mirror'), 'old-b');
});

test('P0: verified true receipt writes identical primary/mirror packets', () => {
  const received = [];
  const f = fixture({acknowledgeTimerV21(a,b) { received.push([a,b]); return true; }});
  assert.equal(f.save(KEY, {remaining: 15}), true);
  assert.equal(received.length, 1);
  assert.equal(received[0][0], received[0][1]);
  assert.equal(f.values.get(KEY), received[0][0]);
  assert.equal(f.values.get(KEY + '_mirror'), received[0][1]);
});

test('P0: non-Android browser without ZenNative retains legacy local-only save', () => {
  const f = fixture(null);
  assert.equal(f.save(KEY, {remaining: 16}), true);
  assert.equal(f.values.get(KEY), f.values.get(KEY + '_mirror'));
});

test('P0: failed native receipt on first write restores originally absent packets', () => {
  const f = fixture({acknowledgeTimerV21() { return false; }});
  assert.throws(() => f.save(KEY, {remaining: 17}), /TIMER_NATIVE_ACK_FAILED/);
  assert.equal(f.values.has(KEY), false);
  assert.equal(f.values.has(KEY + '_mirror'), false);
});
