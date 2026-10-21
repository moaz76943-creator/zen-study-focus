'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const core=require('../../docs/control-center/track15-core.js');
const script=fs.readFileSync(path.resolve(__dirname,'../../docs/control-center/track15-ui.js'),'utf8');
const HEAD='a'.repeat(40),OLD='b'.repeat(40);
class Element{
 constructor(tag){this.tag=tag;this.textContent='';this.dataset={};this.children=[];this.events={};this.disabled=false;}
 addEventListener(type,fn){this.events[type]=fn;}
 replaceChildren(...items){this.children=items;}
 append(...items){this.children.push(...items);}
}
function boot(){
 const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new Element(id));return nodes.get(id);};
 const document={readyState:'complete',getElementById:get,createElement:tag=>new Element(tag),addEventListener(){}};
 let observing=null,requests=0;
 class Observer{constructor(fn){observing=fn;}observe(){}disconnect(){}}
 const ledger='<!-- DF_AGENT_LEDGER_V1\n'+JSON.stringify({
   schema_version:1,source_sha:OLD,agent_ids:['timer'],records:{timer:{status:'SOURCE_TESTED',tests:1}}
 })+'\nEND_DF_AGENT_LEDGER_V1 -->';
 const json={
  '/pulls/37':{number:37,head:{sha:'c'.repeat(40)},draft:true},
  '/pulls/138':{number:138,head:{sha:HEAD},draft:true},
  '/issues/64':{title:'Daily QA',state:'open'},
  '/issues/69':{title:'Hourly QA',state:'open',body:ledger},
  '/issues/110':{title:'UI QA',state:'open'},
  ['/actions/runs?head_sha='+HEAD+'&per_page=40']:{
   workflow_runs:[{id:900,head_sha:HEAD,name:'Verify Deep Focus Rescue'}]},
  '/actions/runs/900/jobs?per_page=100':{jobs:[
   {name:'Node source tests',status:'completed',conclusion:'success'},
   {name:'Python regression',status:'completed',conclusion:'failure'}]},
  '/actions/runs/900/artifacts?per_page=100':{artifacts:[]}
 };
 const fetch=async url=>{
   requests++;
   const key=String(url).split('/zen-study-focus')[1];
   if(!(key in json))throw Error('Unrecognized URL '+key);
   return {ok:true,headers:{get:()=>null},json:async()=>json[key]};
 };
 vm.runInNewContext(script,{
   document,globalThis:{DeepFocusTrack15Core:core},IntersectionObserver:Observer,
   fetch,AbortController,setTimeout:()=>1,clearTimeout:()=>{},console
 },{timeout:2000});
 return {get,watch:()=>observing?.([{isIntersecting:true}]),requests:()=>requests};
}
test('track15-ui01 starts lazy, issues no requests on dashboard homepage and has a refresh button',()=>{
 const h=boot();assert.equal(h.requests(),0);
 assert.equal(typeof h.get('track15-refresh').events.click,'function');
 assert.match(h.get('track15-status').textContent,/NOT_TESTED/);
});
test('track15-ui02 exact-run success/failure and previous-SHA agent reports retain evidence identity',async()=>{
 const h=boot();h.watch();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.requests(),8,'Five records, one exact-SHA Actions lookup, two run details');
 assert.equal(h.get('track15-status').dataset.quality,'LIVE');
 assert.ok(h.get('track15-candidates').children.some(x=>x.children[0].textContent.includes('#138')));
 const titles=h.get('track15-jobs').children.map(x=>x.children[0].textContent);
 assert.ok(titles.includes('Node · PASS'));
 assert.ok(titles.includes('Python · FAIL'));
 assert.ok(titles.includes('Android device / SAF / TalkBack · NOT_TESTED'));
 assert.ok(h.get('track15-agents').children.every(x=>x.children[0].textContent.includes('STALE')));
 assert.equal(h.get('track15-refresh').disabled,false);
 h.get('track15-refresh').events.click();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.requests(),8,'manual refresh obeys cooldown and prevents anonymous rate-limit exhaustion');
 assert.equal(h.get('track15-status').dataset.quality,'RATE_LIMITED');
 assert.ok(h.get('track15-candidates').children.every(card=>
   card.children[1].textContent.includes('لا تعدّه Live')),
   'Results must be marked STALE when a rate limit blocks refreshing');

});
test('track15-ui03 scripts use textContent, omit browser credentials and mutation endpoints',()=>{
 assert.match(script,/credentials:'omit'/);
 assert.match(script,/textContent=String\(text\)/);
 assert.doesNotMatch(script,/innerHTML\s*=|Authorization:|localStorage|sessionStorage|pulls\/\d+\/merge|POST\b|DELETE\b/);
});

test('track15-ui04 portable dashboard embeds Track 15 scripts under pinned CSP',()=>{
 const {buildPortable}=require('../../tools/control_center/build_portable.cjs');
 const html=buildPortable();
 assert.match(html,/data-bundle="track15-core\.js"/);
 assert.match(html,/data-bundle="track15-ui\.js"/);
 assert.match(html,/id="track15-refresh"/);
 assert.doesNotMatch(html,/<script src="\.\/track15/);
});
