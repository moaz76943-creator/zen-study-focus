'use strict';
/** Read-only, deterministic Deep Focus localization inventory. Node >=18; no dependencies. */
const fs = require('node:fs');
const path = require('node:path');
const WEB = 'android/app/src/main/assets/web/';
const NATIVE = 'android/app/src/main/';
const REVIEWED = 'assets/i18n/df99_reviewed_packs.json';
const SKIP = /(?:\.bak$|\/audio\/|\/sounds\/|\/images\/|\/css\/|\.min\.js$)/i;
const SCREEN_WORDS = [
  ['navigation',/^(nav_|navigation|tab)/i],['timer',/(timer|focus|break|pomodoro|session)/i],
  ['tasks',/(task|project|kanban|matrix|todo)/i],['notes',/(note|journal|cornell|editor)/i],
  ['goals',/(goal|achievement|streak)/i],['analytics',/(analytic|chart|export|report|stat|csv)/i],
  ['calendar',/(cal_|calendar|date|month)/i],['quick_training',/(quick|training|exercise|sport|round|workout)/i],
  ['audio',/(audio|sound|nature|mixer|volume|alert|chime)/i],
  ['settings',/(setting|backup|restore|theme|privacy|accessib|locale)/i]
];
function screenOf(key, file = '') {
  const name = key.replace(/^(reviewed|premium|quick|zen|registry|bridge|native|core):/, '');
  const s = name.split(/[.:]/)[0];
  if (['timer','tasks','notes','goals','analytics','analyticsDomain','calendar'].includes(s)) return s === 'analyticsDomain' ? 'analytics' : s;
  if (key.startsWith('quick:')) return 'quick_training';
  if (key.startsWith('premium:') && /^(start|pause|resume|reset|focus|shortBreak|longBreak|timerLabel)$/.test(s)) return 'timer';
  if (key.startsWith('native:')) return 'native_android';
  for (const [name, re] of SCREEN_WORDS) if (re.test(s) || re.test(name === 'navigation' ? s : key)) return name;
  if (!/\b(?:locale|i18n|translation)\b/i.test(path.basename(file))) for (const [name, re] of SCREEN_WORDS) if (re.test(path.basename(file))) return name;
  return 'other';
}
function lineOf(str, index) { return str.slice(0, Math.max(index,0)).split('\n').length; }
function sourceFiles(root) {
  const files = {};
  for (const base of [WEB, NATIVE+'res/', NATIVE+'java/', NATIVE+'kotlin/', 'assets/i18n/']) {
    const abs = path.join(root, base);
    if (!fs.existsSync(abs)) continue;
    const walk = dir => { for (const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))) {
      const full = path.join(dir,entry.name); const rel = path.relative(root,full).split(path.sep).join('/');
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && !SKIP.test(rel) && /\.(?:html|js|cjs|json|xml|java|kt)$/.test(rel)) files[rel] = fs.readFileSync(full,'utf8');
    }}; walk(abs);
  }
  const manifest = NATIVE+'AndroidManifest.xml';
  if (fs.existsSync(path.join(root,manifest))) files[manifest] = fs.readFileSync(path.join(root,manifest),'utf8');
  return files;
}
/** Parse a bounded JS *literal* (never evaluate code). Identifiers as values are rejected. */
function parseLiteral(source) {
  let i=0, count=0;
  const ws=()=>{while(i<source.length){if(/\s/.test(source[i])){i++;continue;}
    if(source.slice(i,i+2)==='//'){i=source.indexOf('\n',i+2);if(i<0)i=source.length;continue;}
    if(source.slice(i,i+2)==='/*'){const j=source.indexOf('*/',i+2);if(j<0)throw Error('comment');i=j+2;continue;}break;}};
  const string=()=>{let q=source[i++],out='';while(i<source.length){let c=source[i++];if(c===q)return out;
    if(c==='\\'){c=source[i++];const m={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v','0':'\0'};
      if(c==='u'){const h=source.slice(i,i+4);if(!/^[\da-f]{4}$/i.test(h))throw Error('unicode');i+=4;out+=String.fromCharCode(parseInt(h,16));}
      else if(c==='x'){const h=source.slice(i,i+2);if(!/^[\da-f]{2}$/i.test(h))throw Error('hex');i+=2;out+=String.fromCharCode(parseInt(h,16));}
      else out+=Object.hasOwn(m,c)?m[c]:c;
    }else out+=c;}throw Error('string');};
  const value=(depth=0)=>{if(++count>150000||depth>30)throw Error('limit');ws();const c=source[i];
    if(c==='"'||c==="'")return string();
    if(c==='['){i++;const a=[];ws();while(source[i]!==']'){if(i>=source.length)throw Error('array');a.push(value(depth+1));ws();if(source[i]===','){i++;ws();}else if(source[i]!==']')throw Error('array separator');}i++;return a;}
    if(c==='{'){i++;const o=Object.create(null);ws();while(source[i]!=='}'){
      if(i>=source.length)throw Error('object');let k;if(source[i]==='"'||source[i]==="'")k=string();
      else{const m=/^[A-Za-z_$][\w$]*|^\d+/.exec(source.slice(i));if(!m)throw Error('key');k=m[0];i+=k.length;}
      if(['__proto__','constructor','prototype'].includes(k))throw Error('unsafe key');ws();if(source[i++]!==':')throw Error('colon');o[k]=value(depth+1);ws();
      if(source[i]===','){i++;ws();}else if(source[i]!=='}')throw Error('object separator');
    }i++;return o;}
    const m=/^(?:true|false|null|-?\d+(?:\.\d+)?)/.exec(source.slice(i));if(!m)throw Error('nonliteral');
    i+=m[0].length;return m[0]==='true'?true:m[0]==='false'?false:m[0]==='null'?null:Number(m[0]);};
  const result=value();ws();if(i!==source.length)throw Error('trailing');return result;
}
function expressionAt(text, start) {
  let p=start;while(/\s/.test(text[p]||''))p++;
  const open=text[p],close=open==='{'?'}':open==='['?']':null;if(!close)return null;
  let depth=0,quoted='',esc=false,comment='';const begin=p;
  for(;p<text.length;p++){const c=text[p],n=text[p+1];
    if(comment==='line'){if(c==='\n')comment='';continue;}
    if(comment==='block'){if(c==='*'&&n==='/'){comment='';p++;}continue;}
    if(quoted){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===quoted)quoted='';continue;}
    if(c==='"'||c==="'"){quoted=c;continue;}
    if(c==='/'&&n==='/'){comment='line';p++;continue;}
    if(c==='/'&&n==='*'){comment='block';p++;continue;}
    if(c===open)depth++;else if(c===close&&!--depth)return text.slice(begin,p+1);
  }return null;
}
function literalAfter(text,re) {const m=re.exec(text);if(!m)return null;const expr=expressionAt(text,m.index+m[0].length);if(!expr)return null;try{return parseLiteral(expr);}catch{return null;}}
function collectDictionaries(files) {
  const dict=Object.create(null), issues=[];const add=(family,code,key,value,file)=>{
    if(typeof value!=='string'||!value.trim())return;
    code=String(code).toLowerCase();if(['he','iw'].includes(code))return;
    const id=family+':'+key;if(!dict[id])dict[id]={screen:screenOf(id,file),values:Object.create(null),sources:[]};
    dict[id].values[code]=value;
    if(!dict[id].sources.includes(file))dict[id].sources.push(file);
  };
  const flatten=(family,code,obj,file,prefix='')=>{
    if(typeof obj==='string'){add(family,code,prefix,obj,file);return;}
    if(Array.isArray(obj)){obj.forEach((v,i)=>flatten(family,code,v,file,prefix?(prefix+'.'+i):String(i)));return;}
    if(obj&&typeof obj==='object')Object.keys(obj).sort().forEach(k=>flatten(family,code,obj[k],file,prefix?(prefix+'.'+k):k));
  };
  const get=(file,re)=>literalAfter(files[file]||'',re);
  const pack=files[REVIEWED];if(pack){try{const data=JSON.parse(pack);for(const [lc,sections] of Object.entries(data)) for(const [family,section] of Object.entries(sections)) flatten('reviewed',lc,{[family]:section},REVIEWED);}catch(e){issues.push({file:REVIEWED,error:'invalid JSON: '+e.message});}}
  const rowsFile=WEB+'locale_rows.js';const keys=get(rowsFile,/ZEN_LOCALE_FIELD_KEYS\s*=\s*/);const rows=get(rowsFile,/ZEN_LOCALE_ROWS\s*=\s*/);
  if(Array.isArray(keys)&&rows)for(const [lc,arr] of Object.entries(rows)){if(!Array.isArray(arr)||arr.length!==keys.length){issues.push({file:rowsFile,locale:lc,error:'row length mismatch'});continue;}keys.forEach((k,i)=>add('zen',lc,k,arr[i],rowsFile));}
  const premiumFile=WEB+'locale_premium_v22.js';const pk=get(premiumFile,/const keys\s*=\s*Object\.freeze\s*\(\s*/);const pr=get(premiumFile,/const rows\s*=\s*/);
  if(Array.isArray(pk)&&pr)for(const [lc,arr] of Object.entries(pr)){if(!Array.isArray(arr)||arr.length!==pk.length){issues.push({file:premiumFile,locale:lc,error:'row length mismatch'});continue;}pk.forEach((k,i)=>add('premium',lc,k,arr[i],premiumFile));}
  const quickFile=WEB+'quick_training.js';const qk=get(quickFile,/const QUICK_KEYS\s*=\s*/);const qt=get(quickFile,/const QUICK_TRANSLATIONS\s*=\s*/)||{};
  const extraText=files[quickFile]||'';const assigns=/Object\.assign\s*\(\s*QUICK_TRANSLATIONS\s*,\s*/g;let am;
  while((am=assigns.exec(extraText))){const literal=expressionAt(extraText,am.index+am[0].length);if(!literal){issues.push({file:quickFile,error:'unresolved quick Object.assign'});continue;}try{Object.assign(qt,parseLiteral(literal));}catch{issues.push({file:quickFile,error:'nonliteral quick Object.assign'});}assigns.lastIndex=am.index+am[0].length+literal.length;}
  if(Array.isArray(qk))for(const [lc,arr] of Object.entries(qt)){if(!Array.isArray(arr)||arr.length!==qk.length){issues.push({file:quickFile,locale:lc,error:'row length mismatch'});continue;}qk.forEach((k,i)=>add('quick',lc,k,arr[i],quickFile));}
  const extras=WEB+'locale_extras.js';const ev=get(extras,/ZEN_LOCALE_EXTRAS\s*=\s*/);if(ev)for(const [lc,obj] of Object.entries(ev))flatten('extras',lc,obj,extras);
  const registry=WEB+'js/global_i18n_registry.js';for(const [lc,name] of [['en','MASTER_EN'],['ar','MASTER_AR']]){const v=get(registry,new RegExp('var '+name+'\\s*=\\s*'));if(v)flatten('registry',lc,v,registry);}
  const exp=WEB+'js/expanded_locales_loader.js';const core=get(exp,/var CORE_PACKS\s*=\s*/);if(core)for(const [lc,obj] of Object.entries(core))flatten('registry',lc,obj,exp);
  const bridge=WEB+'js/universal_i18n_bridge.js';const bv=get(bridge,/var DICTIONARIES\s*=\s*/);if(bv)for(const [lc,obj] of Object.entries(bv))flatten('bridge',lc,obj,bridge);
  for(const [file,text] of Object.entries(files))if(/^android\/app\/src\/main\/res\/values(?:-[^/]+)?\/[^/]+\.xml$/.test(file)){
    const qualifier=/\/values-([^/]+)\//.exec(file)?.[1]||'en';let lc=qualifier.replace(/^b\+/, '').split(/[-+]/)[0];
    for(const m of text.matchAll(/<string\s+name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/string>/g))add('native',lc,m[1],m[2].replace(/<[^>]+>/g,'').trim(),file);
  }
  const locales=get(registry,/var SUPPORTED_LOCALES\s*=\s*/);
  const catalog=Array.isArray(locales)?locales.map(x=>x.code).filter(lc=>typeof lc==='string'&&!['he','iw'].includes(lc)):[];
  return {dict,issues,catalog:[...new Set(['en','ar',...catalog,...Object.values(dict).flatMap(e=>Object.keys(e.values))])].sort()};
}
function scan(files) {
  const {dict,issues,catalog}=collectDictionaries(files);
  const refs=Object.create(null),hardcoded=[],nativeGaps=[],unresolved=[];
  const ref=(id,file,text,index,type)=>{if(!refs[id])refs[id]=[];refs[id].push({file,line:lineOf(text,index),type});};
  const hard=(file,text,index,value,type)=>{value=value.replace(/\s+/g,' ').trim();if(value.length<2||!/[\p{L}]/u.test(value)||/^(true|false|null|undefined|https?:|[\w.-]+\.(?:js|html|css))/.test(value))return;
    hardcoded.push({file,line:lineOf(text,index),text:value.slice(0,200),type});};
  for(const [file,text] of Object.entries(files).sort(([a],[b])=>a.localeCompare(b))){
    if(file.endsWith('.html')){
      if (/<script\b[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/i.test(text)) unresolved.push({file,reason:'inline scripts may contain dynamic untranslated strings; runtime review required'});
      const html=text.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,m=>' '.repeat(m.length));
      for(const m of html.matchAll(/<([\w-]+)\b([^>]*?)>/g)){
        const tag=m[1].toLowerCase(),attrs=m[2],at=m.index;
        const bound=[...attrs.matchAll(/\b(data-(?:df22-)?(?:i18n|placeholder|aria-label|title|i18n-placeholder|i18n-title))\s*=\s*["']([^"']+)["']/g)];
        for(const b of bound){const family=b[1].includes('df22')?'premium':b[1].includes('i18n')?'zen':'premium';ref(family+':'+b[2],file,text,at+b.index,'dom-attribute');}
        for(const a of attrs.matchAll(/\b(placeholder|title|aria-label|alt)\s*=\s*["']([^"']+)["']/gi)) if(!bound.some(b=>b[1].includes(a[1])))hard(file,text,at+a.index,a[2],'html-'+a[1]);
        if(/^(?:button|label|h[1-6]|p|span|small|strong|option|a)$/.test(tag)){
          const close=html.indexOf('<',at+m[0].length),val=close>=0?html.slice(at+m[0].length,close):'';
          if(val.trim()&&!bound.length)hard(file,text,at+m[0].length,val.replace(/<[^>]*>/g,''),'html-text');
        }
      }
    }
    if((file.endsWith('.js')||file.endsWith('.cjs'))&&!file.endsWith('/js/df99_reviewed_packs.js')){
      for(const m of text.matchAll(/\b(?:L\(\)|locale|translations)\s*\.\s*([A-Za-z_$][\w$]*)/g))ref('zen:'+m[1],file,text,m.index,'js-property');
      for(const m of text.matchAll(/\b(?:data-i18n|data-df22-i18n|data-df22-placeholder|data-i18n-placeholder)\s*["']?\s*[,=]\s*["']([\w.:-]+)["']/g))ref('zen:'+m[1],file,text,m.index,'js-attribute');
      for(const m of text.matchAll(/\.(?:textContent|innerText|placeholder|ariaLabel|title)\s*=\s*(["'])([^\n"']+)\1/g))hard(file,text,m.index,m[2],'js-dom-assignment');
      for(const m of text.matchAll(/\b(?:alert|confirm|prompt)\s*\(\s*(["'])([^\n"']+)\1/g))hard(file,text,m.index,m[2],'js-dialog');
      for(const m of text.matchAll(/\b(?:innerHTML|insertAdjacentHTML)\s*(?:=|\([^,]+,)\s*\x60([\s\S]*?)\x60/g)){
        for(const t of m[1].matchAll(/<(?:button|h[1-6]|p|span|label|strong)\b[^>]*>([^<\${}]+)<\//gi))hard(file,text,m.index+t.index,t[1],'js-html-template');
      }
      if(/\b(?:t|translate|localize)\s*\(\s*[A-Za-z_$][\w$]*\s*,/.test(text))unresolved.push({file,reason:'dynamic lookup requires runtime tracing'});
    }
    if(file.endsWith('.java')||file.endsWith('.kt')||file.endsWith('.xml')&&file.includes('/res/')){
      for(const m of text.matchAll(/\bR\.string\.([\w]+)/g))ref('native:'+m[1],file,text,m.index,'android-resource');
      for(const m of text.matchAll(/@string\/([A-Za-z_][\w]*)/g))ref('native:'+m[1],file,text,m.index,'android-xml-resource');
      for(const m of text.matchAll(/\b(?:android:text|android:hint|android:contentDescription|android:label)\s*=\s*["'](?!@)([^"']+)["']/g))hard(file,text,m.index,m[1],'native-xml-literal');
      for(const m of text.matchAll(/\b(?:setText|setTitle|setContentDescription)\s*\(\s*"([^"\n]+)"/g))hard(file,text,m.index,m[1],'native-java-literal');
      for(const m of text.matchAll(/\bToast\.makeText\s*\([^,]+,\s*"([^"\n]+)"/g))hard(file,text,m.index,m[1],'native-toast');
    }
  }
  const ids=[...new Set([...Object.keys(dict),...Object.keys(refs)])].sort();
  const unused=Object.keys(dict).filter(id=>!refs[id]||!refs[id].length).sort();
  const missing={},coverage={},fallback={},sameEnglish={};
  for(const lc of catalog){missing[lc]=[];coverage[lc]={};sameEnglish[lc]=[];
    for(const id of ids){const s=dict[id]?.screen||screenOf(id);if(!coverage[lc][s])coverage[lc][s]={translated:0,total:0,missing:0,percent:0};
      const c=coverage[lc][s];c.total++;
      const v=dict[id]?.values?.[lc];if(typeof v==='string'&&v.trim()){
        c.translated++;if(lc!=='en'&&v===dict[id]?.values?.en)sameEnglish[lc].push(id);
      }else{missing[lc].push(id);c.missing++;}
    }
    for(const c of Object.values(coverage[lc]))c.percent=c.total?Math.round(c.translated*10000/c.total)/100:0;
    fallback[lc]=lc==='en'?0:missing[lc].length;
  }
  for(const id of ids.filter(x=>x.startsWith('native:'))){if(!dict[id]||!Object.hasOwn(dict[id].values,'en'))nativeGaps.push({key:id,reason:'missing default Android string resource',references:refs[id]||[]});}
  const hardUnique=[...new Map(hardcoded.map(x=>[x.file+'|'+x.line+'|'+x.text,x])).values()].sort((a,b)=>a.file.localeCompare(b.file)||a.line-b.line);
  for(const h of hardUnique.filter(x=>x.type.startsWith('native-')))nativeGaps.push({key:'hardcoded:'+h.file+':'+h.line,reason:'native UI literal without localized resource',references:[{file:h.file,line:h.line,type:h.type}]});
  const sourceMap=Object.fromEntries(ids.map(id=>[id,{screen:dict[id]?.screen||screenOf(id),references:refs[id]||[],dictionary_files:dict[id]?.sources||[]}]));
  return {
    META:{scanner:'DF-LANE-01',method:'static-only',limitations:['Static analysis cannot certify runtime wiring, translation quality or equivalence.','HTML regex is heuristic; complex DOM updates and computed keys require runtime QA.','Identical-to-English strings may be legitimate; flagged, not automatically counted as fallback.','Missing non-English entries are fallback exposure, not proof that the runtime selected English.'],scanned_files:Object.keys(files).length,locales:catalog},
    TOTAL_UI_KEYS:ids.length,KEYS:ids,KEY_SOURCE_MAP:sourceMap,MISSING_KEYS_BY_LANGUAGE:missing,COVERAGE_BY_SCREEN:coverage,
    FALLBACK_COUNT:Object.values(fallback).reduce((a,b)=>a+b,0),FALLBACK_BY_LANGUAGE:fallback,
    HARDCODED_LABELS:hardUnique,NATIVE_ANDROID_GAPS:nativeGaps,UNUSED_TRANSLATIONS:unused,
    ENGLISH_IDENTICAL_CANDIDATES:sameEnglish,UNRESOLVED_DYNAMIC_REFERENCES:unresolved,
    PARSE_ISSUES:issues,DICTIONARY_ENTRY_COUNT:Object.values(dict).reduce((n,e)=>n+Object.keys(e.values).length,0)
  };
}
function markdown(r){const out=['# Deep Focus — static i18n inventory','','Generated by \`node tools/i18n/inventory/index.cjs\` (read-only).','',
  '| Metric | Value |','|---|---:|',
  ...['TOTAL_UI_KEYS','FALLBACK_COUNT','DICTIONARY_ENTRY_COUNT'].map(k=>'| '+k+' | '+r[k]+' |'),
  '| HARDCODED_LABELS | '+r.HARDCODED_LABELS.length+' |', '| NATIVE_ANDROID_GAPS | '+r.NATIVE_ANDROID_GAPS.length+' |',
  '| UNUSED_TRANSLATIONS (candidates) | '+r.UNUSED_TRANSLATIONS.length+' |','| Scanned files | '+r.META.scanned_files+' |','',
  '## Coverage by language (all measured namespaces)','','| Locale | Translated / total | Coverage | Missing |','|---|---:|---:|---:|'];
  for(const lc of r.META.locales){const values=Object.values(r.COVERAGE_BY_SCREEN[lc]);const t=values.reduce((a,c)=>a+c.translated,0),n=values.reduce((a,c)=>a+c.total,0);out.push('| '+lc+' | '+t+' / '+n+' | '+(n?(100*t/n).toFixed(2):'0.00')+'% | '+r.MISSING_KEYS_BY_LANGUAGE[lc].length+' |');}
  out.push('','## Method and limitations','',...r.META.limitations.map(x=>'- '+x),'','## Section coverage','','| Language | Screen | Translated | Total | Percent |','|---|---|---:|---:|---:|');
  for(const lc of r.META.locales)for(const [s,c] of Object.entries(r.COVERAGE_BY_SCREEN[lc]).sort(([a],[b])=>a.localeCompare(b)))out.push('| '+lc+' | '+s+' | '+c.translated+' | '+c.total+' | '+c.percent+'% |');
  out.push('','## Hardcoded samples (first 100)','',...r.HARDCODED_LABELS.slice(0,100).map(x=>'- \`'+x.file+':'+x.line+'\` ['+x.type+'] '+x.text.replace(/[\`|]/g,' ')),
    '','## Native Android gaps','',...r.NATIVE_ANDROID_GAPS.map(x=>'- \`'+x.key+'\`: '+x.reason),'',
    '## Parse / dynamic limitations','',...r.PARSE_ISSUES.map(x=>'- \`'+x.file+'\`: '+x.error),'',
    'All keys, file references, missing keys, unused candidates, and hardcoded findings are in the JSON report.','');return out.join('\n');}
function run(root, outDir){const r=scan(sourceFiles(root));fs.mkdirSync(outDir,{recursive:true});
  fs.writeFileSync(path.join(outDir,'inventory.json'),JSON.stringify(r,null,2)+'\n');
  fs.writeFileSync(path.join(outDir,'inventory.md'),markdown(r));return r;}
if(require.main===module){const root=path.resolve(process.argv[2]||'.');const out=path.resolve(process.argv[3]||'tools/i18n/inventory/reports');
  if(!fs.existsSync(path.join(root,WEB))) {console.error('Missing web assets under '+root);process.exitCode=2;}
  else {const r=run(root,out);console.log(JSON.stringify({TOTAL_UI_KEYS:r.TOTAL_UI_KEYS,scanned_files:r.META.scanned_files,FALLBACK_COUNT:r.FALLBACK_COUNT,HARDCODED_LABELS:r.HARDCODED_LABELS.length,NATIVE_ANDROID_GAPS:r.NATIVE_ANDROID_GAPS.length,PARSE_ISSUES:r.PARSE_ISSUES.length}));}}
module.exports={scan,sourceFiles,parseLiteral,literalAfter,expressionAt,collectDictionaries,markdown,run};
