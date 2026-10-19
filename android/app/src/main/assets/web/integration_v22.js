/* Deep Focus v22 shared integration: modules are opt-in and legacy v21 IDs remain authoritative.
 * A verified multi-family write is required before publishing any changed in-memory state.
 */
(function (root, factory) {
  'use strict';
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DF22Integration = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';
  const D = root.DeepFocusDataCompatV21;
  const FAMILIES = [['cfg','cfg'],['tasks','tasksList'],['notes','notesList']];
  let tasksUi = null, analyticsUi = null, lastLocale = null, mounted = false;
  let alertEngine = null, alertPicker = null, alertConfigRef = null;
  const pendingExports = new Map();
  let exportSerial = 0;
  root.DFRecoveryNativeExportResult = function(requestId, status) {
    const pending=pendingExports.get(requestId);
    if(!pending)return;
    pendingExports.delete(requestId);
    pending(status==='saved'?'saved':status==='cancelled'?'cancelled':'failed');
  };
  function saveCsvThroughAndroid({csv}) {
    if(!root.ZenNative || typeof root.ZenNative.exportAnalyticsCsvToFile!=='function')
      return Promise.resolve({status:'failed'});
    return new Promise(resolve=>{
      const requestId='df-csv-'+(++exportSerial);
      const expiry=root.setTimeout(()=>{
        if(pendingExports.has(requestId)){
          pendingExports.delete(requestId);resolve({status:'failed'});
        }
      },120000);
      pendingExports.set(requestId,status=>{root.clearTimeout(expiry);resolve({status});});
      try{root.ZenNative.exportAnalyticsCsvToFile(csv,requestId);}
      catch(_){root.DFRecoveryNativeExportResult(requestId,'failed');}
    });
  }
  function mountAlertPicker() {
    if(!root.DeepFocusCompletionAlerts)return;
    if(alertConfigRef!==cfg){
      if(alertPicker){alertPicker.unmount();alertPicker=null;}
      if(alertEngine)alertEngine.dispose();
      alertConfigRef=cfg;
      alertEngine=root.DeepFocusCompletionAlerts.createCompletionAlerts(cfg,{
        persist:changed=>{
          const ok=saveFortressData('zen_fortress_cfg_v21',changed)===true;
          if(ok && root.ZenNative && typeof root.ZenNative.configureCompletionAlert==='function'){
            const state=root.DeepFocusCompletionAlerts.readCompletionAlertSettings(changed);
            try{root.ZenNative.configureCompletionAlert(state.sound,state.volume,state.enabled);}catch(_){}
          }
          return ok;
        },
        canOutput:()=>document.visibilityState!=='hidden',
        onError:()=>notify('Completion audio not available')
      });
      root.DFRecoveryCompletion=alertEngine;
      if(root.ZenNative && typeof root.ZenNative.configureCompletionAlert==='function'){
        const state=alertEngine.getSettings();
        try{root.ZenNative.configureCompletionAlert(state.sound,state.volume,state.enabled);}catch(_){}
      }
    }
    if(alertPicker)alertPicker.unmount();
    const host=document.getElementById('completionAlertPickerHost');
    if(host)alertPicker=root.DeepFocusCompletionAlerts.mountCompletionAlertPicker(host,alertEngine,{
      translate:(_key,fallback)=>fallback
    });
  }
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function equal(a,b) { return JSON.stringify(a) === JSON.stringify(b); }
  function current() { return copy({cfg,tasksList,notesList}); }
  function getSnapshot() { return current(); }
  function validate(snapshot) {
    if (!D) throw new Error('Data compatibility engine not available');
    const check = D.inspectRecords(snapshot);
    if (!check.ok) throw new Error('Record validation failed: ' + check.issues.filter(x => x.severity === 'error').map(x => x.code).join(','));
  }
  function rawFor(storage) { return D.captureRaw(storage); }
  function rollback(storage, original) {
    const errors = [];
    for (const [key, old] of Object.entries(original)) {
      try {
        if (storage.getItem(key) === old) continue;
        if (old === null) storage.removeItem(key);
        else storage.setItem(key, old);
      } catch (e) { errors.push(key + ': ' + e.message); }
    }
    for (const [key, old] of Object.entries(original)) {
      try { if (storage.getItem(key) !== old) errors.push(key + ': mismatch'); }
      catch (e) { errors.push(key + ': ' + e.message); }
    }
    return errors;
  }
  function comparable(slot,records) {
    if (slot === 'cfg' || !Array.isArray(records)) return records;
    return records.map(row => {
      if (!row || row.isStarter !== true) return row;
      const value = {...row,title:'__translated-starter__'};
      // Legacy applyLanguage renders built-in samples in memory without saving.
      if (slot === 'notes') value.body = '__translated-starter__';
      return value;
    });
  }
  function verifySource(storage,original,before) {
    for (const [slot,field] of FAMILIES) {
      const key = D.KEYS[slot];
      const first = D.inspectPacket(original[key]);
      const mirror = D.inspectPacket(original[key + '_mirror']);
      if (!first.ok && !mirror.ok) {
        if (original[key] !== null || original[key + '_mirror'] !== null)
          throw new Error('Both storage copies are damaged: ' + key);
      } else {
        if (!equal(comparable(slot,(first.ok ? first : mirror).value),comparable(slot,before[field])))
          throw new Error('Stored ' + field + ' changed; reload before saving');
      }
      // The user-visible in-memory defaults are only used if BOTH copies are absent.
    }
  }
  function write(before,after) {
    const storage = root.localStorage;
    if (!storage || !D) throw new Error('Secure storage unavailable');
    if (D.inspectPending(storage).pending) throw new Error('Unresolved recovery journal');
    validate(before);validate(after);
    if (!equal(current(),before)) throw new Error('Application state changed during edit');
    if (equal(before,after)) return true;
    const original = rawFor(storage);
    verifySource(storage,original,before);
    const expected = {};
    for (const [slot,field] of FAMILIES) {
      const key = D.KEYS[slot], packet = D.encodePacket(after[field]);
      expected[key] = packet;
      expected[key + '_mirror'] = packet;
    }
    // Same wire format and recovery semantics as lane 01's inspected v21 journal.
    const journal = {version:1,state:'pending',original,expected};
    storage.setItem(D.JOURNAL_KEY,JSON.stringify(journal));
    try {
      for (const [key,value] of Object.entries(expected)) storage.setItem(key,value);
      for (const [key,value] of Object.entries(expected))
        if (storage.getItem(key) !== value) throw new Error('Storage verification failed: ' + key);
      journal.state = 'committed';
      storage.setItem(D.JOURNAL_KEY,JSON.stringify(journal));
    } catch (e) {
      const failed = rollback(storage,original);
      if (failed.length) throw new Error('Storage interrupted; recovery journal retained: ' + failed.join('; '));
      try {storage.removeItem(D.JOURNAL_KEY);}
      catch (cleanup) { throw new Error('Rollback succeeded but recovery journal remains: ' + cleanup.message); }
      throw e;
    }
    try { storage.removeItem(D.JOURNAL_KEY); }
    catch (e) { throw new Error('Commit complete, journal cleanup pending. Reload after explicit recovery: ' + e.message); }
    // Publish only after ALL six packets verify AND the journal is cleared.
    cfg = after.cfg;tasksList = after.tasksList;notesList = after.notesList;
    if(mounted)mountAlertPicker();
    return true;
  }
  function fromNoteEdit(before,after,allowTaskChange) {
    const active = current();
    if (!equal(before.notesList,active.notesList) || !equal(before.tasksList,active.tasksList))
      throw new Error('Notes or tasks changed while editor was open');
    if (!allowTaskChange && !equal(after.tasksList,active.tasksList))
      throw new Error('Non-atomic task mutation blocked');
    if (!Array.isArray(after.notesList) || !Array.isArray(after.tasksList))
      throw new Error('Invalid editor snapshot');
    return write(active,{...active,notesList:after.notesList,tasksList:allowTaskChange?after.tasksList:active.tasksList});
  }
  function fromTaskEdit(before,after) {
    const active = current();
    if (!equal(before.cfg,active.cfg) || !equal(before.tasksList,active.tasksList))
      throw new Error('Timer or tasks changed while task editor was open');
    return write(active,{...active,cfg:after.cfg,tasksList:after.tasksList});
  }
  function notify(message) { if (typeof showToast === 'function') showToast(message); }
  function onChanged() {
    if (typeof renderTasksList === 'function') renderTasksList();
    if (typeof renderCalendar === 'function') renderCalendar();
    if (typeof renderNotesStack === 'function') renderNotesStack();
    if (analyticsUi) analyticsUi.refresh();
  }
  function notesAdapter() {
    return {
      readState:() => { const x = current();return {notesList:x.notesList,tasksList:x.tasksList}; },
      nextNumericId:() => nextRecordId(),
      now:() => Date.now(), locale:() => cfg.lang, notify,
      commitNotes:(before,after) => fromNoteEdit(before,after,false),
      commitBoth:(before,after) => fromNoteEdit(before,after,true),
      onSaved:onChanged,onRefresh:onChanged,
      confirmPermanentDelete:() => ({
        confirmed:root.confirm('Permanently delete this note? This cannot be undone.'),
        backupAcknowledged:root.confirm('Have you exported a verified backup of your notes? Choose Cancel if not.')
      }),
      confirmTaskExtraction:(id,note) => root.confirm('Extract unfinished checklist items from "' + note.title + '" as new tasks?'),
      openCalendarForNote:() => switchTab('sec-calendar',document.getElementById('navCalendar'))
    };
  }
  function mountTasks() {
    if (!root.DeepFocusTasksStudioV21) throw new Error('Tasks Studio not loaded');
    if (tasksUi) tasksUi.destroy();
    const host = document.getElementById('df22TasksHost');
    tasksUi = root.DeepFocusTasksStudioV21.mount(host, {
      readState:() => {const x=current();return {cfg:x.cfg,tasksList:x.tasksList};},
      commit:fromTaskEdit,locale:cfg.lang,now:()=>new Date(),
      noteIds:() => notesList.map(n=>n.id),
      requestText:label => root.prompt(label),
      linkTaskToTimer:id => {
        if (typeof focusWorkflowLinkTask !== 'function' || !focusWorkflowLinkTask(id)) return false;
        focusOnTask(id);return true;
      },
      onAfterChange:onChanged
    });
    document.getElementById('sec-tasks').classList.add('df22-tasks-live');
  }
  function mountAnalytics() {
    if(analyticsUi)analyticsUi.destroy();
    const host=document.getElementById('df22AnalyticsHost');
    const arAnalytics=cfg.lang==='ar' && root.DeepFocusAnalyticsArabic &&
      typeof root.DeepFocusAnalyticsArabic.translate==='function';
    if(root.DeepFocusAnalyticsRecoveryUI && (cfg.lang==='en' || arAnalytics)) {
      // Use the complete Arabic locale for the new studio. Other locales retain
      // the prior studio until every label is translated; never fall back to English.
      analyticsUi=root.DeepFocusAnalyticsRecoveryUI.mount(host,getSnapshot,{
        locale:cfg.lang,
        ...(arAnalytics?{translate:root.DeepFocusAnalyticsArabic.translate}:{}),
        ...(root.ZenNative&&typeof root.ZenNative.exportAnalyticsCsvToFile==='function'?{saveCSV:saveCsvThroughAndroid}:{})
      });
    } else {
      analyticsUi=root.DeepFocusAnalyticsStudioV21.mount(host,getSnapshot,{
        locale:cfg.lang,goals:cfg.dailyGoalsMin||{}
      });
    }
    document.getElementById('sec-analytics').classList.add('df22-analytics-live');
  }
  function refreshLocale() {
    if (!mounted) return;
    if (root.DF22Locale) root.DF22Locale.apply(document,cfg.lang);
    if (cfg.lang !== lastLocale) {
      lastLocale = cfg.lang;
      mountTasks();mountAnalytics();mountAlertPicker();
      if (root.DeepFocusNotesEditorUI) root.DeepFocusNotesEditorUI.renderStack();
    }
  }
  function onTab(section) {
    if (!mounted) return;
    if(alertConfigRef!==cfg)mountAlertPicker();
    if (section === 'sec-tasks' && tasksUi) tasksUi.refresh();
    if (section === 'sec-analytics' && analyticsUi) analyticsUi.refresh();
    if (section === 'sec-notes' && root.DeepFocusNotesEditorUI) root.DeepFocusNotesEditorUI.renderStack();
  }
  function onSessionRecorded() {
    if(alertConfigRef!==cfg)mountAlertPicker();
    if (analyticsUi) analyticsUi.refresh();
    if (tasksUi) tasksUi.refresh();
  }
  function install() {
    if (mounted) return true;
    if (!D || !root.DeepFocusNotesCoreV21 || !root.DeepFocusNotesEditorUI ||
        !root.DeepFocusTasksStudioV21 || !root.DeepFocusAnalyticsStudioV21 ||
        !root.DF22Locale) throw new Error('Incomplete v22 integration dependencies');
    // Fail closed if any interrupted write or unusable legacy packet exists.
    if (!root.DF22Preflight || !root.DF22Preflight.inspect(root.localStorage).ok)
      throw new Error('Storage recovery is required before enabling v22');
    root.DeepFocusNotesEditorUI.install(notesAdapter());
    mountTasks();mountAnalytics();mountAlertPicker();
    mounted=true;lastLocale=cfg.lang;
    document.body.classList.add('df-v22','df-recovery10');
    if(root.DFInteractionRecovery06)root.DFInteractionRecovery06.disableDeadAnalyticsCards(document);
    if(root.DeepFocusAsciiNumeralsV21)root.DeepFocusAsciiNumeralsV21.wireNumericInputs(document);
    root.DF22Locale.apply(document,cfg.lang);
    if (root.DeepFocusSoundMixer) {
      root.focusSoundMixer = root.DeepFocusSoundMixer.createSoundMixer({
        catalog:SOUNDS_DATA,isPlaying:id=>Boolean(activePlayers[id]),
        start:id=>{if (!activePlayers[id]) toggleSoundTile(id);},
        stop:id=>stopSoundTile(id),setVolume:(id,value)=>setTileVolume(id,value)
      });
    }
    return true;
  }
  if (typeof document !== 'undefined' && typeof cfg !== 'undefined') {
    try {install();}
    catch (e) {
      // Display a visible non-success state: do not auto-write or migrate user data.
      try {notify('⚠️ Advanced features unavailable: ' + e.message);} catch (_) {}
    }
  }
  return Object.freeze({install,write,getSnapshot,onTab,onSessionRecorded,refreshLocale});
});
