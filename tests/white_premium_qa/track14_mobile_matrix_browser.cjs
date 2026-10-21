'use strict';
/* Chromium evidence only: NOT Android WebView/TalkBack/IME certification. */
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = process.env.DF_COMPLETION_URL || 'http://127.0.0.1:8770';
const output = process.env.DF_TRACK14_EVIDENCE || '/tmp/deep-focus-track14';
const ids = ['navTasks','navCalendar','navNotes','navTimer','navTraining','navSounds','navAnalytics'];
const widths = [320,360,393,430], scales = [1,1.5,2], dirs = ['ltr','rtl'];

(async()=>{
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const problems=[],rows=[],uncaught=[];
  try{
    const page=await browser.newPage({viewport:{width:393,height:780},reducedMotion:'reduce'});
    page.on('pageerror',error=>uncaught.push(String(error)));
    await page.goto(base+'/index.html',{waitUntil:'load'});
    await page.waitForFunction(()=>document.body.classList.contains('df-recovery10') && !!document.getElementById('focusHeroCard'),undefined,{timeout:20000});
    for(const width of widths){
      for(const dir of dirs){
        for(const scale of scales){
          await page.setViewportSize({width,height:780});
          await page.evaluate(({dir,scale})=>{
            document.documentElement.dir=dir;
            document.documentElement.style.fontSize=(16*scale)+'px';
            document.body.classList.add('timer-home');
            document.body.classList.remove('deep-lockdown');
            document.querySelector('#navTimer')?.click();
          },{dir,scale});

          // Switching RTL/LTR animates nav transform; measure after settling.
          // Screenshot with animations disabled completes finite CSS transitions.
          await page.screenshot({path:path.join(output,'screen-'+tag+'.png'),animations:'disabled'});
          const measured=await page.evaluate(ids=>{
            const bounds=e=>{const r=e?.getBoundingClientRect();return r&&{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
            const nav=bounds(document.querySelector('.bottom-nav-capsule'));
            const ring=bounds(document.querySelector('#focusHeroCard .ring-container'));
            const timer=bounds(document.querySelector('#focusHeroCard .ring-time'));
            const chips=[...document.querySelectorAll('#focusHeroCard .delta-chip')].map(e=>({rect:bounds(e),minHeight:getComputedStyle(e).minHeight}));
            const buttons=ids.map(id=>({id,rect:bounds(document.getElementById(id)),visible:getComputedStyle(document.getElementById(id)).display!=='none'}));
            const hero=bounds(document.getElementById('focusHeroCard'));
            return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,buttons,nav,hero,ring,timer,chips};
          },ids);
          const tag=width+'-'+dir+'-'+Math.round(scale*100);
          const failures=[];
          if(measured.documentWidth>width+2)failures.push('DOCUMENT_HORIZONTAL_OVERFLOW');
          if(!measured.nav||!measured.hero||!measured.ring||!measured.timer)failures.push('MISSING_NAV_OR_TIMER');
          if(measured.hero&&(measured.hero.left < -1||measured.hero.right>width+1))failures.push('CLIPPED_HERO');
          if(measured.ring&&measured.timer&&(measured.timer.left < measured.ring.left-2||measured.timer.right>measured.ring.right+2))failures.push('TIMER_TEXT_OUTSIDE_RING');
          for(const b of measured.buttons){
            if(!b.visible||!b.rect||b.rect.width<40||b.rect.height<44)failures.push('NAV_TOO_SMALL:'+b.id);
            if(b.rect&&(b.rect.left < -2||b.rect.right>width+2))failures.push('NAV_OFFSCREEN:'+b.id);
          }
          if(measured.nav&&measured.buttons[3].rect){
            const t=measured.buttons[3].rect;
            if(Math.abs((t.left+t.right-measured.nav.left-measured.nav.right)/2)>5)failures.push('TIMER_NOT_CENTERED');
          }
          if(measured.chips.some(x=>x.rect&&x.rect.height<43))failures.push('DURATION_TARGET_UNDERSIZED');
          rows.push({width,dir,scale,failures,geometry:measured});
          if(failures.length)problems.push({tag,failures});
          // Visual before/after reference at the critical 320px / 200% case.
          // The 'legacy' image is simulated by restoring the old two CSS rules,
          // not a screenshot taken from a previous commit or a real Android device.
          if(width===320 && scale===2){
            const legacy=await page.addStyleTag({content:
              'body.df-v22.df-recovery10.timer-home #focusHeroCard .ring-time {font-size:clamp(2.55rem,11vw,3.55rem)!important;}'+
              'body.df-v22.df-recovery10.timer-home #focusHeroCard .time-delta-row {flex-wrap:nowrap!important;}'});
            await page.screenshot({path:path.join(output,'comparison-simulated-legacy-320-'+dir+'-200.png'),animations:'disabled'});
            await legacy.evaluate(element=>element.remove());
          }

        }
      }
    }
    // Actual navigation interaction on a disposable instance. Do not click destructive actions.
    await page.setViewportSize({width:393,height:780});
    await page.evaluate(()=>{document.documentElement.dir='ltr';document.documentElement.style.fontSize='16px';});
    const navClicks=[];
    for(const id of ids){
      await page.locator('#'+id).click();
      const selected=await page.locator('#'+id).evaluate(e=>e.classList.contains('active'));
      navClicks.push({id,selected});
      if(!selected)problems.push({tag:'navigation',failures:['CLICK_NOT_SELECTED:'+id]});
    }
    fs.writeFileSync(path.join(output,'matrix.json'),JSON.stringify({rows,navClicks,uncaught,problems,
      limits:'Chromium at CSS root-font 100/150/200%, not physical Android textZoom, screen reader, native dialogs, keyboard IME or 20-locale approval. No user storage touched.'},null,2));
  }finally{await browser.close();}
  console.log(JSON.stringify({screenshots:rows.length,widths,scales,dirs,navigationClicks:ids.length,failures:problems.length,pageErrors:uncaught.length,first:problems.slice(0,8)}));
  assert.deepEqual(problems,[],'Mobile layout and seven navigation targets must remain reachable');
  assert.deepEqual(uncaught,[],'No uncaught app errors');
})().catch(error=>{console.error(error);process.exitCode=1;});
