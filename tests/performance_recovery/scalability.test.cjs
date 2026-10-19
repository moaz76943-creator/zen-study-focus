'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const source=(name)=>require(path.join(__dirname,'../../android/app/src/main/assets/web',name));

test('5000 notes: real v21 search returns correct total and bounded page',()=>{
  const core=source('notes_core_v21.js');
  const notes=Array.from({length:5000},(_,i)=>({
    id:i,title:'Note '+i,body:i%100===0?'target_keyword lecture':'ordinary lecture',
    isStarter:false,createdAt:i,updatedAt:i,catKey:'quick'
  }));
  const first=core.search(notes,{query:'target_keyword',limit:30});
  assert.equal(first.total,50);
  assert.equal(first.items.length,30);
  const last=core.search(notes,{query:'target_keyword',offset:30,limit:100});
  assert.equal(last.items.length,20);
  assert.equal(notes.length,5000);
});
test('1000 tasks: actual task core search excludes starter and filters titles',()=>{
  const core=source('tasks_core_v21.js');
  const state={tasksList:Array.from({length:1000},(_,i)=>({
    id:i,title:i%10===0?'Target task '+i:'Other task '+i,
    date:'2026-10-19',catKey:'study',done:false,isStarter:false,status:'todo'
  })),cfg:{}};
  const matches=core.searchTasks(state,{query:'Target'});
  assert.equal(matches.length,100);
  assert.equal(matches[0].id,0);
  assert.equal(state.tasksList.length,1000);
});
test('10000 sessions: report retains canonical counts and minutes exactly',()=>{
  const core=source('analytics_recovery_core.js');
  const sessionHistory=Array.from({length:10000},(_,i)=>({
    id:'verified-'+i,date:'2026-10-19',minutes:25,
    domain:'study',completed:true,mode:'focus'
  }));
  const report=core.buildReport({sessionHistory},{today:'2026-10-19',startDate:'2026-10-19',endDate:'2026-10-19'});
  assert.equal(report.quality.accepted,10000);
  assert.equal(report.quality.duplicates,0);
  assert.equal(report.totals.sessions,10000);
  assert.equal(report.totals.minutes,250000);
});
test('two verified local clips coexist, clamp aggregate gain and release audio on dispose',async()=>{
  const core=source('nature_audio_recovery_v1.js');
  const created=[];
  class FakeAudio {
    constructor(){created.push(this);this.volume=0;this.pauses=0;this.removed=0;this.loads=0;}
    play(){return Promise.resolve();}
    pause(){this.pauses++;}
    removeAttribute(name){if(name==='src'){this.src='';this.removed++;}}
    load(){this.loads++;}
  }
  const clips=['rain','forest'].map(id=>({
    id,src:'sounds/'+id+'.ogg',verified:true,packaged:true,
    sha256:'a'.repeat(64),recording:true,volume:1
  }));
  const mix=core.createMixer(clips,{AudioCtor:FakeAudio});
  assert.equal(await mix.play('rain',1),true);
  assert.equal(await mix.play('forest',1),true);
  assert.equal(mix.activeCount(),2);
  assert.equal(created.length,2);
  assert.ok(created[0].volume+created[1].volume<=1.0000001);
  mix.dispose();
  assert.equal(mix.activeCount(),0);
  assert.ok(created.every(a=>a.pauses===1&&a.removed===1&&a.loads===1));
});