'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../android/app/src/main/assets/web');
const D = require(path.join(root, 'data_compat_v21.js'));
const Preflight = require(path.join(root, 'preflight_v22.js'));

function storage() {
  const data = new Map();
  return {
    data,
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); }
  };
}
function put(s, slot, value) {
  const key = D.KEYS[slot], packet = D.encodePacket(value, 1);
  s.setItem(key, packet);
  s.setItem(key + '_mirror', packet);
}
function snapshot(s) {return JSON.stringify([...s.data]);}
const task = {id:7,title:'عنوان محفوظ',done:false};
const note = {id:8,title:'Note',body:'Saved'};
function seeded() {
  const s = storage();
  put(s,'cfg',{lang:'ar',sessions:2,extra:{preserve:true}});
  put(s,'tasks',[task]);
  put(s,'notes',[note]);
  return s;
}
test('signed but invalid v21 family shapes block startup without mutating packets', () => {
  for (const [slot,value,code] of [
    ['cfg',[],'INVALID_CFG'],
    ['tasks',{id:7,title:'Object, not array',done:false},'INVALID_TASKS'],
    ['notes',{id:8,title:'Object, not array',body:'Text'},'INVALID_NOTES'],
    ['notes',[{id:8,title:'Bad body',body:[]}],'INVALID_BODY'],
    ['tasks',[{id:'7',title:'Bad record ID',done:false}],'INCOMPATIBLE_RECORD_ID']
  ]) {
    const s = seeded(); put(s,slot,value);
    s.setItem('zen_fortress_active_timer_v21','{"remaining":125}');
    const before = snapshot(s), report = Preflight.inspect(s);
    assert.equal(report.ok,false,slot+' must be blocked despite a valid checksum');
    assert.equal(report.kind,'data');
    assert.ok(report.issues.some(x=>String(x).includes(code)),code+' must be diagnosed');
    assert.equal(snapshot(s),before,'preflight must not rewrite user data');
  }
});
test('valid legacy partial install and fresh install stay untouched', () => {
  const s = storage();
  assert.equal(Preflight.inspect(s).ok,true);
  assert.equal(s.data.size,0);
  put(s,'cfg',{lang:'de',unknown:{retain:3}});
  const before=snapshot(s);
  assert.equal(Preflight.inspect(s).ok,true);
  assert.equal(snapshot(s),before);
});
test('invalid primary uses valid mirror but signed wrong-shaped primary never overwrites it', () => {
  const s=seeded(), key=D.KEYS.tasks;
  s.setItem(key,'{broken');
  assert.equal(Preflight.inspect(s).ok,true);
  s.setItem(key,D.encodePacket({invalid:'shape'}));
  const before=snapshot(s);
  assert.equal(Preflight.inspect(s).ok,false);
  assert.equal(snapshot(s),before);
});
test('warnings for historical duplicate numeric IDs do not cause destructive repair', () => {
  const s=seeded(); put(s,'tasks',[task,{...task,title:'Historic duplicate',extra:{retain:1}}]);
  const before=snapshot(s);
  assert.equal(Preflight.inspect(s).ok,true);
  assert.equal(snapshot(s),before);
});
test('unrecoverable checksum and interrupted journal remain blocked without writes', () => {
  const s=seeded(),key=D.KEYS.notes;
  s.setItem(key,'broken'); s.setItem(key+'_mirror','broken');
  const before=snapshot(s);
  assert.equal(Preflight.inspect(s).ok,false);
  assert.equal(snapshot(s),before);
  const clean=seeded();
  clean.setItem(D.JOURNAL_KEY,'not valid JSON');
  const journal=Preflight.inspect(clean);
  assert.equal(journal.ok,false); assert.equal(journal.kind,'journal');
});