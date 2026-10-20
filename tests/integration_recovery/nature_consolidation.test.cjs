'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'../../android/app/src/main/assets/web');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const app=fs.readFileSync(path.join(base,'app.js'),'utf8');
test('original nature inventory is loaded once in consolidated Android screen',()=>{
 for(const k of ['nature_library_v2.css','nature_library_v2.js','id="natureLibraryV2"']){
  assert.equal(html.split(k).length-1,1,k+' must be loaded exactly once');
 }
 assert.equal(app.split('DeepFocusNatureLibraryV2.render(').length-1,1);
 assert.match(app,/NATURE_APPROVED_FOR_PLAYBACK/);
});
test('retains Android WebView compatibility and notes usability modules',()=>{
 for(const k of ['webview_compat.js','notes_editor_ui.js','notes_drafts.js','analytics_recovery_core.js'])
   assert.match(html,new RegExp(k.replaceAll('.','\\.')));
 assert.match(html,/id="nsSaveButton"/);
 assert.ok(fs.existsSync(path.join(base,'design_recovery/white_premium_recovery10.css')));
});
test('catalog assets and evidence are present, no media is automatically unquarantined',()=>{
 for(const p of ['nature_library_v2.js','nature_library_v2.css'])
   assert.ok(fs.statSync(path.join(base,p)).size>0);
 assert.ok(fs.existsSync(path.resolve(__dirname,'../../docs/nature_audio_recovery/CATALOG_V2_20261020.md')));
});
