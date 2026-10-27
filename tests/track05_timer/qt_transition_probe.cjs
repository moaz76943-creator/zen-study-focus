'use strict';
// Diagnostic harness: loads REAL app.js timer engine + REAL quick_training.js functions.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const web = path.join(__dirname, '..', '..', 'android', 'app', 'src', 'main', 'assets', 'web');
const appSrc = fs.readFileSync(path.join(web, 'app.js'), 'utf8');
const qtSrc = fs.readFileSync(path.join(web, 'quick_training.js'), 'utf8');

function extract(src, a, b) {
  const start = src.indexOf(a);
  const stop = b === null ? src.length : src.indexOf(b, start);
  if (start < 0 || stop < 0 || stop <= start) throw new Error('boundary missing: ' + a);
  return src.slice(start, stop);
}

// app.js engine slices
const sliceTimerState = extract(appSrc, 'let timerTotal = cfg.focusMin * 60;', 'const ringCircumference =');
const sliceModes = extract(appSrc, 'function selectTimerModeFromUser(', 'function addWaterCup()');
const sliceDomainMin = extract(appSrc, 'const DOMAIN_FOCUS_MINUTES =', 'function renderDomainState()');

// quick_training.js slice: the live quick training controller
const sliceQuick = extract(qtSrc, 'let quickTraining = null;', '/* Real seven-day navigation:');

const clock = { now: 1_000_000 };
function setup(opts = {}) {
  const storage = Object.create(null);
  const timers = {};
  let intervalSeq = 0;
  const events = [];
  const toasts = [];
  const chimes = [];
  const cfgWrites = [];
  const snapshotWrites = [];
  const modeCalls = [];
  let failConfigSave = opts.failConfigSave || false;

  const reg = Object.create(null);
  const elementFor = id => (reg[id] ??= new Proxy({ style: {} }, {
    get(t, k) {
      if (k === 'style') return t.style;
      return t[k];
    },
    set(t, k, v) { t[k] = v; return true; }
  }));
  const btnFor = id => new Proxy({
    parentElement: { querySelectorAll: () => ({ forEach(){} }) }
  }, {
    get(t, k) {
      if (k === 'classList') return { add(){}, remove(){}, toggle(){} };
      if (k === 'querySelectorAll') return () => ({ forEach(){} });
      return t[k];
    },
    set(t, k, v) { t[k] = v; return true; }
  });
  const getElementById = id => /^mode/.test(id) ? btnFor(id) : elementFor(id);

  const sandbox = vm.createContext({
    Date: { now: () => clock.now },
    localStorage: {
      getItem: k => (k in storage ? storage[k] : null),
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: k => { delete storage[k]; }
    },
    setInterval: (fn) => { const id = ++intervalSeq; timers[id] = fn; return id; },
    clearInterval: id => { delete timers[id]; },
    setTimeout: () => 0,
    clearTimeout: () => {},
    document: {
      getElementById,
      querySelectorAll: () => [],
      createElement: () => ({ setAttribute(){}, appendChild(){}, classList:{toggle(){},add(){},remove(){}} }),
      dispatchEvent(){}, addEventListener(){}
    },
    window: {
      confirm: () => true,
      dispatchEvent: ev => { if (ev && ev.detail) events.push(ev.detail); },
      AudioContext: undefined
    },
    CustomEvent: function custom(kind, init) { this.type = kind; this.detail = init && init.detail; },
    cfg: Object.assign({ lang:'en', domain:'study', focusMin:25, shortMin:5, longMin:15, todayMins:0, sessions:0, streak:0 }, opts.cfg || {}),
    tasksList: opts.tasksList || [],
    toWest: x => String(x),
    localDateISO: () => '2026-10-26',
    computeActualStreak: () => opts.streak || 0,
    L: () => ({ saveFailed: 'Save failed' }),
    showToast: m => toasts.push(String(m)),
    saveFortressData: (key, value) => {
      if (failConfigSave) return false;
      if (key === 'zen_fortress_cfg_v21') cfgWrites.push({ key, value });
      else snapshotWrites.push({ key, value });
      storage[key] = JSON.stringify(value);
      return true;
    },
    loadFortressData: (key, fallback) => (key in storage ? JSON.parse(storage[key]) : fallback),
    renderDomainState(){ modeCalls.push(['renderDomainState']); },
    updateTimerDisplay(){ modeCalls.push(['update']); },
    renderTodayPlan(){},
    playRichCompletionChime(){ chimes.push(true); },
    syncHeaderMetrics(){},
    QUICK_KEYS: [],
    QUICK_TRANSLATIONS: {},
    navigator: {},
    console
  });

  vm.runInContext(sliceDomainMin + '\n' + sliceTimerState + '\n' + sliceModes + '\n' + sliceQuick, sandbox, { filename: 'engine-extract.js' });
  return {
    sandbox, dom: getElementById, storage, events, toasts, chimes, cfgWrites, snapshotWrites, modeCalls,
    run(expr) { return vm.runInContext(expr, sandbox); },
    value(name) { return vm.runInContext(name, sandbox); },
    tick(id) { const fn = timers[id]; if (fn) return { fired: fn(), stillLive: id in timers }; return null; },
    ids() { return Object.keys(timers); },
    advanceClock(ms) { clock.now += ms; },
    cfgState: () => sandbox.cfg,
    failCfg(v) { failConfigSave = v; }
  };
}

