'use strict';
// Read-only offline entry graph audit. Source QA only, not Android WebView profiling.
const fs=require('node:fs');
const path=require('node:path');
const DEFAULT_WEB=path.resolve(__dirname,'../../android/app/src/main/assets/web');

function auditStartup(webDir=DEFAULT_WEB){
  const root=path.resolve(webDir);
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const items=[];
  for(const m of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi))
    items.push({kind:'script',url:m[1]});
  for(const m of html.matchAll(/<link\b[^>]*>/gi)){
    if(!/\brel\s*=\s*["']stylesheet["']/i.test(m[0]))continue;
    const href=m[0].match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if(href)items.push({kind:'style',url:href[1]});
  }

  const remote=[],unsafe=[],missing=[],local=[],visitedCSS=new Set();
  const relativeName=p=>path.relative(root,p).split(path.sep).join('/');
  const staysInRoot=p=>p===root||p.startsWith(root+path.sep);

  function inspect(url,baseDir,readCSS=false){
    url=String(url).trim();
    // In-document SVG fragments and embedded CSS data never fetch external files.
    if(url.startsWith('#')||/^data:/i.test(url))return;
    if(/^(?:[a-z][\w+.-]*:|\/\/)/i.test(url)){remote.push(url);return;}
    const clean=url.split(/[?#]/)[0].replace(/\\/g,'/');
    if(!clean||clean.startsWith('/')){unsafe.push(url);return;}
    const absolute=path.resolve(baseDir,clean);
    if(!staysInRoot(absolute)){unsafe.push(url);return;}
    if(!fs.existsSync(absolute)||!fs.statSync(absolute).isFile()){
      missing.push(relativeName(absolute));return;
    }
    const resolved=fs.realpathSync(absolute);
    if(!staysInRoot(resolved)){unsafe.push(url);return;}
    const relative=relativeName(absolute);
    if(!local.includes(relative))local.push(relative);
    if(readCSS&&!visitedCSS.has(resolved)){
      visitedCSS.add(resolved);
      scanCSS(fs.readFileSync(resolved,'utf8'),path.dirname(resolved));
    }
  }

  function scanCSS(text,baseDir){
    const css=text.replace(/\/\*[\s\S]*?\*\//g,'');
    const imports=[],urls=[];
    const importsRE=/@import\s+(?:url\(\s*)?(?:"([^"]+)"|'([^']+)'|([^)"'\s;]+))/gi;
    for(const m of css.matchAll(importsRE)){
      const end=css.indexOf(';',m.index);
      imports.push({start:m.index,end:end<0?m.index+m[0].length:end+1,
        url:m[1]||m[2]||m[3]});
    }
    const urlRE=/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi;
    for(const m of css.matchAll(urlRE)){
      if(imports.some(i=>m.index>=i.start&&m.index<i.end))continue;
      urls.push({start:m.index,url:(m[1]??m[2]??m[3]??'').trim()});
    }
    const resources=[
      ...imports.map(x=>({start:x.start,url:x.url,readCSS:true})),
      ...urls.map(x=>({start:x.start,url:x.url,readCSS:/\.css(?:[?#]|$)/i.test(x.url)}))
    ].sort((a,b)=>a.start-b.start);
    for(const resource of resources)inspect(resource.url,baseDir,resource.readCSS);
  }

  // Inline styles are part of the offline launch, not optional resources.
  for(const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi))
    scanCSS(m[1],root);
  for(const item of items)inspect(item.url,root,item.kind==='style');
  return {scripts:items.filter(x=>x.kind==='script').length,
    styles:items.filter(x=>x.kind==='style').length,local,remote,unsafe,missing};
}

if(require.main===module){
  const report=auditStartup();
  console.log(JSON.stringify({kind:'source-only-offline-startup',report},null,2));
  if(report.remote.length||report.unsafe.length||report.missing.length)process.exitCode=1;
}
module.exports={auditStartup};
