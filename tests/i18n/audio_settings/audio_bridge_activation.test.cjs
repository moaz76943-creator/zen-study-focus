'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const web=path.resolve(__dirname,'../../../android/app/src/main/assets/web');
const html=fs.readFileSync(path.join(web,'index.html'),'utf8');
const app=fs.readFileSync(path.join(web,'app.js'),'utf8');

test('bundled Audio/Settings locale bridge loads once after app.js and before integration',()=>{
 const bridge='src="js/locale_audio_settings_bridge.js"';
 assert.equal(html.split(bridge).length-1,1);
 const idx=html.indexOf(bridge);
 assert.ok(html.indexOf('src="app.js"')<idx);
 assert.ok(idx<html.indexOf('src="integration_v22.js"'));
 assert.ok(fs.existsSync(path.join(web,'js/locale_audio_settings_bridge.js')));
});
test('sound render binds translated UI after tiles exist, preserving legacy catalog',()=>{
 const start=app.indexOf('function renderSoundsStudio()');
 const end=app.indexOf('\n/* ========================================================\n   8. ANALYTICS',start);
 assert.ok(start>=0 && end>start);
 const render=app.slice(start,end);
 const tiles=render.indexOf('box.appendChild(tile)');
 const bridge=render.indexOf('DeepFocusAudioSettingsLocale?.bindSoundStudio(');
 assert.ok(tiles>=0&&bridge>tiles,'translate only after tile creation');
 for(const s of ['document,','locale: cfg.lang','catalog: SOUNDS_DATA','category: soundCat','sounds: d.sounds'])
  assert.ok(render.includes(s),s);
 assert.ok(!/saveFortressData|setItem\(|activePlayers\[.*\]\s*=/.test(render.slice(bridge)));
});

test('opening backup dialog localizes only its rendered labels, after opening',()=>{
 const start=app.indexOf('function openCloudBackupModal()');
 const end=app.indexOf('function syncToGoogleCloudNow()',start);
 assert.ok(start>=0&&end>start);
 const fn=app.slice(start,end);
 const opened=fn.indexOf("classList.add('open')");
 const localized=fn.indexOf('DeepFocusAudioSettingsLocale?.bindBackupDialog(');
 assert.ok(localized>opened,'bind only after modal opens');
 assert.ok(fn.includes('document, locale: cfg.lang'));
 assert.equal((fn.match(/inpRestorePayload/g)||[]).length,1,'do not reassign user data in bridge');
 assert.ok(!/saveFortressData|localStorage|verifyAndRestoreBackupCode/.test(fn));
});
