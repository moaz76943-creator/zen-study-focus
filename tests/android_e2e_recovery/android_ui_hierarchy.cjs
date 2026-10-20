'use strict';
// Test harness only: retry transient UIAutomator transport failures before an ADB tap.
// Always parse a fresh physical WebView frame. Never reuse a previous frame, guess
// coordinates, or convert an unverified Android action into PASS.
const HIERARCHY_PATH='/sdcard/deep_focus_device_touch.xml';
const DEFAULT_ATTEMPTS=3;
async function readWebViewFrame(adb,{parseBounds,pause=async()=>{},attempts=DEFAULT_ATTEMPTS,onRetry=()=>{}}={}){
 if(typeof adb!=='function'||typeof parseBounds!=='function'||typeof pause!=='function'||
    !Number.isSafeInteger(attempts)||attempts<1||attempts>3)
   throw new Error('TRANSPORT: Invalid Android hierarchy reader configuration');
 let lastError;
 for(let attempt=1;attempt<=attempts;attempt++){
  try{
   adb('shell','uiautomator','dump',HIERARCHY_PATH);
   const xml=adb('shell','cat',HIERARCHY_PATH);
   return parseBounds(xml);
  }catch(error){
   lastError=error;
   if(attempt<attempts){
    onRetry(attempt,attempts);
    await pause(350*attempt);
   }
  }
 }
 const detail=String(lastError?.message||lastError||'unknown transport failure')
   .replace(/[\r\n]+/g,' ').slice(0,180);
 throw new Error('TRANSPORT: Cannot read real Android WebView frame after '+attempts+' attempts: '+detail);
}
module.exports={readWebViewFrame,DEFAULT_ATTEMPTS,HIERARCHY_PATH};
