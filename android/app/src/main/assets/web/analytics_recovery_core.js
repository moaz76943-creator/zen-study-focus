/* DEEP-FOCUS-RECOVERY-09: read-only v21 analytics. No storage, clock or timer writes. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.DeepFocusAnalyticsRecovery=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const DOMAINS=Object.freeze(['study','read','work','sport']);
 const ALIAS=Object.freeze({study:'study',read:'read',review:'read',work:'work',exam:'work',sport:'sport'});
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const rec=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 const round=x=>Math.round((x+Number.EPSILON)*1000)/1000;
 function validDay(s){
  if(typeof s!=='string'||!/^([1-9]\d{3})-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(s))return false;
  const d=new Date(s+'T12:00:00Z');
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;
 }
 function dayNum(s){return Math.floor(Date.parse(s+'T12:00:00Z')/86400000);}
 function dayAt(n){return new Date(n*86400000+43200000).toISOString().slice(0,10);}
 function today(date=new Date()){
  if(!(date instanceof Date)||!Number.isFinite(date.getTime()))throw new RangeError('Invalid local clock');
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
 }
 const idKey=id=>typeof id==='string'&&id.length>0&&id.length<=256?'s:'+id:
  Number.isSafeInteger(id)&&id>=0?'n:'+id:null;
 const rejectsSample=s=>s.isStarter===true||s.isDemo===true||s.demo===true||
  s.isTest===true||s.synthetic===true||['demo','sample','fixture','test','synthetic'].includes(s.source);
 function notFocus(s){
  if(s.completed===false||s.isComplete===false)return true;
  const mode=typeof s.mode==='string'?s.mode.toLowerCase():'';
  const type=typeof s.type==='string'?s.type.toLowerCase():'';
  const status=typeof s.status==='string'?s.status.toLowerCase():'';
  return ['rest','break','shortbreak','longbreak','short-rest','long-rest','pause'].includes(mode)||
   ['rest','break'].includes(type)||
   ['cancelled','canceled','in-progress','in_progress','running','paused','failed','aborted','unfinished','rest','break'].includes(status);
 }
 function timestamp(v){
  if(typeof v==='number')return Number.isSafeInteger(v)&&v>=0?v:null;
  if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(v))return null;
  const n=Date.parse(v);return Number.isFinite(n)?n:null;
 }
 function normalizeSessions(raw){
  const sessions=[],rejects=[],seen=new Map(),quality={
   accepted:0,excluded:0,duplicates:0,conflicts:0,invalid:0,samples:0,nonFocus:0,legacyUnverified:0
  };
  const addReject=(index,reason)=>{rejects.push({index,reason});quality.excluded++;
   if(reason==='DUPLICATE_ID'||reason==='CONFLICTING_DUPLICATE'){quality.duplicates++;if(reason==='CONFLICTING_DUPLICATE')quality.conflicts++;}
   else if(reason==='SAMPLE')quality.samples++;
   else if(reason==='NON_FOCUS')quality.nonFocus++;
   else quality.invalid++;
  };
  if(!Array.isArray(raw))return {sessions,rejects,quality};
  for(let i=0;i<raw.length;i++){
   const s=raw[i];
   if(!rec(s)){addReject(i,'INVALID_RECORD');continue;}
   if(rejectsSample(s)){addReject(i,'SAMPLE');continue;}
   if(notFocus(s)){addReject(i,'NON_FOCUS');continue;}
   const id=idKey(s.id);
   if(id===null){addReject(i,'INVALID_ID');continue;}
   if(!validDay(s.date)){addReject(i,'INVALID_DATE');continue;}
   if(typeof s.minutes!=='number'||!Number.isFinite(s.minutes)||s.minutes<0||s.minutes>1440){
    addReject(i,'INVALID_MINUTES');continue;
   }
   if(!own(ALIAS,s.domain)){addReject(i,'INVALID_DOMAIN');continue;}
   const domain=ALIAS[s.domain];
   const previously=seen.get(id);
   if(previously){
    const same=previously.date===s.date&&previously.minutes===s.minutes&&previously.domain===domain;
    addReject(i,same?'DUPLICATE_ID':'CONFLICTING_DUPLICATE');continue;
   }
   const start=timestamp(s.startedAt),end=timestamp(s.endedAt);
   const verified=s.timeEvidence==='timer-monotonic-v1'&&start!==null&&end!==null&&
    end>=start&&end-start<=86400000;
   const row={id:s.id,date:s.date,minutes:s.minutes,domain,
    startedAt:verified?new Date(start).toISOString():null,
    endedAt:verified?new Date(end).toISOString():null,
    timingVerified:verified,taskId:Number.isSafeInteger(s.taskId)&&s.taskId>=0?s.taskId:null};
   sessions.push(row);seen.set(id,row);
   if(!verified)quality.legacyUnverified++;
  }
  quality.accepted=sessions.length;
  return {sessions,rejects,quality};
 }
 function summarize(rows){
  let min=0;for(const r of rows)min+=r.minutes;
  min=round(min);
  return {minutes:min,sessions:rows.length,averageMinutes:rows.length?Math.round(min/rows.length*100)/100:null};
 }
 function calendarWeek(day){
  const n=dayNum(day),dow=new Date(day+'T12:00:00Z').getUTCDay();
  return dayAt(n-(dow+6)%7);
 }
 function aggregate(rows,key){
  const groups=new Map();
  for(const s of rows){const k=key(s),v=groups.get(k)||{key:k,minutes:0,sessions:0};
   v.minutes+=s.minutes;v.sessions++;groups.set(k,v);}
  return [...groups.values()].sort((a,b)=>a.key.localeCompare(b.key))
    .map(r=>({...r,minutes:round(r.minutes)}));
 }
 function streaks(rows,now){
  const dates=[...new Set(rows.filter(s=>s.minutes>0&&s.date<=now).map(s=>s.date))].sort();
  let longest=0,count=0,previous=null;
  for(const d of dates){const n=dayNum(d);count=previous===n-1?count+1:1;longest=Math.max(longest,count);previous=n;}
  const set=new Set(dates);let cursor=dayNum(now);
  if(!set.has(now))cursor--;
  let current=0;
  while(set.has(dayAt(cursor))){current++;cursor--;}
  return {current,longest,rule:'positive minutes on consecutive credited local dates, today or yesterday'};
 }
 function goalReport(snapshots,rows,start,end,domain){
  if(!Array.isArray(snapshots))return {available:false,byDomain:[],snapshotDays:0};
  const unique=new Map();
  for(const r of snapshots){
   if(!rec(r)||!validDay(r.date)||r.date<start||r.date>end||
      !DOMAINS.includes(r.domain)||(domain!=='all'&&domain!==r.domain)||
      typeof r.targetMinutes!=='number'||!Number.isFinite(r.targetMinutes)||
      r.targetMinutes<=0||r.targetMinutes>1440)continue;
   const key=r.date+'|'+r.domain;
   if(!unique.has(key))unique.set(key,{date:r.date,domain:r.domain,targetMinutes:r.targetMinutes});
  }
  const out=[];
  for(const d of DOMAINS){
   const goals=[...unique.values()].filter(x=>x.domain===d);
   if(!goals.length)continue;
   const days=new Set(goals.map(g=>g.date));
   const actual=round(rows.filter(x=>x.domain===d&&days.has(x.date)).reduce((t,x)=>t+x.minutes,0));
   const target=round(goals.reduce((t,g)=>t+g.targetMinutes,0));
   out.push({domain:d,actualMinutes:actual,targetMinutes:target,coverageDays:days.size,
    progress:Math.round(actual/target*10000)/100});
  }
  return {available:out.length>0,byDomain:out,snapshotDays:new Set([...unique.values()].map(x=>x.date)).size};
 }
 function buildReport(snapshot={},opts={}){
  if(!rec(snapshot))throw new TypeError('Expected snapshot');
  const now=opts.today===undefined?today():opts.today;
  if(!validDay(now))throw new RangeError('Invalid today');
  const end=opts.endDate===undefined?now:opts.endDate;
  const start=opts.startDate===undefined?(validDay(end)?dayAt(dayNum(end)-29):''):opts.startDate;
  if(!validDay(start)||!validDay(end)||start>end)throw new RangeError('Invalid or reversed date range');
  const days=dayNum(end)-dayNum(start)+1;
  if(days>3660)throw new RangeError('Range exceeds 3660 days');
  const domain=opts.domain||'all';
  if(domain!=='all'&&!DOMAINS.includes(domain))throw new RangeError('Invalid domain');
  const cfg=rec(snapshot.cfg)?snapshot.cfg:{};
  const source=Array.isArray(snapshot.sessionHistory)?snapshot.sessionHistory:cfg.sessionHistory;
  const norm=normalizeSessions(source);
  const usable=norm.sessions.filter(s=>domain==='all'||domain===s.domain);
  const rows=usable.filter(s=>s.date>=start&&s.date<=end);
  const linked=new Set((Array.isArray(snapshot.tasksList)?snapshot.tasksList:[])
   .filter(t=>rec(t)&&Number.isSafeInteger(t.id)&&t.id>=0&&!rejectsSample(t)&&t.archived!==true)
   .map(t=>t.id));
  const sessions=rows.map(s=>({...s,taskId:s.taskId!==null&&linked.has(s.taskId)?s.taskId:null}));
  const byDay=new Map(aggregate(sessions,s=>s.date).map(v=>[v.key,v]));
  const daily=Array.from({length:days},(_,i)=>{
   const key=dayAt(dayNum(start)+i);return byDay.get(key)||{key,minutes:0,sessions:0};
  });
  const byDomain=Object.fromEntries(DOMAINS.map(d=>[d,summarize(sessions.filter(s=>s.domain===d))]));
  const through=(n)=>summarize(usable.filter(s=>s.date<=now&&s.date>=dayAt(dayNum(now)-(n-1))));
  const endN=dayNum(end);
  const current=summarize(usable.filter(s=>s.date>=dayAt(endN-6)&&s.date<=end));
  const previous=summarize(usable.filter(s=>s.date>=dayAt(endN-13)&&s.date<dayAt(endN-6)));
  const total=summarize(sessions);
  const changePercent=previous.minutes===0?null:Math.round((current.minutes-previous.minutes)/previous.minutes*10000)/100;
  const quality={...norm.quality,inRange:sessions.length,timingVerified:sessions.filter(s=>s.timingVerified).length};
  return {period:{startDate:start,endDate:end,domain,days},totals:total,
   sessions,daily,weekly:aggregate(sessions,s=>calendarWeek(s.date)),
   monthly:aggregate(sessions,s=>s.date.slice(0,7)),byDomain,quality,
   dashboard:{today:through(1),last7:through(7),last30:through(30)},
   comparison:{current,previous,changeMinutes:round(current.minutes-previous.minutes),changePercent,
    rule:'rolling seven credited days against preceding seven credited days'},
   streaks:streaks(norm.sessions,now),
   goals:goalReport(opts.goalSnapshots||snapshot.goalSnapshots,sessions,start,end,domain)};
 }
 function csvCell(value){
  let s=value===null||value===undefined?'':String(value);
  // Keep historical IDs untouched except neutralizing spreadsheet formula execution.
  if(/^[\s\uFEFF]*[=+@-]/.test(s)&&!/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
 }
 function toCSV(report,kind='sessions'){
  if(!rec(report)||!Array.isArray(report.sessions))throw new TypeError('Expected analytics report');
  let headers,rows;
  if(kind==='sessions'){
   headers=['id','date','domain','minutes','startedAt','endedAt','timingVerified','taskId'];
   rows=report.sessions.map(x=>headers.map(k=>x[k]));
  }else if(kind==='daily'){headers=['date','minutes','sessions'];rows=report.daily.map(x=>[x.key,x.minutes,x.sessions]);}
  else if(kind==='weekly'||kind==='monthly'){
   headers=['period','minutes','sessions'];rows=report[kind].map(x=>[x.key,x.minutes,x.sessions]);
  }else throw new RangeError('Invalid CSV kind');
  return [headers,...rows].map(x=>x.map(csvCell).join(',')).join('\r\n')+'\r\n';
 }
 function createExportController(saver){
  if(typeof saver!=='function')throw new TypeError('A verified export adapter is required');
  let busy=false;
  const api={get busy(){return busy;},
   async submit(report,kind='sessions'){
    if(busy)return {status:'busy'};
    let csv;
    try{csv=toCSV(report,kind);}catch(e){return {status:'failed',reason:'invalid-report'};}
    busy=true;
    try{
     // A native file chooser STARTING is not success. The adapter must await SAF write/cancel.
     const response=await saver({csv,filename:'deep-focus-'+kind+'.csv',mime:'text/csv;charset=utf-8'});
     if(!rec(response)||!['saved','cancelled','failed'].includes(response.status))
      return {status:'failed',reason:'unverified-result'};
     return response.status==='failed'?{status:'failed',reason:'write-failed'}:{status:response.status};
    }catch(e){return {status:'failed',reason:'write-failed'};}
    finally{busy=false;}
   }};
  return Object.freeze(api);
 }
 return Object.freeze({DOMAINS,validDay,today,normalizeSessions,summarize,buildReport,toCSV,
  createExportController});
});
