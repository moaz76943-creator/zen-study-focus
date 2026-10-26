'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../android/app/src/main/assets/web/tasks_core_v21.js');
const S = () => ({cfg:{sessionHistory:[],taskProjectsV21:[]},tasksList:[{id:1,title:'Starter',date:'2026-10-19',catKey:'study',done:true,isStarter:true},{id:88,title:'Essay',date:'2026-10-19',catKey:'study',done:false,isStarter:false,customField:'keep'}]});
const T = (s,id) => s.tasksList.find(t=>t.id===id);
const opts={now:'2026-10-19T12:00:00.000Z',idSeed:100,noteIds:[101]};
test('CRUD retains legacy fields, numerical IDs and unknown values',()=>{
 let s=S(); const made=C.createTask(s,{title:'  Read  ',catKey:'review',date:'2026-10-20',description:'Notes',priority:'high',estimateMin:35},opts);
 assert.equal(made.task.id,100);assert.equal(typeof made.task.id,'number');assert.equal(made.task.isStarter,false);assert.equal(made.task.done,false);
 assert.equal(T(s,88).title,'Essay');s=made.state;
 s=C.updateTask(s,88,{title:'Updated',description:'Description',date:'2026-10-21',priority:'urgent'}).state;
 assert.equal(T(s,88).customField,'keep');assert.equal(T(s,88).catKey,'study');assert.equal(T(s,88).date,'2026-10-21');
 s=C.trashTask(s,88,opts).state;assert.ok(T(s,88).deletedAt);assert.equal(C.listTasks(s).some(t=>t.id===88),false);
 s=C.restoreTask(s,88).state;assert.equal(C.listTasks(s).some(t=>t.id===88),true);
 assert.throws(()=>C.updateTask(s,88,{id:'task_12'}));
 assert.throws(()=>C.createTask(s,{title:'bad',id:5},opts));
});
test('status derives from done; full undo-worthy transition preserves starter fields',()=>{
 let s=S();assert.equal(C.statusOf(T(s,88)),'todo');
 s=C.setStatus(s,88,'doing',opts).state;assert.equal(T(s,88).done,false);
 s=C.setStatus(s,88,'completed',opts).state;assert.equal(T(s,88).done,true);
 s=C.setStatus(s,88,'archived',opts).state;assert.equal(T(s,88).done,true);
 s=C.setStatus(s,88,'todo',opts).state;assert.equal(T(s,88).done,false);
});
test('recurrence creates only one new occurrence, never duplicates history',()=>{
 let s=C.updateTask(S(),88,{repeat:{frequency:'daily',interval:1}}).state;
 let r=C.setStatus(s,88,'completed',opts);s=r.state;
 assert.equal(s.tasksList.length,3); const child=s.tasksList.find(x=>x.id!==88&&x.id!==1);
 assert.equal(child.date,'2026-10-20');assert.equal(child.done,false);
 assert.equal(child.recurrenceRootId,88);
 s=C.setStatus(s,88,'completed',opts).state;assert.equal(s.tasksList.length,3);
 s=C.setStatus(s,88,'todo',opts).state;s=C.setStatus(s,88,'completed',opts).state;assert.equal(s.tasksList.length,3);
 s=C.setStatus(s,child.id,'completed',opts).state;assert.equal(s.tasksList.length,4);
 assert.equal(s.tasksList.find(x=>x.date==='2026-10-21').recurrenceRootId,88);
});
test('recurrence month end clamped with original anchor, and until limit',()=>{
 let s=S(); s=C.updateTask(s,88,{date:'2026-01-31',repeat:{frequency:'monthly',interval:1,until:'2026-03-31'}}).state;
 s=C.setStatus(s,88,'completed',{now:'2026-02-01T12:00:00Z',idSeed:100}).state;
 const feb=s.tasksList.find(t=>t.date==='2026-02-28');assert.ok(feb);
 s=C.setStatus(s,feb.id,'completed',{now:'2026-03-01T12:00:00Z',idSeed:100}).state;
 const mar=s.tasksList.find(t=>t.date==='2026-03-31');assert.ok(mar);
 s=C.setStatus(s,mar.id,'completed',{now:'2026-04-01T12:00:00Z',idSeed:100}).state;
 assert.equal(s.tasksList.length,4);
});
test('checklists and subtasks use stable distinct numeric IDs',()=>{
 let s=S();s=C.addItem(s,88,'checklist','Submit files',opts).state;
 const id=T(s,88).checklist[0].id;s=C.setItemDone(s,88,'checklist',id,true).state;
 assert.equal(T(s,88).checklist[0].done,true);
 s=C.addItem(s,88,'subtasks','Research',opts).state;
 assert.notEqual(T(s,88).subtasks[0].id,id);
});
test('project progress excludes starter and deleted tasks and deduplicates real IDs',()=>{
 let s=S(), pr=C.createProject(s,{name:'Project A'},opts);s=pr.state;
 s=C.updateTask(s,88,{projectId:pr.project.id}).state;
 s=C.updateTask(s,1,{projectId:pr.project.id}).state;
 assert.deepEqual(C.projectProgress(s,pr.project.id),{total:1,completed:0,percent:0});
 s=C.setStatus(s,88,'completed',opts).state;
 assert.deepEqual(C.projectProgress(s,pr.project.id),{total:1,completed:1,percent:100});
 s=C.trashTask(s,88,opts).state;
 assert.deepEqual(C.projectProgress(s,pr.project.id),{total:0,completed:0,percent:0});
});
test('today top-three, Eisenhower, overdue, search and mobile Kanban',()=>{
 let s=S();s=C.updateTask(s,88,{priority:'high',urgent:true,important:true,description:'Essay writing'}).state;
 assert.equal(C.topThree(s,'2026-10-19')[0].id,88);
 assert.equal(C.eisenhower(s)['do'][0].id,88);
 assert.equal(C.isOverdue(T(s,88),'2026-10-20'),true);
 assert.equal(C.searchTasks(s,{query:'writing'}).length,1);
 assert.equal(C.kanban(s).todo.length,1); // starter demo excluded
 assert.equal(C.calendarTasks(s,'2026-10-19').length,1);
});
test('focus minutes counted once from completed recorded session IDs, never from UI claims',()=>{
 let s=S();s.cfg.sessionHistory=[
 {id:'abc',date:'2026-10-19',minutes:25,mode:'focus',completed:true,taskId:88},
 {id:'abc',date:'2026-10-19',minutes:25,mode:'focus',completed:true,taskId:88},
 {id:'skip',date:'2026-10-19',minutes:80,mode:'break',completed:true,taskId:88},
 {id:'unfinished',date:'2026-10-19',minutes:100,mode:'focus',completed:false,taskId:88},
 {id:'unlinked',date:'2026-10-19',minutes:100,mode:'focus',completed:true},
 {id:'conflict',date:'2026-10-19',minutes:15,mode:'focus',completed:true,taskId:88},
 {id:'conflict',date:'2026-10-19',minutes:15,mode:'focus',completed:true,taskId:123}];
 assert.equal(C.actualFocusMinutes(s,88),25);
 assert.equal(C.actualFocusMinutes(JSON.parse(JSON.stringify(s)),88),25);
 assert.equal(C.compareEstimate(s,88).actualMin,25);
});
test('rejects malformed dates and foreign project/note IDs',()=>{
 assert.throws(()=>C.createTask(S(),{title:'Oops',date:'2026-02-30'},opts));
 assert.throws(()=>C.updateTask(S(),88,{projectId:1234}));
 assert.throws(()=>C.updateTask(S(),88,{noteIds:['note_3']}));
 assert.throws(()=>C.updateTask(S(),88,{date:'bad'}));
});

