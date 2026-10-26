/* DF-031..DF-042: isolated, offline completion alerts; host/Android wiring owned by lane 00. */
(function(root){'use strict';
const CHOICES=Object.freeze([{"id":"silent","file":null,"label":"Complete silence"},{"id":"soft-bell","file":"soft_bell.wav","label":"Soft single bell"},{"id":"wood-tap","file":"wood_tap.wav","label":"Gentle wooden tap"},{"id":"water-drop","file":"water_drop.wav","label":"Water drop"},{"id":"muted-metal","file":"muted_metal.wav","label":"Muted metallic strike"},{"id":"two-taps","file":"two_taps.wav","label":"Two soft wooden taps"}]);
function readCompletionAlertSettings(cfg){
 const p=cfg&&cfg.completionAlertSettings&&typeof cfg.completionAlertSettings==="object"&&!Array.isArray(cfg.completionAlertSettings)?cfg.completionAlertSettings:{};
 return Object.freeze({
  sound:CHOICES.some(c=>c.id===p.sound)?p.sound:"soft-bell",
  volume:Number.isFinite(p.volume)&&p.volume>=0&&p.volume<=100?p.volume:35,
  enabled:typeof p.enabled==="boolean"?p.enabled:true,
  includeRest:p.includeRest===true
 });
}
function updateCompletionAlertSettings(cfg,changes,persist){
 if(!cfg||typeof cfg!=="object"||Array.isArray(cfg)||!changes||typeof changes!=="object"||typeof persist!=="function")return false;
 const keys=Object.keys(changes);if(!keys.length||keys.some(k=>!["sound","volume","enabled","includeRest"].includes(k)))return false;
 if("sound" in changes&&!CHOICES.some(c=>c.id===changes.sound))return false;
 if("volume" in changes&&(!Number.isFinite(changes.volume)||changes.volume<0||changes.volume>100))return false;
 if("enabled" in changes&&typeof changes.enabled!=="boolean")return false;
 if("includeRest" in changes&&typeof changes.includeRest!=="boolean")return false;
 const previous=cfg.completionAlertSettings;
 cfg.completionAlertSettings={...(previous&&typeof previous==="object"&&!Array.isArray(previous)?previous:{}),...readCompletionAlertSettings(cfg),...changes};
 try{if(persist(cfg)!==true)throw new Error("Alert settings save was not verified");}
 catch(_){if(previous===undefined)delete cfg.completionAlertSettings;else cfg.completionAlertSettings=previous;return false}
 return true;
}
function createCompletionAlerts(cfg,options={}){
 if(!cfg||typeof cfg!=="object"||Array.isArray(cfg))throw new TypeError("cfg required");
 const persist=options.persist,AudioType=options.AudioCtor||(typeof Audio!=="undefined"?Audio:null);
 const canOutput=typeof options.canOutput==="function"?options.canOutput:()=>true;
 const onError=typeof options.onError==="function"?options.onError:()=>{};
 // Host callbacks must not abort timer finalization or leave audio focus reserved.
 const reportError=(error)=>{try{onError(error)}catch(_){/* best-effort error reporting */}};
 let disposed=false,active=null,generation=0,focusReserved=false;
 const seen=new Set();
 function stop(){
  generation++;
  const a=active;active=null;
  if(a){try{a.onended=null;a.onerror=null;a.pause();a.currentTime=0;}catch(_){}}
  // release even if Audio construction failed after requestFocus succeeded.
  if(a||focusReserved){focusReserved=false;try{if(typeof options.releaseFocus==="function")options.releaseFocus();}catch(_){}}
 }
 function start(id,volume){
  stop();
  const choice=CHOICES.find(s=>s.id===id);
  if(disposed||!choice||!choice.file||!AudioType||volume<=0)return Promise.resolve(false);
  try{if(!canOutput())return Promise.resolve(false);}catch(e){reportError(e);return Promise.resolve(false);}
  try{if(typeof options.requestFocus==="function"){
   if(options.requestFocus()!==true)return Promise.resolve(false);
   focusReserved=true;
  }}catch(e){reportError(e);return Promise.resolve(false);}
  let audio;
  try{
   audio=new AudioType("completion_alerts/"+choice.file);
   audio.preload="auto";audio.loop=false;audio.volume=Math.min(.65,Math.max(0,volume/100*.65));
   const ticket=++generation;active=audio;
   audio.onended=()=>{if(active===audio&&ticket===generation)stop()};
   audio.onerror=()=>{if(active===audio&&ticket===generation){reportError(new Error("ALERT_ASSET_UNAVAILABLE:"+id));stop();}};
   const result=audio.play();
   return Promise.resolve(result).then(()=>active===audio&&ticket===generation,err=>{if(active===audio&&ticket===generation){reportError(err);stop();}return false});
  }catch(e){reportError(e);stop();return Promise.resolve(false)}
 }
 function preview(id){
  if(disposed)return Promise.resolve(false);
  const prefs=readCompletionAlertSettings(cfg),sound=id===undefined?prefs.sound:id;
  if(!CHOICES.some(s=>s.id===sound)||sound==="silent"||prefs.volume===0){stop();return Promise.resolve(false)}
  return start(sound,prefs.volume);
 }
 function complete(event){
  if(disposed||!event||!["focus","short","long","custom"].includes(event.phase))return Promise.resolve(false);
  const id=event.sessionId;
  if(!(typeof id==="string"&&id.length>0&&id.length<=256)&&!(typeof id==="number"&&Number.isFinite(id)))return Promise.resolve(false);
  const key=typeof id+":"+String(id);
  const old=Array.isArray(cfg.completionAlertPlayedIds)?cfg.completionAlertPlayedIds:[];
  if(seen.has(key)||old.includes(key))return Promise.resolve(false);
  if(typeof persist!=="function"){reportError(new Error("ALERT_PERSISTENCE_REQUIRED"));return Promise.resolve(false)}
  const previous=cfg.completionAlertPlayedIds;
  cfg.completionAlertPlayedIds=[...old.filter(x=>typeof x==="string"&&x!==key),key].slice(-512);
  try{if(persist(cfg)!==true)throw new Error("ALERT_LEDGER_WRITE_NOT_VERIFIED");}
  catch(e){if(previous===undefined)delete cfg.completionAlertPlayedIds;else cfg.completionAlertPlayedIds=previous;reportError(e);return Promise.resolve(false)}
  seen.add(key);
  const prefs=readCompletionAlertSettings(cfg);
  if(!prefs.enabled||prefs.sound==="silent"||prefs.volume===0||(!prefs.includeRest&&["short","long"].includes(event.phase))){stop();return Promise.resolve(false)}
  return start(prefs.sound,prefs.volume);
 }
 function update(changes){if(disposed)return false;const result=updateCompletionAlertSettings(cfg,changes,persist);if(result&&("sound" in changes||"volume" in changes||"enabled" in changes))stop();return result}
 function dispose(){if(disposed)return;disposed=true;stop();seen.clear()}
 return Object.freeze({getSettings:()=>readCompletionAlertSettings(cfg),update,preview,complete,pause:stop,dispose});
}
function mountCompletionAlertPicker(host,engine,opts={}){
 if(!host||!host.ownerDocument||!engine||typeof engine.update!=="function")throw new TypeError("host and engine required");
 const doc=host.ownerDocument,t=typeof opts.translate==="function"?opts.translate:(key,fallback)=>fallback,settings=engine.getSettings();
 const wrap=doc.createElement("div");wrap.className="completion-alert-picker";
 const heading=doc.createElement("h3");heading.textContent=t("completionAlerts.title","Completion sound");wrap.appendChild(heading);
 const group=doc.createElement("fieldset"),legend=doc.createElement("legend");legend.textContent=t("completionAlerts.choose","Choose a sound");group.appendChild(legend);
 const radios=[];
 for(const choice of CHOICES){
  const line=doc.createElement("div");line.className="completion-alert-option";
  const label=doc.createElement("label"),radio=doc.createElement("input");radio.type="radio";radio.name="completion-alert-choice";radio.value=choice.id;radio.checked=choice.id===settings.sound;radio.addEventListener("change",()=>{if(radio.checked){if(!engine.update({sound:choice.id}))radio.checked=false;sync()}});label.appendChild(radio);label.appendChild(doc.createTextNode(" "+t("completionAlerts."+choice.id,choice.label)));line.appendChild(label);radios.push(radio);
  if(choice.file){const preview=doc.createElement("button");preview.type="button";preview.textContent=t("completionAlerts.preview","Preview");preview.setAttribute("aria-label",t("completionAlerts.preview","Preview")+" "+t("completionAlerts."+choice.id,choice.label));preview.addEventListener("click",()=>{engine.preview(choice.id)});line.appendChild(preview)}
  group.appendChild(line);
 }wrap.appendChild(group);
 const enabled=doc.createElement("input");enabled.type="checkbox";enabled.checked=settings.enabled;enabled.addEventListener("change",()=>{if(!engine.update({enabled:enabled.checked}))sync()});
 const enabledLabel=doc.createElement("label");enabledLabel.appendChild(enabled);enabledLabel.appendChild(doc.createTextNode(" "+t("completionAlerts.enabled","Enable completion sound")));wrap.appendChild(enabledLabel);
 const volumeLabel=doc.createElement("label");volumeLabel.textContent=t("completionAlerts.volume","Alert volume");const slider=doc.createElement("input");slider.type="range";slider.min="0";slider.max="100";slider.step="1";slider.value=String(settings.volume);slider.setAttribute("aria-label",t("completionAlerts.volume","Alert volume"));slider.addEventListener("change",()=>{if(!engine.update({volume:Number(slider.value)}))sync()});volumeLabel.appendChild(slider);wrap.appendChild(volumeLabel);
 function sync(){const p=engine.getSettings();enabled.checked=p.enabled;slider.value=String(p.volume);radios.forEach(r=>r.checked=r.value===p.sound)}
 host.replaceChildren(wrap);return Object.freeze({refresh:sync,unmount:()=>{engine.pause();if(wrap.parentNode===host)host.removeChild(wrap)}});
}
const api=Object.freeze({CHOICES,readCompletionAlertSettings,updateCompletionAlertSettings,createCompletionAlerts,mountCompletionAlertPicker});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.DeepFocusCompletionAlerts=api;
})(typeof window!=='undefined'?window:globalThis);
