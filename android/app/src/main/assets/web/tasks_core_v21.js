/* Deep Focus v21 task domain core. Side-effect free: no automatic localStorage access.
 * Lane 00 must wire this UMD module to the existing v21 tasks/cfg persistence.
 * Existing numeric IDs and legacy fields remain untouched on unrelated operations.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DeepFocusTasksCoreV21 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VALID_CATS = ['study', 'sport', 'review', 'exam'];
  const STATUSES = ['todo', 'doing', 'completed', 'archived'];
  const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
  const own = (v,k) => Object.prototype.hasOwnProperty.call(v,k);
  const idOk = n => Number.isSafeInteger(n) && n >= 0;
  const copy = x => JSON.parse(JSON.stringify(x));
  function fail(message) { throw new Error(message); }
  function validDate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s + 'T12:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === s;
  }
  function timeStamp(opts={}) {
    const value = opts.now === undefined ? new Date().toISOString() : opts.now;
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) fail('Invalid now');
    return d.toISOString();
  }
  function stateCopy(state) {
    if (!state || !Array.isArray(state.tasksList) || !state.cfg || typeof state.cfg !== 'object' || Array.isArray(state.cfg)) fail('Invalid v21 task snapshot');
    return copy({tasksList:state.tasksList,cfg:state.cfg});
  }
  function get(state,id,{includingTrash=true}={}) {
    if (!idOk(id)) fail('Numeric task ID required');
    const matches=state.tasksList.filter(t=>t && t.id===id);
    if (matches.length!==1) fail('Missing or ambiguous task ID: '+id);
    if (!includingTrash && matches[0].deletedAt) fail('Task is in trash');
    return matches[0];
  }
  function uniqueId(state,options={}) {
    const used = new Set(state.tasksList.filter(Boolean).map(t=>t.id));
    const projects=Array.isArray(state.cfg.taskProjectsV21)?state.cfg.taskProjectsV21:[];
    projects.forEach(p=>used.add(p.id));
    (options.noteIds || []).forEach(id=>{if(idOk(id))used.add(id);});
    let next = Math.max(1, Number.isSafeInteger(options.idSeed) && options.idSeed>=0 ? options.idSeed : Date.now());
    while (used.has(next)) {if(next>=Number.MAX_SAFE_INTEGER)fail('ID namespace exhausted');next++;}
    return next;
  }
  function projects(state) {return Array.isArray(state.cfg.taskProjectsV21) ? state.cfg.taskProjectsV21 : [];}
  function checkProject(state,id) {
    if (id === null) return;
    if (!idOk(id) || !projects(state).some(p=>p && p.id===id && !p.deletedAt)) fail('Unknown numeric project ID');
  }
  function strings(value,max,name) {
    if(typeof value!=='string'||value.length>max)fail('Invalid '+name);
    return value.trim();
  }
  function normalizeRepeat(value) {
    if(value===null)return null;
    if(!value || typeof value!=='object' || Array.isArray(value))fail('Invalid repeat');
    if(!['daily','weekdays','weekly','monthly'].includes(value.frequency) || !Number.isInteger(value.interval) || value.interval<1 || value.interval>365)fail('Invalid repeat rule');
    if(value.frequency==='weekdays' && value.interval!==1)fail('Weekdays repeat interval must equal 1');
    if(value.until!==undefined && !validDate(value.until))fail('Invalid repeat limit');
    return {frequency:value.frequency,interval:value.interval,...(value.until?{until:value.until}:{})};
  }
  const EDITABLE=new Set(['title','description','date','dueTime','catKey','priority','important','urgent','estimateMin','projectId','group','noteIds','checklist','subtasks','repeat','dueAssigned']);
  function normalizePatch(state,patch) {
    if(!patch || typeof patch!=='object' || Array.isArray(patch))fail('Patch must be object');
    const out={};
    for(const [k,v] of Object.entries(patch)){
      if(!EDITABLE.has(k))fail('Unsupported task field: '+k);
      if(k==='title'){out[k]=strings(v,20000,k);if(!out[k])fail('Title required');}
      else if(k==='description')out[k]=strings(v,50000,k);
      else if(k==='date'){if(!validDate(v))fail('Invalid task date');out[k]=v;}
       else if(k==='dueAssigned'){if(typeof v!=='boolean')fail('Invalid dueAssigned');out[k]=v;}
      else if(k==='dueTime'){if(v!==null && (typeof v!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(v)))fail('Invalid due time');out[k]=v;}
      else if(k==='catKey'){if(!VALID_CATS.includes(v))fail('Invalid v21 category');out[k]=v;}
      else if(k==='priority'){if(!PRIORITIES.includes(v))fail('Invalid priority');out[k]=v;}
      else if(k==='important'||k==='urgent'){if(typeof v!=='boolean')fail('Invalid boolean');out[k]=v;}
      else if(k==='estimateMin'){if(!Number.isInteger(v)||v<0||v>100000)fail('Invalid estimate');out[k]=v;}
      else if(k==='projectId'){checkProject(state,v);out[k]=v;}
      else if(k==='group'){out[k]=strings(v,100,k);}
      else if(k==='noteIds'){
        if(!Array.isArray(v)||v.length>100||v.some(x=>!idOk(x)))fail('Invalid numeric note references');
        out[k]=[...new Set(v)];
      }
      else if(k==='repeat')out[k]=normalizeRepeat(v);
      else if(k==='checklist'||k==='subtasks'){
        if(!Array.isArray(v)||v.length>200)fail('Invalid '+k);
        const ids=new Set();
        out[k]=v.map(x=>{
          if(!x||!idOk(x.id)||ids.has(x.id)||typeof x.done!=='boolean')fail('Invalid '+k+' item');
          ids.add(x.id);return {...x,title:strings(x.title,2000,'item title')};
        });
      }
    }
    return out;
  }
  function statusOf(task) {return task.status==='archived'?'archived':task.done?'completed':task.status==='doing'?'doing':'todo';}
  function createTask(state,input,opts={}) {
    const s=stateCopy(state),fields=normalizePatch(s,input);
    if(!fields.title)fail('Title required');
    const stamp=timeStamp(opts),id=uniqueId(s,opts);
    const task={id,isStarter:false,title:fields.title,date:fields.date||(validDate(opts.today)?opts.today:stamp.slice(0,10)),catKey:fields.catKey||'study',done:false,
      time:'25m',status:'todo',createdAt:stamp,updatedAt:stamp,dueAssigned:own(fields,'date'),...fields};
    s.tasksList.unshift(task);
    return {state:s,task:copy(task)};
  }
  function updateTask(state,id,patch,opts={}) {
    const s=stateCopy(state),task=get(s,id,{includingTrash:false}),fields=normalizePatch(s,patch);
    Object.assign(task,fields,{updatedAt:timeStamp(opts)});
     if(own(fields,'date')&&!own(fields,'dueAssigned'))task.dueAssigned=true;
    return {state:s,task:copy(task)};
  }
  function plusDays(date,days) {
    const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);
    return d.toISOString().slice(0,10);
  }
  function nextOccurrence(task) {
    const rule=task.repeat;
    if(!rule||!validDate(task.date))return null;
    let next;
    if(rule.frequency==='daily')next=plusDays(task.date,rule.interval);
    else if(rule.frequency==='weekdays'){
      next=plusDays(task.date,1);
      while([0,6].includes(new Date(next+'T12:00:00Z').getUTCDay()))next=plusDays(next,1);
    }
    else if(rule.frequency==='weekly')next=plusDays(task.date,rule.interval*7);
    else {
      const anchor=task.repeatAnchorDay||Number(task.date.slice(8,10));
      const d=new Date(task.date+'T12:00:00Z');
      const targetMonth=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+rule.interval,1,12));
      const last=new Date(Date.UTC(targetMonth.getUTCFullYear(),targetMonth.getUTCMonth()+1,0,12)).getUTCDate();
      targetMonth.setUTCDate(Math.min(anchor,last));next=targetMonth.toISOString().slice(0,10);
    }
    return rule.until && next>rule.until ? null : next;
  }
  function setStatus(state,id,status,opts={}) {
    if(!STATUSES.includes(status))fail('Invalid status');
    const s=stateCopy(state),t=get(s,id,{includingTrash:false}),old=statusOf(t),stamp=timeStamp(opts);
    if(status===old)return {state:s,task:copy(t),created:null};
    t.status=status;t.done=status==='completed'||(status==='archived'&&t.done);
    if(status==='completed')t.completedAt=stamp;
    else if(status==='todo'||status==='doing')t.completedAt=null;
    t.updatedAt=stamp;
    let created=null;
    if(status==='completed'&&old!=='completed'&&!t.isStarter&&t.repeat){
      const next=nextOccurrence(t),rootId=t.recurrenceRootId??t.id;
      if(next && !s.tasksList.some(x=>x.recurrenceRootId===rootId&&x.date===next)){
        const idNew=uniqueId(s,opts);
        created={...t,id:idNew,date:next,done:false,status:'todo',completedAt:null,deletedAt:null,recurrenceRootId:rootId,
          repeatAnchorDay:t.repeatAnchorDay||Number(t.date.slice(8,10)),createdAt:stamp,updatedAt:stamp,
          checklist:Array.isArray(t.checklist)?t.checklist.map(x=>({...x,done:false})):[],
          subtasks:Array.isArray(t.subtasks)?t.subtasks.map(x=>({...x,done:false})):[]};
        s.tasksList.unshift(created);
      }
    }
    return {state:s,task:copy(t),created:created?copy(created):null};
  }
  function trashTask(state,id,opts={}) {
    const s=stateCopy(state),t=get(s,id,{includingTrash:false});t.deletedAt=timeStamp(opts);
    return {state:s,task:copy(t)};
  }
  function restoreTask(state,id) {
    const s=stateCopy(state),t=get(s,id);
    if(!t.deletedAt)fail('Task is not in trash');delete t.deletedAt;
    return {state:s,task:copy(t)};
  }
  function rescheduleTask(state,id,date,opts={}) {return updateTask(state,id,{date},opts);}
  function addItem(state,id,kind,title,opts={}) {
    if(!['checklist','subtasks'].includes(kind))fail('Invalid item type');
    const s=stateCopy(state),t=get(s,id,{includingTrash:false});
    const existing=[...(t.checklist||[]),...(t.subtasks||[])];
    const ids=new Set(existing.map(x=>x.id));let itemId=1;
    while(ids.has(itemId))itemId++;
    const item={id:itemId,title:strings(title,2000,'item title'),done:false};if(!item.title)fail('Item title required');
    if(!Array.isArray(t[kind]))t[kind]=[];
    if(t[kind].length>=200)fail('Too many items');
    t[kind].push(item);t.updatedAt=timeStamp(opts);
    return {state:s,item:copy(item)};
  }
  function setItemDone(state,id,kind,itemId,done) {
    if(!['checklist','subtasks'].includes(kind)||!idOk(itemId)||typeof done!=='boolean')fail('Invalid item update');
    const s=stateCopy(state),t=get(s,id,{includingTrash:false});
    const rows=Array.isArray(t[kind])?t[kind]:[];
    const item=rows.find(x=>x.id===itemId);if(!item)fail('Item missing');
    item.done=done;return {state:s,item:copy(item)};
  }
  function createProject(state,input,opts={}) {
    const s=stateCopy(state),name=strings(input?.name,200,'project name');if(!name)fail('Project name required');
    const project={id:uniqueId(s,opts),name,createdAt:timeStamp(opts)};
    if(!Array.isArray(s.cfg.taskProjectsV21))s.cfg.taskProjectsV21=[];
    s.cfg.taskProjectsV21.push(project);return {state:s,project:copy(project)};
  }
  function listTasks(state,{includeStarters=false,includeTrash=false,includeArchived=false}={}) {
    return (state.tasksList||[]).filter(t=>t&&idOk(t.id)&&(includeStarters||!t.isStarter)&&
      (includeTrash||!t.deletedAt)&&(includeArchived||statusOf(t)!=='archived'));
  }
  function projectProgress(state,projectId) {
    checkProject(state,projectId);
    const seen=new Set();const rows=listTasks(state,{includeArchived:true}).filter(t=>{
      if(t.projectId!==projectId||seen.has(t.id))return false;seen.add(t.id);return true;
    });
    const completed=rows.filter(t=>t.done).length;
    return {total:rows.length,completed,percent:rows.length?Math.round(completed*100/rows.length):0};
  }
  function isOverdue(t,today) {if(!validDate(today))fail('Invalid comparison day');return !!(t.dueAssigned!==false&&validDate(t.date)&&t.date<today&&!t.done&&!t.deletedAt&&statusOf(t)!=='archived');}
  // User-curated top three, stored additively in cfg; no synthetic/automatic picks.
  function chooseTopThree(state,today,ids) {
    if(!validDate(today)||!Array.isArray(ids)||ids.length>3||new Set(ids).size!==ids.length)fail('Select up to three distinct task IDs');
    const s=stateCopy(state);
    for(const id of ids){
      const t=get(s,id,{includingTrash:false});
      if(t.isStarter||t.done||statusOf(t)==='archived')fail('Only active real tasks may be prioritized');
    }
    if(!s.cfg.taskTopThreeV21||typeof s.cfg.taskTopThreeV21!=='object'||Array.isArray(s.cfg.taskTopThreeV21))s.cfg.taskTopThreeV21={};
    s.cfg.taskTopThreeV21[today]=ids.slice();
    return s;
  }
  function topThree(state,today) {
    if(!validDate(today))fail('Invalid today');
    const ids=state.cfg?.taskTopThreeV21?.[today];
    const live=listTasks(state).filter(t=>!t.done);
    if(Array.isArray(ids)){
      const byId=new Map(live.map(t=>[t.id,t]));
      return [...new Set(ids)].slice(0,3).filter(id=>idOk(id)&&byId.has(id)).map(id=>byId.get(id));
    }
    // Existing v21 automatic suggestions remain readable until user curates this day.
    const priority={urgent:4,high:3,medium:2,low:1};
    return live.filter(t=>validDate(t.date)&&t.date<=today).sort((a,b)=>{
      const rank=t=>(isOverdue(t,today)?100:0)+(t.important?30:0)+(t.urgent?20:0)+(priority[t.priority]||0);
      return rank(b)-rank(a)||a.date.localeCompare(b.date)||a.id-b.id;
    }).slice(0,3);
  }
  function taskSections(state,today) {
    if(!validDate(today))fail('Invalid today');
    const groups={today:[],upcoming:[],overdue:[],completed:[]};
    for(const t of listTasks(state)){
      if(t.done){groups.completed.push(t);continue;}
      if(t.dueAssigned===false||t.date===today)groups.today.push(t);
      else if(validDate(t.date)&&t.date<today)groups.overdue.push(t);
      else if(validDate(t.date)&&t.date>today)groups.upcoming.push(t);
      else groups.today.push(t);
    }
    return groups;
  }
  function eisenhower(state) {
    const out={do:[],schedule:[],delegate:[],eliminate:[]};
    for(const t of listTasks(state).filter(t=>!t.done)){
      const important=!!t.important||t.priority==='high'||t.priority==='urgent';
      const urgent=!!t.urgent||t.priority==='urgent';
      out[important?(urgent?'do':'schedule'):(urgent?'delegate':'eliminate')].push(t);
    }
    return out;
  }
  function kanban(state) {
    const out={todo:[],doing:[],completed:[],archived:[]};
    for(const t of listTasks(state,{includeArchived:true}))out[statusOf(t)].push(t);
    return out;
  }
  function searchTasks(state,filter={}) {
    const q=String(filter.query||'').trim().toLocaleLowerCase();
    return listTasks(state,{includeArchived:!!filter.includeArchived,includeTrash:!!filter.includeTrash}).filter(t=>{
      if(filter.status && statusOf(t)!==filter.status)return false;
      if(filter.catKey && t.catKey!==filter.catKey)return false;
      if(filter.projectId!==undefined && t.projectId!==filter.projectId)return false;
      if(filter.date && t.date!==filter.date)return false;
      return !q||[t.title,t.description,t.group,t.catKey].some(s=>String(s||'').toLocaleLowerCase().includes(q));
    }).sort((a,b)=>a.date.localeCompare(b.date)||a.id-b.id);
  }
  function calendarTasks(state,date) {
    if(!validDate(date))fail('Invalid calendar date');return searchTasks(state,{date});
  }
  // Only canonical completed focus/custom events that explicitly contain a numeric taskId
  // are eligible. Conflicting reused session IDs are entirely excluded, even after restart.
  function sessionTotals(state) {
    const history=Array.isArray(state.cfg?.sessionHistory)?state.cfg.sessionHistory:[];
    const seen=new Map(),conflicted=new Set();
    for(const h of history) {
      if(!h || typeof h.id!=='string'||!h.id.trim())continue;
      const key=h.id;
      const valid=h.completed===true&&['focus','custom'].includes(h.mode)&&idOk(h.taskId)&&
        Number.isFinite(h.minutes)&&h.minutes>=0&&h.minutes<=1440;
      if(!valid)continue;
      const signature=JSON.stringify([h.taskId,h.minutes,h.mode,h.date]);
      if(seen.has(key) && seen.get(key).signature!==signature)conflicted.add(key);
      else if(!seen.has(key))seen.set(key,{signature,taskId:h.taskId,minutes:h.minutes});
    }
    const totals=new Map();
    for(const [key,item] of seen)if(!conflicted.has(key))totals.set(item.taskId,(totals.get(item.taskId)||0)+item.minutes);
    return totals;
  }
  function actualFocusMinutes(state,taskId) {get(state,taskId);return sessionTotals(state).get(taskId)||0;}
  function compareEstimate(state,taskId) {
    const t=get(state,taskId),actualMin=actualFocusMinutes(state,taskId);
    const estimateMin=Number.isInteger(t.estimateMin)?t.estimateMin:0;
    return {estimateMin,actualMin,deltaMin:actualMin-estimateMin};
  }
  return Object.freeze({validDate,statusOf,createTask,updateTask,setStatus,trashTask,restoreTask,rescheduleTask,
    addItem,setItemDone,createProject,projects,projectProgress,listTasks,isOverdue,topThree,eisenhower,
    kanban,searchTasks,calendarTasks,sessionTotals,actualFocusMinutes,compareEstimate,chooseTopThree,taskSections});
});
