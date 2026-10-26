/* Focus cycle configuration — uses original focus timer and saved cfg. */
const TSET_I18N = {
 en:['⚙ Customize','Focus and break settings','Your current session is preserved; changes apply to new sessions.',
     'Focus · min','Short rest · min','Long rest · min','Sessions per cycle','Defaults','Save',
     'Use whole numbers within the displayed ranges.','Settings saved',
     'Could not save settings. No changes were applied.','Activity changed. Reopen settings to try again.'],
 ar:['⚙ تخصيص','إعدادات التركيز والراحة','الجلسة الحالية لن تتوقف؛ التعديل يطبق على الجلسات الجديدة.',
     'التركيز · دقائق','الراحة القصيرة · دقائق','الراحة الطويلة · دقائق','جلسات كل دورة','الافتراضي','حفظ',
     'أدخل أعدادًا صحيحة ضمن النطاقات المحددة.','تم حفظ الإعدادات',
     'تعذر حفظ الإعدادات. لم تُطبّق أي تغييرات.','تغيّر النشاط. افتح الإعدادات من جديد.']
};
function tsetText(i){const base=TSET_I18N[cfg.lang==='ar'?'ar':'en'][i];return globalThis.DF99Locale?.t(cfg.lang,'timer',String(i),base) ?? base;}
let tsetEditingDomain = null;
function tsetCount(){return Number.isInteger(cfg.roundsPerCycle)&&cfg.roundsPerCycle>=1&&cfg.roundsPerCycle<=12?cfg.roundsPerCycle:4;}
function refreshTimerSettings(){
 const ids={timerSettingsChip:0,tsetHeading:1,tsetHint:2,tsetFocusLabel:3,tsetShortLabel:4,tsetLongLabel:5,tsetRoundsLabel:6,tsetReset:7,tsetSave:8};
 for(const [id,i] of Object.entries(ids)){
  const el=document.getElementById(id);if(el)el.textContent=tsetText(i);
 }
 document.getElementById('modeShortBtn').textContent=toWest(cfg.shortMin+'m');
 document.getElementById('modeLongBtn').textContent=toWest(cfg.longMin+'m');
}
function openTimerSettings(){
 tsetEditingDomain=cfg.domain;
 refreshTimerSettings();
 document.getElementById('tsetFocus').value=String(getDomainFocusMinutes());
 document.getElementById('tsetShort').value=String(cfg.shortMin);
 document.getElementById('tsetLong').value=String(cfg.longMin);
 document.getElementById('tsetRounds').value=String(tsetCount());
 document.getElementById('timerSettingsModal').classList.add('open');
}
function resetTimerSettingsFields(){
 document.getElementById('tsetFocus').value=String(DOMAIN_FOCUS_MINUTES[cfg.domain]||25);
 document.getElementById('tsetShort').value='5';
 document.getElementById('tsetLong').value='15';
 document.getElementById('tsetRounds').value='4';
}
function tsetNumber(id,min,max){
 const raw=toWest(String(document.getElementById(id).value||'').trim());
 if(!/^\d{1,3}$/.test(raw))return null;
 const n=Number(raw);return Number.isSafeInteger(n)&&n>=min&&n<=max?n:null;
}
function saveTimerSettings(){
 if(!['study','read','work','sport'].includes(tsetEditingDomain)||tsetEditingDomain!==cfg.domain) { showToast(tsetText(12));return false; }
 const focus=tsetNumber('tsetFocus',1,240),short=tsetNumber('tsetShort',1,60),
  long=tsetNumber('tsetLong',1,120),rounds=tsetNumber('tsetRounds',1,12);
 if([focus,short,long,rounds].includes(null)){showToast(tsetText(9));return false;}
 // Prepare the complete new config without touching the live session or cfg.
 // saveFortressData verifies both durable v21 copies and acknowledges success.
 const previous=cfg.domainFocusMinutes;
 const nextCfg={...cfg,
  domainFocusMinutes:{...(previous&&typeof previous==='object'&&!Array.isArray(previous)?previous:{}),[tsetEditingDomain]:focus},
  shortMin:short,longMin:long,roundsPerCycle:rounds,
  focusCycleCount:tsetCount()===rounds?cfg.focusCycleCount:0
 };
 try {
  if(!saveFortressData('zen_fortress_cfg_v21',nextCfg))throw new Error('STORAGE_NOT_ACKNOWLEDGED');
 } catch(error) {
  // The modal and all in-memory settings remain unchanged on any write failure.
  showToast(tsetText(11));
  return false;
 }
 Object.assign(cfg,nextCfg);
 closeModal('timerSettingsModal');refreshTimerSettings();renderDomainState();
 // Don't replace a running, paused or quick-training session.
 const fresh=!timerRunning&&!quickTraining?.active&&timerSessionId===null&&timerLeft===timerTotal;
 if(fresh&&['focus','short','long'].includes(currentTimerModeKey)){
  const mode=currentTimerModeKey,mins=mode==='focus'?getDomainFocusMinutes():mode==='short'?cfg.shortMin:cfg.longMin;
  selectTimerMode(mins,mode,document.getElementById(mode==='focus'?'modeFocusBtn':mode==='short'?'modeShortBtn':'modeLongBtn'));
 }
 showToast(tsetText(10));return true;
}
refreshTimerSettings();

/* Custom Timer Escape matches Cancel: close only the foremost active modal,
 * without applying fields, clearing the current session, or writing storage. */
if (typeof document.addEventListener === 'function') {
 document.addEventListener('keydown', function(event) {
  if (event.key !== 'Escape' || event.defaultPrevented) return;
  const modal = document.getElementById('customTimerModal');
  if (!modal || !modal.classList.contains('open')) return;
  const open = document.querySelectorAll('.modal-overlay.open');
  if (open.length === 0 || open[open.length - 1] !== modal) return;
  event.preventDefault();
  closeModal('customTimerModal');
 });
}
