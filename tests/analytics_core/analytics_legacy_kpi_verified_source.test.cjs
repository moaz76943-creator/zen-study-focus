'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
const begin=app.indexOf('function renderAnalyticsBars() {');
const stop=app.indexOf('\nfunction ',begin);
assert.ok(begin>=0&&stop>begin,'renderAnalyticsBars boundary missing');
const fn=app.slice(begin,stop);
const pad=n=>String(n).padStart(2,'0');
function todayKey(offsetDays=0){
  const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-offsetDays);
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
}
function rig(history){
  const nodes=new Map();
  const barBox={textContent:'',children:[],appendChild(c){this.children.push(c);return c;}};
  const document={
    getElementById(id){
      if(id==='anMiniBarsBox')return barBox;
      if(!nodes.has(id))nodes.set(id,{textContent:'',style:{},attributes:{},
        setAttribute(k,v){this.attributes[k]=String(v);},children:[],appendChild(c){this.children.push(c);return c;}});
      return nodes.get(id);
    },
    createElement(tag){
      return {tagName:String(tag).toUpperCase(),textContent:'',title:'',style:{},children:[],
        appendChild(c){this.children.push(c);return c;}};
    }
  };
  const ctx={document,window:{DeepFocusAnalyticsV21:require('../../android/app/src/main/assets/web/analytics_core_v21.js')},cfg:{lang:'en',domain:'study',todayMins:0,sessions:0},
    localDateISO(d=new Date()){d=d||new Date();d.setHours(12,0,0,0);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());},
    L(){return {weekdays:['S','M','T','W','T','F','S']};}};
  vm.createContext(ctx);
  vm.runInContext(fn+'\nthis.renderAnalyticsBars=renderAnalyticsBars;',ctx,{timeout:2000});
  ctx.cfg.sessionHistory=history;
  ctx.renderAnalyticsBars();
  return {text:id=>(nodes.get(id)?.textContent??'')};
}
test('legacy 7-day "verified sessions" excludes interrupted, rest and demo rows like the v21 ledger',()=>{
  const x=rig([
    {id:'v1',date:todayKey(0),minutes:25,domain:'study',completed:true},
    {id:'int',date:todayKey(1),minutes:90,domain:'study',completed:false},
    {id:'rest',date:todayKey(2),minutes:30,domain:'study',mode:'rest'},
    {id:'demo',date:todayKey(3),minutes:600,domain:'study',isDemo:true},
    {id:'sample',date:todayKey(4),minutes:120,domain:'read',source:'Sample'},
    {id:'break',date:todayKey(5),minutes:15,domain:'read',status:'interrupted'},
    {id:'stale',date:'2001-01-01',minutes:5,domain:'work',completed:true}
  ]);
  assert.equal(x.text('kpiSessionTrend'),'1 verified sessions / 7 days',
    'Only the single genuine verified session may be counted');
  assert.equal(x.text('kpiWeeklyTrend'),'25 recorded minutes / 7 days',
    'Excluded interrupted/rest/demo minutes must not be credited');
  assert.equal(x.text('waveRecordedMinutes'),'25');
  assert.equal(x.text('share-study'),'100%');
  assert.equal(x.text('share-read'),'0%','Legacy share rendering is preserved, only sources are verified');
});

test('legacy charts use the canonical deduplicated ledger for both minutes and sessions',()=>{
  const history=[
    {id:'real',date:todayKey(),minutes:25,domain:'study',legacy:{keep:true}},
    {id:'real',date:todayKey(),minutes:25,domain:'study'},
    {id:'bad-minutes',date:todayKey(),minutes:'20',domain:'study'},
    {id:'bad-domain',date:todayKey(),minutes:90,domain:'unknown'},
    {date:todayKey(),minutes:90,domain:'study'},
    null
  ];
  const before=JSON.stringify(history),x=rig(history);
  assert.equal(x.text('kpiSessionTrend'),'1 verified sessions / 7 days');
  assert.equal(x.text('kpiWeeklyTrend'),'25 recorded minutes / 7 days');
  assert.equal(JSON.stringify(history),before,'Rendering must preserve original history and unknown fields');
});
