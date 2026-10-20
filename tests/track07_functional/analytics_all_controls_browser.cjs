'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const root=process.env.DF_COMPLETION_URL||'http://127.0.0.1:8770';
const out=process.env.DF_ANALYTICS_EVIDENCE||'/tmp/df-analytics-controls';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:320,height:760}});
 const errors=[],runs=[];
 page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.goto(root+'/index.html',{waitUntil:'load'});
  await page.waitForFunction(()=>window.DeepFocusAnalyticsStudioV21&&window.DeepFocusAnalyticsRecoveryUI&&window.DeepFocusLocale20Recovery,{timeout:12000});
  for(const lang of windowLanguages()){
   const result=await page.evaluate(async lang=>{
    const status=[];
    const host=document.createElement('div');document.body.appendChild(host);
    const data=()=>({sessionHistory:[
       {id:1,date:'2026-10-19',domain:'study',minutes:35,completed:true},
       {id:2,date:'2026-10-18',domain:'read',minutes:15,completed:true}
      ],tasksList:[],projects:[]});
    const isRecovery=['en','ar'].includes(lang);
    let exports=0,release;
    const saveCSV=()=>{exports++;return new Promise(resolve=>release=resolve);};
    const opts=isRecovery?
     {locale:lang,today:'2026-10-20',startDate:'2026-10-01',endDate:'2026-10-20',saveCSV,...(lang==='ar'?{translate:window.DeepFocusAnalyticsArabic.translate}:{})}:
     {locale:lang,today:'2026-10-20',startDate:'2026-10-01',endDate:'2026-10-20',
      onExport:async()=>{exports++;return {status:'saved'};}};
    const mod=isRecovery?window.DeepFocusAnalyticsRecoveryUI:window.DeepFocusAnalyticsStudioV21;
    const m=mod.mount(host,data,opts);
    try{
     const el=m.element;
     const select=(q)=>{const n=el.querySelector(q);if(!n)throw Error('missing control '+q);return n;};
     const fire=(node,type='change')=>node.dispatchEvent(new Event(type,{bubbles:true}));
     const controls=[...el.querySelectorAll('select')],dates=[...el.querySelectorAll('input[type=date]')];
     if(controls.length < (isRecovery?3:2)||dates.length!==2)throw Error('missing select/date controls');
     status.push('controls-exist');
     controls[0].value='read';fire(controls[0]);
     if(m.getReport().totals.minutes!==15)throw Error('domain filter wrong '+lang);
     controls[0].value='all';fire(controls[0]);
     controls[1].value='weekly';fire(controls[1]);
     if(!m.getReport()?.totals.sessions)throw Error('grouping changed report unexpectedly');
     status.push('domain-grouping');
     dates[0].value='2030-01-01';fire(dates[0]);
     const exp=select(isRecovery?'.dfar-btn:last-child':'.dfa-filters button');
     if(isRecovery){
       if(!exp.disabled)throw Error('invalid date should disable native export');
     }
     exp.click();
     if(exports!==0)throw Error('stale invalid-date export');
     dates[0].value='2026-10-01';fire(dates[0]);
     status.push('date-validation');
     if(isRecovery){
       if(exp.disabled)throw Error('export should reenable after valid range');
       const kpis=[...el.querySelectorAll('.dfar-kpi')];
       if(kpis.length!==4)throw Error('not four KPI buttons');
       for(const item of kpis){item.click();if(!m.getReport())throw Error('KPI broke report');}
       const reset=[...el.querySelectorAll('.dfar-btn')][0];
       reset.click();
       if(controls[0].value!=='all'||controls[1].value!=='daily')throw Error('reset failed');
       const bars=el.querySelector('[data-bucket="2026-10-19"]');
       if(bars){bars.dispatchEvent(new MouseEvent('click',{bubbles:true}));if(!el.querySelector('.dfar-detail table'))throw Error('chart bar details failed');}
       const donut=el.querySelector('[data-domain]');
       if(donut){donut.dispatchEvent(new MouseEvent('click',{bubbles:true}));if(!el.querySelector('.dfar-detail table'))throw Error('activity details failed');}
       status.push('4-kpi-reset-chart-donut');
       exp.click();
       if(exports!==1||!exp.disabled)throw Error('SAF busy lock failed');
       exp.click();if(exports!==1)throw Error('duplicate SAF submission');
       release({status:'saved'});
       await new Promise(r=>setTimeout(r,0));
       if(exp.disabled)throw Error('SAF button not reenabled after save');
       status.push('saf-export');
     }else{
       const bars=el.querySelector('[data-day]');
       if(bars){bars.dispatchEvent(new MouseEvent('click',{bubbles:true}));
        if(!el.textContent.includes('2026-10-19'))throw Error('day detail not rendered');}
       exp.click();await new Promise(r=>setTimeout(r,0));
       if(exports!==1)throw Error('non-arabic native SAF adapter not wired');
       status.push('date-chart-export');
     }
     return {lang,engine:isRecovery?'recovery':'studio',controls:status,minutes:m.getReport().totals.minutes,
       direction:el.getAttribute('dir'),exportCalls:exports};
    }finally{m.destroy();host.remove();}
   },lang);
   runs.push(result);
  }
  const numeric=await page.evaluate(()=>{
    const markers=['sec-timer','sec-calendar','sec-notes','sec-tasks','sec-analytics'].map(id=>{
      const host=document.getElementById(id);if(!host)return null;
      const generated=document.createElement('span');generated.setAttribute('data-df-latin-numerals','');
      generated.textContent='الجلسات ١٢ • ۲۰ • ०९ • ৭৮';host.appendChild(generated);
      return generated;
    }).filter(Boolean);
    const authored=document.createElement('span');authored.setAttribute('data-df-user-content','');
    authored.textContent='عنوان من المستخدم ١٢٣';document.body.appendChild(authored);
    window.DeepFocusAsciiNumeralsV21.normalizeGeneratedUi(document);
    const values=markers.map(e=>e.textContent);
    const untouched=authored.textContent;
    markers.forEach(e=>e.remove());authored.remove();
    return {values,untouched};
  });
  assert.ok(runs.length===20);
  assert.equal(numeric.values.length,5);
  assert.ok(numeric.values.every(s=>s.includes('12 • 20 • 09 • 78')));
  assert.equal(numeric.untouched,'عنوان من المستخدم ١٢٣');
  assert.deepEqual(errors,[]);
  fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(out+'/analytics-all-buttons.json',JSON.stringify({runs,numeric,errors},null,2));
  console.log(JSON.stringify({testedLanguages:runs.length,generatedScreens:numeric.values.length,pageErrors:errors.length}));
  await page.setViewportSize({width:320,height:760});
  await page.screenshot({path:out+'/all-screens-latin-320.png',fullPage:false});
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
function windowLanguages(){return ['en','ar','es','zh','hi','fr','de','ru','pt','ja','id','tr','ko','vi','it','bn','ur','fa','pl','nl'];}
