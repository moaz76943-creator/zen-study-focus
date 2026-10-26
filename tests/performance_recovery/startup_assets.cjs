'use strict';
// Small, read-only startup graph audit; source QA, not a substitute for Android offline QA.
const fs=require('node:fs');
const path=require('node:path');
const DEFAULT_WEB=path.resolve(__dirname,'../../android/app/src/main/assets/web');
function auditStartup(webDir=DEFAULT_WEB){
  const html=fs.readFileSync(path.join(webDir,'index.html'),'utf8');
  const items=[];
  for(const match of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi))
    items.push({kind:'script',url:match[1]});
  for(const match of html.matchAll(/<link\b[^>]*>/gi)){
    if(!/\brel\s*=\s*["']stylesheet["']/i.test(match[0]))continue;
    const href=match[0].match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if(href)items.push({kind:'style',url:href[1]});
  }
  const remote=[],unsafe=[],missing=[],local=[];
  for(const item of items){
    const url=item.url;
    if(/^(?:(?:[a-z][\w+.-]*:)?\/\/|[a-z][\w+.-]*:)/i.test(url)){
      remote.push(url);continue;
    }
    const cleaned=url.split(/[?#]/)[0];
    const parts=cleaned.split(/[\\/]/);
    if(!cleaned||path.isAbsolute(cleaned)||parts.some(part=>part==='..')||cleaned.startsWith('\\')){
      unsafe.push(url);continue;
    }
    const name=path.join(webDir,cleaned);
    if(!fs.existsSync(name)||!fs.statSync(name).isFile())missing.push(cleaned);
    else local.push(cleaned);
  }
  return {scripts:items.filter(x=>x.kind==='script').length,
    styles:items.filter(x=>x.kind==='style').length,local,remote,unsafe,missing};
}
if(require.main===module){
  const report=auditStartup();
  console.log(JSON.stringify({kind:'source-only-offline-startup',report},null,2));
  if(report.remote.length||report.unsafe.length||report.missing.length)process.exitCode=1;
}
module.exports={auditStartup};
