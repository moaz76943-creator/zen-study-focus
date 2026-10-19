'use strict';
// Opt-in primitives. Do NOT import into shared app files until integration owner accepts.
function windowRange(rows,offset=0,limit=40,max=100){
  if(!Array.isArray(rows))throw new TypeError('rows must be an array');
  if(!Number.isSafeInteger(max)||max<1)throw new RangeError('invalid maximum page size');
  const start=Number.isFinite(offset)?Math.max(0,Math.trunc(offset)):0;
  const size=Number.isFinite(limit)?Math.min(max,Math.max(1,Math.trunc(limit))):Math.min(max,40);
  return {total:rows.length,offset:start,limit:size,items:rows.slice(start,start+size)};
}
function createLatestScheduler(run,{schedule,cancel}={}){
  if(typeof run!=='function')throw new TypeError('run callback required');
  schedule=schedule||((cb)=>setTimeout(cb,0));
  cancel=cancel||clearTimeout;
  if(typeof schedule!=='function'||typeof cancel!=='function')throw new TypeError('scheduler required');
  let disposed=false,queued=false,handle,latest;
  function flush(){
    if(disposed||!queued)return false;
    queued=false;
    cancel(handle);handle=undefined;
    const arg=latest;latest=undefined;
    run(arg);
    return true;
  }
  return Object.freeze({
    request(value){
      if(disposed)return false;
      latest=value;
      if(!queued){
        queued=true;
        handle=schedule(()=>{if(disposed||!queued)return;queued=false;handle=undefined;const value=latest;latest=undefined;run(value);});
      }
      return true;
    },
    flush,
    dispose(){
      if(disposed)return;
      disposed=true;
      if(queued)cancel(handle);
      queued=false;latest=undefined;handle=undefined;
    }
  });
}
function createListenerScope(){
  let disposed=false;
  const listeners=[];
  return Object.freeze({
    listen(target,type,handler,options=false){
      if(disposed)return false;
      if(!target||typeof target.addEventListener!=='function'||typeof target.removeEventListener!=='function'||typeof handler!=='function'||!type)
        throw new TypeError('valid target, event and callback required');
      const capture=typeof options==='boolean'?options:!!options?.capture;
      if(listeners.some(x=>x.target===target&&x.type===type&&x.handler===handler&&x.capture===capture))return false;
      target.addEventListener(type,handler,options);
      listeners.push({target,type,handler,capture});
      return true;
    },
    dispose(){
      if(disposed)return;
      disposed=true;
      for(const x of listeners.splice(0))x.target.removeEventListener(x.type,x.handler,x.capture);
    }
  });
}
module.exports=Object.freeze({windowRange,createLatestScheduler,createListenerScope});
