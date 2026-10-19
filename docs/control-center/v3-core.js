'use strict';
/* Deep Focus v3 read-only diagnostics and allowlisted visual workspace logic. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DeepFocusV3Core=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const studio=(typeof require==='function'&&typeof module==='object'&&module.exports)
    ?require('./studio-core.js'):(typeof globalThis!=='undefined'?globalThis.DeepFocusStudioCore:null);
  const SHA=/^[a-f0-9]{40}$/i;
  const id=x=>String(x==null?'':x);
  const limited=s=>id(s).toLocaleLowerCase().trim().slice(0,120);
  const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  function unifiedSearch(query,data){
    const q=limited(query);
    if(!q||!data)return [];
    const out=[];
    const sources=[
      ['task',data.tasks||[],x=>[x.id,x.title,x.status,x.area],x=>'#tasks'],
      ['pull',data.prs||[],x=>[x.number,x.title,x.draft?'draft':'open'],x=>x.html_url],
      ['run',data.runs||[],x=>[x.name,x.conclusion,x.status],x=>x.html_url],
      ['finding',data.findings||[],x=>[x.id,x.title,x.detail],x=>'#risks']
    ];
    for(const [type,list,fields,link] of sources){
      if(!Array.isArray(list))continue;
      for(const item of list){
        if(out.length>=30)break;
        if(fields(item).some(x=>limited(x).includes(q)))out.push({
          type,title:id(item.title||item.name||item.id||item.number),
          subtitle:type==='task'?id(item.id)+' · '+id(item.status):type==='run'?id(item.conclusion||item.status):type==='finding'?id(item.severity):'PR #'+id(item.number),
          href:id(link(item))});
      }
    }
    return out;
  }
  function shortcut(e){
    if(!e||!e.key)return null;
    if(e.key==='Escape')return 'close';
    if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==='k')return 'search';
    return null;
  }
  function taskView(tasks,view){
    const list=Array.isArray(tasks)?tasks:[];
    if(view==='blocked')return list.filter(t=>t.status==='BLOCKED');
    if(view==='active')return list.filter(t=>['BLOCKED','TODO','IN_PROGRESS'].includes(t.status));
    if(view==='done')return list.filter(t=>t.status==='TESTED');
    if(view==='all')return list.slice();
    throw Error('Unknown task view');
  }
  function sortTasks(tasks,mode){
    const list=(tasks||[]).slice();
    const sortId=(a,b)=>id(a.id).localeCompare(id(b.id),'en');
    if(mode==='id-asc')return list.sort(sortId);
    if(mode==='id-desc')return list.sort((a,b)=>sortId(b,a));
    if(mode==='area')return list.sort((a,b)=>id(a.area).localeCompare(id(b.area),'en')||sortId(a,b));
    if(mode==='status')return list.sort((a,b)=>{
      const rank=['BLOCKED','IN_PROGRESS','TODO','DEFERRED','TESTED'];
      return rank.indexOf(a.status)-rank.indexOf(b.status)||sortId(a,b);
    });
    throw Error('Unknown task sort');
  }
  function csvCell(value){
    let v=id(value).replace(/\u0000/g,'');
    if(/^[\s]*[=+@-]/.test(v))v="'"+v;
    return '"'+v.replace(/"/g,'""')+'"';
  }
  function tasksCSV(tasks){
    const keys=['id','status','area','title','evidence'];
    return [keys.join(','),...(tasks||[]).map(t=>keys.map(k=>csvCell(t[k])).join(','))].join('\r\n')+'\r\n';
  }
  function areaMetrics(tasks){
    const groups=new Map();
    for(const t of tasks||[]){
      const area=id(t.area)||'UNKNOWN';
      if(!groups.has(area))groups.set(area,{area,total:0,blocked:0,tested:0,active:0});
      const a=groups.get(area);a.total++;
      if(t.status==='BLOCKED')a.blocked++;
      if(t.status==='TESTED')a.tested++;
      if(t.status==='IN_PROGRESS')a.active++;
    }
    return [...groups.values()].sort((a,b)=>b.blocked-a.blocked||b.total-a.total||a.area.localeCompare(b.area,'en'));
  }
  function releaseChecklist(evidence){
    const e=object(evidence)?evidence:{};
    return [
      {id:'device',label:'اختبارات Android/WebView على جهاز حقيقي',passed:e.device_qa==='PASS'&&e.device_evidence===true},
      {id:'backup',label:'نسخة احتياطية فعلية واسترجاع v21',passed:e.backup_restored===true},
      {id:'media',label:'مصادر وتراخيص وتسجيلات صوت معتمدة',passed:e.media_approved===true},
      {id:'locale',label:'فحص 20 لغة والأرقام 0–9 على الجهاز',passed:e.locale_device_qa===true},
      {id:'review',label:'مراجعة بشرية وبوابات إصدار موقعة',passed:e.human_review===true&&e.ready_for_release===true}
    ];
  }
  function ciTrend(runs){
    let passed=0,failed=0,pending=0;
    for(const r of runs||[]){
      if(r.conclusion==='success')passed++;
      else if(['failure','timed_out','cancelled','action_required'].includes(r.conclusion))failed++;
      else pending++;
    }
    const totalCompleted=passed+failed;
    return {passed,failed,pending,totalCompleted,successRate:totalCompleted?Math.round(100*passed/totalCompleted):null};
  }
  function failedRuns(runs){return (runs||[]).filter(r=>['failure','timed_out'].includes(r.conclusion));}
  function stalePulls(prs,now,days=14){
    if(!Number.isFinite(Date.parse(now))||!Number.isFinite(days)||days<1)throw Error('Invalid time window');
    const cutoff=Date.parse(now)-days*86400000;
    return (prs||[]).filter(p=>Number.isFinite(Date.parse(p.updated_at||p.created_at))&&Date.parse(p.updated_at||p.created_at)<cutoff);
  }
  function filterPulls(prs,status,query){
    const list=Array.isArray(prs)?prs:[];
    const q=limited(query);
    if(!['all','draft','ready'].includes(status))throw Error('Invalid PR filter');
    return list.filter(x=>(status==='all'||(status==='draft'?!!x.draft:!x.draft))&&
      (!q||limited(x.title).includes(q)||id(x.number).includes(q)));
  }
  function filterFindings(findings,severity){
    if(!['all','critical','warning','info'].includes(severity))throw Error('Unknown severity');
    return (findings||[]).filter(x=>severity==='all'||x.severity===severity);
  }
  function auditFreshness(report,head){
    if(!report||!SHA.test(report.inspected_ref||'')||!SHA.test(head||''))return 'unavailable';
    return report.inspected_ref.toLowerCase()===head.toLowerCase()?'current':'stale';
  }
  const VALID_STATUS=new Set(['BLOCKED','IN_PROGRESS','TODO','TESTED','DEFERRED']);
  const REPO_URL='https://github.com/moaz76943-creator/zen-study-focus/';
  function repoURL(x){
    if(typeof x!=='string'||x.length>900)return false;
    try{const u=new URL(x);return u.protocol==='https:'&&u.hostname==='github.com'&&
      u.username===''&&u.password===''&&u.pathname.startsWith('/moaz76943-creator/zen-study-focus/');}
    catch{return false;}
  }
  function validateSnapshot(snapshot){
    if(!object(snapshot)||snapshot.schema_version!==1||!Array.isArray(snapshot.tasks)||snapshot.tasks.length>10000)
      throw Error('Invalid dashboard snapshot');
    if(snapshot.inspected_ref!==null&&snapshot.inspected_ref!==undefined&&!SHA.test(snapshot.inspected_ref))
      throw Error('Invalid snapshot SHA');
    const seen=new Set();
    for(const task of snapshot.tasks){
      if(!object(task)||!/^DF-\d{3}$/.test(task.id||'')||!VALID_STATUS.has(task.status)||seen.has(task.id))
        throw Error('Invalid snapshot task');
      for(const key of ['title','area','evidence']){
        if(task[key]!==undefined&&(typeof task[key]!=='string'||task[key].length>1000))
          throw Error('Oversized or invalid task text');
      }
      seen.add(task.id);
    }
    return snapshot;
  }
  function normalizeOfflineSnapshot(source){
    validateSnapshot(source);
    const pulls=source.prs||[],runs=source.workflows||source.runs||[];
    if(!Array.isArray(pulls)||pulls.length>200||!Array.isArray(runs)||runs.length>300)
      throw Error('Oversized offline source collections');
    for(const p of pulls){
      if(!object(p)||!Number.isSafeInteger(p.number)||p.number<1||!repoURL(p.html_url)||
        typeof p.title!=='string'||p.title.length>200||typeof p.draft!=='boolean')
        throw Error('Invalid offline PR');
    }
    for(const run of runs){
      if(!object(run)||!Number.isSafeInteger(run.id)||run.id<1||!repoURL(run.html_url)||
        typeof run.name!=='string'||run.name.length>200||
        !['success','failure','timed_out','cancelled','skipped','action_required',null].includes(run.conclusion)||
        !['queued','in_progress','completed','waiting','requested','pending'].includes(run.status))
        throw Error('Invalid offline workflow');
    }
    return {schema_version:1,source:'local_import',inspected_ref:source.inspected_ref||null,
      tasks:source.tasks.map(t=>({id:t.id,status:t.status,area:t.area||'',title:t.title||'',evidence:t.evidence||''})),
      prs:pulls.map(p=>({number:p.number,title:p.title,html_url:p.html_url,draft:p.draft})),
      runs:runs.map(x=>({id:x.id,name:x.name,html_url:x.html_url,status:x.status,conclusion:x.conclusion})),
      audit:null,findings:[],sync:null,errors:['Snapshot imported from a local file; not live GitHub evidence'],stale:true};
  }
  function compareSnapshots(before,after){
    validateSnapshot(before);validateSnapshot(after);
    const old=new Map(before.tasks.map(x=>[x.id,x])),current=new Map(after.tasks.map(x=>[x.id,x]));
    let added=0,removed=0,statusChanged=0;
    for(const [key,value] of current){
      if(!old.has(key))added++;
      else if(old.get(key).status!==value.status)statusChanged++;
    }
    for(const key of old.keys())if(!current.has(key))removed++;
    return {added,removed,statusChanged,oldCount:old.size,newCount:current.size};
  }
  const THEMES=Object.freeze({
    ocean:{primary:'#087fc2',cyan:'#0cbdc5',background:'#f3fbff'},
    midnight:{primary:'#4b66d9',cyan:'#24b6d9',background:'#f3f5ff'},
    forest:{primary:'#0b8974',cyan:'#27b49c',background:'#f3fcf7'},
    sunset:{primary:'#b65d40',cyan:'#db9b45',background:'#fff9f2'}
  });
  function applyThemePreset(config,name){
    if(!Object.prototype.hasOwnProperty.call(THEMES,name))throw Error('Unknown preset');
    let next=studio.validateConfig(config);
    for(const [key,value] of Object.entries(THEMES[name]))next=studio.updateSetting(next,'theme',key,value);
    return next;
  }
  function createHistory(initial){
    const value=studio.validateConfig(initial);
    return {states:[value],index:0,value};
  }
  function historyPush(history,input){
    const value=studio.validateConfig(input);
    if(JSON.stringify(history.value)===JSON.stringify(value))return history;
    const states=history.states.slice(0,history.index+1).concat([value]).slice(-40);
    return {states,index:states.length-1,value};
  }
  function historyUndo(history){
    if(history.index<1)return history;
    const index=history.index-1;
    return {states:history.states,index,value:history.states[index]};
  }
  function historyRedo(history){
    if(history.index>=history.states.length-1)return history;
    const index=history.index+1;
    return {states:history.states,index,value:history.states[index]};
  }
  function resetScreen(config,baseline,screen){
    if(!studio.SCREENS[screen])throw Error('Unknown screen');
    const next=studio.validateConfig(config),original=studio.validateConfig(baseline);
    next.screens[screen]=original.screens[screen];
    return studio.validateConfig(next);
  }
  function importConfig(raw){
    if(typeof raw!=='string'||raw.length>20000)throw Error('Design JSON exceeds safe limit');
    return studio.validateConfig(JSON.parse(raw));
  }
  function configDiff(oldConfig,newConfig){
    const old=studio.validateConfig(oldConfig),next=studio.validateConfig(newConfig),result=[];
    for(const key of Object.keys(old.theme)){
      if(old.theme[key]!==next.theme[key])result.push({path:'theme.'+key,before:old.theme[key],after:next.theme[key]});
    }
    for(const screen of Object.keys(studio.SCREENS)){
      for(const key of Object.keys(old.screens[screen])){
        const before=old.screens[screen][key],after=next.screens[screen][key];
        if(before!==after)result.push({path:'screens.'+screen+'.'+key,before,after});
      }
    }
    return result;
  }
  return {unifiedSearch,shortcut,taskView,sortTasks,tasksCSV,areaMetrics,
    releaseChecklist,ciTrend,failedRuns,stalePulls,filterPulls,filterFindings,
    auditFreshness,validateSnapshot,normalizeOfflineSnapshot,compareSnapshots,THEMES,applyThemePreset,
    createHistory,historyPush,historyUndo,historyRedo,resetScreen,importConfig,configDiff};
});
