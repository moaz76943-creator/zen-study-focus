#!/usr/bin/env node
'use strict';
// Real-Chromium mobile layout probe (synthetic viewport, NOT an Android WebView/TalkBack measurement).
// For each width x lang x font scale x page: bottom-nav overlap with the last content, tap-target size of the 7 nav
// buttons and of visible controls, controls intercepted by another element, horizontal overflow.
// Usage: node tools/perf/mobile_layout_probe.cjs [--widths=320,360] [--langs=en,ar] [--scales=100,200] [--height=740] [--json]
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:d;};
const widths=arg('widths','320,360,393,430').split(',').map(Number),langs=arg('langs','en,ar').split(','),scales=arg('scales','100,150,200').split(',').map(Number),height=+arg('height','740');
const root=path.resolve(__dirname,'../../android/app/src/main/assets/web');const files=new Map();
(function ix(d,r){for(const e of fs.readdirSync(d,{withFileTypes:true})){const a=path.join(d,e.name),k=r+'/'+e.name;e.isDirectory()?ix(a,k):e.isFile()&&files.set(k,a);}})(root,'');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.ogg':'audio/ogg','.wav':'audio/wav'};
const srv=http.createServer((q,r)=>{let k;try{k=decodeURIComponent(q.url.split('?')[0]);}catch(_){k='';}if(k==='/')k='/index.html';const f=files.get(k);if(!f){r.statusCode=404;return r.end();}
 fs.readFile(f,(e,d)=>{if(e){r.statusCode=404;return r.end();}r.setHeader('content-type',mime[path.extname(f)]||'application/octet-stream');r.end(d);});});
const PAGES=[['sec-timer','navTimer'],['sec-tasks','navTasks'],['sec-calendar','navCalendar'],['sec-notes','navNotes'],['sec-sounds','navSounds'],['sec-analytics','navAnalytics']];
const measure=()=>{
 const vis=e=>{if(e.closest('details:not([open])')&&!e.closest('summary'))return false;const c=getComputedStyle(e),b=e.getBoundingClientRect();return c.display!=='none'&&c.visibility!=='hidden'&&c.opacity!=='0'&&b.width>0&&b.height>0;};
 const nav=document.querySelector('.bottom-nav-capsule');const nb=nav.getBoundingClientRect();
 const btns=[...nav.querySelectorAll('button')].filter(vis);
 const navSmall=btns.filter(b=>{const r=b.getBoundingClientRect();return r.width<40||r.height<44;}).map(b=>b.id+':'+Math.round(b.getBoundingClientRect().width)+'x'+Math.round(b.getBoundingClientRect().height));
 const navClipped=btns.filter(b=>{const r=b.getBoundingClientRect();return r.left<-0.5||r.right>innerWidth+0.5;}).map(b=>b.id);
 const navText=btns.filter(b=>b.classList.contains('active')).filter(b=>{const s=b.querySelector('span');return s&&s.scrollWidth>s.clientWidth+1;}).map(b=>b.id);
 // visible active section = scroller
 const sec=[...document.querySelectorAll('.tab-section,section,[id^=sec-]')].filter(e=>/^sec-/.test(e.id)&&vis(e))[0];
 const sc=document.scrollingElement;
 const win=innerHeight;
 // scroll everything possible to end
 const scrollers=[sc,...[...document.querySelectorAll('*')].filter(e=>{const o=getComputedStyle(e).overflowY;return (o==='auto'||o==='scroll')&&e.scrollHeight>e.clientHeight+2&&vis(e)&&!nav.contains(e);})];
 scrollers.forEach(s=>{s.scrollTop=s.scrollHeight;});
 const sectionEls=sec?[...sec.querySelectorAll('button,a[href],input,select,textarea,[role=button],h1,h2,h3,p,div')].filter(e=>vis(e)&&e.children.length===0||/^(BUTTON|INPUT|SELECT|TEXTAREA|A)$/.test(e.tagName)&&vis(e)):[];
 let lastBottom=0,lastEl=null;
 for(const e of sectionEls){if(nav.contains(e))continue;const r=e.getBoundingClientRect();if(r.bottom>lastBottom&&r.top<win+4000){lastBottom=r.bottom;lastEl=e;}}
 const covered=lastBottom>nb.top+1?Math.round(lastBottom-nb.top):0; // >0: last content still under the nav after scrolling to the end
 // intercepted controls (visible within viewport, centre hit-tests to a different element)
 const ctl=[...document.querySelectorAll('button,a[href],input,select,textarea,[role=button]')].filter(vis).filter(e=>!nav.contains(e));
 const inView=ctl.filter(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=win&&r.left>=0&&r.right<=innerWidth;});
 const hit=inView.filter(e=>{const r=e.getBoundingClientRect();const t=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return t&&t!==e&&!e.contains(t)&&!t.contains(e);}).map(e=>(e.id||e.className||e.tagName).toString().slice(0,32));
 const small=inView.filter(e=>{const r=e.getBoundingClientRect();return (r.width<40||r.height<40)&&!(e.type==='range'&&r.height>=20)&&e.type!=='checkbox'&&e.type!=='radio';}).map(e=>((e.id||e.className||e.tagName)+'').toString().slice(0,28)+':'+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height));
 const lastCtl=ctl.filter(e=>sec&&sec.contains(e)).sort((a,b)=>b.getBoundingClientRect().bottom-a.getBoundingClientRect().bottom)[0];
 const lr=lastCtl?lastCtl.getBoundingClientRect():null;
 const lastCtlCovered=lr?Math.max(0,Math.round(lr.bottom-nb.top)):0;
 return {navTop:Math.round(nb.top),navH:Math.round(nb.height),navSmall,navClipped,navTextClipped:navText,overflowX:document.documentElement.scrollWidth-innerWidth,lastContentUnderNavPx:covered,lastControlUnderNavPx:lastCtlCovered,intercepted:hit.slice(0,6),smallTargets:small.slice(0,8),smallN:small.length};};
