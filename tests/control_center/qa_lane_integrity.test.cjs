'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const screens=require('../../docs/control-center/studio-core.js').SCREENS;
function existsTestDir(dir){const full=path.join(root,dir);return fs.existsSync(full)&&fs.statSync(full).isDirectory()&&fs.readdirSync(full).some(x=>x.endsWith('.test.cjs'));}
test('every screen points to an existing tracked source and executable test directory',()=>{
 for(const [name,spec] of Object.entries(screens)){
  for(const file of spec.files)assert.ok(fs.existsSync(path.join(root,file)),name+' missing source '+file);
  for(const dir of spec.tests)assert.ok(existsTestDir(dir),name+' missing test directory '+dir);
 }
});
test('every scoped QA workflow node --test glob matches an actual suite',()=>{
 const yaml=read('.github/workflows/control_center_agents.yml');
 const commands=[...yaml.matchAll(/^\s*node --test (.+)$/gm)];
 assert.ok(commands.length>=6,'expected >=6 QA test lane commands');
 for(const [,args] of commands){
  for(const glob of args.trim().split(/\s+/)){
   assert.match(glob,/^tests\/[a-z0-9_]+\/\*\.test\.cjs$/,'unsupported wildcard: '+glob);
   assert.ok(existsTestDir(glob.slice(0,glob.indexOf('/*'))),'missing QA glob '+glob);
  }
 }
});
test('GitHub design issue automation never creates unapproved main changes',()=>{
 const yaml=read('.github/workflows/control_center_design_requests.yml');
 assert.match(yaml,/github\.repository_owner/);
 assert.match(yaml,/draft:true/);
 assert.match(yaml,/parsed\.sha!==head/);
});
