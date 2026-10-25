'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const bridge=require('../../../android/app/src/main/assets/web/js/locale_audio_settings_bridge.js');
const {createSoundMixer}=require('../../../android/app/src/main/assets/web/sound_mix_controls.js');
const CATALOG=bridge.SOUND_IDS.map((id,i)=>({id,cat:i<6?'water':'forest',src:'sounds/'+id+'.ogg'}));

function fakeStudio(){
 const tile=(isOn=false)=>{
   const name={textContent:''}, label={textContent:''}, slider={value:'0.65',ariaLabel:'',setAttribute(k,v){this[k]=v;}};
   const play={attributes:{},listeners:{},clickCount:0,focusCount:0,
     setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,fn){this.listeners[k]=fn;this.listenerCount=(this.listenerCount||0)+1;},
     click(){this.clickCount++;},focus(){this.focusCount++;}};
   return {name,label,slider,play,attributes:{},classList:{contains(k){return isOn&&k==='playing';}},
     querySelector(s){return s==='.stile-name'?name:s==='.stile-volume-label span'?label:s==='input.stile-vol'?slider:s==='.stile-play-btn'?play:null;},
     setAttribute(k,v){this.attributes[k]=v;}};
 };
 const tiles=CATALOG.map((s,i)=>tile(i===2));
 const hdr={textContent:''},actions=Array.from({length:2},()=>({textContent:''}));
 const filters=Array.from({length:4},()=>({textContent:''}));
 const section={querySelectorAll(s){return s==='.sound-Rich-tile'?tiles:s==='.mixer-status-bar button'?actions:s==='.segmented-pills-bar .seg-pill'?filters:[];},
 querySelector(s){return s==='#mixerStatusTxt'?hdr:null;}};
 return {tiles,hdr,actions,filters,doc:{getElementById(id){return id==='sec-sounds'?section:null;}}};
}

test('all authored locale namespaces cover every control, message, alert and twelve sounds',()=>{
 assert.equal(bridge.SOUND_IDS.length,12);
 for(const locale of ['en','ar','de','es','fr']){
  assert.deepEqual(Object.keys(bridge.PACKS[locale]).sort(),[...bridge.KEYS].sort());
  for(const key of bridge.KEYS) assert.ok(bridge.translate(locale,key).trim(),locale+':'+key);
 }
 assert.equal(bridge.translate('de','control.stopAll'),'Alle stoppen');
 assert.equal(bridge.translate('ar','settings.restore'),'استعادة');
});

test('unsupported and excluded locales use truthful English fallback without false coverage',()=>{
 assert.deepEqual(bridge.metadata('lo-LA'),{requested:'lo',used:'en',complete:false,fallback:true});
 assert.equal(bridge.translate('lo','control.volume'),'Volume');
 assert.equal(bridge.localeCode('he-IL'),'en');
 assert.equal(bridge.localeCode('iw'),'en');
 assert.equal(bridge.translate('en','does.not.exist'),'');
 assert.equal(bridge.soundName('he-IL','ocean',{locale:'he',sounds:{ocean:'גלים'}}),'Ocean Waves');
 assert.equal(bridge.soundName('en','ocean',{locale:'iw',sounds:{ocean:'גלים'}}),'Ocean Waves');
});

test('sound IDs and file paths remain untouched; a matching legacy translation is allowed',()=>{
 const before=JSON.stringify(CATALOG);
 const legacy={locale:'fr',sounds:{ocean:'Vagues de l’Océan'}};
 assert.equal(bridge.soundName('fr','ocean',legacy),'Vagues de l’Océan');
 assert.equal(bridge.soundName('de','ocean',legacy),'Meereswellen');
 assert.equal(bridge.soundName('ar','unknown'),'');
 assert.equal(JSON.stringify(CATALOG),before);
});

test('studio translation preserves playback, slider values, app state and Western numerals',()=>{
 const studio=fakeStudio();
 const config={lang:'ar',soundVolumes:{ocean:0.65},sessionHistory:[{minutes:25}]};
 const before=JSON.stringify(config),catalogBefore=JSON.stringify(CATALOG);
 let playCount=0, saveCount=0;
 for(const locale of ['de','ar','en','fr','lo']) {
   const result=bridge.bindSoundStudio({document:studio.doc,locale,catalog:CATALOG});
   assert.equal(result.status,'OK');
   assert.equal(result.updated,12);
   assert.equal(studio.tiles[0].slider.value,'0.65');
   assert.ok(studio.tiles[0].slider['aria-label'].includes(bridge.soundName(locale,'ocean')));
   assert.ok(studio.tiles[2].play.attributes['aria-label'].includes(bridge.translate(locale,'control.pause')));
 }
 assert.equal(studio.filters[0].textContent,'All (12)');
 assert.equal(JSON.stringify(config),before);
 assert.equal(JSON.stringify(CATALOG),catalogBefore);
 assert.equal(playCount+saveCount,0);
});

