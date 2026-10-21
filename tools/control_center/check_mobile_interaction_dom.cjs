#!/usr/bin/env node
'use strict';
/* Inspect a Chrome-generated DOM, not a mocked Node-only DOM. */
const fs=require('node:fs');
function checkMobileInteractionDom(html){
 if(typeof html!=='string'||html.length<30000)throw Error('Incomplete Chromium DOM');
 const element=html.match(/<output\b[^>]*id="track15-browser-qa"[^>]*>([^<]*)<\/output>/i);
 if(!element)throw Error('Browser interaction marker missing');
 const opening=element[0].slice(0,element[0].indexOf('>'));
 const data=element[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&');
 let report;
 try{report=JSON.parse(data);}catch{throw Error('Unreadable browser QA report: '+data.slice(0,120));}
 if(!opening.includes('data-result="PASS"')||report.result!=='PASS')
   throw Error('Chrome UI interaction FAIL: '+JSON.stringify(report).slice(0,500));
 if(!Number.isInteger(report.measured?.viewportWidth)||report.measured.viewportWidth<200)
   throw Error('Missing real viewport measurement');
 if(report.measured.localeCount!==20)throw Error('Incomplete locale grid');
 return report;
}
if(require.main===module){
 try{
  const arg=process.argv[2];
  if(!arg||!arg.endsWith('.html'))throw Error('Specify Chrome DOM .html');
  const report=checkMobileInteractionDom(fs.readFileSync(arg,'utf8'));
  console.log('PASS: Chrome Track 15 refresh/navigation/rate-limit interaction: '+JSON.stringify(report.measured));
 }catch(e){console.error('FAIL:',e.message);process.exitCode=1;}
}
module.exports={checkMobileInteractionDom};
