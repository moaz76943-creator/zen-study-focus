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
    id, value: '', textContent: '', innerHTML: '', checked: false, children: [], style: {setProperty(name,value){this[name]=value;}},
    className: '', title: '',
    classList: {add(){},remove(){},toggle(){return false;},contains(){return false;}},
    setAttribute(k,v){this[k] = v;}, getAttribute(k){return this[k];},
    appendChild(child){this.children.push(child);return child;}, replaceChildren(...children){this.children=[...children];}, addEventListener(){},
    parentElement:{querySelectorAll(){return [];}},
    querySelector(){return null;}, querySelectorAll(){return [];},
    focus(){}, scrollIntoView(){}
  };
}
const document = {
  body:{classList:{add(){},remove(){},toggle(){},contains(){return false;}}},
  addEventListener(){},
  getElementById(id){if(!map.has(id)){const el=node(id);if(id==='nsSort')el.options=[node(),node(),node()];map.set(id,el);}return map.get(id);},
  createElement(){return node();},
  querySelectorAll(){return []}
};
const storage = {
  getItem(key){return store.has(key)?store.get(key):null;},
  setItem(key,v){store.set(key,String(v));},
  removeItem(key){store.delete(key);}
};
const audioInstances = [];
class MockAudio {
  constructor() { this.volume = 0; this.paused = false; audioInstances.push(this); }
  play() { return Promise.resolve(); }
  pause() { this.paused = true; }
  removeAttribute(name) { if(name==='src')this.src=''; }
  load() {}
}
const sandbox = {
  Audio: MockAudio,
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
for(const file of ['locale_rows.js','locale_extras.js','quick_training.js','analytics_recovery_core.js','app.js']){
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox,{filename:file,timeout:2000});
  if(file==='analytics_recovery_core.js')sandbox.window.DeepFocusAnalyticsRecovery=sandbox.DeepFocusAnalyticsRecovery;
}
const evaluate=expr=>vm.runInContext(expr,sandbox,{timeout:2000});
assert.match(document.getElementById('timerDigitsTxt').textContent,/^[0-9]{2}:[0-9]{2}$/);
assert.equal(evaluate('Object.keys(DICT).length'),20);
assert.equal(evaluate('Object.keys(CONFIRMATION_TEXT).length'),20);
assert.equal(evaluate('Object.values(CONFIRMATION_TEXT).every(x => x.length === 3 && x.every(s => typeof s === "string" && s.length > 6))'),true);
assert.ok(evaluate("CONFIRMATION_TEXT.ar[2].includes('ملاحظاتك')"));
assert.equal(evaluate('localDateISO(new Date(2026, 9, 18, 12))'),'2026-10-18');
assert.equal(evaluate('cfg.sessions'),0,'New install must not have invented sessions');
assert.equal(evaluate('cfg.todayMins'),0,'New install must not have invented time');
// Completed focus counts once and only once.
evaluate("selectTimerMode(1,'focus',null); toggleTimerPlay(); timerActiveMs = 60000; timerTargetTime = Date.now()-1000; runTimerTick();");
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
assert.equal(document.getElementById('timerModeCaption').textContent, 'Workout 30 minutes');
assert.equal(document.getElementById('modeFocusBtn').textContent, '30 minutes');
// One domain preset determines the visible focus button and its actual selected duration.
for (const [domain, duration] of [['study',25], ['sport',30], ['read',20], ['work',50]]) {
  evaluate('cfg.domain=' + JSON.stringify(domain) + '; renderDomainState(); selectTimerMode(getDomainFocusMinutes(),\'focus\',null)');
  assert.equal(evaluate('timerTotal'),duration*60,domain+' focus duration');
  assert.equal(document.getElementById('modeFocusBtn').textContent,duration+' minutes');
}
// Ending an interval training sequence restores that same domain duration.
evaluate("cfg.domain='sport'; quickTraining={active:true}; stopQuickTrainingInternal()");
assert.equal(evaluate('timerTotal'),30*60,'Workout recovery must not return to 25m');

