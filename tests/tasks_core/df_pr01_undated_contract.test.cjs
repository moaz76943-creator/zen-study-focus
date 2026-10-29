'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../../android/app/src/main/assets/web/tasks_core_v21.js');
const seed=()=>({cfg:{unknownCfg:'keep'},tasksList:[
 {id:42,title:'Undated legacy',done:false,unknown:{keep:'عربي ٣'}},
 {id:43,title:'Past but optional',date:'2026-10-01',dueAssigned:false,done:false},
 {id:44,title:'Multiweek repeat',date:'2026-10-20',done:false,repeat:{frequency:'weekly',interval:3,until:'2026-12-30'}}
]});
const options={now:'2026-10-26T10:00:00Z',idSeed:98765};
test('new tasks without explicit date never become overdue just because creation happened today',()=>{
 const x=C.createTask(seed(),{title:'New undated'},options).task;
 assert.equal(x.dueAssigned,false);
 assert.equal(C.isOverdue(x,'2026-10-30'),false);
 assert.equal(x.id,98765);
});
test('creating with explicit deadline marks dueAssigned true',()=>{
 const x=C.createTask(seed(),{title:'Has deadline',date:'2026-10-25'},options).task;
 assert.equal(x.dueAssigned,true);
 assert.equal(C.isOverdue(x,'2026-10-26'),true);
});
test('existing imported no-date task title edit preserves absent optional date and arbitrary extension',()=>{
 const state=seed(),before=state.tasksList[0];
 const after=C.updateTask(state,42,{title:'Edited title'},options).task;
 assert.equal(Object.hasOwn(after,'date'),false);
 assert.equal(Object.hasOwn(after,'dueAssigned'),false);
 assert.deepEqual(after.unknown,before.unknown);
 assert.equal(before.title,'Undated legacy');
});
test('old optional due date can be disabled without deleting original date',()=>{
 const after=C.updateTask(seed(),43,{dueAssigned:false,title:'Still optional'},options).task;
 assert.equal(after.date,'2026-10-01');
 assert.equal(after.dueAssigned,false);
 assert.equal(C.isOverdue(after,'2026-10-26'),false);
});
test('explicitly choosing a due date re-enables dueAssigned after legacy optionality',()=>{
 const after=C.updateTask(seed(),43,{date:'2026-10-22'},options).task;
 assert.equal(after.dueAssigned,true);
 assert.equal(C.isOverdue(after,'2026-10-26'),true);
});
test('editing title never rewrites multiweek recurrence or unknown cfg',()=>{
 const base=seed();
 const x=C.updateTask(base,44,{title:'Renamed recurrence'},options);
 assert.deepEqual(x.task.repeat,base.tasksList[2].repeat);
 assert.equal(x.state.cfg.unknownCfg,'keep');
});
