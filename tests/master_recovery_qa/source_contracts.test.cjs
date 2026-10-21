'use strict';
/* DF-149/151/157: structural checks only; not screenshot/device assertions. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const web=path.join(root,'android/app/src/main/assets/web');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const code=file=>fs.readFileSync(path.join(web,file),'utf8');
test('DF-157 no changed package identifier, backup policy or legacy storage contract',()=>{
  const build=read('android/app/build.gradle');
  const manifest=read('android/app/src/main/AndroidManifest.xml');
  const app=code('app.js'), contract=code('data_compat_v21.js');
  assert.match(build,/applicationId\s+["']com\.zenstudy\.focus["']/);
  assert.match(manifest,/android:allowBackup="false"/);
  for(const key of ['zen_fortress_cfg_v21','zen_fortress_tasks_v21','zen_fortress_notes_v21'])
    assert.ok(app.includes(key)||contract.includes(key),key);
  assert.ok(app.includes('ZEN21::')||contract.includes('ZEN21::'));
  assert.match(build,/bundleRelease|assembleRelease|signingConfigs/);
});

test('DF-149 live integrated JS dependency load order is explicit',()=>{
  const html=code('index.html');
  const scripts=[...html.matchAll(/<script[^>]*\bsrc=["']([^"']+\.js)["']/g)].map(x=>x[1]);
  const deps=['locale_rows.js','locale_extras.js','data_compat_v21.js','preflight_v22.js','app.js',
    'notes_core_v21.js','notes_studio.js','notes_editor_ui.js','notes_drafts.js',
    'tasks_core_v21.js','tasks_studio.js','analytics_core_v21.js','analytics_studio.js',
    'locale_premium_v22.js','sound_mix_controls.js','integration_v22.js'];
  for(const item of deps)assert.ok(scripts.includes(item),'missing live script '+item);
  for(let i=1;i<deps.length;i++)
    assert.ok(scripts.indexOf(deps[i-1])<scripts.indexOf(deps[i]),'load order '+deps[i-1]+' before '+deps[i]);
  for(const src of scripts)assert.ok(fs.existsSync(path.join(web,src)),'missing file '+src);
});

test('DF-151 all 20 source dictionaries and v22 translation keys: ar/fa/ur remain selectable',()=>{
  const ctx=vm.createContext({window:{},document:{addEventListener(){}}});
  for(const name of ['locale_rows.js','locale_extras.js'])vm.runInContext(code(name),ctx,{timeout:2000,filename:name});
  const app=code('app.js'), cutoff=app.indexOf('let todayISO =');
  assert.ok(cutoff>0);
  vm.runInContext(app.slice(0,cutoff)+'\nthis.dict=DICT;',ctx,{timeout:2000,filename:'app.js:i18n'});
  const dict=ctx.dict;
  const codes=Object.keys(dict), keys=Object.keys(dict.en).sort();
  assert.equal(codes.length,20);
  for(const c of ['ar','fa','ur','en','es','de'])assert.ok(codes.includes(c),c);
  for(const c of codes)assert.deepEqual(Object.keys(dict[c]).sort(),keys,'dictionary parity '+c);
  const ui={};vm.runInNewContext(code('locale_premium_v22.js'),{window:ui},{timeout:2000});
  assert.equal(Object.keys(ui.DF22Locale.translations).length,20);
  for(const c of codes) {
    assert.equal(ui.DF22Locale.dir(c),['ar','fa','ur'].includes(c)?'rtl':'ltr');
    for(const key of ui.DF22Locale.keys)assert.ok(ui.DF22Locale.t(c,key).trim(),c+'.'+key);
  }
});

test('DF-151 switching locale updates UI attributes but leaves user-edited text untouched',()=>{
  const ui={};vm.runInNewContext(code('locale_premium_v22.js'),{window:ui},{timeout:2000});
  const nodes=[
    {attr:'data-df22-i18n',key:'save',textContent:'Save',getAttribute(k){return k===this.attr?this.key:null;},setAttribute(k,v){this[k]=v;}},
    {attr:'data-df22-aria-label',key:'cancel',textContent:'x',getAttribute(k){return k===this.attr?this.key:null;},setAttribute(k,v){this[k]=v;}}
  ];
  const userText='ملاحظاتي ۱۲۳٤ 2026';
  const root={querySelectorAll(s){return nodes.filter(n=>'['+n.attr+']'===s);},userText};
  assert.equal(ui.DF22Locale.apply(root,'ar'),2);
  assert.equal(nodes[0].textContent,ui.DF22Locale.t('ar','save'));
  assert.equal(ui.DF22Locale.apply(root,'fa'),2);
  assert.equal(nodes[0].textContent,ui.DF22Locale.t('fa','save'));
  assert.equal(ui.DF22Locale.apply(root,'de'),2);
  assert.equal(nodes[0].textContent,ui.DF22Locale.t('de','save'));
  assert.equal(root.userText,userText,'User text must never be forcibly transliterated');
  // Numeric DOM/SVG screenshot checks and persistence across process restart remain BLOCKED.
});

test('P0 master-recovery push/PR receive fail-closed source CI with honest checkout SHA',()=>{
  const workflow=read('.github/workflows/verify_deep_focus_rescue.yml');
  const triggers=workflow.slice(0,workflow.indexOf('\npermissions:'));
  assert.ok(triggers.includes('  push:') && triggers.includes('  pull_request:'));
  const pushed=triggers.split('  push:')[1].split('  pull_request:')[0];
  const reviewed=triggers.split('  pull_request:')[1].split('  workflow_dispatch:')[0];
  assert.match(pushed,/integration\/master-recovery-20261021/);
  assert.match(reviewed,/integration\/master-recovery-20261021/);
  assert.match(workflow,/permissions:\s*\n\s*contents: read/);
  assert.match(workflow,/persist-credentials: false/);
  assert.match(workflow,/git rev-parse HEAD.*head-sha\.txt/);
  assert.match(workflow,/PR_HEAD_SHA=/);
  assert.match(workflow,/media_provenance_gate\.test\.cjs/);
  assert.match(workflow,/RELEASE_NOT_APPROVED\.txt/);
});