// Selecting an activity must not discard an active or paused focus session without consent.
evaluate("cfg.domain='sport'; renderDomainState(); selectTimerMode(30,'focus',null); toggleTimerPlay();");
const runningSnapshot = evaluate('JSON.stringify({domain:cfg.domain,total:timerTotal,left:timerLeft,running:timerRunning,sessionId:timerSessionId})');
let domainPrompts = 0;
sandbox.window.confirm = () => { domainPrompts++; return false; };
evaluate("switchActivityDomain('sport',document.getElementById('domBtn-sport'))");
assert.equal(domainPrompts,0,'Tapping the selected activity is a no-op');
assert.equal(evaluate('JSON.stringify({domain:cfg.domain,total:timerTotal,left:timerLeft,running:timerRunning,sessionId:timerSessionId})'),runningSnapshot);
evaluate("switchActivityDomain('read',document.getElementById('domBtn-read'))");
assert.equal(domainPrompts,1,'Switching an active session asks for consent');
assert.equal(evaluate('JSON.stringify({domain:cfg.domain,total:timerTotal,left:timerLeft,running:timerRunning,sessionId:timerSessionId})'),runningSnapshot);
sandbox.window.confirm = () => true;
evaluate("switchActivityDomain('read',document.getElementById('domBtn-read'))");
assert.equal(evaluate('cfg.domain'),'read');
assert.equal(evaluate('timerTotal'),20*60);
assert.equal(evaluate('timerRunning'),false);
assert.equal(document.getElementById('domBtn-read').getAttribute('aria-pressed'),'true');
assert.equal(document.getElementById('domBtn-sport').getAttribute('aria-pressed'),'false');
// Pausing a partially elapsed session must also retain it when a switch is declined.
evaluate("toggleTimerPlay(); timerTargetTime=Date.now()+1190000; toggleTimerPlay()");
assert.equal(evaluate('timerRunning'),false);
const pausedSnapshot = evaluate('JSON.stringify({domain:cfg.domain,total:timerTotal,left:timerLeft,running:timerRunning,sessionId:timerSessionId})');
sandbox.window.confirm = () => false;
evaluate("switchActivityDomain('work',document.getElementById('domBtn-work'))");
assert.equal(evaluate('JSON.stringify({domain:cfg.domain,total:timerTotal,left:timerLeft,running:timerRunning,sessionId:timerSessionId})'),pausedSnapshot);
sandbox.window.confirm = () => true;
evaluate("switchActivityDomain('sport',document.getElementById('domBtn-sport'))");

// Multiple records created within a single millisecond must receive different IDs.
const firstId = evaluate('nextRecordId()');
const secondId = evaluate('nextRecordId()');
assert.ok(secondId > firstId);
assert.equal(evaluate('Number.isSafeInteger(nextRecordId())'), true);

// A corrupt primary packet must recover from the existing healthy mirror.
const cfgKey = 'zen_fortress_cfg_v21';
const validCfgPacket = store.get(cfgKey);
const mirroredCfgPacket = store.get(cfgKey + '_mirror');
assert.ok(validCfgPacket && mirroredCfgPacket, 'Configuration has mirrored storage');
store.set(cfgKey, '{broken JSON!');
assert.equal(evaluate("loadFortressData('zen_fortress_cfg_v21', null).sessions"), 2);
store.set(cfgKey, validCfgPacket);

// Simulate a quota failure while restoring. No storage key may remain half-updated.
const backupCodeForRollback = evaluate('generateEncryptedBackupCode()');
const savedBeforeRestore = new Map(store);
const originalSetItem = storage.setItem;
let failOnce = true;
storage.setItem = function(key, value) {
  if (key === 'zen_fortress_notes_v21' && failOnce) {
    failOnce = false;
    throw new Error('Simulated storage quota failure');
  }
  return originalSetItem.call(this, key, value);
};
assert.equal(evaluate('verifyAndRestoreBackupCode(' + JSON.stringify(backupCodeForRollback) + ')'), false);
storage.setItem = originalSetItem;
assert.deepEqual([...store.entries()], [...savedBeforeRestore.entries()]);
assert.equal(evaluate('cfg.sessions'), 2, 'In-memory progress survives failed restore');

