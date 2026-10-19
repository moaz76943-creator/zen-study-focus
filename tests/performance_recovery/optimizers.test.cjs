'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { windowRange, createLatestScheduler, createListenerScope } = require('./optimizers.cjs');

test('windowRange bounds a 5000-row list without mutating or copying source records', () => {
  const input = Array.from({length: 5000}, (_, i) => ({id:i}));
  const page = windowRange(input, 4980, 40, 80);
  assert.equal(page.total, 5000);
  assert.equal(page.offset, 4980);
  assert.equal(page.items.length, 20);
  assert.equal(page.items[0], input[4980]);
  assert.deepEqual(windowRange(input, -20, 999, 40).items, input.slice(0, 40));
  assert.equal(input.length, 5000);
});
test('latest-only scheduler coalesces typing, updates the last query and cancels after dispose', () => {
  const tasks = new Map(); let serial = 0;
  const schedule = fn => {const id=++serial;tasks.set(id,fn);return id;};
  const cancel = id => tasks.delete(id);
  const ran = [];
  const s = createLatestScheduler(v => ran.push(v), {schedule,cancel});
  for (const word of ['s','st','stu','study']) s.request(word);
  assert.equal(tasks.size, 1);
  for (const fn of [...tasks.values()]) fn();
  assert.deepEqual(ran, ['study']);
  s.request('new'); s.dispose();
  assert.equal(tasks.size,0);
  assert.deepEqual(ran, ['study']);
  assert.equal(s.request('ignored'),false);
});
test('event scope prevents duplicate subscriptions and tears down once', () => {
  const active=new Set();
  const target={addEventListener(type,handler){active.add(handler);},removeEventListener(type,handler){active.delete(handler);}};
  const h=()=>{};
  const scope=createListenerScope();
  assert.equal(scope.listen(target,'input',h),true);
  assert.equal(scope.listen(target,'input',h),false);
  assert.equal(active.size,1);
  scope.dispose();scope.dispose();
  assert.equal(active.size,0);
  assert.equal(scope.listen(target,'input',h),false);
});