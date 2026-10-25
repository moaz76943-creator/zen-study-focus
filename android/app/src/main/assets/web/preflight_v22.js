/* Deep Focus v22 read-only startup preflight. Never mutates app data on load. */
(function (root, factory) {
  'use strict';
  const api = factory(typeof module === 'object' && module.exports
    ? require('./data_compat_v21.js') : root.DeepFocusDataCompatV21);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DF22Preflight = api;
})(typeof window !== 'undefined' ? window : globalThis, function (D) {
  'use strict';
  if (!D) throw new Error('Data compatibility contract must load before v22 preflight');
  // A matching packet checksum does not prove that the decoded v21 data has
  // the right shape. Read primary/mirror without altering either copy.
  function inspect(storage) {
    const pending = D.inspectPending(storage);
    if (pending.pending) return {ok:false, kind:'journal', detail:pending};
    const snapshot = {cfg:{}, tasksList:[], notesList:[]};
    const issues = [];
    for (const [slot, key] of Object.entries(D.KEYS)) {
      const primaryRaw = storage.getItem(key);
      const mirrorRaw = storage.getItem(key + '_mirror');
      if (primaryRaw === null && mirrorRaw === null) continue; // untouched install
      const primary = D.inspectPacket(primaryRaw);
      const mirror = D.inspectPacket(mirrorRaw);
      if (!primary.ok && !mirror.ok) {
        issues.push(key + ': neither copy verifies');
        continue;
      }
      const target = slot === 'cfg' ? 'cfg' : slot === 'tasks' ? 'tasksList' : 'notesList';
      snapshot[target] = (primary.ok ? primary : mirror).value;
    }
    // Preserve historical nonfatal warnings and unknown fields; refuse only
    // schema errors, so malformed signed data cannot reach startup code.
    for (const finding of D.inspectRecords(snapshot).issues) {
      if (finding.severity === 'error') issues.push(finding.path + ': ' + finding.code);
    }
    return {ok:issues.length === 0, kind:issues.length ? 'data' : 'ready', issues};
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
    try { report = inspect(storage); }
    catch (e) { report = {ok:false,kind:'data',issues:[String(e)]}; }
    if (!report.ok) renderBlocked(document,storage,report);
    return report.ok;
  }
  return Object.freeze({inspect,allowApp});
});
