'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {run,parseGenerated,render}=require('../../../tools/i18n/integrator/index.cjs');
function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'df99-integrator-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const put=(p,v)=>{const f=path.join(root,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');};
  const source='assets/i18n/df99_reviewed_packs.json',js='android/app/src/main/assets/web/js/df99_reviewed_packs.js';
  put('android/app/src/main/assets/web/app.js','const LANG_CATALOG = [\n{"code":"en"},{"code":"ar"},{"code":"de"},{"code":"fr"},{"code":"cs"}\n];\nconst DICT = {');
  put(source,{de:{timer:{save:'Speichern',count:'{count} Einheiten'}}});
  return {root,put,source,js,opts:{root,expectedCatalogSize:5}};
}
function add(f,lane,language,sections,status='TRANSLATED'){
  f.put('assets/i18n/contributions/'+lane+'/'+language+'.json',{language,status,sections});
}
function file(f,p){return fs.readFileSync(path.join(f.root,p),'utf8');}
test('imports Unicode and generates matching JS without dropping canonical text',t=>{
  const f=fixture(t);add(f,'notes','fr',{timer:{save:'Enregistrer',count:'{count} unités'}});
  assert.equal(run(f.opts).added,2);
  const data=JSON.parse(file(f,f.source));assert.equal(data.de.timer.save,'Speichern');
  assert.equal(data.fr.timer.count,'{count} unités');
  assert.deepEqual(parseGenerated(file(f,f.js)),data);
  assert.equal(run(f.opts).added,0);assert.equal(run({...f.opts,check:true}).changed,false);
});
test('canonical values cannot be silently overwritten and failure is prewrite',t=>{
  const f=fixture(t);add(f,'tasks','de',{timer:{save:'Sichern'}});
  const old=file(f,f.source);assert.throws(()=>run(f.opts),/CONFLICT.*de\/timer\/save/);
  assert.equal(file(f,f.source),old);assert.equal(fs.existsSync(path.join(f.root,f.js)),false);
});
test('disagreeing agent lanes conflict without mutating the source',t=>{
  const f=fixture(t);add(f,'a','fr',{timer:{save:'Enregistrer'}});
  add(f,'b','fr',{timer:{save:'Sauvegarder'}});
  assert.throws(()=>run(f.opts),/CONFLICT.*fr\/timer\/save/);
  assert.deepEqual(Object.keys(JSON.parse(file(f,f.source))),['de']);
});
test('forbidden Hebrew aliases, unsafe keys and unknown keys fail',t=>{
  for(const [lang,entry,re] of [
    ['he',{save:'X'},/Forbidden or unknown locale/],
    ['iw',{save:'X'},/Forbidden or unknown locale/],
    ['fr',{constructor:'X'},/Unsafe key/],
    ['fr',{invented:'X'},/UNKNOWN_KEY/]
  ]){
    const f=fixture(t);add(f,'a',lang,{timer:entry});
    assert.throws(()=>run(f.opts),re);
  }
});
test('rejects HTML, Arabic UI digits, lone surrogate and placeholders mismatches',t=>{
  for(const [value,error] of [
    ['<img src=x onerror=alert(1)>',/Unsafe HTML/],
    ['عدد ١',/Non-Western digits/],
    ['\ud800',/Invalid Unicode/],
    ['{wrong} textes',/PLACEHOLDERS/]
  ]){
    const f=fixture(t);add(f,'a','fr',{timer:{count:value}});
    assert.throws(()=>run(f.opts),error);
  }
});
test('MACHINE_DRAFT is not deployed',t=>{
  const f=fixture(t);add(f,'a','fr',{timer:{save:'Enregistrer'}},'MACHINE_DRAFT');
  const r=run(f.opts);assert.equal(r.added,0);assert.equal(r.skipped.MACHINE_DRAFT,1);
  assert.equal(JSON.parse(file(f,f.source)).fr,undefined);
  assert.equal(run({...f.opts,check:true}).changed,false);
});
test('VERIFIED needs matching checksum in a separate human-approved ledger',t=>{
  const f=fixture(t);add(f,'a','fr',{timer:{save:{text:'Enregistrer',status:'VERIFIED'}}});
  assert.throws(()=>run(f.opts),/VERIFIED requires/);
  const hash=crypto.createHash('sha256').update('Enregistrer','utf8').digest('hex');
  const review={reviewer:'native-speaker-a',reviewedAt:'2026-10-25',evidence:'review-PR-1000',sha256:hash};
  add(f,'a','fr',{timer:{save:{text:'Enregistrer',status:'VERIFIED',review}}});
  assert.throws(()=>run(f.opts),/VERIFIED requires/);
  f.put('tools/i18n/integrator/review_approvals.json',[{id:'fr/timer/save',...review}]);
  assert.equal(run(f.opts).statuses.VERIFIED,1);
});
test('translated UI digits are preserved as ASCII, user storage untouched',t=>{
  const f=fixture(t);add(f,'a','fr',{timer:{count:'{count} éléments 123'}});
  run(f.opts);assert.equal(JSON.parse(file(f,f.source)).fr.timer.count,'{count} éléments 123');
  assert.ok(!file(f,f.js).includes('zen_fortress_cfg_v21'));
});
test('write failure after JSON rename rolls back both versions',t=>{
  const f=fixture(t);run(f.opts);const previousJSON=file(f,f.source),previousJS=file(f,f.js);
  add(f,'a','fr',{timer:{save:'Enregistrer'}});
  assert.throws(()=>run({...f.opts,onStage:stage=>{if(stage==='after-json-rename')throw Error('power-failure-test');}}),/power-failure-test/);
  assert.equal(file(f,f.source),previousJSON);assert.equal(file(f,f.js),previousJS);
  assert.equal(run(f.opts).added,1);
});
test('validation-only mode detects JSON/JS divergence',t=>{
  const f=fixture(t);run(f.opts);
  fs.appendFileSync(path.join(f.root,f.js),'\n//comment\n');
  assert.equal(run({...f.opts,check:true}).changed,false);
  fs.writeFileSync(path.join(f.root,f.js),'broken');
  assert.throws(()=>run({...f.opts,check:true}),/Generated JS/);
});
test('an eligible translated duplicate supersedes an identical machine draft',t=>{
  const f=fixture(t);add(f,'a','fr',{timer:{save:'Enregistrer'}},'MACHINE_DRAFT');
  add(f,'b','fr',{timer:{save:'Enregistrer'}},'TRANSLATED');
  assert.equal(run(f.opts).added,1);
});
test('interrupted journal restores last known good source on next invocation',t=>{
  const f=fixture(t);run(f.opts);
  const oldJSON=file(f,f.source),oldJS=file(f,f.js);add(f,'a','fr',{timer:{save:'Enregistrer'}});
  const tx='tools/i18n/integrator/.transaction';
  f.put(tx+'/backup-0',oldJSON);f.put(tx+'/backup-1',oldJS);
  const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
  f.put(tx+'/journal.json',{version:1,files:[{path:f.source,existed:true,sha256:sha(oldJSON)},{path:f.js,existed:true,sha256:sha(oldJS)}]});
  f.put(f.source,{de:{timer:{save:'bad',count:'{count} Einheiten'}}});
  assert.equal(run(f.opts).added,1);
  assert.equal(JSON.parse(file(f,f.source)).de.timer.save,'Speichern');
});
test('REVIEW_REQUIRED is reported and never included in runtime',t=>{
  const f=fixture(t);add(f,'a','fr',{timer:{save:'Enregistrer'}},'REVIEW_REQUIRED');
  assert.equal(run(f.opts).skipped.REVIEW_REQUIRED,1);
  assert.equal(JSON.parse(file(f,f.source)).fr,undefined);
});
test('generated JS escapes script closers without damaging Unicode',()=>{
  const obj={de:{timer:{save:'Text </script> ☀'}}};
  assert.ok(!render(obj).includes('</script>'));
  assert.deepEqual(parseGenerated(render(obj)),obj);
});
