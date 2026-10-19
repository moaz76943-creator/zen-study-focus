'use strict';
/* Safe allowlisted screen settings and agent-request core. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DeepFocusStudioCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const REPO='moaz76943-creator/zen-study-focus';
  const SCREENS=Object.freeze({
    timer:{label:'المؤقت والتركيز',files:['android/app/src/main/assets/web/index.html','android/app/src/main/assets/web/app.js','android/app/src/main/assets/web/timer_settings.js'],tests:['tests/interaction_recovery','tests/regression_v21']},
    tasks:{label:'المهام',files:['android/app/src/main/assets/web/tasks_studio.js','android/app/src/main/assets/web/tasks_core_v21.js'],tests:['tests/tasks_core','tests/tasks_recovery']},
    calendar:{label:'التقويم',files:['android/app/src/main/assets/web/index.html','android/app/src/main/assets/web/goals_studio.js'],tests:['tests/white_premium_qa','tests/integration_quality']},
    notes:{label:'الملاحظات',files:['android/app/src/main/assets/web/notes_studio.js','android/app/src/main/assets/web/notes_editor_ui.js','android/app/src/main/assets/web/notes_core_v21.js'],tests:['tests/notes_core','tests/notes_recovery']},
    sounds:{label:'أصوات الطبيعة',files:['android/app/src/main/assets/web/nature_audio_recovery_v1.js','android/app/src/main/assets/web/sound_mix_controls.js','docs/MEDIA_LICENSES.md'],tests:['tests/nature_audio_recovery','tests/completion_alerts']},
    analytics:{label:'التحليلات',files:['android/app/src/main/assets/web/analytics_studio.js','android/app/src/main/assets/web/analytics_recovery_ui.js','android/app/src/main/assets/web/analytics_core_v21.js'],tests:['tests/analytics_core','tests/analytics_recovery']}
  });
  const AGENTS=Object.freeze({
    ui:{label:'UX وإصلاح التفاعل',objective:'Reproduce layout/navigation defects and verify touch targets.'},
    audio:{label:'تدقيق الصوت والتراخيص',objective:'Verify real recording provenance, decoding and mixer operation.'},
    locale:{label:'اللغات والأرقام',objective:'Check translations for 20 languages, RTL, and western 0–9 numerals.'},
    analytics:{label:'دقة التحليلات',objective:'Validate analytics without creating artificial sessions.'},
    data:{label:'حماية البيانات',objective:'Test v21 backup/restoration and write failures with disposable samples.'},
    qa:{label:'الجودة والأتمتة',objective:'Run regression and device tests with exact SHA-backed evidence.'}
  });
  const SCREEN_KEYS=['accent','cardRadius','spacing'],THEME_KEYS=['primary','cyan','background','cardRadius','fontScale'];
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k),object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  const color=x=>typeof x==='string'&&/^#[a-f0-9]{6}$/i.test(x);
  const sha=x=>typeof x==='string'&&/^[a-f0-9]{40}$/i.test(x);
  function sameKeys(obj,keys,name){
    if(!object(obj)||Object.keys(obj).length!==keys.length||keys.some(k=>!own(obj,k)))throw Error('Invalid '+name+' keys');
  }
  function integer(x,min,max){
    if(!Number.isInteger(x)||x<min||x>max)throw Error('Out-of-range value');
  }
  function validateConfig(value){
    sameKeys(value,['schema_version','theme','screens'],'config');
    if(value.schema_version!==1)throw Error('Unsupported config version');
    sameKeys(value.theme,THEME_KEYS,'theme');
    for(const field of ['primary','cyan','background'])if(!color(value.theme[field]))throw Error('Invalid color');
    integer(value.theme.cardRadius,8,44);integer(value.theme.fontScale,85,120);
    sameKeys(value.screens,Object.keys(SCREENS),'screens');
    for(const item of Object.values(value.screens)){
      sameKeys(item,SCREEN_KEYS,'screen');
      if(!color(item.accent))throw Error('Invalid screen accent');
      integer(item.cardRadius,8,44);integer(item.spacing,4,28);
    }
    return JSON.parse(JSON.stringify(value));
  }
  function updateSetting(config,screen,key,value){
    const next=validateConfig(config);
    if(screen==='theme'){
      if(!THEME_KEYS.includes(key))throw Error('Unknown theme property');
      next.theme[key]=value;
    } else {
      if(!own(SCREENS,screen)||!SCREEN_KEYS.includes(key))throw Error('Unknown screen property');
      next.screens[screen][key]=value;
    }
    return validateConfig(next);
  }
  function renderCSS(value){
    const c=validateConfig(value);
    const lines=['/* GENERATED: Deep Focus Control Center visual settings. */',
      '/* Cosmetic-only; no user data or navigation writes. */',
      ':root{',
      '  --primary:'+c.theme.primary+';',
      '  --primary-cyan:'+c.theme.cyan+';',
      '  --bg-sheet:'+c.theme.background+';',
      '  --radius-xl:'+c.theme.cardRadius+'px;',
      '}',
      'html{font-size:'+c.theme.fontScale+'%;}'];
    for(const [name,v] of Object.entries(c.screens)){
      lines.push('#sec-'+name+'{--primary:'+v.accent+';}');
      lines.push('#sec-'+name+' .pure-white-card,#sec-'+name+' .showcase-task-card,#sec-'+name+' .learning-rich-card{border-radius:'+v.cardRadius+'px!important;}');
      lines.push('#sec-'+name+' .pure-white-card{margin-block-end:'+v.spacing+'px;}');
    }
    return lines.join('\n')+'\n';
  }
  function cleanTitle(title){
    if(typeof title!=='string')throw Error('Title required');
    const value=title.replace(/[\r\n\t]/g,' ').trim().replace(/\s+/g,' ');
    if(value.length<8||value.length>160||/[<>]/.test(value))throw Error('Title must be 8–160 safe characters');
    return value;
  }
  function makeAgentRequest(kind,screen,title,commitSha){
    if(!own(AGENTS,kind)||!own(SCREENS,screen)||!sha(commitSha))throw Error('Invalid agent kind, screen or SHA');
    const spec=SCREENS[screen],agent=AGENTS[kind],name=cleanTitle(title);
    const body=['## Deep Focus scoped agent task',
      'Lane: '+kind+' — '+agent.label,
      'Screen: '+screen+' — '+spec.label,
      'Repository: '+REPO,
      'Exact source SHA: '+commitSha,
      'Goal: '+name,
      'Investigation: '+agent.objective,
      '',
      '### Source file boundaries',
      ...spec.files.map(x=>'- '+x),
      '### Relevant tests',
      ...spec.tests.map(x=>'- '+x),
      '',
      '### Required acceptance gates',
      '- Reproduce failures with tests before changing code.',
      '- Preserve v21 storage, ZEN21:: backups, 20 languages, 0–9 UI numerals and user-authored text.',
      '- No forced push, automatic merge, unlicensed media, artificial sessions or Play signing.',
      '- Report PASS/FAIL/BLOCKED/NOT_TESTED with exact SHA. Android device QA is NOT_TESTED until actually run.',
      '- Submit an isolated reviewable PR; do not overwrite ongoing Gemini work.',
      '',
      'This issue is a handoff to a human/connected agent; opening it does not execute an AI model.'
    ].join('\n');
    return {title:'[AGENT-'+kind.toUpperCase()+'] '+screen+' — '+name,body};
  }
  function makeDesignRequest(value,commitSha){
    const c=validateConfig(value);
    if(!sha(commitSha))throw Error('Exact source SHA required');
    return {title:'[DESIGN] Review Deep Focus appearance overrides',
      body:['## Reviewable appearance request',
      'Reference SHA: '+commitSha,
      'This issue is not an applied code change. Update the config and generated CSS via a PR.',
      '--- START CONFIG JSON ---',JSON.stringify(c,null,2),'--- END CONFIG JSON ---',
      'Run node --test tests/control_center/*.test.cjs and regenerate the stylesheet.',
      'Do not change storage, navigation, 20 languages, signed releases or media licensing.'].join('\n')};
  }
  function parseDesignIssue(body){
    if(typeof body!=='string'||body.length>18000)throw Error('Invalid issue size');
    const starts=body.split('--- START CONFIG JSON ---');
    const ends=body.split('--- END CONFIG JSON ---');
    if(starts.length!==2||ends.length!==2)throw Error('Must contain one config section');
    const match=body.match(/--- START CONFIG JSON ---\s*([\s\S]*?)\s*--- END CONFIG JSON ---/);
    const reference=body.match(/^Reference SHA: ([a-f0-9]{40})\r?$/m);
    if(!match||!reference)throw Error('Exact source reference required');
    return {sha:reference[1],config:validateConfig(JSON.parse(match[1]))};
  }
  function issueLink(request){
    if(!request||typeof request.title!=='string'||typeof request.body!=='string')throw Error('Invalid request');
    return 'https://github.com/'+REPO+'/issues/new?title='+encodeURIComponent(request.title)+'&body='+encodeURIComponent(request.body);
  }
  return {SCREENS,AGENTS,validateConfig,updateSetting,renderCSS,makeAgentRequest,makeDesignRequest,parseDesignIssue,issueLink};
});
