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
 assert.equal(results.length,30);assert.ok(results.every(r=>r.status==='NOT_TESTED'));
 assert.ok(results.some(r=>r.name==='saf_actual_file_restore_ack_and_reopen'));
 assert.ok(results.some(r=>r.name==='native_ack_io_failure_rollback_restart'));
});
test('each completed Android case checkpoints a full report without advancing unattempted cases',async()=>{
 const os=require('node:os'),path=require('node:path');
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'df-native-checkpoint-')),file=path.join(directory,'results.json');
 try{
  const ctx=context();ctx.process.argv=['node','qa',file];ctx.console={log(){}};
  await vm.runInContext("run('saf_fixture_and_native_ack',async()=> 'source checkpoint fixture')",ctx);
  const data=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.equal(data.results.find(row=>row.name==='saf_fixture_and_native_ack').status,'PASS');
  assert.equal(data.results.length,29);assert.equal(data.counts.NOT_TESTED,28);
  assert.equal(vm.runInContext('report.results.length',ctx),1);
 }finally{if(fs.existsSync(file))fs.unlinkSync(file);if(fs.existsSync(file+'.tmp'))fs.unlinkSync(file+'.tmp');fs.rmdirSync(directory);}
});

test('emulator optional animation settings do not abort v21 SAF device acceptance',()=>{
 const workflow=fs.readFileSync('.github/workflows/df_parallel01_current_native_android.yml','utf8');
 // The emulator runner executes animation setting shell commands before our tests.
 // On unstable API30/35 ADB, that auxiliary command can fail before the app launches.
 assert.match(workflow,/disable-animations: false/);
 assert.doesNotMatch(workflow,/disable-animations: true/);
 assert.match(workflow,/script: bash tests\/android_e2e_recovery\/p0_timer_saf_ci\.sh/);
});

test('SAF export remains NOT_TESTED unless real provider bytes match the generated v21 code', async()=>{
 const ctx=context();
 vm.runInContext(`
   const evidence=[];
   let matchBytes=false;
   snapshot=async()=>({task:{id:71001}});
   receipt=async()=>({valid:true,bytes:500});
   evaluate=async expr=>{
     if(expr==='generateEncryptedBackupCode()')return 'ZEN21::signed-original';
     if(expr.includes('downloadEncryptedBackupFile'))return true;
     return true;
   };
   nativeUI=async(label,match)=>{
     const xml='<node package="com.google.android.documentsui" class="android.widget.Button" enabled="true" text="SAVE" resource-id="com.google.android.documentsui:id/action_menu_save" bounds="[1,1][10,10]"/>';
     const item=match(xml);if(!item)throw Error('native Save control not observed');
     return {xml,item};
   };
   tapUI=node=>evidence.push('native-save-tapped');
   waitForSavedBackup=async code=>{
     evidence.push('read-provider-bytes:'+code);
     if(!matchBytes)throw Error('TRANSPORT: no matching actual provider bytes');
     return 'MediaStore selected document';
   };
   dumpUI=()=>'<node package="com.zenstudy.focus"/>';
 `,ctx);
 await assert.rejects(vm.runInContext('safExportAndReadback()',ctx),/TRANSPORT: no matching actual provider bytes/);
 assert.deepEqual(Array.from(vm.runInContext('evidence',ctx)),['native-save-tapped','read-provider-bytes:ZEN21::signed-original']);
 vm.runInContext('matchBytes=true',ctx);
 const result=await vm.runInContext('safExportAndReadback()',ctx);
 assert.match(result,/independently matching ZEN21/);
});

test('SAF export is scheduled as real Android evidence, never inferred from picker visibility',()=>{
 const ctx=context();
 vm.runInContext("report.results.push({name:'bootstrap',status:'NOT_TESTED'});fillUnattempted();",ctx);
 const row=vm.runInContext("report.results.find(x=>x.name==='saf_document_save_and_readback')",ctx);
 assert.equal(row.status,'NOT_TESTED');
});

