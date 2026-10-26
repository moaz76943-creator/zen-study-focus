'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict'), path=require('node:path');
const lib=require(path.resolve(__dirname,'../../android/app/src/main/assets/web/completion_alert_settings.js'));
class MockAudio {static instances=[];constructor(src){this.src=src;this.paused=false;MockAudio.instances.push(this)}play(){return Promise.resolve()}pause(){this.paused=true}}
test('picker lists five non-musical offline sounds and true silence',()=>{assert.equal(lib.CHOICES.length,6);assert.equal(lib.CHOICES.filter(x=>x.file).length,5);assert.equal(lib.CHOICES[0].id,'silent');});
test('configuration preserves unknown v21 fields and invalid input is not saved',()=>{const cfg={unknown:{x:1},completionAlertSettings:{xOld:99}},save=()=>true;assert.equal(lib.updateCompletionAlertSettings(cfg,{sound:'water-drop',volume:0},save),true);assert.equal(cfg.unknown.x,1);assert.equal(cfg.completionAlertSettings.xOld,99);assert.equal(lib.updateCompletionAlertSettings(cfg,{volume:NaN},save),false);assert.equal(cfg.completionAlertSettings.volume,0)});
test('a failed durable write rolls settings back',()=>{const cfg={completionAlertSettings:{sound:'soft-bell'}};assert.equal(lib.updateCompletionAlertSettings(cfg,{sound:'silent'},()=>false),false);assert.equal(cfg.completionAlertSettings.sound,'soft-bell')});
test('preview is exclusive, cancellable, and never writes focus history',async()=>{MockAudio.instances=[];const cfg={sessionHistory:[{id:'keep',minutes:4}]};const eng=lib.createCompletionAlerts(cfg,{AudioCtor:MockAudio,persist:()=>true});assert.equal(await eng.preview('soft-bell'),true);assert.equal(await eng.preview('water-drop'),true);assert.equal(MockAudio.instances.length,2);assert.equal(MockAudio.instances[0].paused,true);eng.pause();assert.equal(MockAudio.instances[1].paused,true);assert.equal(cfg.sessionHistory.length,1);eng.dispose();assert.equal(await eng.preview('water-drop'),false)});
test('duplicate completion IDs across retry and controller restoration do not replay',async()=>{MockAudio.instances=[];const cfg={};let saves=0;const opts={persist:()=>{saves++;return true},AudioCtor:MockAudio};const a=lib.createCompletionAlerts(cfg,opts);assert.equal(await a.complete({sessionId:'S1',phase:'focus'}),true);assert.equal(await a.complete({sessionId:'S1',phase:'focus'}),false);a.dispose();const b=lib.createCompletionAlerts(cfg,opts);assert.equal(await b.complete({sessionId:'S1',phase:'focus'}),false);assert.equal(MockAudio.instances.length,1);assert.equal(saves,1);b.dispose()});
test('silent, disabled, volume zero and rest do not play',async()=>{for(const settings of [{sound:'silent'},{enabled:false},{volume:0},{includeRest:false}]){const cfg={completionAlertSettings:settings};MockAudio.instances=[];const a=lib.createCompletionAlerts(cfg,{persist:()=>true,AudioCtor:MockAudio});const phase=settings.includeRest===false?'short':'focus';assert.equal(await a.complete({sessionId:'1',phase}),false);assert.equal(MockAudio.instances.length,0);a.dispose()}});
test('a failed ledger write prevents an alert or partial user-data mutation',async()=>{MockAudio.instances=[];const cfg={other:'safe',completionAlertPlayedIds:['string:old']};const a=lib.createCompletionAlerts(cfg,{persist:()=>false,AudioCtor:MockAudio});assert.equal(await a.complete({sessionId:'x',phase:'focus'}),false);assert.deepEqual(cfg.completionAlertPlayedIds,['string:old']);assert.equal(MockAudio.instances.length,0);a.dispose()});
test('missing audio, DND focus gate, background dispose, invalid IDs fail safely',async()=>{MockAudio.instances=[];const cfg={};const a=lib.createCompletionAlerts(cfg,{persist:()=>true,AudioCtor:MockAudio,canOutput:()=>false});assert.equal(await a.preview('water-drop'),false);assert.equal(await a.complete({sessionId:'x',phase:'focus'}),false);assert.equal(MockAudio.instances.length,0);assert.equal(await a.complete({sessionId:null,phase:'focus'}),false);a.dispose()});
test('audio play rejection is handled without replay or stuck player',async()=>{let errors=0;const cfg={};class RejectAudio extends MockAudio{play(){return Promise.reject(Error('codec failure'))}};const a=lib.createCompletionAlerts(cfg,{persist:()=>true,AudioCtor:RejectAudio,onError:()=>errors++});assert.equal(await a.complete({sessionId:'z',phase:'focus'}),false);assert.equal(await a.complete({sessionId:'z',phase:'focus'}),false);assert.equal(errors,1);a.dispose()});
test('numeric/string opaque session IDs are distinct',async()=>{const cfg={},a=lib.createCompletionAlerts(cfg,{persist:()=>true,AudioCtor:MockAudio});assert.equal(await a.complete({sessionId:1,phase:'focus'}),true);assert.equal(await a.complete({sessionId:'1',phase:'focus'}),true);assert.deepEqual(cfg.completionAlertPlayedIds,['number:1','string:1']);a.dispose()});

