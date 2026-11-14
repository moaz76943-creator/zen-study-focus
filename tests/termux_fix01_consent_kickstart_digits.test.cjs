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
    const byId={};
    const makeEl=()=>{const el={style:{},className:'',textContent:'',id:'',attrs:{},children:[],
      setAttribute(k,v){this.attrs[k]=v;},appendChild(c){this.children.push(c);return c;},
      remove(){removed++;}};
      return new Proxy(el,{set(t,k,v){t[k]=v;if(k==='id')byId[v]=t;return true;}});};
    const document={createElement:makeEl,body:{appendChild(){}}};
    const ctx={document,window:{},timerRunning:false,
      selectHomeQuickSession(n){assert.equal(n,25);selected++;return allow;},
      toggleTimerPlay(){started++;}};
    vm.runInNewContext(app.slice(start,end) + '\nshowKickstartPrompt();',ctx);
    const extend=byId['df-extend-25m'];
    assert.ok(extend,'extend button is built');
    assert.equal(extend.attrs['data-i18n'],'kickstartExtend25m');
    assert.equal(typeof extend.onclick,'function');
    extend.onclick();
    assert.equal(selected,1);
    assert.equal(started,allow?1:0);
    assert.equal(removed,allow?1:0);
    // "Take a break" only dismisses; it never starts the timer.
    const close=byId['df-kickstart-close'];
    assert.equal(typeof close.onclick,'function');
    const before=started;close.onclick();
    assert.equal(started,before);
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
  vm.runInNewContext(runtime,{window:{requestAnimationFrame:fn=>fn()},document,Audio:class{}});
  listeners.DOMContentLoaded();
  assert.equal(note.value,'مهمة ٢٠٢٦');
  assert.equal(note.textContent,'مهمة ٢٠٢٦');
  // Native date inputs are normalised by the main app handler, never rewritten by the activator (it wiped fields).
  assert.equal(date.value,'٢٠٢٦-١٠-٢٥');
  assert.equal(display.textContent,'اليوم 25');
});