test('valid v21 legacy tasks without a date remain searchable without changing data',()=>{
 const Compat=require('../../android/app/src/main/assets/web/data_compat_v21.js');
 const state={cfg:{sessions:7,sessionHistory:[],unknown:{keep:'yes'}},tasksList:[
  {id:40,title:'Scheduled',date:'2026-10-21',done:false,custom:{keep:'scheduled'}},
  {id:12,title:'مهمة قديمة ١٢',done:false,custom:{keep:'undated'}}]};
 assert.equal(Compat.inspectRecords({...state,notesList:[]}).ok,true,'An omitted task date is valid v21');
 const before=JSON.parse(JSON.stringify(state));
 assert.deepEqual(C.searchTasks(state).map(t=>t.id),[12,40]);
 assert.deepEqual(C.searchTasks(state,{query:'قديمة'}).map(t=>t.id),[12]);
 assert.deepEqual(C.calendarTasks(state,'2026-10-21').map(t=>t.id),[40]);
 assert.deepEqual(state,before);assert.equal(Object.hasOwn(state.tasksList[1],'date'),false);
});

test('date sorting tolerates malformed legacy display dates but never repairs stored records',()=>{
 const state={cfg:{unknown:'keep'},tasksList:[
  {id:30,title:'Later',date:'2026-10-22',done:false},
  {id:31,title:'Same date second',date:'2026-10-19',done:false},
  {id:19,title:'No date',done:false},
  {id:18,title:'Null date',date:null,done:false},
  {id:17,title:'Malformed date',date:'not-a-date',done:false},
  {id:16,title:'Wrong legacy type',date:123,done:false},
  {id:15,title:'Impossible calendar date',date:'2026-02-30',done:false},
  {id:29,title:'Same date first',date:'2026-10-19',done:false}].map(t=>({...t,extra:{value:'preserve'}}))};
 const before=JSON.parse(JSON.stringify(state));
 assert.deepEqual(C.searchTasks(state).map(t=>t.id),[15,16,17,18,19,29,31,30]);
 assert.deepEqual(C.searchTasks(state,{query:'date'}).map(t=>t.id),[15,17,18,19,29,31]);
 assert.deepEqual(state,before);assert.equal(typeof state.tasksList.find(t=>t.id===16).date,'number');
});


