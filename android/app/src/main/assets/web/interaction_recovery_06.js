/* DF-070..084: opt-in interaction safety primitives. No side effects until integration. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DFInteractionRecovery06 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const messages = Object.freeze({
    en: Object.freeze({success:'Completed',failed:'Action failed. Try again.',cancelled:'Cancelled',busy:'Already processing'}),
    ar: Object.freeze({success:'اكتملت العملية',failed:'تعذرت العملية. حاول مرة أخرى.',cancelled:'أُلغيت العملية',busy:'العملية قيد التنفيذ'})
  });
  function language(lang) { return messages[String(lang||'en').split('-')[0]] || messages.en; }
  function createGate() {
    const pending = new Set();
    async function run(key, operation, verify) {
      if (!key || typeof operation !== 'function') return {status:'failed'};
      if (pending.has(key)) return {status:'busy'};
      pending.add(key);
      try {
        const result = await operation();
        if (result && typeof result === 'object' && (result.cancelled===true || result.status==='cancelled')) return {status:'cancelled'};
        const checked = typeof verify==='function' ? await verify(result) : (result===true || Boolean(result && result.ok===true));
        return {status:checked===true ? 'success':'failed'};
      } catch (_) { return {status:'failed'}; }
      finally { pending.delete(key); }
    }
    return Object.freeze({run,isPending:key=>pending.has(key)});
  }
  function createClipboardAction({clipboard,notify=()=>{},gate=createGate(),locale=()=> 'en'}={}) {
    return async function copy(text,key='clipboard') {
      const outcome=await gate.run(key,async()=>{
        if (!clipboard || typeof clipboard.writeText!=='function') return false;
        // Promise resolution is the platform acknowledgement, not the click itself.
        await clipboard.writeText(String(text));
        return true;
      });
      if (outcome.status!=='busy') notify({kind:outcome.status,text:language(locale())[outcome.status]});
      return outcome;
    };
  }
  function createNativeExportTracker({requestExport,notify=()=>{},locale=()=> 'en'}={}) {
    const pending=new Set();let sequence=0;
    function begin(payload) {
      if (typeof requestExport!=='function' || typeof payload!=='string' || !payload) return {status:'failed'};
      const id='df06-export-'+(++sequence);
      pending.add(id);
      try { requestExport(payload,id); return {status:'pending',id}; }
      catch (_) {pending.delete(id);notify({kind:'failed',text:language(locale()).failed});return {status:'failed'};}
    }
    function complete(id,result) {
      if (!pending.has(id)) return {status:'unknown'};
      pending.delete(id);
      const status=result==='success'?'success':result==='cancelled'?'cancelled':'failed';
      notify({kind:status,text:language(locale())[status]});
      return {status};
    }
    return Object.freeze({begin,complete,isPending:id=>pending.has(id)});
  }
  function createModalClose({isDirty,confirmDiscard,close}={}) {
    return function closeModal(id) {
      if (typeof id!=='string' || !id || typeof close!=='function') return {status:'failed'};
      try {
        if (typeof isDirty==='function' && isDirty(id)) {
          if (typeof confirmDiscard!=='function' || confirmDiscard(id)!==true) return {status:'blocked'};
        }
        close(id);return {status:'closed'};
      } catch (_) {return {status:'failed'};}
    };
  }
  function disableDeadAnalyticsCards(doc) {
    if (!doc || typeof doc.querySelectorAll!=='function') return 0;
    let fixed=0;
    Array.from(doc.querySelectorAll('.an-kpi-card[onclick]')).forEach(card=>{
      if (!card.hasAttribute('onclick') || String(card.getAttribute('onclick')).trim()!=='addQuickSessionRecord()') return;
      card.removeAttribute('onclick');
      if (card.getAttribute('role')==='button') card.removeAttribute('role');
      if (card.hasAttribute('tabindex')) card.removeAttribute('tabindex');
      if (card.style) card.style.cursor='default';
      fixed++;
    });
    return fixed;
  }
  function observeAnonymousErrors(target,report) {
    if (!target || typeof target.addEventListener!=='function' || typeof report!=='function')
      return Object.freeze({dispose(){}});
    let count=0;
    function record(event) {
      const value=event && (event.error||event.reason);
      const type=value instanceof TypeError?'TypeError':value instanceof SyntaxError?'SyntaxError':'Error';
      report(Object.freeze({kind:'javascript',type,count:++count})); // Never report message, stack, URL or data.
    }
    target.addEventListener('error',record);
    target.addEventListener('unhandledrejection',record);
    return Object.freeze({dispose(){target.removeEventListener('error',record);target.removeEventListener('unhandledrejection',record);}});
  }
  return Object.freeze({createGate,createClipboardAction,createNativeExportTracker,createModalClose,disableDeadAnalyticsCards,observeAnonymousErrors});
});
