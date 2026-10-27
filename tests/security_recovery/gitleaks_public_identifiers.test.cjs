'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'../..');
const CONFIG=path.join(ROOT,'tools/security/gitleaks_public_identifiers.toml');
const SCANNER=process.env.GITLEAKS_BIN;

function scan(files,withConfig=true){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'df-public-identifiers-'));
 const report=path.join(os.tmpdir(),'df-report-'+crypto.randomUUID()+'.json');
 try{
  for(const [name,source] of Object.entries(files)){
   const target=path.join(dir,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,source);
  }
  const args=['dir','--no-banner','--redact','--log-level','error','--report-format','json','--report-path',report];
  if(withConfig)args.push('--config',CONFIG);
  args.push('.');
  const result=spawnSync(SCANNER,args,{cwd:dir,encoding:'utf8',timeout:20000});
  assert.ok([0,1].includes(result.status),'scanner must complete with a normal scan verdict');
  assert.equal(fs.existsSync(report),true,'scanner evidence must exist');
  const findings=JSON.parse(fs.readFileSync(report,'utf8'));
  assert.equal(Array.isArray(findings),true);
  return {exit:result.status,count:findings.length};
 }finally{fs.rmSync(dir,{recursive:true,force:true});fs.rmSync(report,{force:true});}
}

test('reviewed Gitleaks config extends default rules and requires value AND exact path',()=>{
 const cfg=fs.readFileSync(CONFIG,'utf8');
 assert.match(cfg,/useDefault = true/);
 assert.equal((cfg.match(/condition = "AND"/g)||[]).length,5);
 assert.equal((cfg.match(/regexTarget = "secret"/g)||[]).length,5);
 assert.doesNotMatch(cfg,/disabledRules|stopwords|commits\s*=/);
});

test('actual scanner clears only public v21 value at its reviewed source path',{skip:!SCANNER},()=>{
 const line='const SECRET_SALT = "'+['ZEN','FORTRESS','V21','99812'].join('_')+'";\n';
 const files={'android/app/src/main/assets/web/app.js':line};
 assert.ok(scan(files,false).count>0,'default scanner must detect this public constant before exception');
 assert.deepEqual(scan(files),{exit:0,count:0});
 assert.ok(scan({'unreviewed.js':line}).count>0,'same value at unreviewed path must remain detected');
});

test('actual scanner keeps synthetic credentials detectable inside reviewed files',{skip:!SCANNER},()=>{
 const token=crypto.randomBytes(36).toString('hex');
 const files={'android/app/src/main/assets/web/app.js':'const service_secret = "'+token+'";\n'};
 assert.ok(scan(files,false).count>0,'default scanner must detect the synthetic control');
 const result=scan(files);
 assert.equal(result.exit,1);
 assert.ok(result.count>0,'exact-path exception must not hide another credential');
});

test('actual scanner keeps changed public-looking values detectable',{skip:!SCANNER},()=>{
 const line='const SECRET_SALT = "'+['ZEN','FORTRESS','V21','99813'].join('_')+'";\n';
 assert.ok(scan({'android/app/src/main/assets/web/app.js':line},false).count>0,
  'negative control must be detected by the unmodified default scanner');
 const result=scan({'android/app/src/main/assets/web/app.js':line});
 assert.equal(result.exit,1);
 assert.ok(result.count>0,'exception must match the entire reviewed public value');
});

test('actual scanner clears the reviewed Work/Rest storage-key rejection fixture only',{skip:!SCANNER},()=>{
 const reviewed='tests/critical_room7/w05_contract.test.cjs';
 const line="x.reject(key=>key==='"+['zen','fortress','cfg','v21'].join('_')+"');\n";
 assert.ok(scan({[reviewed]:line},false).count>0,'default scanner must reproduce the fixture detection');
 assert.deepEqual(scan({[reviewed]:line}),{exit:0,count:0});
 assert.ok(scan({'unreviewed.test.cjs':line}).count>0,'same identifier outside reviewed paths remains detected');
 const token=crypto.randomBytes(36).toString('hex');
 assert.ok(scan({[reviewed]:'const service_secret = "'+token+'";\n'}).count>0,
  'reviewing one public fixture value must not hide a credential in that file');
});

test('actual scanner reviews historical identifiers without exempting historical files',{skip:!SCANNER},()=>{
 const cfg=fs.readFileSync(CONFIG,'utf8');
 const checksum=cfg.match(/Historical inline localStorage checksum constant[\s\S]*?regexes = \['''\^([A-Z0-9_]+)\$'''\]/)?.[1];
 assert.ok(checksum,'historical exception has a finite literal checksum value');
 const commit=['824d87a0f801361761b14921f59571fbb','590e4df'].join('');
 const cases=[
  ['android/app/src/main/assets/web/index.html','const SECRET_SALT = "'+checksum+'";\n'],
  ['docs/master_completion/LEDGER_197.json','{"key_order_fix_commit":"'+commit+'"}\n'],
  ...['tests/integration_quality/activity_domain_durable_ack.test.cjs',
   'tests/integration_recovery/language_switch_durability.test.cjs'].map(file=>
   [file,"x.reject(key=>key==='"+['zen','fortress','cfg','v21'].join('_')+"');\n"])
 ];
 for(const [file,line] of cases){
  assert.ok(scan({[file]:line},false).count>0,'default scanner reproduces historical public value');
  assert.deepEqual(scan({[file]:line}),{exit:0,count:0});
  assert.ok(scan({'unreviewed.js':line}).count>0,'public value at unreviewed path is still detected');
  const token=crypto.randomBytes(36).toString('hex');
  assert.ok(scan({[file]:'const service_secret = "'+token+'";\n'}).count>0,
   'historical reviewed path still detects another credential');
 }
 const changed={'docs/master_completion/LEDGER_197.json':
  '{"key_order_fix_commit":"'+commit.slice(0,-1)+'e"}\n'};
 assert.ok(scan(changed,false).count>0,'default scanner must detect the changed hash control');
 assert.ok(scan(changed).count>0,
  'other hash-shaped values must not be exempted');
});
