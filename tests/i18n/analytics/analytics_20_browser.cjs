'use strict';
const {createEvidenceReport}=require('../../android_e2e_recovery/private_evidence.cjs');
// Real Chromium DOM probe of the installed-app web assets, NOT Android WebView.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const codes='en ar es zh hi fr de ru pt ja id tr ko vi it bn ur fa pl nl'.split(' ');
const evidence=createEvidenceReport(process.env.DF03_ANALYTICS_REPORT,'df03-analytics-20.json','df03-analytics-');
const base=process.env.DF03_SITE_URL||'http://127.0.0.1:8770';
async function main(){
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,
   args:['--no-sandbox','--disable-dev-shm-usage']});
 const errors=[];
 let results=[];
 try{
  const page=await browser.newPage({viewport:{width:393,height:820}});
  page.on('pageerror',e=>errors.push(String(e.stack||e).slice(0,600)));
  await page.goto(base+'/index.html',{waitUntil:'load'});
  results=await page.evaluate(codes=>{
   const rows=[];
   for(const code of codes){
    const issues=[],host=document.createElement('div');
    host.setAttribute('data-df03-temporary','');
    document.body.appendChild(host);
    let instance;
    try {
     if(typeof window.DeepFocusAnalyticsStudioV21?.mount!=='function')
       throw Error('Analytics Studio runtime unavailable');
     instance=window.DeepFocusAnalyticsStudioV21.mount(host,()=>({
       cfg:{sessionHistory:[{id:'df03-unique',date:'2026-10-19',domain:'study',
         minutes:30,completed:true}]},tasksList:[],projects:[]
     }),{locale:code,today:'2026-10-20',startDate:'2026-10-01',
       endDate:'2026-10-20'});
     const panel=instance.element;
     const dir=['ar','fa','ur'].includes(code)?'rtl':'ltr';
     if(panel.getAttribute('lang')!==code)issues.push('LANG_MISMATCH');
     if(panel.getAttribute('dir')!==dir)issues.push('RTL_MISMATCH');
     const heading=panel.querySelector('h2')?.textContent?.trim();
     if(!heading)issues.push('MISSING_HEADING');
     const fields=[...panel.querySelectorAll('input[type=date]')];
     if(fields.length!==2||fields.some(el=>getComputedStyle(el).direction!=='ltr'))
       issues.push('DATE_DIRECTION');
     const svgs=[...panel.querySelectorAll('svg.dfa-svg')];
     if(svgs.length!==2||svgs.some(el=>el.getAttribute('role')!=='img'||
       !el.getAttribute('aria-label')?.trim()))issues.push('SVG_ACCESSIBLE_LABEL');
     if(instance.getReport()?.totals?.minutes!==30)
       issues.push('RECORDED_MINUTES');
     const text=panel.textContent||'';
     // We assert machine-generated totals do not contain localized decimal digits,
     // without replacing or normalizing user-authored task/note content.
     if(/[\u0660-\u0669\u06f0-\u06f9\u0966-\u096f\u09e6-\u09ef]/.test(text))
       issues.push('NON_WESTERN_GENERATED_DIGIT');
     const provenTitle=window.DF99Locale?.coverage?.([code],'analytics',['title'])?.[0]?.translated===1;
     rows.push({code,status:issues.length?'FAIL':'PASS',issues,
       heading,translatedTitleSource:Boolean(provenTitle),
       accessibilityChecks:svgs.length,dateFieldCount:fields.length,minutes:30});
    }catch(e){issues.push(String(e.stack||e).slice(0,300));
     rows.push({code,status:'FAIL',issues});
    }finally{instance?.destroy?.();host.remove();}
   }
   return rows;
  },codes);
 }finally{await browser.close();}
 const report={kind:'REAL_CHROMIUM_ANALYTICS_NOT_ANDROID',source_sha:process.env.GITHUB_SHA||'LOCAL',
  total:results.length,pass:results.filter(x=>x.status==='PASS').length,
  fail:results.filter(x=>x.status==='FAIL').length,results,errors,
  translationCompleteness:'NOT_TESTED',android:'NOT_TESTED',releaseApproved:false};
 evidence.write(JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({total:report.total,pass:report.pass,fail:report.fail,
  errors:errors.length,firstFailures:results.filter(x=>x.status==='FAIL').slice(0,6)}));
 assert.equal(report.total,20);
 assert.equal(report.fail,0,'All actual DOM Analytics locale/RTL/chart assertions required');
 assert.deepEqual(errors,[],'Browser uncaught JS errors');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
