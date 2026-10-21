'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const app=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
function rig(clipboard){
 const messages=[];
 const c=vm.createContext({navigator:{clipboard},cfg:{lang:'ar'},showToast:s=>messages.push(s)});
 const a=app.indexOf('async function copyTextConfirmed('),b=app.indexOf('\nfunction syncToGoogleCloudNow',a);
 vm.runInContext(app.slice(a,b),c);return {c,messages,copy:()=>c.copyTextConfirmed('نص ٢')};
}
test('DF-075 no clipboard success until the platform promise resolves; double tap is bounded',async()=>{
 let resolve,calls=0;const h=rig({writeText:()=>{calls++;return new Promise(r=>resolve=r);}});
 const first=h.copy();assert.deepEqual(h.messages,[]);assert.equal(await h.copy(),false);assert.equal(calls,1);
 resolve();assert.equal(await first,true);assert.match(h.messages[0],/تم النسخ/);
});
test('DF-082 denied or unavailable clipboard cannot report copy success or reject unhandled',async()=>{
 for(const clipboard of [undefined,{writeText(){throw Error('SecurityError');}},{writeText:()=>Promise.reject(Error('Denied'))}]){
  const h=rig(clipboard);assert.equal(await h.copy(),false);assert.match(h.messages[0],/تعذّر النسخ/);
 }
});
