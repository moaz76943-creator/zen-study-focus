'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '../android/app/src/main/assets/web');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js/deep_focus_runtime_activator.js'), 'utf8');

test('Cancel is never globally overridden into Yes', () => {
  let win = {confirm: () => false};
  const start = app.indexOf('const HabitFocusEngine');
  assert.ok(start > 0);
  vm.runInNewContext(app.slice(0, start), {window:win});
  assert.equal(win.confirm('Discard an active session?'), false);
});

test('25-minute kickstart selects real timer and respects cancellation', () => {
  const start=app.indexOf('  function showKickstartPrompt() {');
  const end=app.indexOf('\n  return {\n    getStreakData', start);
  assert.ok(start >= 0 && end > start, 'Expected kickstart implementation');
  function verify(allow) {
    let selected=0, started=0, removed=0;
    const btns={};
    const modal={style:{}, className:'', innerHTML:'', remove(){removed++;},querySelector(id){return btns[id] ||= {};}};
    const document={createElement(){return modal;},body:{appendChild(){}}};
    const ctx={document,window:{},timerRunning:false,
      selectHomeQuickSession(n){assert.equal(n,25);selected++;return allow;},
      toggleTimerPlay(){started++;}};
    vm.runInNewContext(app.slice(start,end) + '\nshowKickstartPrompt();',ctx);
    assert.equal(typeof btns['#df-extend-25m'].onclick,'function');
    btns['#df-extend-25m'].onclick();
    assert.equal(selected,1);
    assert.equal(started,allow?1:0);
    assert.equal(removed,allow?1:0);
  }
  verify(true);
  verify(false);
});

test('Generated date digits change, user-authored note digits never change', () => {
  const note={value:'مهمة ٢٠٢٦',textContent:'مهمة ٢٠٢٦'};
  const date={value:'٢٠٢٦-١٠-٢٥',textContent:''};
  const display={value:'',textContent:'اليوم ٢٥'};
  const listeners={};
  const document={addEventListener(k,fn){listeners[k]=fn;},querySelectorAll(selector){
    if(selector.includes('.sound-card'))return [];
    const result=[];
    if(selector.includes('input[type="text"]') || selector.includes('textarea'))result.push(note);
    if(selector.includes('input[type="date"]'))result.push(date);
    if(selector.includes('.date-display'))result.push(display);
    return result;
  }};
  vm.runInNewContext(runtime,{window:{},document,Audio:class{}});
  listeners.DOMContentLoaded();
  assert.equal(note.value,'مهمة ٢٠٢٦');
  assert.equal(note.textContent,'مهمة ٢٠٢٦');
  assert.equal(date.value,'2026-10-25');
  assert.equal(display.textContent,'اليوم 25');
});
