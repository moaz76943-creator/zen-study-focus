/* Optional v21 nature mixer controller. The existing app.js owns audio generation and
   playback; this module only coordinates its public callbacks. */
(function(root) {
 'use strict';
 function createSoundMixer({catalog,isPlaying,start,stop,setVolume}) {
  if(!Array.isArray(catalog)||typeof isPlaying!=='function'||typeof start!=='function'||
     typeof stop!=='function'||typeof setVolume!=='function')throw new TypeError('Sound mixer dependencies required');
  const ids=new Set(catalog.map(s=>s&&s.id).filter(id=>typeof id==='string'));
  if(ids.size!==catalog.length)throw new TypeError('Duplicate sound ID');
  let disposed=false;
  function percentage(value) {
   if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100)return null;
   return Math.round(value)/100;
  }
  function setPercent(id,pct) {
   if(disposed||!ids.has(id))return false;
   const level=percentage(pct);if(level===null)return false;
   setVolume(id,level);return true;
  }
  function applyMix(requested) {
   if(disposed||!Array.isArray(requested)||requested.length>ids.size)return false;
   const wants=new Map();
   for(const entry of requested) {
    if(!entry||!ids.has(entry.id)||wants.has(entry.id))return false;
    const level=percentage(entry.percent);
    if(level===null)return false;
    wants.set(entry.id,level);
   }
   for(const id of ids)if(!wants.has(id)&&isPlaying(id))stop(id);
   for(const [id,level] of wants){
    if(!isPlaying(id))start(id);
    setVolume(id,level);
   }
   return true;
  }
  function stopAll() {
   for(const id of ids)if(isPlaying(id))stop(id);
  }
  function activeIds() {return [...ids].filter(id=>isPlaying(id));}
  function dispose() {if(disposed)return;stopAll();disposed=true;}
  return Object.freeze({applyMix,setPercent,stopAll,activeIds,dispose});
 }
 const api=Object.freeze({createSoundMixer});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 else root.DeepFocusSoundMixer=api;
})(typeof window!=='undefined'?window:globalThis);
