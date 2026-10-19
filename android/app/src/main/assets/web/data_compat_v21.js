/* Deep Focus v21 persistence compatibility; opt-in, standalone and never auto-runs.
 * Existing app.js / backup implementations remain authoritative until lane 00 integrates.
 * FNV+salt is an accidental-corruption check, NOT encryption or authentication.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DeepFocusDataCompatV21 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const KEYS = Object.freeze({
    cfg: 'zen_fortress_cfg_v21',
    tasks: 'zen_fortress_tasks_v21',
    notes: 'zen_fortress_notes_v21'
  });
  const JOURNAL_KEY = 'deep_focus_data_compat_v21_journal_v1';
  const STORAGE_KEYS = Object.freeze(Object.values(KEYS).flatMap(k => [k, k + '_mirror']));
  const SECRET_SALT = 'ZEN_FORTRESS_V21_99812';
  const MAX_BACKUP_CHARS = 14000000;
  const own = (x, k) => Object.prototype.hasOwnProperty.call(x, k);
  const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x) &&
    (Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === null);
  const jsonCopy = x => JSON.parse(JSON.stringify(x));
  const issue = (severity, code, path, detail) => ({severity, code, path, detail});
  const noErrors = items => !items.some(i => i.severity === 'error');

  // Exact v21 compatibility with computeHash in app.js (UTF-16 code units).
  function computeHash(str) {
    let h = 2166136261;
    const s = str + SECRET_SALT;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return (h >>> 0).toString(16);
  }

  function encodePacket(value, ts = Date.now()) {
    const payload = JSON.stringify(value);
    if (typeof payload !== 'string') throw new Error('Not JSON-serializable');
    return JSON.stringify({payload, sig:computeHash(payload), ts});
  }

  function inspectRecords(snapshot) {
    const problems = [];
    if (!plain(snapshot)) return {ok:false, issues:[issue('error','INVALID_ROOT','root','Expected object')]};
    if (!plain(snapshot.cfg)) problems.push(issue('error','INVALID_CFG','cfg','Expected object'));
    if (!Array.isArray(snapshot.tasksList) || snapshot.tasksList.length > 10000)
      problems.push(issue('error','INVALID_TASKS','tasksList','Expected array of at most 10000'));
    if (!Array.isArray(snapshot.notesList) || snapshot.notesList.length > 10000)
      problems.push(issue('error','INVALID_NOTES','notesList','Expected array of at most 10000'));
    if (plain(snapshot.cfg)) {
      const history = snapshot.cfg.sessionHistory;
      if (history !== undefined && (!Array.isArray(history) || history.length > 100000))
        problems.push(issue('error','INVALID_HISTORY','cfg.sessionHistory','Expected array of at most 100000'));
      else if (Array.isArray(history)) {
        const sessionsSeen = new Map();
        history.forEach((item, i) => {
          if (!plain(item)) {problems.push(issue('error','INVALID_SESSION',`cfg.sessionHistory[${i}]`,'Expected object'));return;}
          // Existing session IDs are opaque strings; do NOT turn these into record IDs.
          if (item.id !== undefined && item.id !== null) {
            const signature = typeof item.id + ':' + String(item.id);
            if (sessionsSeen.has(signature)) problems.push(issue('warning','DUPLICATE_SESSION',`cfg.sessionHistory[${i}].id`,
              `Same session ID as cfg.sessionHistory[${sessionsSeen.get(signature)}]; preserved`));
            else sessionsSeen.set(signature,i);
          }
        });
      }
    }
    for (const [name, records] of [['tasksList',snapshot.tasksList], ['notesList',snapshot.notesList]]) {
      if (!Array.isArray(records) || records.length > 10000) continue;
      const seen = new Map();
      records.forEach((row, i) => {
        const path = `${name}[${i}]`;
        if (!plain(row)) {problems.push(issue('error','INVALID_RECORD',path,'Expected object'));return;}
        if (!Number.isSafeInteger(row.id) || row.id < 0) {
          problems.push(issue('error','INCOMPATIBLE_RECORD_ID',path+'.id','Keep original numeric safe-integer ID type; task_*/note_* and numeric strings are unsupported'));
        } else if (seen.has(row.id)) {
          problems.push(issue('warning','DUPLICATE_ID',path+'.id',`Same ID as ${name}[${seen.get(row.id)}]; not removed`));
        } else seen.set(row.id, i);
        if (typeof row.title !== 'string' || row.title.length > 20000)
          problems.push(issue('error','INVALID_TITLE',path+'.title','Required string up to 20000 characters'));
        if (name === 'tasksList' && typeof row.done !== 'boolean')
          problems.push(issue('error','INVALID_DONE',path+'.done','Required boolean'));
        if (name === 'notesList' && (typeof row.body !== 'string' || row.body.length > 500000))
          problems.push(issue('error','INVALID_BODY',path+'.body','Required string up to 500000 characters'));
        for (const k of ['isStarter','pinned','favorite', ...(name === 'tasksList' ? ['done'] : ['blur'])])
          if (own(row,k) && typeof row[k] !== 'boolean')
            problems.push(issue('error','INVALID_FLAG',path+'.'+k,'Expected boolean; value not changed'));
        for (const k of ['catKey',name === 'tasksList' ? 'date':'calDate'])
          if (own(row,k) && typeof row[k] !== 'string')
            problems.push(issue('error','INVALID_TEXT_FIELD',path+'.'+k,'Expected string; value not changed'));
      });
    }
    try { JSON.stringify(snapshot); } catch (e) {
      problems.push(issue('error','UNSERIALIZABLE','root','Cannot safely serialize data'));
    }
    return {ok:noErrors(problems),issues:problems};
  }

  function inspectPacket(raw) {
    if (typeof raw !== 'string') return {ok:false,reason:'ABSENT'};
    try {
      const packet = JSON.parse(raw);
      if (!plain(packet) || typeof packet.payload !== 'string' ||
          typeof packet.sig !== 'string' || computeHash(packet.payload) !== packet.sig)
        return {ok:false,reason:'BAD_PACKET_OR_HASH'};
      return {ok:true,value:JSON.parse(packet.payload),payload:packet.payload};
    } catch (e) { return {ok:false,reason:'INVALID_JSON'}; }
  }

  function captureRaw(storage) {
    if (!storage || typeof storage.getItem !== 'function') throw new TypeError('Storage getItem required');
    const raw = {};
    for (const k of STORAGE_KEYS) raw[k] = storage.getItem(k);
    return raw;
  }

  // Pure read: never repairs mirrors, persists defaults or changes user data.
  function inspectStorage(storage) {
    const raw = captureRaw(storage), issues = [], sources = {}, snapshot = {};
    for (const [slot,key] of Object.entries(KEYS)) {
      const primary = inspectPacket(raw[key]), mirror = inspectPacket(raw[key+'_mirror']);
      if (!primary.ok && raw[key] !== null)
        issues.push(issue('warning','INVALID_PRIMARY',key,primary.reason));
      if (!mirror.ok && raw[key+'_mirror'] !== null)
        issues.push(issue('warning','INVALID_MIRROR',key+'_mirror',mirror.reason));
      if (!primary.ok && !mirror.ok) {
        issues.push(issue('error','UNRECOVERABLE_SLOT',key,'Neither primary nor mirror is valid; no defaults written'));
        sources[slot] = 'none';continue;
      }
      if (primary.ok && mirror.ok && primary.payload !== mirror.payload)
        issues.push(issue('warning','MIRROR_DIVERGED',key,'Both verify but differ; choosing original primary without overwriting either'));
      const chosen = primary.ok ? primary : mirror;
      sources[slot] = primary.ok ? 'primary':'mirror';
      snapshot[slot === 'cfg' ? 'cfg' : slot === 'tasks' ? 'tasksList' : 'notesList'] = chosen.value;
    }
    const report = inspectRecords(snapshot);
    return {ok:noErrors(issues) && report.ok,snapshot, sources, raw,
      issues:issues.concat(report.issues)};
  }

  function inspectBackup(code) {
    try {
      if (typeof code !== 'string' || !code.trim() || code.length > MAX_BACKUP_CHARS) throw new Error('Invalid backup size');
      const clean = code.trim(), body = clean.startsWith('ZEN21::') ? clean.slice(7).trim() : clean;
      if (!body || !/^[A-Za-z0-9+/]+={0,2}$/.test(body) || body.length % 4 !== 0)
        throw new Error('Malformed Base64');
      let binary;
      if (typeof atob === 'function') binary = atob(body);
      else if (typeof Buffer !== 'undefined') binary = Buffer.from(body,'base64').toString('binary');
      else throw new Error('No Base64 decoder');
      let decoded;
      if (typeof TextDecoder !== 'undefined') {
        const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
        decoded = new TextDecoder('utf-8',{fatal:true}).decode(bytes);
      } else decoded = decodeURIComponent(escape(binary));
      const packet = JSON.parse(decoded);
      if (!plain(packet) || typeof packet.bundle !== 'string' || typeof packet.sig !== 'string' ||
          computeHash(packet.bundle) !== packet.sig) throw new Error('Backup hash mismatch');
      const bundle = JSON.parse(packet.bundle);
      if (!plain(bundle) || bundle.v !== 21) throw new Error('Unsupported backup version');
      const snapshot = {cfg:bundle.cfg, tasksList:bundle.tasksList, notesList:bundle.notesList};
      const report = inspectRecords(snapshot);
      // Inspection of existing storage remains permissive and read-only. A new
      // backup import must not introduce ambiguous note/task identifiers.
      const issues = report.issues.map(item => item.code === 'DUPLICATE_ID'
        ? {...item, severity:'error'} : item);
      const ok = noErrors(issues);
      return {ok, snapshot:ok ? jsonCopy(snapshot) : null, issues};
    } catch (e) {return {ok:false,snapshot:null,issues:[issue('error','INVALID_BACKUP','backup',e.message)]};}
  }

  function checkedDefaults(defaults) {
    if (defaults === undefined) return {};
    if (!plain(defaults)) throw new TypeError('Additive defaults must be a plain object');
    for (const k of Object.keys(defaults))
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(k) || ['id','title','body','done','isStarter','date','calDate','catKey'].includes(k))
        throw new Error('Unsafe or historical field default: '+k);
    // Round-trip disallows undefined, cyclic and non-JSON additions.
    const cloned = jsonCopy(defaults);
    if (JSON.stringify(defaults) !== JSON.stringify(cloned)) throw new Error('Defaults must be JSON');
    return cloned;
  }

  function planMigration(snapshot, additions={}) {
    const report = inspectRecords(snapshot);
    if (!report.ok) throw new Error('Invalid source records: '+report.issues.filter(i=>i.severity==='error').map(i=>i.code).join(','));
    if (!plain(additions)) throw new TypeError('Additions must be object');
    for (const k of Object.keys(additions)) if (!['cfg','task','note','session'].includes(k)) throw new Error('Unknown additions section '+k);
    const defaults = Object.fromEntries(['cfg','task','note','session'].map(k=>[k,checkedDefaults(additions[k])]));
    const after = jsonCopy(snapshot), before=jsonCopy(snapshot);
    let changes = 0;
    const add = (object, values) => {
      for (const [k,v] of Object.entries(values)) if (!own(object,k)) {
        Object.defineProperty(object,k,{value:jsonCopy(v),writable:true,enumerable:true,configurable:true});
        changes++;
      }
    };
    add(after.cfg,defaults.cfg);
    after.tasksList.forEach(x=>add(x,defaults.task));
    after.notesList.forEach(x=>add(x,defaults.note));
    if (Array.isArray(after.cfg.sessionHistory)) after.cfg.sessionHistory.forEach(x=>add(x,defaults.session));
    const afterReport=inspectRecords(after);
    if (!afterReport.ok) throw new Error('Unsafe planned migration');
    return {kind:'additive-v21',before,after,changes,issues:report.issues,originalRaw:null};
  }

  function planMigrationFromStorage(storage, additions) {
    const report=inspectStorage(storage);
    if (!report.ok) throw new Error('Storage is not safely readable: '+report.issues.map(x=>x.code).join(','));
    const plan=planMigration(report.snapshot, additions);
    plan.originalRaw=report.raw;
    plan.issues=report.issues;
    return plan;
  }

  function planRestoreFromBackup(storage, code) {
    const existing=inspectStorage(storage);
    if (!existing.ok) throw new Error('Existing storage cannot be backed up safely');
    const incoming=inspectBackup(code);
    if (!incoming.ok) throw new Error('Backup rejected: '+incoming.issues.map(x=>x.code).join(','));
    return {kind:'restore-v21',before:jsonCopy(existing.snapshot),after:incoming.snapshot,
      changes:JSON.stringify(existing.snapshot)===JSON.stringify(incoming.snapshot)?0:1,
      issues:existing.issues.concat(incoming.issues), originalRaw:existing.raw};
  }

  function inspectPending(storage) {
    const raw = storage.getItem(JOURNAL_KEY);
    if (raw === null) return {pending:false};
    try {
      const j=JSON.parse(raw);
      if (!plain(j) || j.version !== 1 || !['pending','committed'].includes(j.state) ||
          !plain(j.original) || !plain(j.expected)) throw new Error('Invalid journal');
      for (const key of STORAGE_KEYS) if (!own(j.original,key) ||
          !(j.original[key]===null || typeof j.original[key]==='string') ||
          (own(j.expected,key) && typeof j.expected[key]!=='string')) throw new Error('Invalid journal keys');
      for (const key of Object.keys(j.expected)) if (!STORAGE_KEYS.includes(key)) throw new Error('Unexpected journal target');
      return {pending:true,valid:true,state:j.state,journal:j};
    } catch (e) {return {pending:true,valid:false,error:e.message};}
  }

  function restoreOriginal(storage, original) {
    const errors=[];
    for (const key of STORAGE_KEYS) {
      try {
        const old=original[key];
        if (storage.getItem(key) === old) continue;
        if (old===null) storage.removeItem(key);
        else storage.setItem(key,old);
      } catch (e) {errors.push(key+': '+e.message);}
    }
    for (const key of STORAGE_KEYS) {
      try {if (storage.getItem(key)!==original[key]) errors.push(key+': rollback verification failed');}
      catch(e){errors.push(key+': '+e.message);}
    }
    return errors;
  }

  // A caller must not turn an additive migration plan into a destructive rewrite.
  function assertAdditive(before, after) {
    const retained = (previous, next) => {
      if (!plain(previous) || !plain(next)) throw new Error('Additive plan dropped object');
      for (const k of Object.keys(previous))
        if (!own(next,k) || JSON.stringify(previous[k]) !== JSON.stringify(next[k]))
          throw new Error('Additive plan changed existing field: '+k);
    };
    retained(before.cfg, after.cfg);
    for (const [which] of [['tasksList'], ['notesList']]) {
      if (!Array.isArray(after[which]) || after[which].length !== before[which].length)
        throw new Error('Additive plan changed record count: '+which);
      before[which].forEach((record,i) => retained(record,after[which][i]));
    }
    const beforeSessions=before.cfg.sessionHistory, afterSessions=after.cfg.sessionHistory;
    if (Array.isArray(beforeSessions)) {
      if (!Array.isArray(afterSessions) || afterSessions.length!==beforeSessions.length)
        throw new Error('Additive plan changed session count');
      beforeSessions.forEach((record,i)=>retained(record,afterSessions[i]));
    }
  }

  function commitPlan(storage, plan, options={}) {
    if (!options || options.approved !== true) throw new Error('Explicit approval required');
    if (!plain(plan) || !['additive-v21','restore-v21'].includes(plan.kind) || !plain(plan.originalRaw))
      throw new Error('Only storage-bound plans can be committed');
    if (inspectPending(storage).pending) throw new Error('Unresolved migration journal; recover explicitly first');
    if (plan.changes===0) return {ok:true,changed:false};
    const source=inspectStorage(storage);
    if (!source.ok || JSON.stringify(source.snapshot)!==JSON.stringify(plan.before) ||
        STORAGE_KEYS.some(k=>source.raw[k]!==plan.originalRaw[k])) throw new Error('Storage changed since preview');
    const validation=inspectRecords(plan.after);
    if (plan.kind==='additive-v21') assertAdditive(plan.before,plan.after);
    if (!validation.ok) throw new Error('Planned records failed validation');
    const expected={};
    for (const [slot,k] of Object.entries(KEYS)) {
      const value=plan.after[slot==='cfg'?'cfg':slot==='tasks'?'tasksList':'notesList'];
      const packet=encodePacket(value);
      expected[k]=packet;expected[k+'_mirror']=packet;
    }
    const journal={version:1,state:'pending',original:jsonCopy(plan.originalRaw),expected};
    storage.setItem(JOURNAL_KEY,JSON.stringify(journal)); // durable write-ahead, before any user record
    try {
      for (const k of STORAGE_KEYS) storage.setItem(k,expected[k]);
      for (const k of STORAGE_KEYS) if (storage.getItem(k)!==expected[k]) throw new Error('Write verification failed: '+k);
      journal.state='committed';storage.setItem(JOURNAL_KEY,JSON.stringify(journal));
    } catch (e) {
      const rollbackErrors=restoreOriginal(storage,journal.original);
      if (!rollbackErrors.length) {
        try {storage.removeItem(JOURNAL_KEY);} catch (err) {throw new Error(e.message+'; journal cleanup failed: '+err.message);}
      } else throw new Error(e.message+'; rollback incomplete; recovery journal retained: '+rollbackErrors.join('; '));
      throw e;
    }
    try {storage.removeItem(JOURNAL_KEY);return {ok:true,changed:true};}
    catch (e) {return {ok:true,changed:true,cleanupPending:true};}
  }

  function recoverPending(storage, options={}) {
    if (!options || options.approved !== true) throw new Error('Explicit recovery approval required');
    const state=inspectPending(storage);
    if (!state.pending) return {ok:true,changed:false};
    if (!state.valid) throw new Error('Corrupt journal; manual recovery required');
    const j=state.journal;
    for (const key of STORAGE_KEYS) {
      const actual=storage.getItem(key);
      if (actual!==j.original[key] && actual!==j.expected[key])
        throw new Error('Unknown concurrent change at '+key+'; manual recovery required');
    }
    if (state.state==='committed') {
      if (STORAGE_KEYS.some(k=>storage.getItem(k)!==j.expected[k])) throw new Error('Committed state mismatch; manual recovery required');
      storage.removeItem(JOURNAL_KEY);return {ok:true,changed:false,finalized:true};
    }
    const errors=restoreOriginal(storage,j.original);
    if (errors.length) throw new Error('Recovery incomplete; journal retained: '+errors.join('; '));
    storage.removeItem(JOURNAL_KEY);
    return {ok:true,changed:true,rolledBack:true};
  }

  return Object.freeze({KEYS,JOURNAL_KEY,computeHash,encodePacket,inspectPacket,inspectRecords,
    captureRaw,inspectStorage,inspectBackup,planMigration,planMigrationFromStorage,
    planRestoreFromBackup,commitPlan,inspectPending,recoverPending});
});
