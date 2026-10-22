'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../android/app/src/main/assets/web');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const quick=fs.readFileSync(path.join(root,'quick_training.js'),'utf8');
function fixture({running=true,training=true}={}){
 const events=[],messages=[],slots=new Map(),elements=new Map();let failure=null;
 function element(id){
  if(!elements.has(id))elements.set(id,{value:({qtSets:'2',qtWork:'00:20',qtRest:'00:10'})[id]||'',checked:true,
   innerHTML:id==='mainPlayBtn'?(running?'pause':'play'):'',textContent:'Focus',style:{},
   classList:{add(){},remove(){},toggle(){}},parentElement:{querySelectorAll:()=>[]}});
  return elements.get(id);
 }
 const cfg={lang:'en',domain:'study',focusMin:25,shortMin:5,longMin:15,
  sessions:3,sessionHistory:[{id:'historic',minutes:7}],unknown:{keep:'نصي ۱۲'}};
 const c=vm.createContext({cfg,Date,Math,Number,String,JSON,
  timerRunning:running,timerTotal:120,timerLeft:90,timerTargetTime:running?Date.now()+90000:null,
  timerSessionId:'stable-id',focusSessionTaskId:7,timerActiveMs:30000,timerResumeMs:running?Date.now()-10000:null,
  timerInterval:running?17:null,currentTimerModeKey:'focus',customSessionLabel:'Old title',
  quickTraining:training?{active:true,sets:2,currentSet:0,phase:'work',workSeconds:20,restSeconds:10,
   domain:'study',taskId:7,skipLastRest:true,exercises:['Read']}:null,
  quickInternalChange:false,quickPresetDomain:'work',quickExercises:['Read'],
  TIMER_STORAGE_KEY:'zen_fortress_active_timer_v21',
  localStorage:{getItem:k=>slots.get(k)??null,setItem:(k,v)=>slots.set(k,v),removeItem:k=>slots.delete(k)},
  window:{confirm:()=>true,ZenNative:{stopBackgroundService:()=>events.push('native-stop')},DF22Preflight:{nativeAcknowledge:()=>true}},
  document:{getElementById:element},L:()=>({saveFailed:'Could not save',domStudy:'Study',domSport:'Sport',domRead:'Read',domWork:'Work'}),
  showToast:m=>messages.push(m),quickText:k=>k,formatDurationUnit:n=>n+'m',toWest:x=>String(x),
  getDomainFocusMinutes:()=>25,renderDomainState:()=>events.push('domain'),renderQuickTraining:()=>events.push('training'),
  updateTimerDisplay:()=>events.push('display'),updateFocusStatus(){},
  setInterval:()=>{events.push('interval-start');return 18;},clearInterval:()=>events.push('interval-stop'),runTimerTick(){},
  startNativeTimerForCurrentSession:()=>events.push('native-start'),focusWorkflowGetLinkedTask:()=>({id:7}),
  quickWorkflowEvent:(kind,data)=>events.push(['event',kind,JSON.parse(JSON.stringify(data))]),saveQuickConfig:()=>true,
  chimeCtx:null
 });
 function load(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a,start);vm.runInContext(source.slice(a,b),c);}
 load(app,'const SECRET_SALT =','function loadFortressData(');
 load(app,'function storeTimerSession()','function creditCompletedSession()');
 load(app,'function toggleTimerPlay()','function resetTimerNow()');
 load(app,'function accumulateActiveTime()','const TIMER_STORAGE_KEY');
 load(app,'function selectTimerModeFromUser(','function openCustomTimerModal()');
 if(app.includes('function transitionActivityTimer('))load(app,'function transitionActivityTimer(','function switchActivityDomain(');
 load(app,'function switchActivityDomain(','/* Home timer shortcuts');
 load(app,'function startQuickSportRest(','function addReadPages(');
 load(quick,'function parseQuickTime(','function validQuickSnapshot(');
 load(quick,'function startQuickTraining()','function updateFocusStatus()');
 const call=s=>vm.runInContext(s,c);
 call("saveFortressData('zen_fortress_cfg_v21',cfg);storeTimerSession()");
 const writer=c.saveFortressData;
 c.saveFortressData=(key,value)=>{
  events.push(['save',key]);
  if(failure&&key.includes(failure.key)){
   const kind=failure.kind;
   if(kind==='false')return false;
   if(kind==='throw')throw Error('Injected storage rejection');
  }
  return writer(key,value);
 };
 const state=()=>JSON.parse(call('JSON.stringify({cfg,timerRunning,timerTotal,timerLeft,timerTargetTime,timerSessionId,focusSessionTaskId,timerActiveMs,timerResumeMs,timerInterval,currentTimerModeKey,customSessionLabel,quickTraining,quickInternalChange})'));
 events.length=0;
 return {c,slots,events,messages,element,call,state,
  reject(key,kind){failure={key,kind};},accept(){failure=null;},
  saved:()=>JSON.parse(JSON.parse(slots.get('zen_fortress_active_timer_v21')).payload)};
}
module.exports={fixture};
