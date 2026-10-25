'use strict';
/** DF99 canonical integrator. No external dependencies or network access. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {TextDecoder} = require('node:util');

const SOURCE = 'assets/i18n/df99_reviewed_packs.json';
const TARGET = 'android/app/src/main/assets/web/js/df99_reviewed_packs.js';
const APP = 'android/app/src/main/assets/web/app.js';
const CONTRIBUTIONS = 'assets/i18n/contributions';
const TX = 'tools/i18n/integrator/.transaction';
const LOCK = 'tools/i18n/integrator/.df99.lock';
const APPROVALS = 'tools/i18n/integrator/review_approvals.json';
const STATUS = new Set(['TRANSLATED', 'MACHINE_DRAFT', 'REVIEW_REQUIRED', 'VERIFIED']);
const FORBIDDEN = new Set(['__proto__', 'prototype', 'constructor']);
const RESERVED_LOCALES = new Set(['ar', 'en', 'he', 'iw']);
const PRE = '/* Generated from reviewed offline locale packs, no network calls. */\n'+
  '(function(root){"use strict";const packs=';
const POST = ';const api=root.DF99Locale;'+
  'if(!api)throw new Error("Full app locale bridge missing");'+
  'for(const [lang,sections] of Object.entries(packs)){for(const [family,dict] of Object.entries(sections)){'+
  'if(!api.register(lang,family,dict))throw new Error("Rejected locale pack: "+lang+"/"+family);'+
  '}}})(typeof window!=="undefined"?window:globalThis);\n';

