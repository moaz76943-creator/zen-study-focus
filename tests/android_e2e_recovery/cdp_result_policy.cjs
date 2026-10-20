'use strict';
// Pure policy for real Android evidence: a failed setup cannot become a fake app failure.
function classifyError(error){return String(error?.message||error).startsWith('TRANSPORT:')?'NOT_TESTED':'FAIL';}
function prerequisiteBlock(results,ids){
 if(!(results instanceof Map)||!Array.isArray(ids))throw Error('Required outcome map and ID list');
 const notPassed=ids.filter(id=>results.get(id)?.status!=='PASS');
 return notPassed.length?{status:'NOT_TESTED',
   detail:'Prerequisite cases not verified: '+notPassed.map(id=>id+'='+String(results.get(id)?.status||'MISSING')).join(', ')+'. Persistence assertions cannot be run safely.'}:null;
}
module.exports={classifyError,prerequisiteBlock};
