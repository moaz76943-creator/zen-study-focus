'use strict';
// Disposable Android runtime assertions. No mocked clock, packets or DOM.
const assert=require('node:assert/strict'),cp=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const PKG='com.zenstudy.focus';
const FAMILIES={cfg:'cfg',tasks:'tasksList',notes:'notesList'};
const CASE_NAMES=[...Object.keys(FAMILIES).map(k=>'mirror_recovery_'+k),
 ...['tasksList','notesList'].flatMap(k=>['duplicate','corrupt'].map(kind=>'reject_'+kind+'_'+k)),
 'native_atomicfile_partial_stage_restart_recovery','interrupted_journal_disk_and_process_recovery','real_timer_failed_credit_retry_exactly_once'];
function walProof(adb,read,marker,diagnostic={}){
 const listed=adb('shell','run-as',PKG,'find','app_webview','-maxdepth','8','-type','f','-name',"'*.log'").split('\n').map(s=>s.trim());
 const files=listed.filter(s=>/^app_webview\/(?:Default\/|Profile [0-9]+\/)?Local Storage\/leveldb\/[0-9]+\.log$/.test(s)).sort().slice(-8);
 diagnostic.listed_log_count=listed.filter(Boolean).length;diagnostic.accepted_logs=files.length;diagnostic.files=[];
 for(const file of files){
  let bytes;try{bytes=read(file);}catch(_){diagnostic.files.push({file:path.basename(file),read:false});continue;} // LevelDB can rotate a WAL between listing and reading.
  diagnostic.files.push({file:path.basename(file),bytes:bytes.length,read:true});
  for(const encoding of ['utf8','utf16le'])if(bytes.includes(Buffer.from(marker,encoding)))
   return {file:path.basename(file),sha256:crypto.createHash('sha256').update(bytes).digest('hex'),encoding,journal_marker_observed:true};
 }
 return null;
}
function saveProof(name,value){
 if(process.env.RUNNER_TEMP)fs.writeFileSync(path.join(process.env.RUNNER_TEMP,'df-pr01-android',name+'.json'),JSON.stringify(value,null,2));
}
function createNativeFaultCases(driver){
 const {evaluate,snapshot,receipt,fixture,restart,adb,nativeUI,tapUI}=driver;
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const device=(fn,arg)=>evaluate('('+fn.toString()+')('+JSON.stringify(arg)+')');
 const cases={};
 for(const slot of Object.keys(FAMILIES))cases['mirror_recovery_'+slot]=async()=>{
  const before=await fixture(),ack=await receipt();
  const result=await device(function(slot){
   const D=DeepFocusDataCompatV21,key=D.KEYS[slot],original=localStorage.getItem(key),mirror=localStorage.getItem(key+'_mirror');
   const expected=D.inspectPacket(mirror);
   if(!expected.ok)throw Error('Healthy mirror prerequisite absent');
   try{
    localStorage.setItem(key,'DF07_CORRUPT_PRIMARY');
    const recovered=loadFortressData(key,{unexpectedFallback:true});
    return {primaryInvalid:!D.inspectPacket(localStorage.getItem(key)).ok,
     recovered:JSON.stringify(recovered)===JSON.stringify(expected.value),mirrorUnchanged:localStorage.getItem(key+'_mirror')===mirror};
   }finally{if(original===null)localStorage.removeItem(key);else localStorage.setItem(key,original);}
  },slot);
  assert.deepEqual(result,{primaryInvalid:true,recovered:true,mirrorUnchanged:true});
  assert.deepEqual(await fixture(),before);assert.deepEqual(await receipt(),ack);
  return 'Actual Android loadFortressData recovered checksum-verified mirror after corrupt primary; original bytes restored';
 };
 for(const field of ['tasksList','notesList'])for(const kind of ['duplicate','corrupt'])cases['reject_'+kind+'_'+field]=async()=>{
  const before=await snapshot(),ack=await receipt();
  const result=await device(function(args){
   const before=DF22Integration.getSnapshot(),after=JSON.parse(JSON.stringify(before)),list=after[args.field];
   if(list.length<2)throw Error('ID fixture prerequisite absent');
   list[list.length-1].id=args.kind==='duplicate'?list[0].id:{invalid:true};
   try{DF22Integration.write(before,after);return {rejected:false};}
   catch(error){return {rejected:true,error:String(error.message)};}
  },{field,kind});
  if(!result.rejected)await device(function(original){
   return DF22Integration.write(DF22Integration.getSnapshot(),original);
  },before); // Restore only our disposable fixture if a regression published it.
  assert.equal(result.rejected,true);assert.match(result.error,/Record validation failed:/);
  assert.deepEqual(await snapshot(),before);assert.deepEqual(await receipt(),ack);
  return 'Actual Android validator rejected '+kind+' '+field+' IDs before journal/native publication';
 };
 cases.native_atomicfile_partial_stage_restart_recovery=async()=>{
  if(process.env.DF_ANDROID_DISPOSABLE!=='1')throw Error('TRANSPORT: native stage probe requires disposable emulator');
  const before=await snapshot(),records=await fixture();
  const baseHash=adb('shell','run-as',PKG,'sha256sum','files/v21_durable_packets_v1').split(/\s+/)[0];
  let staged=false;
  try{
   // Atomic noclobber staging preserves any preexisting write. This is an
   // interrupted-file fixture; actual framework recovery runs after force-stop.
   adb('shell','run-as',PKG,'sh','-c',"'set -C; printf DF07_PARTIAL_NATIVE_STAGE > files/v21_durable_packets_v1.new'");staged=true;
   assert.equal(adb('shell','run-as',PKG,'cat','files/v21_durable_packets_v1.new'),'DF07_PARTIAL_NATIVE_STAGE');
   await restart();
   assert.deepEqual(await snapshot(),before);assert.deepEqual(await fixture(),records);assert.equal((await receipt()).valid,true);
   assert.equal(adb('shell','run-as',PKG,'sh','-c',"'test ! -e files/v21_durable_packets_v1.new && printf ABSENT'"),'ABSENT');
   saveProof('native-partial-stage-recovery',{base_sha256_before:baseHash,partial_stage_physically_verified:true,
    process_restart:true,stage_removed_by_framework:true,records_unchanged:true,native_receipt_valid:true});
   return 'Physically verified partial AtomicFile .new fixture; actual framework discarded it and recovered prior receipt after force-stop/relaunch';
  }finally{
   if(staged)try{
    if(adb('shell','run-as',PKG,'cat','files/v21_durable_packets_v1.new')==='DF07_PARTIAL_NATIVE_STAGE')
     adb('shell','run-as',PKG,'rm','files/v21_durable_packets_v1.new');
   }catch(_){}
  }
 };
 cases.interrupted_journal_disk_and_process_recovery=async()=>{
  if(process.env.DF_ANDROID_DISPOSABLE!=='1')throw Error('TRANSPORT: journal disk probe requires disposable emulator');
  const before=await fixture();let recovered=false;
  try{
   const prepared=await device(function(){
    const D=DeepFocusDataCompatV21,original=D.captureRaw(localStorage),after=DF22Integration.getSnapshot();
    after.cfg.df07Seq=(after.cfg.df07Seq||0)+9877;
    const expected={[D.KEYS.cfg]:D.encodePacket(after.cfg)},marker='DF07_PENDING_'+Date.now();
    localStorage.setItem(D.JOURNAL_KEY,JSON.stringify({version:1,state:'pending',original,expected,probeMarker:marker}));
    localStorage.setItem(D.KEYS.cfg,expected[D.KEYS.cfg]);
    const pending=D.inspectPending(localStorage),native=JSON.parse(ZenNative.readDurableV21()).packets;
    return {marker,pending:pending.pending&&pending.valid,changed:localStorage.getItem(D.KEYS.cfg)!==original[D.KEYS.cfg],
     nativeUnchanged:Object.keys(original).every(key=>native[key]===original[key])};
   });
   assert.equal(prepared.pending,true);assert.equal(prepared.changed,true);assert.equal(prepared.nativeUnchanged,true);
   // Real Android lifecycle transition requests browser storage flushing;
   // the disk marker must still be independently observed before force-stop.
   adb('shell','input','keyevent','KEYCODE_HOME');await pause(500);
   let trimRequested=true;try{adb('shell','am','send-trim-memory',PKG,'HIDDEN');}catch(_){trimRequested=false;}
   let proof=null,diagnostic={trim_requested:trimRequested};
   const read=file=>cp.execFileSync('adb',['-s','emulator-5554','exec-out','run-as',PKG,'cat',"'"+file+"'"],{timeout:20000,maxBuffer:16*1024*1024});
   for(let i=0;i<24;i++){
    try{proof=walProof(adb,read,prepared.marker,diagnostic);}catch(_){diagnostic.list_failed=true;}if(proof)break;await pause(500);
   }
   saveProof('interrupted-journal-probe-metadata',diagnostic);
   if(!proof)throw Error('TRANSPORT: pending journal not independently observed in Android LevelDB WAL');
   saveProof('interrupted-journal-disk-proof',proof); // Hash/metadata only; never upload WAL bytes.
   await restart();
   assert.deepEqual(await fixture(),before);assert.equal((await receipt()).valid,true);
   assert.equal(await evaluate('DeepFocusDataCompatV21.inspectPending(localStorage).pending'),false);
   recovered=true;
   return 'Pending journal independently observed in actual Android WAL; partial unacknowledged cfg rolled back from native checkpoint after force-stop/relaunch';
  }finally{
   if(!recovered)try{await evaluate('DF22Preflight.replayNative(localStorage);true');}catch(_){}
  }
 };
 cases.real_timer_failed_credit_retry_exactly_once=async()=>{
  const records=await fixture(),ack=await receipt();let hookInstalled=false;
  const play=async()=>{
   const control=await nativeUI('actual timer Play button',xml=>[...xml.matchAll(/<node[^>]*>/g)].map(m=>m[0]).find(node=>
    node.includes('package="'+PKG+'"')&&node.includes('clickable="true"')&&/(?:text|content-desc)="Start or pause timer"/.test(node)),false);
   tapUI(control.item);
  };
  const startedHost=Date.now();let state;
  try{
   const baseline=await device(function(){
    if(timerRunning||quickTraining?.active)throw Error('Fresh stopped timer prerequisite absent');
    selectTimerMode(1,'focus',document.getElementById('modeFocusBtn'));
    const original=Storage.prototype.setItem;
    window.__DF07TimerFault={original,hit:false,phase:null,started:Date.now()};
    const key=DeepFocusDataCompatV21.KEYS.cfg+'_mirror';
    Storage.prototype.setItem=function(k,v){
     const fault=window.__DF07TimerFault;
     if(k===key&&!fault.hit&&timerLeft===0&&currentTimerModeKey==='focus'){fault.hit=true;fault.phase={id:timerSessionId,left:timerLeft,mode:currentTimerModeKey};throw new DOMException('DF07 timer mirror fault','QuotaExceededError');}
     return original.call(this,k,v);
    };
    return {sessions:Number(cfg.sessions||0),minutes:Number(cfg.todayMins||0),date:localDateISO()};
   });
   hookInstalled=true;await play();
   const session=await evaluate('({id:timerSessionId,running:timerRunning,total:timerTotal})');
   assert.equal(session.running,true);assert.equal(session.total,60);assert.equal(typeof session.id,'string');
   const deadline=Date.now()+95000;
   while(Date.now()<deadline){
    state=await evaluate('({fault:window.__DF07TimerFault.hit,phase:window.__DF07TimerFault.phase,running:timerRunning,left:timerLeft,elapsed:Date.now()-window.__DF07TimerFault.started})');
    if(state.fault&&!state.running&&state.left===0)break;
    await pause(1000);
   }
   assert.equal(state.fault,true,'Actual one-minute completion never reached mirror fault');
   assert.equal(state.phase.left,0);assert.equal(state.phase.mode,'focus');assert.equal(state.phase.id,session.id);
   assert.ok(state.elapsed>=60000&&Date.now()-startedHost>=60000,'A real minute must elapse; no accelerated clock');
   let cfg=(await snapshot()).cfg;
   assert.equal(Number(cfg.sessions||0),baseline.sessions);assert.equal(Number(cfg.todayMins||0),baseline.minutes);
   assert.deepEqual(await receipt(),ack,'Failed timer credit advanced Native ACK');
   await evaluate('Storage.prototype.setItem=window.__DF07TimerFault.original;delete window.__DF07TimerFault;true');hookInstalled=false;
   await play(); // Real native accessibility action retries the retained completion.
   const count=()=>device(function(id){return {count:(cfg.sessionHistory||[]).filter(s=>s.id===id).length,sessions:Number(cfg.sessions||0),minutes:Number(cfg.todayMins||0),record:(cfg.sessionHistory||[]).find(s=>s.id===id),date:localDateISO()};},session.id);
   let credited;
   for(let i=0;i<20;i++){credited=await count();if(credited.count)break;await pause(250);}
   if(credited.date!==baseline.date)throw Error('TRANSPORT: real timer crossed daily metrics boundary');
   assert.equal(credited.count,1);assert.equal(credited.record.minutes,1);assert.equal(credited.record.completed,true);
   assert.equal(credited.sessions,baseline.sessions+1);assert.equal(credited.minutes,baseline.minutes+1);
   const replay=()=>device(function(id){
    const oldId=timerSessionId,oldMode=currentTimerModeKey,before=JSON.stringify(DeepFocusDataCompatV21.captureRaw(localStorage));
    try{timerSessionId=id;currentTimerModeKey='focus';return {first:creditCompletedSession(),second:creditCompletedSession(),unchanged:before===JSON.stringify(DeepFocusDataCompatV21.captureRaw(localStorage))};}
    finally{timerSessionId=oldId;currentTimerModeKey=oldMode;}
   },session.id);
   assert.deepEqual(await replay(),{first:true,second:true,unchanged:true});assert.equal((await receipt()).valid,true);
   await restart();assert.deepEqual(await count(),credited);assert.deepEqual(await replay(),{first:true,second:true,unchanged:true});
   assert.deepEqual(await fixture(),records);assert.equal((await receipt()).valid,true);
   saveProof('real-timer-exactly-once',{real_elapsed_ms:state.elapsed,mirror_fault_at_completion:true,native_unchanged_on_failure:true,
    one_minute_credited_once:true,duplicate_replay_unchanged:true,verified_after_process_restart:true});
   return 'Real 60-second timer, actual Play/retry taps, completion mirror failure rollback, one durable minute/session, duplicate completion replay and process restart verified';
  }finally{
   if(hookInstalled)try{await evaluate('Storage.prototype.setItem=window.__DF07TimerFault.original;delete window.__DF07TimerFault;true');}catch(_){}
  }
 };
 return cases;
}
module.exports={CASE_NAMES,createNativeFaultCases,walProof};