function fail(message) {throw Error('DF99: '+message);}
function digest(s) {return crypto.createHash('sha256').update(s,'utf8').digest('hex');}
function assertSafeName(name,label) {
  if(typeof name!=='string'||FORBIDDEN.has(name)||!(/^[A-Za-z0-9_-]{1,60}$/.test(name))) fail('Unsafe key '+label+': '+name);
}
function walkSafe(obj,label) {
  if(!obj||typeof obj!=='object'||Array.isArray(obj)) fail('Expected object: '+label);
  for(const [k,v] of Object.entries(obj)){
    assertSafeName(k,label);
    if(v!==null&&typeof v==='object')walkSafe(v,label+'/'+k);
  }
}
function readText(file) {
  return new TextDecoder('utf-8',{fatal:true}).decode(fs.readFileSync(file)).replace(/^\uFEFF/,'');
}
function readJSON(file) {
  let data;try {data=JSON.parse(readText(file));} catch(e){fail('Invalid UTF-8/JSON at '+file+': '+e.message);}
  walkSafe(data,file);
  return data;
}
function assertRegular(file) {
  if(fs.existsSync(file)&&fs.lstatSync(file).isSymbolicLink()) fail('Symlink not allowed: '+file);
}
function catalog(root,expectedSize=99) {
  const app=readText(path.join(root,APP));
  const start=app.indexOf('const LANG_CATALOG = ['),end=app.indexOf('const DICT = {',start);
  if(start<0||end<start)fail('Official language catalog not found');
  const codes=[...app.slice(start,end).matchAll(/"code"\s*:\s*"([a-z]+)"/g)].map(x=>x[1]);
  if(new Set(codes).size!==expectedSize||codes.length!==expectedSize)fail('Official catalog must contain '+expectedSize+' distinct languages');
  if(codes.includes('he')||codes.includes('iw'))fail('Forbidden Hebrew language in official catalog');
  return new Set(codes);
}
function tokens(text) {
  const matches=text.match(/\{\{[A-Za-z_][\w]*\}\}|\$\{[A-Za-z_][\w]*\}|\{[A-Za-z_][\w]*\}|%(?:[1-9]\d*\$)?[sdif]/g)||[];
  return matches.sort().join('\u0000');
}
function validateText(value,id) {
  if(typeof value!=='string'||!value.trim()||value.length>1000)fail('Invalid text '+id);
  if(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value))fail('Invalid Unicode '+id);
  if(/[\u0660-\u0669\u06F0-\u06F9]/u.test(value))fail('Non-Western digits '+id);
  // Contributions are UI-only. Refuse all markup and control characters, including script terminators.
  if(/<|>|&(?:#\d+|#x[\da-f]+|[a-z]+);/i.test(value))fail('Unsafe HTML '+id);
  if(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(value))fail('Control character '+id);
}
function parseGenerated(script) {
  if(typeof script!=='string'||!script.startsWith(PRE))fail('Generated JS invalid header');
  const end=script.indexOf(POST,PRE.length);
  if(end<0)fail('Generated JS invalid registration bridge');
  let data;
  try {data=JSON.parse(script.slice(PRE.length,end));}catch(e){fail('Generated JS payload invalid: '+e.message);}
  walkSafe(data,'generated JS');
  return data;
}
function render(packs) {
  const payload=JSON.stringify(packs).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  return PRE+payload+POST;
}
function same(a,b) {return JSON.stringify(a)===JSON.stringify(b);}
function validateExisting(packs,languages) {
  walkSafe(packs,'canonical');
  for(const [lang,sections] of Object.entries(packs)){
    if(!languages.has(lang)||RESERVED_LOCALES.has(lang))fail('Forbidden or unknown locale: '+lang);
    for(const [family,entries] of Object.entries(sections)){
      if(!Object.keys(entries).length)fail('Empty section '+lang+'/'+family);
      for(const [key,value] of Object.entries(entries)){
        if(typeof value!=='string')fail('Non-string canonical entry: '+lang+'/'+family+'/'+key);
      }
    }
  }
}
function schemaFrom(packs) {
  const schema=Object.create(null),templates=Object.create(null);
  for(const sections of Object.values(packs))for(const [family,entries] of Object.entries(sections)){
    if(!schema[family])schema[family]=new Set();
    for(const [key,text] of Object.entries(entries)){
      schema[family].add(key);
      const id=family+'/'+key;
      const found=tokens(text);
      if(templates[id]===undefined)templates[id]=found;
      else if(templates[id]!==found)fail('Existing canonical placeholders disagree: '+id);
    }
  }
  return {schema,templates};
}
function reviewValid(entry) {
  const r=entry.review;
  return r&&typeof r==='object'&&typeof r.reviewer==='string'&&r.reviewer.trim().length>=3&&
    typeof r.evidence==='string'&&r.evidence.trim().length>=8&&
    typeof r.reviewedAt==='string'&&/^\d{4}-\d\d-\d\d$/.test(r.reviewedAt)&&
    r.sha256===digest(entry.text);
}
function approvals(root) {
  const filename=path.join(root,APPROVALS);
  if(!fs.existsSync(filename))return new Map();
  assertRegular(filename);
  let entries;try{entries=JSON.parse(readText(filename));}catch(e){fail('Invalid review approval JSON: '+e.message);}
  if(!Array.isArray(entries))fail('Review approvals must be an array');
  const approved=new Map();
  for(const a of entries){
    if(!a||typeof a!=='object'||Array.isArray(a)||typeof a.id!=='string'||!/^[-A-Za-z0-9_]+\/[-A-Za-z0-9_]+\/[-A-Za-z0-9_]+$/.test(a.id)||
       typeof a.sha256!=='string'||!(/^[0-9a-f]{64}$/).test(a.sha256)||typeof a.reviewer!=='string'||a.reviewer.length<3||
       typeof a.evidence!=='string'||a.evidence.length<8||typeof a.reviewedAt!=='string'||!/^\d{4}-\d\d-\d\d$/.test(a.reviewedAt))fail('Invalid human review approval');
    if(approved.has(a.id))fail('Duplicate human review approval: '+a.id);
    approved.set(a.id,a);
  }
  return approved;
}
function gather(root,languages,schema,templates) {
  const humanApprovals=approvals(root);
  const folder=path.join(root,CONTRIBUTIONS),seen=new Map(),statuses={TRANSLATED:0,MACHINE_DRAFT:0,REVIEW_REQUIRED:0,VERIFIED:0},skipped={MACHINE_DRAFT:0,REVIEW_REQUIRED:0};
  if(!fs.existsSync(folder))return {seen,statuses,skipped};
  assertRegular(folder);
  for(const lane of fs.readdirSync(folder).sort()){
    assertSafeName(lane,'lane');
    const laneDir=path.join(folder,lane);
    if(fs.lstatSync(laneDir).isSymbolicLink()||!fs.statSync(laneDir).isDirectory())fail('Unsafe contribution lane '+lane);
    for(const basename of fs.readdirSync(laneDir).sort()){
      if(!basename.endsWith('.json'))fail('Unexpected contribution file '+basename);
      const lang=basename.slice(0,-5);assertSafeName(lang,'locale');
      if(RESERVED_LOCALES.has(lang)||!languages.has(lang))fail('Forbidden or unknown locale: '+lang);
      const file=path.join(laneDir,basename);assertRegular(file);
      if(!fs.statSync(file).isFile())fail('Expected contribution JSON file '+file);
      const contribution=readJSON(file);
      if(contribution.language!==lang)fail('Language does not match filename '+file);
      if(!STATUS.has(contribution.status))fail('Missing/invalid contribution status '+file);
      const sections=contribution.sections;
      if(!sections||Array.isArray(sections)||typeof sections!=='object')fail('Invalid sections '+file);
      for(const [family,entries] of Object.entries(sections)){
        if(!schema[family])fail('UNKNOWN_NAMESPACE '+family+' in '+file);
        if(!entries||Array.isArray(entries)||typeof entries!=='object')fail('Invalid family '+family);
        for(const [key,raw] of Object.entries(entries)){
          if(!schema[family].has(key))fail('UNKNOWN_KEY '+lang+'/'+family+'/'+key);
          const entry=typeof raw==='string'?{text:raw,status:contribution.status}:raw;
          if(!entry||typeof entry!=='object'||Array.isArray(entry))fail('Invalid entry '+lang+'/'+family+'/'+key);
          const status=entry.status||contribution.status;
          if(!STATUS.has(status))fail('Unknown quality status '+lang+'/'+family+'/'+key);
          const id=lang+'/'+family+'/'+key;
          validateText(entry.text,id);
          if(tokens(entry.text)!==templates[family+'/'+key])fail('PLACEHOLDERS mismatch '+id);
          if(status==='VERIFIED'){
            const approved=humanApprovals.get(id);
            if(!reviewValid(entry)||!approved||approved.sha256!==digest(entry.text)||
               approved.reviewer!==entry.review.reviewer||approved.evidence!==entry.review.evidence||
               approved.reviewedAt!==entry.review.reviewedAt)
              fail('VERIFIED requires separately approved content-bound human review: '+id);
          }
          statuses[status]++;
          const prior=seen.get(id);
          if(prior&&prior.text!==entry.text)fail('CONFLICT contributions '+id+' (lanes '+prior.lane+' vs '+lane+')');
          if(!prior||({MACHINE_DRAFT:0,REVIEW_REQUIRED:1,TRANSLATED:2,VERIFIED:3}[status]>{MACHINE_DRAFT:0,REVIEW_REQUIRED:1,TRANSLATED:2,VERIFIED:3}[prior.status]))seen.set(id,{text:entry.text,status,lane});
        }
      }
    }
  }
  return {seen,statuses,skipped};
}
function collect(root,expectedCatalogSize=99) {
  const source=path.join(root,SOURCE);assertRegular(source);
  const languages=catalog(root,expectedCatalogSize);
  const packs=readJSON(source);validateExisting(packs,languages);
  const {schema,templates}=schemaFrom(packs);
  return {packs,...gather(root,languages,schema,templates)};
}
function ensureDir(file) {fs.mkdirSync(path.dirname(file),{recursive:true});}
function saveDurable(file,content) {
  ensureDir(file);const fd=fs.openSync(file,'wx',0o600);
  try{fs.writeFileSync(fd,content,{encoding:'utf8'});fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
}
function replaceFile(file,content) {
  assertRegular(file);const temp=file+'.df99-'+process.pid+'-'+crypto.randomBytes(4).toString('hex');
  try{saveDurable(temp,content);fs.renameSync(temp,file);}finally{try{fs.unlinkSync(temp);}catch{}}
}
function rollback(root) {
  const dir=path.join(root,TX),journal=path.join(dir,'journal.json');
  if(!fs.existsSync(journal))return false;
  let data;try{data=JSON.parse(readText(journal));}catch{fail('Invalid transaction journal JSON');}
  if(data.version!==1||!Array.isArray(data.files)||data.files.length!==2)fail('Invalid transaction journal; manual recovery required');
  for(const [index,name] of [SOURCE,TARGET].entries()){
    const item=data.files[index];
    if(item.path!==name||typeof item.sha256!=='string')fail('Invalid transaction journal path');
    const backup=path.join(dir,'backup-'+index);
    if(item.existed){const old=readText(backup);if(digest(old)!==item.sha256)fail('Backup corruption: '+name);replaceFile(path.join(root,name),old);}
    else{const dest=path.join(root,name);if(fs.existsSync(dest)){assertRegular(dest);fs.unlinkSync(dest);}}
  }
  fs.rmSync(dir,{recursive:true,force:true});
  return true;
}
function atomicPair(root,sourceContent,jsContent,onStage) {
  const dir=path.join(root,TX),journal=path.join(dir,'journal.json');
  if(fs.existsSync(dir))fail('Pending transaction/lock at '+dir+'; rerun after checking for concurrent importer');
  fs.mkdirSync(dir,{recursive:true});
  let journalReady=false;
  try {
    const files=[SOURCE,TARGET].map((name,index)=>{
      const dest=path.join(root,name);assertRegular(dest);
      const existed=fs.existsSync(dest),previous=existed?readText(dest):'';
      saveDurable(path.join(dir,'backup-'+index),previous);
      return {path:name,existed,sha256:digest(previous)};
    });
    saveDurable(journal,JSON.stringify({version:1,files})+'\n');journalReady=true;
    replaceFile(path.join(root,SOURCE),sourceContent);
    if(onStage)onStage('after-json-rename');
    replaceFile(path.join(root,TARGET),jsContent);
    if(onStage)onStage('after-js-rename');
    fs.rmSync(dir,{recursive:true,force:true});
  } catch(err) {
    if(journalReady){try{rollback(root);}catch(recovery){throw new AggregateError([err,recovery],'DF99 write and recovery both failed');}}
    else fs.rmSync(dir,{recursive:true,force:true});
    throw err;
  }
}
function withLock(root,callback) {
  const filename=path.join(root,LOCK);ensureDir(filename);
  let fd;
  try{fd=fs.openSync(filename,'wx',0o600);}
  catch(e){
    if(e.code!=='EEXIST')throw e;
    let active=true;
    try{const pid=Number(readText(filename).trim());if(!Number.isSafeInteger(pid)||pid<=0)fail('Invalid lock; check active importer');process.kill(pid,0);}
    catch(err){if(err.code==='ESRCH')active=false;else fail('Integrator is locked: '+filename);}
    if(active)fail('Integrator already running: '+filename);
    fs.unlinkSync(filename);fd=fs.openSync(filename,'wx',0o600);
  }
  try{fs.writeFileSync(fd,String(process.pid));fs.fsyncSync(fd);return callback();}
  finally{if(fd!==undefined)fs.closeSync(fd);try{fs.unlinkSync(filename);}catch{}}
}
function run(options={}) {
  const {root=path.resolve(__dirname,'../../..'),check=false,expectedCatalogSize=99,onStage}=options;
  return withLock(root,()=>runLocked({root,check,expectedCatalogSize,onStage}));
}
function runLocked({root,check,expectedCatalogSize,onStage}) {
  const dir=path.join(root,TX);
  if(fs.existsSync(dir)){
    if(!fs.existsSync(path.join(dir,'journal.json')))fail('Importer already running or incomplete staging: '+dir);
    // A crashed import always rolls back; the next invocation safely resumes from contributions.
    rollback(root);
  }
  const {packs,seen,statuses,skipped}=collect(root,expectedCatalogSize);
  let added=0,identical=0;
  for(const [id,entry] of seen){
    const [language,family,key]=id.split('/');
    if(entry.status==='MACHINE_DRAFT'||entry.status==='REVIEW_REQUIRED') {skipped[entry.status]++;continue;}
    const old=packs[language]?.[family]?.[key];
    if(old!==undefined){if(old!==entry.text)fail('CONFLICT canonical '+id+' (lane '+entry.lane+')');identical++;continue;}
    if(!packs[language])packs[language]={};
    if(!packs[language][family])packs[language][family]={};
    packs[language][family][key]=entry.text;added++;
  }
  const source=path.join(root,SOURCE),dest=path.join(root,TARGET);
  const expectedJSON=JSON.stringify(packs,null,2)+'\n';
  const expectedJS=render(packs);
  assertRegular(dest);
  const existingJSON=readText(source),existingJS=fs.existsSync(dest)?readText(dest):null;
  const centralUnchanged=same(JSON.parse(existingJSON),packs);
  let jsMatches=false;
  if(existingJS!==null){
    try{jsMatches=same(parseGenerated(existingJS),packs);}
    catch(error){if(check)throw error;}
  }
  if(check){
    if(!centralUnchanged)fail('CHECK_FAILED: contributions have pending canonical additions ('+added+')');
    if(existingJS===null)fail('Generated JS file missing');
    if(!jsMatches)fail('Generated JS differs from canonical JSON');
    return {added:0,identical,changed:false,statuses,skipped};
  }
  let changed=false;
  if(!centralUnchanged||!jsMatches){
    // Never rewrite canonical formatting when only the compiled JS needs regeneration.
    atomicPair(root,centralUnchanged?existingJSON:expectedJSON,expectedJS,onStage);
    changed=true;
  }
  // Post-write verification: compare the two independently parsed artifacts.
  if(!same(readJSON(source),parseGenerated(readText(dest))))fail('POST_WRITE_PARITY_FAILED');
  return {added,identical,changed,statuses,skipped};
}
module.exports={run,collect,render,parseGenerated};
