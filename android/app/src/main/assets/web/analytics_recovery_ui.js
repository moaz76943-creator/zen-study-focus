/* DF-128/129/136/137 — opt-in truthful analytics UI; lane 00 owns script loading. */
(function(root,factory){
 'use strict';
 const api=factory(typeof module==='object'&&module.exports?
  require('./analytics_recovery_core.js'):root.DeepFocusAnalyticsRecovery);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.DeepFocusAnalyticsRecoveryUI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(core){
 'use strict';
 if(!core)throw new Error('Load analytics_recovery_core.js before its UI');
 const fallback=Object.freeze({
  title:'Recorded analytics',today:'Today',last7:'Last 7 days',last30:'Last 30 days',
  selected:'Selected range',sessions:'Sessions',minutes:'Recorded minutes',average:'Average minutes',
  comparison:'Previous 7 days',split:'Activities',goals:'Original goal snapshots',
  noGoals:'Historical goal snapshots unavailable',noData:'No recorded focus sessions in this period',
  domain:'Activity',all:'All',study:'Study',read:'Reading',work:'Work',sport:'Exercise',
  from:'From',to:'To',group:'Group by',daily:'Day',weekly:'Week',monthly:'Month',
  reset:'Reset filters',export:'Export CSV',exportKind:'CSV contents',sessionRows:'Session history',
  saved:'CSV file saved',cancelled:'Saving cancelled',failed:'File not saved. Retry',
  unavailable:'Saving unavailable until a verified file adapter is connected',
  invalid:'Choose a valid date range, starting before the end',
  detail:'Choose a chart bar or a total to view recorded sessions',empty:'No matching sessions',
  date:'Credited date',id:'Session ID',activity:'Activity',task:'Linked task',
  more:'Additional rows not shown',quality:'Excluded source records',
  conflicts:'Conflicting duplicate IDs',snapshotCoverage:'Days with recorded target',
  allSessions:'All recorded sessions',weekComparison:'Rolling 7 days vs previous 7 days'
 });
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const ascii=s=>String(s).replace(/[\u0660-\u0669]/g,c=>String(c.charCodeAt(0)-0x0660))
  .replace(/[\u06f0-\u06f9]/g,c=>String(c.charCodeAt(0)-0x06f0));
 const bucketValid=s=>core.validDay(s)||/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(s);
 function renderBarsSvg(series,options={}){
  if(!Array.isArray(series)||series.length>3660)throw new TypeError('Expected bounded series');
  const width=Math.max(360,Math.min(4800,series.length*19)),height=186;
  const max=Math.max(1,...series.map(x=>x.minutes||0));
  const plot=130,bottom=150,left=48,available=width-left-12,step=series.length?available/series.length:available;
  const ticks=[0,.5,1].map(p=>{
   const value=Math.round(max*p*100)/100,y=bottom-plot*p;
   return '<line x1="'+left+'" y1="'+y+'" x2="'+(width-8)+'" y2="'+y+'" stroke="#e2e8f0"/>'+
    '<text x="'+(left-6)+'" y="'+(y+4)+'" text-anchor="end" fill="#475569" font-size="11">'+ascii(value)+'</text>';
  }).join('');
  const columns=series.map((s,i)=>{
   if(!s||!bucketValid(s.key)||typeof s.minutes!=='number'||!Number.isFinite(s.minutes)||
      s.minutes<0||!Number.isSafeInteger(s.sessions)||s.sessions<0)
    throw new TypeError('Invalid chart bucket');
   const h=s.minutes/max*plot,x=left+i*step+step*.1,w=Math.max(.5,step*.8);
   const name=escape(ascii(s.key+' | '+s.minutes+' '+(options.unit||'min')+' | '+s.sessions+' '+(options.sessionsLabel||'sessions')));
   return '<rect data-bucket="'+s.key+'" role="button" tabindex="0" aria-label="'+name+
    '" x="'+x.toFixed(2)+'" y="'+(bottom-h).toFixed(2)+'" width="'+w.toFixed(2)+
    '" height="'+Math.max(h,1).toFixed(2)+'" rx="2" fill="#2563eb"><title>'+name+'</title></rect>';
  }).join('');
  const accessible=escape(ascii(options.label||'Recorded minutes by credited period'));
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+width+' '+height+
   '" width="100%" role="img" aria-label="'+accessible+'">'+ticks+columns+
   '<text x="'+left+'" y="177" font-size="11" fill="#475569">'+(series[0]?escape(series[0].key):'')+
   '</text><text x="'+(width-8)+'" y="177" text-anchor="end" font-size="11" fill="#475569">'+
   (series.length?escape(series[series.length-1].key):'')+'</text></svg>';
 }

 function renderActivitySvg(byDomain,options={}){
  if(!byDomain||typeof byDomain!=='object')throw new TypeError('Activity data required');
  const colors={study:'#2563eb',read:'#8b5cf6',work:'#d97706',sport:'#059669'};
  const values=core.DOMAINS.map(d=>{
   const x=byDomain[d];
   if(!x||typeof x.minutes!=='number'||!Number.isFinite(x.minutes)||x.minutes<0||
      !Number.isSafeInteger(x.sessions)||x.sessions<0)throw new TypeError('Invalid activity total');
   return {key:d,minutes:x.minutes,sessions:x.sessions};
  });
  const total=values.reduce((n,x)=>n+x.minutes,0);
  const label=escape(ascii(options.label||'Recorded time by activity'));
  if(total===0)return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 145" role="img" aria-label="'+label+
   '"><text x="85" y="75" text-anchor="middle" font-size="12" fill="#475569">'+
   escape(options.empty||'No recorded minutes')+'</text></svg>';
  const r=48,circ=2*Math.PI*r;let offset=0;
  const arcs=values.filter(x=>x.minutes>0).map(x=>{
   const length=circ*x.minutes/total;
   const name=escape(options.labels&&options.labels[x.key]||x.key);
   const tooltip=escape(ascii(name+': '+x.minutes+' '+(options.unit||'min')+' ('+
    Math.round(x.minutes/total*10000)/100+'%)'));
   const svg='<circle cx="85" cy="71" r="'+r+'" fill="none" stroke="'+colors[x.key]+
    '" stroke-width="19" stroke-dasharray="'+length.toFixed(3)+' '+(circ-length).toFixed(3)+
    '" stroke-dashoffset="'+(-offset).toFixed(3)+
    '" transform="rotate(-90 85 71)" data-domain="'+x.key+
    '" role="button" tabindex="0" aria-label="'+tooltip+'"><title>'+tooltip+'</title></circle>';
   offset+=length;return svg;
  }).join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 145" width="170" role="img" aria-label="'+label+
   '"><circle cx="85" cy="71" r="'+r+'" fill="none" stroke="#e2e8f0" stroke-width="19"/>'+
   arcs+'<text x="85" y="74" text-anchor="middle" font-size="14" font-weight="700">'+
   escape(ascii(Math.round(total*100)/100))+'</text><text x="85" y="89" text-anchor="middle" font-size="9">'+
   escape(options.unit||'min')+'</text></svg>';
 }
 function mount(target,provider,opts={}){
  if(!target||typeof target.appendChild!=='function'||typeof provider!=='function')
   throw new TypeError('Target and history snapshot provider are required');
  const locale=opts.locale||'en';
  // Fails closed rather than inserting English text in non-English locales.
  if(locale!=='en'&&typeof opts.translate!=='function')
   throw new Error('Locale translations required before mounting analytics');
  const tr=key=>{
   const value=typeof opts.translate==='function'?opts.translate('analyticsRecovery.'+key,locale):null;
   if(typeof value==='string'&&value.trim()&&value!=='analyticsRecovery.'+key)return value;
   if(locale!=='en')throw new Error('Missing analytics locale: '+key);
   return fallback[key]||key;
  };
  const doc=target.ownerDocument||document;
  const el=(tag,cls,txt)=>{const e=doc.createElement(tag);
   if(cls)e.className=cls;if(txt!==undefined)e.textContent=String(txt);return e;};
  const wrapper=el('section','dfar-panel');wrapper.style.cssText=
   'background:white;color:#14213d;border:1px solid #e2e8f0;border-radius:18px;padding:14px;max-width:100%;overflow:hidden';
  wrapper.dir=['ar','fa','ur'].includes(locale)?'rtl':'ltr';
  const title=el('h2','dfar-title',tr('title'));wrapper.appendChild(title);
  const filters=el('div','dfar-controls');filters.style.cssText=
   'display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;align-items:end';
  const controls=[];
  function control(tag,label,type){
   const holder=el('label','dfar-field');holder.style.cssText='display:flex;flex-direction:column;gap:3px;min-width:110px;flex:1';
   const heading=el('span','',tr(label));heading.style.fontSize='12px';
   const c=el(tag);if(type)c.type=type;
   c.style.cssText='min-height:44px;max-width:100%;min-width:0;padding:8px;background:#fff;color:#14213d;border:1px solid #cbd5e1;border-radius:11px';
   holder.append(heading,c);filters.appendChild(holder);controls.push(c);return c;
  }
  const domain=control('select','domain');
  for(const k of ['all',...core.DOMAINS]){const o=el('option','',tr(k));o.value=k;domain.appendChild(o);}
  const group=control('select','group');
  for(const k of ['daily','weekly','monthly']){const o=el('option','',tr(k));o.value=k;group.appendChild(o);}
  const from=control('input','from','date'),to=control('input','to','date');
  const kind=control('select','exportKind');
  for(const k of ['sessions','daily','weekly','monthly']){const o=el('option','',tr(k==='sessions'?'sessionRows':k));o.value=k;kind.appendChild(o);}
  const button=(txt)=>{const b=el('button','dfar-btn',tr(txt));b.type='button';
   b.style.cssText='min-height:44px;padding:9px 12px;border:1px solid #bfdbfe;border-radius:11px;background:#eff6ff;color:#1d4ed8;cursor:pointer';
   filters.appendChild(b);return b;};
  const reset=button('reset'),exportBtn=button('export');
  const status=el('p','dfar-status');status.setAttribute('aria-live','polite');
  const cards=el('div','dfar-kpis');cards.style.cssText=
   'display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:8px';
  const compare=el('p','dfar-comparison'),split=el('div','dfar-split');
  const goals=el('div','dfar-goals'),chart=el('div','dfar-chart');
  chart.style.cssText='overflow-x:auto;max-width:100%;margin:10px 0';
  const detail=el('div','dfar-detail');detail.setAttribute('aria-live','polite');
  [filters,status,cards,compare,split,goals,chart,detail].forEach(x=>wrapper.appendChild(x));
  const now=opts.today||core.today();
  const dayAt=n=>new Date((Math.floor(Date.parse(now+'T12:00:00Z')/86400000)+n)*86400000+43200000).toISOString().slice(0,10);
  from.value=opts.startDate||dayAt(-29);to.value=opts.endDate||now;
  domain.value=opts.domain||'all';group.value=opts.group||'daily';kind.value='sessions';
  from.lang='en-u-nu-latn';to.lang='en-u-nu-latn';
  from.style.direction='ltr';to.style.direction='ltr';
  let report=null,disposed=false,series=[],exporter=null,rangeValid=false;
  if(typeof opts.saveCSV==='function')exporter=core.createExportController(opts.saveCSV);
  exportBtn.disabled=!exporter;
  if(!exporter)exportBtn.title=tr('unavailable');
  function setStatus(msg){status.textContent=msg||'';}
  function addCard(label,value,fn){
   const b=el('button','dfar-kpi');b.type='button';
   b.style.cssText='display:flex;flex-direction:column;text-align:start;gap:6px;background:#f8fafc;color:#14213d;padding:12px;border:1px solid #e2e8f0;border-radius:12px;min-height:72px';
   b.append(el('span','',label),el('strong','',ascii(value)));
   b.addEventListener('click',fn);cards.appendChild(b);return b;
  }
  function displayRows(rows,label){
   detail.replaceChildren(el('h3','',label));
   if(!rows.length){detail.appendChild(el('p','',tr('empty')));return;}
   const table=el('table','dfar-sessions');table.style.cssText='width:100%;font-size:12px;border-collapse:collapse';
   const head=el('thead'),header=el('tr');
   for(const k of ['date','id','activity','minutes','task'])header.appendChild(el('th','',tr(k)));
   head.appendChild(header);table.appendChild(head);
   const body=el('tbody');
   for(const s of rows.slice(0,200)){
    const line=el('tr');
    const values=[s.date,s.id,tr(s.domain),s.minutes];
    for(let i=0;i<values.length;i++){const v=values[i];const td=el('td','',i===1?String(v):ascii(v));td.style.padding='6px';line.appendChild(td);}
    const linked=el('td');
    if(s.taskId!==null&&typeof opts.onOpenTask==='function'){
     const go=el('button','',ascii(s.taskId));go.type='button';
     go.addEventListener('click',()=>opts.onOpenTask(s.taskId));linked.appendChild(go);
    }else linked.textContent=s.taskId===null?'—':ascii(s.taskId);
    line.appendChild(linked);body.appendChild(line);
   }
   table.appendChild(body);detail.appendChild(table);
   if(rows.length>200)detail.appendChild(el('p','',ascii((rows.length-200)+' '+tr('more'))));
  }
  function chooseBucket(event){
   if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
   const node=event.target&&typeof event.target.closest==='function'?
    event.target.closest('[data-bucket]'):null;
   if(!node)return;
   if(event.type==='keydown')event.preventDefault();
   const key=node.getAttribute('data-bucket');
   if(!bucketValid(key))return;
   let rows=report.sessions.filter(s=>{
    if(group.value==='monthly')return s.date.slice(0,7)===key;
    if(group.value==='weekly'){
     const endNum=Math.floor(Date.parse(key+'T12:00:00Z')/86400000)+6;
     return s.date>=key&&s.date<=new Date(endNum*86400000+43200000).toISOString().slice(0,10);
    }
    return s.date===key;
   });
   displayRows(rows,key+' — '+ascii(rows.length)+' '+tr('sessions'));
  }
  chart.addEventListener('click',chooseBucket);chart.addEventListener('keydown',chooseBucket);
  function chooseActivity(event){
   if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
   const node=event.target&&typeof event.target.closest==='function'?
    event.target.closest('[data-domain]'):null;
   if(!node||!report)return;
   const selected=node.getAttribute('data-domain');
   if(!core.DOMAINS.includes(selected))return;
   if(event.type==='keydown')event.preventDefault();
   const rows=report.sessions.filter(s=>s.domain===selected);
   displayRows(rows,tr(selected)+' — '+ascii(rows.length)+' '+tr('sessions'));
  }
  split.addEventListener('click',chooseActivity);split.addEventListener('keydown',chooseActivity);
  function refresh(){
   if(disposed)return null;
   try{
    if(!core.validDay(from.value)||!core.validDay(to.value)||from.value>to.value)
     throw new RangeError('Invalid range');
    const next=core.buildReport(provider(),{today:now,startDate:from.value,endDate:to.value,
     domain:domain.value});
    report=next;rangeValid=true;cards.replaceChildren();setStatus('');
    exportBtn.disabled=!exporter||exporter.busy;
    addCard(tr('today'),next.dashboard.today.minutes,()=>{
     from.value=now;to.value=now;refresh();displayRows(report.sessions,tr('today'));});
    addCard(tr('last7'),next.dashboard.last7.minutes,()=>{
     from.value=dayAt(-6);to.value=now;refresh();displayRows(report.sessions,tr('last7'));});
    addCard(tr('last30'),next.dashboard.last30.minutes,()=>{
     from.value=dayAt(-29);to.value=now;refresh();displayRows(report.sessions,tr('last30'));});
    addCard(tr('selected'),next.totals.minutes,()=>displayRows(report.sessions,tr('allSessions')));
    const pct=next.comparison.changePercent===null?'—':ascii(next.comparison.changePercent)+'%';
    compare.textContent=tr('weekComparison')+': '+ascii(next.comparison.current.minutes)+
     ' / '+ascii(next.comparison.previous.minutes)+' ('+pct+')';
    split.replaceChildren(el('h3','',tr('split')));
    const donut=el('div','dfar-donut');
    donut.innerHTML=renderActivitySvg(next.byDomain,{
     label:tr('split'),empty:tr('noData'),unit:tr('minutes'),
     labels:Object.fromEntries(core.DOMAINS.map(d=>[d,tr(d)]))
    });
    split.appendChild(donut);
    for(const d of core.DOMAINS){const v=next.byDomain[d].minutes;
     split.appendChild(el('span','',tr(d)+': '+ascii(v)+' '+tr('minutes')+' · '));}
    goals.replaceChildren(el('h3','',tr('goals')));
    if(!next.goals.available)goals.appendChild(el('p','',tr('noGoals')));
    else for(const g of next.goals.byDomain)
     goals.appendChild(el('p','',tr(g.domain)+': '+ascii(g.actualMinutes)+' / '+
      ascii(g.targetMinutes)+' · '+ascii(g.coverageDays)+' '+tr('snapshotCoverage')));
    series=group.value==='weekly'?next.weekly:group.value==='monthly'?next.monthly:next.daily;
    // Long ranges should not flood the WebView with 3,660 keyboard-focusable rectangles.
    if(series.length>365){group.value='monthly';series=next.monthly;}
    chart.innerHTML=next.totals.sessions?renderBarsSvg(series,{label:tr('minutes'),unit:tr('minutes'),sessionsLabel:tr('sessions')}):'';
    if(!next.totals.sessions)chart.textContent=tr('noData');
    const q=next.quality;
    const msg=tr('quality')+': '+ascii(q.excluded)+' · '+tr('conflicts')+': '+ascii(q.conflicts);
    detail.replaceChildren(el('p','',tr('detail')),el('p','',msg));
    return next;
   }catch(e){rangeValid=false;exportBtn.disabled=true;setStatus(tr('invalid'));return null;}
  }
  for(const c of controls)c.addEventListener('change',refresh);
  reset.addEventListener('click',()=>{from.value=dayAt(-29);to.value=now;
   domain.value='all';group.value='daily';refresh();});
  exportBtn.addEventListener('click',async()=>{
   if(!exporter||!report||!rangeValid||exporter.busy||disposed)return;
   exportBtn.disabled=true;setStatus('');
   const response=await exporter.submit(report,kind.value);
   if(disposed)return;
   exportBtn.disabled=!rangeValid||!exporter;
   setStatus(tr(response.status==='saved'?'saved':response.status==='cancelled'?'cancelled':'failed'));
  });
  target.appendChild(wrapper);refresh();
  return Object.freeze({element:wrapper,refresh,getReport:()=>report,
   destroy:()=>{disposed=true;wrapper.remove();}});
 }
 return Object.freeze({renderBarsSvg,renderActivitySvg,mount});
});
