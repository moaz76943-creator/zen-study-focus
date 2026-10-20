/* Deep Focus daily goals; computed exclusively from recorded real focus sessions.
   Store goal preferences on the existing cfg object, never as fabricated progress. */
const GOAL_DOMAINS=['study','read','sport','work'];
const GOAL_UI={
 en:{kicker:'✦ YOUR DAILY TARGETS',heading:'A little progress, each day',
 desc:'Minutes come from your completed focus sessions.',edit:'⚙ Edit',
 modal:'Daily activity goals',hint:'Set 0 to hide a target. A session counts only after it completes.',
 save:'Goals saved',saveFailed:'Could not save goals. Try again.',invalid:'Enter whole minutes from 0 to 720.',
 noGoal:'Set goal',minute:'min',done:'completed',today:'today',
 week:'This week',weekTarget:'Weekly target (min)',weekInvalid:'Weekly targets must be 0–5040 minutes.'},
 ar:{kicker:'✦ أهدافك اليومية',heading:'تقدمك في كل نشاط',
 desc:'نحسب الدقائق من جلسات التركيز المكتملة فقط.',edit:'⚙ تعديل',
 modal:'تعديل الأهداف اليومية',hint:'اكتب 0 لإيقاف الهدف. تُحسب الدقائق بعد اكتمال الجلسة.',
 save:'تم حفظ الأهداف',saveFailed:'تعذر حفظ الأهداف. حاول مرة أخرى.',invalid:'أدخل دقائق صحيحة من 0 إلى 720.',
 noGoal:'حدد هدفًا',minute:'دقيقة',done:'المنجز',today:'اليوم',
 week:'هذا الأسبوع',weekTarget:'الهدف الأسبوعي (دقائق)',weekInvalid:'الأهداف الأسبوعية بين 0 و5040 دقيقة.'}
};
function gsText(k){return (cfg.lang==='ar'?GOAL_UI.ar:GOAL_UI.en)[k]||k;}
function gsGoal(domain){
 const raw=cfg.dailyGoalsMin;
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return 0;
 const n=raw[domain];
 return Number.isInteger(n)&&n>=0&&n<=720?n:0;
}
/* The v21 history is the source of truth. Never infer timestamps or missing IDs.
   Keep numeric and string identifiers distinct; the first valid row wins. */