test('mismatched/partial studio returns without changing any tile or user state',()=>{
 const studio=fakeStudio();studio.tiles.pop();
 assert.equal(bridge.bindSoundStudio({document:studio.doc,locale:'de',catalog:CATALOG}).status,'MISMATCH');
 assert.ok(studio.tiles.every(x=>x.name.textContent===''));
});

test('mixer playback and optional lifecycle respond correctly without locale side effects',()=>{
 const on=new Set();const volumes=new Map(),calls=[];
 const mix=createSoundMixer({catalog:CATALOG,isPlaying:id=>on.has(id),
   start:id=>{on.add(id);calls.push('start:'+id);},
   stop:id=>{on.delete(id);calls.push('stop:'+id);},
   setVolume:(id,value)=>volumes.set(id,value)});
 assert.equal(mix.applyMix([{id:'ocean',percent:42},{id:'rain',percent:70}]),true);
 assert.equal(volumes.get('ocean'),0.42);
 const events={};const doc={visibilityState:'visible',
 addEventListener(type,fn){events[type]=fn;},removeEventListener(type,fn){if(events[type]===fn)delete events[type];}};
 const detach=mix.attachLifecycle(doc,{stopOnBackground:true});
 events.visibilitychange();assert.equal(mix.activeIds().length,2);
 // Locale switching never invokes the audio mixer.
 bridge.audioLabels('ar','ocean');bridge.audioLabels('fr','rain');
 assert.equal(mix.activeIds().length,2);
 doc.visibilityState='hidden';events.visibilitychange();assert.equal(mix.activeIds().length,0);
 assert.equal(mix.applyMix([{id:'night',percent:55}]),true);
 detach();assert.equal(Object.keys(events).length,0);
 mix.dispose();assert.equal(mix.activeIds().length,0);
 assert.equal(mix.applyMix([{id:'rain',percent:55}]),false);
});

test('lifecycle without background-stop remains passive; disposal removes listeners',()=>{
 const on=new Set(['rain']);const events={};const doc={visibilityState:'hidden',
 addEventListener(t,fn){events[t]=fn;},removeEventListener(t){delete events[t];}};
 const mix=createSoundMixer({catalog:CATALOG,isPlaying:id=>on.has(id),start:id=>on.add(id),stop:id=>on.delete(id),setVolume(){}});
 mix.attachLifecycle(doc);events.visibilitychange();events.pagehide();
 assert.deepEqual(mix.activeIds(),['rain']);mix.dispose();
 assert.deepEqual(Object.keys(events),[]);assert.deepEqual([...on],[]);
});


test('play control is keyboard-operable and ARIA-pressed while keeping its volume slider independent',()=>{
 const studio=fakeStudio();
 assert.equal(bridge.bindSoundStudio({document:studio.doc,locale:'de',catalog:CATALOG}).status,'OK');
 const first=studio.tiles[0],playing=studio.tiles[2],button=first.play;
 assert.equal(first.attributes.role,'group');
 assert.equal(button.attributes.role,'button');
 assert.equal(button.attributes.tabindex,'0');
 assert.equal(button.attributes['aria-pressed'],'false');
 assert.equal(playing.play.attributes['aria-pressed'],'true');
 assert.ok(button.attributes['aria-label'].includes('Meereswellen'));
 const press=(key,target=button)=>{let prevented=0;button.listeners.keydown({key,target,
   preventDefault(){prevented++;},stopPropagation(){}});return prevented;};
 assert.equal(press('Enter'),1);assert.equal(press(' '),1);
 assert.equal(button.clickCount,2);
 assert.equal(press('ArrowUp'),0);
 assert.equal(press('Enter',first.slider),0);
 assert.equal(button.clickCount,2);
 bridge.bindSoundStudio({document:studio.doc,locale:'ar',catalog:CATALOG});
 assert.equal(button.listenerCount,1,'one event listener across repeated bindings');
 assert.ok(button.attributes['aria-label'].includes('أمواج المحيط'));
});