test('five v21 edits require five real ACK receipts before one process kill',async()=>{
 const ctx=context();
 vm.runInContext(`
   let seq=0, restartCount=0, rejectOn=3;
   write=async expression=>{
     const match=expression.match(/after\\.cfg\\.df07Seq=(\\d+)/);
     if(!match)throw Error('missing sequence write');
     seq=Number(match[1]);return true;
   };
   receipt=async()=>({valid:seq!==rejectOn});
   fixture=async()=>({seq,task:{id:71001},note:{id:71002}});
   restart=async()=>{restartCount++;};
 `,ctx);
 await assert.rejects(vm.runInContext('fiveRapidAcksThenKill()',ctx),/ACK every edit 3/);
 assert.equal(vm.runInContext('restartCount',ctx),0,'Never kill process after a failed ACK');
 vm.runInContext('seq=0;rejectOn=0',ctx);
 const detail=await vm.runInContext('fiveRapidAcksThenKill()',ctx);
 assert.match(detail,/Five consecutive/);
 assert.equal(vm.runInContext('seq',ctx),5);
 assert.equal(vm.runInContext('restartCount',ctx),1);
});

test('five ACK / force-stop remains explicitly NOT_TESTED on device bootstrap failure',()=>{
 const ctx=context();
 vm.runInContext("report.results.push({name:'bootstrap',status:'NOT_TESTED'});fillUnattempted();",ctx);
 const row=vm.runInContext("report.results.find(x=>x.name==='five_acks_one_immediate_kill')",ctx);
 assert.equal(row.status,'NOT_TESTED');
});

test('only read-only ADB operations retry after a bounded offline reconnect',()=>{
 const ctx=context();
 vm.runInContext(`
   const adbCommands=[];let reads=0;
   cp.execFileSync=(cmd,args)=>{
     if(cmd!=='adb')throw Error('unexpected command');
     adbCommands.push(args.join(' '));
     if(args[0]==='reconnect')return '';
     if(reads++===0)throw Object.assign(Error('temporary ADB offline'),{code:'ETIMEDOUT'});
     return '1';
   };
 `,ctx);
 assert.equal(vm.runInContext("adb('shell','getprop','ro.kernel.qemu')",ctx),'1');
 assert.equal(vm.runInContext('adbCommands.length',ctx),3);
 assert.match(vm.runInContext('adbCommands[1]',ctx),/^reconnect offline$/);
 assert.match(vm.runInContext('adbCommands[2]',ctx),/shell getprop ro.kernel.qemu/);
});

test('ADB transport must never retry an input tap or a save/force-stop mutation',()=>{
 const ctx=context();
 vm.runInContext(`
   const adbCommands=[];
   cp.execFileSync=(cmd,args)=>{adbCommands.push(args.join(' '));throw Object.assign(Error('ADB offline'),{code:'ETIMEDOUT'});};
 `,ctx);
 assert.throws(()=>vm.runInContext("adb('shell','input','tap','15','25')",ctx),/TRANSPORT: Android ADB/);
 assert.equal(vm.runInContext('adbCommands.length',ctx),1);
 assert.throws(()=>vm.runInContext("adb('shell','am','force-stop','com.zenstudy.focus')",ctx),/TRANSPORT: Android ADB/);
 assert.equal(vm.runInContext('adbCommands.length',ctx),2);
});

test('permanent read-only ADB loss stays NOT_TESTED without infinite retries',()=>{
 const ctx=context();
 vm.runInContext(`
   const adbCommands=[];
   cp.execFileSync=(cmd,args)=>{adbCommands.push(args.join(' '));throw Object.assign(Error('device disappeared'),{code:'ETIMEDOUT'});};
 `,ctx);
 assert.throws(()=>vm.runInContext("adb('shell','getprop','sys.boot_completed')",ctx),/TRANSPORT: Android ADB/);
 assert.equal(vm.runInContext('adbCommands.filter(x=>x.includes("shell getprop")).length',ctx),3);
 assert.equal(vm.runInContext('adbCommands.filter(x=>x==="reconnect offline").length',ctx),2);
});

test('legacy invalid-family and double-corruption cases remain NOT_TESTED until real Android evidence',()=>{
 const ctx=context();
 vm.runInContext("report.results.push({name:'bootstrap',status:'NOT_TESTED'});fillUnattempted()",ctx);
 for(const name of ['signed_invalid_family_native_ack_refused','both_webview_copies_corrupt_native_replay']){
  assert.equal(vm.runInContext("report.results.find(r=>r.name==="+JSON.stringify(name)+").status",ctx),'NOT_TESTED');
 }
});

