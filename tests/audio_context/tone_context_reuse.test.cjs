'use strict';
/* DF audio playback harness (2026-10-26 audio lane).
 *
 * Regression coverage for the production tile player in app.js (Play/Pause,
 * Stop All, volume) and for the M185 completion-tone play path.
 *
 * Fixed defect: playCompletionTone() allocated a brand new AudioContext for
 * every preview tap and never released any of them. Repeated Preview taps in
 * the DF09 completion tone picker (and any other playCompletionTone caller)
 * churned WebAudio contexts in the Android WebView until allocation fails
 * silently, so tone play/UI feedback stopped. The already-repaired chime
 * engine reuses its shared chimeCtx; the tone play path must do the same.
 * No nature recordings, mixer wiring or audio selections are changed here
 * (see issues #105 and #255: provenance gate stays QUARANTINED/NOT_TESTED).
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const appPath=path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js');
const source=fs.readFileSync(appPath,'utf8');
function block(start,end){
  const a=source.indexOf(start);
  assert.ok(a>=0,'expected production block: '+start);
  const b=source.indexOf(end,a+start.length);
  assert.ok(b>a,'expected production block end: '+end);
  return source.slice(a,b);
}
const audioCode=block('const SOUNDS_DATA = [','\n/* ========================================================\n   8. ANALYTICS');
const toneCode=block('const COMPLETION_TONES = {','window.playCompletionTone = playCompletionTone;');

function makeNode(){
  return {
    children:[],textContent:'',className:'',dir:'',inner:'',
    classList:{add(){},remove(){},toggle(){},contains(){return false;}},
    appendChild(c){this.children.push(c);return c;},
    addEventListener(){},removeEventListener(){},
    setAttribute(){},getAttribute(){return null;},
    querySelector(){return null;},querySelectorAll(){return [];}
  };
}

function rigTile(playPromises=[]){
  const audioInstances=[];
  const toasts=[];
  let acCount=0;
  const box=makeNode();
  const sandbox={
    cfg:{lang:'en',domain:'study',focusMin:25,shortMin:5,longMin:15},
    L(){const sounds={ocean:'Ocean Waves',rain:'Soft Forest Rain',fire:'Campfire Woods',forest:'Pine Breeze',stream:'Mountain Stream',leaves:'Rustling Leaves',waterfall:'Waterfall',night:'Night Crickets',thunder:'Distant Thunder',wind:'Highland Wind',winrain:'Rain on Window',earth:'Deep Earth'};return{...sandbox.cfg,sounds};},
    showToast:m=>toasts.push(m),
    escapeHtmlText:v=>String(v),
    toWest:v=>String(v),
    Audio:class MockAudio{
      constructor(){this.volume=1;this.loop=false;this.src='';this.paused=true;audioInstances.push(this);}
      pause(){this.paused=true;}
      play(){this.paused=false;return playPromises[audioInstances.indexOf(this)]||Promise.resolve();}
    },
    AudioContext:class MockAC{
      constructor(){acCount++;this.sampleRate=8000;this.state='running';this.currentTime=0;this.destination={};}
      resume(){this.state='running';return Promise.resolve();}
      createBuffer(ch,len,sr){return{getChannelData:()=>new Float32Array(len)};}
      createBufferSource(){return{loop:false,buffer:null,connect(){},start(){},stop(){},disconnect(){}};}
      createBiquadFilter(){return{type:'',frequency:{value:0},connect(){},disconnect(){}};}
      createGain(){return{connect(){},disconnect(){},gain:{value:1,setValueAtTime(){}}};}
    },
    window:{},
    document:{
      getElementById(id){return id==='soundsGridBox'?box:null;},
      createElement(){return makeNode();}
    }
  };
  sandbox.window.AudioContext=sandbox.AudioContext;
  sandbox.window.webkitAudioContext=sandbox.AudioContext;
  vm.createContext(sandbox);
  vm.runInContext(audioCode,sandbox,{filename:'tile-segment'});
  const evaluate=code=>vm.runInContext(code,sandbox);
  return {sandbox,audioInstances,toasts,evaluate,
    playing:id=>evaluate(`Boolean(activePlayers['${id}'])`),
    catalog:id=>evaluate(`SOUNDS_DATA.find(s=>s.id==='${id}')`)};
}

function rigTone(){
  const counts={contexts:0,resumes:0,oscillators:0,started:0,scheduled:[],disconnected:0};
  const oscillators=[];
  const haptics=[];
  const sandbox={
    localStorage:{getItem:k=>k==='df_end_tone'?'crystal':null},
    window:{triggerHaptic:type=>haptics.push(type),AudioContext:null,webkitAudioContext:null}
  };
  class MockAudioContext{
    constructor(){counts.contexts++;this.state='suspended';this.currentTime=0;this.destination={};}
    resume(){counts.resumes++;this.state='running';return Promise.resolve();}
    createOscillator(){counts.oscillators++;const osc={
      type:'',frequency:{setValueAtTime(f){counts.scheduled.push(f);},exponentialRampToValueAtTime(){}},
      connect(){},disconnect(){counts.disconnected++;},start(){counts.started++;},stop(){}};oscillators.push(osc);return osc;}
    createGain(){return{connect(){},disconnect(){counts.disconnected++;},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}}};}
  }
  sandbox.window.AudioContext=MockAudioContext;
  sandbox.window.webkitAudioContext=MockAudioContext;
  vm.createContext(sandbox);
  vm.runInContext(toneCode,sandbox,{filename:'tone-segment'});
  return {
    call:key=>vm.runInContext(`playCompletionTone(${key===undefined?'':JSON.stringify(key)})`,sandbox),
    counts,haptics,oscillators,ctx:()=>vm.runInContext('toneCtx || null',sandbox)
  };
}

const flush=()=>new Promise(done=>setTimeout(done,0));

test('tile Play/Pause/Stop All register and release players without leaving channels open',async()=>{
  const t=rigTile();
  t.sandbox.toggleSoundTile('forest');
  assert.equal(t.playing('forest'),true,'play registers the tile channel');
  await flush();
  t.sandbox.toggleSoundTile('forest');
  assert.equal(t.playing('forest'),false,'pause releases the tile channel');
  t.sandbox.toggleSoundTile('rain');
  t.sandbox.toggleSoundTile('fire');
  assert.equal(t.playing('rain'),true);
  assert.equal(t.playing('fire'),true);
  t.sandbox.stopAllAudio();
  assert.equal(t.evaluate('Object.keys(activePlayers).length'),0,'Stop All releases every channel');
});

test('tile volume updates the live player and survives stop and later restart',()=>{
  const t=rigTile();
  t.sandbox.toggleSoundTile('ocean');
  t.sandbox.setTileVolume('ocean',0.42);
  assert.equal(t.catalog('ocean').vol,0.42,'catalog keeps the drawn level');
  assert.equal(t.audioInstances[0].volume,0.42,'live player receives the drawn level');
  t.sandbox.toggleSoundTile('ocean');
  assert.equal(t.playing('ocean'),false);
  t.sandbox.toggleSoundTile('ocean');
  assert.equal(t.audioInstances[1].volume,0.42,'restarted playback keeps the chosen volume');
  t.sandbox.setTileVolume('ocean',7);
  assert.equal(t.catalog('ocean').vol,1,'out-of-range slider values clamp to 1');
  t.sandbox.setTileVolume('ocean',-3);
  assert.equal(t.catalog('ocean').vol,0,'negative slider values clamp to 0');
});

test('a stopped tile cannot be revived by its stale pending play rejection',async()=>{
  let rejectOld;
  const pending=new Promise((_,reject)=>{rejectOld=reject;});
  const t=rigTile([pending]);
  t.sandbox.toggleSoundTile('rain'); // the original play promise is still pending
  const first=t.audioInstances[0];
  t.sandbox.toggleSoundTile('rain'); // stop while play() already resolved
  t.sandbox.toggleSoundTile('rain'); // immediate new player
  rejectOld(new Error('stale')); // reject the actual promise returned by the old play
  await flush();
  assert.equal(t.evaluate("Object.keys(activePlayers).join(',')"),'rain',
    'the fresh player must stay registered');
  assert.equal(t.audioInstances[1].paused,false,'the fresh player keeps playing');
  t.sandbox.stopAllAudio();
  assert.equal(t.evaluate("Object.keys(activePlayers).length"),0,'Stop All clears the map');
});

test('completion tone preview reuses ONE WebAudio context and resumes it when suspended',()=>{
  const t=rigTone();
  for(const key of ['zen_bell','gong','crystal','tibetan_bowl','woodblock'])
    t.call(key);
  assert.equal(t.counts.contexts,1,'repeated tone plays must reuse one shared context');
  assert.equal(t.counts.oscillators,5,'every preview schedules exactly one oscillator');
  assert.equal(t.counts.started,5,'every preview starts its oscillator exactly once');
  assert.equal(t.counts.resumes,1,'suspended context is resumed once');
  const shared=t.ctx();
  assert.ok(shared,'tone context stays reusable for the session end');
  shared.state='suspended'; // WebView suspended it during backgrounding
  t.call('crystal');
  assert.equal(t.counts.contexts,1,'no replacement context after suspension');
  assert.equal(t.counts.resumes,2,'shared context resumes again on next play');
  assert.equal(t.counts.started,6);
  for(const osc of t.oscillators)osc.onended();
  assert.equal(t.counts.disconnected,12,'Every finished oscillator and gain disconnects');
});

test('tone selection and silent vibration choice keep their existing behavior',()=>{
  const t=rigTone();
  t.call(); // no argument: stored df_end_tone (crystal) must be honored
  assert.deepEqual(t.counts.scheduled,[1046.5],'stored tone selection still applies');
  assert.deepEqual(t.haptics,['complete']);
  const before=t.counts.contexts;
  t.call('vibrate');
  assert.equal(t.counts.contexts,before,'vibrate-only choice creates no AudioContext');
  assert.equal(t.counts.oscillators,1,'vibrate-only choice plays no oscillator');
});
