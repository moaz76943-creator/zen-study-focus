'use strict';
// READ-ONLY real Chromium inventory. Does NOT claim every button's behavior was tested.
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const langs='en ar es zh hi fr de ru pt ja id tr ko vi it bn ur fa pl nl'.split(' ');
const out=process.env.DF_BUTTON_EVIDENCE||'/tmp/df-i18n-100';
const base=process.env.DF_COMPLETION_URL||'http://127.0.0.1:8770';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const findings=[],errors=[];
 try{
  const page=await browser.newPage({viewport:{width:393,height:830}});
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base+'/index.html',{waitUntil:'load'});
  await page.waitForFunction(()=>typeof applyLanguage==='function', {timeout:15000});
  for(const lang of langs){
   const row=await page.evaluate(lang=>{
    applyLanguage(lang);
    const root=document.documentElement;
    const controls=[...document.querySelectorAll('button,[role="button"],input[type="button"],input[type="submit"]')];
    const seen={},labels=[];
    for(let i=0;i<controls.length;i++){
     const el=controls[i],style=getComputedStyle(el),rect=el.getBoundingClientRect();
     const visible=style.visibility!=='hidden'&&style.display!=='none'&&rect.width>0&&rect.height>0;
     const text=(el.getAttribute('aria-label')||el.innerText||el.getAttribute('title')||el.getAttribute('value')||'').trim().replace(/\s+/g,' ').slice(0,250);
     const id=el.id||null,section=el.closest('section[id],.screen[id]')?.id||null;
     const key=id?(section||'global')+'#'+id:(section||'global')+'#'+el.tagName.toLowerCase()+'-'+i;
     if(seen[key])seen[key]++;else seen[key]=1;
     labels.push({key,kind:el.tagName.toLowerCase(),section,visible,disabled:el.disabled===true,
      label:text,emptyAccessibleName:visible&&!text,
      sourceKey:el.getAttribute('data-i18n')||el.querySelector('[data-i18n]')?.getAttribute('data-i18n')||null,
      clickHandler:el.getAttribute('onclick')||null});
    }
    return {lang,htmlLang:root.lang,dir:root.dir,count:labels.length,
     visible:labels.filter(x=>x.visible).length,
     missingAccessibleName:labels.filter(x=>x.emptyAccessibleName).length,
     labeledKey:labels.filter(x=>x.sourceKey).length,controls:labels};
   },lang);
   assert.equal(row.htmlLang,lang);
   assert.equal(row.dir,['ar','ur','fa'].includes(lang)?'rtl':'ltr');
   findings.push(row);
  }
  assert.deepEqual(errors,[],'No unhandled JavaScript errors while enumerating every control');
  const english=findings.find(x=>x.lang==='en');
  const review=findings.map(row=>{
   const compared=row.controls.flatMap((control,i)=>{
    const original=english.controls[i];
    if(!original||original.key!==control.key)return [];
    return control.visible&&control.label&&row.lang!=='en'&&control.label===original.label&&/[A-Za-z]{3}/.test(control.label)?
     [{key:control.key,english:original.label,lang:row.lang,classification:'SOURCE_IDENTICAL_REQUIRES_LINGUISTIC_REVIEW'}]:[];
   });
   return {lang:row.lang,controls:row.count,visible:row.visible,emptyAccessibleName:row.missingAccessibleName,
    identicalCandidateCount:compared.length,examples:compared.slice(0,40)};
  });
  fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(out+'/full-controls-localized-copy-inventory.json',
   JSON.stringify({source:'real Chromium DOM after applyLanguage for each existing locale',
    languages:langs,counts:review,findings,notExhaustiveForSemantics:true,
    unknownDynamicStates:'Dialogs, role-based custom widgets and not-yet-opened screens need separate tests',
    releaseApproved:false,errors},null,2));
  console.log(JSON.stringify({testedLanguages:langs.length,
   controlsPerLocale:english.count,localeControlObservations:findings.reduce((n,x)=>n+x.count,0),
   missingAccessibleNameCandidates:review.reduce((n,x)=>n+x.emptyAccessibleName,0),
   identicalTextReviewCandidates:review.reduce((n,x)=>n+x.identicalCandidateCount,0),
   notExhaustiveForSemantics:true,pageErrors:errors.length}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
