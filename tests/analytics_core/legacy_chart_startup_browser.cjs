const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.DF03_SITE_URL||'http://127.0.0.1:8770';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
  const page=await browser.newPage({viewport:{width:393,height:820}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/index.html',{waitUntil:'load'});
  await page.evaluate(()=>{
   const date=localDateISO(new Date());
   cfg.sessionHistory=[{id:'real',date,domain:'study',minutes:25},{id:'real',date,domain:'study',minutes:25},
    {id:'sample',date,domain:'study',minutes:100,source:'Sample'},
    {id:'unfinished',date,domain:'study',minutes:100,completed:false}];
   cfg.lang='en';cfg.metricsDate=date;
   saveFortressData('zen_fortress_cfg_v21',cfg);
  });
  await page.reload({waitUntil:'load'});
  const actual=await page.evaluate(()=>({minutes:document.getElementById('waveRecordedMinutes').textContent,sessions:document.getElementById('kpiSessionTrend').textContent,stored:cfg.sessionHistory.length}));
  console.log(JSON.stringify({actual,pageErrors:errors}));
  assert.equal(actual.minutes,'25');assert.equal(actual.sessions,'1 verified sessions / 7 days');assert.equal(actual.stored,4);
  assert.deepEqual(errors,[]);
 } finally {await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
