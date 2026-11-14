#!/usr/bin/env node
'use strict';
// Notes/Tasks scale + persistence-shape probe on the v21 cores. Synthetic data, Node, not Android.
const path=require('path'),W=p=>require(path.resolve(__dirname,'../../android/app/src/main/assets/web/',p));
const N=W('notes_core_v21.js'),T=W('tasks_core_v21.js');
const now=()=>Number(process.hrtime.bigint())/1e6;const res={runs:[],checks:[]};
const t=(l,f)=>{const s=now();const r=f();res.runs.push({label:l,ms:+(now()-s).toFixed(1)});return r;};
// ---- Notes: fill to MAX_NOTES
let notes=[];const AT=1763114400000;
t('create '+N.MAX_NOTES+' notes (incremental)',()=>{for(let i=0;i<N.MAX_NOTES;i++)notes=N.createNote(notes,{id:i+1,title:'Note '+i+' ملاحظة',body:'body '+i+' '+'x'.repeat(200),tags:['t'+(i%20)],legacyUnknown:{keep:i}},{now:AT});});
res.checks.push({notes:notes.length,unknownFieldKept:notes[0].legacyUnknown!==undefined});
let over=null;try{N.createNote(notes,{id:999999,title:'over',body:''},{now:AT});}catch(e){over=e.message;}
res.checks.push({createBeyondMax:over});
const page=t('search "Note 99" (page)',()=>N.search(notes,{query:'Note 99',limit:50}));
res.checks.push({searchKeys:Object.keys(page),searchReturned:(page.items||page.results||page.notes||[]).length});
t('search by tag t5',()=>N.search(notes,{tags:['t5'],limit:50}));
const s1=t('JSON round trip (persist) '+N.MAX_NOTES+' notes',()=>JSON.parse(JSON.stringify(notes)));
res.checks.push({roundTripEqual:JSON.stringify(s1)===JSON.stringify(notes),bytes:JSON.stringify(notes).length});
// edit/undo/redo history stays bounded
let n1=notes.slice(0,1);for(let i=0;i<50;i++)n1=N.edit(n1,n1[0].id,{body:'rev '+i},{now:AT});
res.checks.push({revisionsAfter50Edits:(n1[0].revisions||n1[0].history||[]).length,max:N.MAX_REVISIONS});
// ---- Tasks
const mk=n=>({cfg:{sessionHistory:[],taskProjectsV21:[]},tasksList:Array.from({length:n},(_,i)=>({id:i+1,title:'Task '+i,date:'2026-11-'+String(i%28+1).padStart(2,'0'),catKey:'study',done:i%3===0,isStarter:false,custom:{keep:i}}))});
for(const n of [10000]){
  const s=mk(n);
  t('listTasks '+n,()=>T.listTasks(s));t('searchTasks '+n,()=>T.searchTasks(s,'Task 99'));
  t('kanban '+n,()=>T.kanban(s));t('taskSections '+n,()=>T.taskSections(s,'2026-11-14'));
  const u=t('updateTask (1 of '+n+')',()=>T.updateTask(s,5000,{title:'Changed'}).state);
  res.checks.push({n,unknownFieldKept:u.tasksList.find(x=>x.id===5000).custom.keep===4999,otherUntouched:u.tasksList.length===n});
  const c=t('createTask on '+n,()=>T.createTask(s,{title:'new',catKey:'study',date:'2026-11-20'},{now:'2026-11-14T10:00:00.000Z',idSeed:n+10}));
  res.checks.push({createdId:c.task.id,len:c.state.tasksList.length});
  const r1=T.setStatus(c.state,c.task.id,'completed',{now:'2026-11-14T10:00:00.000Z'}),r2=T.setStatus(r1.state,c.task.id,'completed',{now:'2026-11-14T10:00:00.000Z'});
  res.checks.push({doubleCompleteLen:[r1.state.tasksList.length,r2.state.tasksList.length]});
}
console.log(JSON.stringify(res,null,1));