function gsISOValid(iso) {
 if(typeof iso!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(iso))return false;
 const [year,month,day]=iso.split('-').map(Number);
 if(year<1970||year>9999)return false;
 const date=new Date(year,month-1,day);
 return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day;
}
function gsCleanHistory() {
 if(typeof acceptedFocusHistory==='function')return acceptedFocusHistory(cfg.sessionHistory)||[];
 const raw=Array.isArray(cfg.sessionHistory)?cfg.sessionHistory:[];
 const seen=new Set(),entries=[];
 for(const item of raw) {
  if(!item||typeof item!=='object'||Array.isArray(item)||
     item.isStarter===true||item.isDemo===true||item.demo===true||
     item.isTest===true||item.synthetic===true||
     ['demo','sample','test','synthetic'].includes(item.source))continue;
  if(item.completed===false||item.isFocus===false||['short','long','rest','break','short_break','long_break'].includes(item.mode)||
     ['running','paused','unfinished','cancelled','skipped'].includes(item.status))continue;
  const id=item.id;
  if(!((typeof id==='string'&&id.length>0&&id.length<=128)||
      (typeof id==='number'&&Number.isSafeInteger(id)&&id>=0)))continue;
  if(!gsISOValid(item.date))continue;
  const minutes=item.minutes;
  if(typeof minutes!=='number'||!Number.isFinite(minutes)||minutes<0||minutes>1440)continue;
  const domain=item.domain==='review'?'read':item.domain==='exam'?'work':item.domain;
  if(!GOAL_DOMAINS.includes(domain))continue;
  const key=typeof id+':'+id;
  if(seen.has(key))continue;
  seen.add(key);
  entries.push({id,date:item.date,minutes,domain});
 }
 return entries;
}
function gsRecordedMinutes(domain,date=localDateISO()) {
 if(!GOAL_DOMAINS.includes(domain)||!gsISOValid(date))return 0;
 return gsCleanHistory().reduce((total,row)=>
  total+(row.domain===domain&&row.date===date?row.minutes:0),0);
}
function gsWeeklyGoal(domain) {
 const val=cfg.weeklyGoalsMin;
 if(!val||typeof val!=='object'||Array.isArray(val))return 0;
 const n=val[domain];
 return Number.isInteger(n)&&n>=0&&n<=5040?n:0;
}
function gsWeeklyRecordedMinutes(domain,until=localDateISO()) {
 if(!GOAL_DOMAINS.includes(domain)||!gsISOValid(until))return 0;
 const [y,m,d]=until.split('-').map(Number);
 const anchor=new Date(y,m-1,d);
 anchor.setDate(anchor.getDate()-(anchor.getDay()+6)%7);
 const start=localDateISO(anchor);
 return gsCleanHistory().reduce((sum,item)=>
  sum+(item.domain===domain&&item.date>=start&&item.date<=until?item.minutes:0),0);
}
function gsLabels(){
 const d=L();
 return {study:[d.domStudy,'📚'],read:[d.domRead,'📖'],sport:[d.domSport,'🏋️'],work:[d.domWork,'💻']};
}
function gsNode(tag,cls,value){
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(value!==undefined)el.textContent=String(value);
 return el;
}
function renderDailyGoals(){
 const rows=document.getElementById('dailyGoalsRows');
 if(!rows)return;
 const ids={goalsKicker:'kicker',dailyGoalsHeading:'heading',dailyGoalsDescription:'desc',goalsEditButton:'edit'};
 for(const [id,key] of Object.entries(ids)){const el=document.getElementById(id);if(el)el.textContent=gsText(key);}
 rows.replaceChildren();
 const names=gsLabels();
 for(const domain of GOAL_DOMAINS){
  const goal=gsGoal(domain),minutes=gsRecordedMinutes(domain),percent=goal?Math.min(100,Math.round(minutes/goal*100)):0;
  const row=gsNode('div','goal-row goal-'+domain);
  const icon=gsNode('span','goal-symbol',names[domain][1]);
  const main=gsNode('div','goal-main');
  const title=gsNode('div','goal-name',names[domain][0]);
  const details=gsNode('div','goal-details',goal?minutes+' / '+goal+' '+gsText('minute'):gsText('noGoal'));
  const rail=gsNode('div','goal-progress');rail.setAttribute('role','progressbar');
  rail.setAttribute('aria-label',names[domain][0]);
  rail.setAttribute('aria-valuemin','0');rail.setAttribute('aria-valuemax','100');rail.setAttribute('aria-valuenow',String(percent));
  const fill=gsNode('span','goal-fill');fill.style.width=percent+'%';rail.appendChild(fill);
  main.appendChild(title);main.appendChild(details);main.appendChild(rail);
  const weekGoal=gsWeeklyGoal(domain),weekMinutes=gsWeeklyRecordedMinutes(domain);
  if(weekGoal) {
   const weekPercent=Math.min(100,Math.round(weekMinutes/weekGoal*100));
   const weekText=gsText('week')+': '+weekMinutes+' / '+weekGoal+' '+gsText('minute')+' ('+weekPercent+'%)';
   main.appendChild(gsNode('div','goal-weekly-details',weekText));
  }
  const trailing=gsNode('div','goal-trailing');
  trailing.appendChild(gsNode('strong','goal-percent',goal?percent+'%':'—'));
  const go=gsNode('button','goal-go','▶');go.type='button';
  go.setAttribute('aria-label',(cfg.lang==='ar'?'بدء ': 'Start ')+names[domain][0]);
  go.addEventListener('click',()=>startGoalActivity(domain));
  trailing.appendChild(go);
  row.appendChild(icon);row.appendChild(main);row.appendChild(trailing);
  rows.appendChild(row);
 }
}
function openDailyGoalsModal(){
 const grid=document.getElementById('goalsEditGrid');if(!grid)return;
 const heading=document.getElementById('goalsModalHeading');
 const hint=document.getElementById('goalsModalHint');
 heading.textContent=gsText('modal');hint.textContent=gsText('hint');
 grid.replaceChildren();
 const names=gsLabels();
 for(const domain of GOAL_DOMAINS){
  const label=gsNode('label','goals-edit-label');
  label.appendChild(gsNode('span','',names[domain][1]+' '+names[domain][0]));
  const input=gsNode('input','modal-inp');input.type='number';input.inputMode='numeric';
  input.min='0';input.max='720';input.step='5';input.value=String(gsGoal(domain));input.id='goalInput-'+domain;
  input.setAttribute('aria-label',names[domain][0]+' ('+gsText('minute')+')');
  label.appendChild(input);grid.appendChild(label);
  const weekLabel=gsNode('label','goals-edit-label');
  weekLabel.appendChild(gsNode('span','',names[domain][1]+' '+gsText('weekTarget')));
  const weekly=gsNode('input','modal-inp');weekly.type='number';weekly.inputMode='numeric';
  weekly.min='0';weekly.max='5040';weekly.step='5';
  weekly.value=String(gsWeeklyGoal(domain));weekly.id='goalWeeklyInput-'+domain;
  weekly.setAttribute('aria-label',names[domain][0]+' '+gsText('weekTarget'));
  weekLabel.appendChild(weekly);grid.appendChild(weekLabel);
 }
 document.getElementById('dailyGoalsModal').classList.add('open');
}
function saveDailyGoals(){
 const values={},weeklyValues={};
 for(const domain of GOAL_DOMAINS){
  const raw=toWest(String(document.getElementById('goalInput-'+domain)?.value||'').trim());
  if(!/^\d{1,3}$/.test(raw)){showToast(gsText('invalid'));return false;}
  const n=Number(raw);
  if(n>720){showToast(gsText('invalid'));return false;}
  values[domain]=n;
  const weekRaw=toWest(String(document.getElementById('goalWeeklyInput-'+domain)?.value||'').trim());
  if(!/^\d{1,4}$/.test(weekRaw)||Number(weekRaw)>5040) {
   showToast(gsText('weekInvalid'));return false;
  }
  weeklyValues[domain]=Number(weekRaw);
 }
 // Stage the new preferences: an Android native ACK can reject the write.
 // Keep the active cfg untouched, and the modal open, until durable success.
 const next={...cfg,weeklyGoalsMin:weeklyValues,dailyGoalsMin:values};
 try {
  if(saveFortressData('zen_fortress_cfg_v21',next)!==true)
   throw new Error('GOAL_SAVE_NOT_ACKNOWLEDGED');
 } catch (_) {
  showToast(gsText('saveFailed'));
  return false;
 }
 cfg.weeklyGoalsMin=weeklyValues;
 cfg.dailyGoalsMin=values;
 closeModal('dailyGoalsModal');renderDailyGoals();showToast(gsText('save'));
 return true;
}
function startGoalActivity(domain){
 if(!GOAL_DOMAINS.includes(domain))return false;
 if(domain!==cfg.domain){
  switchActivityDomain(domain,document.getElementById('domBtn-'+domain));
  if(cfg.domain!==domain)return false; // user canceled a running-session switch
 }
 switchTab('sec-timer',document.getElementById('navTimer'));
 return true;
}
renderDailyGoals();
