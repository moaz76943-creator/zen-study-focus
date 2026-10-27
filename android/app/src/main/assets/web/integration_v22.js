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
  const pendingExports = new Map();
  let exportSerial = Date.now();
  root.DFRecoveryNativeExportResult = function(requestId,status) {
    const pending=pendingExports.get(requestId);
    if(!pending)return;
    pendingExports.delete(requestId);
    pending(status==='saved'?'saved':status==='cancelled'?'cancelled':'failed');
  };
  function saveCsvThroughAndroid(csv) {
    if(typeof root.ZenNative?.exportAnalyticsCsvToFile!=='function')
      return Promise.resolve({status:'failed'});
    return new Promise(resolve=>{
      const requestId='df-csv-'+(++exportSerial);
      const expiry=root.setTimeout(()=>{
        if(pendingExports.delete(requestId))resolve({status:'failed'});
      },120000);
      pendingExports.set(requestId,status=>{root.clearTimeout(expiry);resolve({status});});
      try{root.ZenNative.exportAnalyticsCsvToFile(csv,requestId);}
      catch(_){root.DFRecoveryNativeExportResult(requestId,'failed');}
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
  function rejectNewDuplicateIds(before, after) {
    for (const field of ['tasksList','notesList']) {
      const previous = new Map(), next = new Map();
      for (const row of before[field]) previous.set(row.id,(previous.get(row.id)||0)+1);
      for (const row of after[field]) {
        const count = (next.get(row.id)||0)+1;
        next.set(row.id,count);
        // Preserve legacy duplicate records verbatim, but never create or
        // increase ambiguity during an edit/import. No IDs are coerced.
        if (count>1 && count>(previous.get(row.id)||0))
          throw new Error('Record validation failed: DUPLICATE_ID');
      }
    }
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
    rejectNewDuplicateIds(before,after);
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
    let nativeCommitted = false;
    try {
      for (const [key,value] of Object.entries(expected)) storage.setItem(key,value);
      for (const [key,value] of Object.entries(expected))
        if (storage.getItem(key) !== value) throw new Error('Storage verification failed: ' + key);
      journal.state = 'committed';
      storage.setItem(D.JOURNAL_KEY,JSON.stringify(journal));
      // Browser readback is not fsync. Require the native six-packet receipt.
      if (root.ZenNative && (!root.DF22Preflight || !root.DF22Preflight.nativeAcknowledge(storage)))
        throw new Error('NATIVE_DURABLE_ACK_FAILED');
      nativeCommitted = !!root.ZenNative;
    } catch (e) {
      const failed = rollback(storage,original);
      if (failed.length) throw new Error('Storage interrupted; recovery journal retained: ' + failed.join('; '));
      try {storage.removeItem(D.JOURNAL_KEY);}
      catch (cleanup) { throw new Error('Rollback succeeded but recovery journal remains: ' + cleanup.message); }
      throw e;
    }
    try {
      storage.removeItem(D.JOURNAL_KEY);
      if (storage.getItem(D.JOURNAL_KEY)!==null) throw new Error('Journal cleanup not verified');
    } catch (e) {
      if (!nativeCommitted) throw new Error('Commit complete, journal cleanup pending. Reload after explicit recovery: ' + e.message);
      // Native ACK is irrevocably committed. Reporting rejection here would
      // resurrect a supposedly refused edit at startup. Publish success and
      // retain the journal for verified native replay/cleanup on reopening.
    }
    // Publish after verified packets and either journal cleanup or native ACK.
    cfg = after.cfg;tasksList = after.tasksList;notesList = after.notesList;
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
    if (!root.DeepFocusAnalyticsStudioV21) throw new Error('Analytics Studio not loaded');
    // Preserve unsaved viewing preferences during an in-app language switch.
    // This does not change any v21 data or native file-export contract.
    const filters=analyticsUi?.getFilters?.()||{};
    if (analyticsUi) analyticsUi.destroy();
    const host = document.getElementById('df22AnalyticsHost');
    analyticsUi = root.DeepFocusAnalyticsStudioV21.mount(host,getSnapshot,{
      ...filters,locale:cfg.lang,goals:cfg.dailyGoalsMin||{},
      onOpenTask:id=>{
        if(!Number.isSafeInteger(id)||id<0)return false;
        const snapshot=getSnapshot();
        const rows=Array.isArray(snapshot.tasksList)?snapshot.tasksList:[];
        const matches=rows.filter(t=>t&&t.id===id);
        if(matches.length!==1||matches[0].archived===true||
           matches[0].status==='archived'||matches[0].isStarter===true||
           matches[0].isDemo===true||matches[0].synthetic===true)return false;
        switchTab('sec-tasks',document.getElementById('navTasks'));
        return true;
      },
      ...(typeof root.ZenNative?.exportAnalyticsCsvToFile==='function'
        ? {onExport:saveCsvThroughAndroid}:{}),
    });
    document.getElementById('sec-analytics').classList.add('df22-analytics-live');
  }
  function refreshLocale() {
    if (!mounted) return;
    if (root.DF22Locale) root.DF22Locale.apply(document,cfg.lang);
    if (cfg.lang !== lastLocale) {
      lastLocale = cfg.lang;
      mountTasks();mountAnalytics();
      if (root.DeepFocusNotesEditorUI) root.DeepFocusNotesEditorUI.renderStack();
    }
  }
  function onTab(section) {
    if (!mounted) return;
    if (section === 'sec-tasks' && tasksUi) tasksUi.refresh();
    if (section === 'sec-analytics' && analyticsUi) analyticsUi.refresh();
    if (section === 'sec-notes' && root.DeepFocusNotesEditorUI) root.DeepFocusNotesEditorUI.renderStack();
  }
  function onSessionRecorded() {
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
    mountTasks();mountAnalytics();
    mounted=true;lastLocale=cfg.lang;
    document.body.classList.add('df-v22');
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
  return Object.freeze({install,write,getSnapshot,onTab,onSessionRecorded,refreshLocale,saveCsvThroughAndroid});
});
