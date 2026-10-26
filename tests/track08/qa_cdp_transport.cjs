'use strict';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
/** Retry only explicitly classified DevTools timeouts. Never hide JS faults. */
async function evaluateWithRetry(evaluate,{stage='unknown',attempts=3,delay=sleep,onAttempt=()=>{}}={}){
 if(!Number.isInteger(attempts)||attempts<1||attempts>5)throw new RangeError('Invalid CDP attempts');
 let last;
 for(let n=1;n<=attempts;n++){
  onAttempt({stage,number:n,total:attempts});
  try{return await evaluate();}
  catch(e){
   if(e?.code!=='CDP_TIMEOUT')throw e;
   last=e;
   if(n<attempts)await delay(700*n);
  }
 }
 const error=new Error(`CDP ${stage}: timed out after ${attempts} attempts`);
 error.code='CDP_TIMEOUT';error.cause=last;throw error;
}
module.exports={evaluateWithRetry};
