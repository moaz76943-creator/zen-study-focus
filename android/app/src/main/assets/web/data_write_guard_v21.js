/* Deep Focus v21: centralized verified writes and explicit crash recovery.
   Hash packets detect accidental corruption; they are NOT encryption/authentication.
   v21 primary/mirror keys and serialized backups remain unchanged. */
(function(root){
'use strict';
const compat=root.DeepFocusDataCompatV21;
if(!compat)throw new Error('DATA_COMPAT_MUST_LOAD_FIRST');
const keys=compat.KEYS, canonical=new Set(Object.values(keys));
const KEY_TO_SLOT=Object.fromEntries(Object.entries(keys).map(([slot,key])=>[key,slot]));
const clone=x=>JSON.parse(JSON.stringify(x));
let blocked=false, busy=false;
function pending(){
 return compat.inspectPending(root.localStorage);
}
function verifyPacket(key, expected){
 if(root.localStorage.getItem(key)!==expected)throw new Error('UNVERIFIED_WRITE: '+key);
 if(!compat.inspectPacket(expected).ok)throw new Error('INVALID_PACKET: '+key);
}
function beforeMatches(before){
 if(!before)return;
 for(const [key,original] of Object.entries(before)){
  if(!canonical.has(key))throw new Error('NOT_CANONICAL_KEY');
  const p=compat.inspectPacket(root.localStorage.getItem(key));
  const m=compat.inspectPacket(root.localStorage.getItem(key+'_mirror'));
  if(!p.ok&&!m.ok){
   if(original===null||Array.isArray(original)&&original.every(x=>x?.isStarter))continue;
   throw new Error('CONCURRENT_OR_MISSING_SOURCE: '+key);
  }
  const value=(p.ok?p:m).value;
  if(JSON.stringify(value)!==JSON.stringify(original))throw new Error('STALE_EDITOR_SNAPSHOT: '+key);
 }
}
function writeCanonical(values,before){
 if(blocked||pending().pending)throw new Error('PENDING_JOURNAL_RECOVERY_REQUIRED');
 if(busy)throw new Error('REENTRANT_WRITE');
 const entries=Object.entries(values);
 if(!entries.length)return true;
 if(entries.some(([key])=>!canonical.has(key)))throw new Error('UNSUPPORTED_TRANSACTION_KEY');
 beforeMatches(before);
 const original=compat.captureRaw(root.localStorage);
 const expected={};
 for(const [key,value] of entries){
  const packet=compat.encodePacket(value);
  expected[key]=packet;expected[key+'_mirror']=packet;
 }
 // A valid journal records all six original packet bytes, including absent keys.
 const journal={version:1,state:'pending',original,expected};
 busy=true;
 try{
  root.localStorage.setItem(compat.JOURNAL_KEY,JSON.stringify(journal));
  try{
   for(const [key,packet] of Object.entries(expected))root.localStorage.setItem(key,packet);
   for(const [key,packet] of Object.entries(expected))verifyPacket(key,packet);
   journal.state='committed';
   root.localStorage.setItem(compat.JOURNAL_KEY,JSON.stringify(journal));
   if(root.localStorage.getItem(compat.JOURNAL_KEY)!==JSON.stringify(journal))
    throw new Error('JOURNAL_COMMIT_NOT_VERIFIED');
  }catch(writeError){
   const rollbackErrors=[];
   for(const [key,value] of Object.entries(original)){
    try{if(value===null)root.localStorage.removeItem(key);else root.localStorage.setItem(key,value);}
    catch(e){rollbackErrors.push(key);}
   }
   for(const [key,value] of Object.entries(original))
    if(root.localStorage.getItem(key)!==value)rollbackErrors.push(key+':mismatch');
   if(rollbackErrors.length){
    blocked=true;
    throw new Error('ROLLBACK_UNVERIFIED: '+rollbackErrors.join(',')+' / '+writeError.message);
   }
   root.localStorage.removeItem(compat.JOURNAL_KEY);
   throw writeError;
  }
  try{root.localStorage.removeItem(compat.JOURNAL_KEY);}
  catch(e){blocked=true;throw new Error('COMMITTED_BUT_JOURNAL_REQUIRES_RECOVERY');}
  return true;
 }finally{busy=false;}
}
function writeAux(key,value){
 if(blocked)throw new Error('STORAGE_RECOVERY_REQUIRED');
 const k=String(key), m=k+'_mirror', previous=[root.localStorage.getItem(k),root.localStorage.getItem(m)];
 const packet=compat.encodePacket(value);
 try{
  root.localStorage.setItem(k,packet);root.localStorage.setItem(m,packet);
  verifyPacket(k,packet);verifyPacket(m,packet);return true;
 }catch(e){
  for(const [i,x] of [k,m].entries()){
   try{if(previous[i]===null)root.localStorage.removeItem(x);else root.localStorage.setItem(x,previous[i]);}
   catch(_){blocked=true;}
  }
  if(root.localStorage.getItem(k)!==previous[0]||root.localStorage.getItem(m)!==previous[1])blocked=true;
  throw e;
 }
}
function preflight(){
 const record=pending();
 if(!record.pending)return true;
 if(!record.valid){blocked=true;root.alert?.('Deep Focus: damaged recovery journal. Export your data and contact support; writes are blocked.');return false;}
 const ask=root.confirm?.('Deep Focus found an interrupted save. Restore the last verified data state before continuing?');
 if(ask!==true){blocked=true;root.alert?.('Saving is blocked until recovery is approved.');return false;}
 try{compat.recoverPending(root.localStorage,{approved:true});return true;}
 catch(e){blocked=true;root.alert?.('Recovery failed; stored data has not been silently replaced. '+e.message);return false;}
}
const api=Object.freeze({
 get blocked(){return blocked;},
 preflight,write:(key,value)=>canonical.has(key)?writeCanonical({[key]:value}):writeAux(key,value),
 writeCanonical,readSnapshot:()=>compat.inspectStorage(root.localStorage)
});
root.DeepFocusV21StorageGuard=api;
preflight();
})(window);
