#!/usr/bin/env node
'use strict';
// Real-Chromium responsive probe at 320px: horizontal overflow, off-screen controls, undersized tap targets, dir=rtl for ar.
// Usage: node tools/perf/responsive_320.cjs [lang ...]; synthetic profile, NOT an Android WebView/TalkBack measurement.
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../../android/app/src/main/assets/web');const files=new Map();
(function ix(d,r){for(const e of fs.readdirSync(d,{withFileTypes:true})){const a=path.join(d,e.name),k=r+'/'+e.name;e.isDirectory()?ix(a,k):e.isFile()&&files.set(k,a);}})(root,'');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const srv=http.createServer((q,r)=>{let k;try{k=decodeURIComponent(q.url.split('?')[0]);}catch(_){k='';}if(k==='/')k='/index.html';const f=files.get(k);
  if(!f){r.statusCode=404;return r.end();}fs.readFile(f,(e,d)=>{if(e){r.statusCode=404;return r.end();}r.setHeader('content-type',mime[path.extname(f)]||'application/octet-stream');r.end(d);});});
const SEC=[['sec-timer','navTimer'],['sec-tasks','navTasks'],['sec-calendar','navCalendar'],['sec-notes','navNotes'],['sec-sounds','navSounds'],['sec-analytics','navAnalytics']];
(async()=>{await new Promise(r=>srv.listen(0,r));const base='http://localhost:'+srv.address().port;const langs=process.argv.slice(2).length?process.argv.slice(2):['en','ar','de','ru'];
  const b=await chromium.launch();const out=[];
  for(const lang of langs)for(const fs2 of [1,2]){
    const ctx=await b.newContext({viewport:{width:320,height:640}});const p=await ctx.newPage();p.on('dialog',d=>d.dismiss());
    await p.goto(base+'/index.html');await p.waitForTimeout(1200);
    await p.evaluate(l=>{try{applyLanguage(l);}catch(_){}},lang);
    if(fs2===2)await p.addStyleTag({content:'html{font-size:200% !important}'});await p.waitForTimeout(400);
    for(const [s,n] of SEC){
      await p.evaluate(([s,n])=>{try{switchTab(s,document.getElementById(n));}catch(_){}},[s,n]);await p.waitForTimeout(250);
      const r=await p.evaluate(()=>{const W=document.documentElement.clientWidth;const vis=e=>{const c=getComputedStyle(e),b=e.getBoundingClientRect();return c.display!=='none'&&c.visibility!=='hidden'&&b.width>0&&b.height>0;};
        const ctl=[...document.querySelectorAll('button,a[href],input,select,textarea,[role=button]')].filter(vis);
        const inScroller=e=>{for(let n=e.parentElement;n&&n!==document.body;n=n.parentElement){const o=getComputedStyle(n).overflowX;if((o==='auto'||o==='scroll')&&n.scrollWidth>n.clientWidth)return true;}return false;};
        const off=ctl.filter(e=>{const b=e.getBoundingClientRect();return (b.right>W+1||b.left<-1)&&!inScroller(e);}).map(e=>(e.id||e.className||e.tagName).toString().slice(0,40));
        const small=ctl.filter(e=>{const b=e.getBoundingClientRect();return b.width<32||b.height<32;}).length;
        return {dir:document.documentElement.dir||document.body.dir,overflowX:document.documentElement.scrollWidth-W,controls:ctl.length,offscreen:off.slice(0,5),offscreenN:off.length,under32px:small};});
      out.push({lang,fontScale:fs2*100,screen:s,...r});
    }
    await ctx.close();
  }
  await b.close();srv.close();
  const bad=out.filter(r=>r.overflowX>0||r.offscreenN>0);
  console.log(JSON.stringify({checked:out.length,withIssues:bad.length,issues:bad,dirs:[...new Set(out.map(r=>r.lang+':'+r.dir))]},null,1));
})().catch(e=>{console.error(e);process.exit(2);});
