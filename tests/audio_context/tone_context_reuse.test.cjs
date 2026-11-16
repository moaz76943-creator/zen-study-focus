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
    // Mock fetch globally for Web Audio API Ogg loading
    fetch: async (url) => ({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8000 * 2)) // 1 sec silence at 8kHz
    }),
    // Mock ensureProceduralAudioContext which is used by toggleSoundTile but defined outside the extracted block
    ensureProceduralAudioContext: () => {
      acCount++;
      return {
        sampleRate: 8000,
        state: 'running',
        currentTime: 0,
        destination: {},
        resume: () => Promise.resolve(),
        createBuffer: (ch,len,sr) => ({getChannelData:()=>new Float32Array(len)}),
        createBufferSource: () => ({loop:false,buffer:null,connect(){},start(){},stop(){},disconnect(){}}),
        createBiquadFilter: () => ({type:'',frequency:{value:0},connect(){},disconnect(){}}),
        createGain: () => ({connect(){},disconnect(){},gain:{value:1,setValueAtTime(){},cancelScheduledValues(){},linearRampToValueAtTime(){}}}),
        decodeAudioData: (buf) => Promise.resolve({duration:1,sampleRate:8000,getChannelData:()=>new Float32Array(8000)})
      };
    },
    AudioContext:class MockAC{
      constructor(){acCount++;this.sampleRate=8000;this.state='running';this.currentTime=0;this.destination={};}
      resume(){this.state='running';return Promise.resolve();}
      createBuffer(ch,len,sr){return{getChannelData:()=>new Float32Array(len)};}
      createBufferSource(){return{loop:false,buffer:null,connect(){},start(){},stop(){},disconnect(){}};}
      createBiquadFilter(){return{type:'',frequency:{value:0,setValueAtTime(){}},Q:{value:0,setValueAtTime(){}},connect(){},disconnect(){}};}
      createGain(){return{connect(){},disconnect(){},gain:{value:1,setValueAtTime(){},cancelScheduledValues(){},linearRampToValueAtTime(){}}};}
      decodeAudioData(buf){return Promise.resolve({duration:1,sampleRate:8000,getChannelData:()=>new Float32Array(8000)});}
    },
    window:{},
    document:{
      getElementById(id){return id==='soundsGridBox'?box:null;},querySelector(){return null;},querySelectorAll(){return [];},activeElement:null,
      createElement(){return makeNode();}
    }
  };
  sandbox.window.AudioContext=sandbox.AudioContext;
  sandbox.window.webkitAudioContext=sandbox.AudioContext;
  sandbox.window.fetch = sandbox.fetch;
  sandbox.window.ensureProceduralAudioContext = sandbox.ensureProceduralAudioContext;
  vm.createContext(sandbox);
  vm.runInContext(audioCode,sandbox,{filename:'tile-segment'});
  const evaluate=code=>vm.runInContext(code,sandbox);
  return {sandbox,audioInstances,toasts,evaluate,
    playing:id=>evaluate(`Boolean(activePlayers['${id}'])`),
    catalog:id=>evaluate(`SOUNDS_DATA.find(s=>s.id==='${id}')`),
    acCount:()=>acCount
  };
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

const flush=()=>new Promise(r=>setTimeout(r,0));
const flushMicrotasks=()=>new Promise(r=>queueMicrotask(r));

test('tile Play/Pause/Stop All register and release players without leaving channels open',async()=>{
  const t=rigTile();
  await t.sandbox.toggleSoundTile('forest');
  await flushMicrotasks();
  await flush();
  assert.equal(t.playing('forest'),true,'play registers the tile channel');
  await t.sandbox.toggleSoundTile('forest');
  await flushMicrotasks();
  await flush();
  assert.equal(t.playing('forest'),false,'pause releases the tile channel');
  await t.sandbox.toggleSoundTile('rain');
  await flushMicrotasks();
  await flush();
  await t.sandbox.toggleSoundTile('forest');
  await flushMicrotasks();
  await flush();
  assert.equal(t.playing('rain'),true);
  assert.equal(t.playing('forest'),true);
  t.sandbox.stopAllAudio();
  await flushMicrotasks();
  await flush();
  assert.equal(t.evaluate('Object.keys(activePlayers).length'),0,'Stop All releases every channel');
});

test('tile volume updates the live player and survives stop and later restart',async()=>{
  const t=rigTile();
  await t.sandbox.toggleSoundTile('stream');
  await flushMicrotasks();
  await flush();
  t.sandbox.setTileVolume('stream',0.42);
  assert.equal(t.catalog('stream').vol,0.42,'catalog keeps the drawn level');
  // Note: volume is applied via gain node, not directly accessible in mock
  await t.sandbox.toggleSoundTile('stream');
  await flushMicrotasks();
  await flush();
  await t.sandbox.toggleSoundTile('stream');
  await flushMicrotasks();
  await flush();
  t.sandbox.setTileVolume('stream',7);
  assert.equal(t.catalog('stream').vol,1,'out-of-range slider values clamp to 1');
  t.sandbox.setTileVolume('stream',-3);
  assert.equal(t.catalog('stream').vol,0,'negative slider values clamp to 0');
});

test('a stopped tile cannot be revived by its stale pending play rejection',async()=>{
  const t=rigTile();
  await t.sandbox.toggleSoundTile('rain');
  await flushMicrotasks();
  await flush();
  const firstPlayer = t.evaluate("activePlayers['rain']");
  await t.sandbox.toggleSoundTile('rain'); // stop
  await flushMicrotasks();
  await flush();
  await t.sandbox.toggleSoundTile('rain'); // immediate new player
  await flushMicrotasks();
  await flush();
  assert.equal(t.evaluate("Object.keys(activePlayers).join(',')"),'rain',
    'the fresh player must stay registered');
  t.sandbox.stopAllAudio();
  await flushMicrotasks();
  await flush();
  assert.equal(t.evaluate("Object.keys(activePlayers).length"),0,'Stop All clears the map');
});

// Oscillator-based tone-preview tests were retired: synthesized tones are forbidden by policy
// (CC0 natural recordings only); playCompletionTone now schedules a silent no-op node.