// A delayed media error must never restart a sound that the user already stopped.
evaluate("toggleSoundTile('forest')");
assert.equal(audioInstances.length, 1);
const staleAudioError = audioInstances[0].onerror;
evaluate('stopAllAudio()');
staleAudioError();
assert.equal(evaluate("Boolean(activePlayers['forest'])"), false);
evaluate("toggleSoundTile('forest')");
assert.equal(evaluate("Boolean(activePlayers['forest'])"), true);
staleAudioError(); // stale error from the first instance cannot replace the new one
assert.equal(evaluate("Boolean(activePlayers['forest'])"), true);
evaluate('stopAllAudio()');
assert.equal(evaluate('Object.keys(activePlayers).length'), 0);
// Quick training must handle exact seconds, preset types, active rounds and zero-rest completion.
assert.equal(evaluate("parseQuickTime('00:20')"),20);
assert.equal(evaluate("parseQuickTime('00:00',true)"),0);
assert.equal(evaluate("parseQuickTime('03:99')"),null);
assert.equal(evaluate("parseQuickTime('')"),null);
evaluate("applyQuickTrainingPreset('tabata')");
assert.equal(document.getElementById('qtWork').value,'00:20');
assert.equal(document.getElementById('qtRest').value,'00:10');
assert.equal(document.getElementById('qtSets').value,'8');
evaluate("selectTimerMode(25,'focus',null); startQuickTraining()");
assert.equal(evaluate('quickTraining.sets'),8);
assert.equal(evaluate('quickTraining.phase'),'work');
assert.equal(evaluate('timerTotal'),20);
assert.ok(evaluate('timerRunning'));
// Complete work: record only work; rest auto-starts without credit.
evaluate("timerTargetTime=Date.now()-5; timerResumeMs=Date.now()-20000; runTimerTick()");
assert.equal(evaluate('quickTraining.phase'),'rest');
assert.equal(evaluate('timerTotal'),10);
assert.equal(evaluate('cfg.todayMins'),3,'A 20-second round must not be credited as a full minute');
const beforeBreakCredit=evaluate('cfg.sessions');
evaluate("timerTargetTime=Date.now()-5; timerResumeMs=Date.now()-10000; runTimerTick()");
assert.equal(evaluate('quickTraining.currentSet'),1);
assert.equal(evaluate('quickTraining.phase'),'work');
assert.equal(evaluate('cfg.sessions'),beforeBreakCredit);
// Skipping a work round must not count it.
const beforeSkip=evaluate('cfg.sessions');
evaluate('skipQuickTrainingStep()');
assert.equal(evaluate('cfg.sessions'),beforeSkip);
evaluate('cancelQuickTraining(true)');
assert.equal(evaluate('quickTraining'),null);
assert.equal(evaluate('timerRunning'),false);
// Three 20s rounds (with zero rest) add exactly one actual minute.
const minutesBeforeShortRounds=evaluate('cfg.todayMins');
evaluate("applyQuickTrainingPreset('tabata'); document.getElementById('qtSets').value='3'; document.getElementById('qtRest').value='00:00'; startQuickTraining()");
for(let i=0;i<3;i++)
  evaluate("timerResumeMs=Date.now()-20000; timerTargetTime=Date.now()-4; runTimerTick()");
assert.equal(evaluate('cfg.todayMins'),minutesBeforeShortRounds+1);
assert.equal(evaluate('quickTraining'),null,'Training completes on the last round');
assert.equal(evaluate('timerRunning'),false);
assert.equal(evaluate('timerTotal'),1800,'Finishing workout restores the sport focus duration');
// A real today-plan preview uses saved tasks, not invented percentages.
assert.equal(evaluate('typeof renderTodayPlan'), 'function');
// The dashboard must never treat starter-example tasks as the user's real plan.
evaluate('renderTodayPlan()');
assert.equal(document.getElementById('todayPlanRatio').textContent,'0/0',
  'Starter task examples are not genuine completed/planned user work');
assert.equal(document.getElementById('todayPlanPercent').textContent,'0%',
  'No fabricated progress on a fresh installation');
