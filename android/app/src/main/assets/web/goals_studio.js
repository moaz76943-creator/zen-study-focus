/* Deep Focus daily goals; computed exclusively from recorded real focus sessions.
   Store goal preferences on the existing cfg object, never as fabricated progress. */
const GOAL_DOMAINS=['study','read','sport','work'];
const GOAL_UI={
 en:{kicker:'✦ YOUR DAILY TARGETS',heading:'A little progress, each day',
 desc:'Minutes come from your completed focus sessions.',edit:'⚙ Edit',
 modal:'Daily activity goals',hint:'Set 0 to hide a target. A session counts only after it completes.',
 save:'Goals saved',invalid:'Enter whole minutes from 0 to 720.',
 noGoal:'Set goal',minute:'min',done:'completed',today:'today'},
 ar:{kicker:'✦ أهدافك اليومية',heading:'تقدمك في كل نشاط',
 desc:'نحسب الدقائق من جلسات التركيز المكتملة فقط.',edit:'⚙ تعديل',
 modal:'تعديل الأهداف اليومية',hint:'اكتب 0 لإيقاف الهدف. تُحسب الدقائق بعد اكتمال الجلسة.',
 save:'تم حفظ الأهداف',invalid:'أدخل دقائق صحيحة من 0 إلى 720.',
 noGoal:'حدد هدفًا',minute:'دقيقة',done:'المنجز',today:'اليوم'}
};
function gsText(k){return (cfg.lang==='ar'?GOAL_UI.ar:GOAL_UI.en)[k]||k;}
function gsGoal(domain){
 const raw=cfg.dailyGoalsMin;
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return 0;
 const n=raw[domain];
 return Number.isInteger(n)&&n>=0&&n<=720?n:0;
}
function gsRecordedMinutes(domain,date=localDateISO()){
 const list=Array.isArray(cfg.sessionHistory)?cfg.sessionHistory:[];
 return list.reduce((sum,item)=>{
  if(!item||item.date!==date)return sum;
  const normalized=item.domain==='review'?'read':item.domain==='exam'?'work':item.domain;
  if(normalized!==domain)return sum;
  const n=Number(item.minutes);
  return Number.isFinite(n)&&n>=0&&n<=1440?sum+n:sum;
 },0);
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
 }
 document.getElementById('dailyGoalsModal').classList.add('open');
}
function saveDailyGoals(){
 const values={};
 for(const domain of GOAL_DOMAINS){
  const raw=toWest(String(document.getElementById('goalInput-'+domain)?.value||'').trim());
  if(!/^\d{1,3}$/.test(raw)){showToast(gsText('invalid'));return false;}
  const n=Number(raw);
  if(n>720){showToast(gsText('invalid'));return false;}
  values[domain]=n;
 }
 cfg.dailyGoalsMin=values;
 saveFortressData('zen_fortress_cfg_v21',cfg);
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
