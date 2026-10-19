/* Deep Focus v21 integration coordinator. No new user-data source of truth.
   All domain models still live in cfg, tasksList and notesList. */
(function(root){
'use strict';
const guard=root.DeepFocusV21StorageGuard;
const compat=root.DeepFocusDataCompatV21;
if(!guard||!compat)throw new Error('Missing persistence dependencies');
const clone=x=>JSON.parse(JSON.stringify(x));
const canonical={notes:'zen_fortress_notes_v21',tasks:'zen_fortress_tasks_v21',cfg:'zen_fortress_cfg_v21'};
const state=()=>({cfg:clone(cfg),tasksList:clone(tasksList),notesList:clone(notesList)});
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function commit(before,after,requested){
 if(guard.blocked)throw new Error('STORAGE_RECOVERY_REQUIRED');
 if(!same(before.notesList,notesList)||!same(before.tasksList,tasksList)||
    (requested.includes('cfg')&&!same(before.cfg,cfg)))throw new Error('STALE_IN_MEMORY_STATE');
 const snapshot={cfg:requested.includes('cfg')?after.cfg:cfg,
  tasksList:requested.includes('tasks')?after.tasksList:tasksList,
  notesList:requested.includes('notes')?after.notesList:notesList};
 const check=compat.inspectRecords(snapshot);
 if(!check.ok)throw new Error('INVALID_V21_DATA: '+check.issues.filter(x=>x.severity==='error').map(x=>x.code).join(','));
 const values={}, originals={};
 for(const slot of requested){
  const name=slot==='notes'?'notesList':slot==='tasks'?'tasksList':'cfg';
  if(!same(before[name],after[name])){
   values[canonical[slot]]=snapshot[name];originals[canonical[slot]]=before[name];
  }
 }
 if(!Object.keys(values).length)return true;
 // Durable primary+mirror acknowledgement precedes publishing any in-memory edit.
 guard.writeCanonical(values,originals);
 if('notes'in requested||requested.includes('notes'))notesList=snapshot.notesList;
 if(requested.includes('tasks'))tasksList=snapshot.tasksList;
 if(requested.includes('cfg'))cfg=snapshot.cfg;
 return true;
}
const report=msg=>{try{showToast(String(msg).slice(0,240));}catch(e){root.alert?.(msg);}};
function renderConsumers(){
 try{renderCalendar();}catch(e){report('Calendar: '+e.message);}
 try{renderTodayPlan();}catch(e){}
 if(root.DFIntegrated?.tasksStudio)root.DFIntegrated.tasksStudio.refresh();
 if(root.DFIntegrated?.analyticsStudio)root.DFIntegrated.analyticsStudio.refresh();
 if(typeof renderDailyGoals==='function')renderDailyGoals();
 if(typeof renderAnalyticsBars==='function')renderAnalyticsBars();
}
const bundle={tasksStudio:null,analyticsStudio:null,notesController:null,linkedTaskId:null,soundMixer:null};
root.DFIntegrated=bundle;
function allocId(){
 const id=nextRecordId();
 if(!Number.isSafeInteger(id)||id<0)throw new Error('INVALID_NUMERIC_ID');
 return id;
}
function installNotes(){
 if(!root.DeepFocusNotesEditorUI||!root.DeepFocusNotesCoreV21)throw new Error('NOTES_ENGINE_NOT_LOADED');
 const adapter={
  readState:()=>({notesList:clone(notesList),tasksList:clone(tasksList)}),
  nextNumericId:allocId,now:()=>Date.now(),locale:()=>cfg.lang,
  notify:report,
  commitNotes:(before,after)=>commit({...state(),notesList:before.notesList,tasksList:before.tasksList},
      {...state(),notesList:after.notesList},['notes']),
  commitBoth:(before,after)=>commit({...state(),notesList:before.notesList,tasksList:before.tasksList},
      {...state(),notesList:after.notesList,tasksList:after.tasksList},['notes','tasks']),
  onSaved:renderConsumers,onRefresh:renderConsumers,
  confirmPermanentDelete:()=>({confirmed:false,backupAcknowledged:false}),
  confirmTaskExtraction:(id)=>root.confirm?.((cfg.lang==='ar'?'إنشاء مهام من عناصر التحقق في الملاحظة رقم ':'Create tasks from note #')+id)===true,
  pickNoteLinkTarget:(_id,notes)=>{
   const raw=root.prompt?.(cfg.lang==='ar'?'اكتب رقم الملاحظة المراد ربطها':'Enter numeric note ID');
   if(raw===null||raw===undefined)return null;
   const n=Number(raw);return /^\d+$/.test(String(raw))&&Number.isSafeInteger(n)&&notes.some(x=>x.id===n)?n:null;
  },
  pickTaskLinkTarget:(_id,tasks)=>{
   const raw=root.prompt?.(cfg.lang==='ar'?'اكتب رقم المهمة المراد ربطها':'Enter numeric task ID');
   if(raw===null||raw===undefined)return null;
   const n=Number(raw);return /^\d+$/.test(String(raw))&&Number.isSafeInteger(n)&&tasks.some(x=>x.id===n)?n:null;
  },
  openCalendarForNote:id=>{const note=notesList.find(n=>n.id===id);if(note?.calDate)selectedCalDate=note.calDate;switchTab('sec-calendar',document.getElementById('navCalendar'));renderCalendar();}
 };
 bundle.notesController=root.DeepFocusNotesEditorUI.install(adapter);
}
function installTasks(){
 const box=document.getElementById('tasksShowcaseBox');
 if(!box||!root.DeepFocusTasksStudioV21)return;
 // Keep existing legacy task controls as fallback if the advanced studio fails.
 const staging=document.createElement('div');staging.id='dfTasksStudioMount';
 box.parentNode.insertBefore(staging,box);
 const adapter={
  readState:state,locale:cfg.lang,now:()=>Date.now(),
  noteIds:()=>notesList.map(n=>n.id),
  commit:(before,after)=>commit(before,after,['tasks','cfg']),
  linkTaskToTimer:id=>{
   const task=tasksList.find(t=>t.id===id);
   if(!task||task.isStarter)return false;
   return focusOnTask(id)===true;
  },
  onAfterChange:()=>{renderTodayPlan();renderCalendar();renderAnalyticsBars();bundle.analyticsStudio?.refresh();},
  onError:e=>report('Tasks: '+e.message),
  requestText:title=>root.prompt?.(title)||null
 };
 const mounted=root.DeepFocusTasksStudioV21.mount(staging,adapter);
 bundle.tasksStudio=mounted;
 box.hidden=true;
}
function installAnalytics(){
 const screen=document.getElementById('sec-analytics');
 if(!screen||!root.DeepFocusAnalyticsStudioV21)return;
 const mount=document.createElement('div');mount.id='dfAnalyticsStudioMount';
 screen.appendChild(mount);
 bundle.analyticsStudio=root.DeepFocusAnalyticsStudioV21.mount(mount,state,{locale:cfg.lang,
  onExport:(value,name)=>{
   if(root.ZenNative?.saveTextFile){root.ZenNative.saveTextFile(name,value);return;}
   try{
    const blob=new Blob(['\uFEFF',value],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
   }catch(e){report('Export unavailable on this device');}
  }});
}
function installSounds(){
 if(!root.DeepFocusSoundMixer||typeof SOUNDS_DATA==='undefined')return;
 bundle.soundMixer=root.DeepFocusSoundMixer.createSoundMixer({
  catalog:SOUNDS_DATA,isPlaying:id=>Boolean(activePlayers[id]),
  start:id=>toggleSoundTile(id),stop:id=>stopSoundTile(id),setVolume:(id,v)=>setTileVolume(id,v)
 });
 root.focusSoundMixer=bundle.soundMixer;
}
function switchLocale(){
 try{root.DF22Locale?.apply(document,cfg.lang);}catch(e){report('Translation: '+e.message);}
 if(bundle.tasksStudio){
  // Rebuild localized task controls, re-reading existing data; never alter records for locale.
  bundle.tasksStudio.destroy();bundle.tasksStudio=null;
  document.getElementById('dfTasksStudioMount')?.remove();
  installTasks();
 }
 if(bundle.analyticsStudio){
  bundle.analyticsStudio.destroy();bundle.analyticsStudio=null;
  document.getElementById('dfAnalyticsStudioMount')?.remove();
  installAnalytics();
 }
}
function onTab(id){
 if(id==='sec-analytics'){bundle.analyticsStudio?.refresh();}
 if(id==='sec-tasks'){bundle.tasksStudio?.refresh();}
 if(id==='sec-notes'&&bundle.notesController)root.DeepFocusNotesEditorUI.renderStack();
}
function prepare(){
 if(guard.blocked){report('Storage recovery must be completed before editing.');return false;}
 if(!document.getElementById('sec-notes')?.ownerDocument)return false;
 document.body.classList.add('df-v22','df-integrated');
 installNotes();installTasks();installAnalytics();installSounds();switchLocale();
 root.DeepFocusNotesEditorUI.renderStack();
 return true;
}
try{prepare();}
catch(e){document.body.classList.remove('df-integrated');report('Integration needs review: '+e.message);}
root.DFIntegrated.onTab=onTab;
root.DFIntegrated.switchLocale=switchLocale;
})(window);