// Add a real task to the home plan, then complete it using the existing task store.
evaluate("tasksList.unshift({id: nextRecordId(), isStarter:false, title:'Real focus item', date:localDateISO(), catKey:'study', done:false})");
const planBox = document.getElementById('todayPlanPreview');
planBox.children = [];
evaluate('renderTodayPlan()');
assert.equal(document.getElementById('todayPlanRatio').textContent,'0/1');
assert.equal(planBox.children.length,1,'Daily plan contains only one real task');
const planCheck = planBox.children[0].children[0];
const planFocus = planBox.children[0].children[1];
assert.equal(planCheck.className,'today-plan-check');
assert.equal(planFocus.className,'today-plan-link');
assert.equal(planCheck.getAttribute('aria-pressed'),'false');
assert.equal(planFocus.children[0].textContent,'Real focus item');
planCheck.onclick();
assert.equal(document.getElementById('todayPlanRatio').textContent,'1/1');
assert.equal(document.getElementById('todayPlanPercent').textContent,'100%');
assert.equal(evaluate("tasksList.find(t => t.title === 'Real focus item').done"),true);
planFocus.onclick();
assert.ok(document.getElementById('timerLinkedTask').textContent.includes('Real focus item'));
// Real white-home shortcuts use the original focus engine and never lose a live session.
evaluate("selectTimerMode(25,'focus',null); toggleTimerPlay()");
const homeRunning = evaluate('JSON.stringify({mode:currentTimerModeKey,total:timerTotal,left:timerLeft,running:timerRunning,sessionId:timerSessionId})');
let homeConfirmations = 0;
sandbox.window.confirm = () => { homeConfirmations++; return false; };
assert.equal(evaluate('selectHomeQuickSession(10)'),false);
assert.equal(homeConfirmations,1);
assert.equal(evaluate('JSON.stringify({mode:currentTimerModeKey,total:timerTotal,left:timerLeft,running:timerRunning,sessionId:timerSessionId})'),homeRunning);
sandbox.window.confirm = () => true;
assert.equal(evaluate('selectHomeQuickSession(10)'),true);
assert.equal(evaluate('timerTotal'),600);
assert.equal(evaluate('timerRunning'),false);
assert.equal(document.getElementById('modeFocusBtn').textContent,'10 minutes');
assert.equal(document.getElementById('homeQuick10').getAttribute('aria-pressed'),'true');
assert.equal(document.getElementById('homeQuick25').getAttribute('aria-pressed'),'false');
assert.equal(evaluate('selectHomeQuickSession(9)'),false,'Unlisted shortcut is rejected');
assert.equal(evaluate('selectHomeQuickSession(50)'),true);
assert.equal(evaluate('timerTotal'),3000);
assert.equal(document.getElementById('homeQuick50').getAttribute('aria-pressed'),'true');
// Week controls open an actual date in the existing calendar, including month/year rollover.
assert.equal(evaluate("goToHomeAgenda('2026-02-30')"),false);
assert.equal(evaluate("goToHomeAgenda('2026-11-05')"),true);
assert.equal(evaluate('selectedCalDate'),'2026-11-05');
assert.equal(evaluate('calMonth'),10);
assert.equal(evaluate('calYear'),2026);
assert.equal(evaluate('typeof renderHomeWeekStrip'),'function');

vm.runInContext(fs.readFileSync(path.join(root,'notes_studio.js'),'utf8'),sandbox,{filename:'notes_studio.js',timeout:2000});
assert.equal(evaluate('NS_TEMPLATES.length'),12,'Twelve usable note templates');
const originalNotes=evaluate('notesList.length');
evaluate("openNoteModal(); nsUseTemplate('cornell'); document.getElementById('inpNoteTitle').value='Important notes'; saveNewNote()");
assert.equal(evaluate('notesList.length'),originalNotes+1);
const savedNoteId=evaluate('notesList[0].id');
evaluate("nsEdit(notesList[0].id); document.getElementById('inpNoteBody').value='Updated without losing the ID'; saveNewNote()");
assert.equal(evaluate('notesList[0].id'),savedNoteId);
assert.equal(evaluate('notesList[0].body'),'Updated without losing the ID');
evaluate("nsToggleFlag(notesList[0].id,'pinned'); nsToggleFlag(notesList[0].id,'favorite')");
assert.equal(evaluate('notesList[0].pinned && notesList[0].favorite'),true);
evaluate('nsDuplicate(notesList[0].id)');
assert.equal(evaluate('notesList.length'),originalNotes+2);
assert.notEqual(evaluate('notesList[0].id'),savedNoteId);
assert.ok(store.has('zen_fortress_notes_v21'),'Saved notes compatibility');
assert.equal(evaluate('typeof openQuickTrainingFromNav'),'function');
assert.equal(evaluate('SOUNDS_DATA.length'),12);