test('DF05 manual daily top-three survives reload without changing task records or legacy cfg',()=>{
 const snapshot={cfg:{taskProjectsV21:[],unknown:{preserve:'مصدر ٣'}},tasksList:[
  {id:1,title:'A',date:'2026-10-25',done:false,catKey:'study',opaque:{keep:1}},
  {id:2,title:'B',done:false,catKey:'sport',unknown:'x'},
  {id:3,title:'C',date:'2026-11-20',done:false},
  {id:4,title:'D',done:false}
 ]};
 const baseline=JSON.parse(JSON.stringify(snapshot));
 const selected=C.chooseTopThree(snapshot,'2026-10-26',[2,1,3]);
 assert.deepEqual(C.topThree(JSON.parse(JSON.stringify(selected)),'2026-10-26').map(x=>x.id),[2,1,3]);
 assert.deepEqual(snapshot,baseline,'never write on read or mutate source');
 assert.deepEqual(selected.tasksList,baseline.tasksList);
 assert.deepEqual(selected.cfg.unknown,baseline.cfg.unknown);
 assert.equal(selected.cfg.taskTopThreeV21['2026-10-27'],undefined);
 assert.deepEqual(C.topThree(selected,'2026-10-27').map(x=>x.id),C.topThree(snapshot,'2026-10-27').map(x=>x.id));
 assert.deepEqual(C.topThree(C.chooseTopThree(selected,'2026-10-26',[]),'2026-10-26'),[]);
});
test('DF05 rejects duplicate, fourth, deleted, completed and malformed top-three without writes',()=>{
 const state={cfg:{keep:123},tasksList:[
  {id:1,title:'Active',done:false},{id:2,title:'Done',done:true},
  {id:3,title:'Trash',done:false,deletedAt:'2026-10-24'},
  {id:4,title:'Archived',done:false,status:'archived'}
 ]};
 const before=JSON.stringify(state);
 for(const ids of [[1,1],[1,2],[3],[4],[1,2,3,4],['1'],[-1]]){
  assert.throws(()=>C.chooseTopThree(state,'2026-10-26',ids));
 }
 assert.throws(()=>C.chooseTopThree(state,'2026-02-30',[1]));
 assert.equal(JSON.stringify(state),before);
 const chosen=C.chooseTopThree(state,'2026-10-26',[1]);
 chosen.tasksList[0].done=true;
 assert.deepEqual(C.topThree(chosen,'2026-10-26'),[],'completed task is hidden without rewriting historic picks');
});
