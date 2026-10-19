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
 let disposed=false,active=null,generation=0;
 const seen=new Set();
 function stop(){generation++;if(active){const a=active;active=null;try{a.onended=null;a.onerror=null;a.pause();a.currentTime=0;}catch(_){}if(typeof options.releaseFocus==="function")options.releaseFocus();}}
 function start(id,volume){
  stop();
  const choice=CHOICES.find(s=>s.id===id);
  if(disposed||!choice||!choice.file||!AudioType||volume<=0)return Promise.resolve(false);
  try{if(!canOutput())return Promise.resolve(false);}catch(e){onError(e);return Promise.resolve(false);}
  try{if(typeof options.requestFocus==="function"&&options.requestFocus()!==true)return Promise.resolve(false);}catch(e){onError(e);return Promise.resolve(false);}
  let audio;
  try{
   audio=new AudioType("completion_alerts/"+choice.file);
   audio.preload="auto";audio.loop=false;audio.volume=Math.min(.65,Math.max(0,volume/100*.65));
   const ticket=++generation;active=audio;
   audio.onended=()=>{if(active===audio&&ticket===generation)stop()};
   audio.onerror=()=>{if(active===audio&&ticket===generation){onError(new Error("ALERT_ASSET_UNAVAILABLE:"+id));stop();}};
   const result=audio.play();
   return Promise.resolve(result).then(()=>active===audio&&ticket===generation,err=>{if(active===audio&&ticket===generation){onError(err);stop();}return false});
  }catch(e){onError(e);stop();return Promise.resolve(false)}
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
  if(typeof persist!=="function"){onError(new Error("ALERT_PERSISTENCE_REQUIRED"));return Promise.resolve(false)}
  const previous=cfg.completionAlertPlayedIds;
  cfg.completionAlertPlayedIds=[...old.filter(x=>typeof x==="string"&&x!==key),key].slice(-512);
  try{if(persist(cfg)!==true)throw new Error("ALERT_LEDGER_WRITE_NOT_VERIFIED");}
  catch(e){if(previous===undefined)delete cfg.completionAlertPlayedIds;else cfg.completionAlertPlayedIds=previous;onError(e);return Promise.resolve(false)}
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
 const doc=host.ownerDocument,t=typeof opts.translate==="function"?opts.translate:(_key,fallback)=>fallback;
 const settings=engine.getSettings(),locale=String(opts.locale||'en').split(/[-_]/)[0].toLowerCase();
 const wrap=doc.createElement("section");wrap.className="completion-alert-picker";wrap.setAttribute("dir",['ar','fa','ur'].includes(locale)?'rtl':'ltr');
 const css=[
 ".completion-alert-picker{width:100%;min-width:0;max-width:100%;box-sizing:border-box;padding:clamp(12px,3vw,18px);background:#fff;border:1px solid #dbe5f1;border-radius:20px;color:#19324f;font-size:14px;line-height:1.45}",
 ".completion-alert-picker *{box-sizing:border-box;min-width:0}",
 ".completion-alert-picker h3{margin:0 0 12px;font-size:clamp(18px,4.5vw,22px);font-weight:800;text-align:start;line-height:1.3}",
 ".completion-alert-picker fieldset{min-width:0;max-width:100%;margin:0;padding:0;border:0}",
 ".completion-alert-picker legend{padding:0;margin:0 0 6px;font-size:13px;font-weight:750;color:#546983}",
 ".completion-alert-picker .completion-alert-option{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;border-bottom:1px solid #eaf0f7;padding-block:9px;min-height:52px}",
 ".completion-alert-picker .cap-option-label{display:flex;gap:10px;align-items:center;font-size:14px;line-height:1.4;font-weight:600;cursor:pointer;min-height:44px;overflow-wrap:anywhere}",
 ".completion-alert-picker .cap-option-name{min-width:0;flex:1;overflow-wrap:anywhere}",
 ".completion-alert-picker .cap-option-label input[type=radio]{flex:0 0 20px;width:20px!important;min-width:20px!important;height:20px;margin:0;accent-color:#3b82f6}",
 ".completion-alert-picker .cap-preview{min-height:44px;min-width:72px;max-width:110px;padding:8px;border-radius:12px;border:1px solid #ccdaea;background:#f2f7ff;color:#25538b;font:inherit;font-size:12px;font-weight:750;cursor:pointer;overflow-wrap:anywhere}",
 ".completion-alert-picker .cap-preview:focus-visible,.completion-alert-picker input:focus-visible{outline:3px solid #1762d0;outline-offset:2px}",
 ".completion-alert-picker .cap-setting{display:flex;align-items:center;gap:10px;margin-block:12px;font-size:14px;min-height:44px;cursor:pointer;font-weight:650}",
 ".completion-alert-picker .cap-setting input[type=checkbox]{flex:0 0 21px;width:21px!important;height:21px;margin:0;accent-color:#3b82f6}",
 ".completion-alert-picker .cap-volume-header{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px;font-weight:700}",
 ".completion-alert-picker .cap-volume-output{direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums;white-space:nowrap}",
 ".completion-alert-picker .cap-volume{padding-block:6px 3px}",
 ".completion-alert-picker .cap-volume input[type=range]{display:block;max-width:100%;width:100%;min-height:36px;margin:3px 0;accent-color:#3b82f6}",
 "@media(max-width:340px){.completion-alert-picker{padding:10px}.completion-alert-picker .completion-alert-option{gap:5px}.completion-alert-picker .cap-preview{min-width:64px;max-width:78px;padding:5px;font-size:11px}}"
 ].join("");
 const style=doc.createElement("style");style.textContent=css;wrap.appendChild(style);
 const heading=doc.createElement("h3");heading.textContent=t("completionAlerts.title","Completion sound");wrap.appendChild(heading);
 const group=doc.createElement("fieldset"),legend=doc.createElement("legend");legend.textContent=t("completionAlerts.choose","Choose a sound");group.appendChild(legend);
 const radios=[];
 for(const choice of CHOICES){
  const line=doc.createElement("div");line.className="completion-alert-option";
  const label=doc.createElement("label");label.className="cap-option-label";
  const radio=doc.createElement("input");radio.type="radio";radio.name="completion-alert-choice";radio.value=choice.id;radio.checked=choice.id===settings.sound;
  radio.addEventListener("change",()=>{if(radio.checked){engine.update({sound:choice.id});sync()}});
  const caption=doc.createElement("span");caption.className="cap-option-name";caption.textContent=t("completionAlerts."+choice.id,choice.label);
  label.appendChild(radio);label.appendChild(caption);line.appendChild(label);radios.push(radio);
  if(choice.file){
   const preview=doc.createElement("button");preview.type="button";preview.className="cap-preview";
   preview.textContent=t("completionAlerts.preview","Preview");
   preview.setAttribute("aria-label",t("completionAlerts.preview","Preview")+" "+caption.textContent);
   preview.addEventListener("click",()=>{engine.preview(choice.id)});line.appendChild(preview);
  }
  group.appendChild(line);
 }
 wrap.appendChild(group);
 const enabledLabel=doc.createElement("label");enabledLabel.className="cap-setting";
 const enabled=doc.createElement("input");enabled.type="checkbox";enabled.checked=settings.enabled;
 enabled.addEventListener("change",()=>{engine.update({enabled:enabled.checked});sync()});
 const enabledText=doc.createElement("span");enabledText.textContent=t("completionAlerts.enabled","Enable completion sound");
 enabledLabel.appendChild(enabled);enabledLabel.appendChild(enabledText);wrap.appendChild(enabledLabel);
 const volumeWrap=doc.createElement("div");volumeWrap.className="cap-volume";
 const volumeHeader=doc.createElement("div");volumeHeader.className="cap-volume-header";
 const volumeText=doc.createElement("label");volumeText.textContent=t("completionAlerts.volume","Alert volume");
 const slider=doc.createElement("input");slider.type="range";slider.min="0";slider.max="100";slider.step="1";slider.value=String(settings.volume);slider.setAttribute("aria-label",volumeText.textContent);
 const output=doc.createElement("output");output.className="cap-volume-output";output.textContent=String(settings.volume)+"%";
 slider.addEventListener("input",()=>{output.textContent=String(slider.value)+"%"});
 slider.addEventListener("change",()=>{engine.update({volume:Number(slider.value)});sync()});
 volumeHeader.appendChild(volumeText);volumeHeader.appendChild(output);volumeWrap.appendChild(volumeHeader);volumeWrap.appendChild(slider);wrap.appendChild(volumeWrap);
 function sync(){const p=engine.getSettings();enabled.checked=p.enabled;slider.value=String(p.volume);output.textContent=String(p.volume)+"%";radios.forEach(r=>r.checked=r.value===p.sound)}
 host.replaceChildren(wrap);
 return Object.freeze({refresh:sync,unmount:()=>{engine.pause();if(wrap.parentNode===host)host.removeChild(wrap)}});
}
const api=Object.freeze({CHOICES,readCompletionAlertSettings,updateCompletionAlertSettings,createCompletionAlerts,mountCompletionAlertPicker});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.DeepFocusCompletionAlerts=api;
})(typeof window!=='undefined'?window:globalThis);