function startQuick(h, sets, work, rest, skipLast = false) {
  const d = h.dom;
  d('qtSets').value = String(sets);
  d('qtWork').value = work;
  d('qtRest').value = rest;
  d('qtSkipLast').checked = skipLast;
  return h.run('startQuickTraining()');
}
const qtJSON = h => h.run('JSON.stringify(quickTraining)');
const qtState = h => h.run('({quickTraining:JSON.parse(JSON.stringify(quickTraining||null)),running:timerRunning,mode:currentTimerModeKey,left:timerLeft,sessionId:timerSessionId,activeMs:timerActiveMs})');
const snapshotOf = h => { const raw = h.storage['zen_fortress_active_timer_v21']; return raw ? JSON.parse(raw) : null; };

// ─── Scenario A: full 2-set quick training (20s/10s) → count credit rows ───
{
  const h = setup({ cfg: { domain:'sport', focusMin:30, todayMins:3, sessions:1, streak:1 } });
  startQuick(h, 2, '00:20', '00:10', false);
  console.log('START:', JSON.stringify(qtState(h)));
  h.advanceClock(20600);
  h.tick(h.ids()[0]);
  console.log('R1   :', JSON.stringify(qtState(h)),
    'rows=', JSON.stringify(h.cfgState().sessionHistory),
    'remainder=', h.cfgState().quickFocusRemainderSec);
  h.advanceClock(10600);
  h.tick(h.ids()[0]);
  console.log('REST1:', JSON.stringify(qtState(h)),
    'rows=', h.cfgState().sessionHistory.length);
  h.advanceClock(20600);
  h.tick(h.ids()[0]);
  console.log('R2   :', JSON.stringify(qtState(h)),
    'rows=', JSON.stringify(h.cfgState().sessionHistory),
    'remainder=', h.cfgState().quickFocusRemainderSec,
    'todayMins=', h.cfgState().todayMins, 'sessions=', h.cfgState().sessions);
  h.advanceClock(10600);
  h.tick(h.ids()[0]);
  console.log('FINAL :', JSON.stringify(qtState(h)),
    'rows=', JSON.stringify(h.cfgState().sessionHistory),
    'ids=', JSON.stringify(h.cfgState().completedTimerIds),
    'events=', h.events.map(e => e.kind).join(','));
}

