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
test('configured persistent probe supplies native XML without one-shot UiAutomation',()=>{
 const ctx=context();
 ctx.process.env.DF13_UI_PORT='38383';
 const calls=[];
 ctx.probeExec=(cmd,args)=>{calls.push([cmd,args]);return JSON.stringify({xml:'<hierarchy><node package="com.google.android.documentsui"/></hierarchy>'});};
 vm.runInContext('cp.execFileSync=probeExec',ctx);
 assert.match(vm.runInContext('dumpUI()',ctx),/documentsui/);
 assert.equal(calls.length,1);
 assert.equal(calls[0][0],'python3');
});
test('broken configured probe fails closed without a one-shot fallback',()=>{
 const ctx=context();ctx.process.env.DF13_UI_PORT='38383';
 const calls=[];ctx.probeExec=(cmd)=>{calls.push(cmd);return '{"error":"root unavailable"}';};
 vm.runInContext('cp.execFileSync=probeExec',ctx);
 assert.throws(()=>vm.runInContext('dumpUI()',ctx),/TRANSPORT:/);
 assert.deepEqual(calls,['python3']);
});
test('clickable native picker controls use revalidated accessibility actions without coordinate replay',()=>{
 const ctx=context();ctx.process.env.DF13_UI_PORT='38383';
 const calls=[];ctx.probeExec=(cmd,args)=>{calls.push([cmd,args]);return '{"clicked":true}';};
 vm.runInContext('cp.execFileSync=probeExec',ctx);
 vm.runInContext(`tapUI('<node class="android.widget.TextView" content-desc="List view" clickable="true" bounds="[890,499][1017,625]"/>')`,ctx);
 assert.equal(calls.length,1);assert.equal(calls[0][0],'python3');
 calls.length=0;ctx.probeExec=cmd=>{calls.push(cmd);return '{"clicked":false}';};
 vm.runInContext('cp.execFileSync=probeExec',ctx);
 assert.throws(()=>vm.runInContext(`tapUI('<node class="android.widget.TextView" content-desc="List view" clickable="true" bounds="[890,499][1017,625]"/>')`,ctx),/TRANSPORT:/);
 assert.deepEqual(calls,['python3']);
});
test('DocumentsUI fixture titles request a genuine finger gesture instead of UNKNOWN shell input',()=>{
 const ctx=context();ctx.process.env.DF13_UI_PORT='38383';
 const calls=[];ctx.probeExec=(cmd,args)=>{calls.push([cmd,args]);return '{"touched":true}';};
 vm.runInContext('cp.execFileSync=probeExec',ctx);
 vm.runInContext(`tapUI('<node class="android.widget.TextView" resource-id="android:id/title" text="p0-saf-consent.txt" clickable="false" bounds="[189,559][531,616]"/>')`,ctx);
 assert.equal(calls.length,1);assert.equal(calls[0][0],'python3');assert.equal(calls[0][1].at(-1),'--finger');
});
test('rollback injection targets canonical keys from the live compatibility engine',async()=>{
 const ctx=context();
 ctx.canonical=['zen_fortress_cfg_v21','zen_fortress_tasks_v21','zen_fortress_notes_v21'];
 vm.runInContext(`
 const names=[];
 requireEmulator=()=>{};connect=async()=>{};fixture=async()=>({});
 evaluate=async expr=>expr==='Object.values(DeepFocusDataCompatV21.KEYS)'?canonical:'unused';
 run=async(name,fn)=>{names.push(name);report.results.push({status:'PASS'});};
 `,ctx);
 await vm.runInContext('safMain()',ctx);
 const names=vm.runInContext('names',ctx);
 for(const key of ctx.canonical){
  assert.ok(names.includes('failed_save_rollback_'+key));
  assert.ok(names.includes('failed_save_rollback_'+key+'_mirror'));
 }
});
test('SAF consent matches actual app-owned restore message despite default WebView dialog title',async()=>{
 const ctx=context();
 ctx.dialog=`<hierarchy><node class="android.widget.FrameLayout" package="com.zenstudy.focus"><node text='The page at "file://" says:' resource-id="android:id/alertTitle"/><node class="android.widget.TextView" package="com.zenstudy.focus" resource-id="android:id/message" text="Restore this backup? Current tasks, notes and progress will be replaced. Export them first."/><node class="android.widget.Button" package="com.zenstudy.focus" resource-id="android:id/button2" text="CANCEL" clickable="true" enabled="true" bounds="[608,1244][810,1386]"/><node class="android.widget.Button" package="com.zenstudy.focus" resource-id="android:id/button1" text="OK" clickable="true" enabled="true" bounds="[810,1244][978,1386]"/></node></hierarchy>`;
 vm.runInContext(`
 const tapped=[];
 nativeUI=async(label,match)=>{const item=match(dialog);if(!item)throw Error('consent not matched');return {xml:dialog,item};};
 tapUI=node=>tapped.push(node);saveSafPickerEvidence=()=>{};
 `,ctx);
 await vm.runInContext('confirmDialog(false)',ctx);
 assert.match(vm.runInContext('tapped[0]',ctx),/button2/);
 await vm.runInContext('confirmDialog(true)',ctx);
 assert.match(vm.runInContext('tapped[1]',ctx),/button1/);
 ctx.dialog=ctx.dialog.replace('Restore this backup?','Delete all data?');
 await assert.rejects(vm.runInContext('confirmDialog(true)',ctx),/consent not matched/);
 assert.equal(vm.runInContext('tapped.length',ctx),2);
});
test('native rejection evidence requires a confirmed event-buffer reset and a framed event reply',()=>{
 const ctx=context();ctx.process.env.DF13_UI_PORT='38383';
 const calls=[];ctx.probeExec=(cmd,args)=>{calls.push(args.at(-1));return args.at(-1)==='--events-clear'?'{"cleared":true}':'{"events":[{"kind":"backup_read_rejected","event_time_ms":1234}]}';};
 vm.runInContext('cp.execFileSync=probeExec',ctx);
 vm.runInContext('readNativeEvents(true)',ctx);
 assert.equal(vm.runInContext('readNativeEvents()[0].kind',ctx),'backup_read_rejected');
 assert.deepEqual(calls,['--events-clear','--events']);
 ctx.probeExec=()=>'{"error":"not supported"}';vm.runInContext('cp.execFileSync=probeExec',ctx);
 assert.throws(()=>vm.runInContext('readNativeEvents()',ctx),/TRANSPORT:/);
});
test('bootstrap failure leaves every unattempted durability case explicitly NOT_TESTED',()=>{
 const ctx=context();
 vm.runInContext(`report.results.push({name:'bootstrap',status:'NOT_TESTED',detail:'transport blocked'});fillUnattempted();`,ctx);
 const results=vm.runInContext('report.results',ctx);
 assert.equal(results.length,25);assert.ok(results.every(r=>r.status==='NOT_TESTED'));
 assert.ok(results.some(r=>r.name==='saf_actual_file_restore_ack_and_reopen'));
 assert.ok(results.some(r=>r.name==='native_ack_io_failure_rollback_restart'));
});
