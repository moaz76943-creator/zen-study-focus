/* Opt-in presentation adapter. Lane 00 chooses placement; no shared DOM or persistence changes. */
(function(root,factory){
  'use strict';
  const api=factory(typeof module==='object'&&module.exports
    ? require('./analytics_core_v21.js') : root.DeepFocusAnalyticsV21);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DeepFocusAnalyticsStudioV21=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(core){
  'use strict';
  if(!core)throw new Error('DeepFocusAnalyticsV21 must be loaded first');
  const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const palettes={study:'#2563eb',read:'#8b5cf6',work:'#f59e0b',sport:'#059669'};
  // Match the reviewed offline DF99 dictionaries. The English/Arabic values
  // are fallbacks only: a key existing in JSON is not enough unless DF99Locale
  // has registered it and the rendered component actually uses its value.
  const EN=Object.freeze({
    title:'Recorded analytics',activity:'Activity',period:'Period',start:'From',end:'To',
    minutes:'Recorded minutes',sessions:'Sessions',average:'Average session',streak:'Current streak',
    noData:'No recorded sessions in this period',goal:'Goal comparison',noGoals:'No daily goals configured',
    tasks:'Completed tasks',chart:'Daily distribution',year:'Year',export:'Export CSV',
    details:'Select a day for details',all:'All',daily:'Daily',weekly:'Weekly',monthly:'Monthly',
    minuteUnit:'min',heatMinutes:'recorded minutes',excluded:'Excluded sessions',
    invalidRange:'Choose valid start and end dates (maximum 3660 days)',
    barAria:'Recorded minutes by credited day',
    heatAria:'Calendar year heatmap of verified session records',
    exportSaved:'CSV file saved',exportCancelled:'CSV save cancelled',exportFailed:'Could not save CSV',
    today:'Today',last7:'Last 7 days',last30:'Last 30 days',currentWeek:'Last 7 days',
    priorWeek:'Previous 7 days',activitySplit:'Time by activity',
    historicalGoals:'Original dated goal targets',noHistoricalGoals:'No dated goal snapshots recorded',
    exportUnavailable:'CSV export is unavailable on this Android version until native Save As is supported'
  });
  const AR=Object.freeze({
    title:'التحليلات الفعلية',activity:'النشاط',period:'الفترة',start:'من',end:'إلى',
    minutes:'دقائق مسجلة',sessions:'جلسات',average:'متوسط الجلسة',streak:'سلسلة الالتزام',
    noData:'لا توجد جلسات مسجلة لهذه الفترة',goal:'مقارنة الأهداف',noGoals:'لا توجد أهداف يومية محددة',
    tasks:'المهام المكتملة',chart:'توزيع الأيام',year:'السنة',export:'تصدير CSV',
    details:'اختر يوماً لعرض تفاصيله',all:'الكل',daily:'يومي',weekly:'أسبوعي',monthly:'شهري',
    minuteUnit:'دقيقة',heatMinutes:'دقائق مسجلة',excluded:'جلسات مستبعدة',
    invalidRange:'اختر تاريخ بداية ونهاية صالحين (بحد أقصى 3660 يوماً)',
    barAria:'الدقائق المسجلة حسب اليوم',
    heatAria:'خريطة الجلسات المسجلة خلال السنة',
    exportSaved:'تم حفظ ملف CSV',exportCancelled:'تم إلغاء حفظ CSV',exportFailed:'تعذّر حفظ ملف CSV',
    today:'اليوم',last7:'آخر 7 أيام',last30:'آخر 30 يومًا',currentWeek:'آخر 7 أيام',
    priorWeek:'الأيام السبعة السابقة',activitySplit:'الوقت حسب النشاط',
    historicalGoals:'الأهداف الأصلية المؤرخة',noHistoricalGoals:'لا توجد أهداف تاريخية مسجلة بالتواريخ',
    exportUnavailable:'تصدير CSV غير متاح على أندرويد حتى دعم الحفظ الأصلي'
  });
  const RTL=new Set(['ar','fa','ur','ps','ckb','ug','sd']);
  function normalizedLocale(locale){
    const code=typeof globalThis.DF99Locale?.normalize==='function'
      ? globalThis.DF99Locale.normalize(locale)
      : (typeof locale==='string'?locale.toLowerCase().trim().split(/[-_]/)[0]:'en');
    return /^(?:he|iw)$/.test(code)||!/^[a-z]{2,3}$/.test(code)?'en':code;
  }
  function localeText(locale){
    const code=normalizedLocale(locale),base=code==='ar'?AR:EN,dict=globalThis.DF99Locale;
    const translated={};
    for(const [key,fallback] of Object.entries(base)){
      const value=typeof dict?.t==='function'?dict.t(code,'analytics',key,fallback):fallback;
      translated[key]=typeof value==='string'&&value.trim()?value:fallback;
    }
    // Reuse already reviewed analytics labels for accessibility when the
    // optional, more specific SVG keys have not yet been translated.
    if(code!=='en'&&code!=='ar'){
      if(translated.barAria===EN.barAria && translated.minutes!==EN.minutes)
        translated.barAria=translated.minutes+' — '+translated.chart;
      if(translated.heatAria===EN.heatAria && translated.year!==EN.year)
        translated.heatAria=translated.year+' — '+translated.chart;
      if(translated.heatMinutes===EN.heatMinutes && translated.minutes!==EN.minutes)
        translated.heatMinutes=translated.minutes;
      if(translated.minuteUnit===EN.minuteUnit && typeof dict?.t==='function'){
        const unit=dict.t(code,'goals','minute',EN.minuteUnit);
        if(typeof unit==='string'&&unit.trim())translated.minuteUnit=unit;
      }
    }
    return translated;
  }
  function domainText(locale,domain,fallback){
    const dict=globalThis.DF99Locale,code=normalizedLocale(locale);
    const value=typeof dict?.t==='function'?dict.t(code,'analyticsDomain',domain,fallback):fallback;
    return typeof value==='string'&&value.trim()?value:fallback;
  }

  function barsSvg(daily,{width=720,height=160,locale='en',strings}={}){
    const t=strings||localeText(locale);
    if(!Array.isArray(daily))throw new TypeError('Expected daily array');
    const max=Math.max(1,...daily.map(r=>r.minutes));
    const w=Math.max(1,width/daily.length||1),bottom=height-22,extent=height-42;
    const marks=daily.map((d,i)=>{
      if(!(core.validDay(d.key)||/^\d{4}-(?:0[1-9]|1[0-2])$/.test(d.key))||typeof d.minutes!=='number'||!Number.isFinite(d.minutes)||d.minutes<0)throw new TypeError('Invalid bar value');
      const bh=extent*d.minutes/max,x=i*w+Math.max(.5,w*.1),barW=Math.max(.5,w*.8);
      const sessionUnit=t.sessions===EN.sessions?'sessions':t.sessions;
      const label=esc(d.key+': '+d.minutes+' '+t.minuteUnit+', '+d.sessions+' '+sessionUnit);
      return '<rect x="'+x.toFixed(2)+'" y="'+(bottom-bh).toFixed(2)+'" width="'+barW.toFixed(2)+'" height="'+bh.toFixed(2)+'" rx="'+Math.min(3,barW/2).toFixed(2)+'" fill="#2563eb" data-day="'+d.key+'" tabindex="0" role="button" aria-label="'+label+'"><title>'+label+'</title></rect>';
    }).join('');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+esc(t.barAria)+'" class="dfa-svg"><line x1="0" x2="'+width+'" y1="'+bottom+'" y2="'+bottom+'" stroke="#cbd5e1"/>'+marks+'</svg>';
  }
  function heatmapSvg(days,{locale='en',strings}={}){
    const t=strings||localeText(locale);
    if(!Array.isArray(days)||![365,366].includes(days.length)||!days.every(d=>core.validDay(d.key)))throw new TypeError('Expected validated full year');
    const offset=new Date(days[0].key+'T12:00:00Z').getUTCDay(),size=11,step=13;
    const max=Math.max(1,...days.map(d=>d.minutes)),maxWeeks=Math.ceil((days.length+offset)/7);
    const nodes=days.map((d,i)=>{
      const n=i+offset,x=7+Math.floor(n/7)*step,y=7+(n%7)*step;
      const fill=d.minutes===0?'#e8eef4':d.minutes/max<.25?'#c7d2fe':d.minutes/max<.5?'#93c5fd':d.minutes/max<.75?'#60a5fa':'#2563eb';
      const label=esc(d.key+': '+d.minutes+' '+t.heatMinutes);
      return '<rect x="'+x+'" y="'+y+'" width="'+size+'" height="'+size+'" rx="2" fill="'+fill+'" data-day="'+d.key+'" tabindex="0" role="button" aria-label="'+label+'"><title>'+label+'</title></rect>';
    }).join('');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+(14+maxWeeks*step)+' 110" role="img" aria-label="'+esc(t.heatAria)+'" class="dfa-svg">'+nodes+'</svg>';
  }
  function activityRingSvg(byDomain,labels,t){
    const domains=core.DOMAINS;
    const values=domains.map(d=>({domain:d,minutes:byDomain[d]?.minutes||0,
      sessions:byDomain[d]?.sessions||0}));
    if(values.some(v=>!Number.isFinite(v.minutes)||v.minutes<0||
       !Number.isSafeInteger(v.sessions)||v.sessions<0))throw new TypeError('Invalid activity totals');
    const total=values.reduce((n,v)=>n+v.minutes,0);
    if(!total)return '';
    const perimeter=2*Math.PI*50;let offset=0;
    const circles=values.filter(v=>v.minutes>0).map(v=>{
      const dash=perimeter*v.minutes/total;
      const aria=esc(labels[v.domain]+': '+v.minutes+' '+t.minuteUnit+', '+v.sessions+' '+t.sessions);
      const c='<circle cx="80" cy="80" r="50" fill="none" stroke="'+palettes[v.domain]+
        '" stroke-width="16" stroke-dasharray="'+dash.toFixed(3)+' '+(perimeter-dash).toFixed(3)+
        '" stroke-dashoffset="'+(-offset).toFixed(3)+'" data-domain="'+v.domain+
        '" tabindex="0" role="button" aria-label="'+aria+'"><title>'+aria+'</title></circle>';
      offset+=dash;return c;
    }).join('');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" role="img" aria-label="'+esc(t.activitySplit)+'">'+circles+'</svg>';
  }
  function mount(target,getSnapshot,opts={}){
    if(!target||typeof target.appendChild!=='function')throw new TypeError('Mount target required');
    const doc=target.ownerDocument||document;
    const provider=typeof getSnapshot==='function'?getSnapshot:()=>getSnapshot||{};
    const locale=normalizedLocale(opts.locale),t=localeText(locale);
    const wrapper=doc.createElement('section');wrapper.className='dfa-studio';
    wrapper.setAttribute('lang',locale);wrapper.setAttribute('dir',RTL.has(locale)?'rtl':'ltr');
    wrapper.style.cssText='background:#fff;color:#14213d;border:1px solid #e2e8f0;border-radius:18px;padding:16px;max-width:100%;overflow:hidden';
    const mk=(tag,text,cls)=>{const el=doc.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
    const heading=mk('h2',t.title);heading.style.margin='0 0 12px';wrapper.appendChild(heading);
    const filters=mk('div',undefined,'dfa-filters');filters.style.cssText='display:flex;flex-wrap:wrap;gap:8px;align-items:end';
    function input(type,labelText){const l=mk('label',labelText);l.style.cssText='display:flex;flex-direction:column;gap:4px;font-size:12px';
      const el=mk(type==='select'?'select':'input');if(type!=='select')el.type=type;
      el.style.cssText='min-height:42px;background:#fff;color:#14213d;border:1px solid #cbd5e1;border-radius:10px;padding:6px';l.appendChild(el);filters.appendChild(l);return el;}
    const domain=input('select',t.activity);
    const labels={all:t.all,study:locale==='ar'?'دراسة':'Study',read:locale==='ar'?'قراءة':'Reading',work:locale==='ar'?'عمل':'Work',sport:locale==='ar'?'رياضة':'Sport'};
    for(const d of core.DOMAINS)labels[d]=domainText(locale,d,labels[d]);
    ['all',...core.DOMAINS].forEach(d=>{const option=mk('option',labels[d]);option.value=d;domain.appendChild(option);});
    const grouping=input('select',t.period);
    for(const value of ['daily','weekly','monthly']){const o=mk('option',t[value]);o.value=value;grouping.appendChild(o);}
    const start=input('date',t.start),end=input('date',t.end);
    const exportKind=input('select',t.export);
    for(const value of ['sessions','daily','weekly','monthly']){const option=mk('option',t[value]);option.value=value;exportKind.appendChild(option);}
    exportKind.value=opts.exportKind||'sessions';
    // The backup-only ZenNative bridge is NOT an Analytics CSV Save callback.
    // Android WebView must not simulate an OS document save with a Blob URL.
    const nativeCsvUnavailable=Boolean(doc.defaultView?.ZenNative)&&typeof opts.onExport!=='function';
    const exportBtn=mk('button',t.export);exportBtn.type='button';exportBtn.style.cssText='min-height:42px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:10px;padding:6px 12px';
    filters.appendChild(exportBtn);
    const periodPresets=mk('div',undefined,'dfa-range-presets');
    periodPresets.style.cssText='display:flex;flex-wrap:wrap;gap:6px;align-items:center';
    filters.appendChild(periodPresets);
    const exportStatus=mk('p','', 'dfa-export-status');
    exportStatus.setAttribute('role','status');exportStatus.setAttribute('aria-live','polite');
    exportStatus.style.cssText='width:100%;margin:0;font-size:12px';
    filters.appendChild(exportStatus);wrapper.appendChild(filters);
    // Calendar-day offsets use UTC noon keys, not variable-length DST hours.
    const today=opts.today||core.localToday();
    if(!core.validDay(today))throw new RangeError('Invalid today');
    const epoch=Math.floor(Date.parse(today+'T12:00:00Z')/86400000);
    const previousDay=(offset)=>new Date((epoch-offset)*86400000+43200000).toISOString().slice(0,10);
    function presetText(days){
      if(days===1){
        try{return new Intl.RelativeTimeFormat(locale,{numeric:'auto'}).format(0,'day');}
        catch(_){return locale==='ar'?'اليوم':'Today';}
      }
      try{
        return t.period+': '+new Intl.NumberFormat(locale+'-u-nu-latn',
          {style:'unit',unit:'day',unitDisplay:'long',useGrouping:false}).format(days);
      }catch(_){return t.period+': '+days+' days';}
    }
    for(const days of [1,7,30]){
      const button=mk('button',presetText(days));button.type='button';
      button.setAttribute('data-range-days',String(days));
      button.style.cssText='min-height:42px;background:#f8fafc;color:#14213d;border:1px solid #cbd5e1;border-radius:10px;padding:6px 10px';
      button.addEventListener('click',()=>{start.value=previousDay(days-1);end.value=today;refresh();});
      periodPresets.appendChild(button);
    }
    const kpis=mk('div');kpis.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin:12px 0';wrapper.appendChild(kpis);
    const detail=mk('div',t.details,'dfa-session-drilldown');detail.setAttribute('aria-live','polite');
    const error=mk('p','');error.setAttribute('role','alert');error.style.cssText='color:#991b1b';error.hidden=true;
    const chartTitle=mk('h3',t.chart), chart=mk('div');chart.style.overflowX='auto';
    const domainView=mk('div');domainView.style.cssText='display:flex;gap:12px;flex-wrap:wrap;margin:12px 0';
    const goals=mk('div'),taskBox=mk('div'),heatTitle=mk('h3',t.year),heat=mk('div');heat.style.overflowX='auto';
    [error,chartTitle,chart,detail,domainView,goals,taskBox,heatTitle,heat].forEach(e=>wrapper.appendChild(e));
    const insightKpis=mk('div',undefined,'dfa-insight-kpis');
    insightKpis.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin:12px 0';
    const comparison=mk('p','', 'dfa-week-comparison');
    const activityRing=mk('div',undefined,'dfa-activity-ring');
    activityRing.style.cssText='min-height:0;margin:12px 0';
    const historicalGoals=mk('section',undefined,'dfa-historical-goals');
    [insightKpis,comparison,activityRing,historicalGoals].forEach(e=>wrapper.appendChild(e));
    function displayRows(rows,label){
      // Render user-authored task titles as text only, without changing digits
      // or injecting their HTML into the analytics document.
      const live=provider();
      const taskTitles=new Map();
      for(const task of (Array.isArray(live?.tasksList)?live.tasksList:[])){
        if(!task||!Number.isSafeInteger(task.id)||task.id<0)continue;
        taskTitles.set(task.id,taskTitles.has(task.id)?null:task.title);
      }
      detail.replaceChildren(mk('h3',label));
      if(!rows.length){detail.appendChild(mk('p',t.noData));return;}
      const table=mk('table');table.style.cssText='width:100%;border-collapse:collapse';
      const head=mk('thead'),headers=mk('tr');
      for(const title of [t.start,t.sessions,t.activity,t.minutes,t.tasks])
        headers.appendChild(mk('th',title));
      head.appendChild(headers);table.appendChild(head);
      const body=mk('tbody'),more=mk('button');
      more.type='button';
      more.setAttribute('data-drilldown-more','true');
      more.style.cssText='min-height:42px;background:#f8fafc;color:#14213d;border:1px solid #cbd5e1;border-radius:10px;padding:8px 12px;margin-top:8px';
      let shown=0;
      function appendPage(){
        if(destroyed)return;
        const next=Math.min(rows.length,shown+200);
        for(const item of rows.slice(shown,next)){
        const tr=mk('tr');
        for(const value of [item.date,item.id,labels[item.domain],item.minutes])
          tr.appendChild(mk('td',String(value)));
        const cell=mk('td');
        if(Number.isSafeInteger(item.taskId)&&item.taskId>=0){
          if(typeof opts.onOpenTask==='function'){
            const title=taskTitles.get(item.taskId);
            const button=mk('button',typeof title==='string'&&title.trim()?title:String(item.taskId));
            button.type='button';
            button.setAttribute('data-task-id',String(item.taskId));
            button.addEventListener('click',()=>{
              const snapshot=provider();
              const matches=(Array.isArray(snapshot.tasksList)?snapshot.tasksList:[])
                .filter(task=>task&&task.id===item.taskId);
              if(matches.length!==1||matches[0].archived===true||
                 matches[0].status==='archived'||matches[0].isStarter===true||
                 matches[0].isDemo===true||matches[0].synthetic===true||
                  core.isSyntheticSource(matches[0].source)||
                  typeof matches[0].title!=='string'||
                  typeof matches[0].done!=='boolean')return;
              opts.onOpenTask(item.taskId);
            });
            cell.appendChild(button);
          }else cell.textContent=String(item.taskId);
        }
        tr.appendChild(cell);body.appendChild(tr);
      }
        shown=next;
        if(shown<rows.length)more.textContent='+ '+t.sessions+': '+shown+' / '+rows.length;
        else more.remove();
      }
      more.addEventListener('click',appendPage);
      table.appendChild(body);detail.appendChild(table);
      if(rows.length>200)detail.appendChild(more);
      appendPage();
    }
    for(const [days,key] of [[1,'today'],[7,'last7'],[30,'last30']]){
      const button=mk('button',t[key]);button.type='button';
      button.setAttribute('data-period-days',String(days));
      button.style.cssText='min-height:42px;background:#fff;color:#14213d;border:1px solid #cbd5e1;border-radius:10px;padding:6px 10px';
      button.addEventListener('click',()=>{
        start.value=previousDay(days-1);end.value=today;
        const report=refresh();if(report)displayRows(report.sessions,t[key]);
      });
      insightKpis.appendChild(button);
    }
    function chooseActivity(event){
      const node=event.target?.closest?.('[data-domain]');
      const selected=node?.getAttribute?.('data-domain');
      if(!core.DOMAINS.includes(selected)||!current)return;
      if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
      if(event.type==='keydown')event.preventDefault();
      displayRows(current.sessions.filter(r=>r.domain===selected),labels[selected]);
    }
    activityRing.addEventListener('click',chooseActivity);
    activityRing.addEventListener('keydown',chooseActivity);
    let current=null,currentSeries=[],heatDays=[],destroyed=false,exporting=false,reportRevision=0;
    function refresh(){
      if(destroyed)return null;
      ++reportRevision;exportStatus.textContent=nativeCsvUnavailable?t.exportUnavailable:'';
      const from=start.value,to=end.value;
      const valid=core.validDay(from)&&core.validDay(to)&&from<=to&&
        (Date.parse(to+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/86400000<3660;
      start.setAttribute('aria-invalid',!valid?'true':'false');
      end.setAttribute('aria-invalid',!valid?'true':'false');
      exportBtn.disabled=!valid||exporting||nativeCsvUnavailable;error.hidden=valid;error.textContent=valid?'':t.invalidRange;
      if(!valid){
        current=null;currentSeries=[];heatDays=[];kpis.replaceChildren();
        chart.replaceChildren();chart.textContent='';heat.replaceChildren();heat.textContent='';
        detail.replaceChildren();detail.textContent=t.invalidRange;domainView.replaceChildren();
        comparison.textContent='';activityRing.innerHTML='';historicalGoals.replaceChildren();
        goals.replaceChildren();taskBox.replaceChildren();
        return null;
      }
      const snap=provider();const today=opts.today||core.localToday();
      const report=core.buildReport(snap,{today,startDate:from,endDate:to,domain:domain.value,goals:opts.goals});
      current=report;kpis.replaceChildren();
      const pct=report.comparison.changePercent===null?'—':report.comparison.changePercent+'%';
      comparison.textContent=t.currentWeek+': '+report.comparison.current.minutes+' '+t.minuteUnit+
        ' / '+t.priorWeek+': '+report.comparison.previous.minutes+' '+t.minuteUnit+' ('+pct+')';
      activityRing.innerHTML=activityRingSvg(report.byDomain,labels,t);
      historicalGoals.replaceChildren(mk('h3',t.historicalGoals));
      if(!report.historicalGoals.available)historicalGoals.appendChild(mk('p',t.noHistoricalGoals));
      else for(const item of report.historicalGoals.byDomain){
        historicalGoals.appendChild(mk('p',labels[item.domain]+': '+item.actualMinutes+
          ' / '+item.targetMinutes+' '+t.minuteUnit+' ('+item.coverageDays+' '+t.daily+')'));
      }
      for(const [name,value] of [[t.minutes,report.totals.minutes],[t.sessions,report.totals.sessions],
        [t.average,report.totals.averageMinutes===null?'—':report.totals.averageMinutes],
        [t.streak,report.streaks.current]]){
        const box=mk('div');box.style.cssText='padding:12px;background:#f8fafc;border-radius:12px';
        const label=mk('div',name);label.style.fontSize='12px';const number=mk('strong',String(value));number.style.fontSize='22px';
        box.append(label,number);kpis.appendChild(box);
      }
      // Dense daily timelines become monthly bars, without altering report totals or exported rows.
      const shownGroup=grouping.value==='daily'&&report.period.days>120?'monthly':grouping.value;
      currentSeries=shownGroup==='weekly'?report.weekly:shownGroup==='monthly'?report.monthly:report.daily;
      chartTitle.textContent=shownGroup==='monthly'&&grouping.value==='daily'?t.chart+' ('+t.monthly+')':t.chart;
      chart.innerHTML=report.totals.sessions?barsSvg(currentSeries,{strings:t}):'';
      if(!report.totals.sessions){chart.textContent=t.noData;detail.replaceChildren();detail.textContent=t.noData;}
      else {detail.replaceChildren();detail.textContent=t.details;}
      domainView.replaceChildren();
      for(const d of core.DOMAINS){const s=report.byDomain[d];const chip=mk('span',labels[d]+': '+s.minutes+' '+t.minuteUnit);
        chip.style.cssText='border-radius:999px;background:#f8fafc;padding:6px 10px;border:1px solid '+palettes[d];domainView.appendChild(chip);}
      goals.replaceChildren(mk('h3',t.goal));
      if(!report.goals.available)goals.appendChild(mk('p',t.noGoals));
      else for(const g of report.goals.byDomain){const p=mk('p',labels[g.domain]+': '+g.actualMinutes+' / '+g.targetMinutes+' '+t.minuteUnit+' ('+g.progress+'%)');goals.appendChild(p);}
      taskBox.replaceChildren(mk('p',t.tasks+': '+report.tasks.completed+' / '+report.tasks.total));
      for(const p of report.tasks.projects){if(p.total>0)taskBox.appendChild(mk('p',p.name+': '+p.completed+' / '+p.total));}
      if(report.quality.excluded)taskBox.appendChild(mk('p',t.excluded+': '+report.quality.excluded));
      // Heatmap only when the selected year contains at least one validated recorded session.
      const year=Number(end.value.slice(0,4));const days=core.yearHeatmap(snap,year,{today,domain:domain.value});
      heatDays=days;
      heat.innerHTML=days.some(x=>x.sessions>0)?heatmapSvg(days,{strings:t}):'';
      if(!heat.innerHTML)heat.textContent=t.noData;
      return report;
    }
    const selectDay=(event)=>{
      const node=event.target.closest?event.target.closest('[data-day]'):null;
      if(!node)return;
      const key=node.getAttribute('data-day');if(!(core.validDay(key)||/^\d{4}-(?:0[1-9]|1[0-2])$/.test(key)))return;
      if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
      if(event.type==='keydown')event.preventDefault();
      if(!current)return;
      const day=node.getAttribute('data-day');
      // The year heatmap covers dates beyond the currently selected report.
      // Fetch just the clicked credited day without changing KPIs or CSV filters.
      if(event.currentTarget===heat&&core.validDay(day)&&
         (day<current.period.startDate||day>current.period.endDate)){
        const dayReport=core.buildReport(provider(),{
          today:opts.today||core.localToday(),
          startDate:day,endDate:day,domain:domain.value
        });
        displayRows(dayReport.sessions,day);
        return;
      }
      const group=currentSeries.find(r=>r.key===day);
      const isMonth=/^\d{4}-\d{2}$/.test(day);
      let matching;
      if(isMonth)matching=current.sessions.filter(r=>r.date.startsWith(day));
      else if(group&&grouping.value==='weekly'){
        const end=new Date(Date.parse(day+'T12:00:00Z')+6*86400000).toISOString().slice(0,10);
        matching=current.sessions.filter(r=>r.date>=day&&r.date<=end);
      }else matching=current.sessions.filter(r=>r.date===day);
      displayRows(matching,day);
    };
    [chart,heat].forEach(el=>{el.addEventListener('click',selectDay);el.addEventListener('keydown',selectDay);});
    [domain,grouping,start,end,exportKind].forEach(el=>el.addEventListener('change',refresh));
    exportBtn.addEventListener('click',async()=>{
      if(!current||exportBtn.disabled||destroyed||exporting||nativeCsvUnavailable)return;
      const selectedKind=exportKind.value||'sessions';
      const value=core.toCSV(current,selectedKind);
      if(typeof opts.onExport==='function'){
        exporting=true;exportBtn.disabled=true;exportStatus.textContent='';
        const revision=reportRevision;
        try{
          const receipt=await opts.onExport(value,'deep-focus-'+selectedKind+'.csv','text/csv;charset=utf-8');
          if(!destroyed&&current&&revision===reportRevision){
            exportStatus.textContent=receipt?.status==='saved'?t.exportSaved:
              receipt?.status==='cancelled'?t.exportCancelled:t.exportFailed;
          }
        }catch(_){
          if(!destroyed&&current&&revision===reportRevision)
            exportStatus.textContent=t.exportFailed;
        }finally{
          exporting=false;
          if(!destroyed)exportBtn.disabled=!current;
        }
        return;
      }
      if(!doc.defaultView||!doc.defaultView.Blob||!doc.defaultView.URL?.createObjectURL)return;
      const blob=new doc.defaultView.Blob(['\ufeff',value],{type:'text/csv;charset=utf-8'});
      const url=doc.defaultView.URL.createObjectURL(blob),a=mk('a');a.href=url;a.download='deep-focus-'+selectedKind+'.csv';
      wrapper.appendChild(a);try{a.click();}finally{a.remove();(doc.defaultView.setTimeout||setTimeout)(()=>doc.defaultView.URL.revokeObjectURL(url),30000);}
    });
    start.value=opts.startDate||previousDay(29);end.value=opts.endDate||today;
    domain.value=opts.domain||'all';grouping.value=opts.grouping||'daily';
    target.appendChild(wrapper);refresh();
    return Object.freeze({refresh,getReport:()=>current,
      getFilters:()=>Object.freeze({startDate:start.value,endDate:end.value,domain:domain.value,grouping:grouping.value,exportKind:exportKind.value}),
      destroy:()=>{destroyed=true;wrapper.remove();},element:wrapper});
  }
  return Object.freeze({mount,barsSvg,heatmapSvg,activityRingSvg});
});