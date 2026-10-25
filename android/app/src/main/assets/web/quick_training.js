/* Quick interval training and home dashboard — independent from user study data. */
const QUICK_KEYS = [
  'focusToday','ready','running','paused','trainingTitle','trainingSubtitle',
  'rounds','work','rest','skipLastRest','exercises','exercisePlaceholder',
  'addExercise','presetTabata','presetWorkout','presetReading','presetWork',
  'skipStep','stopTraining','startTraining','todayProgress','todayPlan','viewAll',
  'chooseActivity','domainsHint','emptyPlan','workPhase','restPhase','round',
  'done','cancelPrompt','replacePrompt','invalidDuration','started','finished','quickSessions'
];
const QUICK_TRANSLATIONS = {
  en: ['✦ Focus space','Ready to focus','In progress','Paused','Quick training','Custom work-and-rest intervals',
    'Sets','Work (MM:SS)','Rest (MM:SS)','Skip final rest','Exercise sequence','e.g. stretches or deep reading',
    '+ Add','Intervals 20/10','Workout 4/1','Reading 20/5','Deep work 50/10','Skip phase','End training',
    '▶ Start training','✧ Your progress','Today’s plan','View all ↗','Choose your activity','A tailored session for every goal',
    'No tasks for today yet','Work','Rest','Round','Completed','End the current training session?',
    'Changing activities or modes ends your current session. Continue?','Enter valid MM:SS durations','Training started','Training completed!','Quick sessions'],
  ar: ['✦ مساحة التركيز','جاهز للتركيز','الوقت يعمل','متوقف مؤقتًا','تدريب سريع','جولات عمل وراحة قابلة للتخصيص',
    'المجموعات','العمل (د:ث)','الراحة (د:ث)','تخطي الراحة الأخيرة','التمارين المتتابعة','مثل: تمارين الإطالة أو القراءة المركزة',
    '+ إضافة','تدريب 20/10','رياضة 4/1','قراءة 20/5','عمل 50/10','تخطي المرحلة','إنهاء التدريب',
    '▶ ابدأ التدريب','✧ تقدمك اليوم','خطة اليوم','عرض الكل ↗','اختر نوع نشاطك','لكل نشاط جلسته المناسبة',
    'لا توجد مهام لهذا اليوم بعد','عمل','راحة','الجولة','مكتمل','هل تريد إنهاء التدريب الحالي؟',
    'تغيير النشاط أو الوضع سينهي الجلسة الحالية. هل تريد المتابعة؟','أدخل مدة صحيحة بصيغة د:ث','بدأ التدريب','اكتمل التدريب!','جلسات سريعة']
};
/* DF_BATCH06_QUICK_I18N */
Object.assign(QUICK_TRANSLATIONS, {
  "de": [
    "✦ Fokusbereich",
    "Bereit zum Konzentrieren",
    "Läuft",
    "Pausiert",
    "Schnelltraining",
    "Individuelle Arbeits- und Pausenintervalle",
    "Runden",
    "Arbeit (MM:SS)",
    "Pause (MM:SS)",
    "Letzte Pause überspringen",
    "Übungsabfolge",
    "z. B. Dehnen oder konzentriertes Lesen",
    "+ Hinzufügen",
    "Intervalle 20/10",
    "Training 4/1",
    "Lesen 20/5",
    "Konzentriertes Arbeiten 50/10",
    "Phase überspringen",
    "Training beenden",
    "▶ Training starten",
    "✧ Dein Fortschritt",
    "Heutiger Plan",
    "Alle anzeigen ↗",
    "Wähle deine Aktivität",
    "Eine passende Einheit für jedes Ziel",
    "Für heute sind noch keine Aufgaben geplant",
    "Arbeit",
    "Pause",
    "Runde",
    "Abgeschlossen",
    "Aktuelles Training beenden?",
    "Beim Wechsel von Aktivität oder Modus wird die laufende Sitzung beendet. Fortfahren?",
    "Gültige Dauer im Format MM:SS eingeben",
    "Training gestartet",
    "Training abgeschlossen!",
    "Schnelle Einheiten"
  ],
  "es": [
    "✦ Espacio de concentración",
    "Listo para concentrarte",
    "En curso",
    "En pausa",
    "Entrenamiento rápido",
    "Intervalos de trabajo y descanso personalizables",
    "Series",
    "Trabajo (MM:SS)",
    "Descanso (MM:SS)",
    "Omitir el último descanso",
    "Secuencia de ejercicios",
    "p. ej., estiramientos o lectura concentrada",
    "+ Añadir",
    "Intervalos 20/10",
    "Ejercicio 4/1",
    "Lectura 20/5",
    "Trabajo profundo 50/10",
    "Saltar fase",
    "Terminar entrenamiento",
    "▶ Iniciar entrenamiento",
    "✧ Tu progreso",
    "Plan de hoy",
    "Ver todo ↗",
    "Elige tu actividad",
    "Una sesión adaptada a cada objetivo",
    "Aún no hay tareas para hoy",
    "Trabajo",
    "Descanso",
    "Serie",
    "Completado",
    "¿Terminar el entrenamiento actual?",
    "Cambiar de actividad o modo finalizará la sesión actual. ¿Continuar?",
    "Introduce duraciones válidas en formato MM:SS",
    "Entrenamiento iniciado",
    "¡Entrenamiento completado!",
    "Sesiones rápidas"
  ],
  "fr": [
    "✦ Espace de concentration",
    "Prêt à vous concentrer",
    "En cours",
    "En pause",
    "Entraînement rapide",
    "Intervalles de travail et de repos personnalisés",
    "Séries",
    "Travail (MM:SS)",
    "Repos (MM:SS)",
    "Ignorer la dernière pause",
    "Suite d’exercices",
    "p. ex. étirements ou lecture attentive",
    "+ Ajouter",
    "Intervalles 20/10",
    "Sport 4/1",
    "Lecture 20/5",
    "Travail approfondi 50/10",
    "Passer la phase",
    "Terminer l’entraînement",
    "▶ Démarrer l’entraînement",
    "✧ Votre progression",
    "Programme du jour",
    "Tout voir ↗",
    "Choisissez votre activité",
    "Une séance adaptée à chaque objectif",
    "Aucune tâche prévue pour aujourd’hui",
    "Travail",
    "Repos",
    "Série",
    "Terminé",
    "Terminer l’entraînement en cours ?",
    "Changer d’activité ou de mode met fin à la séance en cours. Continuer ?",
    "Saisissez des durées valides au format MM:SS",
    "Entraînement démarré",
    "Entraînement terminé !",
    "Séances rapides"
  ]
});
/* DF_BATCH07_QUICK_I18N */
Object.assign(QUICK_TRANSLATIONS, {
  "pt": [
    "✦ Espaço de foco",
    "Pronto para se concentrar",
    "Em andamento",
    "Pausado",
    "Treino rápido",
    "Intervalos personalizados de trabalho e descanso",
    "Séries",
    "Trabalho (MM:SS)",
    "Descanso (MM:SS)",
    "Pular o último descanso",
    "Sequência de exercícios",
    "ex.: alongamentos ou leitura focada",
    "+ Adicionar",
    "Intervalos 20/10",
    "Exercício 4/1",
    "Leitura 20/5",
    "Trabalho profundo 50/10",
    "Pular etapa",
    "Encerrar treino",
    "▶ Iniciar treino",
    "✧ Seu progresso",
    "Plano de hoje",
    "Ver tudo ↗",
    "Escolha sua atividade",
    "Uma sessão adequada a cada objetivo",
    "Ainda não há tarefas para hoje",
    "Trabalho",
    "Descanso",
    "Série",
    "Concluído",
    "Encerrar o treino atual?",
    "Mudar de atividade ou modo encerra a sessão atual. Continuar?",
    "Informe durações válidas no formato MM:SS",
    "Treino iniciado",
    "Treino concluído!",
    "Sessões rápidas"
  ],
  "it": [
    "✦ Spazio di concentrazione",
    "Pronto a concentrarti",
    "In corso",
    "In pausa",
    "Allenamento rapido",
    "Intervalli personalizzati di lavoro e riposo",
    "Serie",
    "Lavoro (MM:SS)",
    "Riposo (MM:SS)",
    "Salta l’ultima pausa",
    "Sequenza di esercizi",
    "ad es. stretching o lettura concentrata",
    "+ Aggiungi",
    "Intervalli 20/10",
    "Allenamento 4/1",
    "Lettura 20/5",
    "Lavoro profondo 50/10",
    "Salta fase",
    "Termina allenamento",
    "▶ Avvia allenamento",
    "✧ I tuoi progressi",
    "Piano di oggi",
    "Vedi tutto ↗",
    "Scegli la tua attività",
    "Una sessione adatta a ogni obiettivo",
    "Nessuna attività prevista per oggi",
    "Lavoro",
    "Riposo",
    "Serie",
    "Completato",
    "Terminare l’allenamento attuale?",
    "Cambiare attività o modalità terminerà la sessione attuale. Continuare?",
    "Inserisci durate valide nel formato MM:SS",
    "Allenamento avviato",
    "Allenamento completato!",
    "Sessioni rapide"
  ],
  "nl": [
    "✦ Focusruimte",
    "Klaar om te focussen",
    "Bezig",
    "Gepauzeerd",
    "Snelle training",
    "Aangepaste werk- en rustintervallen",
    "Sets",
    "Werk (MM:SS)",
    "Rust (MM:SS)",
    "Laatste pauze overslaan",
    "Oefeningenreeks",
    "bijv. stretchen of geconcentreerd lezen",
    "+ Toevoegen",
    "Intervallen 20/10",
    "Training 4/1",
    "Lezen 20/5",
    "Diep werk 50/10",
    "Fase overslaan",
    "Training beëindigen",
    "▶ Training starten",
    "✧ Jouw voortgang",
    "Plan voor vandaag",
    "Alles bekijken ↗",
    "Kies je activiteit",
    "Een sessie voor elk doel",
    "Nog geen taken voor vandaag",
    "Werk",
    "Rust",
    "Ronde",
    "Voltooid",
    "Huidige training beëindigen?",
    "Wisselen van activiteit of modus beëindigt je huidige sessie. Doorgaan?",
    "Voer geldige tijden in als MM:SS",
    "Training gestart",
    "Training voltooid!",
    "Snelle sessies"
  ],
  "tr": [
    "✦ Odak alanı",
    "Odaklanmaya hazır",
    "Devam ediyor",
    "Duraklatıldı",
    "Hızlı antrenman",
    "Özelleştirilebilir çalışma ve dinlenme aralıkları",
    "Setler",
    "Çalışma (DD:SS)",
    "Dinlenme (DD:SS)",
    "Son dinlenmeyi atla",
    "Egzersiz sırası",
    "ör. esneme veya odaklanarak okuma",
    "+ Ekle",
    "Aralıklar 20/10",
    "Egzersiz 4/1",
    "Okuma 20/5",
    "Derin çalışma 50/10",
    "Aşamayı atla",
    "Antrenmanı bitir",
    "▶ Antrenmanı başlat",
    "✧ İlerlemen",
    "Bugünün planı",
    "Tümünü gör ↗",
    "Etkinliğini seç",
    "Her hedefe uygun bir oturum",
    "Bugün için henüz görev yok",
    "Çalışma",
    "Dinlenme",
    "Tur",
    "Tamamlandı",
    "Mevcut antrenman bitirilsin mi?",
    "Etkinliği veya modu değiştirmek mevcut oturumu sonlandırır. Devam edilsin mi?",
    "DD:SS biçiminde geçerli süre girin",
    "Antrenman başladı",
    "Antrenman tamamlandı!",
    "Hızlı oturumlar"
  ],
  "ru": [
    "✦ Пространство фокуса",
    "Готовы сосредоточиться",
    "В процессе",
    "Пауза",
    "Быстрая тренировка",
    "Настраиваемые интервалы работы и отдыха",
    "Подходы",
    "Работа (ММ:СС)",
    "Отдых (ММ:СС)",
    "Пропустить последний отдых",
    "Последовательность упражнений",
    "например, растяжка или сосредоточенное чтение",
    "+ Добавить",
    "Интервалы 20/10",
    "Тренировка 4/1",
    "Чтение 20/5",
    "Глубокая работа 50/10",
    "Пропустить этап",
    "Завершить тренировку",
    "▶ Начать тренировку",
    "✧ Ваш прогресс",
    "План на сегодня",
    "Показать всё ↗",
    "Выберите занятие",
    "Занятие под каждую цель",
    "На сегодня задач пока нет",
    "Работа",
    "Отдых",
    "Раунд",
    "Завершено",
    "Завершить текущую тренировку?",
    "Смена занятия или режима завершит текущий сеанс. Продолжить?",
    "Введите длительность в формате ММ:СС",
    "Тренировка началась",
    "Тренировка завершена!",
    "Быстрые сеансы"
  ]
});
let quickTraining = null;
let quickInternalChange = false;
let quickExercises = [];
let quickPresetDomain = 'sport';
const QUICK_CFG_KEY = 'zen_quick_training_cfg_v21';
/* Task identity is always the original numeric v21 task ID (never a display label).
   app.js focusOnTask will call this method through a lane-00 integration patch. */
