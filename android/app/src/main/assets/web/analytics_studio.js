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
    heatAria:'Calendar year heatmap of verified session records'
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
    heatAria:'خريطة الجلسات المسجلة خلال السنة'
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
      const label=esc(d.key+': '+d.minutes+' '+t.minuteUnit+', '+d.sessions+' '+t.sessions);
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
    const exportBtn=mk('button',t.export);exportBtn.type='button';exportBtn.style.cssText='min-height:42px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:10px;padding:6px 12px';
    filters.appendChild(exportBtn);wrapper.appendChild(filters);
    const kpis=mk('div');kpis.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin:12px 0';wrapper.appendChild(kpis);
    const detail=mk('p',t.details);detail.setAttribute('aria-live','polite');
    const error=mk('p','');error.setAttribute('role','alert');error.style.cssText='color:#991b1b';error.hidden=true;
    const chartTitle=mk('h3',t.chart), chart=mk('div');chart.style.overflowX='auto';
    const domainView=mk('div');domainView.style.cssText='display:flex;gap:12px;flex-wrap:wrap;margin:12px 0';
    const goals=mk('div'),taskBox=mk('div'),heatTitle=mk('h3',t.year),heat=mk('div');heat.style.overflowX='auto';
    [error,chartTitle,chart,detail,domainView,goals,taskBox,heatTitle,heat].forEach(e=>wrapper.appendChild(e));
    let current=null,currentSeries=[],heatDays=[],destroyed=false;
    function refresh(){
      if(destroyed)return null;
      const from=start.value,to=end.value;
      const valid=core.validDay(from)&&core.validDay(to)&&from<=to&&
        (Date.parse(to+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/86400000<3660;
      start.setAttribute('aria-invalid',!valid?'true':'false');
      end.setAttribute('aria-invalid',!valid?'true':'false');
      exportBtn.disabled=!valid;error.hidden=valid;error.textContent=valid?'':t.invalidRange;
      if(!valid){
        current=null;currentSeries=[];heatDays=[];kpis.replaceChildren();
        chart.replaceChildren();chart.textContent='';heat.replaceChildren();heat.textContent='';
        detail.textContent=t.invalidRange;domainView.replaceChildren();
        goals.replaceChildren();taskBox.replaceChildren();
        return null;
      }
      const snap=provider();const today=opts.today||core.localToday();
      const report=core.buildReport(snap,{today,startDate:from,endDate:to,domain:domain.value,goals:opts.goals});
      current=report;kpis.replaceChildren();
      for(const [name,value] of [[t.minutes,report.totals.minutes],[t.sessions,report.totals.sessions],
        [t.average,report.totals.averageMinutes===null?'—':report.totals.averageMinutes],
        [t.streak,report.streaks.current]]){
        const box=mk('div');box.style.cssText='padding:12px;background:#f8fafc;border-radius:12px';
        const label=mk('div',name);label.style.fontSize='12px';const number=mk('strong',String(value));number.style.fontSize='22px';
        box.append(label,number);kpis.appendChild(box);
      }
      currentSeries=grouping.value==='weekly'?report.weekly:grouping.value==='monthly'?report.monthly:report.daily;
      chart.innerHTML=report.totals.sessions?barsSvg(currentSeries,{strings:t}):'';
      if(!report.totals.sessions){chart.textContent=t.noData;detail.textContent=t.noData;}else detail.textContent=t.details;
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
      const day=node.getAttribute('data-day');const found=currentSeries.find(r=>r.key===day)||heatDays.find(r=>r.key===day);detail.textContent=day+': '+(found?found.minutes:0)+' '+t.minuteUnit;
    };
    [chart,heat].forEach(el=>{el.addEventListener('click',selectDay);el.addEventListener('keydown',selectDay);});
    [domain,grouping,start,end].forEach(el=>el.addEventListener('change',refresh));
    exportBtn.addEventListener('click',()=>{
      if(!current||exportBtn.disabled)return;
      const value=core.toCSV(current,'sessions');
      if(typeof opts.onExport==='function'){opts.onExport(value,'deep-focus-sessions.csv','text/csv;charset=utf-8');return;}
      if(!doc.defaultView||!doc.defaultView.Blob||!doc.defaultView.URL?.createObjectURL)return;
      const blob=new doc.defaultView.Blob(['\ufeff',value],{type:'text/csv;charset=utf-8'});
      const url=doc.defaultView.URL.createObjectURL(blob),a=mk('a');a.href=url;a.download='deep-focus-sessions.csv';
      wrapper.appendChild(a);try{a.click();}finally{a.remove();(doc.defaultView.setTimeout||setTimeout)(()=>doc.defaultView.URL.revokeObjectURL(url),30000);}
    });
    const today=opts.today||core.localToday();if(!core.validDay(today))throw new RangeError('Invalid today');
    const epoch=Math.floor(Date.parse(today+'T12:00:00Z')/86400000);
    const from=new Date((epoch-29)*86400000+43200000).toISOString().slice(0,10);
    start.value=opts.startDate||from;end.value=opts.endDate||today;domain.value=opts.domain||'all';
    target.appendChild(wrapper);refresh();
    return Object.freeze({refresh,getReport:()=>current,destroy:()=>{destroyed=true;wrapper.remove();},element:wrapper});
  }
  return Object.freeze({mount,barsSvg,heatmapSvg});
});