import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseCohort,classifyParity,formatDigest} from '../../tools/ai_agents/backlog_sweeper.mjs';
const sha=x=>'a'.repeat(39)+x;
const pr=(n=49,extra={})=>({number:n,title:'Improve source-only checks',html_url:'https://github.com/test/pull/'+n,head:{sha:sha('1'),repo:{full_name:'moaz76943-creator/zen-study-focus'}},base:{ref:'old',repo:{full_name:'moaz76943-creator/zen-study-focus'}},state:'open',draft:true,...extra});
const files=()=>[{filename:'tests/demo.test.cjs',status:'modified',sha:sha('2')}];
const tree=(isTarget=false)=>({sha:sha(isTarget?'4':'1'),truncated:false,tree:[{path:'tests/demo.test.cjs',type:'blob',sha:sha('2')}]});
test('prioritizes old PRs and rotates across all open requests',()=>{
 const data=[...Array(25)].map((_,i)=>pr(i+40));data.push(pr(160));
 assert.equal(chooseCohort(data,1,5)[0].number,160);
 const seen=new Set();for(let i=1;i<=6;i++)for(const x of chooseCohort(data,i,5))seen.add(x.number);
 assert.equal(seen.size,26);
});
test('only exact byte parity of own draft files qualifies for closure',()=>{
 const row=classifyParity(pr(),files(),tree(),tree(true));
 assert.equal(row.status,'EXACT_PARITY_SUPERSEDED');assert.equal(row.close,true);assert.equal(row.matched,1);
 for(const p of [pr(49,{draft:false}),pr(49,{state:'closed'}),pr(280),pr(49,{title:'Security fix'}),pr(49,{head:{sha:sha('1'),repo:{full_name:'different/repo'}}})])
  assert.equal(classifyParity(p,files(),tree(),tree(true)).close,false);
});
test('refuses absent, renamed, outside-path, truncated and non-identical changes',()=>{
 const p=pr();
 for(const changed of [[],[{...files()[0],status:'renamed'}],[{...files()[0],sha:sha('0')}],[{...files()[0],filename:'../secrets'}],Array.from({length:301},()=>files()[0])])
  assert.equal(classifyParity(p,changed,tree(),tree(true)).close,false);
 assert.equal(classifyParity(p,files(),tree(),{sha:'x',truncated:true}).close,false);
 assert.equal(classifyParity(p,files(),tree(),{...tree(true),tree:[]}).close,false);
});
test('summary identifies advisory as non-authoritative',()=>{
 const md=formatDigest({target_sha:'abc',open_total:94,reviewed:[{number:49,status:'NEEDS_DIFF_REVIEW',matched:0,total:2,close:false}],closed:[],ai_advisory:'Review manually'});
 assert.match(md,/Open PRs: 94/);assert.match(md,/#49/);assert.match(md,/non-authoritative/);
});