// ─── Scenario B: CANCEL while work is RUNNING, twice (double-fire), then restart
{
  console.log('\nSCENARIO B — cancel running work (double-fire) then restart');
  const h = setup({ cfg: { domain:'sport', focusMin:30, todayMins:3, sessions:1, streak:1 } });
  startQuick(h, 2, '00:20', '00:10');
  h.advanceClock(5000);
  console.log('cancel#1:', h.run('cancelQuickTraining(true)'));
  console.log('cancel#2:', h.run('cancelQuickTraining(true)'));
  console.log('STATE  :', JSON.stringify(qtState(h)),
    'rows=', (h.cfgState().sessionHistory || []).length,
    'snapshot=', JSON.stringify(snapshotOf(h)));
  h.run('toggleTimerPlay()'); // legacy focus start after cancel
  h.advanceClock(5);
  console.log('after legacy start:', JSON.stringify(qtState(h)));
}

// ─── Scenario C: SKIP mid-work while RUNNING, then complete round 2 ───
{
  console.log('\nSCENARIO C — skip work r1 while running → only r2 credited');
  const h = setup({ cfg: { domain:'sport', focusMin:30, todayMins:3, sessions:1, streak:1 } });
  startQuick(h, 2, '00:20', '00:10');
  h.advanceClock(7000);              // worked 7s of round 1, then skip
  console.log('skip:', h.run('skipQuickTrainingStep()'), JSON.stringify(qtState(h)));
  // a stale queued tick right after skip must do nothing
  const stale = h.ids().slice(-1)[0];
  h.tick(h.ids()[0]);
  console.log('after skip+stale tick:', JSON.stringify(qtState(h)));
  // round 1 rest expiry + into r2
  h.advanceClock(10600);
  h.tick(h.ids()[0]);
  console.log('rest1 expired →', JSON.stringify(qtState(h)));
  h.advanceClock(20600);
  h.tick(h.ids()[0]);
  console.log('r2 done:', (h.cfgState().sessionHistory||[]).length, 'rows,',
    JSON.stringify(h.cfgState().sessionHistory||[]),
    'remainder=', h.cfgState().quickFocusRemainderSec,
    'todayMins=', h.cfgState().todayMins);
  h.advanceClock(10600);
  h.tick(h.ids()[0]);
  console.log('FINAL:', 'qt=', qtJSON(h), 'rows=', (h.cfgState().sessionHistory||[]).length,
    'events=', h.events.map(e => e.kind).join(','));
}

// ─── Scenario D: process death mid round-2 work → restore+finalize must credit exactly once ───
{
  console.log('\nSCENARIO D — restore after process death mid-work');
  const hA = setup({ cfg: { domain:'sport', focusMin:30, todayMins:3, sessions:1, streak:1 } });
  startQuick(hA, 2, '00:20', '00:10');
  hA.advanceClock(20600); hA.tick(hA.ids()[0]);   // r1 work credit + rest switch
  hA.advanceClock(10600); hA.tick(hA.ids()[0]);   // rest 1 → r2 work running
  hA.advanceClock(8000);                          // 8s into r2 work, then process death (no tick)
  const savedStorage = { ...hA.storage };
  const savedCfg = JSON.parse(JSON.stringify(hA.cfgState()));
  console.log('snapshot before death:', JSON.stringify(snapshotOf(hA)));

  // new app boot
  const hB = setup({ cfg: savedCfg });
  Object.assign(hB.storage, savedStorage);
  hB.run('restoreTimerSession()');
  console.log('restored timer continues:', JSON.stringify(qtState(hB)),
    'rows=', (hB.cfgState().sessionHistory||[]).length);
  hB.advanceClock(12 * 1000 + 900);   // r2 work expires after reopen
  hB.tick(hB.ids()[0]);
  console.log('r2 rest scheduled:', JSON.stringify(qtState(hB)),
    'rows=', (hB.cfgState().sessionHistory||[]).length,
    'remainder=', hB.cfgState().quickFocusRemainderSec);
  // Chain a second death: kill mid r2 rest, reopen with expired rest (alarm case)
  hB.advanceClock(4000);
  const savedStorage2 = { ...hB.storage };
  const savedCfg2 = JSON.parse(JSON.stringify(hB.cfgState()));
  const hC = setup({ cfg: savedCfg2 });
  Object.assign(hC.storage, savedStorage2);
  hC.advanceClock(44 * 1000);          // rest expired long before reopen
  hC.run('restoreTimerSession()');
  console.log('FINAL after chained death:', JSON.stringify(qtState(hC)),
    'rows=', (hC.cfgState().sessionHistory||[]).length,
    'remainder=', hC.cfgState().quickFocusRemainderSec,
    'ids=', JSON.stringify(hC.cfgState().completedTimerIds),
    'todayMins=', hC.cfgState().todayMins, 'sessions=', hC.cfgState().sessions);
}