test('native invalid-family probe rejects a signed-invalid ACK, rather than accepting a checksum',async()=>{
 const ctx=context();
 vm.runInContext(`
   fixture=async()=>({task:{id:71001}});
   restart=async()=>{};
   evaluate=async expr=>{
     if(expr==='ZenNative.readDurableV21()')return 'durable-original';
     return {checksumValid:true,blocked:false,issues:[],ack:true,checkpoint:'durable-original'};
   };
 `,ctx);
 await assert.rejects(vm.runInContext('rejectSignedInvalidFamilyOnAndroid()',ctx),/Signed malformed family must be blocked/);
});

test('Activity recreation is NOT a PASS when the same WebView global survives',async()=>{
 const ctx=context();
 vm.runInContext(`
  adb=(...args)=>args.includes('pidof')?'123':'';
  fixture=async()=>({task:{id:71001},note:{id:71002}});
  evaluate=async expr=>expr.includes('=')?true:'unchanged-global';
  connect=async()=>{};
  ws={close(){}};
 `,ctx);
 await assert.rejects(vm.runInContext('activityDestroyRecreateOnDevice()',ctx),/Activity not recreated/);
});

test('Activity recreate is listed as NOT_TESTED unless real same-process proof runs',()=>{
 const ctx=context();
 vm.runInContext("report.results.push({name:'bootstrap',status:'NOT_TESTED'});fillUnattempted()",ctx);
 assert.equal(vm.runInContext("report.results.find(r=>r.name==='activity_destroy_recreate').status",ctx),'NOT_TESTED');
});

test('emulator bootstrap reconnects only for read-only installed APK identity checks',()=>{
 const shell=fs.readFileSync('tests/android_e2e_recovery/p0_timer_saf_ci.sh','utf8');
 assert.match(shell,/readonly_adb_installed_path\(\)/);
 assert.match(shell,/readonly_adb_pull_installed_apk\(\)/);
 assert.match(shell,/adb reconnect offline/);
 assert.match(shell,/readonly_adb_installed_path/);
 assert.match(shell,/readonly_adb_pull_installed_apk/);
 assert.match(shell,/if timeout 60s adb pull [^\n]+ && test -s [^\n]+; then/,'An empty or truncated adb pull must never be accepted');
 assert.equal((shell.match(/^adb install /gm)||[]).length,2,'Never retry a state-changing APK install');
 assert.match(shell,/sha256sum "\$report\/installed-base\.apk"/);
 assert.match(shell,/sha256sum "\$report\/tested-debug\.apk"/);
});

test('cold WebView CDP timeout retries only readiness observations, without replaying app mutations',async()=>{
 const ctx=context();
 vm.runInContext(`
 let coldAttempts=0, mutations=0;
 connect=async()=>{coldAttempts++;if(coldAttempts<3)throw Error('TRANSPORT: CDP Runtime.evaluate timeout');};
 `,ctx);
 await vm.runInContext('connectWhenReady()',ctx);
 assert.equal(vm.runInContext('coldAttempts',ctx),3);
 assert.equal(vm.runInContext('mutations',ctx),0);
});
test('persistent CDP readiness failure stays NOT_TESTED after bounded retries',async()=>{
 const ctx=context();
 vm.runInContext(`
 let coldAttempts=0;
 connect=async()=>{coldAttempts++;throw Error('TRANSPORT: emulator device offline');};
 `,ctx);
 await assert.rejects(vm.runInContext('connectWhenReady()',ctx),/TRANSPORT: CDP startup unreachable after three read-only attempts/);
 assert.equal(vm.runInContext('coldAttempts',ctx),3);
});
test('real app evaluation exception is not retried as a transport fault',async()=>{
 const ctx=context();
 vm.runInContext(`
 let coldAttempts=0;
 connect=async()=>{coldAttempts++;throw Error('APP_EVALUATION: broken app logic');};
 `,ctx);
 await assert.rejects(vm.runInContext('connectWhenReady()',ctx),/APP_EVALUATION:/);
 assert.equal(vm.runInContext('coldAttempts',ctx),1);
});
