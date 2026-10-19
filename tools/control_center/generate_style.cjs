#!/usr/bin/env node
'use strict';
/* Deterministic generator: source-controlled JSON is the only input. */
const fs=require('node:fs'),path=require('node:path');
const core=require('../../docs/control-center/studio-core.js');
const root=path.resolve(__dirname,'../..');
const configPath=path.join(root,'docs/control-center/design-config.json');
const targetPath=path.join(root,'android/app/src/main/assets/web/control_center_overrides.css');
function main(args){
 if(args.length!==1||!['--write','--check'].includes(args[0]))throw Error('Usage: generate_style.cjs --check OR --write');
 const value=JSON.parse(fs.readFileSync(configPath,'utf8'));
 const next=core.renderCSS(value);
 if(args[0]==='--check'){
   if(fs.readFileSync(targetPath,'utf8')!==next)throw Error('Generated CSS is stale; run node tools/control_center/generate_style.cjs --write and review diff.');
   process.stdout.write('PASS: control center CSS matches approved JSON\n');
 } else {
   fs.writeFileSync(targetPath,next,'utf8');
   process.stdout.write('Generated offline visual overrides from allowlisted JSON\n');
 }
}
try{main(process.argv.slice(2));}catch(e){console.error('FAIL:',e.message);process.exitCode=1;}