vm.runInContext(fs.readFileSync(path.join(root,'goals_studio.js'),'utf8'),sandbox,{filename:'goals_studio.js',timeout:2000});
assert.equal(evaluate('gsGoal("study")'),0,'Do not invent user daily goals');
assert.equal(evaluate('gsRecordedMinutes("study","2045-02-20")'),0,'Do not invent actual progress');
assert.equal(evaluate('GOAL_DOMAINS.length'),4);
evaluate('openDailyGoalsModal()');
document.getElementById('goalInput-study').value='120';
document.getElementById('goalInput-read').value='45';
document.getElementById('goalInput-sport').value='30';
document.getElementById('goalInput-work').value='60';
for (const domain of ['study','read','sport','work']) {
  document.getElementById('goalWeeklyInput-'+domain).value='240';
}
assert.equal(evaluate('saveDailyGoals()'),true);
assert.equal(evaluate('gsWeeklyGoal("study")'),240,'Weekly goals persist with daily goals');
assert.equal(evaluate('gsGoal("study")'),120);
document.getElementById('goalInput-study').value='900';
assert.equal(evaluate('saveDailyGoals()'),false,'Reject invalid daily goal values');
assert.equal(evaluate('gsGoal("study")'),120);
assert.ok(store.has('zen_fortress_cfg_v21'),'Saved goals reuse the original cfg persistence');


vm.runInContext(fs.readFileSync(path.join(root,'notes_drafts.js'),'utf8'),sandbox,{filename:'notes_drafts.js',timeout:2000});
// The mock classList must report that the editor is open after nsEdit.
document.getElementById('noteModal').classList.contains = name => name === 'open';
evaluate('nsEdit(notesList[0].id)');
document.getElementById('inpNoteBody').value='A valuable unsaved edit';
assert.equal(evaluate('nsFlushDraft()'),true,'Save draft before Android kills the WebView');
assert.ok(store.has('deep_focus_unsaved_note_draft_v1'));
evaluate('nsCloseEditor()');
evaluate('nsEdit(notesList[0].id)');
assert.equal(evaluate('nsRestoreDraft()'),true,'Restore the matching note draft');
assert.equal(document.getElementById('inpNoteBody').value,'A valuable unsaved edit');
evaluate('saveNewNote()');
assert.equal(evaluate('notesList[0].body'),'A valuable unsaved edit');
assert.equal(store.has('deep_focus_unsaved_note_draft_v1'),false,'Saved notes clear only their matching draft');


vm.runInContext(fs.readFileSync(path.join(root,'timer_settings.js'),'utf8'),sandbox,{filename:'timer_settings.js',timeout:2000});
evaluate("cfg.domain='study'; openTimerSettings()");
document.getElementById('tsetFocus').value='40';
document.getElementById('tsetShort').value='7';
document.getElementById('tsetLong').value='20';
document.getElementById('tsetRounds').value='2';
assert.equal(evaluate('saveTimerSettings()'),true,'Persist timer cycle settings');
assert.equal(evaluate("getDomainFocusMinutes('study')"),40);
assert.equal(evaluate('cfg.shortMin'),7);
assert.equal(evaluate('cfg.longMin'),20);
assert.equal(evaluate('cfg.roundsPerCycle'),2);
evaluate('openTimerSettings()');
document.getElementById('tsetFocus').value='999';
assert.equal(evaluate('saveTimerSettings()'),false,'Invalid focus cannot overwrite settings');
assert.equal(evaluate("getDomainFocusMinutes('study')"),40);
evaluate("cfg.focusCycleCount=1; selectTimerMode(1,'focus',document.getElementById('modeFocusBtn')); timerSessionId='full-cycle-test'; timerActiveMs=60000; finalizeTimerSession(false)");
assert.equal(evaluate('currentTimerModeKey'),'long','Full focus cycle schedules long rest');
assert.equal(evaluate('timerTotal'),1200);

const beforeTinyCredit=evaluate('cfg.todayMins');
evaluate("selectTimerMode(1,'focus',null); timerSessionId='measured-20-sec'; timerActiveMs=20000; creditCompletedSession()");
assert.equal(evaluate('cfg.todayMins'),beforeTinyCredit,'Twenty seconds must not earn a fictional minute');
const afterShort=evaluate('cfg.sessionHistory.length');
evaluate("cfg.completedTimerIds=[]; creditCompletedSession()");
assert.equal(evaluate('cfg.sessionHistory.length'),afterShort,'Full ledger blocks duplicate event after the rolling-ID cache is lost');

console.log('PASS: startup, 20 languages, real focus metrics, interval rounds, rest and skip, backup, XSS, audio.');