(async()=>{await new Promise(r=>srv.listen(0,r));const base='http://localhost:'+srv.address().port;const b=await chromium.launch();const out=[];
 for(const w of widths)for(const lang of langs)for(const sc of scales){
  const ctx=await b.newContext({viewport:{width:w,height},deviceScaleFactor:2,hasTouch:true,isMobile:true});const p=await ctx.newPage();p.on('dialog',d=>d.dismiss());
  await p.goto(base+'/index.html');await p.waitForTimeout(1200);
  await p.evaluate(l=>{try{applyLanguage(l);}catch(_){}},lang);
  if(sc!==100)await p.addStyleTag({content:'html{font-size:'+sc+'% !important}'});await p.waitForTimeout(500);
  for(const [s,n] of PAGES){
   await p.evaluate(([s,n])=>{try{switchTab(s,document.getElementById(n));}catch(_){}},[s,n]);await p.waitForTimeout(300);
   const r=await p.evaluate(measure);out.push({w,lang,scale:sc,page:s,...r});
  }
  await ctx.close();}
 await b.close();srv.close();
 const bad=o=>o.navSmall.length||o.navClipped.length||o.navTextClipped.length||o.overflowX>0||o.lastContentUnderNavPx>0||o.lastControlUnderNavPx>0||o.intercepted.length||o.smallN>0;
 const issues=out.filter(bad);
 if(arg('json','')){console.log(JSON.stringify({checked:out.length,issues:issues.length,rows:issues},null,1));}
 else{const agg={};for(const o of issues){for(const k of ['navSmall','navClipped','navTextClipped','intercepted','smallTargets']) if(o[k].length)agg[k]=(agg[k]||0)+1;if(o.overflowX>0)agg.overflowX=(agg.overflowX||0)+1;if(o.lastContentUnderNavPx>0)agg.lastContentUnderNav=(agg.lastContentUnderNav||0)+1;if(o.lastControlUnderNavPx>0)agg.lastControlUnderNav=(agg.lastControlUnderNav||0)+1;}
  console.log(JSON.stringify({checked:out.length,pagesWithIssues:issues.length,byKind:agg},null,1));
  for(const o of issues.slice(0,12))console.log(JSON.stringify(o));}
})().catch(e=>{console.error(e);process.exit(2);});