test('audio callback exceptions never escape completion, release reserved audio focus',async()=>{
 let focusReleases=0;
 class BadDecoder { constructor(){throw Error('broken WAV decoder')} }
 const engine=lib.createCompletionAlerts({},{
  AudioCtor:BadDecoder,persist:()=>true,requestFocus:()=>true,
  releaseFocus:()=>{focusReleases++},
  onError:()=>{throw Error('host UI logger failed')}
 });
 assert.equal(await engine.complete({sessionId:'bad-wav',phase:'focus'}),false);
 assert.equal(focusReleases,1,'Reserved audio focus must be released after decoder failure');
 engine.dispose();
 const badPersist=lib.createCompletionAlerts({},{
  AudioCtor:MockAudio,persist:()=>false,
  onError:()=>{throw Error('host error reporter failed')}
 });
 assert.equal(await badPersist.complete({sessionId:'write-failed',phase:'focus'}),false,
  'Audio error reporting must never break timer completion');
 badPersist.dispose();
 let requestErrors=0;
 const badFocus=lib.createCompletionAlerts({},{
  AudioCtor:MockAudio,persist:()=>true,
  requestFocus:()=>{throw Error('audio focus denied')},
  onError:()=>{requestErrors++;throw Error('host observer failed')}
 });
 assert.equal(await badFocus.preview('soft-bell'),false);
 assert.equal(requestErrors,1);
 badFocus.dispose();
 const badCleanup=lib.createCompletionAlerts({},{
  AudioCtor:MockAudio,persist:()=>true,requestFocus:()=>true,
  releaseFocus:()=>{throw Error('audio focus release denied')}
 });
 assert.equal(await badCleanup.preview('soft-bell'),true);
 assert.doesNotThrow(()=>badCleanup.pause(),'Host cleanup failures must not escape into timer');
 badCleanup.dispose();
});

test('real preview volume is capped, update stops playback and silence never plays',async()=>{
 MockAudio.instances=[];
 const cfg={completionAlertSettings:{sound:'soft-bell',volume:100}};
 const a=lib.createCompletionAlerts(cfg,{persist:()=>true,AudioCtor:MockAudio});
 assert.equal(await a.preview('soft-bell'),true);
 const first=MockAudio.instances.at(-1);
 assert.equal(first.volume,0.65,'100% setting must remain below the safe output cap');
 assert.equal(a.update({volume:10}),true);
 assert.equal(first.paused,true,'Changing gain stops the old preview');
 assert.equal(await a.preview('wood-tap'),true);
 const next=MockAudio.instances.at(-1);
 assert.ok(Math.abs(next.volume-0.065)<1e-9,'10% volume maps to safe output gain');
 assert.equal(a.update({sound:'silent'}),true);
 assert.equal(next.paused,true);
 assert.equal(await a.preview('silent'),false);
 const before=MockAudio.instances.length;
 assert.equal(await a.complete({sessionId:'silent-session',phase:'focus'}),false);
 assert.equal(MockAudio.instances.length,before,'Mute must create no media instance');
 a.dispose();
});