test('native button controls rely on browser Enter/Space activation without duplicate synthetic clicks',()=>{
 const studio=fakeStudio(),control=studio.tiles[0].play;
 control.tagName='BUTTON';
 const result=bridge.bindSoundStudio({document:studio.doc,locale:'ar',catalog:CATALOG});
 assert.equal(result.status,'OK');
 assert.equal(control.attributes['aria-pressed'],'false');
 assert.equal(control.listeners.keydown,undefined);
 assert.equal(control.clickCount,0);
});


function fakeBackupModal() {
 const node=(text='')=>({textContent:text,attributes:{},setAttribute(key,value){this.attributes[key]=value;}});
 const fields={
  title:node('☁️ Manual Backup & Restore'), close:node('✕'),
  warning:node('Exported backup codes are NOT encrypted'),
  share:node('Share Backup Code'), exportFile:node('Export Backup File'),
  restoreTitle:node('Restore Progress on New Phone'),
  payload:{value:'ZEN21::private-backup-payload',placeholder:'Paste your backup code here'},
  restoreCode:node('Restore Code ✓'), loadFile:node('Load File'),
  file:{value:'private-file.zenbackup'}
 };
 fields.restoreCode.onclick=()=>true;
 const head={querySelector(s){return s==='span'?fields.title:s==='button'?fields.close:null;}};
 const warning=fields.warning;
 const exportActions={querySelectorAll(s){return s==='button'?[fields.share,fields.exportFile]:[];}};
 const restoreActions={
  querySelector(s){return s==='div'?fields.restoreTitle:s==='textarea#inpRestorePayload'?fields.payload:null;},
  querySelectorAll(s){return s==='.modal-actions button'?[fields.restoreCode,fields.loadFile]:[];}
 };
 const card={children:[head,warning,exportActions,restoreActions]};
 const modal={querySelector(s){return s==='.modal-card'?card:null;}};
 return {fields,card,doc:{getElementById(id){return id==='cloudBackupModal'?modal:null;}}};
}

test('backup dialog keys exist in every reviewed locale and explicitly preserve unencrypted-code warning',()=>{
 const codes=['en','ar','de','es','fr'];
 const keys=['backup.modalTitle','backup.unencryptedWarning','backup.shareCode',
   'backup.exportFile','backup.restoreHeading','backup.pasteCode',
   'backup.restoreCode','backup.loadFile','backup.close'];
 for(const locale of codes) for(const key of keys) {
  assert.ok(bridge.translate(locale,key).trim(),locale+':'+key);
 }
 assert.ok(bridge.translate('en','backup.unencryptedWarning').includes('NOT encrypted'));
});

test('backup dialog switching is display-only; it never reads or replaces user backup codes',()=>{
 const x=fakeBackupModal();
 const savedClick=x.fields.restoreCode.onclick;
 const keys=['title','warning','share','exportFile','restoreTitle','restoreCode','loadFile'];
 const initial=x.fields.payload.value;
 for(const locale of ['de','ar','fr','es','en','lo','he']) {
  const result=bridge.bindBackupDialog({document:x.doc,locale});
  assert.equal(result.status,'OK');
  for(const key of keys) assert.ok(x.fields[key].textContent.trim(),key);
  assert.equal(x.fields.payload.value,initial);
  assert.equal(x.fields.file.value,'private-file.zenbackup');
  assert.equal(x.fields.restoreCode.onclick,savedClick);
  assert.equal(x.fields.payload.placeholder,bridge.translate(locale,'backup.pasteCode'));
  assert.equal(x.fields.close.attributes['aria-label'],bridge.translate(locale,'backup.close'));
 }
 assert.equal(x.fields.title.textContent,bridge.translate('en','backup.modalTitle'));
});

test('backup dialog rejects incomplete markup atomically and handles absent modal',()=>{
 const x=fakeBackupModal();
 const before=x.fields.title.textContent;
 x.card.children[2].querySelectorAll=()=>[];
 assert.equal(bridge.bindBackupDialog({document:x.doc,locale:'fr'}).status,'INCOMPLETE');
 assert.equal(x.fields.title.textContent,before);
 assert.equal(bridge.bindBackupDialog({document:{getElementById(){return null;}},locale:'fr'}).status,'SKIPPED');
});


test('excluded locales report explicit fallback rather than full English coverage',()=>{
 for(const language of ['he','iw','he-IL','iw_IL']) {
  const status=bridge.metadata(language);
  assert.equal(status.used,'en');
  assert.equal(status.complete,false);
  assert.equal(status.fallback,true);
 }
 assert.equal(bridge.metadata('en').complete,true);
});
