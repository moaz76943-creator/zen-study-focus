'use strict';
/**
 * Fail-closed test infrastructure recovery for a real Android WebView.
 * The original case ALWAYS remains NOT_TESTED. A successful restart only
 * permits independent later cases to run; it does not turn a timeout into PASS.
 */
function isTransportFailure(error){
 return /^TRANSPORT:/.test(String(error?.message||error));
}
async function recoverTransport(error,restart){
 if(!isTransportFailure(error))return {attempted:false,recovered:false,reason:null};
 if(typeof restart!=='function')throw new TypeError('restart callback required');
 try{
  await restart();
  return {attempted:true,recovered:true,reason:null};
 }catch(recoveryError){
  return {attempted:true,recovered:false,reason:String(recoveryError?.message||recoveryError).slice(0,200)};
 }
}
module.exports={isTransportFailure,recoverTransport};
