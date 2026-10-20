#!/usr/bin/env node
'use strict';
/* Inspect DOM captured from a real headless Chrome opening the PORTABLE file: URL. */
const fs=require('node:fs');
const path=require('node:path');
function assertBooted(dom){
  if(typeof dom!=='string'||dom.length<30000)throw Error('No complete browser DOM output');
  const content=id=>{
    const x=dom.match(new RegExp('<[a-z][^>]*\\bid="'+id+'"[^>]*>([^<]{0,500})','i'));
    return x?x[1]:'';
  };
  const ledger=content('v3-task-count');
  const design=content('studio-status');
  const status=content('connection');
  if(!/[0-9]+\s*مهمة/.test(ledger)||/بانتظار|جارٍ/.test(ledger))
    throw Error('Task list failed to initialize from embedded recovery ledger: '+ledger.slice(0,180));
  if(!/الإعدادات مطابقة/.test(design))
    throw Error('Studio did not initialize from embedded local config: '+design.slice(0,180));
  if(!status||/جارٍ الاتصال/.test(status))
    throw Error('GitHub/source connection status never rendered');
  const plannerSource=content('planner-source-status');
  const plannerCount=content('planner-count');
  if(!/161 مهمة/.test(plannerSource)||!/0\s*\/\s*6 مهام مختارة/.test(plannerCount)||
    !/id="planner-task-list"[^>]*>\s*<div class="planner-task/.test(dom))
    throw Error('Agent planner task selector did not initialize from source (source='+plannerSource+', count='+plannerCount+')');
  if(!dom.includes('id="repo-sync-refresh"')||!dom.includes('id="repo-sync-workflows"'))
    throw Error('Missing GitHub live integration controls in the actual Chrome DOM');
  return {taskCountText:ledger,designReady:true,plannerReady:true,plannerSource,repoSyncPresent:true,statusText:status};
}
if(require.main===module){
  try{
    const file=process.argv[2];
    if(!file||path.extname(file)!=='.html')throw Error('Expected Chrome DOM .html path');
    const report=assertBooted(fs.readFileSync(file,'utf8'));
    process.stdout.write('PASS: Chrome real DOM initialized static source and visual editor; '+JSON.stringify(report)+'\n');
  }catch(e){console.error('FAIL: Chrome portable DOM check:',e.message);process.exitCode=1;}
}
module.exports={assertBooted};
