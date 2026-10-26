/* Deep Focus v21 analytics: pure, read-only, no timer/storage side effects. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DeepFocusAnalyticsV21 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DOMAINS = Object.freeze(['study', 'read', 'work', 'sport']);
  const aliases = Object.freeze({study:'study', read:'read', review:'read', work:'work', exam:'work', sport:'sport'});
  const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
  const isRecord = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  function validDay(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s+'T12:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === s;
  }
  function dayNumber(s) { return Math.floor(Date.parse(s+'T12:00:00Z') / 86400000); }
  function fromDayNumber(n) { return new Date(n*86400000+43200000).toISOString().slice(0,10); }
  function localToday(date = new Date()) {
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw new RangeError('Invalid now');
    return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
  }
  function idKey(id) {
    if (typeof id === 'string' && id.length && id.length <= 256) return 's:'+id;
    if (Number.isSafeInteger(id) && id >= 0) return 'n:'+id;
    return null;
  }
  // Trusted timestamps are opt-in; plain legacy dates NEVER imply clock times.
  function exactInstant(v) {
    if (typeof v === 'number') return Number.isSafeInteger(v) && v >= 0 ? v : null;
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(v)) return null;
    const ms=Date.parse(v);return Number.isFinite(ms) ? ms : null;
  }
  // V21 legacy focus history may lack explicit completion metadata; keep it.
  // Only explicit evidence of an unfinished or non-focus interval excludes credit.
  function nonFocusRecord(s) {
    if (s.completed === false || s.isComplete === false ||
        s.isFocus === false || s.focus === false) return true;
    const status = typeof s.status === 'string' ? s.status.toLowerCase().replace(/-/g,'_') : '';
    if (['active','running','paused','started','pending','in_progress',
      'cancelled','canceled','aborted','interrupted','failed','incomplete',
      'stopped','skipped','discarded','rest','break'].includes(status)) return true;
    for (const key of ['mode','phase','type']) {
      const value = typeof s[key] === 'string' ? s[key].toLowerCase().replace(/-/g,'_') : '';
      if (['rest','break','short','long','short_break','long_break','short_rest','long_rest'].includes(value))
        return true;
    }
    return false;
  }
  function normalizeSessions(history) {
    const sessions=[], rejects=[], seen=new Set(), dayValidityCache=new Map();
    const cachedValidDay=day=>{
      if(!dayValidityCache.has(day))dayValidityCache.set(day,validDay(day));
      return dayValidityCache.get(day);
    };
    (Array.isArray(history) ? history : []).forEach((s,index)=>{
      let reason;
      const id=isRecord(s) ? idKey(s.id) : null;
      if (!isRecord(s)) reason='INVALID_RECORD';
      else if (s.isStarter === true || s.isDemo === true || s.synthetic === true || ['demo','sample','fixture'].includes(s.source)) reason='SAMPLE';
      else if (nonFocusRecord(s)) reason='NON_FOCUS';
      else if (!id) reason='INVALID_ID';
      else if (!cachedValidDay(s.date)) reason='INVALID_DATE';
      else if (typeof s.minutes !== 'number' || !Number.isFinite(s.minutes) || s.minutes < 0 || s.minutes > 1440) reason='INVALID_MINUTES';
      else if (!own(aliases,s.domain)) reason='INVALID_DOMAIN';
      else if (seen.has(id)) reason='DUPLICATE_ID';
      if (reason) {rejects.push({index,reason});return;}
      seen.add(id);
      const start=exactInstant(s.startedAt),end=exactInstant(s.endedAt);
      const timed=s.timeEvidence==='timer-monotonic-v1' && start!==null && end!==null && end>=start && end-start<=86400000;
      sessions.push({id:s.id,date:s.date,minutes:s.minutes,domain:aliases[s.domain],
        startedAt:timed?new Date(start).toISOString():null,endedAt:timed?new Date(end).toISOString():null,
        timingVerified:timed});
    });
    return {sessions,rejects,duplicates:rejects.filter(x=>x.reason==='DUPLICATE_ID').length,
      invalid:rejects.filter(x=>x.reason!=='DUPLICATE_ID'&&x.reason!=='SAMPLE').length,
      samples:rejects.filter(x=>x.reason==='SAMPLE').length};
  }
  function summarize(rows) {let minutes=0;for(const row of rows)minutes+=row.minutes;
    minutes=Math.round(minutes*1000)/1000;
    return {minutes,sessions:rows.length,averageMinutes:rows.length?Math.round(minutes/rows.length*100)/100:null};}
  function bucket(rows, getKey) {const m=new Map();for(const row of rows){const key=getKey(row);const v=m.get(key)||{key,minutes:0,sessions:0};v.minutes+=row.minutes;v.sessions++;m.set(key,v);}return [...m.values()].sort((a,b)=>a.key.localeCompare(b.key)).map(v=>({...v,minutes:Math.round(v.minutes*1000)/1000}));}
  function weekKey(day) {const n=dayNumber(day),d=new Date(day+'T12:00:00Z').getUTCDay();return fromDayNumber(n-((d+6)%7));}
  function streaks(sessions,today) {
    const days=[...new Set(sessions.filter(s=>s.minutes>0).map(s=>s.date))].sort();
    let longest=0,run=0,prev=null;
    for(const date of days){const n=dayNumber(date);run=prev!==null&&n===prev+1?run+1:1;longest=Math.max(longest,run);prev=n;}
    let target=dayNumber(today);const set=new Set(days);if(!set.has(today))target--;
    let current=0;while(set.has(fromDayNumber(target))){current++;target--;}
    return {current,longest,rule:'At least one recorded session with >0 minutes per local credited date; current may end yesterday; no date inferred from a timestamp.'};
  }
  function taskReport(tasks,projects=[],today=localToday()) {
    const seen=new Set(),valid=[];let excluded=0;
    (Array.isArray(tasks)?tasks:[]).forEach(t=>{
      if(!isRecord(t)||t.isStarter===true||t.isDemo===true||t.synthetic===true||!Number.isSafeInteger(t.id)||t.id<0||seen.has(t.id)||typeof t.title!=='string'||typeof t.done!=='boolean'){excluded++;return;}
      seen.add(t.id);valid.push(t);
    });
    const active=valid.filter(t=>t.status!=='archived'&&t.archived!==true);
    const done=active.filter(t=>t.done || t.status==='completed').length;
    const projectsMap=new Map();
    (Array.isArray(projects)?projects:[]).forEach(p=>{if(isRecord(p)&&!p.isStarter&&idKey(p.id)!==null&&!projectsMap.has(idKey(p.id)))projectsMap.set(idKey(p.id),{id:p.id,name:typeof p.name==='string'?p.name:'',total:0,completed:0});});
    for(const t of active){const key=idKey(t.projectId);if(key && projectsMap.has(key)){const p=projectsMap.get(key);p.total++;if(t.done||t.status==='completed')p.completed++;}}
    return {total:active.length,completed:done,remaining:active.length-done,archived:valid.length-active.length,
      overdue:active.filter(t=>!t.done&&t.status!=='completed'&&validDay(t.dueDate)&&t.dueDate<today).length,
      completionRate:active.length?Math.round(done/active.length*10000)/100:null,excluded,
      projects:[...projectsMap.values()]};
  }
  function dailyGoalReport(rows, goals, startDate,endDate) {
    // Goals must be explicitly supplied as minutes per day, never inferred from focus presets.
    if(!isRecord(goals))return {available:false,byDomain:[],days:0};
    const days=dayNumber(endDate)-dayNumber(startDate)+1,out=[];
    for(const domain of DOMAINS){const n=goals[domain];if(typeof n!=='number'||!Number.isFinite(n)||n<=0||n>1440)continue;
      const actual=summarize(rows.filter(s=>s.domain===domain)).minutes,target=n*days;
      out.push({domain,actualMinutes:actual,targetMinutes:target,progress:Math.round(actual/target*10000)/100});}
    return {available:out.length>0,days,byDomain:out};
  }
  function buildReport(snapshot={},opts={}) {
    const today=opts.today===undefined?localToday():opts.today;
    if(!validDay(today))throw new RangeError('Invalid today');
    const endDate=opts.endDate===undefined?today:opts.endDate;
    const startDate=opts.startDate===undefined?fromDayNumber(dayNumber(endDate)-6):opts.startDate;
    if(!validDay(startDate)||!validDay(endDate)||startDate>endDate)throw new RangeError('Invalid reporting dates');
    const span=dayNumber(endDate)-dayNumber(startDate)+1;
    if(span>3660)throw new RangeError('Reporting range exceeds 3660 days');
    const domain=opts.domain||'all';if(domain!=='all'&&!DOMAINS.includes(domain))throw new RangeError('Invalid domain');
    const source=Array.isArray(snapshot.sessionHistory)?snapshot.sessionHistory:(isRecord(snapshot.cfg)?snapshot.cfg.sessionHistory:[]);
    const normalized=normalizeSessions(source);
    const rows=normalized.sessions.filter(s=>s.date>=startDate&&s.date<=endDate&&(domain==='all'||s.domain===domain));
    const grouped=bucket(rows,s=>s.date),dayMap=new Map(grouped.map(x=>[x.key,x]));
    const startNumber=dayNumber(startDate);
    const daily=Array.from({length:span},(_,i)=>{const key=fromDayNumber(startNumber+i);return dayMap.get(key)||{key,minutes:0,sessions:0};});
    const byDomain=Object.fromEntries(DOMAINS.map(k=>[k,summarize(rows.filter(r=>r.domain===k))]));
    const weekStartCache=new Map();
    return {period:{startDate,endDate,domain,days:span},totals:summarize(rows),daily,
      weekly:bucket(rows,s=>{
        if(!weekStartCache.has(s.date))weekStartCache.set(s.date,weekKey(s.date));
        return weekStartCache.get(s.date);
      }),monthly:bucket(rows,s=>s.date.slice(0,7)),byDomain,
      streaks:streaks(normalized.sessions,today),goals:dailyGoalReport(rows,opts.goals,startDate,endDate),
      tasks:taskReport(snapshot.tasksList,snapshot.projects,today),
      quality:{accepted:normalized.sessions.length,inRange:rows.length,excluded:normalized.rejects.length,
        duplicates:normalized.duplicates,invalid:normalized.invalid,samples:normalized.samples,
        timingVerified:rows.filter(s=>s.timingVerified).length},sessions:rows};
  }
  function yearHeatmap(snapshot,year,opts={}) {
    if(!Number.isInteger(year)||year<1000||year>9999)throw new RangeError('Invalid year');
    const from=String(year).padStart(4,'0')+'-01-01',to=String(year).padStart(4,'0')+'-12-31';
    return buildReport(snapshot,{today:opts.today||to,startDate:from,endDate:to,domain:opts.domain||'all'}).daily;
  }
  function csvCell(v) {
    let s=v===null||v===undefined?'':String(v);
    if(/^[\s\uFEFF]*[=+@\-]/.test(s)&&!/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(s))s="'"+s;
    return '"'+s.replace(/"/g,'""')+'"';
  }
  function toCSV(report,kind='sessions') {
    if(!report||!Array.isArray(report.sessions))throw new TypeError('Expected report');
    let headers,rows;
    if(kind==='sessions'){headers=['id','date','domain','minutes','startedAt','endedAt','timingVerified'];rows=report.sessions.map(r=>headers.map(k=>r[k]));}
    else if(kind==='daily'){headers=['date','minutes','sessions'];rows=report.daily.map(r=>[r.key,r.minutes,r.sessions]);}
    else if(kind==='weekly'||kind==='monthly'){headers=['period','minutes','sessions'];rows=report[kind].map(r=>[r.key,r.minutes,r.sessions]);}
    else throw new RangeError('Unknown export kind');
    return [headers,...rows].map(r=>r.map(csvCell).join(',')).join('\r\n')+'\r\n';
  }
  return Object.freeze({DOMAINS,validDay,localToday,normalizeSessions,summarize,streaks,
    buildReport,yearHeatmap,taskReport,toCSV});
});
