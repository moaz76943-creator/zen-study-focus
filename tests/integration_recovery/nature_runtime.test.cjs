'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
function rig(){
 const audio=[],listeners={};
 class Audio {constructor(){audio.push(this);this.paused=false;this.volume=1;}play(){return Promise.resolve();}pause(){this.paused=true;}removeAttribute(){}load(){}}
 const c=vm.createContext({Audio,document:{},window:{addEventListener:(name,fn)=>listeners[name]=fn},L:()=>({sounds:{}}),showToast(){},renderSoundsStudio(){}});
 vm.runInContext(source.slice(source.indexOf('const SOUNDS_DATA ='),source.indexOf('function filterSoundsByCat(')),c);
 vm.runInContext(source.slice(source.indexOf("if (typeof window.addEventListener === 'function')"),source.indexOf('/* Boot Init */')),c);
 return {audio,listeners,run:s=>vm.runInContext(s,c)};
}
test('live nature channels retain independent requests while summed gains have conservative headroom',()=>{
 const r=rig();r.run("toggleSoundTile('forest');toggleSoundTile('wind');");
 assert.equal(r.audio.length,2);assert.ok(r.audio.reduce((n,a)=>n+a.volume,0)<=.85000001);
 r.run("setTileVolume('forest',1);setTileVolume('wind',1);");
 assert.ok(r.audio.every(a=>Math.abs(a.volume-.425)<1e-8));
 r.run("setTileVolume('forest',0);");assert.equal(r.audio[0].volume,0);assert.ok(r.audio[1].volume<=.85);
 r.run("stopSoundTile('forest');");assert.equal(r.audio[0].paused,true);assert.ok(r.audio[1].volume<=.85);
 r.run('stopAllAudio()');assert.ok(r.audio.every(a=>a.paused));assert.equal(r.run('Object.keys(activePlayers).length'),0);
});
test('unreviewed and missing files stay blocked; rapid toggle and page exit release real channel resources',()=>{
 const r=rig();r.run("toggleSoundTile('earth');toggleSoundTile('waterfall');toggleSoundTile('night');");assert.equal(r.audio.length,0);
 r.run("toggleSoundTile('forest');toggleSoundTile('forest');toggleSoundTile('forest');");
 assert.equal(r.audio.length,2);assert.equal(r.audio[0].paused,true);assert.equal(r.run('Object.keys(activePlayers).length'),1);
 r.listeners.pagehide();assert.ok(r.audio.every(a=>a.paused));assert.equal(r.run('Object.keys(activePlayers).length'),0);
});
