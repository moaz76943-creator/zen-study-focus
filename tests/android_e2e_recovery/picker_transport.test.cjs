'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('tests/android_e2e_recovery/p0_timer_saf_android.cjs','utf8').split('\nmain().catch')[0];
function context(){
 const child=require('node:child_process');
 const load=name=>name==='node:child_process'?{...child,execFileSync:(cmd,args,opts)=>cmd==='adb'?'':child.execFileSync(cmd,args,opts)}:require(name);
 const ctx={require:load,console,process:{env:{GITHUB_SHA:'a'.repeat(40)}},setTimeout:fn=>{fn();return 0;},clearTimeout,URL};
 vm.createContext(ctx);vm.runInContext(source,ctx);return ctx;
}
test('report identifies checked-out source rather than GitHub synthetic merge SHA',()=>{
 const ctx=context();
 assert.equal(vm.runInContext('report.sha',ctx),require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim());
});
test('DocumentsUI grid selection uses visible List view before opening the exact fixture',async()=>{
 const ctx=context();
 vm.runInContext(`
 let state='grid';
 const title='<node package="com.google.android.documentsui" text="p0-saf-restore.txt" resource-id="android:id/title" clickable="false" enabled="true" bounds="[195,1139][478,1190]"/>';
 const list='<node package="com.google.android.documentsui" content-desc="List view" clickable="true" enabled="true" bounds="[890,499][1017,625]"/>';
 stageImportFixtureInMediaStore=()=>{}; evaluate=async()=>true; saveSafPickerEvidence=()=>{};
 dumpUI=()=>state==='app'?'<node package="com.zenstudy.focus"/>':title+(state==='grid'?list:'');
 nativeUI=async(label,match)=>{const xml=dumpUI();return {xml,item:match(xml)};};
 tapUI=node=>{if(node.includes('content-desc="List view"'))state='list';else if(state==='list'&&node.includes('text="p0-saf-restore.txt"'))state='app';};
 `,ctx);
 // Grid taps only focus the item in the captured failing Android evidence.
 // Reject the old Enter fallback too, without executing a local adb command.
 await vm.runInContext("openDocument('p0-saf-restore.txt','ZEN21::test')",ctx);
 assert.equal(vm.runInContext('state',ctx),'app');
});
