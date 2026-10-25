'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../../android/app/src/main/assets/web/quick_training.js'),'utf8');

function fixture(){
 const nodes=new Map();
 function node(){return {
   textContent:'',style:{},children:[],appendChild(child){this.children.push(child);return child;},
   setAttribute(name,value){this[name]=value;},className:''
 };}
 for(const id of ['todayPlanPreview','todayPlanRatio','todayPlanPercent','todayPlanFill'])
   nodes.set(id,node());
 const document={
  getElementById:id=>nodes.get(id)||null,
  createElement:()=>node()
 };
 const task={id:72,date:'2026-10-26',isStarter:false,done:false,
    title:'خطة ۲۰۲۶ - المرحلة ٢',time:'۹:۳۰',catKey:'study'};
 const toWest=v=>String(v)
   .replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))
   .replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
 const context=vm.createContext({
  cfg:{lang:'ar'},document,tasksList:[task],
  localDateISO:()=>task.date,toWest,
  getCatLabel:()=> 'دراسة'
 });
 vm.runInContext(source,context,{filename:'quick_training.js'});
 return {context,nodes,task};
}

test('home preview retains user-authored digits and original time in text and accessible labels',()=>{
 const {context,nodes,task}=fixture();
 vm.runInContext('renderTodayPlan()',context);
 const card=nodes.get('todayPlanPreview').children[0];
 const completion=card.children[0];
 const focus=card.children[1];
 const name=focus.children[0];
 const details=focus.children[1];
 assert.equal(name.textContent,task.title,'display must not normalize user-authored title');
 assert.ok(completion['aria-label'].includes(task.title),'completion a11y label must retain original title');
 assert.ok(focus['aria-label'].includes(task.title),'focus a11y label must retain original title');
 assert.ok(details.textContent.includes(task.time),'task time must stay as entered');
 assert.equal(nodes.get('todayPlanRatio').textContent,'0/1','generated counters stay 0-9');
 assert.equal(nodes.get('todayPlanPercent').textContent,'0%');
 assert.equal(task.title,'خطة ۲۰۲۶ - المرحلة ٢','task identity and underlying text unchanged');
});

test('home preview still excludes starter demo tasks and formats generated counters',()=>{
 const {context,nodes}=fixture();
 vm.runInContext('tasksList.push({id:73,date:"2026-10-26",isStarter:true,done:true,title:"Demo"})',context);
 vm.runInContext('renderTodayPlan()',context);
 assert.equal(nodes.get('todayPlanRatio').textContent,'0/1');
 assert.equal(nodes.get('todayPlanPreview').children.length,1);
});
