'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const base=process.env.DF_COMPLETION_URL||'http://127.0.0.1:8770';
const out=process.env.DF_ANALYTICS_EVIDENCE||'/tmp/df-track10-large';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const rows=[];
 try{
  const page=await browser.newPage({viewport:{width:393,height:800}});
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e)));
  await page.goto(base+'/index.html',{waitUntil:'load'});
  for(const mode of ['studio','recovery']){
   const x=await page.evaluate(async mode=>{
    const history=Array.from({length:10000},(_,i)=>({
      id:'qa-record-'+i,date:i%2?'2026-10-18':'2026-10-19',
      domain:i%2?'read':'study',minutes:1,completed:true
    }));
    history.push({...history[0],minutes:900},{id:'qa-demo',date:'2026-10-19',
      minutes:600,domain:'study',isDemo:true});
    const before=JSON.stringify(history);
    const host=document.createElement('div');document.body.appendChild(host);
    let csv='',calls=0;
    const initial=performance.now();
    const opts=mode==='studio'?{
      locale:'de',today:'2026-10-20',startDate:'2026-10-18',endDate:'2026-10-20',
      onExport:async value=>{csv=value;calls++;return {status:'saved'};}
    }:{
      locale:'en',today:'2026-10-20',startDate:'2026-10-18',endDate:'2026-10-20',
      saveCSV:async ({csv:value})=>{csv=value;calls++;return {status:'saved'};}
    };
    const mod=mode==='studio'?window.DeepFocusAnalyticsStudioV21:
      window.DeepFocusAnalyticsRecoveryUI;
    const m=mod.mount(host,()=>({sessionHistory:history,tasksList:[]}),opts);
    try{
      const mountMs=Math.round(performance.now()-initial);
      const report=m.getReport();
      const button=mode==='studio'?m.element.querySelector('.dfa-filters button'):
        [...m.element.querySelectorAll('.dfar-btn')].at(-1);
      button.click();
      await new Promise(resolve=>setTimeout(resolve,20));
      if(!csv)throw Error(mode+' actual UI export did not provide CSV');
      const parsed=csv.trimEnd().split('\r\n');
      const header=parsed[0].split(',');
      const minuteColumn=header.findIndex(x=>x==='"minutes"');
      if(minuteColumn<0)throw Error(mode+' missing minutes CSV header');
      const minutes=parsed.slice(1).reduce((total,line)=>
        total+Number(line.split(',')[minuteColumn].replaceAll('"','')),0);
      return {mode,mountMs,records:report.totals.sessions,
        totalMinutes:report.totals.minutes,duplicate:report.quality.duplicates,
        excluded:report.quality.excluded,exportRows:parsed.length-1,
        csvTotalMinutes:minutes,bytes:new TextEncoder().encode(csv).length,
        csv,mutated:JSON.stringify(history)!==before,exportCalls:calls};
    }finally{m.destroy();host.remove();}
   },mode);
   assert.equal(x.records,10000,mode+' 10k unique sessions');
   assert.equal(x.totalMinutes,10000,mode+' real minutes');
   assert.equal(x.exportRows,10000,mode+' exported count');
   assert.equal(x.csvTotalMinutes,10000,mode+' UI CSV parity');
   assert.equal(x.exportCalls,1,mode+' one exporter callback');
   assert.equal(x.mutated,false,mode+' never writes history');
   assert.ok(x.bytes<4000000,mode+' below Android bridge accepted maximum');
   assert.doesNotMatch(x.csv,/[\u0660-\u0669\u06f0-\u06f9]/,mode+' Western generated CSV');
   rows.push({...x,csvSha256:crypto.createHash('sha256').update(x.csv,'utf8').digest('hex'),csv:undefined});
  }
  assert.deepEqual(pageErrors,[]);
  fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(out+'/track10-10k-real-browser-csv.json',JSON.stringify({rows,pageErrors},null,2));
  console.log(JSON.stringify({browserTenThousand:rows.map(x=>({mode:x.mode,
    sessions:x.records,minutes:x.totalMinutes,csvRows:x.exportRows,
    csvMinutes:x.csvTotalMinutes,renderMs:x.mountMs})),pageErrors:pageErrors.length}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