let focusWorkflowLinkedTaskId = null;
function focusWorkflowGetLinkedTask(id=focusWorkflowLinkedTaskId) {
 if(!Number.isSafeInteger(id)||id<0||typeof tasksList==='undefined'||!Array.isArray(tasksList))return null;
 return tasksList.find(t=>t&&t.id===id&&t.isStarter!==true)||null;
}
function focusWorkflowLinkTask(id) {
 if(quickTraining?.active)return false;
 if(id===null) { focusWorkflowLinkedTaskId=null;return true; }
 if(!focusWorkflowGetLinkedTask(id))return false;
 focusWorkflowLinkedTaskId=id;
 return true;
}
/* Events are a notification contract, NOT a second accounting ledger.
   Only the v21 completed session record carries earned minutes. */
function quickWorkflowEvent(kind, details={}) {
 if(typeof CustomEvent!=='function'||typeof window.dispatchEvent!=='function')return;
 const body={schemaVersion:1,kind,source:'quick-training',
   ...details};
 window.dispatchEvent(new CustomEvent('deep-focus:workflow',{detail:body}));
}

function quickText(key) {
  const values = QUICK_TRANSLATIONS[cfg.lang] || QUICK_TRANSLATIONS.en;
  const idx = QUICK_KEYS.indexOf(key);
  return idx < 0 ? key : values[idx] || QUICK_TRANSLATIONS.en[idx];
}
function quickL10n() {
  document.querySelectorAll('[data-qt]').forEach(el => {
    el.textContent = quickText(el.getAttribute('data-qt'));
  });
  document.querySelectorAll('[data-qt-placeholder]').forEach(el => {
    el.placeholder = quickText(el.getAttribute('data-qt-placeholder'));
  });
  renderQuickTraining();
  renderTodayPlan();
  updateFocusStatus();
}
function timeString(seconds) {
  const n = Math.max(0, Math.floor(seconds));
  return String(Math.floor(n/60)).padStart(2,'0') + ':' + String(n%60).padStart(2,'0');
}
function parseQuickTime(raw, allowZero = false, max = 14400) {
  const value = toWest(String(raw||'').trim());
  const match = value.match(/^(\d{1,3}):(\d{2})$/);
  let seconds = NaN;
  if (match && Number(match[2]) < 60) seconds = Number(match[1])*60 + Number(match[2]);
  else if (/^\d{1,3}$/.test(value)) seconds = Number(value)*60;
  if (!Number.isFinite(seconds) || seconds > max || seconds < (allowZero?0:1)) return null;
  return seconds;
}
function validQuickSnapshot(raw) {
  if (!raw || typeof raw !== 'object' || raw.active !== true) return null;
  if (!Number.isInteger(raw.sets) || raw.sets<1 || raw.sets>99 ||
      !Number.isInteger(raw.workSeconds) || raw.workSeconds<1 || raw.workSeconds>14400 ||
      !Number.isInteger(raw.restSeconds) || raw.restSeconds<0 || raw.restSeconds>3600 ||
      !Number.isInteger(raw.currentSet) || raw.currentSet<0 || raw.currentSet>=raw.sets ||
      !['work','rest'].includes(raw.phase) || typeof raw.skipLastRest !== 'boolean' ||
      !['study','sport','read','work'].includes(raw.domain)) return null;
  return {
    active:true, sets:raw.sets, workSeconds:raw.workSeconds,restSeconds:raw.restSeconds,
    currentSet:raw.currentSet,phase:raw.phase,skipLastRest:raw.skipLastRest,
    domain:raw.domain,
    taskId:Number.isSafeInteger(raw.taskId)&&raw.taskId>=0?raw.taskId:null,
    exercises:Array.isArray(raw.exercises)?raw.exercises.filter(x=>typeof x==='string').slice(0,24).map(x=>x.slice(0,70)):[]
  };
}
function saveQuickConfig() {
  saveFortressData(QUICK_CFG_KEY,{
    exercises:quickExercises.slice(0,24),
    domain:quickPresetDomain,
    sets:document.getElementById('qtSets').value,
    work:document.getElementById('qtWork').value,
    rest:document.getElementById('qtRest').value,
    skip:document.getElementById('qtSkipLast').checked
  });
}
function initQuickTraining() {
  const saved=loadFortressData(QUICK_CFG_KEY,null);
  if(saved && typeof saved === 'object') {
    if(Array.isArray(saved.exercises))
      quickExercises = saved.exercises.filter(x=>typeof x==='string').slice(0,24).map(x=>x.slice(0,70));
    if(['sport','study','read','work'].includes(saved.domain))quickPresetDomain=saved.domain;
    for(const [k,id] of [['sets','qtSets'],['work','qtWork'],['rest','qtRest']]) {
      if(typeof saved[k]==='string' && saved[k].length<=6)
        document.getElementById(id).value=saved[k];
    }
    if(typeof saved.skip==='boolean')document.getElementById('qtSkipLast').checked=saved.skip;
  }
  for(const id of ['qtSets','qtWork','qtRest','qtSkipLast'])
    document.getElementById(id).addEventListener('change',saveQuickConfig);
  quickL10n();
}
function renderQuickTraining() {
  const list=document.getElementById('qtExerciseList');
  if(!list)return;
  list.textContent='';
  quickExercises.forEach((name,idx)=>{
    const button=document.createElement('button');
    button.type='button';button.textContent=name+' ×';
    button.title='Remove exercise';
    button.onclick=()=>removeQuickExercise(idx);
    list.appendChild(button);
  });
  document.getElementById('qtExerciseCount').textContent=String(quickExercises.length);
  const panel=document.getElementById('qtProgressPanel');
  const started=!!(quickTraining && quickTraining.active);
  panel.hidden=!started;
  document.getElementById('qtStartButton').disabled=started;
  document.getElementById('qtStartButton').style.opacity=started?'.45':'1';
  if(!started)return;
  const q=quickTraining;
  const name=q.exercises.length ? q.exercises[q.currentSet%q.exercises.length] : '';
  document.getElementById('qtProgressTitle').textContent=
    quickText(q.phase==='work'?'workPhase':'restPhase')+' · '+
    quickText('round')+' '+(q.currentSet+1)+'/'+q.sets+(name?' · '+name:'');
  const progress=(q.currentSet+(q.phase==='rest'?.5:0))/q.sets*100;
  document.getElementById('qtProgressFill').style.width=Math.min(100,progress).toFixed(1)+'%';
  document.getElementById('quickTrainingDetails').open=true;
}
function addQuickExercise() {
  const el=document.getElementById('qtNewExercise');
  const name=String(el.value||'').trim().slice(0,70);
  if(!name || quickExercises.length>=24)return;
  quickExercises.push(name);
  el.value='';
  saveQuickConfig();
  renderQuickTraining();
}
function removeQuickExercise(index) {
  quickExercises.splice(index,1);saveQuickConfig();renderQuickTraining();
}
function applyQuickTrainingPreset(id) {
  if(quickTraining?.active) {
    showToast(quickText('replacePrompt'));return;
  }
  const presets={
    tabata:[8,20,10,'sport'],
    workout:[4,240,60,'sport'],
    reading:[3,1200,300,'read'],
    work:[2,3000,600,'work']
  };
  const p=presets[id];if(!p)return;
  document.getElementById('qtSets').value=String(p[0]);
  document.getElementById('qtWork').value=timeString(p[1]);
  document.getElementById('qtRest').value=timeString(p[2]);
  quickPresetDomain=p[3];saveQuickConfig();
}
function startQuickTraining() {
  if(quickTraining?.active)return;
  const sets=Number(toWest(document.getElementById('qtSets').value.trim()));
  const workSeconds=parseQuickTime(document.getElementById('qtWork').value,false,14400);
  const restSeconds=parseQuickTime(document.getElementById('qtRest').value,true,3600);
  if(!Number.isInteger(sets) || sets<1 || sets>99 || workSeconds===null || restSeconds===null){
    showToast(quickText('invalidDuration'));return;
  }
  if(timerRunning || timerSessionId!==null) {
    if(!window.confirm(quickText('replacePrompt')))return;
  }
  if(timerRunning)toggleTimerPlay();
  quickTraining={
    active:true,sets,workSeconds,restSeconds,currentSet:0,phase:'work',
    skipLastRest:document.getElementById('qtSkipLast').checked,
    exercises:quickExercises.slice(),domain:quickPresetDomain,
    taskId:focusWorkflowGetLinkedTask()?.id ?? null
  };
  cfg.domain=quickPresetDomain;
  saveFortressData('zen_fortress_cfg_v21',cfg);
  renderDomainState();
  quickInternalChange=true;
  selectTimerMode(workSeconds/60,'focus',document.getElementById('modeFocusBtn'));
  quickInternalChange=false;
  saveQuickConfig();
  toggleTimerPlay();
  renderQuickTraining();
  showToast(quickText('started'));
  quickWorkflowEvent('started',{domain:quickTraining.domain,taskId:quickTraining.taskId,
    sets:quickTraining.sets,workSeconds:quickTraining.workSeconds,restSeconds:quickTraining.restSeconds});
}
function stopQuickTrainingInternal() {
  quickTraining=null;
  if(timerRunning)toggleTimerPlay();
  selectTimerMode(getDomainFocusMinutes(),'focus',document.getElementById('modeFocusBtn'));
  renderQuickTraining();
}
function cancelQuickTraining(skipPrompt=false) {
  if(!quickTraining?.active)return;
  if(!skipPrompt&&!window.confirm(quickText('cancelPrompt')))return;
  const ended=quickTraining;
  quickTraining=null;
  stopQuickTrainingInternal();
  quickWorkflowEvent('cancelled',{domain:ended.domain,taskId:ended.taskId??null,
    completedSets:ended.currentSet});
}
function skipQuickTrainingStep() {
  if(!quickTraining?.active)return;
  if(timerRunning)toggleTimerPlay();
  // A skipped work step never earns focus credit.
  advanceQuickTrainingStep();
}
function completeQuickTraining() {
  const finished=quickTraining;
  const domain = quickTraining?.domain || cfg.domain || 'study';
  quickTraining = null;
  quickInternalChange = true;
  selectTimerMode(getDomainFocusMinutes(domain),'focus',document.getElementById('modeFocusBtn'));
  quickInternalChange = false;
  renderQuickTraining();
  showToast(quickText('finished'));
  if(finished)quickWorkflowEvent('completed',{domain,taskId:finished.taskId??null,sets:finished.sets});
}
function advanceQuickTrainingStep() {
  const q=quickTraining;
  if(!q?.active)return false;
  if(q.phase==='work') {
    if(q.restSeconds>0 && (q.currentSet<q.sets-1 || !q.skipLastRest)) {
      q.phase='rest';
    } else if(q.currentSet<q.sets-1) {
      q.currentSet++;q.phase='work';
    } else {
      completeQuickTraining();
      return false;
    }
  } else {
    if(q.currentSet===q.sets-1){
      completeQuickTraining();
      return false;
    }
    q.currentSet++;q.phase='work';
  }
  quickInternalChange=true;
  const phase=q.phase==='work'?'focus':'short';
  selectTimerMode((q.phase==='work'?q.workSeconds:q.restSeconds)/60,phase,
    document.getElementById(q.phase==='work'?'modeFocusBtn':'modeShortBtn'));
  quickInternalChange=false;
  toggleTimerPlay();
  renderQuickTraining();
  quickWorkflowEvent('phase',{domain:q.domain,taskId:q.taskId??null,
    phase:q.phase,set:q.currentSet+1,sets:q.sets});
  return true;
}
function updateFocusStatus() {
  const el=document.getElementById('focusStatusLabel');
  if(el)el.textContent=quickText(timerRunning?'running':timerSessionId?'paused':'ready');
}
/* Real seven-day navigation: dates come from the local calendar, never demo data. */
function renderHomeWeekStrip() {
  const strip = document.getElementById('homeWeekStrip');
  if (!strip) return;
  strip.textContent = '';
  const now = new Date();
  const start = (now.getDay() + 6) % 7; // Monday-first week
  const today = localDateISO(now);
  const weekdays = L().weekdays;
  for (let offset = 0; offset < 7; offset++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - start + offset);
    const iso = localDateISO(date);
    const weekday = weekdays[date.getDay()] || '';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'home-week-day';
    button.setAttribute('aria-current', iso === today ? 'date' : 'false');
    button.setAttribute('aria-label', toWest(weekday + ' ' + iso));
    const dayName = document.createElement('span');
    dayName.textContent = weekday.slice(0, 3);
    const dayNumber = document.createElement('span');
    dayNumber.className = 'home-week-number';
    dayNumber.textContent = toWest(String(date.getDate()));
    button.appendChild(dayName);
    button.appendChild(dayNumber);
    button.onclick = () => goToHomeAgenda(iso);
    strip.appendChild(button);
  }
}
function goToHomeAgenda(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [year, month, day] = iso.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  if (target.getFullYear() !== year || target.getMonth() !== month - 1 ||
      target.getDate() !== day) return false;
  selectedCalDate = iso;
  calYear = year;
  calMonth = month - 1;
  switchTab('sec-calendar', document.getElementById('navCalendar'));
  renderCalendar();
  return true;
}

