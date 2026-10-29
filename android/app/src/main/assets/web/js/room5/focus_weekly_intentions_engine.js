/** Deep Focus Room5 B08 — pure offline weekly intention planner, never credits sessions. */
'use strict';
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else if(root)root.DeepFocusWeeklyIntentions=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
  const SCHEMA_VERSION=1;
  const DAYS=Object.freeze(['mon','tue','wed','thu','fri','sat','sun']);
  const PRIORITIES=Object.freeze(['low','normal','high']);
  const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const integer=value=>typeof value==='number'&&Number.isSafeInteger(value);
  const text=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
  const result=(code,field)=>({ok:false,errors:[{code,field}]});
  const validId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(value);
  const hash=seed=>{
    let n=0x811c9dc5;
    for(const c of String(seed)){n^=c.charCodeAt(0);n=Math.imul(n,0x01000193)>>>0;}
    return n.toString(16).padStart(8,'0');
  };
  function validMonday(date){
    if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
    const d=new Date(date+'T12:00:00Z');
    return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===date&&d.getUTCDay()===1;
  }
  function intention(entry,index,week){
    if(!record(entry))return null;
    const title=text(entry.title,120);
    if(!title)return null;
    const day=DAYS.includes(entry.day)?entry.day:'mon';
    const priority=PRIORITIES.includes(entry.priority)?entry.priority:'normal';
    const estimatedMinutes=integer(entry.estimatedMinutes)?Math.max(0,Math.min(1440,entry.estimatedMinutes)):0;
    const id=validId(entry.id)?entry.id:'wi_'+hash(week+'|'+title+'|'+day+'|'+index);
    return {id,title,day,priority,estimatedMinutes,completed:entry.completed===true};
  }
  function normalize(raw){
    if(!record(raw)||!validMonday(raw.weekStart))return null;
    if(raw.intentions!==undefined&&!Array.isArray(raw.intentions))return null;
    const items=[]; const ids=new Set();
    for(const entry of raw.intentions||[]){
      if(items.length>=30)break;
      const next=intention(entry,items.length,raw.weekStart);
      if(!next||ids.has(next.id))continue;
      ids.add(next.id);items.push(next);
    }
    const id=validId(raw.id)?raw.id:'week_'+hash(raw.weekStart);
    return {schemaVersion:1,id,weekStart:raw.weekStart,intentions:items};
  }
  function validateWeeklyPlan(raw){
    if(!record(raw)||raw.schemaVersion!==1)return result('INVALID_SCHEMA','schemaVersion');
    const normalized=normalize(raw);
    if(!normalized)return result('INVALID_PLAN','plan');
    if(JSON.stringify(raw)!==JSON.stringify(normalized))return result('NON_CANONICAL_PLAN','plan');
    return {ok:true,errors:[]};
  }
  function planOf(raw){return record(raw)&&raw.schemaVersion===1?normalize(raw):null;}
  function createWeeklyPlan(spec){
    const plan=normalize(spec);
    return plan?{ok:true,plan}:result('INVALID_SPEC','plan');
  }
  function edit(raw,id,fn){
    const plan=planOf(raw);
    if(!plan)return result('INVALID_PLAN','plan');
    const index=plan.intentions.findIndex(x=>x.id===id);
    if(index<0)return result('INTENTION_NOT_FOUND','id');
    const intentions=plan.intentions.map((x,i)=>i===index?fn(x):x);
    return {ok:true,plan:{...plan,intentions}};
  }
  function setCompleted(raw,id,completed){
    if(typeof completed!=='boolean')return result('INVALID_COMPLETED','completed');
    return edit(raw,id,x=>({...x,completed}));
  }
  function moveIntention(raw,id,day){
    if(!DAYS.includes(day))return result('INVALID_DAY','day');
    return edit(raw,id,x=>({...x,day}));
  }
  function addIntention(raw,input){
    const plan=planOf(raw);
    if(!plan)return result('INVALID_PLAN','plan');
    if(plan.intentions.length>=30)return result('INTENTION_LIMIT','intentions');
    const next=intention(input,plan.intentions.length,plan.weekStart);
    if(!next)return result('INVALID_INTENTION','intention');
    if(plan.intentions.some(x=>x.id===next.id))return result('DUPLICATE_INTENTION','id');
    return {ok:true,plan:{...plan,intentions:[...plan.intentions,next]}};
  }
  function removeIntention(raw,id){
    const plan=planOf(raw);
    if(!plan)return result('INVALID_PLAN','plan');
    if(!plan.intentions.some(x=>x.id===id))return result('INTENTION_NOT_FOUND','id');
    return {ok:true,plan:{...plan,intentions:plan.intentions.filter(x=>x.id!==id)}};
  }
  function summarizeWeeklyPlan(raw){
    const plan=planOf(raw);
    if(!plan)return null;
    const done=plan.intentions.filter(x=>x.completed);
    return {total:plan.intentions.length,completed:done.length,plannedMinutes:plan.intentions.reduce((n,x)=>n+x.estimatedMinutes,0),doneMinutes:done.reduce((n,x)=>n+x.estimatedMinutes,0)};
  }
  function serialize(raw){
    const plan=planOf(raw);
    if(!plan)throw new TypeError('Invalid weekly plan');
    return JSON.stringify(plan);
  }
  function migrate(raw){
    if(!record(raw)||![0,1].includes(raw.schemaVersion))return result('UNSUPPORTED_SCHEMA','schemaVersion');
    return createWeeklyPlan(raw);
  }
  function parse(raw){
    if(typeof raw!=='string'||raw.length>500000)return result('INVALID_SERIALIZED','source');
    try{return migrate(JSON.parse(raw));}catch{return result('INVALID_JSON','source');}
  }
  return Object.freeze({SCHEMA_VERSION,DAYS,PRIORITIES,createWeeklyPlan,validateWeeklyPlan,setCompleted,moveIntention,addIntention,removeIntention,summarizeWeeklyPlan,serialize,parse,migrate});
});
