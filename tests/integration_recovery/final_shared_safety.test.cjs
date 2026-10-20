'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const web=p=>fs.readFileSync(path.join(root,'android/app/src/main/assets/web',p),'utf8');
const java=()=>fs.readFileSync(path.join(root,'android/app/src/main/java/com/zenstudy/focus/MainActivity.java'),'utf8');

test('DF-015 nature playback has no generated synthetic fallback and no remote streaming',()=>{
 const app=web('app.js');
 assert.doesNotMatch(app,/function createNatureSynthFallback\s*\(/);
 assert.doesNotMatch(app,/createBufferSource\s*\(/);
 assert.doesNotMatch(app,/actions\.google\.com\/sounds/);
});
test('DF-043 all 20 languages remain selectable including ar fa ur',()=>{
 const app=web('app.js');
 assert.doesNotMatch(app,/UI_BLOCKED_SCRIPTS|visualLanguage\(/);
 for (const code of ['ar','fa','ur'])assert.match(app,new RegExp("code: '"+code+"'"));
});
test('DF-064 nonnumeric user text is never normalized by universal input listener',()=>{
 const app=web('app.js');
 assert.doesNotMatch(app,/e\.target\.tagName === 'TEXTAREA'/);
 assert.match(app,/data-df-numeric-input/);
});
test('DF-031 alerts are wired to real timer completion without synthesized chime',()=>{
 const app=web('app.js'),html=web('index.html');
 assert.match(html,/completion_alert_settings\.js/);
 assert.match(web('integration_v22.js'),/DeepFocusCompletionAlerts/);
 assert.match(app,/DFRecoveryCompletion/);
 assert.doesNotMatch(app,/createOscillator\s*\(/);
 assert.match(app,/timerSessionId/);
});
test('DF-121 real analytics code is activated once, with no optimistic export',()=>{
 const html=web('index.html'),js=web('integration_v22.js');
 assert.match(html,/analytics_recovery_core\.js[\s\S]*analytics_recovery_ui\.js/);
 assert.match(js,/DeepFocusAnalyticsRecoveryUI\.mount/);
 assert.match(java(),/exportAnalyticsCsvToFile/);
 assert.match(java(),/onActivityResult/);
});
test('DF-138 new CSS overlay actually loads after shared v22 tokens',()=>{
 const html=web('index.html');
 assert.match(html,/design_tokens_v22\.css[\s\S]*design_recovery\/white_premium_recovery10\.css/);
});
test('DF-157 native package and v21 keys not rewritten',()=>{
 const app=web('app.js');
 assert.match(app,/zen_fortress_cfg_v21/);
 assert.match(app,/zen_fortress_tasks_v21/);
 assert.match(app,/zen_fortress_notes_v21/);
 assert.match(app,/ZEN21::/);
 const gradle=fs.readFileSync(path.join(root,'android/app/build.gradle'),'utf8');
 assert.match(gradle,/applicationId "com\.zenstudy\.focus"/);
});

// This is a source gate, NOT evidence that Audio Focus, DND or locked-screen playback works on a device.
test('DF-037/040 native background cue uses recorded local WAV and a silent visual channel',()=>{
 const service=fs.readFileSync(path.join(root,'android/app/src/main/java/com/zenstudy/focus/FocusTimerService.java'),'utf8');
 const main=java(),bridge=web('integration_v22.js');
 assert.match(service,/zen_completion_visual_v22/);
 assert.match(service,/getAssets\(\)\.openFd\("web\/completion_alerts\//);
 assert.match(service,/MainActivity\.isWebViewVisible\(\)/);
 assert.doesNotMatch(service,/RingtoneManager|ringtone\.play\(\)/);
 assert.match(service,/setSilent\(true\)/);
 assert.match(main,/configureCompletionAlert\(String sound, int volume, boolean enabled\)/);
 assert.match(bridge,/configureCompletionAlert\(state\.sound,state\.volume,state\.enabled\)/);
});
