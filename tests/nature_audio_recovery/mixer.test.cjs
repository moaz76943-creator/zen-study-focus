const test = require('node:test');
const assert = require('node:assert/strict');
const {createMixer, eligible} = require('../../android/app/src/main/assets/web/nature_audio_recovery_v1.js');
const HASH = 'a'.repeat(64);
const clip = (id, overrides = {}) => ({id,src:'nature_audio/'+id+'.ogg',sha256:HASH,verified:true,packaged:true,recording:true,volume:0.7,loop:true,...overrides});
class FakeAudio {
  static instances=[];
  constructor(){this.volume=0;this.pauses=0;this.loads=0;FakeAudio.instances.push(this);}
  play(){ return Promise.resolve(); }
  pause(){this.pauses++;}
  removeAttribute(key){if(key==='src')this.src='';}
  load(){this.loads++;}
}
test('rejects unverified, remote, path traversal and non-field-recordings',async()=>{
  for(const x of [clip('a',{verified:false}),clip('b',{src:'https://example.org/b.ogg'}),clip('c',{src:'sounds/../c.ogg'}),clip('d',{recording:false}),clip('e',{sha256:null})]) assert.equal(eligible(x),false);
  const m=createMixer([clip('a',{verified:false})],{AudioCtor:FakeAudio});
  assert.equal(await m.play('a'),false); assert.equal(m.activeCount(),0);
});
test('independent volume, safe summed peak, 0% mute and duplicate prevention',async()=>{
  FakeAudio.instances.length=0;
  const m=createMixer([clip('rain'),clip('fire')],{AudioCtor:FakeAudio});
  assert.equal(await m.play('rain',1),true); assert.equal(await m.play('fire',1),true);
  assert.equal(m.activeCount(),2); assert.equal(FakeAudio.instances.length,2);
  assert.equal(FakeAudio.instances[0].volume,0.5);
  assert.equal(FakeAudio.instances[1].volume,0.5);
  await m.play('rain'); assert.equal(FakeAudio.instances.length,2);
  assert.equal(m.setVolume('rain',0),true);
  assert.equal(FakeAudio.instances[0].volume,0);
  assert.equal(FakeAudio.instances[1].volume,1);
  m.stopAll(); assert.equal(m.activeCount(),0);
  assert.ok(FakeAudio.instances.every(a=>a.pauses===1 && a.loads===1 && a.src===''));
});
test('a late promise rejection never restarts after stop',async()=>{
  let reject; class Slow extends FakeAudio { play(){return new Promise((_,rej)=>{reject=rej;});} }
  const errors=[]; const m=createMixer([clip('wind')],{AudioCtor:Slow,onError:(...a)=>errors.push(a)});
  const pending=m.play('wind'); m.stop('wind'); reject(new Error('late'));
  assert.equal(await pending,false); assert.equal(m.activeCount(),0); assert.equal(errors.length,0);
});
test('decode error tears down; one-shot ends; dispose prevents new audio',async()=>{
  const errors=[]; const m=createMixer([clip('storm',{loop:false})],{AudioCtor:FakeAudio,onError:(...a)=>errors.push(a)});
  await m.play('storm'); const a=FakeAudio.instances.at(-1); assert.equal(a.loop,false);
  a.onerror(); assert.equal(m.activeCount(),0); assert.deepEqual(errors[0],['storm','DECODE_OR_FILE_ERROR']);
  await m.play('storm'); FakeAudio.instances.at(-1).onended(); assert.equal(m.activeCount(),0);
  m.dispose(); assert.equal(await m.play('storm'),false);
});
test('background pause/resume keeps independent player objects',async()=>{
  const m=createMixer([clip('birds'),clip('wind')],{AudioCtor:FakeAudio});
  await m.play('birds'); await m.play('wind'); m.pauseAll();
  assert.equal(m.activeCount(),2); assert.equal(await m.resumeAll(),true);
  assert.equal(m.activeCount(),2); m.dispose(); assert.equal(m.activeCount(),0);
});
