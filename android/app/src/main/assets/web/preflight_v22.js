/* Startup preflight only repairs v21 packets from a verified, fsynced native receipt. */
(function (root, factory) {
  'use strict';
  const api = factory(typeof module === 'object' && module.exports
    ? require('./data_compat_v21.js') : root.DeepFocusDataCompatV21,root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DF22Preflight = api;
})(typeof window !== 'undefined' ? window : globalThis, function (D,root) {
  'use strict';
  if (!D) throw new Error('Data compatibility contract must load before v22 preflight');

  const nativeKeys = Object.values(D.KEYS).flatMap(k=>[k,k+'_mirror']);
  function validNativePackets(packets) {
    if (!packets || typeof packets !== 'object' || Array.isArray(packets) ||
        Object.keys(packets).length!==nativeKeys.length) return false;
    for (const key of nativeKeys) {
      if (!Object.prototype.hasOwnProperty.call(packets,key)) return false;
      if (packets[key]!==null && !D.inspectPacket(packets[key]).ok) return false;
    }
    for (const key of Object.values(D.KEYS)) {
      const a=packets[key],b=packets[key+'_mirror'];
      if ((a===null)!==(b===null)) return false;
      if (a!==null && D.inspectPacket(a).payload!==D.inspectPacket(b).payload) return false;
    }
    return true;
  }
  // Android bridge returns only after AtomicFile + fsync. Browser tests use
  // their established localStorage semantics without the Android-only bridge.
  function nativeAcknowledge(storage) {
    if (!root.ZenNative) return true;
    if (typeof root.ZenNative.acknowledgeDurableV21!=='function') return false;
    try {
      const packets=D.captureRaw(storage);
      return validNativePackets(packets) &&
        root.ZenNative.acknowledgeDurableV21(JSON.stringify({version:1,packets}))===true;
    } catch (_) { return false; }
  }
  function replayNative(storage) {
    if (!root.ZenNative) return;
    if (typeof root.ZenNative.readDurableV21!=='function' ||
        typeof root.ZenNative.acknowledgeDurableV21!=='function')
      throw new Error('Native durable storage bridge unavailable');
    const raw=root.ZenNative.readDurableV21();
    if (raw==='NONE') return; // Existing v21 install: first successful write seeds checkpoint.
    if (typeof raw!=='string' || raw==='ERROR') throw new Error('Native checkpoint unreadable');
    const checkpoint=JSON.parse(raw);
    if (checkpoint.version!==1 || !validNativePackets(checkpoint.packets))
      throw new Error('Native checkpoint invalid; existing records retained');
    const pending=D.inspectPending(storage);
    if (pending.pending) {
      if (!pending.valid) throw new Error('Unverifiable journal: manual recovery required');
      for (const key of nativeKeys) {
        const journal=pending.journal;
        if (checkpoint.packets[key]!==journal.original[key] &&
            checkpoint.packets[key]!==journal.expected[key])
          throw new Error('Native/WebView journal conflict: '+key);
      }
    }
    for (const key of nativeKeys) {
      const expected=checkpoint.packets[key];
      if (storage.getItem(key)===expected) continue;
      if (expected===null) storage.removeItem(key);
      else storage.setItem(key,expected);
      if (storage.getItem(key)!==expected) throw new Error('Native replay verification failed: '+key);
    }
    if (pending.pending) {
      storage.removeItem(D.JOURNAL_KEY);
      if (storage.getItem(D.JOURNAL_KEY)!==null) throw new Error('Journal cleanup failed');
    }
  }
  function inspect(storage) {
    const pending = D.inspectPending(storage);
    if (pending.pending) return {ok:false, kind:'journal', detail:pending};
    const issues = [];
    for (const key of Object.values(D.KEYS)) {
      const primaryRaw = storage.getItem(key);
      const mirrorRaw = storage.getItem(key + '_mirror');
      if (primaryRaw === null && mirrorRaw === null) continue; // untouched fresh install
      if (!D.inspectPacket(primaryRaw).ok && !D.inspectPacket(mirrorRaw).ok)
        issues.push(key + ': neither copy verifies');
    }
    return {ok:!issues.length,kind:issues.length?'data':'ready',issues};
  }
  function renderBlocked(document, storage, result) {
    if (!document || !document.body || document.getElementById('df22-startup-block')) return;
    const box = document.createElement('section');
    box.id = 'df22-startup-block';
    box.setAttribute('role','alertdialog');
    box.setAttribute('aria-modal','true');
    box.style.cssText = 'position:fixed;inset:0;z-index:2147483647;overflow:auto;background:#fff;color:#17253e;padding:28px;font:16px/1.6 sans-serif';
    const heading = document.createElement('h1');
    heading.textContent = 'Deep Focus — data protection';
    const info = document.createElement('p');
    info.textContent = result.kind === 'journal'
      ? 'An interrupted data operation needs explicit recovery before Deep Focus can open. No data was changed.'
      : 'Saved data could not be verified. Deep Focus is paused to prevent accidental replacement. Do not clear app data.';
    box.appendChild(heading);box.appendChild(info);
    if (result.kind === 'journal' && result.detail.valid) {
      const btn = document.createElement('button');
      btn.type = 'button';btn.textContent = 'Review and recover previous data';
      btn.addEventListener('click', () => {
        if (!window.confirm('Recover the interrupted operation using its saved journal? Changes made by the interrupted operation may be rolled back.')) return;
        try {
          D.recoverPending(storage,{approved:true});
          window.location.reload();
        } catch (e) { info.textContent = 'Recovery was not completed: ' + e.message + '. Keep your data and request support.'; }
      });
      box.appendChild(btn);
    }
    document.body.appendChild(box);
  }
  function allowApp(storage,document) {
    let report;
    try { replayNative(storage); report = inspect(storage); }
    catch (e) { report = {ok:false,kind:'data',issues:[String(e)]}; }
    if (!report.ok) renderBlocked(document,storage,report);
    return report.ok;
  }
  return Object.freeze({inspect,allowApp,nativeAcknowledge,replayNative});
});
