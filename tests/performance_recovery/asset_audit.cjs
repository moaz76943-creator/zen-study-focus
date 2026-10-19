'use strict';
const fs=require('node:fs'),path=require('node:path');
const DEFAULT_WEB=path.resolve(__dirname,'../../android/app/src/main/assets/web');
const isRemote=x=>/^(https?:)?\/\//i.test(x);
function scanAssets(webDir=DEFAULT_WEB){
  const html=fs.readFileSync(path.join(webDir,'index.html'),'utf8');
  const entries=[];
  const scripts=/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  for(const m of html.matchAll(scripts))entries.push({url:m[1],kind:'script'});
  const links=/<link\b[^>]*>/gi;
  for(const m of html.matchAll(links)){
    if(!/\brel\s*=\s*["']stylesheet["']/i.test(m[0]))continue;
    const href=m[0].match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if(href)entries.push({url:href[1],kind:'stylesheet'});
  }
  const criticalLocal=[],missingCritical=[],remoteCritical=[],remoteOptional=[];
  for(const item of entries){
    if(isRemote(item.url)){
      if(item.kind==='stylesheet'&&/^(https?:)?\/\/fonts\.googleapis\.com\//i.test(item.url))
        remoteOptional.push(item.url);
      else remoteCritical.push(item.url);
      continue;
    }
    const relative=item.url.split(/[?#]/)[0];
    if(!relative||path.isAbsolute(relative)||relative.split('/').includes('..')){
      missingCritical.push(item.url);continue;
    }
    criticalLocal.push(relative);
    if(!fs.existsSync(path.join(webDir,relative)))missingCritical.push(relative);
  }
  return {criticalLocal,missingCritical,remoteCritical,remoteOptional};
}
function resourceSizes(webDir=DEFAULT_WEB){
  const summary={js:{count:0,bytes:0},css:{count:0,bytes:0},images:{count:0,bytes:0},sounds:{count:0,bytes:0},html:{count:0,bytes:0},other:{count:0,bytes:0}};
  function visit(dir){
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const full=path.join(dir,entry.name);
      if(entry.isDirectory()){visit(full);continue;}
      if(!entry.isFile())continue;
      const relative=path.relative(webDir,full).split(path.sep).join('/');
      const k=/\.js$/i.test(relative)?'js':/\.css$/i.test(relative)?'css':
        /^images\//i.test(relative)?'images':/\.(ogg|wav)$/i.test(relative)?'sounds':
        /\.html$/i.test(relative)?'html':'other';
      summary[k].count++;
      summary[k].bytes+=fs.statSync(full).size;
    }
  }
  visit(webDir);return summary;
}
if(require.main===module){
  const audit=scanAssets(),sizes=resourceSizes();
  console.log(JSON.stringify({source:'local checkout',sizes,audit},null,2));
  if(audit.missingCritical.length||audit.remoteCritical.length)process.exitCode=1;
}
module.exports=Object.freeze({scanAssets,resourceSizes});
