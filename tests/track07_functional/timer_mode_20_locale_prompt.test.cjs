'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../../android/app/src/main/assets/web');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const quick=fs.readFileSync(path.join(root,'quick_training.js'),'utf8');

test('all user-visible Timer mode changes reuse the checked-in 20-language discard confirmation',()=>{
 const block=app.slice(app.indexOf('function selectTimerModeFromUser('),app.indexOf('function selectTimerMode(',app.indexOf('function selectTimerModeFromUser(')));
 assert.match(block,/window\.confirm\(quickText\('replacePrompt'\)\)/);
 assert.doesNotMatch(block,/cfg\.lang\s*===\s*'ar'/,'Hard-coded two-language branch excludes 18 supported languages');
 assert.match(block,/if\s*\(\(timerRunning\s*\|\|/);
 assert.match(block,/return false/,'Cancel must preserve session state');
});
test('existing reviewed quick-training discard prompt is populated in all original twenty locales',()=>{
 const keys=/const QUICK_KEYS\s*=\s*\[[\s\S]*?\];/.exec(quick);
 const translations=/const QUICK_TRANSLATIONS\s*=\s*\{[\s\S]*?\n\};/.exec(quick);
 assert.ok(keys&&translations,'Use existing source-reviewed dictionary rather than automatic generation');
 const d=vm.runInNewContext(keys[0]+'\n'+translations[0]+'\n({keys:QUICK_KEYS,values:QUICK_TRANSLATIONS})');
 const index=d.keys.indexOf('replacePrompt');
 assert.ok(index>=0);
 const codes=['en','ar','es','zh','hi','fr','de','ru','pt','ja','id','tr','ko','vi','it','bn','ur','fa','pl','nl'];
 assert.equal(Object.keys(d.values).length,20,'Only verified original 20 languages are currently shipped');
 for(const language of codes){
  assert.ok(typeof d.values[language]?.[index]==='string'&&d.values[language][index].trim().length>=10,
   language+' missing a real context-specific discard confirmation');
 }
});