// ─── Scenario E: PAUSE mid-work → RESTART → restore PAUSED → invalid restore not applied
{
  console.log('\nSCENARIO E — paused quick training across force-stop');
  const h = setup({ cfg: { domain:'sport', focusMin:30, todayMins:3, sessions:1 } });
  startQuick(h, 2, '00:20', '00:10');
  h.advanceClock(9000);
  h.run('toggleTimerPlay()');          // pause mid-work
  const pausedSnap = JSON.parse(JSON.stringify(snapshotOf(h)));
  console.log('paused snapshot:', JSON.stringify(pausedSnap));
  const replay = setup({ cfg: JSON.parse(JSON.stringify(h.cfgState())) });
  Object.assign(replay.storage, h.storage);
  replay.run('restoreTimerSession()');
  console.log('restored paused:', JSON.stringify(qtState(replay)),
    'snapshot intact:', JSON.stringify(snapshotOf(replay)));
  // resume, complete round, ensure exactly one credit row
  replay.run('toggleTimerPlay()');
  replay.advanceClock(11 * 1000 + 600);
  replay.tick(replay.ids()[0]);
  console.log('after resume+expiry:', JSON.stringify(qtState(replay)),
    'rows=', JSON.stringify(replay.cfgState().sessionHistory||[]),
    'remainder=', replay.cfgState().quickFocusRemainderSec);
}

// ─── Scenario F: FAILED credit save during final REST of quick training — retry path
{
  console.log('\nSCENARIO F — credit save fails during last work, Play retries once');
  const h = setup({ cfg: { domain:'sport', focusMin:30, todayMins:3, sessions:1 } });
  startQuick(h, 2, '00:20', '00:10', true);   // skipLastRest: single rest at end? no: sets=2, skip last rest → r2 done immediately
  h.failCfg(true);
  h.advanceClock(20600);
  h.tick(h.ids()[0]);
  console.log('failed save:', 'running=', h.run('timerRunning'), 'sessionId=', h.run('timerSessionId'),
    'rows=', (h.cfgState().sessionHistory||[]).length, 'todayMins=', h.cfgState().todayMins);
  h.failCfg(false);
  console.log('press Play to retry:');
  h.run('toggleTimerPlay()');
  h.advanceClock(600);
  h.tick(h.ids()[0]);
  console.log('retry result:', JSON.stringify(qtState(h)),
    'rows=', JSON.stringify(h.cfgState().sessionHistory||[]),
    'remainder=', h.cfgState().quickFocusRemainderSec,
    'todayMins=', h.cfgState().todayMins, 'sessions=', h.cfgState().sessions);
}

