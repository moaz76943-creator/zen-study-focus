#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=process.argv[2]||path.join(root,'assets/i18n/df99_reviewed_packs.json');
const target=process.argv[3]||path.join(root,'android/app/src/main/assets/web/js/df99_reviewed_packs.js');
const app=fs.readFileSync(path.join(root,'android/app/src/main/assets/web/app.js'),'utf8');
const cat=app.slice(app.indexOf('const LANG_CATALOG = ['),app.indexOf('const DICT = {'));
const languages=new Set([...cat.matchAll(/"code"\s*:\s*"([a-z]+)"/g)].map(m=>m[1]));
if(languages.size!==99)throw Error('Official catalog must contain 99 distinct languages');
const namespaces=new Set(['timer','goals','tasks','notes','analytics','analyticsDomain']);
const packs=JSON.parse(fs.readFileSync(source,'utf8'));
if(!packs||Array.isArray(packs)||typeof packs!=='object')throw Error('Expected a locale-object map');
for(const [code,sections] of Object.entries(packs)){
  if(!languages.has(code)||code==='he'||code==='iw'||code==='en'||code==='ar')throw Error('Forbidden or unknown locale: '+code);
  if(!sections||typeof sections!=='object'||Array.isArray(sections))throw Error('Invalid locale body '+code);
  for(const [family,dict] of Object.entries(sections)){
    if(!namespaces.has(family)||!dict||Array.isArray(dict)||typeof dict!=='object')throw Error('Invalid namespace '+family);
    const keys=Object.keys(dict);
    if(keys.length<1||keys.length>250)throw Error('Invalid key count in '+code+'/'+family);
    for(const [key,value] of Object.entries(dict)){
      if(!/^[a-zA-Z0-9_-]{1,60}$/.test(key)||['__proto__','prototype','constructor'].includes(key))throw Error('Invalid key '+key);
      if(typeof value!=='string'||!value.trim()||value.length>1000)throw Error('Missing/invalid text '+code+'/'+family+'/'+key);
      if(/[\u0660-\u0669\u06F0-\u06F9]/.test(value))throw Error('Non-Western digits in translated UI text '+code+'/'+family+'/'+key);
      if(/<\/?(?:script|style|iframe)/i.test(value))throw Error('HTML markup in UI string '+code+'/'+family+'/'+key);
    }
  }
}
const payload=JSON.stringify(packs);
const output='/* Generated from reviewed offline locale packs, no network calls. */\n'+
 '(function(root){"use strict";const packs='+payload+';const api=root.DF99Locale;'+
 'if(!api)throw new Error("Full app locale bridge missing");'+
 'for(const [lang,sections] of Object.entries(packs)){for(const [family,dict] of Object.entries(sections)){'+
 'if(!api.register(lang,family,dict))throw new Error("Rejected locale pack: "+lang+"/"+family);'+
 '}}})(typeof window!=="undefined"?window:globalThis);\n';
fs.writeFileSync(target,output,'utf8');
console.log('BULK_IMPORT_READY languages='+Object.keys(packs).length+' sections='+Object.values(packs).reduce((n,s)=>n+Object.keys(s).length,0));
