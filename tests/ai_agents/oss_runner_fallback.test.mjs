import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,chmodSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const runner=fileURLToPath(new URL('../../tools/ai_agents/oss_run.sh',import.meta.url));
function exercise(qwenOutput){
 const root=mkdtempSync(join(tmpdir(),'df-qwen-fallback-'));
 const bin=join(root,'bin'),home=join(root,'home'),run=join(root,'runner');
 mkdirSync(bin);mkdirSync(home);mkdirSync(run);
 for(const file of ['tools/i18n/inventory/index.cjs','tests/i18n/inventory/inventory.test.cjs']){
  const target=join(root,file);mkdirSync(target.slice(0,target.lastIndexOf('/')),{recursive:true});writeFileSync(target,'// test fixture\n');
 }
 writeFileSync(join(run,'df-oss-task.txt'),'Reproduce bug, then fix.');
 const program=(name,body)=>{const p=join(bin,name);writeFileSync(p,'#!/bin/sh\n'+body+'\n');chmodSync(p,0o755);};
 program('npm','exit 0');
 program('python3','exit 0');
 program('timeout','shift; "$@"');
 program('qwen','echo '+JSON.stringify(qwenOutput)+' >&2; exit 1');
 program('aider','printf "used" > "$RUNNER_TEMP/fallback-ran"; exit 0');
 const init=spawnSync('git',['init','-q'],{cwd:root,encoding:'utf8'});
 assert.equal(init.status,0,init.stderr);
 const add=spawnSync('git',['add','tools/i18n/inventory/index.cjs','tests/i18n/inventory/inventory.test.cjs'],{cwd:root,encoding:'utf8'});
 assert.equal(add.status,0,add.stderr);
 const result=spawnSync('bash',[runner],{cwd:root,encoding:'utf8',timeout:20000,
  env:{...process.env,HOME:home,RUNNER_TEMP:run,GROQ_API_KEY:'local-test-only',AGENT_ROLE:'qwen',PATH:bin+':'+process.env.PATH}});
 return {root,run,result};
}

test('Qwen Groq 413 retries with Aider on the exact allowed two files',()=>{
 const x=exercise('Responses API error 413');
 try{
  assert.equal(x.result.status,0,x.result.stdout+'\n'+x.result.stderr);
  assert.equal(readFileSync(join(x.run,'fallback-ran'),'utf8'),'used');
 }finally{rmSync(x.root,{recursive:true,force:true});}
});
test('non-413 Qwen failures must not fall back or fabricate success',()=>{
 const x=exercise('unrelated model error');
 try{
  assert.notEqual(x.result.status,0);
  assert.equal(existsSync(join(x.run,'fallback-ran')),false);
 }finally{rmSync(x.root,{recursive:true,force:true});}
});