// ─── Scenario H: death during RUNNING REST, reopen while deadline still future
{
  console.log('\nSCENARIO H — restore of running rest before expiry');
  const h = setup({ cfg: { domain:'sport', focusMin:30, todayMins:3, sessions:1 } });
  startQuick(h, 2, '00:20', '00:10');
  h.advanceClock(20600);
  h.tick(h.ids()[0]);                  // work r1 → rest running
  h.advanceClock(4000);                // 4s into the 10s rest
  const savedStorage = { ...h.storage };
  const savedCfg = JSON.parse(JSON.stringify(h.cfgState()));
  const hB = setup({ cfg: savedCfg });
  Object.assign(hB.storage, savedStorage);
  hB.run('restoreTimerSession()');
  console.log('restored running rest:', JSON.stringify(qtState(hB)),
    'rows=', (hB.cfgState().sessionHistory||[]).length,
    'remainder=', hB.cfgState().quickFocusRemainderSec);
  hB.advanceClock(4 * 1000 + 900);     // rest reaches expiry on device time
  hB.tick(hB.ids()[0]);
  console.log('rest expiry → work r2:', JSON.stringify(qtState(hB)),
    'rows=', (hB.cfgState().sessionHistory||[]).length);
  hB.advanceClock(20600);
  hB.tick(hB.ids()[0]);
  console.log('FINAL:', JSON.stringify(qtState(hB)),
    'rows=', (hB.cfgState().sessionHistory||[]).length,
    'ids=', JSON.stringify(hB.cfgState().completedTimerIds),
    'remainder=', hB.cfgState().quickFocusRemainderSec);
}

// ─── Scenario I: skip the PAUSED final work round (skipLastRest, last set)
{
  console.log('\nSCENARIO I — skip paused LAST work with skipLastRest');
  const h = setup({ cfg: { domain:'sport', focusMin:30, todayMins:3, sessions:1 } });
  startQuick(h, 1, '00:20', '00:10', true);   // 1 set, skip last rest ⇒ work only
  h.advanceClock(5000);
  h.run('toggleTimerPlay()');          // pause mid work r1
  h.advanceClock(3000);                // 3s of wall clock while paused
  console.log('skip last paused work:', h.run('skipQuickTrainingStep()'),
    JSON.stringify(qtState(h)),
    'rows=', (h.cfgState().sessionHistory||[]).length,
    'remainder=', h.cfgState().quickFocusRemainderSec,
    'sessions=', h.cfgState().sessions);
}

// ─── Scenario J: pause DURING running REST, resume, complete remaining rest
{
  console.log('\nSCENARIO J — pause/resume inside quick-training REST phase');
  const h = setup({ cfg: { domain:'sport', focusMin:30, todayMins:3, sessions:1 } });
  startQuick(h, 2, '00:20', '00:10');
  h.advanceClock(20600);
  h.tick(h.ids()[0]);                  // rest r1 running
  h.advanceClock(3000);
  h.run('toggleTimerPlay()');          // pause rest
  h.advanceClock(9000);                // wall clock elapses while paused
  h.run('toggleTimerPlay()');          // resume rest
  h.advanceClock(6 * 1000 + 900);
  h.tick(h.ids()[0]);                  // rest expires
  console.log('after rest expiry:', JSON.stringify(qtState(h)),
    'rows=', (h.cfgState().sessionHistory||[]).length,
    'remainder=', h.cfgState().quickFocusRemainderSec,
    'todayMins=', h.cfgState().todayMins, 'sessions=', h.cfgState().sessions);
}

// ─── Scenario G: cancel during REST (running) — nothing credited, state clean ───
{
  console.log('\nSCENARIO G — cancel during running REST, accept prompt');
  const h = setup({ cfg: { domain:'sport', focusMin:30, todayMins:3, sessions:1 } });
  startQuick(h, 2, '00:20', '00:10');
  h.advanceClock(20600);
  h.tick(h.ids()[0]);                  // work r1 → rest running
  h.advanceClock(4000);
  console.log('cancel during rest:', h.run('cancelQuickTraining(true)'), JSON.stringify(qtState(h)),
    'rows=', (h.cfgState().sessionHistory||[]).length,
    'remainder=', h.cfgState().quickFocusRemainderSec,
    'snapshot=', JSON.stringify(snapshotOf(h)));
}