function renderTodayPlan() {
  const box = document.getElementById('todayPlanPreview');
  if (!box || typeof tasksList === 'undefined') return;
  renderHomeWeekStrip();
  const today = localDateISO();
  // Starter examples belong to the tasks showcase, not the user's actual daily plan.
  const dated = tasksList.filter(t => t && t.date === today && t.isStarter !== true);
  const complete = dated.filter(t => t.done).length;
  const progress = dated.length ? Math.round(complete / dated.length * 100) : 0;
  document.getElementById('todayPlanRatio').textContent = complete + '/' + dated.length;
  document.getElementById('todayPlanPercent').textContent = progress + '%';
  document.getElementById('todayPlanFill').style.width = progress + '%';
  box.textContent = '';
  if (!dated.length) {
    const empty = document.createElement('div');
    empty.className = 'today-plan-entry';
    empty.textContent = quickText('emptyPlan');
    box.appendChild(empty);
    return;
  }
  dated.slice(0, 3).forEach(t => {
    const row = document.createElement('div');
    row.className = 'today-plan-entry';
    const check = document.createElement('button');
    check.type = 'button';
    check.className = 'today-plan-check';
    check.textContent = t.done ? '✓' : '○';
    check.setAttribute('aria-pressed', String(Boolean(t.done)));
    check.setAttribute('aria-label',
      (cfg.lang === 'ar' ? 'تغيير إنجاز المهمة: ' : 'Toggle completion: ') + toWest(t.title || ''));
    check.onclick = () => toggleTaskDone(t.id);

    const focus = document.createElement('button');
    focus.type = 'button';
    focus.className = 'today-plan-link';
    focus.setAttribute('aria-label',
      (cfg.lang === 'ar' ? 'التركيز على: ' : 'Focus on: ') + toWest(t.title || ''));
    const name = document.createElement('span');
    name.className = 'today-plan-task-name';
    name.textContent = toWest(t.title || '');
    const details = document.createElement('small');
    details.className = 'today-plan-task-detail';
    details.textContent = toWest(getCatLabel(t.catKey) + (t.time ? ' · ' + t.time : ''));
    focus.appendChild(name);
    focus.appendChild(details);
    focus.onclick = () => focusOnTask(t.id);
    row.appendChild(check);
    row.appendChild(focus);
    box.appendChild(row);
  });
}
