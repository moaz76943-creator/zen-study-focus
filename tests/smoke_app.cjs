'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..', 'android/app/src/main/assets/web');
const map = new Map();
const store = new Map();
function node(id = '') {
  return {
    id, value: '', textContent: '', innerHTML: '', checked: false, style: {},
    className: '', title: '',
    classList: {add(){},remove(){},toggle(){return false;},contains(){return false;}},
    setAttribute(k,v){this[k] = v;}, getAttribute(k){return this[k];},
    appendChild(){}, addEventListener(){},
    parentElement:{querySelectorAll(){return [];}},
    querySelectorAll(){return [];},
    scrollIntoView(){}
  };
}
const document = {
  addEventListener(){},
  getElementById(id){if(!map.has(id))map.set(id,node(id));return map.get(id);},
  createElement(){return node();},
  querySelectorAll(){return []}
};
const storage = {
  getItem(key){return store.has(key)?store.get(key):null;},
  setItem(key,v){store.set(key,String(v));},
  removeItem(key){store.delete(key);}
};
const sandbox = {
  window:{scrollTo(){},confirm(){return true;}},
  document, localStorage:storage, navigator:{}, console,
  setInterval(){return 1;}, clearInterval(){},
  setTimeout(){return 1;}, clearTimeout(){},
  Date, Math, String, Number, Array, JSON, Intl,
  Blob, URL, FileReader:class {},
  atob: s => Buffer.from(s, 'base64').toString('binary'),
  btoa: s => Buffer.from(s, 'binary').toString('base64')
};
sandbox.window.localStorage = storage;
sandbox.window.document = document;
sandbox.window.navigator = sandbox.navigator;
vm.createContext(sandbox);
for(const file of ['locale_rows.js','locale_extras.js','app.js']){
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox,{filename:file,timeout:2000});
}
const evaluate=expr=>vm.runInContext(expr,sandbox,{timeout:2000});
assert.match(document.getElementById('timerDigitsTxt').textContent,/^[0-9]{2}:[0-9]{2}$/);
assert.equal(evaluate('Object.keys(DICT).length'),20);
assert.equal(evaluate('localDateISO(new Date(2026, 9, 18, 12))'),'2026-10-18');
assert.equal(evaluate('cfg.sessions'),0,'New install must not have invented sessions');
assert.equal(evaluate('cfg.todayMins'),0,'New install must not have invented time');
// Completed focus counts once and only once.
evaluate("selectTimerMode(1,'focus',null); toggleTimerPlay(); timerTargetTime = Date.now()-1000; runTimerTick();");
assert.equal(evaluate('cfg.sessions'),1);
assert.equal(evaluate('cfg.todayMins'),1);
assert.equal(evaluate('cfg.sessionHistory.length'),1);
evaluate("finalizeTimerSession(false)");
assert.equal(evaluate('cfg.sessions'),1,'Duplicate finish must not credit twice');
// Break completion must never increase focused minutes.
evaluate("selectTimerMode(1,'short',null); toggleTimerPlay(); timerTargetTime = Date.now()-1000; runTimerTick();");
assert.equal(evaluate('cfg.sessions'),1);
assert.equal(evaluate('cfg.todayMins'),1);
// User data containing HTML is displayed as text, not executable markup.
assert.equal(evaluate('escapeHtmlText("<img src=x onerror=alert(1)>")'),
  '&lt;img src=x onerror=alert(1)&gt;');
// A broken backup cannot mutate user progress.
assert.equal(evaluate('verifyAndRestoreBackupCode("invalid-backup")'),false);
assert.equal(evaluate('cfg.sessions'),1);
const malformedBundle = evaluate(`JSON.stringify({cfg, tasksList:[{
  id: '1);alert(1)//', title: 'bad', done: false
}], notesList, v:21})`);
const forgedPacket = JSON.stringify({
  bundle: malformedBundle,
  sig: evaluate('computeHash(' + JSON.stringify(malformedBundle) + ')')
});
const forgedCode = 'ZEN21::' + Buffer.from(forgedPacket, 'utf8').toString('base64');
assert.equal(evaluate('verifyAndRestoreBackupCode(' + JSON.stringify(forgedCode) + ')'),false);
assert.equal(evaluate('cfg.sessions'),1);
// Credit actual measured focus duration, not the original planned 25 minutes.
evaluate("selectTimerMode(25,'focus',null); toggleTimerPlay(); timerResumeMs = Date.now()-120000; timerTargetTime = Date.now()-100; runTimerTick();");
assert.equal(evaluate('cfg.sessions'),2);
assert.equal(evaluate('cfg.todayMins'),3,'Two real active minutes counted instead of 25 planned minutes');
// Keep the default date synchronized after crossing midnight.
evaluate("todayISO = '2000-01-01'; syncDailyRollover();");
assert.equal(evaluate('todayISO'),evaluate('localDateISO()'));
// A selected activity must remain visible and show its true duration.
evaluate("cfg.domain = 'sport'; renderDomainState(); selectTimerMode(30,'focus',null); updateTimerDisplay();");
assert.equal(document.getElementById('timerModeCaption').textContent, 'Workout 30m');
assert.equal(document.getElementById('modeFocusBtn').textContent, '30m');
console.log('PASS: boot, 20 locales, rollover, actual focus time, activity UI, breaks, XSS and malicious backups.');
