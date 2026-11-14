#!/usr/bin/env node
'use strict';
// Real-Chromium check: starter tasks/notes and the speed-reading tutorial follow the UI language; user edits survive a language switch.
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../../android/app/src/main/assets/web');const files=new Map();
(function ix(d,r){for(const e of fs.readdirSync(d,{withFileTypes:true})){const a=path.join(d,e.name),k=r+'/'+e.name;e.isDirectory()?ix(a,k):e.isFile()&&files.set(k,a);}})(root,'');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const srv=http.createServer((q,r)=>{let k;try{k=decodeURIComponent(q.url.split('?')[0]);}catch(_){k='';}if(k==='/')k='/index.html';const f=files.get(k);if(!f){r.statusCode=404;return r.end();}
  fs.readFile(f,(e,d)=>{if(e){r.statusCode=404;return r.end();}r.setHeader('content-type',mime[path.extname(f)]||'application/octet-stream');r.end(d);});});
const langs=process.argv.slice(2).length?process.argv.slice(2):['sw','ja','ar','hi'];
(async()=>{await new Promise(r=>srv.listen(0,r));const base='http://localhost:'+srv.address().port;const b=await chromium.launch();const out=[];
 for(const lang of langs){
  const p=await (await b.newContext({viewport:{width:390,height:860}})).newPage();p.on('dialog',d=>d.dismiss());
  await p.goto(base+'/index.html');await p.waitForTimeout(1500);
  await p.evaluate(l=>{applyLanguage(l);},lang);await p.waitForTimeout(1200);
  await p.evaluate(()=>{try{switchTab('sec-notes',document.getElementById('navNotes'));}catch(_){}});await p.waitForTimeout(800);
  const r=await p.evaluate(()=>({tasks:tasksList.filter(t=>t.isStarter).map(t=>t.title),notes:notesList.filter(n=>n.isStarter).map(n=>[n.title,n.body]),
    rsvp:(window._dfRsvpState&&window._dfRsvpState.text||'').split('\n').slice(0,1)[0].slice(0,80)}));
  // user edit survives a switch
  await p.evaluate(()=>{const t=tasksList.find(x=>x.id===2);t.title='My own task 7';});
  await p.evaluate(l=>{applyLanguage('fr');},lang);await p.waitForTimeout(800);
  const kept=await p.evaluate(()=>tasksList.find(x=>x.id===2).title);
  await p.evaluate(()=>{applyLanguage('en');});await p.waitForTimeout(800);
  const back=await p.evaluate(()=>({t1:tasksList.find(x=>x.id===1).title,n3:notesList.find(x=>x.id===3).body}));
  out.push({lang,...r,userEditKept:kept==='My own task 7',backToEnglish:back});
  await p.context().close();
 }
 await b.close();srv.close();console.log(JSON.stringify(out,null,1));
})().catch(e=>{console.error(e);process.exit(2);});
