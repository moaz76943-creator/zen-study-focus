'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const fs=require('node:fs'),path=require('node:path');
const app=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
const java=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/java/com/zenstudy/focus/MainActivity.java'),'utf8');
function actual(name,next){
 const a=app.indexOf('function '+name+'('),b=app.indexOf('function '+next+'(',a+9);
 assert.ok(a>=0&&b>a,'Production function boundary missing '+name);
 return app.slice(a,b);
}
const key='zen_fortress_active_timer_v21';
const packet=snap=>JSON.stringify({payload:JSON.stringify(snap),sig:'valid',ts:123});
test('native checkpoint is a separate fsynced AtomicFile, not another v21 six-family key',()=>{
 assert.match(java,/public boolean acknowledgeActiveTimerSnapshot\(String packet\)/);
 assert.match(java,/public String readActiveTimerSnapshot\(\)/);
 assert.match(java,/new AtomicFile\(new File\(getFilesDir\(\),"active_timer_checkpoint_v1"\)\)/);
 assert.match(java,/\.getFD\(\)\.sync\(\)/);
 assert.match(java,/file\.failWrite\(stream\)/);
 const keys=java.slice(java.indexOf('private static final String[] DURABLE_V21_KEYS'),java.indexOf('private boolean validV21Envelope'));
 assert.doesNotMatch(keys,/zen_fortress_active_timer/,'Never alter existing six-family native v21 contract');
});
function storageFixture(accept){
 const old1='original-primary',old2='original-mirror';
 const map=new Map([[key,old1],[key+'_mirror',old2]]),events=[];
 const window={ZenNative:{acknowledgeActiveTimerSnapshot(raw){events.push(['native',raw]);return accept}}};
 const context={
  TIMER_STORAGE_KEY:key,timerTotal:1500,timerLeft:1499,timerRunning:false,timerTargetTime:null,
  currentTimerModeKey:'focus',customSessionLabel:'',timerSessionId:'stable-id',
  focusSessionTaskId:null,timerActiveMs:1100,timerResumeMs:null,quickTraining:null,window,
  localStorage:{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)},
  saveFortressData(k,snapshot){assert.equal(k,key);const raw=packet(snapshot);map.set(key,raw);map.set(key+'_mirror',raw);events.push(['browser',raw]);return true;},
  showToast(){events.push(['error']);}
 };
 vm.runInNewContext(actual('storeTimerSession','creditCompletedSession'),context);
 return {context,map,events,old1,old2};
}
test('paused snapshot obtains a native durable receipt after writing the unchanged legacy packet',()=>{
 const f=storageFixture(true);
 assert.equal(f.context.storeTimerSession(),true);
 assert.deepEqual(f.events.map(e=>e[0]),['browser','native']);
 assert.equal(f.events[1][1],f.map.get(key));
 assert.equal(JSON.parse(JSON.parse(f.map.get(key)).payload).sessionId,'stable-id');
});
test('failed native ACK leaves previous WebView packet bytes untouched and reports unsuccessful save',()=>{
 const f=storageFixture(false);
 assert.equal(f.context.storeTimerSession(),false);
 assert.equal(f.map.get(key),f.old1);
 assert.equal(f.map.get(key+'_mirror'),f.old2);
 assert.ok(f.events.some(e=>e[0]==='error'));
});
test('reopening uses verified fsynced native pause checkpoint, not a stale WebView running snapshot',()=>{
 const stale={total:1500,left:1350,running:true,endAt:2222,mode:'focus',sessionId:'old-id',activeMs:100000,resumedAt:1000};
 const latest={total:1500,left:1344,running:false,endAt:null,mode:'focus',sessionId:'stable-id',activeMs:156000,resumedAt:null};
 const ctx={
  TIMER_STORAGE_KEY:key,loadFortressData:()=>stale,computeHash:()=> 'valid',
  window:{ZenNative:{readActiveTimerSnapshot:()=>packet(latest)}},
  timerTotal:1500,timerLeft:1500,timerRunning:false,timerSessionId:null,
  currentTimerModeKey:'focus',customSessionLabel:'',focusSessionTaskId:null,quickTraining:null,
  timerActiveMs:0,timerResumeMs:null,timerTargetTime:null,validQuickSnapshot:()=>null,
  updateTimerDisplay(){},document:{getElementById:()=>({innerHTML:''})},setInterval(){throw Error('Should not resume paused checkpoint')},
  Date,Math,Number,JSON
 };
 vm.runInNewContext(actual('restoreTimerSession','syncHeaderMetrics'),ctx);
 ctx.restoreTimerSession();
 assert.equal(ctx.timerSessionId,'stable-id');
 assert.equal(ctx.timerLeft,1344);
 assert.equal(ctx.timerRunning,false);
 assert.equal(ctx.timerActiveMs,156000);
});
